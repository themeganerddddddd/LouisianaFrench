import { createClient } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';

import { createSessionStore } from './sessionStore';

const UNAVAILABLE = 'Sign-in is unavailable.';
const FAILED = 'Sign-in failed.';
const WRONG_PASSWORD = 'That email or password is not right.';
const AUTH_REDIRECT = 'com.westleysturhan.louisianafrench://auth/callback';

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

export function createIdentityConnector({ client, openBrowser } = {}) {
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
      const { error } = await client.auth.resetPasswordForEmail(email);
      if (error) {
        return { identity: null, message: learnerMessage(error) };
      }
      return { identity: null, message: null };
    },
    async signInWithProvider(provider) {
      const attempt = ++providerAttempt;
      const { data, error } = await client.auth.signInWithOAuth({
        provider,
        options: { redirectTo: AUTH_REDIRECT, skipBrowserRedirect: true }
      });
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
        if (!returned.url.startsWith(AUTH_REDIRECT) || parsed.searchParams.get('error')) {
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
    openBrowser: async (url) => {
      const result = await WebBrowser.openAuthSessionAsync(url, AUTH_REDIRECT);
      if (result.type !== 'success' || !result.url) return null;
      return { url: result.url };
    }
  });
}
