import type { AuthFailure, AuthResult, DeleteResult, Provider } from './accountMachine';

export type AuthLink =
  | { kind: 'oauth'; code: string }
  | { kind: 'recovery' }
  | { kind: 'confirmed' }
  | { kind: 'ignored' }
  | { kind: 'failed' };

const REDIRECT = 'com.westleysturhan.louisianafrench://auth/callback';
const BY_CODE: Record<string, AuthFailure> = {
  invalid_credentials: 'wrongCredentials',
  invalid_grant: 'wrongCredentials',
  email_not_confirmed: 'emailNotConfirmed',
  user_already_exists: 'emailTaken',
  email_exists: 'emailTaken',
  weak_password: 'weakPassword',
  over_request_rate_limit: 'rateLimited',
  over_email_send_rate_limit: 'rateLimited'
};

type User = { id?: string; email?: string; app_metadata?: { provider?: string } };
type AuthError = { code?: string; message?: string } | null;
type AuthCall = {
  data?: { session?: { user?: User | null } | null; user?: User | null; url?: string } | null;
  error?: AuthError;
};

export type AccountClient = {
  auth: {
    signInWithPassword(input: { email: string; password: string }): Promise<AuthCall>;
    signUp(input: { email: string; password: string }): Promise<AuthCall>;
    resetPasswordForEmail(email: string, options: { redirectTo: string }): Promise<{ error?: AuthError }>;
    updateUser(input: { password: string }): Promise<AuthCall>;
    signInWithOAuth(input: {
      provider: 'google';
      options: { redirectTo: string; skipBrowserRedirect: boolean };
    }): Promise<AuthCall>;
    exchangeCodeForSession(code: string): Promise<AuthCall>;
    signOut(input: { scope: 'local' }): Promise<{ error?: AuthError }>;
  };
  deleteAccount(): Promise<{ error?: AuthError }>;
};

type Browser = (url: string) => Promise<{ url: string } | null>;

export function parseAuthUrl(url: string | null | undefined): AuthLink {
  if (!url || !url.startsWith(REDIRECT)) return { kind: 'ignored' };
  try {
    const parsed = new URL(url);
    if (parsed.searchParams.get('error')) return { kind: 'failed' };
    const code = parsed.searchParams.get('code');
    const type = parsed.searchParams.get('type');
    if (code && type === 'recovery') return { kind: 'recovery' };
    if (code && (type === 'signup' || type === 'email' || type === 'magiclink')) return { kind: 'confirmed' };
    if (code) return { kind: 'oauth', code };
    return { kind: 'ignored' };
  } catch {
    return { kind: 'failed' };
  }
}

export function mapAuthFailure(error: AuthError | undefined): AuthFailure {
  if (!error) return 'unknown';
  if (error.code && BY_CODE[error.code]) return BY_CODE[error.code];
  const raw = String(error.message || '');
  if (/com\.westleysturhan\.louisianafrench|code=|error_description/i.test(raw)) return 'unknown';
  if (/invalid login credentials/i.test(raw)) return 'wrongCredentials';
  if (/already registered|already exists/i.test(raw)) return 'emailTaken';
  if (/not confirmed/i.test(raw)) return 'emailNotConfirmed';
  if (/weak/i.test(raw)) return 'weakPassword';
  if (/rate limit/i.test(raw)) return 'rateLimited';
  if (/network|fetch|timeout/i.test(raw)) return 'network';
  if (/unavailable/i.test(raw)) return 'unavailable';
  return 'unknown';
}

function fail(error: AuthError | undefined): AuthResult {
  return { ok: false, failure: mapAuthFailure(error) };
}

function signedIn(user: User | undefined, fallback: Provider): AuthResult {
  if (!user?.id) return { ok: false, failure: 'unknown' };
  const provider: Provider = user.app_metadata?.provider === 'google' || fallback === 'google' ? 'google' : 'email';
  return { ok: true, identity: { id: user.id, email: user.email || '', username: null, provider } };
}

export function createAccountConnector({ client, openBrowser }: { client: AccountClient | null; openBrowser?: Browser }) {
  let attempts = 0;
  const unavailable: AuthResult = { ok: false, failure: 'unavailable' };

  return {
    async signIn(email: string, password: string): Promise<AuthResult> {
      if (!client) return unavailable;
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error || !data?.session?.user) return fail(error);
      return signedIn(data.session.user, 'email');
    },
    async signUp(email: string, password: string, _username: string | null): Promise<AuthResult> {
      if (!client) return unavailable;
      const { data, error } = await client.auth.signUp({ email, password });
      if (error) return fail(error);
      if (!data?.session?.user) return { ok: true, pending: 'confirmSignUp' };
      return signedIn(data.session.user, 'email');
    },
    async sendReset(email: string): Promise<AuthResult> {
      if (!client) return unavailable;
      const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: REDIRECT });
      if (error) return fail(error);
      return { ok: true, pending: 'passwordReset' };
    },
    async updatePassword(password: string): Promise<AuthResult> {
      if (!client) return unavailable;
      const { data, error } = await client.auth.updateUser({ password });
      const user = data?.user || data?.session?.user;
      if (error || !user) return fail(error);
      return signedIn(user, 'email');
    },
    async signInWithProvider(provider: string): Promise<AuthResult> {
      if (provider !== 'google') return { ok: false, failure: 'oauthFailed' };
      if (!client || !openBrowser) return unavailable;
      const attempt = ++attempts;
      const started = await client.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: REDIRECT, skipBrowserRedirect: true }
      });
      if (started.error || !started.data?.url) return started.error ? fail(started.error) : { ok: false, failure: 'oauthFailed' };
      let returned: { url: string } | null = null;
      try {
        returned = await openBrowser(started.data.url);
      } catch (error) {
        return fail(error as AuthError);
      }
      if (attempt !== attempts || !returned?.url) return { ok: false, failure: 'oauthCancelled' };
      const link = parseAuthUrl(returned.url);
      if (link.kind === 'failed') return { ok: false, failure: 'oauthFailed' };
      const code = link.kind === 'oauth' ? link.code : new URL(returned.url).searchParams.get('code');
      if (!code) return { ok: false, failure: 'oauthFailed' };
      const exchanged = await client.auth.exchangeCodeForSession(code);
      if (attempt !== attempts) return { ok: false, failure: 'oauthCancelled' };
      if (exchanged.error || !exchanged.data?.session?.user) return fail(exchanged.error);
      return signedIn(exchanged.data.session.user, 'google');
    },
    async signOut() {
      if (client) await client.auth.signOut({ scope: 'local' });
    },
    async deleteAccount(): Promise<DeleteResult> {
      if (!client) return { ok: false, failure: 'notSignedIn' };
      try {
        const { error } = await client.deleteAccount();
        if (!error) return { ok: true };
        if (mapAuthFailure(error) === 'network') return { ok: false, failure: 'network' };
        if (error.code === 'session_not_found' || /jwt|not signed in/i.test(error.message || '')) {
          return { ok: false, failure: 'notSignedIn' };
        }
        return { ok: false, failure: 'unknown' };
      } catch {
        return { ok: false, failure: 'unknown' };
      }
    }
  };
}

export type AccountConnector = ReturnType<typeof createAccountConnector>;
