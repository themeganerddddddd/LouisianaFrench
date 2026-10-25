import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { createSessionStore } from './sessionStore';

const UNAVAILABLE = 'Sign-in is unavailable.';
const FAILED = 'Sign-in failed.';
const WRONG_PASSWORD = 'That email or password is not right.';
export const STANDALONE_AUTH_REDIRECT =
  'com.westleysturhan.louisianafrench://auth/callback';
const STANDALONE_SCHEME = 'com.westleysturhan.louisianafrench';

function metroHostUri(constants = Constants) {
  return (
    constants.expoConfig?.hostUri ||
    constants.manifest2?.extra?.expoClient?.hostUri ||
    constants.manifest?.debuggerHost ||
    null
  );
}

/** Supabase Auth rejects redirect URLs whose host is a raw IPv4 (github.com/supabase/auth/issues/2039). */
export function redirectHostIsBlockedIp(redirectTo) {
  const withoutScheme = String(redirectTo).replace(/^[a-z][a-z0-9+.-]*:\/\//i, '');
  const host = withoutScheme.split('/')[0]?.split(':')[0] || '';
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
}

/**
 * OAuth return URL. Linking.createURL should yield exp:// in Expo Go, but with a
 * native android/ tree it often returns the app scheme instead — and Expo Go
 * cannot open that scheme. When createURL gives the standalone scheme while a
 * Metro host is present, force exp://<host>/--/auth/callback.
 */
export function resolveAuthRedirect({
  createURL = Linking.createURL,
  constants = Constants
} = {}) {
  const created = createURL('auth/callback');
  const host = metroHostUri(constants);
  if (created.startsWith(`${STANDALONE_SCHEME}:`) && host) {
    return `exp://${String(host).replace(/\/$/, '')}/--/auth/callback`;
  }
  return created;
}

function matchesAuthRedirect(url, redirectTo = STANDALONE_AUTH_REDIRECT) {
  if (!url) return false;
  const value = String(url);
  if (redirectTo && value.startsWith(redirectTo)) return true;
  if (value.startsWith(STANDALONE_AUTH_REDIRECT)) return true;
  return /\/(--\/)?auth\/callback(?:[?#]|$)/.test(value);
}

/**
 * Android Expo Go often fails to finish openAuthSessionAsync for custom schemes.
 * Race the auth-session API with a Linking listener so a deep-link return still wins.
 */
function openAuthBrowser(oauthUrl, redirectTo) {
  if (Platform.OS !== 'android') {
    return WebBrowser.openAuthSessionAsync(oauthUrl, redirectTo).then((result) => {
      if (result.type !== 'success' || !result.url) return null;
      return { url: result.url };
    });
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      subscription.remove();
      try {
        WebBrowser.dismissBrowser();
      } catch {
        /* browser may already be gone */
      }
      resolve(value);
    };

    const subscription = Linking.addEventListener('url', ({ url }) => {
      if (matchesAuthRedirect(url, redirectTo)) finish({ url });
    });

    WebBrowser.openAuthSessionAsync(oauthUrl, redirectTo)
      .then((result) => {
        if (result?.type === 'success' && result.url) {
          finish({ url: result.url });
          return;
        }
        finish(null);
      })
      .catch(reject);
  });
}

function displayNameFrom(user, fallbackEmail) {
  const metadata = user?.user_metadata ?? {};
  const named = metadata.display_name || metadata.full_name;
  if (named) return named;
  const email = user?.email || fallbackEmail || '';
  return email.split('@')[0] || '';
}

function toIdentity(user, fallbackEmail) {
  if (!user?.id) return null;
  return {
    id: user.id,
    email: user.email || fallbackEmail || '',
    displayName: displayNameFrom(user, fallbackEmail)
  };
}

function learnerMessage(error) {
  const raw = String(error?.message || '');
  if (/com\.westleysturhan\.louisianafrench|code=|error_description/i.test(raw)) return FAILED;
  if (/invalid login credentials/i.test(raw)) return WRONG_PASSWORD;
  if (/already registered|already exists/i.test(raw)) {
    return 'That email is already registered.';
  }
  if (/network|fetch/i.test(raw)) return 'The network failed. Try again.';
  return FAILED;
}

function remember(session, email) {
  return {
    identity: toIdentity(session?.user, email),
    accessToken: session?.access_token ?? null
  };
}

export function createIdentityConnector({
  client,
  openBrowser,
  redirectTo = STANDALONE_AUTH_REDIRECT
} = {}) {
  if (!client) {
    return {
      async getIdentity() {
        return null;
      },
      async getAccessToken() {
        return null;
      },
      subscribe() {
        return () => {};
      },
      async signUpWithPassword() {
        return { identity: null, message: UNAVAILABLE };
      },
      async signInWithPassword() {
        return { identity: null, message: UNAVAILABLE };
      },
      async sendPasswordReset() {
        return { identity: null, message: UNAVAILABLE };
      },
      async handleAuthUrl() {
        return { kind: null };
      },
      async updatePassword() {
        return { identity: null, message: UNAVAILABLE };
      },
      async signInWithProvider() {
        return { identity: null, message: UNAVAILABLE };
      },
      async signOut() {
        return { identity: null };
      }
    };
  }

  let identity = null;
  let accessToken = null;
  let providerAttempt = 0;
  const listeners = new Set();
  let ready = hydrate();

  function emit() {
    for (const listener of listeners) listener(identity);
  }

  async function hydrate() {
    const { data } = await client.auth.getSession();
    const next = remember(data?.session);
    identity = next.identity;
    accessToken = next.accessToken;
  }

  async function apply(session, email) {
    await ready;
    const next = remember(session, email);
    identity = next.identity;
    accessToken = next.accessToken;
    emit();
    return { identity, message: identity ? null : FAILED };
  }

  return {
    async getIdentity() {
      await ready;
      return identity;
    },
    async getAccessToken() {
      await ready;
      return accessToken;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async signUpWithPassword({ email, password, displayName }) {
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: { data: { display_name: displayName } }
      });
      if (error) {
        return { identity: null, message: learnerMessage(error) };
      }
      if (!data?.session) {
        return { identity: null, message: 'Check your email.' };
      }
      return apply(data.session, email);
    },
    async signInWithPassword({ email, password }) {
      const { data, error } = await client.auth.signInWithPassword({
        email,
        password
      });
      if (error || !data?.session) {
        return { identity: null, message: error ? learnerMessage(error) : FAILED };
      }
      return apply(data.session, email);
    },
    async sendPasswordReset(email) {
      const { error } = await client.auth.resetPasswordForEmail(email, {
        // Email links need the stable standalone scheme, not an Expo Go host URL.
        redirectTo: STANDALONE_AUTH_REDIRECT
      });
      if (error) {
        return { identity: null, message: learnerMessage(error) };
      }
      return { identity: null, message: null };
    },
    async handleAuthUrl(url) {
      let code = null;
      let type = null;
      try {
        if (!matchesAuthRedirect(url, redirectTo)) return { kind: null };
        const parsed = new URL(url);
        if (parsed.searchParams.get('error')) {
          return { kind: null, message: FAILED };
        }
        code = parsed.searchParams.get('code');
        type = parsed.searchParams.get('type');
      } catch {
        return { kind: null, message: FAILED };
      }
      if (!code || type !== 'recovery') return { kind: null };

      const exchanged = await client.auth.exchangeCodeForSession(code);
      if (exchanged.error || !exchanged.data?.session) {
        return {
          kind: null,
          message: exchanged.error ? learnerMessage(exchanged.error) : FAILED
        };
      }
      await apply(exchanged.data.session);
      return { kind: 'recovery' };
    },
    async updatePassword(password) {
      const { data, error } = await client.auth.updateUser({ password });
      if (error || !data?.user) {
        return { identity: null, message: error ? learnerMessage(error) : FAILED };
      }
      const { data: sessionData } = await client.auth.getSession();
      if (!sessionData?.session) {
        return { identity: null, message: FAILED };
      }
      return apply(sessionData.session);
    },
    async signInWithProvider(provider) {
      const attempt = ++providerAttempt;
      if (__DEV__) {
        console.log('[identity] OAuth redirectTo', redirectTo);
        console.log('[identity] Constants', {
          executionEnvironment: Constants.executionEnvironment,
          appOwnership: Constants.appOwnership,
          hostUri: metroHostUri(),
          expoGoConfig: Boolean(Constants.expoGoConfig)
        });
        if (redirectHostIsBlockedIp(redirectTo)) {
          console.warn(
            '[identity] Supabase blocks OAuth redirects to raw IP hosts (expo Go LAN URL). ' +
              'Use `npx expo start --tunnel`, or a dev/release build with the app scheme. ' +
              'See https://github.com/supabase/auth/issues/2039'
          );
        }
      }
      const { data, error } = await client.auth.signInWithOAuth({
        provider,
        options: { redirectTo, skipBrowserRedirect: true }
      });
      if (__DEV__ && data?.url) {
        console.log('[identity] OAuth authorize', data.url);
      }
      if (error || !data?.url || !openBrowser) {
        return { identity: null, message: error ? learnerMessage(error) : UNAVAILABLE };
      }

      let returned = null;
      try {
        returned = await openBrowser(data.url);
      } catch (browserError) {
        return { identity: null, message: learnerMessage(browserError) };
      }
      if (attempt !== providerAttempt || !returned?.url) {
        return { identity: null, message: null };
      }

      let code = null;
      try {
        const parsed = new URL(returned.url);
        if (!matchesAuthRedirect(returned.url, redirectTo) || parsed.searchParams.get('error')) {
          return { identity: null, message: FAILED };
        }
        code = parsed.searchParams.get('code');
      } catch {
        return { identity: null, message: FAILED };
      }
      if (!code) return { identity: null, message: FAILED };

      const exchanged = await client.auth.exchangeCodeForSession(code);
      if (attempt !== providerAttempt) return { identity: null, message: null };
      if (exchanged.error || !exchanged.data?.session) {
        return {
          identity: null,
          message: exchanged.error ? learnerMessage(exchanged.error) : FAILED
        };
      }
      return apply(exchanged.data.session);
    },
    async signOut() {
      await client.auth.signOut({ scope: 'local' });
      identity = null;
      accessToken = null;
      emit();
      return { identity: null };
    }
  };
}

export function createSupabaseIdentityConnector(env = {
  EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
}) {
  const url = env.EXPO_PUBLIC_SUPABASE_URL;
  const key = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return createIdentityConnector({ client: null });
  }

  const redirectTo = resolveAuthRedirect();
  const client = createClient(url, key, {
    auth: {
      storage: createSessionStore(),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: 'pkce'
    }
  });

  return createIdentityConnector({
    client,
    redirectTo,
    openBrowser: (oauthUrl) => openAuthBrowser(oauthUrl, redirectTo)
  });
}
