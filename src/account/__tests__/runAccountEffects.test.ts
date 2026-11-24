import { describe, expect, it } from '@jest/globals';

import type { AuthResult, DeleteResult, Effect, Identity } from '../accountMachine';
import { continueAccount, openAccount, runAccountEffect } from '../runAccountEffects';

const ada: Identity = {
  id: 'learner-1',
  email: 'ada@example.com',
  username: null,
  provider: 'email'
};

const authEffects: Effect[] = [
  { run: 'signIn', email: 'ada@example.com', password: 'secret' },
  { run: 'signUp', email: 'ada@example.com', password: 'secret', username: null },
  { run: 'signInWithProvider', provider: 'google' },
  { run: 'sendReset', email: 'ada@example.com' },
  { run: 'updatePassword', password: 'secret' }
];

function hang<T>(): Promise<T> {
  return new Promise(() => {});
}

describe('runAccountEffect', () => {
  it('settles every auth effect, and a timeout is a network failure', async () => {
    const hanging = {
      signIn: () => hang<AuthResult>(),
      signUp: () => hang<AuthResult>(),
      signInWithProvider: () => hang<AuthResult>(),
      sendReset: () => hang<AuthResult>(),
      updatePassword: () => hang<AuthResult>(),
      signOut: () => hang<void>(),
      deleteAccount: () => hang<DeleteResult>()
    };
    for (const effect of authEffects) {
      const events: unknown[] = [];
      await runAccountEffect(effect, hanging, (event) => events.push(event), 20);
      expect(events).toEqual([{ type: 'authSettled', result: { ok: false, failure: 'network' } }]);
    }

    const thrown: unknown[] = [];
    await runAccountEffect(
      authEffects[0],
      { ...hanging, signIn: async () => { throw new Error('down'); } },
      (event) => thrown.push(event),
      20
    );
    expect(thrown).toEqual([{ type: 'authSettled', result: { ok: false, failure: 'unknown' } }]);
  });

  it('dispatches signedOut after a sign-out request even when sign-out throws', async () => {
    const events: unknown[] = [];
    await runAccountEffect(
      { run: 'signOut' },
      {
        signOut: async () => {
          throw new Error('local sign-out failed');
        }
      },
      (event) => events.push(event)
    );
    expect(events).toEqual([{ type: 'signedOut' }]);
  });

  it('turns any delete error into deleteSettled, with unknown as the fallback', async () => {
    const thrown: unknown[] = [];
    await runAccountEffect(
      { run: 'deleteAccount' },
      {
        deleteAccount: async () => {
          throw new Error('database');
        }
      },
      (event) => thrown.push(event)
    );
    expect(thrown).toEqual([
      { type: 'deleteSettled', result: { ok: false, failure: 'unknown' } }
    ]);

    const garbage: unknown[] = [];
    await runAccountEffect(
      { run: 'deleteAccount' },
      { deleteAccount: async () => ({ ok: false, failure: 'oauthFailed' }) },
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
    const connector = {
      onAuthStateChange() {
        subscribed = true;
      },
      signIn: async (): Promise<AuthResult> => ({ ok: true, identity: ada })
    };
    await runAccountEffect(
      { run: 'signIn', email: 'ada@example.com', password: 'secret' },
      connector,
      dispatch,
      20
    );
    openAccount(null, dispatch);
    continueAccount(ada, dispatch);
    expect(subscribed).toBe(false);
    expect(events).toEqual([
      { type: 'authSettled', result: { ok: true, identity: ada } },
      { type: 'opened', identity: null },
      { type: 'opened', identity: ada }
    ]);
  });
});
