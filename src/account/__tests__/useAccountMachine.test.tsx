import { describe, expect, it } from '@jest/globals';
import { render } from '@testing-library/react-native';

import { useAccountMachine } from '../useAccountMachine';

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
});
