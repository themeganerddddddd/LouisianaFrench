import type { AccountEvent, AuthFailure, AuthResult, DeleteResult, Provider } from './accountMachine'
import { parseAuthUrl } from './authLink'

const NATIVE_REDIRECT = 'com.westleysturhan.louisianafrench://auth/callback'
const BY_CODE: Record<string, AuthFailure> = {
  invalid_credentials: 'wrongCredentials', invalid_grant: 'wrongCredentials',
  email_not_confirmed: 'emailNotConfirmed', user_already_exists: 'emailTaken', email_exists: 'emailTaken',
  weak_password: 'weakPassword', over_request_rate_limit: 'rateLimited', over_email_send_rate_limit: 'rateLimited'
}

type User = { id?: string; email?: string; app_metadata?: { provider?: string } }
type AuthError = { code?: string; message?: string }
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
    signOut(input: { scope: 'local' }): Promise<{ error?: AuthError | null }>
  }
  deleteAccount(): Promise<{ error?: AuthError | null }>
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

function fail(error: AuthError | null | undefined): AuthResult {
  return { ok: false, failure: mapAuthFailure(error) }
}
function googleFail(error: AuthError | null | undefined): AuthResult {
  return { ok: false, failure: mapAuthFailure(error) === 'network' ? 'network' : 'oauthFailed' }
}
function signedIn(user: User | null | undefined, fallback: Provider): AuthResult {
  if (!user?.id) return { ok: false, failure: 'unknown' }
  const provider: Provider = user.app_metadata?.provider === 'google' || fallback === 'google' ? 'google' : 'email'
  return { ok: true, identity: { id: user.id, email: user.email || '', username: null, provider } }
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
  redirectTo = NATIVE_REDIRECT
}: {
  client: AccountClient | null
  openBrowser?: Browser
  timeoutMs?: number
  redirectTo?: string
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
  return {
    async signIn(email: string, password: string): Promise<AuthResult> {
      if (!client) return unavailable
      const { data, error } = await client.auth.signInWithPassword({ email, password })
      if (error || !data?.session?.user) return fail(error)
      return signedIn(data.session.user, 'email')
    },
    async signUp(email: string, password: string, _username: string | null): Promise<AuthResult> {
      if (!client) return unavailable
      const { data, error } = await client.auth.signUp({ email, password })
      if (error) return fail(error)
      if (!data?.session?.user) return { ok: true, pending: 'confirmSignUp' }
      return signedIn(data.session.user, 'email')
    },
    async sendReset(email: string): Promise<AuthResult> {
      if (!client) return unavailable
      const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: `${redirectTo}?type=recovery` })
      return error ? fail(error) : { ok: true, pending: 'passwordReset' }
    },
    async updatePassword(password: string): Promise<AuthResult> {
      if (!client) return unavailable
      const { data, error } = await client.auth.updateUser({ password })
      const user = data?.user || data?.session?.user
      if (error || !user) return fail(error)
      return signedIn(user, 'email')
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
          void client.auth.signOut({ scope: 'local' }).catch(() => undefined)
        })
        return { ok: false, failure: 'network' }
      }
      if (mine !== attempt) return { ok: false, failure: 'oauthCancelled' }
      if (exchanged.error || !exchanged.data?.session?.user) return googleFail(exchanged.error)
      noteSuccess(mine)
      return signedIn(exchanged.data.session.user, 'google')
    },
    async signOut() {
      if (client) await client.auth.signOut({ scope: 'local' })
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
      const exchanged = await caught(client.auth.exchangeCodeForSession(link.code))
      if (exchanged.error || !exchanged.data?.session?.user) return null
      noteSuccess(mine)
      return link.kind === 'recovery' ? { type: 'recoveryLinkOpened' } : null
    },
    async deleteAccount(): Promise<DeleteResult> {
      if (!client) return { ok: false, failure: 'notSignedIn' }
      try {
        const { error } = await client.deleteAccount()
        if (error) {
          if (mapAuthFailure(error) === 'network') return { ok: false, failure: 'network' }
          if (error.code === 'session_not_found' || /jwt|not signed in/i.test(error.message || '')) {
            return { ok: false, failure: 'notSignedIn' }
          }
          return { ok: false, failure: 'unknown' }
        }
        try { await client.auth.signOut({ scope: 'local' }) } catch { /* The server account is already gone. */ }
        return { ok: true }
      } catch {
        return { ok: false, failure: 'unknown' }
      }
    }
  }
}

export type AccountConnector = ReturnType<typeof createAccountConnector>
