import { describe, expect, it, jest } from '@jest/globals';

import { createAccountConnector, type AccountClient } from '../accountConnector';
import type { Identity } from '../accountMachine';

const REDIRECT = 'com.westleysturhan.louisianafrench://auth/callback';
const USER = { id: 'learner-1', email: 'ada@example.com', app_metadata: { provider: 'email' } };
const ADA: Identity = { id: 'learner-1', email: 'ada@example.com', username: null, provider: 'email' };

function client(auth: Record<string, unknown>, rpc?: AccountClient['rpc']): AccountClient {
  return {
    auth: {
      async signInWithPassword() { return { data: { session: { user: USER } }, error: null }; },
      async signUp() { return { data: { session: { user: USER } }, error: null }; },
      async resetPasswordForEmail() { return { error: null }; },
      async updateUser() { return { data: { user: USER }, error: null }; },
      async signInWithOAuth() { return { data: { url: 'https://accounts.example/google' }, error: null }; },
      async exchangeCodeForSession() { return { data: { session: { user: USER } }, error: null }; },
      async getSession() { return { data: { session: { access_token: 'access-token' } } }; },
      async signOut() { return { error: null }; },
      ...auth
    },
    functions: { async invoke() { return { data: { ok: true }, error: null }; } },
    rpc
  };
}

function watched(auth: Record<string, unknown> = {}, extra: { rpc?: AccountClient['rpc']; openBrowser?: (url: string) => Promise<{ url: string } | null> } = {}) {
  const onIdentity = jest.fn<(next: unknown) => void>();
  const connector = createAccountConnector({
    client: client(auth, extra.rpc),
    openBrowser: extra.openBrowser,
    redirectTo: REDIRECT,
    onIdentity
  });
  return { connector, onIdentity };
}

describe('account connector identity notifications', () => {
  it('announces an email sign-in, and not a failed one', async () => {
    const ok = watched();
    await ok.connector.signIn('ada@example.com', 'secret');
    expect(ok.onIdentity).toHaveBeenCalledWith(ADA);

    const bad = watched({ signInWithPassword: async () => ({ data: { session: null }, error: { code: 'invalid_credentials' } }) });
    await bad.connector.signIn('ada@example.com', 'nope');
    expect(bad.onIdentity).not.toHaveBeenCalled();
  });

  it('announces a sign-up that has a session, and stays quiet when it waits for confirmation', async () => {
    const ok = watched();
    await ok.connector.signUp('ada@example.com', 'secret', null);
    expect(ok.onIdentity).toHaveBeenCalledWith(ADA);

    const pending = watched({ signUp: async () => ({ data: { session: null }, error: null }) });
    await pending.connector.signUp('ada@example.com', 'secret', null);
    expect(pending.onIdentity).not.toHaveBeenCalled();
  });

  it('announces a Google sign-in', async () => {
    const { connector, onIdentity } = watched({}, { openBrowser: async () => ({ url: `${REDIRECT}?code=abc` }) });
    await connector.signInWithProvider('google');
    expect(onIdentity).toHaveBeenCalledWith({ ...ADA, provider: 'google' });
  });

  it('announces a link sign-in but not a recovery link', async () => {
    const link = watched();
    await link.connector.consumeAuthUrl(`${REDIRECT}?code=abc&type=signup`);
    expect(link.onIdentity).toHaveBeenCalledWith(ADA);

    const recovery = watched();
    await recovery.connector.consumeAuthUrl(`${REDIRECT}?code=abc&type=recovery`);
    expect(recovery.onIdentity).not.toHaveBeenCalled();
  });

  it('announces the saved username by updating the identity it was given', async () => {
    const { connector, onIdentity } = watched({}, { rpc: async () => ({ data: { ok: true, username: 'Ada' }, error: null }) });
    expect(await connector.setUsername('Ada')).toEqual({ ok: true, username: 'Ada' });
    const update = onIdentity.mock.calls[0][0] as (previous: Identity | null) => Identity | null;
    expect(update(ADA)).toEqual({ ...ADA, username: 'Ada' });
    expect(update(null)).toBeNull();
  });

  it('announces a rejected username as nothing', async () => {
    const { connector, onIdentity } = watched({}, { rpc: async () => ({ data: { ok: false, reason: 'taken' }, error: null }) });
    await connector.setUsername('Ada');
    expect(onIdentity).not.toHaveBeenCalled();
  });

  it('announces a guest after sign-out and after a deleted account', async () => {
    const out = watched();
    await out.connector.signOut();
    expect(out.onIdentity).toHaveBeenCalledWith(null);

    const gone = watched();
    expect(await gone.connector.deleteAccount()).toEqual({ ok: true });
    expect(gone.onIdentity).toHaveBeenCalledWith(null);
  });

  it('announces a saved password as a sign-in', async () => {
    const { connector, onIdentity } = watched();
    await connector.updatePassword('a-new-password');
    expect(onIdentity).toHaveBeenCalledWith(ADA);
  });

  it('announces a guest when a late password success signs out locally', async () => {
    let release: (value: unknown) => void = () => {};
    const { connector, onIdentity } = watched({
      updateUser: () => new Promise((resolve) => { release = resolve; })
    });
    const slow = createAccountConnector({ client: client({ updateUser: () => new Promise((resolve) => { release = resolve; }) }), redirectTo: REDIRECT, timeoutMs: 20, onIdentity })
    expect(await slow.updatePassword('new-password')).toEqual({ ok: false, failure: 'network' })
    release({ data: { user: USER }, error: null })
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(onIdentity).toHaveBeenCalledWith(null)
    expect(connector).toBeDefined()
  });

  it('announces a guest when a late Google exchange signs out locally', async () => {
    let release: (value: unknown) => void = () => {};
    const onIdentity = jest.fn<(next: unknown) => void>();
    const slow = createAccountConnector({
      client: client({ exchangeCodeForSession: () => new Promise((resolve) => { release = resolve; }) }),
      openBrowser: async () => ({ url: `${REDIRECT}?code=late` }),
      redirectTo: REDIRECT,
      timeoutMs: 20,
      onIdentity
    })
    expect(await slow.signInWithProvider('google')).toEqual({ ok: false, failure: 'network' })
    release({ data: { session: { user: USER } }, error: null })
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(onIdentity).toHaveBeenCalledWith(null)
  });

  it('opens the first username step from a link only when the profile read succeeded', async () => {
    const read = (found: boolean, username: string | null) => {
      const base = client({})
      return { ...base, from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => found ? { data: { username }, error: null } : { data: null, error: { message: 'down' } } }) }) }) } as AccountClient
    }
    const link = (c: AccountClient) => createAccountConnector({ client: c, redirectTo: REDIRECT }).consumeAuthUrl(`${REDIRECT}?code=abc&type=signup`)
    expect(await link(read(true, null))).toMatchObject({ type: 'opened', profileRead: true, identity: { username: null } })
    expect(await link(read(false, null))).toMatchObject({ type: 'opened', profileRead: false })
    expect(await link(read(true, 'Ada'))).toMatchObject({ type: 'opened', identity: { username: 'Ada' } })
  });

  it('announces a guest when a late password success signs out locally', async () => {
    let release: (value: unknown) => void = () => {};
    const onIdentity = jest.fn<(next: unknown) => void>();
    const slow = createAccountConnector({
      client: client({ updateUser: () => new Promise((resolve) => { release = resolve; }) }),
      redirectTo: REDIRECT,
      timeoutMs: 20,
      onIdentity
    });
    expect(await slow.updatePassword('new-password')).toEqual({ ok: false, failure: 'network' });
    release({ data: { user: USER }, error: null });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(onIdentity).toHaveBeenCalledWith(null);
  });

  it('announces a guest when a late Google exchange signs out locally', async () => {
    let release: (value: unknown) => void = () => {};
    const onIdentity = jest.fn<(next: unknown) => void>();
    const slow = createAccountConnector({
      client: client({ exchangeCodeForSession: () => new Promise((resolve) => { release = resolve; }) }),
      openBrowser: async () => ({ url: `${REDIRECT}?code=late` }),
      redirectTo: REDIRECT,
      timeoutMs: 20,
      onIdentity
    });
    expect(await slow.signInWithProvider('google')).toEqual({ ok: false, failure: 'network' });
    release({ data: { session: { user: USER } }, error: null });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(onIdentity).toHaveBeenCalledWith(null);
  });

  it('carries the profile read on a link sign-in', async () => {
    const withProfile = (read: () => Promise<unknown>) => ({
      ...client({}),
      from: () => ({ select: () => ({ eq: () => ({ maybeSingle: read }) }) })
    }) as AccountClient;
    const link = (c: AccountClient) => createAccountConnector({ client: c, redirectTo: REDIRECT }).consumeAuthUrl(`${REDIRECT}?code=abc&type=signup`);
    expect(await link(withProfile(async () => ({ data: { username: null }, error: null })))).toMatchObject({ type: 'opened', profileRead: true, identity: { username: null } });
    expect(await link(withProfile(async () => ({ data: null, error: { message: 'down' } })))).toMatchObject({ type: 'opened', profileRead: false });
  });
});

