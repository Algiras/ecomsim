import { useState, useCallback, useRef } from 'react'
import {
  narrate, stop, narrateInsight, narrateEvent, narratePolicy,
  preloadNarrator, isLoaded
} from '../services/narrator.js'

export function useNarrator() {
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const enabledRef = useRef(false)

  const enable = useCallback(async () => {
    setEnabled(true)
    enabledRef.current = true
    setLoading(true)
    preloadNarrator()

    // Poll until loaded
    const poll = setInterval(() => {
      if (isLoaded()) {
        setReady(true)
        setLoading(false)
        clearInterval(poll)
        narrate('Economy simulator narrator ready.')
      }
    }, 500)

    // Give up after 30s
    setTimeout(() => clearInterval(poll), 30000)
  }, [])

  const disable = useCallback(() => {
    setEnabled(false)
    enabledRef.current = false
    stop()
  }, [])

  const onInsight = useCallback((insightId) => {
    if (enabledRef.current) narrateInsight(insightId)
  }, [])

  const onEvent = useCallback((eventType) => {
    if (enabledRef.current) narrateEvent(eventType)
  }, [])

  const speak = useCallback((text) => {
    if (enabledRef.current) narrate(text)
  }, [])

  const onPolicy = useCallback((key, value) => {
    if (enabledRef.current) narratePolicy(key, value)
  }, [])

  return { enabled, loading, ready, enable, disable, onInsight, onEvent, speak, onPolicy }
}
