// Web Worker: runs simulation, sends state snapshots to main thread
import { SimEngine } from '../simulation/engine.js'
import { getScenario } from '../data/scenarios.js'

let engine = null
let running = false
let speed = 1
let animFrameId = null
let lastTick = 0

function init(scenarioId = 'freeMarket') {
  const scenario = getScenario(scenarioId)
  engine = new SimEngine(scenario)
  running = true
}

function loop(timestamp) {
  if (!running || !engine) return

  const ticksPerFrame = speed
  let event = null
  let insight = null

  for (let i = 0; i < ticksPerFrame; i++) {
    const result = engine.step()
    if (result.event) event = result.event
    if (result.insight) insight = result.insight
  }

  // Send state snapshot
  const snapshot = engine.getSnapshot()
  self.postMessage({ type: 'STATE_UPDATE', state: snapshot })

  if (event) {
    self.postMessage({ type: 'EVENT', event })
  }
  if (insight) {
    self.postMessage({ type: 'INSIGHT', insight })
  }

  animFrameId = setTimeout(loop, 1000 / 60) // ~60fps
}

// Handle messages from main thread
self.addEventListener('message', (e) => {
  const msg = e.data

  switch (msg.type) {
    case 'INIT':
      init(msg.scenarioId || 'freeMarket')
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
      init(msg.scenarioId || 'freeMarket')
      loop()
      break

    case 'GET_SNAPSHOT':
      if (engine) {
        self.postMessage({ type: 'STATE_UPDATE', state: engine.getSnapshot() })
      }
      break
  }
})
