import type { AccountEvent, AuthResult, DeleteResult, Effect, Identity } from './accountMachine'
import { firstOf, type AccountConnector } from './accountConnector'

type Dispatch = (event: AccountEvent) => void
const unknownAuth: AuthResult = { ok: false, failure: 'unknown' }
const unknownDelete: DeleteResult = { ok: false, failure: 'unknown' }
type AuthEffect = Exclude<Effect, { run: 'signOut' } | { run: 'deleteAccount' } | { run: 'checkUsername' } | { run: 'setUsername' }>
const CHECK_WAIT_MS = 400
let usernameCheck = 0

export async function runAccountEffect(effect: Effect, connector: AccountConnector, dispatch: Dispatch, timeoutMs = 15000) {
  if (effect.run === 'checkUsername') {
    const mine = ++usernameCheck
    await new Promise((resolve) => setTimeout(resolve, CHECK_WAIT_MS))
    if (mine !== usernameCheck) return
    const result = await connector.checkUsername(effect.value).catch(() => ({ status: 'error' as const }))
    if (mine !== usernameCheck) return
    dispatch({ type: 'usernameChecked', value: effect.value, result })
    return
  }
  if (effect.run === 'setUsername') {
    const result = await connector.setUsername(effect.name).catch(() => ({ ok: false as const, reason: 'network' as const }))
    dispatch({ type: 'usernameSettled', result })
    return
  }
  if (effect.run === 'signOut') {
    try { await connector.signOut() } catch { /* The learner still leaves this device. */ }
    dispatch({ type: 'signedOut' })
    return
  }
  if (effect.run === 'deleteAccount') {
    const work = connector.deleteAccount().catch(() => unknownDelete)
    const result = await firstOf(work, timeoutMs)
    dispatch({
      type: 'deleteSettled',
      result: result === 'timeout' ? { ok: false, failure: 'network' } : result
    })
    return
  }
  if (effect.run === 'signInWithProvider') {
    dispatch({ type: 'authSettled', result: await callAuth(effect, connector).catch(() => unknownAuth) })
    return
  }
  const mine = effect.run === 'signIn' || effect.run === 'signUp' ? connector.beginAttempt() : 0
  const work = callAuth(effect, connector).catch(() => unknownAuth)
  const result = await firstOf(work, timeoutMs)
  if (result === 'timeout') {
    dispatch({ type: 'authSettled', result: { ok: false, failure: 'network' } })
    if (mine) {
      void work.then((late) => {
        if (late.ok === true && 'identity' in late && connector.orphaned(mine)) {
          void connector.signOut().catch(() => undefined)
        }
      })
    }
    return
  }
  if (mine && result.ok === true && 'identity' in result) connector.noteSuccess(mine)
  dispatch({ type: 'authSettled', result })
}

export function openAccount(identity: Identity | null, dispatch: Dispatch) {
  dispatch({ type: 'opened', identity })
}

async function callAuth(effect: AuthEffect, connector: AccountConnector): Promise<AuthResult> {
  switch (effect.run) {
    case 'signIn': return connector.signIn(effect.email, effect.password)
    case 'signUp': return connector.signUp(effect.email, effect.password, effect.username)
    case 'signInWithProvider': return connector.signInWithProvider(effect.provider)
    case 'sendReset': return connector.sendReset(effect.email)
    case 'updatePassword': return connector.updatePassword(effect.password)
    default: {
      const unreachable: never = effect
      return unreachable
    }
  }
}
