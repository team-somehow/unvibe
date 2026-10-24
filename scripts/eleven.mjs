// Generates reel audio with ElevenLabs: narration (with word timings), a music bed, and sound effects.
// Usage: node --env-file=.env.local scripts/eleven.mjs <reelId> [--force]
// Reads src/reels/scripts/<reelId>.json, writes public/audio/<reelId>/* and src/reels/audio/<reelId>.json.
// Assets are cached by content hash, so re-running only regenerates what changed.
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const API = 'https://api.elevenlabs.io/v1'
const KEY = process.env.ELEVENLABS_API_KEY
if (!KEY) throw new Error('ELEVENLABS_API_KEY missing; run with --env-file=.env.local')

const [id, flag] = process.argv.slice(2)
if (!id) throw new Error('usage: node --env-file=.env.local scripts/eleven.mjs <reelId> [--force]')
const force = flag === '--force'

const script = JSON.parse(readFileSync(`src/reels/scripts/${id}.json`, 'utf8'))
const manifestPath = `src/reels/audio/${id}.json`
const prev = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : { scenes: [], sfx: {} }
const outDir = `public/audio/${id}`
mkdirSync(outDir, { recursive: true })
mkdirSync('src/reels/audio', { recursive: true })

const hash = (o) => createHash('sha1').update(JSON.stringify(o)).digest('hex').slice(0, 12)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Retries 429/5xx with exponential backoff and jitter
async function call(path, body, { json = false } = {}) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${API}${path}`, {
      method: 'POST',
      headers: { 'xi-api-key': KEY, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) return json ? res.json() : Buffer.from(await res.arrayBuffer())
    const text = await res.text()
    if ((res.status === 429 || res.status >= 500) && attempt < 6) {
      const wait = 1000 * 2 ** attempt + Math.random() * 1000
      console.warn(`  ${res.status} on ${path}, retrying in ${Math.round(wait)}ms`)
      await sleep(wait)
      continue
    }
    throw new Error(`${res.status} ${path}: ${text.slice(0, 400)}`)
  }
}

function toWords(alignment) {
  const words = []
  let cur = null
  const { characters, character_start_times_seconds: s, character_end_times_seconds: e } = alignment
  characters.forEach((ch, i) => {
    if (/\s/.test(ch)) {
      if (cur) words.push(cur)
      cur = null
      return
    }
    if (!cur) cur = { text: '', start: s[i], end: e[i] }
    cur.text += ch
    cur.end = e[i]
  })
  if (cur) words.push(cur)
  return words.map((w) => ({ text: w.text, start: +w.start.toFixed(3), end: +w.end.toFixed(3) }))
}

const manifest = { id, voice: script.voice?.id ?? null, scenes: [], music: null, sfx: {} }

// Narration, one file per scene so visuals can be timed to each line
const scenes = script.scenes ?? []
for (const [i, scene] of scenes.entries()) {
  const v = script.voice
  const model = scene.model ?? v.model ?? 'eleven_multilingual_v2'
  const settings = { ...(v.settings ?? {}), ...(scene.settings ?? {}) }
  const h = hash({ text: scene.text, voice: v.id, model, settings })
  const file = `audio/${id}/${scene.id}.mp3`
  const old = prev.scenes?.find((s) => s.id === scene.id)
  const base = { id: scene.id, file, minSeconds: scene.minSeconds ?? 0, leadIn: scene.leadIn ?? 0.25, padAfter: scene.padAfter ?? 0.45 }
  if (!scene.text) {
    manifest.scenes.push({ ...base, file: null, duration: 0, words: [], hash: null })
    continue
  }
  if (!force && old?.hash === h && existsSync(join('public', file))) {
    manifest.scenes.push({ ...base, duration: old.duration, words: old.words, hash: h })
    console.log(`  cached  ${file}`)
    continue
  }
  const body = { text: scene.text, model_id: model, voice_settings: settings }
  if (model !== 'eleven_v3') {
    if (i > 0 && scenes[i - 1].text) body.previous_text = scenes[i - 1].text
    if (i < scenes.length - 1 && scenes[i + 1].text) body.next_text = scenes[i + 1].text
  }
  const res = await call(`/text-to-speech/${v.id}/with-timestamps?output_format=mp3_44100_128`, body, { json: true })
  writeFileSync(join('public', file), Buffer.from(res.audio_base64, 'base64'))
  const words = toWords(res.alignment)
  const duration = +res.alignment.character_end_times_seconds.at(-1).toFixed(3)
  manifest.scenes.push({ ...base, duration, words, hash: h })
  console.log(`  voice   ${file} (${duration}s)`)
}

// Sound effects unique to this reel
for (const fx of script.sfx ?? []) {
  const h = hash(fx)
  const file = `audio/${id}/sfx-${fx.id}.mp3`
  const old = prev.sfx?.[fx.id]
  if (!force && old?.hash === h && existsSync(join('public', file))) {
    manifest.sfx[fx.id] = old
    console.log(`  cached  ${file}`)
    continue
  }
  const buf = await call('/sound-generation?output_format=mp3_44100_128', {
    text: fx.prompt,
    duration_seconds: fx.duration ?? null,
    prompt_influence: fx.promptInfluence ?? 0.5,
  })
  writeFileSync(join('public', file), buf)
  manifest.sfx[fx.id] = { file, duration: fx.duration ?? null, hash: h }
  console.log(`  sfx     ${file}`)
}

// Music bed sized to the whole reel
if (script.music?.prompt) {
  const total = manifest.scenes.reduce((sum, s) => sum + Math.max(s.minSeconds, s.leadIn + s.duration + s.padAfter), 0) + 1
  const seconds = Math.min(120, Math.max(script.music.minSeconds ?? 10, Math.ceil(total)))
  const h = hash({ prompt: script.music.prompt, seconds })
  const file = `audio/${id}/music.mp3`
  if (!force && prev.music?.hash === h && existsSync(join('public', file))) {
    manifest.music = prev.music
    console.log(`  cached  ${file}`)
  } else {
    let buf
    try {
      buf = await call('/music?output_format=mp3_44100_128', { prompt: script.music.prompt, music_length_ms: seconds * 1000, force_instrumental: true })
    } catch (e) {
      if (!String(e).startsWith('Error: 4')) throw e
      buf = await call('/music?output_format=mp3_44100_128', { prompt: script.music.prompt, music_length_ms: seconds * 1000 })
    }
    writeFileSync(join('public', file), buf)
    manifest.music = { file, duration: seconds, hash: h }
    console.log(`  music   ${file} (${seconds}s)`)
  }
}

writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
console.log(`wrote ${manifestPath}`)
