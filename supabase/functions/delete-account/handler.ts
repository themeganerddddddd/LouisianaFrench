export type DeleteFailure = 'notSignedIn' | 'unknown'
export type DeleteAccountResult = { ok: true } | { ok: false; failure: DeleteFailure }

/** Google is the only provider this function can revoke. Apple revoke is C11a. */
export type RevocableProvider = 'google'

export type VerifiedIdentity = {
  provider: string
  providerToken: string | null
}

export type VerifiedUser = {
  id: string
  identities: VerifiedIdentity[]
}

export type GetUserResult =
  | { kind: 'user'; user: VerifiedUser }
  | { kind: 'invalid' }
  | { kind: 'absent' }
  | { kind: 'unavailable' }

export type LookupResult = 'present' | 'absent' | 'unavailable'

export type DeleteUserResult = { ok: true } | { ok: false; absent?: boolean }

export type DeleteAccountDeps = {
  authAdmin: {
    getUser(token: string): Promise<GetUserResult>
    lookupUser(id: string): Promise<LookupResult>
    deleteUser(id: string): Promise<DeleteUserResult>
  }
  db: {
    deleteCallerRows(userId: string): Promise<void>
  }
  revokeGoogle(providerToken: string): Promise<boolean>
  log(entry: { revoked: false }): void
}

export async function handleDeleteAccount(request: Request, deps: DeleteAccountDeps): Promise<Response> {
  if (request.method !== 'POST') return respond(405, { ok: false, failure: 'unknown' })
  const token = bearer(request)
  if (!token) return respond(401, { ok: false, failure: 'notSignedIn' })

  const verified = await deps.authAdmin.getUser(token)
  if (verified.kind === 'invalid') return respond(401, { ok: false, failure: 'notSignedIn' })
  if (verified.kind === 'unavailable') return respond(500, { ok: false, failure: 'unknown' })
  if (verified.kind === 'absent') return respond(200, { ok: true })

  await revokeIfPresent(verified.user, deps)
  try {
    await deps.db.deleteCallerRows(verified.user.id)
  } catch {
    return respond(500, { ok: false, failure: 'unknown' })
  }

  let removed: DeleteUserResult
  try {
    removed = await deps.authAdmin.deleteUser(verified.user.id)
  } catch {
    return respond(500, { ok: false, failure: 'unknown' })
  }
  if (!removed.ok) {
    if (removed.absent) return respond(200, { ok: true })
    return respond(500, { ok: false, failure: 'unknown' })
  }
  return respond(200, { ok: true })
}

function respond(status: number, body: DeleteAccountResult): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

function bearer(request: Request): string | null {
  const header = request.headers.get('authorization')
  if (!header) return null
  const match = /^Bearer\s+(\S+)$/i.exec(header.trim())
  return match?.[1] ?? null
}

async function revokeIfPresent(user: VerifiedUser, deps: DeleteAccountDeps) {
  const provider: RevocableProvider = 'google'
  const tokens = user.identities
    .filter((identity) => identity.provider === provider && identity.providerToken)
    .map((identity) => identity.providerToken as string)
  if (tokens.length === 0) return
  let revoked = true
  for (const providerToken of tokens) {
    try {
      if (!await deps.revokeGoogle(providerToken)) revoked = false
    } catch {
      revoked = false
    }
  }
  if (!revoked) deps.log({ revoked: false })
}
