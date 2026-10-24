import { randomBytes } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ApiError } from './security.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let bundlePromise;

export async function renderLesson(lesson, { output, audioPath, signal, onProgress = () => {} } = {}) {
  let renderer, bundler;
  try { [renderer, bundler] = await Promise.all([import('@remotion/renderer'), import('@remotion/bundler')]); }
  catch { throw new ApiError(503, 'RENDERER_NOT_INSTALLED', 'Install project dependencies with npm install before exporting MP4.'); }
  let mediaServer;
  try {
    let renderInput = lesson;
    if (lesson.narration && audioPath) {
      const mediaPath = `/${randomBytes(32).toString('hex')}.mp3`;
      mediaServer = createServer((request, response) => {
        const actualPort = mediaServer.address()?.port;
        if (request.url !== mediaPath || request.headers.host !== `127.0.0.1:${actualPort}`) { response.writeHead(404); response.end(); return; }
        response.writeHead(200, { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' });
        createReadStream(audioPath).on('error', () => response.destroy()).pipe(response);
      });
      await new Promise((resolve, reject) => { mediaServer.once('error', reject); mediaServer.listen(0, '127.0.0.1', resolve); });
      renderInput = { ...lesson, narration: { ...lesson.narration, audioUrl: `http://127.0.0.1:${mediaServer.address().port}${mediaPath}` } };
    }
    if (!bundlePromise) bundlePromise = bundler.bundle({ entryPoint: path.join(repoRoot, 'src/remotion/generated.tsx'), publicDir: path.join(repoRoot, 'public'), onProgress: () => {} }).catch((error) => { bundlePromise = undefined; throw error; });
    const serveUrl = await bundlePromise;
    if (signal?.aborted) throw new ApiError(499, 'CANCELLED', 'Export was cancelled.');
    const { cancel, cancelSignal } = renderer.makeCancelSignal();
    const abort = () => cancel();
    signal?.addEventListener('abort', abort, { once: true });
    const timeout = setTimeout(cancel, 180000);
    try {
      // Avoid localhost's IPv4/IPv6 split selecting an unrelated service on port 3000.
      const reservation = createServer();
      await new Promise((resolve, reject) => { reservation.once('error', reject); reservation.listen(0, '127.0.0.1', resolve); });
      const port = reservation.address().port;
      await new Promise((resolve) => reservation.close(resolve));
      const composition = await renderer.selectComposition({ serveUrl, port, id: 'generated', inputProps: { lesson: renderInput }, ...(process.env.LEARNAGRAM_CHROME_PATH ? { browserExecutable: process.env.LEARNAGRAM_CHROME_PATH } : {}) });
      await renderer.renderMedia({ composition, serveUrl, port, codec: 'h264', outputLocation: output, inputProps: { lesson: renderInput }, pixelFormat: 'yuv420p', concurrency: 2, crf: 23, cancelSignal, onProgress: ({ progress }) => onProgress(progress), ...(process.env.LEARNAGRAM_CHROME_PATH ? { browserExecutable: process.env.LEARNAGRAM_CHROME_PATH } : {}) });
    } catch (error) {
      if (signal?.aborted) throw new ApiError(499, 'CANCELLED', 'Export was cancelled.');
      throw new ApiError(502, 'RENDER_FAILED', 'MP4 export failed or exceeded three minutes. Check disk space and browser availability, then retry export.');
    } finally { clearTimeout(timeout); signal?.removeEventListener('abort', abort); }
  } finally { if (mediaServer) await new Promise((resolve) => mediaServer.close(resolve)); }
}
