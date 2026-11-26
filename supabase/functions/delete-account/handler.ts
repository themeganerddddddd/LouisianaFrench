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

export type DeleteUserResult = { ok: true } | { ok: false; absent?: boolean }

export type DeleteAccountDeps = {
  authAdmin: {
    getUser(token: string): Promise<GetUserResult>
    deleteUser(id: string): Promise<DeleteUserResult>
  }
  db: {
    deleteCallerRows(userId: string): Promise<void>
  }
  revokeGoogle(providerToken: string): Promise<boolean>
  log(entry: { revoked: false }): void
}

export async function handleDeleteAccount(
  _request: Request,
  _deps: DeleteAccountDeps
): Promise<Response> {
  return new Response(JSON.stringify({ ok: false, failure: 'unknown' }), {
    status: 500,
    headers: { 'content-type': 'application/json' }
  })
}
