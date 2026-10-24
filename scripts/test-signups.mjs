import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { afterEach, test } from 'node:test'
import { registerSignup } from '../src/lib/signups.ts'

const originalFetch = globalThis.fetch
const originalWindow = globalThis.window
globalThis.window = { setTimeout, clearTimeout }
afterEach(() => { globalThis.fetch = originalFetch })
process.on('exit', () => { globalThis.window = originalWindow })

const confirmed = () => new Response(JSON.stringify({ writeResults: [{}], commitTime: '2026-10-24T12:00:00Z' }), { status: 200 })
const failure = (status, code = 'PERMISSION_DENIED') => new Response(JSON.stringify({ error: { status: code } }), { status })

function mockResponses(responses) {
  const calls = []
  globalThis.fetch = async (url, options) => {
    calls.push({ url, ...options, body: JSON.parse(options.body) })
    assert.ok(responses.length, 'unexpected extra request')
    const response = responses.shift()
    if (response instanceof Error) throw response
    return response
  }
  return calls
}

test('new signup confirms server-timestamped Firestore creation', async () => {
  const calls = mockResponses([confirmed()])
  await registerSignup(' Visitor@Example.COM ')
  assert.equal(calls.length, 1)
  const write = calls[0].body.writes[0]
  assert.deepEqual(write.currentDocument, { exists: false })
  assert.deepEqual(write.updateTransforms, [{ fieldPath: 'createdAt', setToServerValue: 'REQUEST_TIME' }])
  assert.equal(write.update.fields.email.stringValue, 'visitor@example.com')
  assert.match(write.update.name, new RegExp(`/unvibeSignups/${createHash('sha256').update('visitor@example.com').digest('hex')}$`))
  assert.equal(calls[0].cache, 'no-store')
  assert.equal(calls[0].credentials, 'omit')
})

for (const status of [403, 409]) {
  test(`a ${status} alone does not confirm a duplicate; requires a verified identical no-op`, async () => {
    const calls = mockResponses([failure(status), confirmed()])
    await registerSignup('visitor@example.com')
    assert.equal(calls.length, 2)
    const duplicate = calls[1].body.writes[0]
    assert.deepEqual(duplicate.currentDocument, { exists: true })
    assert.deepEqual(duplicate.updateMask.fieldPaths, ['email', 'source', 'consent'])
    assert.equal(duplicate.updateTransforms, undefined)
    assert.equal(duplicate.update.fields.createdAt, undefined)
    assert.equal(duplicate.update.name, calls[0].body.writes[0].update.name)
  })
}

test('denied create and denied duplicate remain failure', async () => {
  mockResponses([failure(403), failure(403)])
  await assert.rejects(registerSignup('visitor@example.com'), /couldn’t save/)
})

test('a missing duplicate cannot be mistaken for success', async () => {
  mockResponses([failure(409), failure(404, 'NOT_FOUND')])
  await assert.rejects(registerSignup('visitor@example.com'), /couldn’t save/)
})

test('unconfirmed 200 response never reports signup success', async () => {
  mockResponses([new Response('{}', { status: 200 })])
  await assert.rejects(registerSignup('visitor@example.com'), /couldn’t save/)
})

test('network and quota errors show retryable feedback', async () => {
  mockResponses([new TypeError('offline')])
  await assert.rejects(registerSignup('visitor@example.com'), /Check your connection/)
  mockResponses([failure(429, 'RESOURCE_EXHAUSTED')])
  await assert.rejects(registerSignup('visitor@example.com'), /Too many attempts/)
})

test('invalid email never makes a Firestore request', async () => {
  const calls = mockResponses([])
  await assert.rejects(registerSignup('invalid'), /valid email/)
  assert.equal(calls.length, 0)
})
