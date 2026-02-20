import { SHOCK_PROBABILITY } from '../utils/constants.js'
import { clamp } from '../utils/math.js'

export const EVENT_TYPES = {
  PANDEMIC: 'pandemic',
  CROP_FAILURE: 'cropFailure',
  TECH_BREAKTHROUGH: 'techBreakthrough',
  FINANCIAL_BUBBLE: 'financialBubble',
  CORRUPTION: 'corruption',
  IMMIGRATION_WAVE: 'immigrationWave',
  RECESSION: 'recession',
  BOOM: 'boom'
}

const EVENT_DEFINITIONS = {
  [EVENT_TYPES.PANDEMIC]: {
    name: 'Pandemic',
    description: 'A disease is spreading fast. How do you respond?',
    duration: 200,
    icon: '🦠',
    effects: {
      healthMultiplier: 0.7,
      productionMultiplier: 0.6,
      deathRateMultiplier: 3.0,
      consumerSpendingMultiplier: 0.5
    },
    choices: [
      {
        id: 'lockdown',
        label: 'Lockdown',
        emoji: '🏠',
        description: 'Shut down non-essential businesses. Mandate isolation.',
        tradeoff: 'Saves lives, fewer deaths. GDP falls sharply. Unemployment spikes short-term.',
        historicalNote: 'COVID lockdowns (2020) saved millions but triggered the sharpest recession since WWII.',
        effectOverride: { healthMultiplier: 0.95, productionMultiplier: 0.4, deathRateMultiplier: 1.2, duration: 150 }
      },
      {
        id: 'herd_immunity',
        label: 'Herd Immunity',
        emoji: '🧬',
        description: 'Keep the economy open. Let the disease spread to build immunity.',
        tradeoff: 'Economy keeps running. Much higher death toll. Healthcare system may collapse.',
        historicalNote: 'Sweden\'s initial COVID approach — lower short-term GDP hit but higher deaths.',
        effectOverride: { healthMultiplier: 0.5, productionMultiplier: 0.8, deathRateMultiplier: 5.0, duration: 250 }
      },
      {
        id: 'targeted_support',
        label: 'Targeted Support',
        emoji: '💉',
        description: 'Protect vulnerable groups. Support businesses. Invest in healthcare.',
        tradeoff: 'Balanced outcome. Costs significant government spending.',
        historicalNote: 'Germany\'s Kurzarbeit (short-work) scheme kept unemployment low during COVID.',
        effectOverride: { healthMultiplier: 0.80, productionMultiplier: 0.65, deathRateMultiplier: 1.8, duration: 180 },
        govDebtPenalty: 1000
      }
    ]
  },
  [EVENT_TYPES.CROP_FAILURE]: {
    name: 'Crop Failure',
    description: 'Severe drought has decimated harvests. Food prices are spiking. The poor can\'t eat. What do you do?',
    duration: 150,
    icon: '🌾',
    effects: {
      foodSupplyMultiplier: 0.3,
      foodPriceMultiplier: 2.5
    },
    choices: [
      {
        id: 'food_aid',
        label: 'Emergency Food Aid',
        emoji: '🍞',
        description: 'Government distributes food and subsidizes prices for low-income households.',
        tradeoff: 'Prevents starvation and unrest. Costs government significantly. Doesn\'t fix supply.',
        historicalNote: 'US food stamps (1939, expanded 1961) prevented widespread malnutrition during agricultural crises.',
        effectOverride: { foodSupplyMultiplier: 0.3, foodPriceMultiplier: 1.4, duration: 120 },
        govDebtPenalty: 600
      },
      {
        id: 'price_controls_food',
        label: 'Cap Food Prices',
        emoji: '🏷️',
        description: 'Legally limit how much food can cost. Sellers cannot raise prices above the cap.',
        tradeoff: 'Keeps food accessible short-term. Reduces farmer incentives — may worsen next harvest.',
        historicalNote: 'USSR price controls kept bread cheap but caused chronic shortages and black markets.',
        effectOverride: { foodSupplyMultiplier: 0.3, foodPriceMultiplier: 1.1, duration: 200 },
        policyOverrides: { priceControlFood: true }
      },
      {
        id: 'import_food',
        label: 'Open Food Imports',
        emoji: '🚢',
        description: 'Remove trade barriers on food. International supply fills the gap.',
        tradeoff: 'Quickly stabilizes prices. Hurts domestic farmers long-term. Adds trade dependency.',
        historicalNote: 'Ireland\'s famine (1845) was worsened by British refusal to halt food exports. Open imports could have saved millions.',
        effectOverride: { foodSupplyMultiplier: 0.8, foodPriceMultiplier: 1.3, duration: 100 },
        policyOverrides: { openBorders: true }
      }
    ]
  },
  [EVENT_TYPES.TECH_BREAKTHROUGH]: {
    name: 'Tech Breakthrough',
    description: 'A new technology could double productivity — but automate 20% of jobs. How do you respond to this disruption?',
    duration: 300,
    icon: '🚀',
    effects: {
      techProductivityMultiplier: 2.0,
      techWorkerWageMultiplier: 1.5,
      otherJobsAutomatedRate: 0.1
    },
    choices: [
      {
        id: 'embrace_tech',
        label: 'Embrace It Fully',
        emoji: '🤖',
        description: 'Let the market adopt technology at full speed. No restrictions.',
        tradeoff: 'Maximum GDP growth. Rapid job displacement. High inequality surge.',
        historicalNote: 'Industrial Revolution (1760s+): enormous long-term gains, but decades of worker misery before adaptation.',
        effectOverride: { techProductivityMultiplier: 2.5, techWorkerWageMultiplier: 2.0, otherJobsAutomatedRate: 0.25, duration: 300 }
      },
      {
        id: 'managed_transition',
        label: 'Managed Transition',
        emoji: '🎓',
        description: 'Tax tech gains, fund retraining programs and transition support for displaced workers.',
        tradeoff: 'Slower adoption but smoother adjustment. Higher government cost. Better long-term stability.',
        historicalNote: 'Germany\'s "Kurzarbeit" and Denmark\'s "flexicurity" — managed disruption with strong safety nets.',
        effectOverride: { techProductivityMultiplier: 1.7, techWorkerWageMultiplier: 1.3, otherJobsAutomatedRate: 0.08, duration: 250 },
        govDebtPenalty: 800,
        policyOverrides: { educationFunding: 0.8, unemploymentBenefit: 150 }
      },
      {
        id: 'restrict_automation',
        label: 'Regulate Automation',
        emoji: '⛔',
        description: 'Limit how quickly companies can replace workers with machines. Robot tax.',
        tradeoff: 'Protects jobs short-term. Slows GDP growth. May fall behind globally.',
        historicalNote: 'Luddites (1811) destroyed textile machinery. Short-term protection, but technology won eventually.',
        effectOverride: { techProductivityMultiplier: 1.2, techWorkerWageMultiplier: 1.1, otherJobsAutomatedRate: 0.03, duration: 350 }
      }
    ]
  },
  [EVENT_TYPES.FINANCIAL_BUBBLE]: {
    name: 'Financial Bubble',
    description: 'Asset prices are wildly inflated. A crash appears imminent. How do you respond?',
    duration: 250,
    icon: '💥',
    effects: {
      wealthInflationPhase: 1.5,
      wealthCrashPhase: 0.4
    },
    choices: [
      {
        id: 'let_it_burn',
        label: 'Let It Burn',
        emoji: '🔥',
        description: 'No intervention. Let markets correct naturally.',
        tradeoff: 'Short, sharp crash. High unemployment spike. Faster long-term recovery.',
        historicalNote: 'Hoover\'s approach in 1929 — worsened the Depression when banks also failed.',
        effectOverride: { wealthCrashPhase: 0.25, duration: 150 }
      },
      {
        id: 'bailout',
        label: 'Bail Out Banks',
        emoji: '🏦',
        description: 'Government buys toxic assets. Prevent bank collapse.',
        tradeoff: 'Softer crash, but adds massive debt and rewards recklessness. Slow recovery.',
        historicalNote: 'TARP (2008) — prevented depression but caused lasting public anger.',
        effectOverride: { wealthCrashPhase: 0.60, duration: 350 },
        govDebtPenalty: 2000
      },
      {
        id: 'regulate',
        label: 'Emergency Controls',
        emoji: '⚖️',
        description: 'Freeze credit, impose capital controls, force write-downs.',
        tradeoff: 'Medium crash severity. Suppresses growth for years but prevents another bubble.',
        historicalNote: 'Sweden 1992: nationalized banks, forced writedowns, recovered fully in 3 years.',
        effectOverride: { wealthCrashPhase: 0.45, duration: 200 },
        policyOverrides: { antiMonopoly: true, interestRate: 0.08 }
      }
    ]
  },
  [EVENT_TYPES.CORRUPTION]: {
    name: 'Corruption Scandal',
    description: 'Government corruption diverts tax revenue. Public services collapse.',
    duration: 180,
    icon: '💰',
    effects: {
      taxRevenueLeakage: 0.5,
      publicTrustMultiplier: 0.6
    }
  },
  [EVENT_TYPES.IMMIGRATION_WAVE]: {
    name: 'Immigration Wave',
    description: 'Skilled workers arrive, boosting productivity but increasing competition for jobs.',
    duration: 0, // permanent
    icon: '🌍',
    effects: {
      newAgentCount: 30,
      newAgentSkillBonus: 0.3
    }
  },
  [EVENT_TYPES.RECESSION]: {
    name: 'Recession',
    description: 'The economy is contracting. Businesses are cutting, unemployment is rising. What\'s your response?',
    duration: 200,
    icon: '📉',
    effects: {
      demandMultiplier: 0.6,
      businessCapitalDrain: 0.02,
      hiringSuppression: true
    },
    choices: [
      {
        id: 'stimulus',
        label: 'Stimulus Package',
        emoji: '💵',
        description: 'Government spending on infrastructure, public jobs, and direct payments.',
        tradeoff: 'Kickstarts demand. Adds to government debt. May cause mild inflation.',
        historicalNote: 'FDR\'s New Deal (1933), Obama\'s ARRA (2009), Biden\'s ARP (2021) — all used stimulus to end recessions.',
        effectOverride: { demandMultiplier: 0.85, businessCapitalDrain: 0.01, hiringSuppression: false, duration: 130 },
        govDebtPenalty: 1500
      },
      {
        id: 'austerity',
        label: 'Austerity',
        emoji: '✂️',
        description: 'Cut government spending. Reduce deficit. Let weak firms fail.',
        tradeoff: 'Improves budget balance. Deepens recession short-term. May extend recovery by years.',
        historicalNote: 'UK and EU austerity (2010-2015) extended the recession and caused a lost generation of unemployment.',
        effectOverride: { demandMultiplier: 0.45, businessCapitalDrain: 0.04, hiringSuppression: true, duration: 280 },
        policyOverrides: { unemploymentBenefit: 0, educationFunding: 0.1 }
      },
      {
        id: 'rate_cut',
        label: 'Cut Interest Rates',
        emoji: '🏦',
        description: 'Lower borrowing costs to encourage investment and spending.',
        tradeoff: 'Helps businesses invest. Limited effect if rates are already near zero.',
        historicalNote: 'Fed cut rates to near-zero in 2008 and 2020 — effective, but creates risk of asset bubbles.',
        effectOverride: { demandMultiplier: 0.72, businessCapitalDrain: 0.01, hiringSuppression: false, duration: 160 },
        policyOverrides: { interestRate: 0.005 }
      }
    ]
  },
  [EVENT_TYPES.BOOM]: {
    name: 'Economic Boom',
    description: 'Consumer confidence surges. Spending rises, businesses thrive.',
    duration: 150,
    icon: '📈',
    effects: {
      demandMultiplier: 1.4,
      hiringBoost: true,
      wageGrowthRate: 1.02
    }
  }
}

export function createEventsState() {
  return {
    activeEvents: [],
    eventHistory: [],
    lastEventTick: 0
  }
}

// forceType: if provided, triggers that specific event type instead of random
export function tickEvents(eventsState, state, policies, tick, forceType = null) {
  // Age out expired events
  eventsState.activeEvents = eventsState.activeEvents.filter(e => {
    if (e.definition.duration === 0) return true // permanent
    return (tick - e.startTick) < e.definition.duration
  })

  let newEvent = null

  if (forceType) {
    newEvent = _triggerEvent(eventsState, state, policies, tick, forceType)
  } else {
    // Random shock chance (reduced if multiple events active)
    const baseChance = SHOCK_PROBABILITY * (1 - eventsState.activeEvents.length * 0.3)
    if (Math.random() < baseChance && tick > eventsState.lastEventTick + 100) {
      newEvent = _triggerRandomEvent(eventsState, state, policies, tick)
    }
  }

  // If new event requires a player choice, return immediately — don't apply effects yet
  if (newEvent?.requiresChoice) return newEvent

  // Apply active event effects
  for (const event of eventsState.activeEvents) {
    _applyEventEffects(event, state, policies, tick)
  }

  return newEvent
}

// Called when the player makes a choice for a pending event
export function resolveEventChoice(eventsState, eventId, choiceId, state) {
  const event = eventsState.pendingChoiceEvent
  if (!event || event.id !== eventId) return

  const choice = event.definition.choices?.find(c => c.id === choiceId)
  if (!choice) return

  // Apply choice overrides to event definition
  if (choice.effectOverride) {
    Object.assign(event.definition.effects, choice.effectOverride)
    if (choice.effectOverride.duration !== undefined) {
      event.definition.duration = choice.effectOverride.duration
    }
  }
  if (choice.policyOverrides) {
    Object.assign(state.policies, choice.policyOverrides)
  }
  if (choice.govDebtPenalty && state.metrics) {
    state.metrics.govDebt = (state.metrics.govDebt || 0) + choice.govDebtPenalty
  }

  event.choiceMade = choiceId
  event.requiresChoice = false

  // Now apply immediate effects
  _applyImmediateEffects(event, state)

  // Move from pending to active
  eventsState.activeEvents.push(event)
  eventsState.pendingChoiceEvent = null
}

function _triggerEvent(eventsState, state, policies, tick, type) {
  const def = EVENT_DEFINITIONS[type]
  if (!def) return null
  return _buildAndRegisterEvent(eventsState, state, tick, type, def)
}

function _triggerRandomEvent(eventsState, state, policies, tick) {
  // Weight events by current economic conditions
  const metrics = state.metrics || {}
  const weights = {
    [EVENT_TYPES.PANDEMIC]: 1,
    [EVENT_TYPES.CROP_FAILURE]: 1,
    [EVENT_TYPES.TECH_BREAKTHROUGH]: 1.5,
    [EVENT_TYPES.FINANCIAL_BUBBLE]: metrics.gini > 0.5 ? 2 : 0.5,
    [EVENT_TYPES.CORRUPTION]: metrics.govDebt > 1000 ? 2 : 0.5,
    [EVENT_TYPES.IMMIGRATION_WAVE]: policies.openBorders ? 3 : 0.5,
    [EVENT_TYPES.RECESSION]: metrics.inflation > 5 ? 2 : 0.3,
    [EVENT_TYPES.BOOM]: metrics.unemployment < 0.05 ? 2 : 0.5
  }

  const types = Object.keys(weights)
  const weightArr = types.map(t => weights[t])
  const total = weightArr.reduce((a, b) => a + b, 0)
  let r = Math.random() * total
  let chosen = types[0]
  for (let i = 0; i < types.length; i++) {
    r -= weightArr[i]
    if (r <= 0) { chosen = types[i]; break }
  }

  return _buildAndRegisterEvent(eventsState, state, tick, chosen, EVENT_DEFINITIONS[chosen])
}

// "Do Nothing" is always a valid choice — inaction is itself a decision
const DO_NOTHING_CHOICE = {
  id: 'do_nothing',
  label: 'Do Nothing',
  emoji: '🤷',
  description: 'No intervention. Let the situation play out without government action.',
  tradeoff: 'Preserves budget and avoids unintended consequences — but cedes control to market forces.',
  historicalNote: 'Doing nothing is itself a policy choice. Hoover (1929), ECB (2010-12), and many others chose inaction with lasting consequences.',
  effectOverride: null  // use default effects unchanged
}

function _buildAndRegisterEvent(eventsState, state, tick, type, def) {
  const event = {
    id: `${type}_${tick}`,
    type,
    // Deep-clone definition so overrides don't mutate the global
    definition: { ...def, effects: { ...def.effects } },
    startTick: tick,
    name: def.name,
    description: def.description,
    icon: def.icon
  }

  eventsState.lastEventTick = tick
  eventsState.eventHistory.push({ id: event.id, name: def.name, icon: def.icon, tick })

  // If event has choices, inject "Do Nothing" and hold for player decision
  if (def.choices?.length > 0) {
    // Inject "Do Nothing" as the last option if not already present
    const hasDoNothing = def.choices.some(c => c.id === 'do_nothing')
    if (!hasDoNothing) {
      event.definition = {
        ...event.definition,
        choices: [...def.choices, DO_NOTHING_CHOICE]
      }
    }
    event.requiresChoice = true
    eventsState.pendingChoiceEvent = event
    return event  // do NOT add to activeEvents yet
  }

  eventsState.activeEvents.push(event)
  _applyImmediateEffects(event, state)
  return event
}

function _applyImmediateEffects(event, state) {
  const { effects } = event.definition
  const aliveAgents = state.agents.filter(a => a.alive)
  const aliveBusinesses = state.businesses.filter(b => b.alive)

  switch (event.type) {
    case EVENT_TYPES.PANDEMIC:
      for (const a of aliveAgents) {
        a.health *= 0.8 + Math.random() * 0.2
        a.health = clamp(a.health, 0.1, 1)
      }
      break

    case EVENT_TYPES.IMMIGRATION_WAVE:
      // New agents will be created in engine.js when it receives this event
      event._spawnAgents = effects.newAgentCount
      event._spawnSkillBonus = effects.newAgentSkillBonus
      break

    case EVENT_TYPES.FINANCIAL_BUBBLE:
      // Mark phase tracking
      event.phase = 'inflate'
      event.phaseStartTick = event.startTick
      break

    case EVENT_TYPES.TECH_BREAKTHROUGH:
      // Boost all tech businesses
      for (const b of aliveBusinesses.filter(b => b.sector === 'tech')) {
        b.productivity *= effects.techProductivityMultiplier
      }
      break
  }
}

function _applyEventEffects(event, state, policies, tick) {
  const { effects } = event.definition
  const elapsed = tick - event.startTick
  const progress = event.definition.duration > 0
    ? elapsed / event.definition.duration
    : 0

  switch (event.type) {
    case EVENT_TYPES.PANDEMIC:
      // Ongoing production suppression
      if (Math.random() < 0.01) {
        for (const b of state.businesses.filter(b => b.alive)) {
          b.capital -= b.capital * 0.005
        }
      }
      break

    case EVENT_TYPES.FINANCIAL_BUBBLE:
      // Two phases: inflate then crash
      if (progress < 0.5) {
        // Inflate phase: wealth grows
        if (Math.random() < 0.05) {
          for (const a of state.agents.filter(a => a.alive && a.wealth > 500)) {
            a.wealth *= 1.01
          }
        }
      } else if (event.phase === 'inflate') {
        // Crash phase begins
        event.phase = 'crash'
        for (const a of state.agents.filter(a => a.alive)) {
          a.wealth *= effects.wealthCrashPhase + Math.random() * 0.3
        }
      }
      break

    case EVENT_TYPES.RECESSION:
      // Slow capital drain on businesses
      if (Math.random() < 0.1) {
        for (const b of state.businesses.filter(b => b.alive)) {
          b.capital -= b.capital * effects.businessCapitalDrain
        }
      }
      break

    case EVENT_TYPES.BOOM:
      // Wage growth
      if (Math.random() < 0.05) {
        for (const b of state.businesses.filter(b => b.alive)) {
          b.wageOffered *= effects.wageGrowthRate
        }
      }
      break
  }
}
