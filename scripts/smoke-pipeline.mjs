// Opt-in real provider smoke test. Uses only the committed fixture, never real session history.
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { loadConfig } from '../companion/config.mjs'
import { createCompanion } from '../companion/server.mjs'

const live = process.argv.includes('--live-claude')
const narrate = process.argv.includes('--narrate')
const render = !process.argv.includes('--no-render')
const dataDir = await mkdtemp(path.join(tmpdir(), 'unvibe-pipeline-'))
const config = await loadConfig({ ...process.env, LEARNAGRAM_COMPANION_DATA_DIR: dataDir, LEARNAGRAM_COMPANION_PORT: '0', LEARNAGRAM_COMPANION_TOKEN: randomBytes(32).toString('base64url'), LEARNAGRAM_CLAUDE_PROJECTS_DIR: path.resolve('companion/test/fixtures/projects') })
const companion = await createCompanion(config)
async function request(route, body) {
  const response = await fetch(`${companion.url}${route}`, { method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${config.token}`, Origin: 'http://127.0.0.1:5174', ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) })
  if (!response.ok) throw new Error(`Request ${route} failed: ${await response.text()}`)
  return response
}
try {
  const { sessions } = await (await request('/api/sessions')).json()
  assert(sessions.length > 0, 'Fixture session must be discovered')
  const preview = await (await request(`/api/sessions/${sessions[0].id}/preview`)).json()
  assert(preview.transcriptHash)
  const job = await (await request('/api/jobs', { sessionId: sessions[0].id, provider: live ? 'claude' : 'local', render, narrate, expectedTranscriptHash: preview.transcriptHash })).json()
  let state = job
  let stage = ''
  const started = Date.now()
  while (!['completed', 'failed', 'cancelled'].includes(state.status)) {
    if (stage !== state.stage) { console.log(`${state.status}: ${state.stage}`); stage = state.stage }
    if (Date.now() - started > 420000) throw new Error('Pipeline smoke test exceeded seven minutes')
    await new Promise((resolve) => setTimeout(resolve, 1500))
    state = await (await request(`/api/jobs/${job.id}`)).json()
  }
  if (state.status !== 'completed') throw new Error(`Pipeline failed: ${JSON.stringify(state.error)}`)
  assert(state.lesson?.scenes.length >= 3)
  assert(!/sliding window/i.test(state.lesson.title), 'Fixture should not produce the hard-coded rate limiter')
  const outputDir = path.resolve('output/pipeline-smoke')
  await mkdir(outputDir, { recursive: true })
  await writeFile(path.join(outputDir, 'lesson.json'), JSON.stringify(state.lesson, null, 2))
  if (narrate) { assert.equal(state.narration.status, 'included'); const audio = Buffer.from(await (await request(`/api/jobs/${job.id}/audio`)).arrayBuffer()); assert(audio.length > 1000); await writeFile(path.join(outputDir, 'narration.mp3'), audio) }
  if (render) { const video = Buffer.from(await (await request(`/api/jobs/${job.id}/video`)).arrayBuffer()); assert(video.length > 10000); assert.equal(video.subarray(4, 8).toString(), 'ftyp'); await writeFile(path.join(outputDir, 'reel.mp4'), video) }
  const report = { provider: state.provider, narrated: narrate, rendered: render, title: state.lesson.title, scenes: state.lesson.scenes.length, elapsedSeconds: Math.round((Date.now() - started) / 1000), videoBytes: state.video?.bytes, outputDir }
  await writeFile(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report))
} finally { await companion.close() }
