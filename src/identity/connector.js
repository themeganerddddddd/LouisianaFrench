import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import { Linking, Platform } from 'react-native';

import { createAccountConnector } from '../account/accountConnector';
import { openAuthBrowser } from '../account/authBrowser';
import { resolveAuthRedirect } from '../account/authLink';
import { createSessionStore } from './sessionStore';
import { loadProfileUsername } from './username';

const AUTH_REDIRECT = resolveAuthRedirect({
  host: Constants.appOwnership === 'expo' ? Constants.expoConfig?.hostUri || null : null
});

async function storedIdentity(client) {
  const { data } = await client.auth.getSession();
  const user = data?.session?.user;
  if (!user?.id) return null;
  return {
    id: user.id,
    email: user.email || '',
    username: await loadProfileUsername(client, user.id),
    provider: user.app_metadata?.provider === 'google' ? 'google' : 'email'
  };
}

export function createIdentityConnector({ client, openBrowser } = {}) {
  const listeners = new Set();
  let identity = null;
  let announced = false;
  const account = createAccountConnector({
    client,
    openBrowser,
    redirectTo: AUTH_REDIRECT,
    onIdentity(next) {
      announced = true;
      identity = typeof next === 'function' ? next(identity) : next;
      for (const listener of listeners) listener(identity);
    }
  });
  const ready = client
    ? storedIdentity(client).then((stored) => {
        if (!announced) identity = stored;
      })
    : Promise.resolve();

  return {
    async getIdentity() {
      await ready;
      return identity;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
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
