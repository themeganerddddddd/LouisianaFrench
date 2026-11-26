import assert from 'node:assert/strict'
import { handleDeleteAccount, type DeleteAccountDeps, type GetUserResult, type VerifiedUser } from './handler.ts'

const emailUser: VerifiedUser = {
  id: 'user-from-jwt',
  identities: [{ provider: 'email', providerToken: null }]
}

Deno.test('a missing or invalid token is 401 notSignedIn and deletes nothing', async () => {
  const missing = harness({ kind: 'user', user: emailUser })
  const noHeader = await handleDeleteAccount(post(), missing.deps)
  assert.equal(noHeader.status, 401)
  assert.deepEqual(await noHeader.json(), { ok: false, failure: 'notSignedIn' })
  assert.deepEqual(missing.calls.getUser, [])
  assert.deepEqual(missing.calls.deleted, [])

  const blank = harness({ kind: 'user', user: emailUser })
  const emptyBearer = await handleDeleteAccount(post(''), blank.deps)
  assert.equal(emptyBearer.status, 401)
  assert.deepEqual(await emptyBearer.json(), { ok: false, failure: 'notSignedIn' })
  assert.deepEqual(blank.calls.getUser, [])

  const invalid = harness({ kind: 'invalid' })
  const bad = await handleDeleteAccount(post('not-a-jwt'), invalid.deps)
  assert.equal(bad.status, 401)
  assert.deepEqual(await bad.json(), { ok: false, failure: 'notSignedIn' })
  assert.deepEqual(invalid.calls.getUser, ['not-a-jwt'])
  assert.deepEqual(invalid.calls.deleted, [])
  assert.deepEqual(invalid.calls.rows, [])
})

Deno.test('an email user is deleted from the verified id', async () => {
  const harnessed = harness({ kind: 'user', user: emailUser })
  const response = await handleDeleteAccount(post('good-token'), harnessed.deps)
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { ok: true })
  assert.deepEqual(harnessed.calls.revoked, [])
  assert.deepEqual(harnessed.calls.rows, ['user-from-jwt'])
  assert.deepEqual(harnessed.calls.deleted, ['user-from-jwt'])
  assert.ok(harnessed.calls.order.indexOf('rows') < harnessed.calls.order.indexOf('delete'))
})

Deno.test('a Google user revokes the provider token and then deletes', async () => {
  const harnessed = harness({
    kind: 'user',
    user: {
      id: 'user-from-jwt',
      identities: [{ provider: 'google', providerToken: 'ya29.provider-token' }]
    }
  })
  const response = await handleDeleteAccount(post('good-token'), harnessed.deps)
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { ok: true })
  assert.deepEqual(harnessed.calls.revoked, ['ya29.provider-token'])
  assert.deepEqual(harnessed.calls.logs, [])
  assert.deepEqual(harnessed.calls.deleted, ['user-from-jwt'])
  assert.ok(harnessed.calls.order.indexOf('revoke') < harnessed.calls.order.indexOf('delete'))
})

Deno.test('a Google user with no provider token still deletes and does not revoke', async () => {
  const harnessed = harness({
    kind: 'user',
    user: {
      id: 'user-from-jwt',
      identities: [{ provider: 'google', providerToken: null }]
    }
  })
  const response = await handleDeleteAccount(post('good-token'), harnessed.deps)
  assert.equal(response.status, 200)
  assert.deepEqual(harnessed.calls.revoked, [])
  assert.deepEqual(harnessed.calls.deleted, ['user-from-jwt'])
  assert.deepEqual(await response.json(), { ok: true })
})

Deno.test('a revoke failure still deletes and logs revoked false with no personal data', async () => {
  const harnessed = harness(
    {
      kind: 'user',
      user: {
        id: 'user-from-jwt',
        identities: [{ provider: 'google', providerToken: 'ya29.provider-token' }]
      }
    },
    { revoke: false }
  )
  const response = await handleDeleteAccount(
    post('good-token', { email: 'ada@example.com', userId: 'from-body' }),
    harnessed.deps
  )
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { ok: true })
  assert.deepEqual(harnessed.calls.deleted, ['user-from-jwt'])
  assert.deepEqual(harnessed.calls.logs, [{ revoked: false }])
  const logged = JSON.stringify(harnessed.calls.logs)
  assert.equal(logged.includes('ada@example.com'), false)
  assert.equal(logged.includes('ya29.provider-token'), false)
  assert.equal(logged.includes('user-from-jwt'), false)
  assert.equal(logged.includes('from-body'), false)
})

Deno.test('a revoke throw still deletes and logs revoked false', async () => {
  const harnessed = harness({
    kind: 'user',
    user: {
      id: 'user-from-jwt',
      identities: [{ provider: 'google', providerToken: 'ya29.provider-token' }]
    }
  })
  harnessed.deps.revokeGoogle = async () => {
    throw new Error('google unavailable')
  }
  const response = await handleDeleteAccount(post('good-token'), harnessed.deps)
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { ok: true })
  assert.deepEqual(harnessed.calls.deleted, ['user-from-jwt'])
  assert.deepEqual(harnessed.calls.logs, [{ revoked: false }])
  assert.equal(JSON.stringify(harnessed.calls.logs).includes('google unavailable'), false)
})

Deno.test('an admin delete failure is unknown and does not claim success', async () => {
  const harnessed = harness({ kind: 'user', user: emailUser }, { deleteOk: false })
  const response = await handleDeleteAccount(post('good-token'), harnessed.deps)
  const body = await response.json()
  assert.equal(response.status, 500)
  assert.deepEqual(body, { ok: false, failure: 'unknown' })
  assert.deepEqual(harnessed.calls.rows, ['user-from-jwt'])
  assert.equal(JSON.stringify(body).includes('partial'), false)
})

Deno.test('a second call after the user is gone is ok and does not delete again', async () => {
  let gone = false
  const calls = { deleted: [] as string[] }
  const deps: DeleteAccountDeps = {
    authAdmin: {
      async getUser() {
        if (gone) return { kind: 'absent' }
        return { kind: 'user', user: emailUser }
      },
      async deleteUser(id) {
        calls.deleted.push(id)
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
  const first = await handleDeleteAccount(post('good-token'), deps)
  const second = await handleDeleteAccount(post('good-token'), deps)
  assert.equal(first.status, 200)
  assert.deepEqual(await first.json(), { ok: true })
  assert.equal(second.status, 200)
  assert.deepEqual(await second.json(), { ok: true })
  assert.deepEqual(calls.deleted, ['user-from-jwt'])
})

Deno.test('the user id is the verified user, never the body', async () => {
  const harnessed = harness({ kind: 'user', user: emailUser })
  const response = await handleDeleteAccount(
    post('good-token', { userId: 'from-body', id: 'also-from-body', sub: 'from-body' }),
    harnessed.deps
  )
  assert.equal(response.status, 200)
  assert.deepEqual(harnessed.calls.getUser, ['good-token'])
  assert.deepEqual(harnessed.calls.rows, ['user-from-jwt'])
  assert.deepEqual(harnessed.calls.deleted, ['user-from-jwt'])
})

Deno.test('only POST is accepted', async () => {
  const harnessed = harness({ kind: 'user', user: emailUser })
  const response = await handleDeleteAccount(
    new Request('http://local/delete-account', { method: 'GET', headers: { Authorization: 'Bearer good-token' } }),
    harnessed.deps
  )
  assert.equal(response.status, 405)
  assert.deepEqual(await response.json(), { ok: false, failure: 'unknown' })
  assert.deepEqual(harnessed.calls.getUser, [])
  assert.deepEqual(harnessed.calls.deleted, [])
})

function post(token?: string, body?: unknown): Request {
  const headers = new Headers()
  if (token !== undefined) headers.set('Authorization', `Bearer ${token}`)
  return new Request('http://local/delete-account', {
    method: 'POST',
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  })
}

function harness(verified: GetUserResult, options: { revoke?: boolean; deleteOk?: boolean } = {}) {
  const calls = {
    getUser: [] as string[],
    rows: [] as string[],
    deleted: [] as string[],
    revoked: [] as string[],
    logs: [] as unknown[],
    order: [] as string[]
  }
  const deps: DeleteAccountDeps = {
    authAdmin: {
      async getUser(token) {
        calls.getUser.push(token)
        calls.order.push('getUser')
        return verified
      },
      async deleteUser(id) {
        calls.deleted.push(id)
        calls.order.push('delete')
        if (options.deleteOk === false) return { ok: false }
        return { ok: true }
      }
    },
    db: {
      async deleteCallerRows(userId) {
        calls.rows.push(userId)
        calls.order.push('rows')
      }
    },
    async revokeGoogle(providerToken) {
      calls.revoked.push(providerToken)
      calls.order.push('revoke')
      return options.revoke !== false
    },
    log(entry) {
      calls.logs.push(entry)
    }
  }
  return { deps, calls }
}
