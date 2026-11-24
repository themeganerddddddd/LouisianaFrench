import { describe, expect, it } from '@jest/globals';

import {
  DELETE_WORD,
  canDismiss,
  effectFor,
  initialView,
  isDeleteArmed,
  reduce,
  type AccountEvent,
  type AccountView,
  type AuthResult,
  type DeleteResult,
  type Identity,
  type Provider,
  type Submit
} from '../accountMachine';
import { isValidUsernameFormat } from '../usernameFormat';

type Assert<T extends true> = T;
type IncludesApple = 'apple' extends Provider ? true : false;
type IncludesDisplayName = 'displayName' extends keyof Extract<AccountView, { kind: 'create' }>
  ? true
  : false;
type StoresCancel = 'oauthCancelled' extends Extract<Submit, { status: 'failed' }>['failure']
  ? true
  : false;

const editing: Submit = { status: 'editing' };

const ada: Identity = {
  id: 'learner-1',
  email: 'ada@example.com',
  username: 'Elise',
  provider: 'email'
};

const googleAda: Identity = { ...ada, provider: 'google' };

function signIn(submit: Submit = editing): AccountView {
  return { kind: 'signIn', email: 'ada@example.com', password: 'secret', submit };
}

function create(username = 'Élise_1', submit: Submit = editing): AccountView {
  return { kind: 'create', username, email: 'ada@example.com', password: 'secret', submit };
}

function forgot(submit: Submit = editing): AccountView {
  return { kind: 'forgot', email: 'ada@example.com', submit };
}

function setNewPassword(submit: Submit = editing): AccountView {
  return { kind: 'setNewPassword', password: 'newer-secret', submit };
}

function signedIn(signingOut = false): AccountView {
  return { kind: 'signedIn', identity: ada, signingOut };
}

function confirmDelete(typed = '', failure?: 'network' | 'unknown'): AccountView {
  return {
    kind: 'deleteAccount',
    identity: ada,
    deletion: failure ? { phase: 'confirm', typed, failure } : { phase: 'confirm', typed }
  };
}

function deleting(): AccountView {
  return { kind: 'deleteAccount', identity: ada, deletion: { phase: 'deleting' } };
}

function step(view: AccountView, event: AccountEvent) {
  const next = reduce(view, event);
  return { next, effect: effectFor(view, next) };
}

function submitOf(view: AccountView): Submit {
  if (
    view.kind === 'signIn' ||
    view.kind === 'create' ||
    view.kind === 'forgot' ||
    view.kind === 'setNewPassword'
  ) {
    return view.submit;
  }
  throw new Error(view.kind);
}

describe('isValidUsernameFormat', () => {
  const letters = 'ÀÂÄÇÉÈÊËÎÏÔÖÙÛÜŸàâäçéèêëîïôöùûüÿ';

  it('accepts Élise_1 and each letter from the French whitelist', () => {
    expect(isValidUsernameFormat('Élise_1')).toBe(true);
    expect(isValidUsernameFormat('abc')).toBe(true);
    expect(isValidUsernameFormat('A1_')).toBe(true);
    for (const letter of letters) {
      expect(isValidUsernameFormat(`${letter}ab`)).toBe(true);
    }
  });

  it('rejects a non-letter start, a short name, a hyphen, æ, œ, and emoji', () => {
    expect(isValidUsernameFormat('1logan')).toBe(false);
    expect(isValidUsernameFormat('ab')).toBe(false);
    expect(isValidUsernameFormat('a-b')).toBe(false);
    expect(isValidUsernameFormat('a b')).toBe(false);
    expect(isValidUsernameFormat('Æsop')).toBe(false);
    expect(isValidUsernameFormat('æsop')).toBe(false);
    expect(isValidUsernameFormat('Œdipe')).toBe(false);
    expect(isValidUsernameFormat('œdipe')).toBe(false);
    expect(isValidUsernameFormat('abc😀')).toBe(false);
    expect(isValidUsernameFormat('Ábc')).toBe(false);
    expect(isValidUsernameFormat('Εlise')).toBe(false);
    expect(isValidUsernameFormat('Еlise')).toBe(false);
    expect(isValidUsernameFormat('')).toBe(false);
    expect(isValidUsernameFormat(' Élise_1')).toBe(false);
    expect(isValidUsernameFormat('Élise_1 ')).toBe(false);
  });

  it('counts length after NFC, so 20 passes and 21 fails', () => {
    expect(isValidUsernameFormat('a'.repeat(20))).toBe(true);
    expect(isValidUsernameFormat('a'.repeat(21))).toBe(false);

    const nfc20 = `e\u0301${'b'.repeat(19)}`;
    const nfc21 = `e\u0301${'b'.repeat(20)}`;
    expect(nfc20.length).toBe(21);
    expect(nfc20.normalize('NFC').length).toBe(20);
    expect(isValidUsernameFormat(nfc20)).toBe(true);
    expect(nfc21.normalize('NFC').length).toBe(21);
    expect(isValidUsernameFormat(nfc21)).toBe(false);
  });
});

describe('account types', () => {
  it('has no apple provider and no displayName on create', () => {
    const noApple: Assert<IncludesApple extends false ? true : false> = true;
    const noDisplayName: Assert<IncludesDisplayName extends false ? true : false> = true;
    const noCancel: Assert<StoresCancel extends false ? true : false> = true;
    expect(noApple).toBe(true);
    expect(noDisplayName).toBe(true);
    expect(noCancel).toBe(true);
  });
});

describe('initial view', () => {
  it('opens a guest on sign in and a learner on signed in', () => {
    expect(initialView(null)).toEqual({ kind: 'signIn', email: '', password: '', submit: editing });
    expect(initialView(ada)).toEqual({ kind: 'signedIn', identity: ada, signingOut: false });
  });
});

describe('sign in', () => {
  it('edits email and password, and ignores a username edit', () => {
    const view = signIn();
    expect(reduce(view, { type: 'edited', field: 'email', value: 'bea@example.com' })).toEqual({
      ...view,
      email: 'bea@example.com'
    });
    expect(reduce(view, { type: 'edited', field: 'password', value: 'next' })).toEqual({
      ...view,
      password: 'next'
    });
    expect(reduce(view, { type: 'edited', field: 'username', value: 'Bea' })).toBe(view);
  });

  it('ignores an edit while sign-in is submitting', () => {
    const submitting = reduce(signIn(), { type: 'submitted' });
    expect(reduce(submitting, { type: 'edited', field: 'email', value: 'bea@example.com' })).toBe(
      submitting
    );
  });

  it('drops navigation while a form is submitting or in oauth', () => {
    const submitting = reduce(create('Élise_1'), { type: 'submitted' });
    const stayed = reduce(submitting, { type: 'navigated', to: 'signIn' });
    expect(stayed).toBe(submitting);
    expect(reduce(stayed, {
      type: 'authSettled',
      result: { ok: true, identity: ada }
    })).toEqual(signedIn());

    const oauth = reduce(signIn(), { type: 'providerChosen', provider: 'google' });
    expect(reduce(oauth, { type: 'navigated', to: 'forgot' })).toBe(oauth);
  });

  it('blocks dismiss while a form is submitting or in oauth', () => {
    expect(canDismiss(reduce(signIn(), { type: 'submitted' }))).toBe(false);
    expect(canDismiss(reduce(forgot(), { type: 'submitted' }))).toBe(false);
    expect(canDismiss(reduce(create(), { type: 'providerChosen', provider: 'google' }))).toBe(false);
    expect(canDismiss(signIn())).toBe(true);
  });

  it('submits once, drops a second submit, and asks for signIn', () => {
    const first = step(signIn(), { type: 'submitted' });
    expect(first.next).toEqual({ ...signIn(), submit: { status: 'submitting' } });
    expect(first.effect).toEqual({
      run: 'signIn',
      email: 'ada@example.com',
      password: 'secret'
    });
    expect(reduce(first.next, { type: 'submitted' })).toBe(first.next);
  });

  it('keeps a Google sign-in when the sheet closes before it settles', () => {
    const oauth = reduce(signIn(), { type: 'providerChosen', provider: 'google' });
    const closed = reduce(oauth, { type: 'opened', identity: null });
    expect(reduce(closed, { type: 'authSettled', result: { ok: true, identity: googleAda } })).toEqual({
      kind: 'signedIn',
      identity: googleAda,
      signingOut: false
    });
  });

  it('locks the form while Google sign-in is in progress', () => {
    const started = step(signIn(), { type: 'providerChosen', provider: 'google' });
    expect(started.next).toEqual({
      ...signIn(),
      submit: { status: 'oauth', provider: 'google' }
    });
    expect(started.effect).toEqual({ run: 'signInWithProvider', provider: 'google' });
    expect(reduce(started.next, { type: 'submitted' })).toBe(started.next);
    expect(reduce(started.next, { type: 'providerChosen', provider: 'google' })).toBe(started.next);
    expect(reduce(started.next, { type: 'edited', field: 'email', value: 'x' })).toBe(started.next);
  });

  it('settles a password sign-in to signed in, a failure, or a cancelled Google attempt', () => {
    const submitting = reduce(signIn(), { type: 'submitted' });
    const oauth = reduce(signIn(), { type: 'providerChosen', provider: 'google' });
    const ok: AuthResult = { ok: true, identity: googleAda };
    expect(step(oauth, { type: 'authSettled', result: ok })).toEqual({
      next: { kind: 'signedIn', identity: googleAda, signingOut: false },
      effect: null
    });
    expect(reduce(submitting, { type: 'authSettled', result: ok }).kind).toBe('signedIn');

    const failed = reduce(submitting, {
      type: 'authSettled',
      result: { ok: false, failure: 'wrongCredentials' }
    });
    expect(failed).toEqual({ ...signIn(), submit: { status: 'failed', failure: 'wrongCredentials' } });
    expect(effectFor(submitting, failed)).toBeNull();

    const cancelled = reduce(oauth, {
      type: 'authSettled',
      result: { ok: false, failure: 'oauthCancelled' }
    });
    expect(cancelled).toEqual(signIn());
    expect(reduce(oauth, {
      type: 'authSettled',
      result: { ok: false, failure: 'oauthFailed' }
    })).toEqual({ ...signIn(), submit: { status: 'failed', failure: 'oauthFailed' } });
  });

  it('clears a failure on the next edit', () => {
    const failed = signIn({ status: 'failed', failure: 'wrongCredentials' });
    expect(reduce(failed, { type: 'edited', field: 'password', value: 'again' })).toEqual({
      ...signIn(),
      password: 'again'
    });
  });

  it('leaves for create and forgot, and ignores an unmatched settle', () => {
    expect(reduce(signIn(), { type: 'navigated', to: 'create' })).toEqual({
      kind: 'create',
      username: '',
      email: '',
      password: '',
      submit: editing
    });
    expect(reduce(signIn(), { type: 'navigated', to: 'forgot' })).toEqual({
      kind: 'forgot',
      email: '',
      submit: editing
    });
    const submitting = reduce(signIn(), { type: 'submitted' });
    const pending: AuthResult = { ok: true, pending: 'confirmSignUp' };
    expect(reduce(submitting, { type: 'authSettled', result: pending })).toBe(submitting);
    expect(canDismiss(signIn())).toBe(true);
  });
});

describe('create account', () => {
  it('submits a valid username and an empty username', () => {
    const valid = step(create('Élise_1'), { type: 'submitted' });
    expect(submitOf(valid.next)).toEqual({ status: 'submitting' });
    expect(valid.effect).toEqual({
      run: 'signUp',
      email: 'ada@example.com',
      password: 'secret',
      username: 'Élise_1'
    });

    const empty = step(create(''), { type: 'submitted' });
    expect(submitOf(empty.next)).toEqual({ status: 'submitting' });
    expect(empty.effect).toEqual({
      run: 'signUp',
      email: 'ada@example.com',
      password: 'secret',
      username: null
    });
  });

  it('does not trim a username, so spaces stay invalid', () => {
    const view = create(' Élise_1');
    const result = step(view, { type: 'submitted' });
    expect(result.next).toEqual({
      ...view,
      submit: { status: 'failed', failure: 'invalidUsername' }
    });
    expect(result.effect).toBeNull();
  });

  it('keeps an invalid username on the form and emits no effect', () => {
    const view = create('1logan');
    const result = step(view, { type: 'submitted' });
    expect(result.next).toEqual({
      ...view,
      submit: { status: 'failed', failure: 'invalidUsername' }
    });
    expect(result.effect).toBeNull();
    expect(reduce(result.next, { type: 'submitted' })).toBe(result.next);
  });

  it('clears invalidUsername on the next edit, then submits', () => {
    const failed = create('1logan', { status: 'failed', failure: 'invalidUsername' });
    const edited = reduce(failed, { type: 'edited', field: 'username', value: 'Élise_1' });
    expect(edited).toEqual(create('Élise_1'));
    expect(step(edited, { type: 'submitted' }).effect?.run).toBe('signUp');
  });

  it('sends a sign-up with no session to the confirm inbox, and a session to signed in', () => {
    const submitting = reduce(create(), { type: 'submitted' });
    expect(reduce(submitting, {
      type: 'authSettled',
      result: { ok: true, pending: 'confirmSignUp' }
    })).toEqual({ kind: 'inbox', reason: 'confirmSignUp' });
    expect(reduce(submitting, {
      type: 'authSettled',
      result: { ok: true, identity: ada }
    })).toEqual(signedIn());
    expect(reduce(submitting, {
      type: 'authSettled',
      result: { ok: true, pending: 'passwordReset' }
    })).toBe(submitting);
  });

  it('offers Google, returns to sign in, and drops a submit while submitting', () => {
    const oauth = step(create(), { type: 'providerChosen', provider: 'google' });
    expect(submitOf(oauth.next)).toEqual({ status: 'oauth', provider: 'google' });
    expect(oauth.effect).toEqual({ run: 'signInWithProvider', provider: 'google' });
    expect(reduce(create(), { type: 'navigated', to: 'signIn' })).toEqual({
      kind: 'signIn',
      email: '',
      password: '',
      submit: editing
    });
    const submitting = reduce(create(), { type: 'submitted' });
    expect(reduce(submitting, { type: 'submitted' })).toBe(submitting);
    expect(reduce(oauth.next, { type: 'edited', field: 'email', value: 'x' })).toBe(oauth.next);
    expect(canDismiss(create())).toBe(true);
  });
});

describe('forgot password and inbox', () => {
  it('sends a reset and opens the password-reset inbox', () => {
    const started = step(forgot(), { type: 'submitted' });
    expect(submitOf(started.next)).toEqual({ status: 'submitting' });
    expect(started.effect).toEqual({ run: 'sendReset', email: 'ada@example.com' });
    expect(reduce(started.next, { type: 'submitted' })).toBe(started.next);
    expect(reduce(started.next, {
      type: 'authSettled',
      result: { ok: true, pending: 'passwordReset' }
    })).toEqual({ kind: 'inbox', reason: 'passwordReset' });
    expect(reduce(started.next, {
      type: 'authSettled',
      result: { ok: false, failure: 'network' }
    })).toEqual({ ...forgot(), submit: { status: 'failed', failure: 'network' } });
  });

  it('clears a forgot failure on edit and returns to a blank sign-in form', () => {
    const failed = forgot({ status: 'failed', failure: 'network' });
    expect(reduce(failed, { type: 'edited', field: 'email', value: 'bea@example.com' })).toEqual({
      kind: 'forgot',
      email: 'bea@example.com',
      submit: editing
    });
    expect(reduce(forgot(), { type: 'navigated', to: 'signIn' })).toEqual({
      kind: 'signIn',
      email: '',
      password: '',
      submit: editing
    });
    const guest = forgot();
    expect(reduce(guest, { type: 'providerChosen', provider: 'google' })).toBe(guest);
    expect(canDismiss(forgot())).toBe(true);
  });

  it('lets the inbox return to sign in and ignores submit', () => {
    const inbox: AccountView = { kind: 'inbox', reason: 'confirmSignUp' };
    expect(reduce(inbox, { type: 'navigated', to: 'signIn' })).toEqual({
      kind: 'signIn',
      email: '',
      password: '',
      submit: editing
    });
    expect(reduce(inbox, { type: 'submitted' })).toBe(inbox);
    expect(reduce(inbox, { type: 'navigated', to: 'create' })).toBe(inbox);
    expect(canDismiss(inbox)).toBe(true);
  });
});

describe('recovery password', () => {
  it('shows a link failure on the sign-in form', () => {
    expect(reduce(signIn(), { type: 'linkFailed', failure: 'network' })).toEqual({
      kind: 'signIn',
      email: 'ada@example.com',
      password: 'secret',
      submit: { status: 'failed', failure: 'network' }
    });
  });

  it('enters setNewPassword only through the recovery link', () => {
    expect(reduce(signIn(), { type: 'recoveryLinkOpened' })).toEqual({
      kind: 'setNewPassword',
      password: '',
      submit: editing
    });
    expect(reduce(signedIn(), { type: 'recoveryLinkOpened' })).toEqual({
      kind: 'setNewPassword',
      password: '',
      submit: editing
    });
  });

  it('saves a new password and ignores navigation', () => {
    const view = setNewPassword();
    const started = step(view, { type: 'submitted' });
    expect(submitOf(started.next)).toEqual({ status: 'submitting' });
    expect(started.effect).toEqual({ run: 'updatePassword', password: 'newer-secret' });
    expect(reduce(started.next, { type: 'submitted' })).toBe(started.next);
    expect(reduce(started.next, {
      type: 'authSettled',
      result: { ok: true, identity: ada }
    })).toEqual({ kind: 'passwordSaved' });
    expect(reduce(started.next, {
      type: 'authSettled',
      result: { ok: true, pending: 'passwordReset' }
    })).toBe(started.next);
    expect(reduce(view, { type: 'navigated', to: 'signIn' })).toBe(view);
    expect(canDismiss(view)).toBe(false);
  });

  it('clears a failure on the next password edit', () => {
    const failed = setNewPassword({ status: 'failed', failure: 'weakPassword' });
    expect(reduce(failed, { type: 'edited', field: 'password', value: 'long-enough' })).toEqual({
      kind: 'setNewPassword',
      password: 'long-enough',
      submit: editing
    });
  });

  it('keeps passwordSaved on screen until the shell closes it', () => {
    const view: AccountView = { kind: 'passwordSaved' };
    expect(canDismiss(view)).toBe(false);
    expect(reduce(view, { type: 'submitted' })).toBe(view);
    expect(reduce(view, { type: 'navigated', to: 'signIn' })).toBe(view);
    expect(reduce(view, { type: 'opened', identity: ada })).toEqual(signedIn());
  });
});

describe('signed in, sign out, and delete', () => {
  it('starts sign-out once and then returns to the guest sign-in form', () => {
    const started = step(signedIn(), { type: 'signOutRequested' });
    expect(started.next).toEqual(signedIn(true));
    expect(started.effect).toEqual({ run: 'signOut' });
    expect(canDismiss(started.next)).toBe(false);
    expect(reduce(started.next, { type: 'signOutRequested' })).toBe(started.next);
    const idle = signedIn();
    expect(reduce(idle, { type: 'signedOut' })).toBe(idle);
    expect(step(started.next, { type: 'signedOut' })).toEqual({
      next: { kind: 'signIn', email: '', password: '', submit: editing },
      effect: null
    });
    expect(canDismiss(signedIn())).toBe(true);
  });

  it('opens delete confirm, and ignores delete while signing out', () => {
    expect(reduce(signedIn(), { type: 'deleteRequested' })).toEqual(confirmDelete());
    const signingOut = signedIn(true);
    expect(reduce(signingOut, { type: 'deleteRequested' })).toBe(signingOut);
    const idle = signedIn();
    expect(reduce(idle, { type: 'submitted' })).toBe(idle);
  });

  it('arms delete only when the typed text is DELETE', () => {
    expect(DELETE_WORD).toBe('DELETE');
    expect(isDeleteArmed({ phase: 'confirm', typed: 'DELETE' })).toBe(true);
    expect(isDeleteArmed({ phase: 'confirm', typed: 'delete' })).toBe(false);
    expect(isDeleteArmed({ phase: 'confirm', typed: 'DELETE ' })).toBe(false);
    expect(isDeleteArmed({ phase: 'deleting' })).toBe(false);

    const short = confirmDelete('delete');
    expect(reduce(short, { type: 'deleteConfirmed' })).toBe(short);
    const armed = step(confirmDelete('DELETE'), { type: 'deleteConfirmed' });
    expect(armed.next).toEqual(deleting());
    expect(armed.effect).toEqual({ run: 'deleteAccount' });
    expect(canDismiss(confirmDelete('DELETE'))).toBe(true);
  });

  it('edits the confirmation, clears a failure, and can go back', () => {
    const failed = confirmDelete('DEL', 'network');
    expect(reduce(failed, { type: 'edited', field: 'typed', value: 'DELETE' })).toEqual(
      confirmDelete('DELETE')
    );
    expect(reduce(failed, { type: 'edited', field: 'email', value: 'x' })).toBe(failed);
    expect(reduce(confirmDelete('DELETE'), { type: 'deleteCancelled' })).toEqual(signedIn());
  });

  it('locks the screen while deleting, then finishes or returns with a failure', () => {
    const view = deleting();
    expect(canDismiss(view)).toBe(false);
    expect(reduce(view, { type: 'edited', field: 'typed', value: 'DELETE' })).toBe(view);
    expect(reduce(view, { type: 'deleteCancelled' })).toBe(view);
    expect(reduce(view, { type: 'deleteConfirmed' })).toBe(view);

    const ok: DeleteResult = { ok: true };
    expect(step(view, { type: 'deleteSettled', result: ok })).toEqual({
      next: { kind: 'accountDeleted' },
      effect: null
    });
    expect(reduce(view, { type: 'deleteSettled', result: { ok: false, failure: 'network' } })).toEqual(
      confirmDelete('', 'network')
    );
    expect(reduce(view, { type: 'deleteSettled', result: { ok: false, failure: 'unknown' } })).toEqual(
      confirmDelete('', 'unknown')
    );
    expect(reduce(view, { type: 'deleteSettled', result: { ok: false, failure: 'notSignedIn' } })).toEqual({
      kind: 'signIn',
      email: '',
      password: '',
      submit: editing
    });
  });

  it('keeps deleting through a session clear, then finishes at account deleted', () => {
    const view = deleting();
    const stayed = reduce(view, { type: 'opened', identity: null });
    expect(stayed).toBe(view);
    expect(reduce(stayed, { type: 'deleteSettled', result: { ok: true } })).toEqual({
      kind: 'accountDeleted'
    });
  });

  it('keeps account deleted on screen until the shell closes it', () => {
    const view: AccountView = { kind: 'accountDeleted' };
    expect(canDismiss(view)).toBe(false);
    expect(reduce(view, { type: 'navigated', to: 'signIn' })).toBe(view);
    expect(reduce(view, { type: 'opened', identity: null })).toEqual({
      kind: 'signIn',
      email: '',
      password: '',
      submit: editing
    });
  });
});

describe('ignored events', () => {
  const cases: [string, AccountView, AccountEvent][] = [
    ['signIn', signIn(), { type: 'deleteConfirmed' }],
    ['create', create(), { type: 'signOutRequested' }],
    ['forgot', forgot(), { type: 'providerChosen', provider: 'google' }],
    ['inbox', { kind: 'inbox', reason: 'passwordReset' }, { type: 'submitted' }],
    ['setNewPassword', setNewPassword(), { type: 'navigated', to: 'create' }],
    ['passwordSaved', { kind: 'passwordSaved' }, { type: 'submitted' }],
    ['signedIn', signedIn(), { type: 'submitted' }],
    ['delete confirm', confirmDelete('DELETE'), { type: 'providerChosen', provider: 'google' }],
    ['deleting', deleting(), { type: 'edited', field: 'typed', value: 'DELETE' }],
    ['accountDeleted', { kind: 'accountDeleted' }, { type: 'navigated', to: 'signIn' }]
  ];

  it.each(cases)('ignores an illegal event on %s', (_name, view, event) => {
    expect(reduce(view, event)).toBe(view);
  });
});

describe('opened', () => {
  it('replaces the current view from the session', () => {
    expect(reduce(confirmDelete('DELETE'), { type: 'opened', identity: null }).kind).toBe('signIn');
    expect(reduce(signIn(), { type: 'opened', identity: ada })).toEqual(signedIn());
  });

  it('ignores opened while deleting or signing out', () => {
    const deletingView = deleting();
    const signingOut = signedIn(true);
    expect(reduce(deletingView, { type: 'opened', identity: null })).toBe(deletingView);
    expect(reduce(signingOut, { type: 'opened', identity: null })).toBe(signingOut);
  });

  it('ignores a recovery link while deleting or signing out', () => {
    const deletingView = deleting();
    const signingOut = signedIn(true);
    expect(reduce(deletingView, { type: 'recoveryLinkOpened' })).toBe(deletingView);
    expect(reduce(signingOut, { type: 'recoveryLinkOpened' })).toBe(signingOut);
  });
});
