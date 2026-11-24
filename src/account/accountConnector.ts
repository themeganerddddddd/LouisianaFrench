import type { AuthFailure, AuthResult, DeleteResult, Provider } from './accountMachine'
import { loadProfileUsername } from '../identity/username'

const REDIRECT = 'com.westleysturhan.louisianafrench://auth/callback'
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
  from?: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        maybeSingle: () => Promise<{ data: unknown; error?: AuthError | null }>
      }
    }
  }
}

let attempt = 0

export function beginAttempt() {
  attempt += 1
  return attempt
}
export function stillCurrent(id: number) {
  return id === attempt
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
async function signedIn(client: AccountClient, user: User | null | undefined, fallback: Provider): Promise<AuthResult> {
  if (!user?.id) return { ok: false, failure: 'unknown' }
  const provider: Provider = user.app_metadata?.provider === 'google' || fallback === 'google' ? 'google' : 'email'
  const username = await loadProfileUsername(client, user.id)
  return { ok: true, identity: { id: user.id, email: user.email || '', username, provider } }
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

function googleCode(url: string) {
  try {
    if (!url.startsWith(REDIRECT)) return null
    const parsed = new URL(url)
    if (parsed.searchParams.get('error')) return null
    return parsed.searchParams.get('code')
  } catch {
    return null
  }
}

export function createAccountConnector({
  client,
  openBrowser,
  timeoutMs = 15000
}: {
  client: AccountClient | null
  openBrowser?: Browser
  timeoutMs?: number
}) {
  const unavailable: AuthResult = { ok: false, failure: 'unavailable' }
  return {
    async signIn(email: string, password: string): Promise<AuthResult> {
      if (!client) return unavailable
      const { data, error } = await client.auth.signInWithPassword({ email, password })
      if (error || !data?.session?.user) return fail(error)
      return signedIn(client, data.session.user, 'email')
    },
    async signUp(email: string, password: string, _username: string | null): Promise<AuthResult> {
      if (!client) return unavailable
      const { data, error } = await client.auth.signUp({ email, password })
      if (error) return fail(error)
      if (!data?.session?.user) return { ok: true, pending: 'confirmSignUp' }
      return signedIn(client, data.session.user, 'email')
    },
    async sendReset(email: string): Promise<AuthResult> {
      if (!client) return unavailable
      const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: REDIRECT })
      return error ? fail(error) : { ok: true, pending: 'passwordReset' }
    },
    async updatePassword(password: string): Promise<AuthResult> {
      if (!client) return unavailable
      const { data, error } = await client.auth.updateUser({ password })
      const user = data?.user || data?.session?.user
      if (error || !user) return fail(error)
      return signedIn(client, user, 'email')
    },
    async signInWithProvider(provider: string): Promise<AuthResult> {
      if (provider !== 'google') return { ok: false, failure: 'oauthFailed' }
      if (!client || !openBrowser) return unavailable
      const mine = beginAttempt()
      const started = await firstOf(caught(client.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: REDIRECT, skipBrowserRedirect: true }
      })), timeoutMs)
      if (started === 'timeout') return { ok: false, failure: 'network' }
      if (started.error || !started.data?.url) return started.error ? googleFail(started.error) : { ok: false, failure: 'oauthFailed' }
      let returned: { url: string } | null
      try {
        returned = await openBrowser(started.data.url)
      } catch (error) {
        return isAuthError(error) ? googleFail(error) : { ok: false, failure: 'oauthFailed' }
      }
      if (!stillCurrent(mine) || !returned?.url) return { ok: false, failure: 'oauthCancelled' }
      const code = googleCode(returned.url)
      if (!code) return { ok: false, failure: 'oauthFailed' }
      const pending = caught(client.auth.exchangeCodeForSession(code))
      const exchanged = await firstOf(pending, timeoutMs)
      if (exchanged === 'timeout') {
        void pending.then((result) => {
          if (!result.data?.session?.user || !stillCurrent(mine) || !client) return
          void client.auth.signOut({ scope: 'local' }).catch(() => undefined)
        })
        return { ok: false, failure: 'network' }
      }
      if (!stillCurrent(mine)) return { ok: false, failure: 'oauthCancelled' }
      if (exchanged.error || !exchanged.data?.session?.user) return googleFail(exchanged.error)
      return signedIn(client, exchanged.data.session.user, 'google')
    },
    async signOut() {
      if (client) await client.auth.signOut({ scope: 'local' })
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
