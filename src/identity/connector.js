import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import { Linking, Platform } from 'react-native';

import { createAccountConnector } from '../account/accountConnector';
import { openAuthBrowser } from '../account/authBrowser';
import { parseAuthUrl, resolveAuthRedirect } from '../account/authLink';
import { createSessionStore } from './sessionStore';
import {
  checkUsername as checkUsernameRpc,
  loadProfileUsername,
  setUsername as setUsernameRpc
} from './username';

const UNAVAILABLE = 'Sign-in is unavailable.';
const FAILED = 'Sign-in failed.';
const WRONG_PASSWORD = 'That email or password is not right.';
const AUTH_REDIRECT = resolveAuthRedirect({
  host: Constants.appOwnership === 'expo' ? Constants.expoConfig?.hostUri || null : null
});

function toIdentity(user, fallbackEmail, username) {
  if (!user?.id) return null;
  return {
    id: user.id,
    email: user.email || fallbackEmail || '',
    username
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

async function remember(profileClient, session, email) {
  const user = session?.user;
  const username = user?.id ? await loadProfileUsername(profileClient, user.id) : null;
  return {
    identity: toIdentity(user, email, username),
    accessToken: session?.access_token ?? null
  };
}

export function createIdentityConnector({ client, openBrowser } = {}) {
  const account = createAccountConnector({ client, openBrowser, redirectTo: AUTH_REDIRECT });
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
      async signOut() {
        return { identity: null };
      },
      async setUsername() {
        return { ok: false, reason: 'network' };
      },
      async checkUsername() {
        return { status: 'error' };
      },
      account
    };
  }

  let identity = null;
  let accessToken = null;
  const listeners = new Set();
  let ready = hydrate();

  function emit() {
    for (const listener of listeners) listener(identity);
  }

  async function hydrate() {
    const { data } = await client.auth.getSession();
    const next = await remember(client, data?.session);
    identity = next.identity;
    accessToken = next.accessToken;
  }

  async function apply(session, email) {
    await ready;
    const next = await remember(client, session, email);
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
    async signUpWithPassword({ email, password }) {
      const { data, error } = await client.auth.signUp({ email, password });
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
        redirectTo: `${AUTH_REDIRECT}?type=recovery`
      });
      if (error) {
        return { identity: null, message: learnerMessage(error) };
      }
      return { identity: null, message: null };
    },
    async handleAuthUrl(url) {
      const link = parseAuthUrl(url, AUTH_REDIRECT);
      if (link.kind === 'failed') return { kind: null, message: FAILED };
      if (link.kind !== 'recovery') return { kind: null };
      const exchanged = await client.auth.exchangeCodeForSession(link.code);
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
    async signOut() {
      await client.auth.signOut({ scope: 'local' });
      identity = null;
      accessToken = null;
      emit();
      return { identity: null };
    },
    async setUsername(name) {
      const result = await setUsernameRpc((fn, args) => client.rpc(fn, args), name);
      if (result.ok && identity) {
        identity = { ...identity, username: result.username };
        emit();
      }
      return result;
    },
    async checkUsername(candidate) {
      return checkUsernameRpc((fn, args) => client.rpc(fn, args), candidate);
    },
    account
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
    openBrowser: (url) => openAuthBrowser(url, AUTH_REDIRECT, {
      platform: Platform.OS,
      browser: WebBrowser,
      linking: Linking
    })
  });
}
