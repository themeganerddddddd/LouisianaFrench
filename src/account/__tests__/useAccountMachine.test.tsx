import { describe, expect, it, jest } from '@jest/globals';
import { render } from '@testing-library/react-native';
import { act, StrictMode, useState } from 'react';

import type { AccountConnector } from '../accountConnector';
import type { AuthResult } from '../accountMachine';
import { useAccountMachine } from '../useAccountMachine';

const failed: AuthResult = { ok: false, failure: 'wrongCredentials' };

function connector(signIn: AccountConnector['signIn']): AccountConnector {
  return {
    signIn,
    signUp: async () => ({ ok: false, failure: 'unknown' }),
    sendReset: async () => ({ ok: false, failure: 'unknown' }),
    updatePassword: async () => ({ ok: false, failure: 'unknown' }),
    signInWithProvider: async () => ({ ok: false, failure: 'unknown' }),
    signOut: async () => {},
    deleteAccount: async () => ({ ok: false, failure: 'unknown' }),
    consumeAuthUrl: async () => null,
    beginAttempt: () => 1,
    noteSuccess: () => {},
    orphaned: () => true
  };
}

function ready(slot: { machine?: ReturnType<typeof useAccountMachine> }) {
  if (!slot.machine) throw new Error('the screen did not render');
  return slot.machine;
}

function signInWith(email: string, password: string, machine: { dispatch: (event: { type: 'edited'; field: 'email' | 'password'; value: string } | { type: 'submitted' }) => void }) {
  machine.dispatch({ type: 'edited', field: 'email', value: email });
  machine.dispatch({ type: 'edited', field: 'password', value: password });
  machine.dispatch({ type: 'submitted' });
}

describe('useAccountMachine', () => {
  it('does not open the account from an auth state change, including after unmount', () => {
    let listener: (() => void) | null = null;
    const connector = {
      signIn: async () => ({ ok: false as const, failure: 'unknown' as const }),
      signUp: async () => ({ ok: false as const, failure: 'unknown' as const }),
      sendReset: async () => ({ ok: false as const, failure: 'unknown' as const }),
      updatePassword: async () => ({ ok: false as const, failure: 'unknown' as const }),
      signInWithProvider: async () => ({ ok: false as const, failure: 'unknown' as const }),
      signOut: async () => {},
      deleteAccount: async () => ({ ok: false as const, failure: 'unknown' as const }),
      consumeAuthUrl: async () => null,
      beginAttempt: () => 1,
      noteSuccess: () => {},
      orphaned: () => true,
      onAuthStateChange(next: () => void) {
        listener = next;
        return () => {};
      }
    };
    function Screen() {
      useAccountMachine(connector, null);
      return null;
    }
    const rendered = render(<Screen />);
    expect(listener).toBeNull();
    rendered.unmount();
  });

  it('signs in once under StrictMode and shows the failure', async () => {
    const calls: string[][] = [];
    const slot: { machine?: ReturnType<typeof useAccountMachine> } = {};
    function Screen() {
      slot.machine = useAccountMachine(
        connector(async (email, password) => {
          calls.push([email, password]);
          return failed;
        }),
        null
      );
      return null;
    }
    render(
      <StrictMode>
        <Screen />
      </StrictMode>
    );
    await act(async () => {
      signInWith('ada@example.com', 'secret', ready(slot));
    });
    expect(calls).toEqual([['ada@example.com', 'secret']]);
    expect(slot.machine?.view).toEqual({
      kind: 'signIn',
      email: 'ada@example.com',
      password: 'secret',
      submit: { status: 'failed', failure: 'wrongCredentials' }
    });
  });

  it('drops the result when the screen unmounts before sign-in settles', async () => {
    let release: (result: AuthResult) => void = () => {};
    const pending = new Promise<AuthResult>((resolve) => {
      release = resolve;
    });
    let calls = 0;
    const slot: { machine?: ReturnType<typeof useAccountMachine> } = {};
    let renders = 0;
    function Screen({ onStart }: { onStart: () => void }) {
      renders += 1;
      slot.machine = useAccountMachine(
        connector(async () => {
          calls += 1;
          onStart();
          return pending;
        }),
        null
      );
      return null;
    }
    function Host() {
      const [, setTick] = useState(0);
      return <Screen onStart={() => setTick((tick) => tick + 1)} />;
    }
    const errors: unknown[][] = [];
    const spy = jest.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      errors.push(args);
    });
    const rendered = render(<Host />);
    await act(async () => {
      signInWith('ada@example.com', 'secret', ready(slot));
    });
    expect(calls).toBe(1);
    const rendersAtUnmount = renders;
    await act(async () => {
      rendered.unmount();
      release(failed);
      await pending;
    });
    expect(renders).toBe(rendersAtUnmount);
    expect(errors).toEqual([]);
    spy.mockRestore();
  });
});
