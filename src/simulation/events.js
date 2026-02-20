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
    description: 'A disease sweeps the economy. Health drops, businesses close, workers stay home.',
    duration: 200,
    icon: '🦠',
    effects: {
      healthMultiplier: 0.7,
      productionMultiplier: 0.6,
      deathRateMultiplier: 3.0,
      consumerSpendingMultiplier: 0.5
    }
  },
  [EVENT_TYPES.CROP_FAILURE]: {
    name: 'Crop Failure',
    description: 'Poor harvests cause food prices to spike. The poor suffer most.',
    duration: 150,
    icon: '🌾',
    effects: {
      foodSupplyMultiplier: 0.3,
      foodPriceMultiplier: 2.5
    }
  },
  [EVENT_TYPES.TECH_BREAKTHROUGH]: {
    name: 'Tech Breakthrough',
    description: 'A technology revolution doubles productivity in the tech sector.',
    duration: 300,
    icon: '🚀',
    effects: {
      techProductivityMultiplier: 2.0,
      techWorkerWageMultiplier: 1.5,
      otherJobsAutomatedRate: 0.1
    }
  },
  [EVENT_TYPES.FINANCIAL_BUBBLE]: {
    name: 'Financial Bubble',
    description: 'Asset prices inflate, then violently crash. Wealth evaporates.',
    duration: 250,
    icon: '💥',
    effects: {
      wealthInflationPhase: 1.5,  // first half: inflate
      wealthCrashPhase: 0.4       // second half: crash
    }
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
    description: 'Economic contraction: businesses struggle, unemployment rises, demand drops.',
    duration: 200,
    icon: '📉',
    effects: {
      demandMultiplier: 0.6,
      businessCapitalDrain: 0.02,
      hiringSuppression: true
    }
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

export function tickEvents(eventsState, state, policies, tick) {
  // Age out expired events
  eventsState.activeEvents = eventsState.activeEvents.filter(e => {
    if (e.definition.duration === 0) return true // permanent
    return (tick - e.startTick) < e.definition.duration
  })

  // Random shock chance (reduced if multiple events active)
  const baseChance = SHOCK_PROBABILITY * (1 - eventsState.activeEvents.length * 0.3)
  if (Math.random() < baseChance && tick > eventsState.lastEventTick + 100) {
    const newEvent = _triggerRandomEvent(eventsState, state, policies, tick)
    if (newEvent) return newEvent
  }

  // Apply active event effects
  for (const event of eventsState.activeEvents) {
    _applyEventEffects(event, state, policies, tick)
  }

  return null
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

  const def = EVENT_DEFINITIONS[chosen]
  const event = {
    id: `${chosen}_${tick}`,
    type: chosen,
    definition: def,
    startTick: tick,
    name: def.name,
    description: def.description,
    icon: def.icon
  }

  eventsState.activeEvents.push(event)
  eventsState.eventHistory.push({ ...event, resolvedTick: tick + def.duration })
  eventsState.lastEventTick = tick

  // Immediate effects
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
