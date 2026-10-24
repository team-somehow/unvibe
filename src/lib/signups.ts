import { FIREBASE_API_KEY, FIREBASE_PROJECT_ID } from './firebase-config.ts'

type CommitResult = {
  writeResults?: unknown[]
  commitTime?: string
  error?: { status?: string }
}

const EMAIL = /^[^\s<>@]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/

/** Resolves only after Firestore confirms a new signup or an identical existing one. */
export async function registerSignup(rawEmail: string): Promise<void> {
  const email = rawEmail.trim().toLowerCase()
  if (email.length > 254 || email.split('@')[0].length > 64 || !EMAIL.test(email)) {
    throw new Error('Enter a valid email address.')
  }
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(email))
  const id = Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('')
  const document = `projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/unvibeSignups/${id}`
  const endpoint = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents:commit?key=${encodeURIComponent(FIREBASE_API_KEY)}`
  const fields = {
    email: { stringValue: email },
    source: { stringValue: 'unvibe-landing' },
    consent: { stringValue: 'beta_launch_email_v1' },
  }
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 30_000)

  async function commit(write: Record<string, unknown>) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ writes: [write] }),
      credentials: 'omit',
      cache: 'no-store',
      signal: controller.signal,
    })
    const result: CommitResult = await response.json().catch(() => ({}))
    return { response, result }
  }

  function confirmed({ response, result }: Awaited<ReturnType<typeof commit>>) {
    return response.ok && result.writeResults?.length === 1 && typeof result.commitTime === 'string'
  }

  try {
    const created = await commit({
      update: { name: document, fields },
      currentDocument: { exists: false },
      updateTransforms: [{ fieldPath: 'createdAt', setToServerValue: 'REQUEST_TIME' }],
    })
    if (confirmed(created)) return

    if (
      [403, 409].includes(created.response.status) ||
      ['ALREADY_EXISTS', 'FAILED_PRECONDITION'].includes(created.result.error?.status ?? '')
    ) {
      // A rejected create alone never proves membership. This exact no-op write
      // must succeed under rules requiring all stored fields to remain identical.
      // The mask preserves createdAt; exists:true prevents accidentally creating
      // a document if the first request failed for a different reason.
      const duplicate = await commit({
        update: { name: document, fields },
        updateMask: { fieldPaths: ['email', 'source', 'consent'] },
        currentDocument: { exists: true },
      })
      if (confirmed(duplicate)) return
      if (duplicate.response.status === 429) throw new Error('Too many attempts. Please try again later.')
    }
    if (created.response.status === 429) throw new Error('Too many attempts. Please try again later.')
    throw new Error('We couldn’t save your email. Please try again shortly.')
  } catch (error) {
    if (error instanceof TypeError || (error instanceof Error && error.name === 'AbortError')) {
      throw new Error('Couldn’t reach the signup service. Check your connection and try again.')
    }
    throw error
  } finally {
    window.clearTimeout(timeout)
  }
}
