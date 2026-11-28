import { useCallback, useEffect, useRef, useState } from 'react'

import type { AccountConnector } from './accountConnector'
import { effectFor, initialView, reduce, type AccountEvent, type Identity } from './accountMachine'
import { runAccountEffect } from './runAccountEffects'

export function useAccountMachine(connector: AccountConnector, identity: Identity | null) {
  const [view, setView] = useState(() => initialView(identity))
  const viewRef = useRef(view)
  const alive = useRef(true)
  const dispatchRef = useRef<(event: AccountEvent) => void>(() => {})
  const dispatch = useCallback((event: AccountEvent) => {
    if (!alive.current) return
    const current = viewRef.current
    const next = reduce(current, event)
    const effect = effectFor(current, next)
    viewRef.current = next
    setView(next)
    if (effect) void runAccountEffect(effect, connector, (settled) => dispatchRef.current(settled))
  }, [connector])
  dispatchRef.current = dispatch
  useEffect(() => {
    connector.bind((event) => dispatchRef.current(event))
  }, [connector])
  useEffect(() => {
    alive.current = true
    return () => { alive.current = false }
  }, [])
  return { view, dispatch }
}
