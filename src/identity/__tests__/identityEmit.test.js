import { createIdentityConnector } from '../connector';

const USER = { id: 'learner-1', email: 'ada@example.com', app_metadata: { provider: 'email' } };

function fakeClient() {
  return {
    auth: {
      getSession: async () => ({ data: { session: null } }),
      signInWithPassword: async () => ({ data: { session: { user: USER } }, error: null }),
      signOut: async () => ({ error: null })
    },
    rpc: async () => ({ data: { ok: true, username: 'Ada' }, error: null })
  };
}

describe('identity connector as the one identity source', () => {
  it('tells subscribers about sign-in, a saved username and sign-out from the account connector', async () => {
    const connector = createIdentityConnector({ client: fakeClient() });
    const seen = [];
    connector.subscribe((identity) => seen.push(identity));

    await connector.account.signIn('ada@example.com', 'secret');
    await connector.account.setUsername('Ada');
    await connector.account.signOut();

    expect(seen).toEqual([
      { id: 'learner-1', email: 'ada@example.com', username: null, provider: 'email' },
      { id: 'learner-1', email: 'ada@example.com', username: 'Ada', provider: 'email' },
      null
    ]);
    expect(await connector.getIdentity()).toBeNull();
  });

  it('keeps the legacy sign-in methods gone', () => {
    const connector = createIdentityConnector({ client: fakeClient() });
    for (const name of ['signUpWithPassword', 'signInWithPassword', 'sendPasswordReset', 'handleAuthUrl', 'updatePassword', 'getAccessToken', 'learnerMessage']) {
      expect(connector[name]).toBeUndefined();
    }
  });
});
