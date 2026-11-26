import assert from 'node:assert/strict'
import { loadUser } from './adapter.ts'
import { handleDeleteAccount, type DeleteAccountDeps, type VerifiedUser } from './handler.ts'

const URL = 'https://example.test'
const KEY = 'test-key'
const emailUser: VerifiedUser = {
  id: 'user-from-jwt',
  identities: [{ provider: 'email', providerToken: null }]
}

Deno.test('getUser 404 is already gone', async () => {
  assert.deepEqual(await loadUser(URL, KEY, 'jwt', statusFetch(404)), { kind: 'absent' })
  const response = await handleDeleteAccount(post('jwt'), depsFor(404))
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { ok: true })
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

function depsWith(fetchImpl: typeof fetch): DeleteAccountDeps {
  return {
    authAdmin: {
      getUser: (token) => loadUser(URL, KEY, token, fetchImpl),
      async lookupUser() {
        return 'present'
      },
      async deleteUser() {
        return { ok: true }
      }
    },
    db: { async deleteCallerRows() {} },
    async revokeGoogle() {
      return true
    },
    log() {}
  }
}

Deno.test('a lost-response retry returns ok without deleting twice', async () => {
  let gone = false
  const lookups: string[] = []
  const deleted: string[] = []
  const deps: DeleteAccountDeps = {
    authAdmin: {
      async getUser() {
        return { kind: 'user', user: emailUser }
      },
      async lookupUser(id) {
        lookups.push(id)
        return gone ? 'absent' : 'present'
      },
      async deleteUser(id) {
        deleted.push(id)
        gone = true
        return { ok: true }
      }
    },
    db: { async deleteCallerRows() {} },
    async revokeGoogle() {
      return true
    },
    log() {}
  }
  const first = await handleDeleteAccount(post('jwt'), deps)
  const second = await handleDeleteAccount(post('jwt'), deps)
  assert.equal(first.status, 200)
  assert.deepEqual(await first.json(), { ok: true })
  assert.equal(second.status, 200)
  assert.deepEqual(await second.json(), { ok: true })
  assert.deepEqual(lookups, ['user-from-jwt', 'user-from-jwt'])
  assert.deepEqual(deleted, ['user-from-jwt'])
})

function post(token: string): Request {
  return new Request('http://local/delete-account', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  })
}

function statusFetch(status: number): typeof fetch {
  return async () => new Response(null, { status })
}

function depsFor(status: number): DeleteAccountDeps {
  return {
    authAdmin: {
      getUser: (token) => loadUser(URL, KEY, token, statusFetch(status)),
      async lookupUser() {
        return 'present'
      },
      async deleteUser() {
        return { ok: true }
      }
    },
    db: { async deleteCallerRows() {} },
    async revokeGoogle() {
      return true
    },
    log() {}
  }
}
