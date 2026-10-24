import { writeFile } from 'node:fs/promises';
import { parseLesson } from '../shared/lesson.ts';
import { ApiError } from './security.mjs';

export async function narrateLesson(lesson, { jobId, output, signal, apiKey = process.env.ELEVENLABS_API_KEY, fetcher = fetch } = {}) {
  if (!apiKey) throw new ApiError(503, 'NARRATION_NOT_CONFIGURED', 'Add ELEVENLABS_API_KEY to .env.local on this machine and restart the companion, or generate without narration.');
  const parts = lesson.scenes.map((scene) => `${scene.title}. ${scene.body}`);
  const text = parts.join(' ');
  if (text.length > 4500) throw new ApiError(422, 'NARRATION_TOO_LONG', 'This lesson is too long to narrate. Generate a shorter lesson or export without narration.');
  let response;
  try {
    response = await fetcher(`https://api.elevenlabs.io/v1/text-to-speech/${process.env.LEARNAGRAM_ELEVENLABS_VOICE_ID || 'SAz9YHcvj6GT2YYXdXww'}/with-timestamps?output_format=mp3_44100_128`, {
      method: 'POST', headers: { 'xi-api-key': apiKey, 'content-type': 'application/json' },
      body: JSON.stringify({ text, model_id: 'eleven_multilingual_v2', voice_settings: { stability: 0.5, similarity_boost: 0.78, speed: 1.05 } }),
      signal: AbortSignal.any([signal || new AbortController().signal, AbortSignal.timeout(90000)]),
    });
  } catch (error) { if (signal?.aborted) throw new ApiError(499, 'CANCELLED', 'Generation was cancelled.'); throw new ApiError(502, 'NARRATION_UNAVAILABLE', 'ElevenLabs could not be reached. Check your connection and try again.'); }
  if (!response.ok) throw new ApiError(502, 'NARRATION_FAILED', response.status === 401 ? 'ElevenLabs rejected the local API key. Update .env.local and restart the companion.' : `ElevenLabs could not generate narration (HTTP ${response.status}). Check your ElevenLabs credits and voice access, or export without narration.`);
  const data = await response.json();
  // Original-text alignment preserves boundaries when normalization expands numbers or code.
  const alignment = data.alignment || data.normalized_alignment;
  const times = alignment?.character_end_times_seconds;
  if (typeof data.audio_base64 !== 'string' || !Array.isArray(times) || !times.length || data.audio_base64.length > 20 * 1024 * 1024) throw new ApiError(502, 'INVALID_NARRATION', 'ElevenLabs returned incomplete narration. Retry or export without narration.');
  const durationSeconds = Math.ceil(Number(times.at(-1)) * 100) / 100;
  if (!Number.isFinite(durationSeconds) || durationSeconds < 1 || durationSeconds > 240) throw new ApiError(502, 'INVALID_NARRATION', 'Narration duration is outside the supported range. Generate a shorter lesson.');
  // Alignment uses normalized text; find each scene boundary in the returned characters.
  const chars = alignment.characters?.join('') || text;
  let cursor = 0, previousTime = 0;
  const scenes = lesson.scenes.map((scene, i) => {
    const index = chars.indexOf(parts[i], cursor);
    const endIndex = index >= 0 ? index + parts[i].length - 1 : Math.min(times.length - 1, Math.round((cursor + parts[i].length) / text.length * times.length));
    const endTime = Number(times[Math.min(endIndex, times.length - 1)]) || (durationSeconds * (i + 1) / parts.length);
    const span = endTime - previousTime;
    cursor = (index >= 0 ? index : cursor) + parts[i].length + 1;
    previousTime = endTime;
    if (span < 4) throw new ApiError(422, 'NARRATION_SCENE_TOO_SHORT', 'A narrated scene lasts less than four seconds. Regenerate a lesson with fuller scene explanations or export without narration.');
    if (span > 30) throw new ApiError(422, 'NARRATION_SCENE_TOO_LONG', 'A scene needs over 30 seconds of narration. Shorten the lesson or export without narration.');
    return { ...scene, durationSeconds: Math.ceil(span * 100) / 100 };
  });
  if (signal?.aborted) throw new ApiError(499, 'CANCELLED', 'Generation was cancelled.');
  await writeFile(output, Buffer.from(data.audio_base64, 'base64'), { mode: 0o600 });
  return parseLesson({ ...lesson, scenes, narration: { audioUrl: `/api/jobs/${jobId}/audio`, durationSeconds } });
}
