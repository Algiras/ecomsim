import { useState, useCallback, useRef, useEffect } from 'react'
import {
  narrate, stop, narrateInsight, narrateEvent, narratePolicy,
  preloadNarrator, isLoaded, getAnalyserNode, isSpeaking,
  onSpeakStart, onSpeakEnd
} from '../services/narrator.js'
import {
  initLLM, generateNarrative, isReady as isLLMReady,
  getProgress, getLLMStatus, setOnStatusChange, destroy as destroyLLM
} from '../services/llmNarrator.js'
import { NARRATION_SCRIPTS } from '../services/narrator.js'

export function useNarrator() {
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const enabledRef = useRef(false)

  // LLM state
  const [llmStatus, setLlmStatus] = useState('idle') // idle | loading | ready | error
  const [llmProgress, setLlmProgress] = useState(0)
  const [speaking, setSpeaking] = useState(false)

  // Wire speaking callbacks
  useEffect(() => {
    onSpeakStart(() => setSpeaking(true))
    onSpeakEnd(() => setSpeaking(false))
    return () => {
      onSpeakStart(null)
      onSpeakEnd(null)
    }
  }, [])

  // Wire LLM status updates
  useEffect(() => {
    setOnStatusChange(({ status, progress }) => {
      setLlmStatus(status)
      setLlmProgress(progress)
    })
    return () => setOnStatusChange(null)
  }, [])

  const enable = useCallback(async () => {
    setEnabled(true)
    enabledRef.current = true
    setLoading(true)
    preloadNarrator()

    // Also start LLM loading
    initLLM()

    // Poll until TTS loaded
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

  // Generate AI narrative and speak it; falls back to pre-written scripts
  const generateAndSpeak = useCallback(async (simState, fallbackKey) => {
    if (!enabledRef.current) return

    // Try LLM first
    if (isLLMReady()) {
      const text = await generateNarrative(simState)
      if (text && text.length > 10 && text.length < 500) {
        narrate(text)
        return
      }
    }

    // Fallback to pre-written script
    if (fallbackKey && NARRATION_SCRIPTS[fallbackKey]) {
      narrate(NARRATION_SCRIPTS[fallbackKey])
    }
  }, [])

  // Derived narrator state for the orb
  const narratorState = !enabled ? 'disabled'
    : speaking ? 'speaking'
    : (llmStatus === 'loading' || loading) ? 'loading'
    : 'idle'

  return {
    enabled, loading, ready, enable, disable,
    onInsight, onEvent, speak, onPolicy,
    generateAndSpeak,
    narratorState,
    llmStatus,
    llmProgress,
    llmReady: llmStatus === 'ready',
    speaking,
    analyserNode: getAnalyserNode()
  }
}
