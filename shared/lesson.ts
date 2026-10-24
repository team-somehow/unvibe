/** The portable, validated input used by both the browser preview and the MP4 renderer. */
export type LessonSceneKind = 'hook' | 'code' | 'concept' | 'tradeoff' | 'recap'

export type LessonScene = {
  id: string
  kind: LessonSceneKind
  title: string
  body: string
  durationSeconds: number
  code?: string
  language?: string
  sourceLabel?: string
  evidence?: string
  bullets?: string[]
}

export type GeneratedLesson = {
  version: 1
  title: string
  repo: string
  prompt: string
  summary: string
  scenes: LessonScene[]
  takeaways: string[]
  source: { kind: 'claude-code' | 'text'; sessionId?: string }
  narration?: { audioUrl: string; durationSeconds: number }
}

export const LESSON_FPS = 30
const MAX_EMBEDDED_AUDIO_LENGTH = 8 * 1024 * 1024

const boundedString = (maxLength: number) => ({ type: 'string', minLength: 1, maxLength })
const strings = (minItems: number, maxItems: number, maxLength: number) => ({
  type: 'array',
  minItems,
  maxItems,
  items: boundedString(maxLength),
})

/** Kept free of browser / Node dependencies so extraction and rendering share one contract. */
export const LESSON_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['version', 'title', 'repo', 'prompt', 'summary', 'scenes', 'takeaways', 'source'],
  properties: {
    version: { const: 1 },
    title: boundedString(100),
    repo: boundedString(100),
    prompt: boundedString(400),
    summary: boundedString(500),
    scenes: {
      type: 'array',
      minItems: 3,
      maxItems: 8,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'kind', 'title', 'body', 'durationSeconds'],
        properties: {
          id: { type: 'string', pattern: '^[a-zA-Z0-9_-]{1,40}$' },
          kind: { enum: ['hook', 'code', 'concept', 'tradeoff', 'recap'] },
          title: boundedString(100),
          body: boundedString(500),
          durationSeconds: { type: 'number', minimum: 4, maximum: 30 },
          code: boundedString(2400),
          language: boundedString(30),
          sourceLabel: boundedString(160),
          evidence: boundedString(500),
          bullets: strings(1, 5, 160),
        },
      },
    },
    takeaways: strings(1, 5, 160),
    source: {
      type: 'object',
      additionalProperties: false,
      required: ['kind'],
      properties: { kind: { enum: ['claude-code', 'text'] }, sessionId: boundedString(160) },
    },
    narration: {
      type: 'object',
      additionalProperties: false,
      required: ['audioUrl', 'durationSeconds'],
      properties: { audioUrl: boundedString(MAX_EMBEDDED_AUDIO_LENGTH), durationSeconds: { type: 'number', minimum: 1, maximum: 240 } },
    },
  },
} as const

function objectAt(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${path} must be an object.`)
  return value as Record<string, unknown>
}

function onlyKeys(value: Record<string, unknown>, keys: string[], path: string) {
  const unknown = Object.keys(value).find((key) => !keys.includes(key))
  if (unknown) throw new Error(`${path}.${unknown} is not supported.`)
}

function stringAt(value: unknown, path: string, max: number, multiline = false): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error(`${path} must contain 1–${max} characters.`)
  // Intentional: model output may not inject terminal control bytes into code / metadata.
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value) || (!multiline && /[\n\r]/.test(value)))
    throw new Error(`${path} contains unsupported control characters.`)
  return value.trim()
}

function numberAt(value: unknown, path: string, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max)
    throw new Error(`${path} must be between ${min} and ${max}.`)
  return value
}

function arrayAt(value: unknown, path: string, min: number, max: number): unknown[] {
  if (!Array.isArray(value) || value.length < min || value.length > max) throw new Error(`${path} must contain ${min}–${max} items.`)
  return value
}

/** Reject invalid / unbounded model output before it reaches a Remotion composition. */
export function parseLesson(value: unknown): GeneratedLesson {
  const lesson = objectAt(value, 'lesson')
  onlyKeys(lesson, ['version', 'title', 'repo', 'prompt', 'summary', 'scenes', 'takeaways', 'source', 'narration'], 'lesson')
  if (lesson.version !== 1) throw new Error('lesson.version must be 1.')
  const source = objectAt(lesson.source, 'lesson.source')
  onlyKeys(source, ['kind', 'sessionId'], 'lesson.source')
  if (source.kind !== 'claude-code' && source.kind !== 'text') throw new Error('lesson.source.kind must be claude-code or text.')
  const ids = new Set<string>()
  const scenes = arrayAt(lesson.scenes, 'lesson.scenes', 3, 8).map((raw, index): LessonScene => {
    const path = `lesson.scenes[${index}]`
    const scene = objectAt(raw, path)
    onlyKeys(scene, ['id', 'kind', 'title', 'body', 'durationSeconds', 'code', 'language', 'sourceLabel', 'evidence', 'bullets'], path)
    const id = stringAt(scene.id, `${path}.id`, 40)
    if (!/^[a-zA-Z0-9_-]+$/.test(id) || ids.has(id))
      throw new Error(`${path}.id must be unique and contain only letters, numbers, hyphens and underscores.`)
    ids.add(id)
    const kind = stringAt(scene.kind, `${path}.kind`, 20) as LessonSceneKind
    if (!['hook', 'code', 'concept', 'tradeoff', 'recap'].includes(kind)) throw new Error(`${path}.kind is not supported.`)
    return {
      id,
      kind,
      title: stringAt(scene.title, `${path}.title`, 100),
      body: stringAt(scene.body, `${path}.body`, 500),
      durationSeconds: numberAt(scene.durationSeconds, `${path}.durationSeconds`, 4, 30),
      ...(scene.code === undefined ? {} : { code: stringAt(scene.code, `${path}.code`, 2400, true) }),
      ...(scene.language === undefined ? {} : { language: stringAt(scene.language, `${path}.language`, 30) }),
      ...(scene.sourceLabel === undefined ? {} : { sourceLabel: stringAt(scene.sourceLabel, `${path}.sourceLabel`, 160) }),
      ...(scene.evidence === undefined ? {} : { evidence: stringAt(scene.evidence, `${path}.evidence`, 500, true) }),
      ...(scene.bullets === undefined
        ? {}
        : { bullets: arrayAt(scene.bullets, `${path}.bullets`, 1, 5).map((item, j) => stringAt(item, `${path}.bullets[${j}]`, 160)) }),
    }
  })
  const result: GeneratedLesson = {
    version: 1,
    title: stringAt(lesson.title, 'lesson.title', 100),
    repo: stringAt(lesson.repo, 'lesson.repo', 100),
    prompt: stringAt(lesson.prompt, 'lesson.prompt', 400),
    summary: stringAt(lesson.summary, 'lesson.summary', 500),
    scenes,
    takeaways: arrayAt(lesson.takeaways, 'lesson.takeaways', 1, 5).map((item, i) => stringAt(item, `lesson.takeaways[${i}]`, 160)),
    source: {
      kind: source.kind,
      ...(source.sessionId === undefined ? {} : { sessionId: stringAt(source.sessionId, 'lesson.source.sessionId', 160) }),
    },
  }
  if (lesson.narration !== undefined) {
    const narration = objectAt(lesson.narration, 'lesson.narration')
    onlyKeys(narration, ['audioUrl', 'durationSeconds'], 'lesson.narration')
    const audioUrl = stringAt(narration.audioUrl, 'lesson.narration.audioUrl', MAX_EMBEDDED_AUDIO_LENGTH)
    // The browser uses an authenticated fetch + blob URL. The renderer uses a short-lived,
    // token-protected loopback server. Neither needs arbitrary file / script URLs.
    let allowed = /^data:audio\/(?:mpeg|mp3|wav|ogg);base64,[A-Za-z0-9+/]+={0,2}$/.test(audioUrl)
    if (!allowed && audioUrl.length <= 1500) {
      allowed = audioUrl.startsWith('/') && !audioUrl.startsWith('//') && !audioUrl.includes('\\')
      try {
        const url = new URL(audioUrl)
        allowed ||=
          !url.username &&
          !url.password &&
          (url.protocol === 'https:' || url.protocol === 'blob:' || (url.protocol === 'http:' && url.hostname === '127.0.0.1'))
      } catch {
        /* relative paths are checked above */
      }
    }
    if (!allowed)
      throw new Error('lesson.narration.audioUrl must be supported audio media, a browser blob, or a private loopback media URL.')
    result.narration = { audioUrl, durationSeconds: numberAt(narration.durationSeconds, 'lesson.narration.durationSeconds', 1, 240) }
  }
  return result
}

export function lessonDurationInFrames(lesson: GeneratedLesson, fps = LESSON_FPS): number {
  const scenes = lesson.scenes.reduce((total, scene) => total + Math.ceil(scene.durationSeconds * fps), 0)
  return Math.max(scenes, Math.ceil((lesson.narration?.durationSeconds ?? 0) * fps))
}

export function lessonTimeline(lesson: GeneratedLesson, fps = LESSON_FPS) {
  let cursor = 0
  const duration = lessonDurationInFrames(lesson, fps)
  return lesson.scenes.map((scene, index) => {
    const from = cursor
    const frames = index === lesson.scenes.length - 1 ? duration - cursor : Math.ceil(scene.durationSeconds * fps)
    cursor += frames
    return { scene, from, frames }
  })
}

/** Studio-only example. Actual generated posts always supply their own validated lesson. */
export const EXAMPLE_LESSON: GeneratedLesson = {
  version: 1,
  title: 'Make the change. Understand the why.',
  repo: 'studio-example',
  prompt: 'Explain this refactor from the supplied code.',
  summary: 'A sample lesson showing how a session becomes a source-backed reel.',
  source: { kind: 'text' },
  scenes: [
    {
      id: 'hook',
      kind: 'hook',
      title: 'One small change. One useful lesson.',
      body: 'Your session supplies the story. The reel makes the reasoning easy to revisit.',
      durationSeconds: 6,
    },
    {
      id: 'code',
      kind: 'code',
      title: 'Keep the important code in view.',
      body: 'Code excerpts come from the session you choose to share.',
      code: 'const lesson = await createLesson(session)\nconst video = await renderLesson(lesson)',
      language: 'typescript',
      sourceLabel: 'Illustrative studio example',
      durationSeconds: 7,
    },
    {
      id: 'recap',
      kind: 'recap',
      title: 'Keep the idea, not another tab.',
      body: 'Review the lesson before publishing it to your feed.',
      durationSeconds: 6,
    },
  ],
  takeaways: ['Start with a session you choose.', 'Check the evidence behind the lesson.', 'Review the video before you post.'],
}
