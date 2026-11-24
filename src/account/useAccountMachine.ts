import { useCallback, useEffect, useRef, useState } from 'react'

import type { AccountConnector } from './accountConnector'
import { effectFor, initialView, reduce, type AccountEvent, type Identity } from './accountMachine'
import { runAccountEffect } from './runAccountEffects'

export function useAccountMachine(connector: AccountConnector, identity: Identity | null) {
  const [view, setView] = useState(() => initialView(identity))
  const alive = useRef(true)
  const dispatchRef = useRef<(event: AccountEvent) => void>(() => {})
  const dispatch = useCallback((event: AccountEvent) => {
    if (!alive.current) return
    setView((current) => {
      const next = reduce(current, event)
      const effect = effectFor(current, next)
      if (effect) void runAccountEffect(effect, connector, (settled) => dispatchRef.current(settled))
      return next
    })
  }, [connector])
  dispatchRef.current = dispatch
  useEffect(() => () => { alive.current = false }, [])
  return { view, dispatch }
}
