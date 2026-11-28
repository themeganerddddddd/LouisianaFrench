import { describe, expect, it } from '@jest/globals';

import {
  effectFor,
  reduce,
  usernameSaveBlocked,
  type AccountEvent,
  type AccountView,
  type Identity
} from '../accountMachine';

const named: Identity = { id: 'learner-1', email: 'ada@example.com', username: 'Elise', provider: 'email' };
const unnamed: Identity = { ...named, username: null };

function step(view: AccountView, event: AccountEvent) {
  const next = reduce(view, event);
  return { next, effect: effectFor(view, next) };
}

const open = reduce({ kind: 'signedIn', identity: named, signingOut: false }, { type: 'usernameEntryChosen' });

describe('change username', () => {
  it('opens change mode from Signed in with the current name as the draft', () => {
    expect(open).toEqual({
      kind: 'username', identity: named, draft: 'Elise', mode: 'change',
      availability: { status: 'unchecked' }, submit: { status: 'editing' }
    });
  });

  it('opens first mode with an empty draft when there is no username', () => {
    expect(reduce({ kind: 'signedIn', identity: unnamed, signingOut: false }, { type: 'usernameEntryChosen' })).toMatchObject({
      kind: 'username', identity: unnamed, draft: '', mode: 'first'
    });
  });

  it('ignores the entry while signing out and from other views', () => {
    const out: AccountView = { kind: 'signedIn', identity: named, signingOut: true };
    expect(reduce(out, { type: 'usernameEntryChosen' })).toBe(out);
    const inbox: AccountView = { kind: 'inbox', reason: 'passwordReset' };
    expect(reduce(inbox, { type: 'usernameEntryChosen' })).toBe(inbox);
  });

  it('blocks Save and the RPC for a byte-identical draft', () => {
    expect(usernameSaveBlocked(open)).toBe(true);
    expect(step(open, { type: 'usernameSaved' })).toEqual({ next: open, effect: null });
  });

  it('keeps Save enabled for a re-cased draft once it reads current, and calls the RPC', () => {
    const edited = step(open, { type: 'usernameEdited', value: 'élise' });
    expect(edited.effect).toEqual({ run: 'checkUsername', value: 'élise' });
    const current = reduce(edited.next, { type: 'usernameChecked', value: 'élise', result: { status: 'current' } });
    expect(usernameSaveBlocked(current)).toBe(false);
    expect(step(current, { type: 'usernameSaved' }).effect).toEqual({ run: 'setUsername', name: 'élise' });
  });

  it('cancels back to Signed in with the identity unchanged', () => {
    expect(reduce(open, { type: 'usernameSkipped' })).toEqual({ kind: 'signedIn', identity: named, signingOut: false });
  });

  it('returns to Signed in with the new name on success', () => {
    const saving: AccountView = { ...(open as Extract<AccountView, { kind: 'username' }>), draft: 'Céline', submit: { status: 'submitting' } };
    expect(reduce(saving, { type: 'usernameSettled', result: { ok: true, username: 'Céline' } })).toEqual({
      kind: 'signedIn', identity: { ...named, username: 'Céline' }, signingOut: false
    });
  });
});
