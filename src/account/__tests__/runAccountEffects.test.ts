import { describe, expect, it } from '@jest/globals';

import type { AuthResult, DeleteResult, Effect, Identity } from '../accountMachine';
import type { AccountConnector } from '../accountConnector';
import { openAccount, runAccountEffect } from '../runAccountEffects';

const ada: Identity = {
  id: 'learner-1',
  email: 'ada@example.com',
  username: null,
  provider: 'email'
};

const authEffects: Effect[] = [
  { run: 'signIn', email: 'ada@example.com', password: 'secret' },
  { run: 'signUp', email: 'ada@example.com', password: 'secret', username: null },
  { run: 'sendReset', email: 'ada@example.com' },
  { run: 'updatePassword', password: 'secret' }
];

function hang<T>(): Promise<T> {
  return new Promise(() => {});
}

describe('runAccountEffect', () => {
  it('settles every auth effect, and a timeout is a network failure', async () => {
    const hanging = port({
      signIn: () => hang<AuthResult>(),
      signUp: () => hang<AuthResult>(),
      signInWithProvider: () => hang<AuthResult>(),
      sendReset: () => hang<AuthResult>(),
      updatePassword: () => hang<AuthResult>(),
      signOut: () => hang<void>(),
      deleteAccount: () => hang<DeleteResult>()
    });
    for (const effect of authEffects) {
      const events: unknown[] = [];
      await runAccountEffect(effect, hanging, (event) => events.push(event), 20);
      expect(events).toEqual([{ type: 'authSettled', result: { ok: false, failure: 'network' } }]);
    }

    const deleted: unknown[] = [];
    const deleteOutcome = await Promise.race([
      runAccountEffect(
        { run: 'deleteAccount' },
        hanging,
        (event) => deleted.push(event),
        20
      ).then(() => 'settled'),
      new Promise((resolve) => setTimeout(() => resolve('hung'), 80))
    ]);
    expect(deleteOutcome).toBe('settled');
    expect(deleted).toEqual([{ type: 'deleteSettled', result: { ok: false, failure: 'network' } }]);

    const thrown: unknown[] = [];
    await runAccountEffect(
      authEffects[0],
      { ...hanging, signIn: async () => { throw new Error('down'); } },
      (event) => thrown.push(event),
      20
    );
    expect(thrown).toEqual([{ type: 'authSettled', result: { ok: false, failure: 'unknown' } }]);
  });

  it('signs out when a timed-out sign-in later succeeds and nothing has retried', async () => {
    let release: (value: AuthResult) => void = () => {};
    const signOuts: string[] = [];
    const events: unknown[] = [];
    const connector = port({
      signIn: () => new Promise((resolve) => {
        release = resolve;
      }),
      signOut: async () => {
        signOuts.push('local');
      }
    });
    const running = runAccountEffect(
      { run: 'signIn', email: 'ada@example.com', password: 'secret' },
      connector,
      (event) => events.push(event),
      20
    );
    await waitFor(() => events.length === 1);
    release({ ok: true, identity: ada });
    await running;
    await waitFor(() => signOuts.length === 1);
    expect(events).toEqual([{ type: 'authSettled', result: { ok: false, failure: 'network' } }]);
    expect(signOuts).toEqual(['local']);
  });

  it('leaves the session when that late sign-in arrives after a newer sign-in succeeded', async () => {
    let releaseFirst: (value: AuthResult) => void = () => {};
    let calls = 0;
    const signOuts: string[] = [];
    const events: unknown[] = [];
    const dispatch = (event: unknown) => events.push(event);
    const connector = port({
      signIn: () => {
        calls += 1;
        if (calls === 1) {
          return new Promise((resolve) => {
            releaseFirst = resolve;
          });
        }
        return Promise.resolve({ ok: true, identity: ada });
      },
      signOut: async () => {
        signOuts.push('local');
      }
    });
    const first = runAccountEffect(
      { run: 'signIn', email: 'ada@example.com', password: 'secret' },
      connector,
      dispatch,
      20
    );
    await waitFor(() => events.length === 1);
    await runAccountEffect(
      { run: 'signIn', email: 'ada@example.com', password: 'secret' },
      connector,
      dispatch,
      20
    );
    releaseFirst({ ok: true, identity: ada });
    await first;
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(signOuts).toEqual([]);
    expect(events).toEqual([
      { type: 'authSettled', result: { ok: false, failure: 'network' } },
      { type: 'authSettled', result: { ok: true, identity: ada } }
    ]);
  });

  it('dispatches signedOut after a sign-out request even when sign-out throws', async () => {
    const events: unknown[] = [];
    await runAccountEffect(
      { run: 'signOut' },
      port({
        signOut: async () => {
          throw new Error('local sign-out failed');
        }
      }),
      (event) => events.push(event)
    );
    expect(events).toEqual([{ type: 'signedOut' }]);
  });

  it('turns any delete error into deleteSettled, with unknown as the fallback', async () => {
    const thrown: unknown[] = [];
    await runAccountEffect(
      { run: 'deleteAccount' },
      port({
        deleteAccount: async () => {
          throw new Error('database');
        }
      }),
      (event) => thrown.push(event)
    );
    expect(thrown).toEqual([
      { type: 'deleteSettled', result: { ok: false, failure: 'unknown' } }
    ]);

    const garbage: unknown[] = [];
    await runAccountEffect(
      { run: 'deleteAccount' },
      port({
        deleteAccount: (async () => ({ ok: false, failure: 'oauthFailed' })) as unknown as AccountConnector['deleteAccount']
      }),
      (event) => garbage.push(event)
    );
    expect(garbage).toEqual([
      { type: 'deleteSettled', result: { ok: false, failure: 'unknown' } }
    ]);
  });

  it('dispatches opened only when the modal opens or the learner continues', async () => {
    let subscribed = false;
    const events: unknown[] = [];
    const dispatch = (event: unknown) => events.push(event);
    const connector = port({
      signIn: async () => ({ ok: true, identity: ada })
    });
    Object.assign(connector, {
      onAuthStateChange() {
        subscribed = true;
      }
    });
    await runAccountEffect(
      { run: 'signIn', email: 'ada@example.com', password: 'secret' },
      connector,
      dispatch,
      20
    );
    openAccount(null, dispatch);
    openAccount(ada, dispatch);
    expect(subscribed).toBe(false);
    expect(events).toEqual([
      { type: 'authSettled', result: { ok: true, identity: ada } },
      { type: 'opened', identity: null },
      { type: 'opened', identity: ada }
    ]);
  });
});

function port(overrides: Partial<AccountConnector>): AccountConnector {
  return {
    signIn: async () => ({ ok: false, failure: 'unknown' }),
    signUp: async () => ({ ok: false, failure: 'unknown' }),
    sendReset: async () => ({ ok: false, failure: 'unknown' }),
    updatePassword: async () => ({ ok: false, failure: 'unknown' }),
    signInWithProvider: async () => ({ ok: false, failure: 'unknown' }),
    signOut: async () => {},
    deleteAccount: async () => ({ ok: false, failure: 'unknown' }),
    ...overrides
  };
}

async function waitFor(ready: () => boolean) {
  for (let i = 0; i < 40; i += 1) {
    if (ready()) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error('timed out');
}
