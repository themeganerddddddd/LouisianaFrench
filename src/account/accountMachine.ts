import type { SetUsernameResult } from '../identity/username';
import { isValidUsernameFormat } from './usernameFormat';

export type Provider = 'email' | 'google';
export type Identity = { id: string; email: string; username: string | null; provider: Provider };
export type FieldName = 'username' | 'email' | 'password';
export type AuthFailure =
  | 'wrongCredentials' | 'emailTaken' | 'emailNotConfirmed' | 'weakPassword' | 'rateLimited'
  | 'network' | 'unavailable' | 'unknown' | 'oauthCancelled' | 'oauthFailed';
export type SubmitFailure = Exclude<AuthFailure, 'oauthCancelled'> | 'invalidUsername';
export type Submit =
  | { status: 'editing' }
  | { status: 'submitting' }
  | { status: 'oauth'; provider: 'google' }
  | { status: 'failed'; failure: SubmitFailure };
export type Deletion =
  | { phase: 'confirm'; typed: string; failure?: 'network' | 'unknown' }
  | { phase: 'deleting' };
export type UsernameReply = 'available' | 'current' | 'taken' | 'invalid' | 'reserved' | 'error';
export type UsernameAvailability =
  | { status: 'unchecked' }
  | { status: 'checking'; value: string }
  | { status: 'settled'; value: string; reply: UsernameReply };
export type UsernameSubmit =
  | { status: 'editing' }
  | { status: 'submitting' }
  | { status: 'failed'; failure: 'taken' | 'reserved' | 'invalid' | 'network' | 'too_soon'; retryAt?: string };
export type AccountView =
  | { kind: 'signIn'; email: string; password: string; submit: Submit }
  | { kind: 'create'; username: string; email: string; password: string; submit: Submit }
  | { kind: 'forgot'; email: string; submit: Submit }
  | { kind: 'inbox'; reason: 'passwordReset' | 'confirmSignUp' }
  | { kind: 'setNewPassword'; password: string; submit: Submit }
  | { kind: 'passwordSaved' }
  | { kind: 'username'; identity: Identity; draft: string; availability: UsernameAvailability; submit: UsernameSubmit; mode: 'first' | 'change' }
  | { kind: 'signedIn'; identity: Identity; signingOut: boolean }
  | { kind: 'deleteAccount'; identity: Identity; deletion: Deletion }
  | { kind: 'accountDeleted' };
export type AuthResult =
  | { ok: true; identity: Identity; profileRead?: boolean }
  | { ok: true; pending: 'confirmSignUp' | 'passwordReset' }
  | { ok: false; failure: AuthFailure };
export type DeleteResult = { ok: true } | { ok: false; failure: 'network' | 'notSignedIn' | 'unknown' };
export type AccountEvent =
  | { type: 'opened'; identity: Identity | null }
  | { type: 'recoveryLinkOpened' }
  | { type: 'linkFailed'; failure: SubmitFailure }
  | { type: 'navigated'; to: 'signIn' | 'create' | 'forgot' }
  | { type: 'edited'; field: FieldName | 'typed'; value: string }
  | { type: 'submitted' }
  | { type: 'providerChosen'; provider: 'google' }
  | { type: 'authSettled'; result: AuthResult }
  | { type: 'usernameEdited'; value: string }
  | { type: 'usernameChecked'; value: string; result: { status: UsernameReply } }
  | { type: 'usernameSaved' }
  | { type: 'usernameSkipped' }
  | { type: 'usernameSettled'; result: SetUsernameResult }
  | { type: 'signOutRequested' } | { type: 'signedOut' }
  | { type: 'deleteRequested' } | { type: 'deleteCancelled' }
  | { type: 'deleteConfirmed' }
  | { type: 'deleteSettled'; result: DeleteResult };
export type Effect =
  | { run: 'signIn'; email: string; password: string }
  | { run: 'signUp'; email: string; password: string; username: string | null }
  | { run: 'signInWithProvider'; provider: 'google' }
  | { run: 'sendReset'; email: string }
  | { run: 'updatePassword'; password: string }
  | { run: 'signOut' }
  | { run: 'deleteAccount' }
  | { run: 'checkUsername'; value: string }
  | { run: 'setUsername'; name: string };

export const DELETE_WORD = 'DELETE';
const EDITING: Submit = { status: 'editing' };
type FormView = Extract<AccountView, { kind: 'signIn' | 'create' | 'forgot' | 'setNewPassword' }>;
type SignedInView = Extract<AccountView, { kind: 'signedIn' }>;
type DeleteView = Extract<AccountView, { kind: 'deleteAccount' }>;
type UsernameView = Extract<AccountView, { kind: 'username' }>;

export function initialView(identity: Identity | null): AccountView {
  if (identity) return { kind: 'signedIn', identity, signingOut: false };
  return { kind: 'signIn', email: '', password: '', submit: EDITING };
}

export function isDeleteArmed(deletion: Deletion): boolean {
  return deletion.phase === 'confirm' && deletion.typed === DELETE_WORD;
}

export function canDismiss(view: AccountView): boolean {
  switch (view.kind) {
    case 'signedIn': return !view.signingOut;
    case 'deleteAccount': return view.deletion.phase === 'confirm';
    case 'signIn':
    case 'create':
    case 'forgot': return !formBusy(view.submit);
    case 'username': return view.submit.status !== 'submitting';
    case 'inbox': return true;
    case 'setNewPassword':
    case 'passwordSaved':
    case 'accountDeleted': return false;
    default: { const unreachable: never = view; return unreachable; }
  }
}

export function reduce(view: AccountView, event: AccountEvent): AccountView {
  if (sessionLocked(view) && (event.type === 'opened' || event.type === 'recoveryLinkOpened' || event.type === 'linkFailed')) {
    return view;
  }
  if (event.type === 'opened') {
    if (formStatus(view) === 'submitting' || formStatus(view) === 'oauth') return view;
    if (view.kind === 'username' && view.submit.status === 'submitting') return view;
    return initialView(event.identity);
  }
  if (event.type === 'recoveryLinkOpened') return { kind: 'setNewPassword', password: '', submit: EDITING };
  if (event.type === 'linkFailed') return applyLinkFailure(view, event.failure);
  switch (view.kind) {
    case 'signIn':
    case 'create':
    case 'forgot':
    case 'setNewPassword':
      return reduceForm(view, event);
    case 'username':
      return reduceUsername(view, event);
    case 'inbox':
    case 'passwordSaved':
    case 'accountDeleted':
      return event.type === 'navigated' ? navigate(view, event.to) : view;
    case 'signedIn':
      return reduceSignedIn(view, event);
    case 'deleteAccount':
      return reduceDelete(view, event);
    default: { const unreachable: never = view; return unreachable; }
  }
}

export function effectFor(prev: AccountView, next: AccountView): Effect | null {
  if (entered(prev, next, 'submitting')) {
    if (next.kind === 'signIn') return { run: 'signIn', email: next.email, password: next.password };
    if (next.kind === 'create') {
      return { run: 'signUp', email: next.email, password: next.password, username: next.username === '' ? null : next.username };
    }
    if (next.kind === 'forgot') return { run: 'sendReset', email: next.email };
    if (next.kind === 'setNewPassword') return { run: 'updatePassword', password: next.password };
  }
  if (entered(prev, next, 'oauth') && (next.kind === 'signIn' || next.kind === 'create')) {
    return { run: 'signInWithProvider', provider: 'google' };
  }
  if (next.kind === 'signedIn' && next.signingOut && !(prev.kind === 'signedIn' && prev.signingOut)) {
    return { run: 'signOut' };
  }
  if (next.kind === 'deleteAccount' && next.deletion.phase === 'deleting' && !(prev.kind === 'deleteAccount' && prev.deletion.phase === 'deleting')) {
    return { run: 'deleteAccount' };
  }
  const check = checking(next);
  if (check && check !== checking(prev)) return { run: 'checkUsername', value: check };
  if (next.kind === 'username' && next.submit.status === 'submitting' && !(prev.kind === 'username' && prev.submit.status === 'submitting')) {
    return { run: 'setUsername', name: next.draft };
  }
  return null;
}

function reduceForm(view: FormView, event: AccountEvent): AccountView {
  if (event.type === 'edited') return editForm(view, event.field, event.value);
  if (event.type === 'submitted') return submitForm(view);
  if (event.type === 'providerChosen') {
    if (view.kind !== 'signIn' && view.kind !== 'create') return view;
    if (formBusy(view.submit)) return view;
    return { ...view, submit: { status: 'oauth', provider: 'google' } };
  }
  if (event.type === 'authSettled') return applyAuth(view, event.result);
  if (event.type === 'navigated') return formBusy(view.submit) ? view : navigate(view, event.to);
  return view;
}

function reduceSignedIn(view: SignedInView, event: AccountEvent): AccountView {
  if (event.type === 'signOutRequested') return view.signingOut ? view : { ...view, signingOut: true };
  if (event.type === 'signedOut') return view.signingOut ? initialView(null) : view;
  if (event.type === 'deleteRequested') {
    if (view.signingOut) return view;
    return { kind: 'deleteAccount', identity: view.identity, deletion: { phase: 'confirm', typed: '' } };
  }
  return view;
}

function reduceDelete(view: DeleteView, event: AccountEvent): AccountView {
  if (view.deletion.phase === 'deleting') {
    if (event.type !== 'deleteSettled') return view;
    if (event.result.ok) return { kind: 'accountDeleted' };
    if (event.result.failure === 'notSignedIn') return initialView(null);
    return {
      kind: 'deleteAccount', identity: view.identity,
      deletion: { phase: 'confirm', typed: '', failure: event.result.failure }
    };
  }
  if (event.type === 'edited') {
    if (event.field !== 'typed') return view;
    return { ...view, deletion: { phase: 'confirm', typed: event.value } };
  }
  if (event.type === 'deleteCancelled') return { kind: 'signedIn', identity: view.identity, signingOut: false };
  if (event.type === 'deleteConfirmed') {
    if (!isDeleteArmed(view.deletion)) return view;
    return { ...view, deletion: { phase: 'deleting' } };
  }
  return view;
}

function editForm(view: FormView, field: FieldName | 'typed', value: string): AccountView {
  if (field === 'typed' || formBusy(view.submit)) return view;
  const submit = view.submit.status === 'failed' ? EDITING : view.submit;
  if (view.kind === 'signIn' && field === 'email') return { ...view, email: value, submit };
  if (view.kind === 'signIn' && field === 'password') return { ...view, password: value, submit };
  if (view.kind === 'create' && field === 'username') return { ...view, username: value, submit };
  if (view.kind === 'create' && field === 'email') return { ...view, email: value, submit };
  if (view.kind === 'create' && field === 'password') return { ...view, password: value, submit };
  if (view.kind === 'forgot' && field === 'email') return { ...view, email: value, submit };
  if (view.kind === 'setNewPassword' && field === 'password') return { ...view, password: value, submit };
  return view;
}

function submitForm(view: FormView): AccountView {
  if (formBusy(view.submit)) return view;
  if (view.kind === 'create' && view.username !== '' && !isValidUsernameFormat(view.username)) {
    if (view.submit.status === 'failed' && view.submit.failure === 'invalidUsername') return view;
    return { ...view, submit: { status: 'failed', failure: 'invalidUsername' } };
  }
  return { ...view, submit: { status: 'submitting' } };
}

function applyLinkFailure(view: AccountView, failure: SubmitFailure): AccountView {
  if (view.kind !== 'signIn' && view.kind !== 'create' && view.kind !== 'forgot' && view.kind !== 'setNewPassword') {
    return view;
  }
  if (formBusy(view.submit)) return view;
  return { ...view, submit: { status: 'failed', failure } };
}

function applyAuth(view: FormView, result: AuthResult): AccountView {
  if (!formBusy(view.submit)) return view;
  if (!result.ok) {
    if (result.failure === 'oauthCancelled') return { ...view, submit: EDITING };
    if (result.failure === 'wrongCredentials' && view.kind === 'signIn') {
      return { ...view, password: '', submit: { status: 'failed', failure: 'wrongCredentials' } };
    }
    return { ...view, submit: { status: 'failed', failure: result.failure } };
  }
  if ('identity' in result) {
    if (view.kind === 'setNewPassword') return { kind: 'passwordSaved' };
    if (view.kind === 'signIn' || view.kind === 'create') {
      if (result.identity.username === null && result.profileRead === true) return openUsername(result.identity);
      return { kind: 'signedIn', identity: result.identity, signingOut: false };
    }
    return view;
  }
  if (view.kind === 'create' && result.pending === 'confirmSignUp') {
    return { kind: 'inbox', reason: 'confirmSignUp' };
  }
  if (view.kind === 'forgot' && result.pending === 'passwordReset') {
    return { kind: 'inbox', reason: 'passwordReset' };
  }
  return view;
}

function navigate(view: AccountView, to: 'signIn' | 'create' | 'forgot'): AccountView {
  if (view.kind === 'signIn' && to !== 'signIn') return blank(to);
  if ((view.kind === 'create' || view.kind === 'forgot' || view.kind === 'inbox') && to === 'signIn') return blank('signIn');
  return view;
}

function blank(to: 'signIn' | 'create' | 'forgot'): AccountView {
  if (to === 'create') return { kind: 'create', username: '', email: '', password: '', submit: EDITING };
  if (to === 'forgot') return { kind: 'forgot', email: '', submit: EDITING };
  return { kind: 'signIn', email: '', password: '', submit: EDITING };
}

function openUsername(identity: Identity): UsernameView {
  return {
    kind: 'username', identity, draft: '', mode: 'first',
    availability: { status: 'unchecked' }, submit: { status: 'editing' }
  };
}

function reduceUsername(view: UsernameView, event: AccountEvent): AccountView {
  if (event.type === 'usernameChecked') {
    if (event.value !== view.draft) return view;
    return { ...view, availability: { status: 'settled', value: event.value, reply: event.result.status } };
  }
  if (view.submit.status === 'submitting') {
    return event.type === 'usernameSettled' ? settleUsername(view, event.result) : view;
  }
  if (event.type === 'usernameEdited') return editUsername(view, event.value);
  if (event.type === 'usernameSaved') {
    return saveBlocked(view) ? view : { ...view, submit: { status: 'submitting' } };
  }
  if (event.type === 'usernameSkipped') {
    return { kind: 'signedIn', identity: { ...view.identity, username: null }, signingOut: false };
  }
  return view;
}

function editUsername(view: UsernameView, value: string): UsernameView {
  const submit: UsernameSubmit = { status: 'editing' };
  if (!isValidUsernameFormat(value)) return { ...view, draft: value, submit, availability: { status: 'unchecked' } };
  return { ...view, draft: value, submit, availability: { status: 'checking', value } };
}

function saveBlocked(view: UsernameView): boolean {
  if (!isValidUsernameFormat(view.draft)) return true;
  const found = view.availability;
  if (found.status !== 'settled' || found.value !== view.draft) return false;
  return found.reply === 'taken' || found.reply === 'reserved' || found.reply === 'invalid';
}

function settleUsername(view: UsernameView, result: SetUsernameResult): AccountView {
  if (result.ok) return { kind: 'signedIn', identity: { ...view.identity, username: result.username }, signingOut: false };
  if (result.reason === 'taken' || result.reason === 'reserved' || result.reason === 'invalid') {
    return {
      ...view,
      submit: { status: 'failed', failure: result.reason },
      availability: { status: 'settled', value: view.draft, reply: result.reason }
    };
  }
  if (result.reason === 'too_soon') return stopChecking(view, { status: 'failed', failure: 'too_soon', retryAt: result.retryAt });
  return stopChecking(view, { status: 'failed', failure: 'network' });
}

function stopChecking(view: UsernameView, submit: UsernameSubmit): UsernameView {
  if (view.availability.status !== 'checking') return { ...view, submit };
  return { ...view, submit, availability: { status: 'settled', value: view.draft, reply: 'error' } };
}

function checking(view: AccountView): string | null {
  return view.kind === 'username' && view.availability.status === 'checking' ? view.availability.value : null;
}

function formBusy(submit: Submit): boolean {
  return submit.status === 'submitting' || submit.status === 'oauth';
}

function sessionLocked(view: AccountView): boolean {
  return (view.kind === 'signedIn' && view.signingOut) || (view.kind === 'deleteAccount' && view.deletion.phase === 'deleting');
}

function formStatus(view: AccountView): Submit['status'] | null {
  return view.kind === 'signIn' || view.kind === 'create' || view.kind === 'forgot' || view.kind === 'setNewPassword'
    ? view.submit.status
    : null;
}

function entered(prev: AccountView, next: AccountView, status: 'submitting' | 'oauth'): boolean {
  return formStatus(next) === status && (formStatus(prev) !== status || prev.kind !== next.kind);
}
