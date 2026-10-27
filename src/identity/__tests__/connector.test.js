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

function createFakeClient(storage, { failDelete = false } = {}) {
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
    },
    async rpc(name) {
      calls.push({ method: 'rpc', name });
      if (failDelete) return { error: { message: 'delete failed' } };
      return { error: null };
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
      displayName: 'Ada'
    });
    expect(client.calls[0].options.data.display_name).toBe('Ada');
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
    expect(signedIn.identity.displayName).toBe('Ada');
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
      displayName: 'Ada'
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
      'com.westleysturhan.louisianafrench://auth/callback'
    );
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
      displayName: 'Ada'
    });
    expect(client.calls[0]).toEqual({ method: 'exchange', code: 'recover-code' });

    const providerStyle = await connector.handleAuthUrl(
      'com.westleysturhan.louisianafrench://auth/callback?code=oauth-code'
    );
    expect(providerStyle).toEqual({ kind: null });

    const saved = await connector.updatePassword('new-secret');
    expect(saved.identity.displayName).toBe('Ada');
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

  it('deletes the identity before signing out on this device', async () => {
    const { connector, client } = await harness();
    await connector.signInWithPassword({
      email: 'ada@example.com',
      password: PASSWORD
    });

    const result = await connector.deleteAccount();

    expect(result).toEqual({ identity: null, message: null });
    const rpcAt = client.calls.findIndex((call) => call.method === 'rpc');
    const signOutAt = client.calls.findIndex((call) => call.method === 'signOut');
    expect(client.calls[rpcAt]).toEqual({ method: 'rpc', name: 'delete_own_identity' });
    expect(client.calls[signOutAt]).toEqual({ method: 'signOut', options: { scope: 'local' } });
    expect(rpcAt).toBeLessThan(signOutAt);
    expect(await connector.getIdentity()).toBeNull();
    expect(await AsyncStorage.getItem('lf_profile')).toBe(
      JSON.stringify({ username: 'Player', xp: 3 })
    );
  });

  it('keeps the identity when the account cannot be deleted', async () => {
    const storage = createSessionStore({ secureStore: memorySecureStore() });
    const client = createFakeClient(storage, { failDelete: true });
    const connector = createIdentityConnector({ client });
    await connector.signInWithPassword({
      email: 'ada@example.com',
      password: PASSWORD
    });

    const result = await connector.deleteAccount();

    expect(result).toEqual({
      identity: {
        id: 'learner-1',
        email: 'ada@example.com',
        displayName: 'Ada'
      },
      message: 'The account could not be deleted. Try again.'
    });
    expect(client.calls.some((call) => call.method === 'signOut')).toBe(false);
    expect(await connector.getIdentity()).not.toBeNull();
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
    expect(await connector.deleteAccount()).toEqual({
      identity: null,
      message: 'Sign-in is unavailable.'
    });
  });
});
