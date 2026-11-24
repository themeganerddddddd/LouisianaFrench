import { describe, expect, it } from '@jest/globals';

import { createAccountConnector, type AccountClient } from '../accountConnector';
import { runAccountEffect } from '../runAccountEffects';

const REDIRECT = 'com.westleysturhan.louisianafrench://auth/callback';
const GOOGLE = {
  id: 'learner-1',
  email: 'ada@example.com',
  username: null,
  provider: 'google' as const
};

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

  it('returns a Google identity and cancels a closed or failed browser', async () => {
    const calls: { method: string; provider?: string; code?: string }[] = [];
    const connector = createAccountConnector({
      client: client({
        signInWithOAuth: async (input: { provider: string; options: { redirectTo: string; skipBrowserRedirect: boolean } }) => {
          calls.push({ method: 'oauth', provider: input.provider });
          expect(input.options).toEqual({ redirectTo: REDIRECT, skipBrowserRedirect: true });
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
      openBrowser: async () => ({ url: `${REDIRECT}?code=good-code` })
    });
    expect(await connector.signInWithProvider('google')).toEqual({ ok: true, identity: GOOGLE });
    expect(JSON.stringify(calls)).not.toContain('displayName');

    const closed = createAccountConnector({
      client: client({
        signInWithOAuth: async () => ({ data: { url: 'https://accounts.example' }, error: null })
      }),
      openBrowser: async () => null
    });
    expect(await closed.signInWithProvider('google')).toEqual({ ok: false, failure: 'oauthCancelled' });

    const denied = createAccountConnector({
      client: client({
        signInWithOAuth: async () => ({ data: { url: 'https://accounts.example' }, error: null })
      }),
      openBrowser: async () => ({ url: `${REDIRECT}?error=access_denied&error_description=secret-code` })
    });
    const failed = await denied.signInWithProvider('google');
    expect(failed).toEqual({ ok: false, failure: 'oauthFailed' });
    expect(JSON.stringify(failed)).not.toContain('secret-code');
    expect(JSON.stringify(failed)).not.toContain(REDIRECT);
  });

  it('exchanges only the newer Google attempt', async () => {
    let finishFirst: (value: { url: string }) => void = () => {};
    const calls: { method: string; code?: string }[] = [];
    const browsers = [
      () => new Promise<{ url: string }>((resolve) => {
        finishFirst = resolve;
      }),
      async () => ({ url: `${REDIRECT}?code=second-code` })
    ];
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
      openBrowser: () => {
        const next = browsers.shift();
        if (!next) return Promise.resolve(null);
        return next();
      }
    });
    const first = connector.signInWithProvider('google');
    await new Promise((resolve) => setTimeout(resolve, 0));
    const second = await connector.signInWithProvider('google');
    finishFirst({ url: `${REDIRECT}?code=first-code` });
    await first;
    expect(second).toEqual({ ok: true, identity: GOOGLE });
    expect(calls.filter((call) => call.method === 'exchange')).toEqual([
      { method: 'exchange', code: 'second-code' }
    ]);
  });

  it('maps a Google invalid_grant to oauthFailed and keeps a network error', async () => {
    const expired = createAccountConnector({
      client: client({
        signInWithOAuth: async () => ({ data: { url: 'https://accounts.example' }, error: null }),
        exchangeCodeForSession: async () => ({
          data: { session: null },
          error: { code: 'invalid_grant', message: 'code expired' }
        })
      }),
      openBrowser: async () => ({ url: `${REDIRECT}?code=expired` })
    });
    expect(await expired.signInWithProvider('google')).toEqual({ ok: false, failure: 'oauthFailed' });

    const offline = createAccountConnector({
      client: client({
        signInWithOAuth: async () => ({ data: { url: 'https://accounts.example' }, error: null }),
        exchangeCodeForSession: async () => ({
          data: { session: null },
          error: { message: 'Network request failed' }
        })
      }),
      openBrowser: async () => ({ url: `${REDIRECT}?code=offline` })
    });
    expect(await offline.signInWithProvider('google')).toEqual({ ok: false, failure: 'network' });
  });

  it('times out a slow Google sign-in request as network', async () => {
    const connector = createAccountConnector({
      client: client({
        signInWithOAuth: () => new Promise(() => {})
      }),
      openBrowser: () => new Promise(() => {}),
      timeoutMs: 20
    });
    const result = await Promise.race([
      connector.signInWithProvider('google'),
      new Promise((resolve) => setTimeout(() => resolve('waiting'), 80))
    ]);
    expect(result).toEqual({ ok: false, failure: 'network' });
  });

  it('does not time the learner out while Google is open in the browser', async () => {
    const connector = createAccountConnector({
      client: client({
        signInWithOAuth: async () => ({ data: { url: 'https://accounts.example' }, error: null }),
        exchangeCodeForSession: async () => ({
          data: { session: { user: { id: 'learner-1', email: 'ada@example.com' } } },
          error: null
        })
      }),
      openBrowser: () => new Promise((resolve) => {
        setTimeout(() => resolve({ url: `${REDIRECT}?code=slow` }), 60);
      }),
      timeoutMs: 20
    });
    const events: unknown[] = [];
    await runAccountEffect(
      { run: 'signInWithProvider', provider: 'google' },
      connector,
      (event) => events.push(event),
      20
    );
    expect(events).toEqual([{ type: 'authSettled', result: { ok: true, identity: GOOGLE } }]);
  });

  it('times out the code exchange and signs out if that exchange later succeeds', async () => {
    let release: (value: { data: { session: { user: { id: string; email: string } } }; error: null }) => void = () => {};
    const signOuts: unknown[] = [];
    const connector = createAccountConnector({
      client: client({
        signInWithOAuth: async () => ({ data: { url: 'https://accounts.example' }, error: null }),
        exchangeCodeForSession: () => new Promise((resolve) => {
          release = resolve;
        }),
        signOut: async (input: { scope: string }) => {
          signOuts.push(input);
          return { error: null };
        }
      }),
      openBrowser: async () => ({ url: `${REDIRECT}?code=late` }),
      timeoutMs: 20
    });
    const pending = connector.signInWithProvider('google');
    const result = await Promise.race([
      pending,
      new Promise((resolve) => setTimeout(() => resolve('waiting'), 80))
    ]);
    release({ data: { session: { user: { id: 'learner-1', email: 'ada@example.com' } } }, error: null });
    expect(result).toEqual({ ok: false, failure: 'network' });
    await pending;
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(signOuts).toEqual([{ scope: 'local' }]);
  });

  it('does not sign out a late Google exchange after a newer attempt succeeds', async () => {
    let releaseFirst: (value: { data: { session: { user: { id: string; email: string } } }; error: null }) => void = () => {};
    let exchanges = 0;
    const signOuts: unknown[] = [];
    const session = { data: { session: { user: { id: 'learner-1', email: 'ada@example.com' } } }, error: null };
    const connector = createAccountConnector({
      client: client({
        signInWithOAuth: async () => ({ data: { url: 'https://accounts.example' }, error: null }),
        exchangeCodeForSession: () => {
          exchanges += 1;
          if (exchanges === 1) return new Promise((resolve) => { releaseFirst = resolve; });
          return Promise.resolve(session);
        },
        signOut: async (input: { scope: string }) => {
          signOuts.push(input);
          return { error: null };
        }
      }),
      openBrowser: async () => ({ url: `${REDIRECT}?code=retry` }),
      timeoutMs: 20
    });
    const first = connector.signInWithProvider('google');
    const firstResult = await Promise.race([
      first,
      new Promise((resolve) => setTimeout(() => resolve('waiting'), 80))
    ]);
    const second = await connector.signInWithProvider('google');
    releaseFirst(session);
    await first;
    expect(firstResult).toEqual({ ok: false, failure: 'network' });
    expect(second).toEqual({ ok: true, identity: GOOGLE });
    expect(signOuts).toEqual([]);
  });

  it('opens a recovery link only after the code exchange succeeds', async () => {
    const calls: string[] = [];
    const failed = createAccountConnector({
      client: client({
        exchangeCodeForSession: async (code: string) => {
          calls.push(code);
          return { data: { session: null }, error: { message: 'bad code' } };
        }
      })
    });
    expect(await failed.consumeAuthUrl(`${REDIRECT}?code=crafted&type=recovery`)).toBeNull();
    expect(calls).toEqual(['crafted']);

    const recovered = createAccountConnector({
      client: client({
        exchangeCodeForSession: async (code: string) => {
          calls.push(code);
          return {
            data: { session: { user: { id: 'learner-1', email: 'ada@example.com' } } },
            error: null
          };
        }
      })
    });
    expect(await recovered.consumeAuthUrl(`${REDIRECT}#code=frag&type=recovery`)).toEqual({
      type: 'recoveryLinkOpened'
    });
  });

  it('does not read a bare code as email confirmation while Google is open', async () => {
    const calls: string[] = [];
    let consume: (url: string) => Promise<unknown> = async () => null;
    const connector = createAccountConnector({
      client: client({
        signInWithOAuth: async () => ({ data: { url: 'https://accounts.example' }, error: null }),
        exchangeCodeForSession: async (code: string) => {
          calls.push(code);
          return {
            data: { session: { user: { id: 'learner-1', email: 'ada@example.com' } } },
            error: null
          };
        }
      }),
      openBrowser: async () => {
        expect(await consume(`${REDIRECT}?code=bare`)).toBeNull();
        return { url: `${REDIRECT}?code=from-google` };
      }
    });
    consume = (url) => connector.consumeAuthUrl(url);
    expect(await connector.signInWithProvider('google')).toEqual({ ok: true, identity: GOOGLE });
    expect(calls).toEqual(['from-google']);
  });

  it('sends the reset link back with type=recovery', async () => {
    const calls: { redirectTo?: string }[] = [];
    const connector = createAccountConnector({
      client: client({
        resetPasswordForEmail: async (_email: string, options: { redirectTo: string }) => {
          calls.push(options);
          return { error: null };
        }
      })
    });
    expect(await connector.sendReset('ada@example.com')).toEqual({ ok: true, pending: 'passwordReset' });
    expect(calls[0].redirectTo).toBe(`${REDIRECT}?type=recovery`);
  });

  it('signs out locally after deleting the account, even when sign-out throws', async () => {
    const scopes: unknown[] = [];
    const connector = createAccountConnector({
      client: client({
        signOut: async (input: { scope: string }) => {
          scopes.push(input);
          throw new Error('storage');
        }
      })
    });
    expect(await connector.deleteAccount()).toEqual({ ok: true });
    expect(scopes).toEqual([{ scope: 'local' }]);
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
