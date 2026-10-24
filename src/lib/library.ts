import { parseLesson, type GeneratedLesson } from '../../shared/lesson'
import type { Comment, Person, Reel } from '../data/reels'

const DATABASE = 'unvibe-library'
const STORE = 'generated-reels'
const MAX_AUDIO_URI_LENGTH = 8 * 1024 * 1024
let opening: Promise<IDBDatabase> | undefined

type SavedReel = { id: string; savedAt: number; reel: Reel }

function storageError(error: unknown, action: string): Error {
  const name = error instanceof DOMException ? error.name : ''
  if (name === 'QuotaExceededError')
    return new Error('Your browser storage is full. Free some space or remove a saved reel, then try again. This reel has not been saved.')
  return new Error(
    `Could not ${action} your local reel library. ${error instanceof Error ? error.message : 'Browser storage is unavailable.'}`,
  )
}

function openLibrary(): Promise<IDBDatabase> {
  if (opening) return opening
  opening = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('This browser does not provide IndexedDB. Use a browser with local storage enabled.'))
      return
    }
    const request = indexedDB.open(DATABASE, 1)
    let failed = false
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: 'id' })
    }
    request.onsuccess = () => {
      if (failed) {
        request.result.close()
        return
      }
      request.result.onversionchange = () => {
        request.result.close()
        opening = undefined
      }
      resolve(request.result)
    }
    request.onerror = () => reject(request.error ?? new Error('Browser storage could not be opened.'))
    request.onblocked = () => {
      failed = true
      reject(new Error('Close other Unvibe tabs so the local library can be opened, then try again.'))
    }
  }).catch((error: unknown) => {
    opening = undefined
    throw error
  })
  return opening
}

function text(value: unknown, label: string, max: number): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error(`${label} is missing or too long.`)
  return value
}

function person(value: Person): Person {
  if (!value || typeof value !== 'object') throw new Error('The saved author is invalid.')
  return { handle: text(value.handle, 'Author handle', 100), color: text(value.color, 'Author color', 40) }
}

function comment(value: Comment): Comment {
  if (!value || typeof value !== 'object') throw new Error('A saved comment is invalid.')
  return {
    id: text(value.id, 'Comment ID', 200),
    author: person(value.author),
    text: text(value.text, 'Comment', 4000),
    time: text(value.time, 'Comment time', 40),
    likes: count(value.likes),
    ...(value.agent === undefined ? {} : { agent: value.agent === true }),
  }
}

function count(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) throw new Error('A saved engagement count is invalid.')
  return value
}

/** Only portable, bounded data is stored: audio must survive without the companion. */
function portableReel(reel: Reel): Reel {
  if (!reel || typeof reel !== 'object' || reel.kind !== 'generated' || !reel.props || !('lesson' in reel.props))
    throw new Error('Only a generated lesson can be saved to this library.')
  if (!/^r-generated-[a-zA-Z0-9_-]{1,160}$/.test(reel.id)) throw new Error('The generated reel ID is invalid.')
  if (reel.poll) throw new Error('Generated polls are not supported by the local library.')
  const lesson = parseLesson(reel.props.lesson)
  if (lesson.narration) {
    const audio = lesson.narration.audioUrl
    if (audio.length > MAX_AUDIO_URI_LENGTH || !/^data:audio\/(?:mpeg|mp3|wav|ogg);base64,[A-Za-z0-9+/]+={0,2}$/.test(audio)) {
      throw new Error(
        'Save the narration as an audio data URI of at most 8 MiB before adding this reel. Temporary audio links will not work offline.',
      )
    }
  }
  if (!Array.isArray(reel.comments) || reel.comments.length > 200)
    throw new Error('The saved comments are invalid or exceed the local library limit.')
  if (reel.suggestions && (!Array.isArray(reel.suggestions) || reel.suggestions.length > 10))
    throw new Error('The saved question suggestions are invalid.')
  if (!reel.session || typeof reel.session !== 'object') throw new Error('The saved session details are invalid.')
  return {
    id: reel.id,
    kind: 'generated',
    props: { lesson },
    author: person(reel.author),
    caption: text(reel.caption, 'Caption', 5000),
    session: {
      repo: text(reel.session.repo, 'Repository', 100),
      title: text(reel.session.title, 'Session title', 400),
      when: text(reel.session.when, 'Session time', 40),
    },
    likes: count(reel.likes),
    shares: count(reel.shares),
    comments: reel.comments.map(comment),
    ...(reel.topic ? { topic: text(reel.topic, 'Topic', 100) } : {}),
    ...(reel.suggestions ? { suggestions: reel.suggestions.map((value) => text(value, 'Question suggestion', 300)) } : {}),
  }
}

export async function saveGeneratedReel(reel: Reel): Promise<void> {
  try {
    const portable = portableReel(reel)
    const database = await openLibrary()
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE, 'readwrite')
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error ?? new Error('The browser could not save the reel.'))
      transaction.onabort = () => reject(transaction.error ?? new Error('Saving the reel was interrupted.'))
      transaction.objectStore(STORE).put({ id: portable.id, savedAt: Date.now(), reel: portable } satisfies SavedReel)
    })
  } catch (error) {
    throw storageError(error, 'save to')
  }
}

export async function loadGeneratedReels(): Promise<Reel[]> {
  try {
    const database = await openLibrary()
    const rows = await new Promise<SavedReel[]>((resolve, reject) => {
      const transaction = database.transaction(STORE, 'readonly')
      const request = transaction.objectStore(STORE).getAll()
      request.onsuccess = () => resolve(request.result as SavedReel[])
      request.onerror = () => reject(request.error ?? new Error('The browser could not read saved reels.'))
      transaction.onabort = () => reject(transaction.error ?? new Error('Reading saved reels was interrupted.'))
    })
    return rows.sort((a, b) => b.savedAt - a.savedAt).map((row) => portableReel(row.reel))
  } catch (error) {
    throw storageError(error, 'read')
  }
}

export async function deleteGeneratedReel(id: string): Promise<void> {
  try {
    const database = await openLibrary()
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE, 'readwrite')
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error ?? new Error('The browser could not remove the reel.'))
      transaction.onabort = () => reject(transaction.error ?? new Error('Removing the reel was interrupted.'))
      transaction.objectStore(STORE).delete(id)
    })
  } catch (error) {
    throw storageError(error, 'update')
  }
}

const STOP_WORDS = new Set(
  'a also am an and are as at be been but by can change changed code could did do does explain for from get had has have here how i in into is it its just know lesson like made make me more my new now of on or our please really session should tell that the their them there these they this those to us use used using was were what when where which who why will with work works would you your'.split(
    ' ',
  ),
)
function terms(value: string) {
  return [...new Set(value.toLowerCase().match(/[a-z][a-z0-9_-]{2,}/g) ?? [])].filter((word) => !STOP_WORDS.has(word))
}
function relevance(query: string[], content: string) {
  const words = terms(content)
  return query.reduce(
    (score, token) =>
      score +
      (words.some(
        (word) => word === token || (Math.min(word.length, token.length) >= 4 && (word.startsWith(token) || token.startsWith(word))),
      )
        ? 1
        : 0),
    0,
  )
}

/** A transparent local excerpt lookup, never a substitute for a new model answer. */
export function replyFromLesson(lesson: GeneratedLesson, question: string): string {
  const prefix = 'From your lesson (local lookup): '
  const query = terms(question)
  if (
    !query.length ||
    query.every((word) => ['summarize', 'summary', 'takeaway', 'takeaways', 'remember', 'cover', 'covers'].includes(word))
  ) {
    return `${prefix}${lesson.summary}\n\nTakeaways: ${lesson.takeaways.join(' ')}`
  }
  const scenes = lesson.scenes
    .map((scene) => ({
      scene,
      score:
        relevance(query, scene.title) * 3 + relevance(query, [scene.body, scene.evidence, scene.code, ...(scene.bullets ?? [])].join(' ')),
    }))
    .sort((a, b) => b.score - a.score)
  const best = scenes[0]
  if (best?.score) {
    const { scene } = best
    return `${prefix}${scene.title} — ${scene.body}${scene.evidence ? `\n\nSession excerpt: “${scene.evidence}”` : ''}`
  }
  const takeaway = lesson.takeaways.find((item) => relevance(query, item))
  if (takeaway) return `${prefix}${takeaway}`
  if (relevance(query, lesson.summary)) return `${prefix}${lesson.summary}`
  return `${prefix}The saved lesson does not cover that question. It explains “${lesson.title}”. Ask Claude Code in the original session for a new answer; this lookup only reads the saved lesson.`
}
