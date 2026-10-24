import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { VERSION } from './config.mjs';
import { claudeStatus } from './claude.mjs';
import { JobQueue } from './jobs.mjs';
import { SessionStore } from './sessions.mjs';
import { ApiError, authorizeRequest, jsonBody } from './security.mjs';

export async function createCompanion(config, dependencies = {}) {
  const sessions = dependencies.sessions || new SessionStore(config);
  const queue = dependencies.queue || new JobQueue(config, sessions, dependencies);
  await queue.init();
  let cachedStatus, statusAt = 0;
  const server = createServer(async (request, response) => {
    const origin = request.headers.origin;
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Vary', 'Origin');
    if (origin && config.origins.has(origin)) response.setHeader('Access-Control-Allow-Origin', origin);
    const json = (status, value) => { response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); response.end(JSON.stringify(value)); };
    try {
      const url = new URL(request.url, `http://127.0.0.1:${config.port}`);
      if (url.search || url.hash) throw new ApiError(400, 'INVALID_URL', 'Pass pairing credentials using the Authorization header.');
      const route = url.pathname;
      authorizeRequest(request, config, { publicHealth: route === '/api/health' && request.method === 'GET' });
      if (request.method === 'OPTIONS') {
        response.writeHead(204, { 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Private-Network': 'true', 'Access-Control-Max-Age': '600' }); response.end(); return;
      }
      if (route === '/api/health' && request.method === 'GET') { json(200, { service: 'learnagram-companion', version: VERSION }); return; }
      if (route === '/api/status' && request.method === 'GET') {
        if (!cachedStatus || Date.now() - statusAt > 15000) { cachedStatus = await (dependencies.claudeStatus || claudeStatus)(config); statusAt = Date.now(); }
        json(200, { service: 'learnagram-companion', version: VERSION, claude: cachedStatus, sessionCount: sessions.lastList.length, queue: { active: queue.active?.id || null, waiting: queue.jobs.filter((job) => job.status === 'queued').length }, rendering: { available: true, format: '1080×1920 H.264 MP4' }, narration: { available: Boolean(process.env.ELEVENLABS_API_KEY), provider: 'ElevenLabs' } }); return;
      }
      if (route === '/api/sessions' && request.method === 'GET') { json(200, { sessions: await sessions.list() }); return; }
      const preview = route.match(/^\/api\/sessions\/([a-f0-9]{32})\/preview$/);
      if (preview && request.method === 'GET') { json(200, await sessions.preview(preview[1])); return; }
      if (route === '/api/jobs' && request.method === 'GET') { json(200, { jobs: queue.list() }); return; }
      if (route === '/api/jobs' && request.method === 'POST') { json(202, await queue.create(await jsonBody(request))); return; }
      const job = route.match(/^\/api\/jobs\/([a-f0-9-]{36})(?:\/(cancel|render|video|audio))?$/);
      if (job) {
        const [, id, action] = job;
        if (!action && request.method === 'GET') { json(200, queue.public(queue.get(id))); return; }
        if (action === 'cancel' && request.method === 'POST') { json(200, await queue.cancel(id)); return; }
        if (action === 'render' && request.method === 'POST') { json(202, await queue.retryRender(id)); return; }
        if (['video', 'audio'].includes(action) && request.method === 'GET') {
          const current = queue.get(id);
          if (action === 'video' && !current.video || action === 'audio' && current.narration.status !== 'included') throw new ApiError(404, 'MEDIA_NOT_READY', 'This media file is not ready yet.');
          const filename = queue.mediaPath(id, action === 'audio' ? 'mp3' : 'mp4');
          let info;
          try { info = await stat(filename); } catch { throw new ApiError(404, 'MEDIA_MISSING', 'This local media file is missing. Export the lesson again.'); }
          let start = 0, end = info.size - 1;
          const range = request.headers.range;
          if (range) {
            const match = range.match(/^bytes=(\d+)-(\d*)$/);
            if (!match || Number(match[1]) >= info.size || match[2] && Number(match[2]) < Number(match[1])) { response.writeHead(416, { 'Content-Range': `bytes */${info.size}` }); response.end(); return; }
            start = Number(match[1]); end = match[2] ? Math.min(Number(match[2]), end) : end;
          }
          response.writeHead(range ? 206 : 200, { 'Content-Type': action === 'audio' ? 'audio/mpeg' : 'video/mp4', 'Content-Length': end - start + 1, 'Accept-Ranges': 'bytes', ...(range ? { 'Content-Range': `bytes ${start}-${end}/${info.size}` } : {}), 'Content-Disposition': `inline; filename="learnagram-${id}.${action === 'audio' ? 'mp3' : 'mp4'}"` });
          createReadStream(filename, { start, end }).on('error', () => response.destroy()).pipe(response); return;
        }
      }
      throw new ApiError(404, 'NOT_FOUND', 'This companion endpoint does not exist.');
    } catch (error) {
      if (response.headersSent) { response.destroy(); return; }
      json(error instanceof ApiError ? error.status : 500, { error: { code: error instanceof ApiError ? error.code : 'INTERNAL_ERROR', message: error instanceof ApiError ? error.message : 'The local companion could not complete the request. Check your local installation and retry.' } });
    }
  });
  server.requestTimeout = 20000; server.headersTimeout = 10000; server.maxRequestsPerSocket = 100;
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(config.port, '127.0.0.1', resolve); });
  config.port = server.address().port;
  return { server, sessions, queue, url: `http://127.0.0.1:${config.port}`, async close() { server.closeAllConnections(); await new Promise((resolve) => server.close(resolve)); await queue.close(); } };
}
