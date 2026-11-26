import { describe, expect, it, jest } from '@jest/globals';

import { openAuthBrowser } from '../authBrowser';
import { createAccountConnector, type AccountClient } from '../accountConnector';
import type { AccountEvent } from '../accountMachine';
import { runAccountEffect } from '../runAccountEffects';

const REDIRECT = 'com.westleysturhan.louisianafrench://auth/callback';

function client(): AccountClient {
  return {
    auth: {
      async signInWithPassword() {
        return { data: { session: null }, error: null };
      },
      async signUp() {
        return { data: { session: null }, error: null };
      },
      async resetPasswordForEmail() {
        return { error: null };
      },
      async updateUser() {
        return { data: { user: null }, error: null };
      },
      async signInWithOAuth() {
        return { data: { url: 'https://accounts.google.com/o' }, error: null };
      },
      async exchangeCodeForSession(code: string) {
        return {
          data: {
            session: {
              user: { id: 'learner-1', email: 'ada@example.com', app_metadata: { provider: 'google' } }
            }
          },
          error: code === 'from-google' ? null : { message: 'missing' }
        };
      },
      async getSession() {
        return { data: { session: null } };
      },
      async signOut() {
        return { error: null };
      }
    },
    functions: {
      async invoke() {
        return { data: null, error: { message: 'missing' } };
      }
    }
  };
}

describe('Android auth browser', () => {
  it('dispatches authSettled when Linking delivers the redirect', async () => {
    const dismissBrowser = jest.fn();
    let deliver: (event: { url: string }) => void = () => {};
    const openBrowser = (oauthUrl: string) => openAuthBrowser(oauthUrl, REDIRECT, {
      platform: 'android',
      browser: {
        openAuthSessionAsync: () => {
          queueMicrotask(() => deliver({ url: `${REDIRECT}?code=from-google` }));
          return new Promise(() => {});
        },
        dismissBrowser
      },
      linking: {
        addEventListener(_event, listener) {
          deliver = listener;
          return { remove() {} };
        }
      }
    });
    const connector = createAccountConnector({ client: client(), openBrowser, redirectTo: REDIRECT });
    const events: AccountEvent[] = [];
    await runAccountEffect(
      { run: 'signInWithProvider', provider: 'google' },
      connector,
      (event) => { events.push(event); }
    );
    expect(events).toEqual([{
      type: 'authSettled',
      result: {
        ok: true,
        profileRead: false,
        identity: { id: 'learner-1', email: 'ada@example.com', username: null, provider: 'google' }
      }
    }]);
    expect(dismissBrowser).toHaveBeenCalled();
  }, 1000);
});
