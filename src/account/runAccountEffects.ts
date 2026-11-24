import type { AccountEvent, AuthResult, DeleteResult, Effect, Identity } from './accountMachine';

type Dispatch = (event: AccountEvent) => void;
type Port = {
  signIn?(email: string, password: string): Promise<AuthResult>;
  signUp?(email: string, password: string, username: string | null): Promise<AuthResult>;
  signInWithProvider?(provider: string): Promise<AuthResult>;
  sendReset?(email: string): Promise<AuthResult>;
  updatePassword?(password: string): Promise<AuthResult>;
  signOut?(): Promise<void>;
  deleteAccount?(): Promise<unknown>;
};

export async function runAccountEffect(effect: Effect, connector: Port, dispatch: Dispatch, timeoutMs = 15000) {
  if (effect.run === 'signOut') {
    try {
      await connector.signOut?.();
    } catch {
      // The learner still leaves this device.
    }
    dispatch({ type: 'signedOut' });
    return;
  }
  if (effect.run === 'deleteAccount') {
    try {
      dispatch({ type: 'deleteSettled', result: asDelete(await connector.deleteAccount?.()) });
    } catch {
      dispatch({ type: 'deleteSettled', result: { ok: false, failure: 'unknown' } });
    }
    return;
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<AuthResult>((resolve) => {
    timer = setTimeout(() => resolve({ ok: false, failure: 'network' }), timeoutMs);
  });
  const work = callAuth(effect, connector).catch(() => ({ ok: false as const, failure: 'unknown' as const }));
  try {
    dispatch({ type: 'authSettled', result: await Promise.race([work, timeout]) });
  } finally {
    clearTimeout(timer);
  }
}

export function openAccount(identity: Identity | null, dispatch: Dispatch) {
  dispatch({ type: 'opened', identity });
}

export function continueAccount(identity: Identity | null, dispatch: Dispatch) {
  openAccount(identity, dispatch);
}

async function callAuth(effect: Effect, connector: Port): Promise<AuthResult> {
  if (effect.run === 'signIn' && connector.signIn) return connector.signIn(effect.email, effect.password);
  if (effect.run === 'signUp' && connector.signUp) {
    return connector.signUp(effect.email, effect.password, effect.username);
  }
  if (effect.run === 'signInWithProvider' && connector.signInWithProvider) {
    return connector.signInWithProvider(effect.provider);
  }
  if (effect.run === 'sendReset' && connector.sendReset) return connector.sendReset(effect.email);
  if (effect.run === 'updatePassword' && connector.updatePassword) return connector.updatePassword(effect.password);
  return { ok: false, failure: 'unknown' };
}

function asDelete(result: unknown): DeleteResult {
  if (!result || typeof result !== 'object') return { ok: false, failure: 'unknown' };
  const value = result as { ok?: boolean; failure?: string };
  if (value.ok === true) return { ok: true };
  if (value.failure === 'network' || value.failure === 'notSignedIn' || value.failure === 'unknown') {
    return { ok: false, failure: value.failure };
  }
  return { ok: false, failure: 'unknown' };
}
