import { describe, expect, it, jest } from '@jest/globals';

import { createAccountConnector, type AccountClient } from '../accountConnector';
import { runAccountEffect } from '../runAccountEffects';

function openConnector(options: Omit<Parameters<typeof createAccountConnector>[0], 'redirectTo'> & { redirectTo?: string }) {
  return createAccountConnector({ redirectTo: REDIRECT, ...options });
}

const REDIRECT = 'com.westleysturhan.louisianafrench://auth/callback';
const GOOGLE = {
  id: 'learner-1',
  email: 'ada@example.com',
  username: null,
  provider: 'google' as const
};

describe('account connector', () => {
  it('requires the redirect address', () => {
    const options = { client: null };
    // @ts-expect-error omitting redirectTo must not compile
    const connector = createAccountConnector(options);
    expect(typeof connector.signIn).toBe('function');
  });

  it('uses error.code before the message regex', async () => {
    const connector = openConnector({
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
    const taken = openConnector({
      client: client({
        signInWithPassword: async () => ({
          data: { session: null },
          error: { message: 'User already registered' }
        })
      })
    });
    expect(await taken.signIn('ada@example.com', 'nope')).toEqual({ ok: false, failure: 'emailTaken' });

    const leaked = openConnector({
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

  it('reads the profile username on sign-in', async () => {
    const base = client({
      signInWithPassword: async () => ({
        data: { session: { user: { id: 'learner-1', email: 'ada@example.com' } } },
        error: null
      })
    });
    const connector = openConnector({
      client: {
        ...base,
        from: () => ({
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { username: 'Céline' }, error: null })
            })
          })
        })
      }
    });
    expect(await connector.signIn('ada@example.com', 'secret')).toEqual({
      ok: true,
      profileRead: true,
      identity: { id: 'learner-1', email: 'ada@example.com', username: 'Céline', provider: 'email' }
    });
  });

  it('returns confirmSignUp when sign-up has no session and does not write a display name', async () => {
    const calls: unknown[] = [];
    const connector = openConnector({
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
    const connector = openConnector({
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
    const connector = openConnector({
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
      profileRead: false,
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
    const connector = openConnector({
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
    expect(await connector.signInWithProvider('google')).toEqual({ ok: true, profileRead: false, identity: GOOGLE });
    expect(JSON.stringify(calls)).not.toContain('displayName');

    const closed = openConnector({
      client: client({
        signInWithOAuth: async () => ({ data: { url: 'https://accounts.example' }, error: null })
      }),
      openBrowser: async () => null
    });
    expect(await closed.signInWithProvider('google')).toEqual({ ok: false, failure: 'oauthCancelled' });

    const denied = openConnector({
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
    const connector = openConnector({
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
    expect(second).toEqual({ ok: true, profileRead: false, identity: GOOGLE });
    expect(calls.filter((call) => call.method === 'exchange')).toEqual([
      { method: 'exchange', code: 'second-code' }
    ]);
  });

  it('maps a Google invalid_grant to oauthFailed and keeps a network error', async () => {
    const expired = openConnector({
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

    const offline = openConnector({
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
    const connector = openConnector({
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
    const connector = openConnector({
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
    expect(events).toEqual([{ type: 'authSettled', result: { ok: true, profileRead: false, identity: GOOGLE } }]);
  });

  it('times out the code exchange and signs out if that exchange later succeeds', async () => {
    let release: (value: { data: { session: { user: { id: string; email: string } } }; error: null }) => void = () => {};
    const signOuts: unknown[] = [];
    const connector = openConnector({
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
    const connector = openConnector({
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
    expect(second).toEqual({ ok: true, profileRead: false, identity: GOOGLE });
    expect(signOuts).toEqual([]);
  });

  it('opens a recovery link only after the code exchange succeeds', async () => {
    const calls: string[] = [];
    const failed = openConnector({
      client: client({
        exchangeCodeForSession: async (code: string) => {
          calls.push(code);
          return { data: { session: null }, error: { message: 'bad code' } };
        }
      })
    });
    expect(await failed.consumeAuthUrl(`${REDIRECT}?code=crafted&type=recovery`)).toEqual({
      type: 'linkFailed',
      failure: 'unknown'
    });
    expect(calls).toEqual(['crafted']);

    const recovered = openConnector({
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
    const connector = openConnector({
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
    expect(await connector.signInWithProvider('google')).toEqual({ ok: true, profileRead: false, identity: GOOGLE });
    expect(calls).toEqual(['from-google']);
  });

  it('sends the reset to the redirect the caller provides', async () => {
    const calls: { redirectTo?: string }[] = [];
    const connector = openConnector({
      client: client({
        resetPasswordForEmail: async (_email: string, options: { redirectTo: string }) => {
          calls.push(options);
          return { error: null };
        }
      }),
      redirectTo: 'https://x/auth/callback'
    });
    expect(await connector.sendReset('ada@example.com')).toEqual({ ok: true, pending: 'passwordReset' });
    expect(calls[0].redirectTo).toBe('https://x/auth/callback?type=recovery');
  });

  it('sends the reset link back with type=recovery', async () => {
    const calls: { redirectTo?: string }[] = [];
    const connector = openConnector({
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

  it('surfaces a recovery exchange that fails', async () => {
    const connector = openConnector({
      client: client({
        exchangeCodeForSession: async () => ({
          data: { session: null },
          error: { message: 'network down' }
        })
      })
    });
    expect(await connector.consumeAuthUrl(`${REDIRECT}?code=abc&type=recovery`)).toEqual({
      type: 'linkFailed',
      failure: 'network'
    });
  });

  it('surfaces a recovery exchange that hangs', async () => {
    const connector = openConnector({
      timeoutMs: 20,
      client: client({
        exchangeCodeForSession: () => new Promise(() => {})
      })
    });
    expect(await connector.consumeAuthUrl(`${REDIRECT}?code=abc&type=recovery`)).toEqual({
      type: 'linkFailed',
      failure: 'network'
    });
  }, 1000);

  it('signs out locally after delete-account accepts the access token', async () => {
    const scopes: unknown[] = [];
    const calls: { name: string; options: unknown }[] = [];
    const connector = openConnector({
      client: client({
        signOut: async (input: { scope: string }) => {
          scopes.push(input);
          throw new Error('storage');
        }
      }, {
        functions: {
          async invoke(name, options) {
            calls.push({ name, options });
            return { data: { ok: true }, error: null };
          }
        }
      })
    });
    expect(await connector.deleteAccount()).toEqual({ ok: true });
    expect(scopes).toEqual([{ scope: 'local' }]);
    expect(calls).toEqual([{
      name: 'delete-account',
      options: { method: 'POST', headers: { Authorization: 'Bearer access-token' } }
    }]);
  });

  it('maps delete-account failures and does not sign out', async () => {
    const scopes: unknown[] = [];
    const auth = {
      signOut: async () => {
        scopes.push('out');
        return { error: null };
      }
    };
    const notSignedIn = openConnector({
      client: client({
        ...auth,
        async getSession() {
          return { data: { session: null } };
        }
      })
    });
    expect(await notSignedIn.deleteAccount()).toEqual({ ok: false, failure: 'notSignedIn' });

    const unknown = openConnector({
      client: client(auth, {
        functions: {
          async invoke() {
            return {
              data: null,
              error: {
                name: 'FunctionsHttpError',
                message: 'Edge Function returned a non-2xx status code',
                context: { status: 500, json: async () => ({ ok: false, failure: 'unknown' }) }
              }
            };
          }
        }
      })
    });
    expect(await unknown.deleteAccount()).toEqual({ ok: false, failure: 'unknown' });

    const gateway = openConnector({
      client: client(auth, {
        functions: {
          async invoke() {
            return {
              data: null,
              error: {
                name: 'FunctionsHttpError',
                message: 'Edge Function returned a non-2xx status code',
                context: { status: 401, json: async () => ({ msg: 'Invalid JWT' }) }
              }
            };
          }
        }
      })
    });
    expect(await gateway.deleteAccount()).toEqual({ ok: false, failure: 'notSignedIn' });

    const offline = openConnector({
      client: client(auth, {
        functions: {
          async invoke() {
            return {
              data: null,
              error: { name: 'FunctionsFetchError', message: 'Failed to send a request to the Edge Function' }
            };
          }
        }
      })
    });
    expect(await offline.deleteAccount()).toEqual({ ok: false, failure: 'network' });
    expect(scopes).toEqual([]);
  });

  it('offers the step only after a profile read that succeeded with no username', async () => {
    const empty = openConnector({
      client: profileClient(async () => ({ data: { username: null }, error: null }), {
        signInWithPassword: async () => ({
          data: { session: { user: { id: 'learner-1', email: 'ada@example.com', app_metadata: { provider: 'google' } } } },
          error: null
        })
      })
    });
    expect(await empty.signIn('ada@example.com', 'secret')).toEqual({
      ok: true,
      profileRead: true,
      identity: { id: 'learner-1', email: 'ada@example.com', username: null, provider: 'google' }
    });
  });

  it('keeps a timed-out profile read out of the username step', async () => {
    jest.useFakeTimers();
    try {
      const connector = openConnector({
        client: profileClient(() => new Promise(() => {}), {
          signInWithPassword: async () => ({
            data: { session: { user: { id: 'learner-1', email: 'ada@example.com' } } },
            error: null
          })
        })
      });
      const pending = connector.signIn('ada@example.com', 'secret');
      await jest.advanceTimersByTimeAsync(5000);
      await expect(pending).resolves.toEqual({
        ok: true,
        profileRead: false,
        identity: { id: 'learner-1', email: 'ada@example.com', username: null, provider: 'email' }
      });
    } finally {
      jest.useRealTimers();
    }
  });

  it('saves and checks a username through the same RPCs', async () => {
    const calls: unknown[] = [];
    const connector = openConnector({
      client: {
        ...client({}),
        rpc: async (fn: string, args: Record<string, unknown>) => {
          calls.push([fn, args]);
          if (fn === 'check_username') return { data: { status: 'available' }, error: null };
          return { data: { ok: false, reason: 'taken' }, error: null };
        }
      }
    });
    expect(await connector.setUsername('Ada')).toEqual({ ok: false, reason: 'taken' });
    expect(await connector.checkUsername('Ada')).toEqual({ status: 'available' });
    expect(calls).toEqual([
      ['set_username', { proposed: 'Ada' }],
      ['check_username', { candidate: 'Ada' }]
    ]);
  });
});

function profileClient(
  maybeSingle: () => Promise<{ data: unknown; error?: { message?: string } | null }>,
  auth: Record<string, unknown>
): AccountClient {
  return {
    ...client(auth),
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle })
      })
    })
  };
}

function client(
  auth: Record<string, unknown>,
  extra: { functions?: AccountClient['functions'] } = {}
): AccountClient {
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
      async getSession() {
        return { data: { session: { access_token: 'access-token' } } };
      },
      async signOut() {
        return { error: null };
      },
      ...auth
    },
    functions: extra.functions ?? {
      async invoke() {
        return { data: { ok: true }, error: null };
      }
    }
  };
}
