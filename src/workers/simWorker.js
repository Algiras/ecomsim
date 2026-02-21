// Web Worker: runs simulation, sends state snapshots to main thread
import { SimEngine } from '../simulation/engine.js'
import { getScenario } from '../data/scenarios.js'

let engine = null
let running = false
let speed = 1  // default: leisurely pace
let animFrameId = null
let tickAccumulator = 0

// Maps speed multiplier to sim ticks per second (60fps frame rate)
// 1x = leisurely (1 year ≈ 5s), 2x = normal, 5x = fast, 10x = stress test
const TICKS_PER_SECOND = { 1: 10, 2: 30, 5: 150, 10: 600 }

function init(scenarioId = 'freeMarket', scenarioOverride = null) {
  const scenario = scenarioOverride || getScenario(scenarioId)
  engine = new SimEngine(scenario)
  running = true
  tickAccumulator = 0
}

function loop(timestamp) {
  if (!running || !engine) return

  try {
    const tps = TICKS_PER_SECOND[speed] || speed * 30
    tickAccumulator += tps / 60
    const ticksThisFrame = Math.floor(tickAccumulator)
    tickAccumulator -= ticksThisFrame

    let event = null
    let insight = null
    let scenarioComplete = null

    for (let i = 0; i < ticksThisFrame; i++) {
      const result = engine.step()
      if (result.event) event = result.event
      if (result.insight) insight = result.insight
      if (result.scenarioComplete) scenarioComplete = result.scenarioComplete
      // Pause on choice events so player can decide without time pressure
      if (event?.requiresChoice) break
    }

    // Send state snapshot
    const snapshot = engine.getSnapshot()
    self.postMessage({ type: 'STATE_UPDATE', state: snapshot })

    if (event) {
      self.postMessage({ type: 'EVENT', event })
      if (event.requiresChoice) {
        running = false
        self.postMessage({ type: 'CHOICE_REQUIRED', event: snapshot.pendingChoice })
      }
    }
    if (insight) {
      self.postMessage({ type: 'INSIGHT', insight })
    }
    if (scenarioComplete) {
      running = false
      self.postMessage({ type: 'SCENARIO_COMPLETE', report: scenarioComplete })
    }
  } catch (err) {
    console.error('[simWorker] loop error:', err)
  }

  animFrameId = setTimeout(loop, 1000 / 60) // ~60fps
}

// Handle messages from main thread
self.addEventListener('message', (e) => {
  const msg = e.data

  switch (msg.type) {
    case 'INIT':
      init(msg.scenarioId || 'freeMarket', msg.scenarioConfig || null)
      loop()
      break

    case 'SET_POLICY':
      if (engine) engine.applyMessage(msg)
      break

    case 'SET_SPEED':
      speed = msg.speed
      break

    case 'PAUSE':
      running = false
      if (animFrameId) { clearTimeout(animFrameId); animFrameId = null }
      break

    case 'RESUME':
      if (!running) {
        running = true
        loop()
      }
      break

    case 'RESET':
      running = false
      if (animFrameId) { clearTimeout(animFrameId); animFrameId = null }
      init(msg.scenarioId || 'freeMarket', msg.scenarioConfig || null)
      loop()
      break

    case 'RESOLVE_CHOICE':
      if (engine) {
        engine.applyMessage(msg)
        // Sim is already running — choice is applied immediately
        if (!running) { running = true; loop() }
      }
      break

    case 'FORCE_SHOCK':
      if (engine) engine.applyMessage(msg)
      break

    case 'GET_SNAPSHOT':
      if (engine) {
        self.postMessage({ type: 'STATE_UPDATE', state: engine.getSnapshot() })
      }
      break
  }
})
