// Main-thread LLM narrator service — manages the llmWorker

import { buildEconomyContext } from './economyContext.js'

let worker = null
let status = 'idle' // idle | loading | ready | error
let progress = 0
let requestId = 0
const pending = new Map() // id → { resolve, reject }
let lastGenerateTime = 0
const DEBOUNCE_MS = 30_000 // max 1 generation per 30s

let onStatusChange = null

export function setOnStatusChange(cb) {
  onStatusChange = cb
}

export function initLLM() {
  if (worker) return
  if (status === 'loading' || status === 'ready') return

  try {
    worker = new Worker(
      new URL('../workers/llmWorker.js', import.meta.url),
      { type: 'module' }
    )

    worker.onmessage = (e) => {
      const msg = e.data

      if (msg.type === 'STATUS') {
        status = msg.status
        progress = msg.progress || 0
        onStatusChange?.({ status, progress })
      }

      if (msg.type === 'NARRATIVE') {
        const p = pending.get(msg.id)
        if (p) {
          pending.delete(msg.id)
          p.resolve(msg.text)
        }
      }

      if (msg.type === 'ERROR') {
        const p = pending.get(msg.id)
        if (p) {
          pending.delete(msg.id)
          p.resolve(null) // resolve with null, don't reject — graceful fallback
        }
      }
    }

    worker.onerror = () => {
      status = 'error'
      onStatusChange?.({ status, progress: 0 })
    }

    status = 'loading'
    onStatusChange?.({ status, progress: 0 })
    worker.postMessage({ type: 'INIT' })
  } catch (err) {
    console.warn('[LLM Narrator] Failed to create worker:', err)
    status = 'error'
    onStatusChange?.({ status, progress: 0 })
  }
}

export function generateNarrative(simState) {
  return new Promise((resolve) => {
    if (status !== 'ready' || !worker) {
      resolve(null)
      return
    }

    // Debounce
    const now = Date.now()
    if (now - lastGenerateTime < DEBOUNCE_MS) {
      resolve(null)
      return
    }
    lastGenerateTime = now

    const context = buildEconomyContext(simState)
    if (!context) {
      resolve(null)
      return
    }

    const id = ++requestId
    pending.set(id, { resolve })

    // Timeout after 15s
    setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id)
        resolve(null)
      }
    }, 15_000)

    worker.postMessage({ type: 'GENERATE', id, prompt: context })
  })
}

export function isReady() {
  return status === 'ready'
}

export function getProgress() {
  return progress
}

export function getLLMStatus() {
  return status
}

export function destroy() {
  if (worker) {
    worker.terminate()
    worker = null
  }
  status = 'idle'
  progress = 0
  pending.clear()
}
