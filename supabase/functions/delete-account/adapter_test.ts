import assert from 'node:assert/strict'
import { loadUser } from './adapter.ts'
import { handleDeleteAccount, type DeleteAccountDeps } from './handler.ts'

const URL = 'https://example.test'
const KEY = 'test-key'

Deno.test('getUser 404 is already gone', async () => {
  assert.deepEqual(await loadUser(URL, KEY, 'jwt', statusFetch(404)), { kind: 'absent' })
  const response = await handleDeleteAccount(post('jwt'), depsFor(404))
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { ok: true })
})

Deno.test('a deleted user retry is ok and other auth errors stay notSignedIn', async () => {
  const gone = await handleDeleteAccount(post('jwt'), depsWith(jsonFetch(403, {
    code: 403,
    error_code: 'user_not_found',
    msg: 'User from sub claim in JWT does not exist'
  })))
  assert.equal(gone.status, 200)
  assert.deepEqual(await gone.json(), { ok: true })

  const session = await handleDeleteAccount(post('jwt'), depsWith(jsonFetch(403, {
    code: 403,
    error_code: 'session_not_found',
    msg: 'User from sub claim in JWT does not exist'
  })))
  assert.equal(session.status, 401)
  assert.deepEqual(await session.json(), { ok: false, failure: 'notSignedIn' })

  const empty = await handleDeleteAccount(post('jwt'), depsWith(async () => new Response(null, { status: 403 })))
  assert.equal(empty.status, 401)
  assert.deepEqual(await empty.json(), { ok: false, failure: 'notSignedIn' })

  const broken = await handleDeleteAccount(post('jwt'), depsWith(async () => new Response('{', { status: 403 })))
  assert.equal(broken.status, 401)
  assert.deepEqual(await broken.json(), { ok: false, failure: 'notSignedIn' })

  const unauthorized = await handleDeleteAccount(post('jwt'), depsWith(async () => new Response(null, { status: 401 })))
  assert.equal(unauthorized.status, 401)
  assert.deepEqual(await unauthorized.json(), { ok: false, failure: 'notSignedIn' })
})

Deno.test('getUser 401 and 403 are notSignedIn', async () => {
  for (const status of [401, 403]) {
    assert.equal((await loadUser(URL, KEY, 'jwt', statusFetch(status))).kind, 'invalid')
    const response = await handleDeleteAccount(post('jwt'), depsFor(status))
    assert.equal(response.status, 401)
    assert.deepEqual(await response.json(), { ok: false, failure: 'notSignedIn' })
  }
})

Deno.test('getUser 500 and 429 are unknown', async () => {
  for (const status of [500, 429]) {
    assert.equal((await loadUser(URL, KEY, 'jwt', statusFetch(status))).kind, 'unavailable')
    const response = await handleDeleteAccount(post('jwt'), depsFor(status))
    assert.equal(response.status, 500)
    assert.deepEqual(await response.json(), { ok: false, failure: 'unknown' })
  }
})

Deno.test('a thrown getUser is an unknown JSON response', async () => {
  await assertUnknown(async () => {
    throw new Error('network')
  })
  await assertUnknown(async () => new Response('{', { status: 200 }))
})

async function assertUnknown(fetchImpl: typeof fetch) {
  let response: Response
  try {
    response = await handleDeleteAccount(post('jwt'), depsWith(fetchImpl))
  } catch (error) {
    assert.fail(`GET /user threw instead of returning unknown JSON: ${error}`)
  }
  assert.equal(response.status, 500)
  assert.deepEqual(await response.json(), { ok: false, failure: 'unknown' })
}

function post(token: string): Request {
  return new Request('http://local/delete-account', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  })
}

function statusFetch(status: number): typeof fetch {
  return async () => new Response(null, { status })
}

function jsonFetch(status: number, body: unknown): typeof fetch {
  return async () => new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' }
  })
}

function depsFor(status: number): DeleteAccountDeps {
  return depsWith(statusFetch(status))
}

function depsWith(fetchImpl: typeof fetch): DeleteAccountDeps {
  return {
    authAdmin: {
      getUser: (token) => loadUser(URL, KEY, token, fetchImpl),
      async deleteUser() {
        return { ok: true }
      }
    },
    db: { async deleteCallerRows() {} }
  }
}
