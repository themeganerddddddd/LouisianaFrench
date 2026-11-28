import type { AccountEvent, AuthFailure, AuthResult, DeleteResult, Identity, Provider } from './accountMachine'
import { checkUsername as askUsername, loadProfileRead, setUsername as saveUsername, type SetUsernameResult } from '../identity/username'
import { parseAuthUrl } from './authLink'

const BY_CODE: Record<string, AuthFailure> = {
  invalid_credentials: 'wrongCredentials', invalid_grant: 'wrongCredentials',
  email_not_confirmed: 'emailNotConfirmed', user_already_exists: 'emailTaken', email_exists: 'emailTaken',
  weak_password: 'weakPassword', over_request_rate_limit: 'rateLimited', over_email_send_rate_limit: 'rateLimited'
}

type User = { id?: string; email?: string; app_metadata?: { provider?: string } }
type AuthError = { code?: string; message?: string }
type InvokeError = AuthError & {
  name?: string
  context?: { status?: number; json?: () => Promise<unknown> }
}
type DeleteBody = { ok: true } | { ok: false; failure: 'notSignedIn' | 'unknown' }
type AuthCall = {
  data?: { session?: { user?: User | null } | null; user?: User | null; url?: string } | null
  error?: AuthError | null
}
type Browser = (url: string) => Promise<{ url: string } | null>

export type AccountClient = {
  auth: {
    signInWithPassword(input: { email: string; password: string }): Promise<AuthCall>
    signUp(input: { email: string; password: string }): Promise<AuthCall>
    resetPasswordForEmail(email: string, options: { redirectTo: string }): Promise<{ error?: AuthError | null }>
    updateUser(input: { password: string }): Promise<AuthCall>
    signInWithOAuth(input: { provider: 'google'; options: { redirectTo: string; skipBrowserRedirect: boolean } }): Promise<AuthCall>
    exchangeCodeForSession(code: string): Promise<AuthCall>
    getSession(): Promise<{ data?: { session?: { access_token?: string } | null } | null }>
    signOut(input: { scope: 'local' }): Promise<{ error?: AuthError | null }>
  }
  functions: {
    invoke(
      name: 'delete-account',
      options: { method: 'POST'; headers: { Authorization: string } }
    ): Promise<{ data: DeleteBody | null; error: InvokeError | null }>
  }
  rpc?: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message?: string } | null }>
  from?: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        maybeSingle: () => Promise<{ data: unknown; error?: AuthError | null }>
      }
    }
  }
}

export function mapAuthFailure(error: AuthError | null | undefined): AuthFailure {
  if (!error) return 'unknown'
  if (error.code && BY_CODE[error.code]) return BY_CODE[error.code]
  const raw = String(error.message || '')
  if (/com\.westleysturhan\.louisianafrench|code=|error_description/i.test(raw)) return 'unknown'
  if (/invalid login credentials/i.test(raw)) return 'wrongCredentials'
  if (/already registered|already exists/i.test(raw)) return 'emailTaken'
  if (/not confirmed/i.test(raw)) return 'emailNotConfirmed'
  if (/weak/i.test(raw)) return 'weakPassword'
  if (/rate limit/i.test(raw)) return 'rateLimited'
  if (/network|fetch|timeout/i.test(raw)) return 'network'
  if (/unavailable/i.test(raw)) return 'unavailable'
  return 'unknown'
}

function hasRpc(client: AccountClient | null | undefined): client is AccountClient & {
  rpc: NonNullable<AccountClient['rpc']>
} {
  return typeof client?.rpc === 'function'
}
function fail(error: AuthError | null | undefined): AuthResult {
  return { ok: false, failure: mapAuthFailure(error) }
}
function googleFail(error: AuthError | null | undefined): AuthResult {
  return { ok: false, failure: mapAuthFailure(error) === 'network' ? 'network' : 'oauthFailed' }
}
async function signedIn(client: AccountClient, user: User | null | undefined, fallback: Provider): Promise<AuthResult> {
  if (!user?.id) return { ok: false, failure: 'unknown' }
  const provider: Provider = user.app_metadata?.provider === 'google' || fallback === 'google' ? 'google' : 'email'
  const profile = await loadProfileRead(client, user.id)
  return {
    ok: true,
    profileRead: profile.ok,
    identity: { id: user.id, email: user.email || '', username: profile.username, provider }
  }
}

function statusOf(error: InvokeError | null | undefined): number | null {
  const status = error?.context?.status
  return typeof status === 'number' ? status : null
}

async function readDeleteBody(error: InvokeError | null): Promise<DeleteBody | null> {
  const read = error?.context?.json
  if (!read) return null
  try {
    return asDeleteBody(await read.call(error.context))
  } catch {
    return null
  }
}

function asDeleteBody(value: unknown): DeleteBody | null {
  if (!value || typeof value !== 'object') return null
  const body = value as { ok?: unknown; failure?: unknown }
  if (body.ok === true) return { ok: true }
  if (body.ok === false && (body.failure === 'notSignedIn' || body.failure === 'unknown')) {
    return { ok: false, failure: body.failure }
  }
  return null
}

function isNetwork(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const named = error as { name?: string; message?: string }
  if (named.name === 'FunctionsFetchError') return true
  return mapAuthFailure({ message: named.message }) === 'network'
}

function isAuthError(error: unknown): error is AuthError {
  return !!error && typeof error === 'object'
}

export function firstOf<T>(work: Promise<T>, ms: number): Promise<T | 'timeout'> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<'timeout'>((resolve) => {
    timer = setTimeout(() => resolve('timeout'), ms)
  })
  return Promise.race([work, timeout]).finally(() => clearTimeout(timer))
}

function caught(work: Promise<AuthCall>): Promise<AuthCall> {
  return work.catch((error: unknown) => ({ error: isAuthError(error) ? error : { message: 'unknown' } }))
}

export function createAccountConnector({
  client,
  openBrowser,
  timeoutMs = 15000,
  redirectTo,
  onIdentity = () => {}
}: {
  client: AccountClient | null
  openBrowser?: Browser
  timeoutMs?: number
  redirectTo: string
  onIdentity?: (next: Identity | null | ((previous: Identity | null) => Identity | null)) => void
}) {
  const unavailable: AuthResult = { ok: false, failure: 'unavailable' }
  let attempt = 0
  let succeeded = 0
  let oauthInFlight = false
  function beginAttempt() {
    attempt += 1
    return attempt
  }
  function noteSuccess(id: number) {
    if (id > succeeded) succeeded = id
  }
  function orphaned(id: number) {
    return !(succeeded > id)
  }
  function announce<T extends AuthResult>(result: T): T {
    if (result.ok && 'identity' in result) onIdentity(result.identity)
    return result
  }
  async function setName(name: string): Promise<SetUsernameResult> {
    if (!hasRpc(client)) return { ok: false, reason: 'network' }
    return saveUsername((fn, args) => client.rpc(fn, args), name)
  }
  return {
    async signIn(email: string, password: string): Promise<AuthResult> {
      if (!client) return unavailable
      const { data, error } = await client.auth.signInWithPassword({ email, password })
      if (error || !data?.session?.user) return fail(error)
      return announce(await signedIn(client, data.session.user, 'email'))
    },
    async signUp(email: string, password: string, username: string | null): Promise<AuthResult> {
      if (!client) return unavailable
      const { data, error } = await client.auth.signUp({ email, password })
      if (error) return fail(error)
      if (!data?.session?.user) return { ok: true, pending: 'confirmSignUp' }
      const result = await signedIn(client, data.session.user, 'email')
      if (!result.ok || !username || !('identity' in result)) return announce(result)
      const saved = await setName(username)
      if (!saved.ok) return announce({ ...result, usernameFailed: saved })
      return announce({ ...result, identity: { ...result.identity, username: saved.username } })
    },
    async sendReset(email: string): Promise<AuthResult> {
      if (!client) return unavailable
      const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: `${redirectTo}?type=recovery` })
      return error ? fail(error) : { ok: true, pending: 'passwordReset' }
    },
    async updatePassword(password: string): Promise<AuthResult> {
      if (!client) return unavailable
      const mine = beginAttempt()
      const pending = caught(client.auth.updateUser({ password }))
      const updated = await firstOf(pending, timeoutMs)
      if (updated === 'timeout') {
        void pending.then((result) => {
          if (!(result.data?.user || result.data?.session?.user) || !orphaned(mine) || !client) return
          void client.auth.signOut({ scope: 'local' }).catch(() => undefined).then(() => onIdentity(null))
        })
        return { ok: false, failure: 'network' }
      }
      const user = updated.data?.user || updated.data?.session?.user
      if (updated.error || !user) return fail(updated.error)
      noteSuccess(mine)
      return announce(await signedIn(client, user, 'email'))
    },
    async signInWithProvider(provider: string): Promise<AuthResult> {
      if (provider !== 'google') return { ok: false, failure: 'oauthFailed' }
      if (!client || !openBrowser) return unavailable
      const mine = beginAttempt()
      const started = await firstOf(caught(client.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, skipBrowserRedirect: true }
      })), timeoutMs)
      if (started === 'timeout') return { ok: false, failure: 'network' }
      if (started.error || !started.data?.url) return started.error ? googleFail(started.error) : { ok: false, failure: 'oauthFailed' }
      let returned: { url: string } | null
      oauthInFlight = true
      try {
        returned = await openBrowser(started.data.url)
      } catch (error) {
        return isAuthError(error) ? googleFail(error) : { ok: false, failure: 'oauthFailed' }
      } finally {
        oauthInFlight = false
      }
      if (mine !== attempt || !returned?.url) return { ok: false, failure: 'oauthCancelled' }
      const link = parseAuthUrl(returned.url, redirectTo)
      if (link.kind === 'failed' || link.kind === 'ignored') return { ok: false, failure: 'oauthFailed' }
      const pending = caught(client.auth.exchangeCodeForSession(link.code))
      const exchanged = await firstOf(pending, timeoutMs)
      if (exchanged === 'timeout') {
        void pending.then((result) => {
          if (!result.data?.session?.user || !orphaned(mine) || !client) return
          void client.auth.signOut({ scope: 'local' }).catch(() => undefined).then(() => onIdentity(null))
        })
        return { ok: false, failure: 'network' }
      }
      if (mine !== attempt) return { ok: false, failure: 'oauthCancelled' }
      if (exchanged.error || !exchanged.data?.session?.user) return googleFail(exchanged.error)
      noteSuccess(mine)
      return announce(await signedIn(client, exchanged.data.session.user, 'google'))
    },
    async signOut() {
      if (client) {
        try { await client.auth.signOut({ scope: 'local' }) } catch { /* The learner still leaves this device. */ }
      }
      onIdentity(null)
    },
    async setUsername(name: string): Promise<SetUsernameResult> {
      const saved = await setName(name)
      if (saved.ok) onIdentity((previous) => previous && { ...previous, username: saved.username })
      return saved
    },
    async checkUsername(candidate: string) {
      if (!hasRpc(client)) return { status: 'error' as const }
      return askUsername((fn, args) => client.rpc(fn, args), candidate)
    },
    beginAttempt,
    noteSuccess,
    orphaned,
    async consumeAuthUrl(url: string): Promise<AccountEvent | null> {
      const link = parseAuthUrl(url, redirectTo)
      if (link.kind === 'oauth' && oauthInFlight) return null
      if (link.kind !== 'recovery' && link.kind !== 'confirmed' && link.kind !== 'oauth') return null
      if (!client) return null
      const mine = beginAttempt()
      const pending = caught(client.auth.exchangeCodeForSession(link.code))
      const exchanged = await firstOf(pending, timeoutMs)
      if (exchanged === 'timeout') {
        void pending.then((result) => {
          if (!result.data?.session?.user || !orphaned(mine) || !client) return
          void client.auth.signOut({ scope: 'local' }).catch(() => undefined).then(() => onIdentity(null))
        })
        return { type: 'linkFailed', failure: 'network' }
      }
      if (exchanged.error || !exchanged.data?.session?.user) {
        const failure = exchanged.error ? mapAuthFailure(exchanged.error) : 'unknown'
        return { type: 'linkFailed', failure: failure === 'oauthCancelled' ? 'unknown' : failure }
      }
      noteSuccess(mine)
      if (link.kind === 'recovery') {
        announce(await signedIn(client, exchanged.data.session.user, 'email'))
        return { type: 'recoveryLinkOpened' }
      }
      const result = announce(await signedIn(client, exchanged.data.session.user, link.kind === 'oauth' ? 'google' : 'email'))
      return result.ok && 'identity' in result ? { type: 'opened', identity: result.identity, profileRead: result.profileRead } : { type: 'linkFailed', failure: 'unknown' }
    },
    async deleteAccount(): Promise<DeleteResult> {
      if (!client) return { ok: false, failure: 'notSignedIn' }
      try {
        const session = await client.auth.getSession()
        const token = session.data?.session?.access_token
        if (!token) return { ok: false, failure: 'notSignedIn' }
        const invoked = await client.functions.invoke('delete-account', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        })
        const body = invoked.data ?? await readDeleteBody(invoked.error)
        if (body?.ok) {
          try { await client.auth.signOut({ scope: 'local' }) } catch { /* The server account is already gone. */ }
          onIdentity(null)
          return { ok: true }
        }
        if (body && !body.ok) return { ok: false, failure: body.failure }
        if (statusOf(invoked.error) === 401) return { ok: false, failure: 'notSignedIn' }
        if (isNetwork(invoked.error)) return { ok: false, failure: 'network' }
        return { ok: false, failure: 'unknown' }
      } catch (error) {
        return { ok: false, failure: isNetwork(error) ? 'network' : 'unknown' }
      }
    }
  }
}

export type AccountConnector = ReturnType<typeof createAccountConnector>
