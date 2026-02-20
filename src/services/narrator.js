// Kokoro TTS narrator — lazily loads 82M model in-browser via WASM
// Narrates insight pop-ups and economic events as they emerge

let tts = null
let loading = false
let loadCallbacks = []
let audioCtx = null

const VOICE = 'af_sky'  // warm female narrator voice
const MODEL_ID = 'onnx-community/Kokoro-82M-v1.0-ONNX'

// Short scripts for each insight/event — voiced when triggered
export const NARRATION_SCRIPTS = {
  // Insights
  monopoly_forming:
    "Warning. One company now dominates the market. Without competition, prices are rising and innovation is slowing.",
  high_inequality:
    "Inequality has reached extreme levels. The Gini coefficient indicates the top few now own most of the wealth.",
  high_unemployment:
    "Mass unemployment is spreading. A vicious cycle: fewer workers means less spending, which means even more layoffs.",
  inflation_spiral:
    "Inflation warning. Prices are rising faster than wages. Your population's purchasing power is eroding.",
  min_wage_tradeoff:
    "Minimum wage tradeoff observed. Living standards improved, but some small businesses can no longer afford to hire.",
  budget_surplus:
    "Fiscal surplus achieved. Tax revenue now exceeds government spending.",
  stagnation:
    "Stagflation risk. The economy is shrinking while unemployment rises — the classic policy dilemma.",
  poverty_trap:
    "Poverty trap forming. Workers in poverty cannot afford education or healthcare, keeping them trapped.",
  ubi_effect:
    "Universal Basic Income is reducing poverty. Some residents are using the security to start new businesses.",

  // Events
  pandemic:
    "A pandemic has struck. Health is dropping, businesses are closing, and workers are staying home.",
  cropFailure:
    "Crop failure. Poor harvests are causing food prices to spike. The poorest citizens are suffering most.",
  techBreakthrough:
    "Technology breakthrough! Productivity in the tech sector has doubled — but automation is threatening other jobs.",
  financialBubble:
    "A financial bubble is growing. Asset prices are inflating rapidly — and history suggests what comes next.",
  corruption:
    "Corruption scandal. Government tax revenue is being diverted. Public services are beginning to collapse.",
  immigrationWave:
    "An immigration wave has arrived. Skilled workers are boosting productivity, but job competition is increasing.",
  recession:
    "Recession begins. Consumer demand is falling, businesses are struggling, and unemployment is rising.",
  boom:
    "Economic boom! Consumer confidence has surged. Businesses are hiring and wages are growing."
}

async function ensureLoaded() {
  if (tts) return tts
  if (loading) {
    return new Promise((resolve) => loadCallbacks.push(resolve))
  }

  loading = true
  try {
    const { KokoroTTS } = await import('kokoro-js')
    tts = await KokoroTTS.from_pretrained(MODEL_ID, {
      dtype: 'q4',      // ~40MB — good balance of quality and size
      device: 'wasm'
    })
    loadCallbacks.forEach(cb => cb(tts))
    loadCallbacks = []
    loading = false
    return tts
  } catch (err) {
    console.warn('[Narrator] Failed to load Kokoro TTS:', err)
    loading = false
    return null
  }
}

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  }
  return audioCtx
}

let currentSource = null

export async function narrate(text, options = {}) {
  if (!text) return

  // Stop any currently playing narration
  stop()

  try {
    const model = await ensureLoaded()
    if (!model) return

    const audio = await model.generate(text, { voice: options.voice || VOICE })

    // audio.audio is Float32Array of PCM samples
    const ctx = getAudioContext()
    const buffer = ctx.createBuffer(1, audio.audio.length, audio.sampling_rate)
    buffer.copyToChannel(audio.audio, 0)

    const source = ctx.createBufferSource()
    source.buffer = buffer

    // Optional: slight pitch/speed adjustment
    if (options.rate) source.playbackRate.value = options.rate

    source.connect(ctx.destination)
    source.start()
    currentSource = source

    return new Promise((resolve) => {
      source.onended = () => {
        currentSource = null
        resolve()
      }
    })
  } catch (err) {
    console.warn('[Narrator] Narration error:', err)
  }
}

export function stop() {
  if (currentSource) {
    try { currentSource.stop() } catch {}
    currentSource = null
  }
}

export function narrateInsight(insightId) {
  const script = NARRATION_SCRIPTS[insightId]
  if (script) narrate(script)
}

export function narrateEvent(eventType) {
  const script = NARRATION_SCRIPTS[eventType]
  if (script) narrate(script)
}

// Preload model in background (call after first user interaction)
export function preloadNarrator() {
  ensureLoaded()
}

export function isLoaded() {
  return tts !== null
}
