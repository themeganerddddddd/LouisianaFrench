import AsyncStorage from '@react-native-async-storage/async-storage';

import { createIdentityConnector } from '../connector';
import { createSessionStore } from '../sessionStore';

const REDIRECT = 'com.westleysturhan.louisianafrench://auth/callback';
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

function createFakeClient(storage, { exchangeError } = {}) {
  const calls = [];
  let session = null;
  return {
    calls,
    auth: {
      async getSession() {
        return { data: { session } };
      },
      async signInWithOAuth({ provider, options }) {
        calls.push({ method: 'oauth', provider, options });
        return { data: { url: 'https://accounts.example/authorize' }, error: null };
      },
      async exchangeCodeForSession(code) {
        calls.push({ method: 'exchange', code });
        if (exchangeError) return { data: { session: null }, error: exchangeError };
        session = sessionFor();
        await storage.setItem('sb-auth-token', JSON.stringify(session));
        return { data: { session }, error: null };
      }
    }
  };
}

async function harness(openBrowser, options) {
  const storage = createSessionStore({
    platform: 'ios',
    secureStore: {
      setItemAsync: jest.fn(),
      getItemAsync: jest.fn(async () => null),
      deleteItemAsync: jest.fn()
    }
  });
  const client = createFakeClient(storage, options);
  const connector = createIdentityConnector({ client, openBrowser });
  return { connector, client };
}

describe('signInWithProvider', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await AsyncStorage.setItem(
      'lf_profile',
      JSON.stringify({ username: 'Player', xp: 3 })
    );
  });

  it('exchanges a Google redirect for an identity and an access token', async () => {
    const { connector, client } = await harness(async () => ({
      url: `${REDIRECT}?code=good-code`
    }));

    const result = await connector.signInWithProvider('google');

    expect(result.identity).toEqual({
      id: 'learner-1',
      email: 'ada@example.com',
      displayName: 'Ada'
    });
    expect(await connector.getAccessToken()).toBe('access-token-value');
    expect(client.calls[0].options.redirectTo).toBe(REDIRECT);
    expect(client.calls[0].options.skipBrowserRedirect).toBe(true);
    expect(client.calls[1]).toEqual({ method: 'exchange', code: 'good-code' });
    const stored = JSON.stringify(await AsyncStorage.getItem('sb-auth-token'));
    expect(stored).not.toContain('access-token-value');
    expect(stored).not.toContain('refresh-token-value');
    expect(stored).not.toContain('good-code');
    expect(JSON.parse(await AsyncStorage.getItem('lf_profile')).username).toBe('Player');
  });

  it('exchanges an Expo Go exp:// redirect for an identity', async () => {
    const expoRedirect = 'exp://172.16.0.103:8082/--/auth/callback';
    const storage = createSessionStore({
      platform: 'ios',
      secureStore: {
        setItemAsync: jest.fn(),
        getItemAsync: jest.fn(async () => null),
        deleteItemAsync: jest.fn()
      }
    });
    const client = createFakeClient(storage);
    const connector = createIdentityConnector({
      client,
      redirectTo: expoRedirect,
      openBrowser: async () => ({ url: `${expoRedirect}?code=expo-code` })
    });

    const result = await connector.signInWithProvider('google');

    expect(result.identity?.id).toBe('learner-1');
    expect(client.calls[0].options.redirectTo).toBe(expoRedirect);
    expect(client.calls[1]).toEqual({ method: 'exchange', code: 'expo-code' });
  });

  it('uses the email name when the provider sends no display name', async () => {
    const storage = createSessionStore({
      platform: 'ios',
      secureStore: {
        setItemAsync: jest.fn(),
        getItemAsync: jest.fn(async () => null),
        deleteItemAsync: jest.fn()
      }
    });
    const client = createFakeClient(storage);
    client.auth.exchangeCodeForSession = async (code) => {
      client.calls.push({ method: 'exchange', code });
      const session = sessionFor({ id: 'learner-1', email: 'ada@example.com', user_metadata: {} });
      await storage.setItem('sb-auth-token', JSON.stringify(session));
      return { data: { session }, error: null };
    };
    const connector = createIdentityConnector({
      client,
      openBrowser: async () => ({ url: `${REDIRECT}?code=good-code` })
    });

    const result = await connector.signInWithProvider('google');
    expect(result.identity.displayName).toBe('ada');
  });

  it('leaves a guest when the browser is closed', async () => {
    const { connector, client } = await harness(async () => null);
    const result = await connector.signInWithProvider('google');
    expect(result).toEqual({ identity: null, message: null });
    expect(await connector.getIdentity()).toBeNull();
    expect(client.calls.some((call) => call.method === 'exchange')).toBe(false);
  });

  it('does not exchange an older redirect after a newer attempt starts', async () => {
    let finishFirst;
    const firstBrowser = new Promise((resolve) => {
      finishFirst = resolve;
    });
    const browsers = [
      () => firstBrowser,
      async () => ({ url: `${REDIRECT}?code=second-code` })
    ];
    const { connector, client } = await harness(() => browsers.shift()());

    const first = connector.signInWithProvider('google');
    await Promise.resolve();
    const second = await connector.signInWithProvider('google');
    finishFirst({ url: `${REDIRECT}?code=first-code` });
    await first;

    expect(second.identity.displayName).toBe('Ada');
    expect(client.calls.filter((call) => call.method === 'exchange')).toEqual([
      { method: 'exchange', code: 'second-code' }
    ]);
  });

  it('hides the redirect query when Google returns an error', async () => {
    const { connector } = await harness(async () => ({
      url: `${REDIRECT}?error=access_denied&error_description=secret-code`
    }));
    const result = await connector.signInWithProvider('google');
    expect(result).toEqual({ identity: null, message: 'Sign-in failed.' });
    expect(result.message).not.toContain('secret-code');
    expect(result.message).not.toContain(REDIRECT);
  });

  it('exchanges a Facebook redirect for an identity and an access token', async () => {
    const { connector, client } = await harness(async () => ({
      url: `${REDIRECT}?code=facebook-code`
    }));

    const result = await connector.signInWithProvider('facebook');

    expect(result.identity.displayName).toBe('Ada');
    expect(await connector.getAccessToken()).toBe('access-token-value');
    expect(client.calls[0].provider).toBe('facebook');
    expect(client.calls[0].options.redirectTo).toBe(REDIRECT);
    const stored = JSON.stringify(await AsyncStorage.getItem('sb-auth-token'));
    expect(stored).not.toContain('access-token-value');
    expect(stored).not.toContain('refresh-token-value');
    expect(stored).not.toContain('facebook-code');
    expect(JSON.parse(await AsyncStorage.getItem('lf_profile')).username).toBe('Player');
  });

  it('leaves a guest when the Facebook browser is closed', async () => {
    const { connector, client } = await harness(async () => null);
    const result = await connector.signInWithProvider('facebook');
    expect(result).toEqual({ identity: null, message: null });
    expect(await connector.getIdentity()).toBeNull();
    expect(await connector.getAccessToken()).toBeNull();
    expect(client.calls.some((call) => call.method === 'exchange')).toBe(false);
  });

  it('hides a code that the exchange error repeats', async () => {
    const { connector } = await harness(async () => ({ url: `${REDIRECT}?code=leaked` }), {
      exchangeError: {
        message: `bad ${REDIRECT}?code=leaked`
      }
    });
    const result = await connector.signInWithProvider('google');
    expect(result.message).toBe('Sign-in failed.');
    expect(result.message).not.toContain('leaked');
    expect(await connector.getIdentity()).toBeNull();
  });
});
