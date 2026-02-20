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

  // Weird Law activations
  policy_fourDayWeek_on:
    "The four-day work week is now law. Workers rejoice. Friday afternoons are sacred. Economists nervously check productivity spreadsheets.",
  policy_fourDayWeek_off:
    "The four-day work week has been repealed. Monday through Friday, back to the grind.",
  policy_robotTax_on:
    "A robot tax has been introduced. For every job automated away, the tech sector must pay. Silicon Valley is not pleased.",
  policy_breadAndCircuses_on:
    "Bread and circuses for all! The government is handing out free food and entertainment. Unrest is falling. Economists are horrified.",
  policy_breadAndCircuses_off:
    "The bread and circuses program has ended. Let's see how long the calm lasts.",
  policy_mandatoryProfitShare_on:
    "Mandatory profit sharing is now law. Businesses must distribute a cut of profits to every worker. Workers approve. Shareholders do not.",
  policy_mandatoryProfitShare_off:
    "Mandatory profit sharing repealed. The windfall stays with the owners again.",
  policy_landValueTax_on:
    "A land value tax has been enacted. Henry George would be proud. Landowners are furious. Economists say this is actually the most efficient tax possible.",
  policy_banAdvertising_on:
    "Advertising is banned. No more billboards, no more commercials, no more targeted manipulation. The luxury sector is experiencing an identity crisis.",
  policy_banAdvertising_off:
    "The advertising ban is lifted. The bombardment of commercial messages resumes immediately.",
  policy_debtJubilee_on:
    "DEBT JUBILEE! All debts are cancelled — right now, this instant. It is a Biblical reset. The slate is wiped clean. This happens only once.",
  policy_lotteryRedistribution_on:
    "The wealth lottery is running. Random rich citizens are paying a luck tax directly to random poor ones. It's chaotic. It's arbitrary. It's weirdly effective.",
  policy_lotteryRedistribution_off:
    "The wealth lottery has ended. The rich breathe a sigh of relief.",
  policy_sumptuary_on:
    "Sumptuary laws are in effect. The wealthy may no longer spend freely on luxury goods. Medieval rulers used this to maintain social order. It also destroyed the luxury economy.",
  policy_sumptuary_off:
    "Sumptuary laws repealed. The luxury market roars back to life.",
  policy_degrowth_on:
    "Degrowth policy enacted. The government has officially stopped chasing GDP growth. Economists are having a meltdown. Everyone else is working less and feeling healthier.",
  policy_degrowth_off:
    "Degrowth policy abandoned. Back to the infinite growth imperative.",
  policy_algoCentralPlanning_on:
    "Algorithmic central planning is online. An AI now sets all prices. The market volatility disappears. So does the spontaneous order. It is efficient. It is cold. It is watching.",
  policy_algoCentralPlanning_off:
    "The algorithm has been shut down. Prices will now rediscover chaos on their own.",
  policy_universalBankAccount_on:
    "Universal bank accounts issued to every citizen. No one is unbanked. The poorest residents finally have somewhere safe to store their savings.",
  policy_universalBankAccount_off:
    "Universal bank accounts discontinued. Financial exclusion returns for the poorest citizens.",

  // Chaos lever activations
  policy_helicopterMoney_on:
    "Helicopter money is airborne. Cash is literally raining from the sky. Every citizen is richer — briefly. Inflation is watching from below, grinning.",
  policy_helicopterMoney_off:
    "The helicopter has landed. The free money spigot is closed. Prices remain elevated.",
  policy_maximumWage_on:
    "A maximum wage is now law. No one earns above the cap. Executives are furious. Economists are concerned about brain drain. The people are delighted.",
  policy_maximumWage_off:
    "Maximum wage repealed. Compensation limits removed. The talent exodus risk is over.",
  policy_wealthConfiscation_on:
    "Wealth confiscation is in effect. Government agents are seizing assets above the threshold. The rich are moving money offshore as fast as they can.",
  policy_wealthConfiscation_off:
    "Wealth confiscation has ended. Assets are safe again — for now.",
  policy_nationalizeIndustries_on:
    "All industries are now nationalized. The government owns the means of production. Five-year plans are being drafted. Entrepreneurs are unemployed. Productivity is in freefall.",
  policy_nationalizeIndustries_off:
    "Privatization has begun. Industries are returning to private hands. Markets are chaotic but slowly returning to life.",
  policy_punitiveTargiffs_on:
    "Punitive tariffs are in place. All goods are now more expensive. This is to protect the economy, apparently. Consumers are paying the price — literally.",
  policy_punitiveTargiffs_off:
    "Tariffs removed. Trade barriers down. Prices begin to normalize.",
  policy_guaranteedJobs_on:
    "A guaranteed jobs program is active. Every unemployed citizen now works for the government. Unemployment is officially zero. The budget is officially catastrophic.",
  policy_guaranteedJobs_off:
    "Guaranteed jobs program ended. Government workers are being released back to the private market.",

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
    "Economic boom! Consumer confidence has surged. Businesses are hiring and wages are growing.",
  hyperinflation:
    "Hyperinflation. Prices are doubling faster than wages can keep up. The currency is becoming worthless. Wheelbarrows of cash are not yet required — but give it time.",
  generalStrike:
    "General strike! Workers across every sector have walked off the job. Production has stopped. The economy is frozen. History will judge what you do next.",
  bankRun:
    "Bank run! Panic is spreading. Citizens are lining up to withdraw everything. The financial system has hours before it collapses. Decide fast.",
  brainDrain:
    "Brain drain underway. Your most skilled citizens are packing their bags. Once expertise leaves, it rarely comes back. The productivity gap will compound for decades."
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

// Called when a policy toggle changes — narrates the activation/deactivation
export function narratePolicy(key, value) {
  // For toggles: use _on / _off scripts
  const onKey = `policy_${key}_on`
  const offKey = `policy_${key}_off`
  if (value === true || value === false) {
    const script = value ? NARRATION_SCRIPTS[onKey] : NARRATION_SCRIPTS[offKey]
    if (script) narrate(script)
    return
  }
  // For sliders: narrate only on first non-zero activation
  if (value > 0 && NARRATION_SCRIPTS[onKey]) {
    narrate(NARRATION_SCRIPTS[onKey])
  }
}

// Preload model in background (call after first user interaction)
export function preloadNarrator() {
  ensureLoaded()
}

export function isLoaded() {
  return tts !== null
}
