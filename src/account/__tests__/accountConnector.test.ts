import { describe, expect, it } from '@jest/globals';

import { createAccountConnector, parseAuthUrl, type AccountClient } from '../accountConnector';

const REDIRECT = 'com.westleysturhan.louisianafrench://auth/callback';

describe('parseAuthUrl', () => {
  it('reads an oauth code, recovery, confirmed, ignored, and failed', () => {
    expect(parseAuthUrl(`${REDIRECT}?code=abc`)).toEqual({ kind: 'oauth', code: 'abc' });
    expect(parseAuthUrl(`${REDIRECT}?code=abc&type=recovery`)).toEqual({ kind: 'recovery' });
    expect(parseAuthUrl(`${REDIRECT}?code=abc&type=signup`)).toEqual({ kind: 'confirmed' });
    expect(parseAuthUrl('https://example.com/elsewhere')).toEqual({ kind: 'ignored' });
    expect(parseAuthUrl(`${REDIRECT}?error=access_denied&error_description=secret-code`)).toEqual({
      kind: 'failed'
    });
    expect(parseAuthUrl('not a url')).toEqual({ kind: 'ignored' });
  });

  it('does not treat a code-only Google return as recovery', () => {
    expect(parseAuthUrl(`${REDIRECT}?code=google-code`).kind).toBe('oauth');
  });
});

describe('account connector', () => {
  it('uses error.code before the message regex', async () => {
    const connector = createAccountConnector({
      client: client({
        signInWithPassword: async () => ({
          data: { session: null },
          error: { code: 'invalid_credentials', message: 'User already registered' }
        })
      })
    });
    expect(await connector.signIn('ada@example.com', 'nope')).toEqual({
      ok: false,
      failure: 'wrongCredentials'
    });
  });

  it('falls back to the message regex and scrubs a url', async () => {
    const taken = createAccountConnector({
      client: client({
        signInWithPassword: async () => ({
          data: { session: null },
          error: { message: 'User already registered' }
        })
      })
    });
    expect(await taken.signIn('ada@example.com', 'nope')).toEqual({ ok: false, failure: 'emailTaken' });

    const leaked = createAccountConnector({
      client: client({
        signInWithPassword: async () => ({
          data: { session: null },
          error: { message: `bad ${REDIRECT}?code=secret-code` }
        })
      })
    });
    const result = await leaked.signIn('ada@example.com', 'nope');
    expect(result).toEqual({ ok: false, failure: 'unknown' });
    expect(JSON.stringify(result)).not.toContain('secret-code');
    expect(JSON.stringify(result)).not.toContain(REDIRECT);
  });

  it('returns confirmSignUp when sign-up has no session and does not write a display name', async () => {
    const calls: unknown[] = [];
    const connector = createAccountConnector({
      client: client({
        signUp: async (input: { email: string; password: string }) => {
          calls.push(input);
          return { data: { session: null, user: { id: 'learner-1' } }, error: null };
        }
      })
    });
    expect(await connector.signUp('ada@example.com', 'secret', 'Élise_1')).toEqual({
      ok: true,
      pending: 'confirmSignUp'
    });
    expect(JSON.stringify(calls)).not.toContain('display_name');
    expect(JSON.stringify(calls)).not.toContain('Élise_1');
  });

  it('returns oauthFailed for a provider other than google and does not call Supabase', async () => {
    const calls: unknown[] = [];
    const connector = createAccountConnector({
      client: client({
        signInWithOAuth: async (input: unknown) => {
          calls.push(input);
          return { data: { url: 'https://accounts.example' }, error: null };
        }
      }),
      openBrowser: async () => ({ url: `${REDIRECT}?code=nope` })
    });
    expect(await connector.signInWithProvider('facebook')).toEqual({ ok: false, failure: 'oauthFailed' });
    expect(calls).toEqual([]);
  });

  it('exchanges a Google return that also says recovery', async () => {
    const calls: { method: string; code?: string }[] = [];
    const connector = createAccountConnector({
      client: client({
        signInWithOAuth: async () => {
          calls.push({ method: 'oauth' });
          return { data: { url: 'https://accounts.example' }, error: null };
        },
        exchangeCodeForSession: async (code: string) => {
          calls.push({ method: 'exchange', code });
          return {
            data: { session: { user: { id: 'learner-1', email: 'ada@example.com' } } },
            error: null
          };
        }
      }),
      openBrowser: async () => ({ url: `${REDIRECT}?code=google-code&type=recovery` })
    });
    expect(await connector.signInWithProvider('google')).toEqual({
      ok: true,
      identity: {
        id: 'learner-1',
        email: 'ada@example.com',
        username: null,
        provider: 'google'
      }
    });
    expect(calls).toEqual([
      { method: 'oauth' },
      { method: 'exchange', code: 'google-code' }
    ]);
  });
});

function client(auth: Record<string, unknown>): AccountClient {
  return {
    auth: {
      async signInWithPassword() {
        return { data: { session: null }, error: { message: 'missing' } };
      },
      async signUp() {
        return { data: { session: null }, error: null };
      },
      async resetPasswordForEmail() {
        return { error: null };
      },
      async updateUser() {
        return { data: { user: null }, error: { message: 'missing' } };
      },
      async signInWithOAuth() {
        return { data: {}, error: null };
      },
      async exchangeCodeForSession() {
        return { data: { session: null }, error: { message: 'missing' } };
      },
      async signOut() {
        return { error: null };
      },
      ...auth
    },
    async deleteAccount() {
      return { error: null };
    }
  } as AccountClient;
}
