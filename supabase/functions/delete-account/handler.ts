export type DeleteFailure = 'notSignedIn' | 'unknown'
export type DeleteAccountResult = { ok: true } | { ok: false; failure: DeleteFailure }

export type VerifiedUser = {
  id: string
}

export type GetUserResult =
  | { kind: 'user'; user: VerifiedUser }
  | { kind: 'invalid' }
  | { kind: 'absent' }
  | { kind: 'unavailable' }

export type DeleteUserResult = { ok: true } | { ok: false; absent?: boolean }

export type DeleteAccountDeps = {
  authAdmin: {
    getUser(token: string): Promise<GetUserResult>
    deleteUser(id: string): Promise<DeleteUserResult>
  }
  db: {
    deleteCallerRows(userId: string): Promise<void>
  }
}

export async function handleDeleteAccount(request: Request, deps: DeleteAccountDeps): Promise<Response> {
  if (request.method !== 'POST') return respond(405, { ok: false, failure: 'unknown' })
  const token = bearer(request)
  if (!token) return respond(401, { ok: false, failure: 'notSignedIn' })

  let verified: GetUserResult
  try {
    verified = await deps.authAdmin.getUser(token)
  } catch {
    return respond(500, { ok: false, failure: 'unknown' })
  }
  if (verified.kind === 'invalid') return respond(401, { ok: false, failure: 'notSignedIn' })
  if (verified.kind === 'unavailable') return respond(500, { ok: false, failure: 'unknown' })
  if (verified.kind === 'absent') return respond(200, { ok: true })

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
