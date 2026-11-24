import AsyncStorage from '@react-native-async-storage/async-storage';

import { createIdentityConnector } from '../connector';
import { createSessionStore } from '../sessionStore';

const PASSWORD = 'correct-horse';
const USER = {
  id: 'learner-1',
  email: 'ada@example.com',
  user_metadata: { display_name: 'Ada' }
};

function sessionFor(user = USER) {
  return {
    access_token: 'access-token-value',
    refresh_token: 'refresh-token-value',
    user
  };
}

function memorySecureStore() {
  const items = new Map();
  return {
    setItemAsync: jest.fn(async (key, value) => {
      items.set(key, value);
    }),
    getItemAsync: jest.fn(async (key) => items.get(key) ?? null),
    deleteItemAsync: jest.fn(async (key) => {
      items.delete(key);
    })
  };
}

function createFakeClient(storage) {
  const calls = [];
  let session = null;

  async function persist(next) {
    session = next;
    if (next) {
      await storage.setItem('sb-auth-token', JSON.stringify(next));
    } else {
      await storage.removeItem('sb-auth-token');
    }
  }

  return {
    calls,
    auth: {
      async getSession() {
        return { data: { session } };
      },
      async signUp({ email, password, options }) {
        calls.push({ method: 'signUp', email, password, options });
        await persist(sessionFor());
        return { data: { session, user: USER }, error: null };
      },
      async signInWithPassword({ email, password }) {
        calls.push({ method: 'signIn', email, password });
        if (password !== PASSWORD) {
          return {
            data: { session: null },
            error: { message: 'Invalid login credentials' }
          };
        }
        await persist(
          sessionFor({
            id: 'learner-1',
            email,
            user_metadata: { display_name: 'Ada' }
          })
        );
        return { data: { session, user: session.user }, error: null };
      },
      async resetPasswordForEmail(email, options) {
        calls.push({ method: 'reset', email, options });
        return { error: null };
      },
      async exchangeCodeForSession(code) {
        calls.push({ method: 'exchange', code });
        await persist(sessionFor());
        return { data: { session }, error: null };
      },
      async updateUser({ password }) {
        calls.push({ method: 'updatePassword', password });
        if (password === 'bad') {
          return { data: { user: null }, error: { message: 'Password is too weak' } };
        }
        return { data: { user: USER }, error: null };
      },
      async signOut(options) {
        calls.push({ method: 'signOut', options });
        await persist(null);
        return { error: null };
      }
    }
  };
}

async function harness() {
  const secureStore = memorySecureStore();
  const storage = createSessionStore({ platform: 'ios', secureStore });
  const client = createFakeClient(storage);
  const connector = createIdentityConnector({ client });
  return { connector, client, secureStore };
}

describe('identity connector', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await AsyncStorage.setItem(
      'lf_profile',
      JSON.stringify({ username: 'Player', xp: 3 })
    );
  });

  it('returns an identity from email sign-up and lets a caller subscribe without Supabase', async () => {
    const { connector, client } = await harness();
    const seen = [];
    connector.subscribe((identity) => seen.push(identity));

    const result = await connector.signUpWithPassword({
      email: 'ada@example.com',
      password: PASSWORD,
      displayName: 'Ada'
    });

    expect(result.identity).toEqual({
      id: 'learner-1',
      email: 'ada@example.com',
      username: null
    });
    expect(JSON.stringify(client.calls[0])).not.toContain('display_name');
    expect(seen.at(-1)).toEqual(result.identity);
    expect(client.calls[0].password).toBe(PASSWORD);
    expect(JSON.stringify(await AsyncStorage.getItem('sb-auth-token'))).not.toContain(
      PASSWORD
    );
  });

  it('returns the stored display name on sign-in and a safe message when the password is wrong', async () => {
    const { connector } = await harness();

    const wrong = await connector.signInWithPassword({
      email: 'ada@example.com',
      password: 'nope'
    });
    expect(wrong).toEqual({
      identity: null,
      message: 'That email or password is not right.'
    });
    expect(wrong.message).not.toMatch(/token|code=|\?/);
    expect(await connector.getIdentity()).toBeNull();
    expect(await connector.getAccessToken()).toBeNull();

    const signedIn = await connector.signInWithPassword({
      email: 'ada@example.com',
      password: PASSWORD
    });
    expect(signedIn.identity.username).toBeNull();
    expect(await connector.getAccessToken()).toBe('access-token-value');
  });

  it('reads the stored session from a new connector instance', async () => {
    const secureStore = memorySecureStore();
    const storage = createSessionStore({ platform: 'ios', secureStore });
    const client = createFakeClient(storage);
    const first = createIdentityConnector({ client });
    await first.signInWithPassword({
      email: 'ada@example.com',
      password: PASSWORD
    });

    const second = createIdentityConnector({ client });
    expect(await second.getIdentity()).toEqual({
      id: 'learner-1',
      email: 'ada@example.com',
      username: null
    });
    expect(await second.getAccessToken()).toBe('access-token-value');
  });

  it('sends a password reset without creating an identity', async () => {
    const { connector, client } = await harness();
    const result = await connector.sendPasswordReset('ada@example.com');
    expect(result).toEqual({ identity: null, message: null });
    expect(await connector.getIdentity()).toBeNull();
    expect(await connector.getAccessToken()).toBeNull();
    expect(client.calls[0].options.redirectTo).toBe(
      'com.westleysturhan.louisianafrench://auth/callback?type=recovery'
    );
  });

  it('does not exchange a recovery code on a lookalike redirect', async () => {
    const { connector, client } = await harness();
    const result = await connector.handleAuthUrl(
      'com.westleysturhan.louisianafrench://auth/callbackEVIL?code=recover-code&type=recovery'
    );
    expect(result.kind).toBeNull();
    expect(client.calls.filter((call) => call.method === 'exchange')).toEqual([]);
  });

  it('opens a recovery code from the fragment', async () => {
    const { connector, client } = await harness();
    const result = await connector.handleAuthUrl(
      'com.westleysturhan.louisianafrench://auth/callback#code=frag-code&type=recovery'
    );
    expect(result).toEqual({ kind: 'recovery' });
    expect(client.calls[0]).toEqual({ method: 'exchange', code: 'frag-code' });
  });

  it('opens a recovery return for a new password and ignores a provider-style return', async () => {
    const { connector, client } = await harness();
    const recovery = await connector.handleAuthUrl(
      'com.westleysturhan.louisianafrench://auth/callback?code=recover-code&type=recovery'
    );
    expect(recovery).toEqual({ kind: 'recovery' });
    expect(await connector.getIdentity()).toEqual({
      id: 'learner-1',
      email: 'ada@example.com',
      username: null
    });
    expect(client.calls[0]).toEqual({ method: 'exchange', code: 'recover-code' });

    const providerStyle = await connector.handleAuthUrl(
      'com.westleysturhan.louisianafrench://auth/callback?code=oauth-code'
    );
    expect(providerStyle).toEqual({ kind: null });

    const saved = await connector.updatePassword('new-secret');
    expect(saved.identity.username).toBeNull();
    expect(client.calls.some((call) => call.method === 'updatePassword')).toBe(true);
    expect(JSON.stringify(await AsyncStorage.getItem('sb-auth-token'))).not.toContain(
      'recover-code'
    );
  });

  it('signs out on this device only', async () => {
    const { connector, client } = await harness();
    await connector.signInWithPassword({
      email: 'ada@example.com',
      password: PASSWORD
    });

    await connector.signOut();

    expect(client.calls.at(-1)).toEqual({
      method: 'signOut',
      options: { scope: 'local' }
    });
    expect(client.calls.some((call) => call.options?.scope === 'global')).toBe(false);
    expect(await connector.getIdentity()).toBeNull();
    expect(await connector.getAccessToken()).toBeNull();

    const relaunched = createIdentityConnector({ client });
    expect(await relaunched.getIdentity()).toBeNull();
    expect(await relaunched.getAccessToken()).toBeNull();
    expect(await AsyncStorage.getItem('lf_profile')).toBe(
      JSON.stringify({ username: 'Player', xp: 3 })
    );
  });

  it('uses a safe message for a duplicate email and a network failure', async () => {
    const client = {
      auth: {
        getSession: async () => ({ data: { session: null } }),
        signUp: async () => ({
          data: { session: null },
          error: { message: 'User already registered' }
        }),
        signInWithPassword: async () => ({
          data: { session: null },
          error: { message: 'Network request failed' }
        })
      }
    };
    const connector = createIdentityConnector({ client });
    expect(
      await connector.signUpWithPassword({
        email: 'ada@example.com',
        password: 'secret',
        displayName: 'Ada'
      })
    ).toEqual({ identity: null, message: 'That email is already registered.' });
    expect(
      await connector.signInWithPassword({
        email: 'ada@example.com',
        password: 'secret'
      })
    ).toEqual({ identity: null, message: 'The network failed. Try again.' });
  });

  it('asks the learner to check email when sign-up waits for confirmation', async () => {
    const client = {
      auth: {
        getSession: async () => ({ data: { session: null } }),
        signUp: async () => ({
          data: { session: null, user: USER },
          error: null
        })
      }
    };
    const connector = createIdentityConnector({ client });
    expect(
      await connector.signUpWithPassword({
        email: 'ada@example.com',
        password: 'secret',
        displayName: 'Ada'
      })
    ).toEqual({ identity: null, message: 'Check your email.' });
    expect(await connector.getIdentity()).toBeNull();
  });

  it('reads the profile username and does not store a display name', async () => {
    const calls = [];
    const client = {
      calls,
      from() {
        return {
          select() {
            return {
              eq() {
                return {
                  async maybeSingle() {
                    return { data: { username: 'Céline' }, error: null };
                  }
                };
              }
            };
          }
        };
      },
      auth: {
        async getSession() {
          return { data: { session: null } };
        },
        async signInWithPassword() {
          return {
            data: {
              session: {
                access_token: 'access-token-value',
                user: {
                  id: 'learner-1',
                  email: 'ada@example.com',
                  user_metadata: { display_name: 'Ada', full_name: 'Ada Lovelace' }
                }
              }
            },
            error: null
          };
        },
        async signUp({ email, password, options }) {
          calls.push({ method: 'signUp', email, password, options });
          return {
            data: {
              session: {
                access_token: 'access-token-value',
                user: {
                  id: 'learner-1',
                  email,
                  user_metadata: { display_name: 'Ada' }
                }
              }
            },
            error: null
          };
        }
      }
    };
    const connector = createIdentityConnector({ client });
    const signedIn = await connector.signInWithPassword({
      email: 'ada@example.com',
      password: 'secret'
    });
    expect(signedIn.identity).toEqual({
      id: 'learner-1',
      email: 'ada@example.com',
      username: 'Céline'
    });

    await connector.signUpWithPassword({
      email: 'ada@example.com',
      password: 'secret',
      displayName: 'Ada'
    });
    expect(JSON.stringify(calls)).not.toContain('display_name');
  });

  function profileClient(maybeSingle, session = null) {
    return {
      auth: {
        async getSession() {
          return { data: { session } };
        },
        async signInWithPassword() {
          return {
            data: { session: sessionFor() },
            error: null
          };
        }
      },
      from() {
        return {
          select() {
            return {
              eq() {
                return { maybeSingle };
              }
            };
          }
        };
      }
    };
  }

  it('reads the username with from still attached to the client', async () => {
    class ProfileReader {
      constructor() {
        this.tables = { profiles: { username: 'Céline' } };
        this.auth = {
          async getSession() {
            return { data: { session: sessionFor() } };
          }
        };
      }

      from(table) {
        const row = this.tables[table];
        return {
          select() {
            return {
              eq() {
                return {
                  async maybeSingle() {
                    return { data: row, error: null };
                  }
                };
              }
            };
          }
        };
      }
    }

    const connector = createIdentityConnector({ client: new ProfileReader() });
    await expect(connector.getIdentity()).resolves.toEqual({
      id: 'learner-1',
      email: 'ada@example.com',
      username: 'Céline'
    });
  });

  it('does not wait forever when the profile read never settles', async () => {
    jest.useFakeTimers();
    try {
      const connector = createIdentityConnector({
        client: profileClient(() => new Promise(() => {}), sessionFor())
      });
      let settled = false;
      const pending = connector.getIdentity().then((identity) => {
        settled = true;
        return identity;
      });
      await jest.advanceTimersByTimeAsync(5000);
      expect(settled).toBe(true);
      await expect(pending).resolves.toEqual({
        id: 'learner-1',
        email: 'ada@example.com',
        username: null
      });
      expect(jest.getTimerCount()).toBe(0);
    } finally {
      jest.useRealTimers();
    }
  });

  it('clears the profile timer when the read settles', async () => {
    jest.useFakeTimers();
    try {
      const connector = createIdentityConnector({
        client: profileClient(
          async () => ({ data: { username: 'Céline' }, error: null }),
          sessionFor()
        )
      });
      await expect(connector.getIdentity()).resolves.toEqual({
        id: 'learner-1',
        email: 'ada@example.com',
        username: 'Céline'
      });
      expect(jest.getTimerCount()).toBe(0);
    } finally {
      jest.useRealTimers();
    }
  });

  it.each([
    ['PGRST205', async () => ({ data: null, error: { code: 'PGRST205', message: 'schema cache' } })],
    ['42P01', async () => ({ data: null, error: { code: '42P01', message: 'undefined_table' } })],
    ['a thrown read', async () => {
      throw new Error('socket hang up');
    }]
  ])('keeps sign-in when the profile read is %s', async (_label, maybeSingle) => {
    const connector = createIdentityConnector({ client: profileClient(maybeSingle) });
    await expect(
      connector.signInWithPassword({ email: 'ada@example.com', password: 'secret' })
    ).resolves.toEqual({
      identity: { id: 'learner-1', email: 'ada@example.com', username: null },
      message: null
    });
  });

  it('does not use the email local part when the profile has no username', async () => {
    const client = {
      auth: {
        async getSession() {
          return { data: { session: null } };
        },
        async signInWithPassword() {
          return {
            data: {
              session: {
                access_token: 'access-token-value',
                user: { id: 'learner-1', email: 'ada@example.com', user_metadata: {} }
              }
            },
            error: null
          };
        }
      }
    };
    const connector = createIdentityConnector({ client });
    const signedIn = await connector.signInWithPassword({
      email: 'ada@example.com',
      password: 'secret'
    });
    expect(signedIn.identity).toEqual({
      id: 'learner-1',
      email: 'ada@example.com',
      username: null
    });
  });

  it('calls set_username and check_username on the client', async () => {
    const calls = [];
    const client = {
      auth: {
        async getSession() {
          return { data: { session: null } };
        }
      },
      async rpc(fn, args) {
        calls.push([fn, args]);
        if (fn === 'check_username') return { data: { status: 'available' }, error: null };
        return { data: { ok: true, username: 'Céline' }, error: null };
      }
    };
    const connector = createIdentityConnector({ client });
    await expect(connector.setUsername('Céline')).resolves.toEqual({
      ok: true,
      username: 'Céline'
    });
    await expect(connector.checkUsername('celine')).resolves.toEqual({ status: 'available' });
    expect(calls).toEqual([
      ['set_username', { proposed: 'Céline' }],
      ['check_username', { candidate: 'celine' }]
    ]);

    const guest = createIdentityConnector({ client: null });
    await expect(guest.setUsername('Céline')).resolves.toEqual({ ok: false, reason: 'network' });
    await expect(guest.checkUsername('Céline')).resolves.toEqual({ status: 'error' });
  });

  it('stays a guest when sign-in is not configured', async () => {
    const connector = createIdentityConnector({ client: null });
    expect(await connector.getIdentity()).toBeNull();
    expect(await connector.getAccessToken()).toBeNull();
    expect(
      await connector.signInWithPassword({
        email: 'ada@example.com',
        password: PASSWORD
      })
    ).toEqual({ identity: null, message: 'Sign-in is unavailable.' });
  });
});
