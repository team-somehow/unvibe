import { createHash, createHmac } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { lstat, readdir, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { ApiError, sanitize } from './security.mjs';

const MAX_FILE_BYTES = 32 * 1024 * 1024;
const MAX_TRANSCRIPT_CHARS = 48000;

export function meaningfulParts(event) {
  if (!event || event.isSidechain || event.parentToolUseID || !['user', 'assistant'].includes(event.type)) return [];
  const content = event.message?.content;
  const role = event.type;
  if (typeof content === 'string') return [{ role, text: content }];
  if (!Array.isArray(content)) return [];
  return content.flatMap((part) => {
    if (part.type === 'text' && typeof part.text === 'string') return [{ role, text: part.text }];
    if (part.type === 'tool_use' && typeof part.name === 'string') {
      // Tool results, hidden reasoning, images, and binary payloads are never included.
      const input = part.input && typeof part.input === 'object' ? part.input : {};
      const allowed = ['file_path', 'path', 'command', 'pattern', 'old_string', 'new_string', 'description', 'query'];
      const useful = Object.fromEntries(allowed.filter((key) => typeof input[key] === 'string').map((key) => [key, input[key].slice(0, 5000)]));
      return [{ role: 'tool', text: `${part.name}: ${JSON.stringify(useful)}` }];
    }
    return [];
  });
}

export async function readTranscript(filename, { metadataOnly = false } = {}) {
  const size = (await stat(filename)).size;
  if (size > MAX_FILE_BYTES) throw new ApiError(413, 'SESSION_TOO_LARGE', 'This session exceeds 32 MB. Choose a smaller session.');
  const reader = createInterface({ input: createReadStream(filename), crlfDelay: Infinity });
  const messages = [];
  let title = '', repo = '', projectPath = '', count = 0, redactions = 0;
  try {
    for await (const line of reader) {
      if (line.length > 1024 * 1024) continue;
      let event;
      try { event = JSON.parse(line); } catch { continue; }
      if (event.isSidechain) continue;
      if (!repo && typeof event.cwd === 'string') { projectPath = event.cwd; repo = sanitize(path.basename(event.cwd)).text.slice(0, 80); }
      for (const part of meaningfulParts(event)) {
        const clean = sanitize(projectPath ? part.text.replaceAll(projectPath, '<project>') : part.text);
        redactions += clean.redactions;
        if (!clean.text || /^<(?:local-command|command-name|command-message|local-command-stdout|bash-input|bash-stdout)/.test(clean.text)) continue;
        count++;
        if (!title && part.role === 'user') title = clean.text.replace(/\s+/g, ' ').slice(0, 120);
        if (!metadataOnly) messages.push({ role: part.role, text: clean.text.slice(0, part.role === 'tool' ? 6000 : 10000) });
      }
    }
  } finally { reader.close(); }
  if (!count) throw new ApiError(422, 'EMPTY_SESSION', 'This session contains no usable user or assistant messages.');
  // Keep the beginning (intent) and the end (outcome), within a predictable prompt budget.
  let selected = messages;
  let truncated = false;
  if (!metadataOnly && JSON.stringify(messages).length > MAX_TRANSCRIPT_CHARS) {
    truncated = true;
    const first = messages.slice(0, 3);
    let budget = MAX_TRANSCRIPT_CHARS - JSON.stringify(first).length;
    const last = [];
    for (let i = messages.length - 1; i >= 3 && budget > 0; i--) {
      const item = { ...messages[i], text: messages[i].text.slice(-Math.max(0, budget - 50)) };
      last.unshift(item); budget -= JSON.stringify(item).length;
    }
    selected = [...first, ...last];
  }
  return { title: title || 'Coding session', repo: repo || 'Your project', messageCount: count, messages: selected, redactions, truncated };
}

function within(root, filename) { const relative = path.relative(root, filename); return relative && !relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative); }

export class SessionStore {
  constructor(config) { this.root = config.projectsDir; this.token = config.token; this.files = new Map(); this.lastList = []; }
  async list() {
    let root;
    try { root = await realpath(this.root); } catch (error) { if (error.code === 'ENOENT') { this.files.clear(); return this.lastList = []; } throw error; }
    const candidates = [];
    const walk = async (dir, depth) => {
      if (depth > 3 || candidates.length >= 500) return;
      for (const item of await readdir(dir, { withFileTypes: true })) {
        if (candidates.length >= 500) break;
        if (item.isSymbolicLink() || ['subagents', 'agent', 'agents'].includes(item.name)) continue;
        const filename = path.join(dir, item.name);
        if (item.isDirectory()) await walk(filename, depth + 1);
        else if (item.isFile() && item.name.endsWith('.jsonl') && !item.name.startsWith('agent-')) candidates.push(filename);
      }
    };
    await walk(root, 0);
    const dated = await Promise.all(candidates.map(async (filename) => ({ filename, modified: (await stat(filename)).mtimeMs })));
    dated.sort((a, b) => b.modified - a.modified);
    const sessions = [], files = new Map();
    for (const entry of dated.slice(0, 100)) {
      try {
        const resolved = await realpath(entry.filename);
        if (!within(root, resolved) || (await lstat(entry.filename)).isSymbolicLink()) continue;
        const metadata = await readTranscript(resolved, { metadataOnly: true });
        const id = createHmac('sha256', this.token).update(path.relative(root, resolved)).digest('hex').slice(0, 32);
        sessions.push({ id, title: metadata.title, repo: metadata.repo, updatedAt: new Date(entry.modified).toISOString(), messageCount: metadata.messageCount });
        files.set(id, resolved);
      } catch (error) { if (!['ENOENT', 'SESSION_TOO_LARGE', 'EMPTY_SESSION'].includes(error.code)) throw error; }
    }
    this.files = files; this.lastList = sessions; return sessions;
  }
  async selected(id) {
    if (typeof id !== 'string' || !/^[a-f0-9]{32}$/.test(id)) throw new ApiError(404, 'SESSION_NOT_FOUND', 'Select an available session from this machine.');
    if (!this.files.has(id)) await this.list();
    const filename = this.files.get(id);
    if (!filename) throw new ApiError(404, 'SESSION_NOT_FOUND', 'This session is no longer available. Refresh the session list.');
    const root = await realpath(this.root);
    let resolved;
    try { resolved = await realpath(filename); } catch { throw new ApiError(404, 'SESSION_NOT_FOUND', 'This session is no longer available. Refresh the session list.'); }
    if (!within(root, resolved) || (await lstat(filename)).isSymbolicLink()) throw new ApiError(403, 'SESSION_PATH_REJECTED', 'Session must remain inside your Claude projects folder.');
    const session = { ...(await readTranscript(resolved)), id };
    session.transcriptHash = createHash('sha256').update(JSON.stringify(session.messages)).digest('hex');
    return session;
  }
  async preview(id) {
    const session = await this.selected(id);
    const metadata = this.lastList.find((item) => item.id === id);
    return { session: { id, title: session.title, repo: session.repo, messageCount: session.messageCount, updatedAt: metadata?.updatedAt || new Date().toISOString() }, messages: session.messages, redactions: session.redactions, truncated: session.truncated, characters: session.messages.reduce((count, item) => count + item.text.length, 0), transcriptHash: session.transcriptHash };
  }
}
