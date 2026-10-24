import { randomBytes } from 'node:crypto';
import { chmod, mkdir, open, readFile, rename, rm } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';

export const VERSION = '1.0.0';

export function defaultDataDir() {
  if (process.platform === 'darwin') return path.join(homedir(), 'Library', 'Application Support', 'Learnagram');
  if (process.platform === 'win32') return path.join(process.env.LOCALAPPDATA || path.join(homedir(), 'AppData', 'Local'), 'Learnagram');
  return path.join(process.env.XDG_DATA_HOME || path.join(homedir(), '.local', 'share'), 'learnagram');
}

export async function atomicJson(filename, value) {
  const temp = `${filename}.${randomBytes(6).toString('hex')}.tmp`;
  const file = await open(temp, 'wx', 0o600);
  try { await file.writeFile(JSON.stringify(value, null, 2)); } finally { await file.close(); }
  await rename(temp, filename);
  await chmod(filename, 0o600);
}

export async function loadConfig(env = process.env) {
  const dataDir = path.resolve(env.LEARNAGRAM_COMPANION_DATA_DIR || defaultDataDir());
  await mkdir(dataDir, { recursive: true, mode: 0o700 });
  await chmod(dataDir, 0o700);
  const configFile = path.join(dataDir, 'connection.json');
  let saved;
  try { saved = JSON.parse(await readFile(configFile, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw new Error('Could not read local connection settings. Remove connection.json to pair again.'); }
  const token = env.LEARNAGRAM_COMPANION_TOKEN || saved?.token || randomBytes(32).toString('base64url');
  if (!/^[A-Za-z0-9_-]{32,128}$/.test(token)) throw new Error('Pairing token must contain 32–128 URL-safe characters.');
  if (!env.LEARNAGRAM_COMPANION_TOKEN && saved?.token !== token) await atomicJson(configFile, { version: 1, token });
  if (saved) await chmod(configFile, 0o600);
  const port = Number(env.LEARNAGRAM_COMPANION_PORT || 4318);
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Invalid companion port.');
  const defaults = [5173, 5174, 5175, 4173].flatMap((p) => [`http://127.0.0.1:${p}`, `http://localhost:${p}`]);
  defaults.push('https://unvibe-learnagram.web.app', 'https://unvibe-learnagram.firebaseapp.com');
  const origins = (env.LEARNAGRAM_ALLOWED_ORIGINS || defaults.join(',')).split(',').map((v) => v.trim()).filter(Boolean);
  for (const origin of origins) {
    const url = new URL(origin);
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== origin || url.username || url.password) throw new Error(`Invalid allowed origin: ${origin}`);
  }
  const workDir = path.join(dataDir, 'worker');
  await mkdir(workDir, { recursive: true, mode: 0o700 });
  return { dataDir, token, port, origins: new Set(origins), workDir, projectsDir: path.resolve(env.LEARNAGRAM_CLAUDE_PROJECTS_DIR || path.join(homedir(), '.claude', 'projects')), claudeCommand: env.LEARNAGRAM_CLAUDE_BIN || 'claude', model: env.LEARNAGRAM_CLAUDE_MODEL || 'sonnet', frontendUrl: env.LEARNAGRAM_FRONTEND_URL || 'http://127.0.0.1:5174/connect' };
}

export async function acquireLock(dataDir) {
  const filename = path.join(dataDir, 'companion.lock');
  async function attempt() {
    const file = await open(filename, 'wx', 0o600);
    await file.writeFile(String(process.pid));
    await file.close();
  }
  try { await attempt(); } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    const owner = Number(await readFile(filename, 'utf8').catch(() => ''));
    let live = false;
    if (Number.isInteger(owner) && owner > 0) { try { process.kill(owner, 0); live = true; } catch (error) { live = error.code !== 'ESRCH'; } }
    if (live) throw new Error('A companion already uses this data directory. Stop it before starting another.');
    await rm(filename, { force: true });
    await attempt();
  }
  return () => rm(filename, { force: true });
}
