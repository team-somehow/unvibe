import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { parseLesson } from '../shared/lesson.ts';
import { atomicJson } from './config.mjs';
import { generateLocally, generateWithClaude } from './claude.mjs';
import { narrateLesson } from './narration.mjs';
import { renderLesson } from './render.mjs';
import { ApiError } from './security.mjs';

const terminal = new Set(['completed', 'failed', 'cancelled']);
const statuses = new Set(['queued', 'analyzing', 'narrating', 'rendering', ...terminal]);
export class JobQueue {
  constructor(config, sessions, dependencies = {}) {
    this.config = config; this.sessions = sessions;
    this.generate = dependencies.generate || generateWithClaude;
    this.render = dependencies.render || renderLesson;
    this.narrate = dependencies.narrate || narrateLesson;
    this.jobs = []; this.snapshots = new Map(); this.active = null; this.controller = null; this.closed = false; this.writes = Promise.resolve();
    this.ledger = path.join(config.dataDir, 'jobs.json'); this.mediaDir = path.join(config.dataDir, 'media');
  }
  async init() {
    await mkdir(this.mediaDir, { recursive: true, mode: 0o700 });
    try {
      const stored = JSON.parse(await readFile(this.ledger, 'utf8'));
      if (!Array.isArray(stored)) throw new Error('Invalid queue');
      this.jobs = stored.filter((job) => /^[a-f0-9-]{36}$/.test(job?.id || '') && statuses.has(job.status)).map((job) => {
        if (job.lesson) job.lesson = parseLesson(job.lesson);
        if (['analyzing', 'narrating', 'rendering'].includes(job.status)) return { ...job, status: 'failed', stage: 'Interrupted', error: { code: 'INTERRUPTED', message: 'The companion stopped during generation. Retry this session to create a new job.' }, updatedAt: new Date().toISOString() };
        return job;
      });
    } catch (error) { if (error.code !== 'ENOENT') throw new Error('Could not read saved jobs. Preserve jobs.json and repair it before restarting.'); }
    await this.persist();
    queueMicrotask(() => this.pump());
  }
  persist() { const snapshot = structuredClone(this.jobs); this.writes = this.writes.then(() => atomicJson(this.ledger, snapshot)); return this.writes; }
  list() { return [...this.jobs].reverse().map((job) => this.public(job)); }
  public(job) { const { renderRequested, narrateRequested, renderOnly, transcriptHash, ...visible } = job; return structuredClone(visible); }
  get(id) { const job = this.jobs.find((item) => item.id === id); if (!job) throw new ApiError(404, 'JOB_NOT_FOUND', 'This generation job does not exist.'); return job; }
  mediaPath(id, type = 'mp4') { this.get(id); return path.join(this.mediaDir, `${id}.${type}`); }
  async create(input) {
    if (this.jobs.filter((job) => !terminal.has(job.status)).length >= 20) throw new ApiError(429, 'QUEUE_FULL', 'The local queue is full. Wait for a job to finish before adding another.');
    const provider = input.provider || 'claude';
    if (!['claude', 'local'].includes(provider)) throw new ApiError(400, 'INVALID_PROVIDER', 'Choose claude or local analysis.');
    if (input.render !== undefined && typeof input.render !== 'boolean' || input.narrate !== undefined && typeof input.narrate !== 'boolean') throw new ApiError(400, 'INVALID_OPTIONS', 'render and narrate must be booleans.');
    const session = await this.sessions.selected(input.sessionId);
    if (input.expectedTranscriptHash && input.expectedTranscriptHash !== session.transcriptHash) throw new ApiError(409, 'SESSION_CHANGED', 'This session changed after preview. Review its latest content before generating.');
    if (input.narrate && !process.env.ELEVENLABS_API_KEY) throw new ApiError(503, 'NARRATION_NOT_CONFIGURED', 'Add ELEVENLABS_API_KEY to .env.local and restart the companion, or turn narration off.');
    const now = new Date().toISOString();
    const job = { id: randomUUID(), sessionId: session.id, provider, status: 'queued', stage: 'Queued', progress: 0, createdAt: now, updatedAt: now, renderRequested: input.render !== false, narrateRequested: input.narrate === true, transcriptHash: session.transcriptHash, provenance: { providerLabel: provider === 'claude' ? 'Claude Code' : 'Local transcript extraction (no AI)', transcriptMessages: session.messageCount, redactions: session.redactions, truncated: session.truncated }, narration: { status: input.narrate ? 'requested' : 'not-requested' } };
    this.jobs.push(job); this.snapshots.set(job.id, session); await this.persist(); queueMicrotask(() => this.pump()); return this.public(job);
  }
  async update(job, patch) { Object.assign(job, patch, { updatedAt: new Date().toISOString() }); await this.persist(); }
  async cancel(id) {
    const job = this.get(id);
    if (terminal.has(job.status)) return this.public(job);
    const saved = this.update(job, { status: 'cancelled', stage: 'Cancelled', error: { code: 'CANCELLED', message: 'Generation was cancelled.' } });
    this.snapshots.delete(id);
    if (this.active?.id === id) this.controller?.abort();
    await saved;
    return this.public(job);
  }
  async retryRender(id) {
    const job = this.get(id);
    if (!terminal.has(job.status) || !job.lesson) throw new ApiError(409, 'LESSON_NOT_READY', 'Wait for the lesson to finish before exporting it.');
    if (job.narrateRequested && job.narration.status !== 'included') throw new ApiError(409, 'NARRATION_NOT_READY', 'Narration did not finish. Create a new job to retry narration or explicitly generate without it.');
    delete job.error; delete job.video;
    await this.update(job, { status: 'queued', stage: 'Queued for export', progress: 0.4, renderRequested: true, renderOnly: true });
    queueMicrotask(() => this.pump()); return this.public(job);
  }
  async pump() {
    if (this.closed || this.active) return;
    const job = this.jobs.find((item) => item.status === 'queued');
    if (!job) return;
    this.active = job; this.controller = new AbortController(); const { signal } = this.controller;
    let finished;
    this.activeDone = new Promise((resolve) => { finished = resolve; });
    const ensureActive = () => { if (signal.aborted || job.status === 'cancelled') throw new ApiError(499, 'CANCELLED', 'Generation was cancelled.'); };
    try {
      if (!job.renderOnly) {
        await this.update(job, { status: 'analyzing', stage: job.provider === 'claude' ? 'Claude is shaping your lesson' : 'Extracting your recorded session', progress: 0.1 });
        ensureActive();
        const session = this.snapshots.get(job.id) || await this.sessions.selected(job.sessionId);
        ensureActive();
        if (session.transcriptHash !== job.transcriptHash) throw new ApiError(409, 'SESSION_CHANGED', 'The session changed while this job was queued. Preview it again and create a new job.');
        const lesson = job.provider === 'claude' ? await this.generate(session, this.config, { signal }) : generateLocally(session);
        if (signal.aborted || job.status === 'cancelled') return;
        await this.update(job, { lesson: parseLesson(lesson), progress: 0.35 });
        if (job.narrateRequested) {
          await this.update(job, { status: 'narrating', stage: 'Recording ElevenLabs narration', progress: 0.4 });
          ensureActive();
          const narrated = await this.narrate(job.lesson, { jobId: job.id, output: this.mediaPath(job.id, 'mp3'), signal });
          if (signal.aborted || job.status === 'cancelled') return;
          await this.update(job, { lesson: narrated, narration: { status: 'included', provider: 'ElevenLabs' } });
        }
      }
      if (job.renderRequested) {
        await this.update(job, { status: 'rendering', stage: 'Rendering your MP4', progress: 0.45 });
        ensureActive();
        let lastProgress = 0;
        await this.render(job.lesson, { output: this.mediaPath(job.id), ...(job.lesson.narration ? { audioPath: this.mediaPath(job.id, 'mp3') } : {}), signal, onProgress: (progress) => { if (Date.now() - lastProgress > 1200 && job.status === 'rendering') { lastProgress = Date.now(); this.update(job, { progress: 0.45 + Math.max(0, Math.min(1, progress)) * 0.5 }).catch(() => this.controller?.abort()); } } });
        if (signal.aborted || job.status === 'cancelled') return;
        const bytes = (await stat(this.mediaPath(job.id))).size;
        await this.update(job, { video: { url: `/api/jobs/${job.id}/video`, mimeType: 'video/mp4', bytes } });
      }
      if (!signal.aborted && job.status !== 'cancelled') await this.update(job, { status: 'completed', stage: 'Ready to review', progress: 1 });
    } catch (error) {
      if (job.status !== 'cancelled') await this.update(job, { status: 'failed', stage: 'Needs attention', error: { code: error.code || 'GENERATION_FAILED', message: error instanceof ApiError ? error.message : 'Generation failed. Check the companion installation and retry.' } });
    } finally {
      if (job.status !== 'completed') await rm(this.mediaPath(job.id), { force: true }).catch(() => {});
      this.snapshots.delete(job.id); this.active = null; this.controller = null;
      finished();
      if (!this.closed) queueMicrotask(() => this.pump());
    }
  }
  async close() { this.closed = true; this.controller?.abort(); await this.activeDone; await this.writes; }
}
