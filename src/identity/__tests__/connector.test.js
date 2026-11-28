import { createIdentityConnector } from '../connector';

const USER = { id: 'learner-1', email: 'ada@example.com', app_metadata: { provider: 'google' } };

function clientWith(session, profile = { username: 'Céline' }) {
  return {
    from() {
      return {
        select() {
          return {
            eq() {
              return { maybeSingle: async () => ({ data: profile, error: null }) };
            }
          };
        }
      };
    },
    auth: { getSession: async () => ({ data: { session } }) }
  };
}

describe('identity connector', () => {
  it('reads the stored session and the profile username into the identity', async () => {
    const connector = createIdentityConnector({ client: clientWith({ user: USER }) });
    expect(await connector.getIdentity()).toEqual({
      id: 'learner-1',
      email: 'ada@example.com',
      username: 'Céline',
      provider: 'google'
    });
  });

  it('does not invent a username from the email when the profile has none', async () => {
    const connector = createIdentityConnector({ client: clientWith({ user: { ...USER, app_metadata: {} } }, null) });
    expect(await connector.getIdentity()).toMatchObject({ username: null, provider: 'email' });
  });

  it('stays a guest without a stored session or without sign-in configured', async () => {
    expect(await createIdentityConnector({ client: clientWith(null) }).getIdentity()).toBeNull();
    expect(await createIdentityConnector({ client: null }).getIdentity()).toBeNull();
  });

  it('does not let a slow stored-session read undo a sign-out', async () => {
    let release;
    const client = clientWith({ user: USER });
    client.auth.getSession = () => new Promise((resolve) => { release = () => resolve({ data: { session: { user: USER } } }); });
    client.auth.signOut = async () => ({ error: null });
    const connector = createIdentityConnector({ client });
    await connector.account.signOut();
    release();
    expect(await connector.getIdentity()).toBeNull();
  });
});
