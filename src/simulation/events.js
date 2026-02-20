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
  BOOM: 'boom',
  HYPERINFLATION: 'hyperinflation',
  GENERAL_STRIKE: 'generalStrike',
  BANK_RUN: 'bankRun',
  BRAIN_DRAIN: 'brainDrain'
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
  },

  [EVENT_TYPES.HYPERINFLATION]: {
    name: 'Hyperinflation Spiral',
    description: 'Prices are doubling every few weeks. Currency is losing value faster than anyone can spend it. People are using wheelbarrows of cash to buy bread. What do you do?',
    duration: 300,
    icon: '💸',
    effects: {
      priceMultiplierPerTick: 1.008,
      wageErosionRate: 0.005,
      savingsDestructionRate: 0.01
    },
    choices: [
      {
        id: 'currency_reform',
        label: 'Currency Reform',
        emoji: '🪙',
        description: 'Issue a new currency. Peg it to gold or a foreign reserve. Immediately restore confidence — if anyone believes you.',
        tradeoff: 'Stops inflation fast. Requires credibility and foreign reserves. Painful one-time wealth reset.',
        historicalNote: 'Germany\'s 1923 Rentenmark replaced the worthless Mark overnight. Inflation stopped within weeks — but required complete institutional trust.',
        effectOverride: { priceMultiplierPerTick: 1.0, wageErosionRate: 0, savingsDestructionRate: 0, duration: 50 },
        govDebtPenalty: 500
      },
      {
        id: 'interest_rate_shock',
        label: 'Shock Interest Rates',
        emoji: '🏦',
        description: 'Raise interest rates to 20%+. Crush demand. Stop the money printing. It will cause a severe recession.',
        tradeoff: 'Kills inflation but triggers mass unemployment and recession. Volcker shock medicine.',
        historicalNote: 'Paul Volcker (1980-82) raised US rates to 20% to kill stagflation. Inflation died. So did 2 years of growth.',
        effectOverride: { priceMultiplierPerTick: 1.001, wageErosionRate: 0.002, savingsDestructionRate: 0.003, duration: 150 },
        policyOverrides: { interestRate: 0.20, printMoney: 0 }
      },
      {
        id: 'price_freeze',
        label: 'Emergency Price Freeze',
        emoji: '🧊',
        description: 'Legally freeze all prices where they are. Sounds good. Historically causes shortages, black markets, and collapse within months.',
        tradeoff: 'Appears to stop inflation on paper. Creates chronic shortages and black markets.',
        historicalNote: 'Nixon\'s 1971 price controls temporarily stopped inflation — then it came back worse. Venezuela\'s price controls in 2010s caused empty supermarkets.',
        effectOverride: { priceMultiplierPerTick: 1.0, wageErosionRate: 0.003, savingsDestructionRate: 0.008, duration: 400 },
        policyOverrides: { priceControlFood: true, priceControlHousing: true }
      }
    ]
  },

  [EVENT_TYPES.GENERAL_STRIKE]: {
    name: 'General Strike',
    description: 'Workers across every sector have walked off the job. Production has stopped. Shelves are emptying. The labor movement is demanding radical change. How do you respond?',
    duration: 180,
    icon: '✊',
    effects: {
      productionMultiplier: 0.1,
      businessCapitalDrain: 0.03,
      unrestLevel: 0.8
    },
    choices: [
      {
        id: 'negotiate',
        label: 'Negotiate with Workers',
        emoji: '🤝',
        description: 'Meet with union leaders. Accept major wage increases and worker protections. End the strike through concessions.',
        tradeoff: 'Strike ends quickly. Wages rise significantly. Businesses face higher costs. May trigger inflation.',
        historicalNote: 'UK 1926 General Strike ended after 9 days. Government conceded little. Workers returned defeated. France 1968 — de Gaulle negotiated wage increases of 35%.',
        effectOverride: { productionMultiplier: 0.9, businessCapitalDrain: 0.005, unrestLevel: 0.2, duration: 80 },
        policyOverrides: { minWage: 18 }
      },
      {
        id: 'crack_down',
        label: 'Call In the Military',
        emoji: '🪖',
        description: 'Declare the strike illegal. Deploy security forces to reopen businesses. Arrest strike leaders.',
        tradeoff: 'Strike ends by force. Short-term production resumes. Generates massive unrest. Long-term labor relations destroyed.',
        historicalNote: 'Tsar Nicholas II cracked down on 1905 strikes. Workers returned, resentment grew, revolution followed 12 years later.',
        effectOverride: { productionMultiplier: 0.7, businessCapitalDrain: 0.01, unrestLevel: 0.95, duration: 100 }
      },
      {
        id: 'meet_demands',
        label: 'Meet All Demands',
        emoji: '📋',
        description: 'Full capitulation. Massive wage increases, worker ownership rights, reduced hours. Businesses will struggle to absorb the costs.',
        tradeoff: 'Strike ends immediately. Workers are ecstatic. Many businesses go bankrupt within months.',
        historicalNote: 'Bolivia\'s 1952 revolution saw workers seize mines. Production collapsed 40% initially before new management stabilized.',
        effectOverride: { productionMultiplier: 0.95, businessCapitalDrain: 0.02, unrestLevel: 0.05, duration: 50 },
        policyOverrides: { minWage: 25, mandatoryProfitShare: 0.20 }
      }
    ]
  },

  [EVENT_TYPES.BANK_RUN]: {
    name: 'Bank Run',
    description: 'Citizens are lining up to withdraw everything from the banks. The financial system has 48 hours before it collapses completely. Businesses cannot make payroll. What do you do?',
    duration: 200,
    icon: '🏦',
    effects: {
      wealthDestructionRate: 0.04,
      businessCapitalCrash: 0.5,
      hiringSuppression: true
    },
    choices: [
      {
        id: 'deposit_guarantee',
        label: 'Guarantee All Deposits',
        emoji: '🛡️',
        description: 'Government guarantees every citizen\'s deposits are safe. Panic stops immediately. Costs are enormous.',
        tradeoff: 'Stops the run instantly. Restores confidence. Massive contingent liability on the government.',
        historicalNote: 'FDR\'s FDIC (1933) deposit guarantee ended the Great Depression bank runs overnight. Still the gold standard.',
        effectOverride: { wealthDestructionRate: 0.002, businessCapitalCrash: 0.9, hiringSuppression: false, duration: 50 },
        govDebtPenalty: 3000
      },
      {
        id: 'bank_holiday',
        label: 'Declare a Bank Holiday',
        emoji: '🚪',
        description: 'Close all banks for a week. Force a pause. Use the time to audit, restructure, or recapitalize.',
        tradeoff: 'Buys time but deepens the panic. Economic activity freezes completely during the holiday.',
        historicalNote: 'FDR declared a bank holiday in March 1933. When banks reopened 4 days later, the runs had stopped — but the pause was painful.',
        effectOverride: { wealthDestructionRate: 0.01, businessCapitalCrash: 0.3, hiringSuppression: true, duration: 150 },
        govDebtPenalty: 1000
      },
      {
        id: 'let_banks_fail',
        label: 'Let Them Fail',
        emoji: '💀',
        description: 'No bailouts. Insolvent banks deserve to collapse. Creative destruction will rebuild stronger institutions.',
        tradeoff: 'Short-term economic catastrophe. Possibly long-term healthy reset. Historically devastating.',
        historicalNote: 'Hoover let 4,000 US banks fail 1930-33. GDP fell 30%. Unemployment hit 25%. "Creative destruction" was not creative.',
        effectOverride: { wealthDestructionRate: 0.06, businessCapitalCrash: 0.15, hiringSuppression: true, duration: 350 }
      }
    ]
  },

  [EVENT_TYPES.BRAIN_DRAIN]: {
    name: 'Brain Drain',
    description: 'Your most skilled workers are leaving. High taxes, low opportunity, political instability — whatever the reason, talent is exiting fast. Businesses are struggling to fill key roles.',
    duration: 250,
    icon: '🧠',
    effects: {
      skillErosionRate: 0.002,
      highSkillExitProbability: 0.01,
      productivityDecay: 0.998
    },
    choices: [
      {
        id: 'talent_incentives',
        label: 'Talent Retention Package',
        emoji: '💰',
        description: 'Tax breaks and bonuses for high-skill workers. Make staying worth their while.',
        tradeoff: 'Slows emigration. Costs revenue. Creates a two-tier tax system that others resent.',
        historicalNote: 'Ireland\'s special artist tax exemption attracted many creatives. Singapore\'s talent visa system draws global elites.',
        effectOverride: { skillErosionRate: 0.0003, highSkillExitProbability: 0.001, productivityDecay: 0.9995, duration: 150 },
        govDebtPenalty: 600
      },
      {
        id: 'open_immigration',
        label: 'Open Skilled Immigration',
        emoji: '🌍',
        description: 'Replace departing talent with immigrants. Fast-track visas for skilled workers globally.',
        tradeoff: 'Partially offsets the drain. Different skills may not perfectly match. Cultural adjustment takes time.',
        historicalNote: 'Canada\'s points-based immigration system and the US H-1B visa program replace brain drain with brain gain.',
        effectOverride: { skillErosionRate: 0.001, highSkillExitProbability: 0.005, productivityDecay: 0.999, duration: 200 },
        policyOverrides: { openBorders: true }
      },
      {
        id: 'ignore_it',
        label: 'Let Them Leave',
        emoji: '👋',
        description: 'Good riddance to elites. The working class will step up. Skills can be rebuilt from within.',
        tradeoff: 'No cost. Significant long-term productivity collapse as expertise exits permanently.',
        historicalNote: 'Zimbabwe\'s post-2000 land reform drove out skilled farmers and professionals. GDP fell 50%. 3 million skilled workers fled.',
        effectOverride: { skillErosionRate: 0.004, highSkillExitProbability: 0.02, productivityDecay: 0.993, duration: 400 }
      }
    ]
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
    [EVENT_TYPES.BOOM]: metrics.unemployment < 0.05 ? 2 : 0.5,
    // New chaos events — more likely in troubled economies
    [EVENT_TYPES.HYPERINFLATION]: (policies.printMoney > 20 || metrics.inflation > 10) ? 3 : 0.3,
    [EVENT_TYPES.GENERAL_STRIKE]: metrics.gini > 0.55 ? 2 : (metrics.unemployment > 0.15 ? 1.5 : 0.3),
    [EVENT_TYPES.BANK_RUN]: (metrics.govDebt > 3000 || metrics.inflation > 8) ? 2 : 0.3,
    [EVENT_TYPES.BRAIN_DRAIN]: (policies.wealthConfiscation > 0.1 || policies.maximumWage > 0) ? 2 : 0.4
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

    case EVENT_TYPES.BANK_RUN:
      // Immediate: businesses lose half their capital
      for (const b of aliveBusinesses) {
        b.capital *= effects.businessCapitalCrash
      }
      // Agents lose a chunk of wealth (savings in banks)
      for (const a of aliveAgents) {
        a.wealth *= (1 - effects.wealthDestructionRate * 5)
        a.wealth = Math.max(0, a.wealth)
      }
      break

    case EVENT_TYPES.GENERAL_STRIKE:
      // All businesses immediately go to minimum production
      for (const b of aliveBusinesses) {
        b.production = (b.production || 1) * 0.15
      }
      break

    case EVENT_TYPES.BRAIN_DRAIN:
      // Immediately remove top 10% of skilled workers
      {
        const skilled = aliveAgents.filter(a => a.skill > 0.75).sort((a, b) => b.skill - a.skill)
        const exitCount = Math.floor(skilled.length * 0.15)
        for (const a of skilled.slice(0, exitCount)) {
          a.alive = false  // emigrated
        }
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

    case EVENT_TYPES.HYPERINFLATION:
      // Prices spiral upward each tick
      if (state.market?.prices) {
        for (const sector of Object.keys(state.market.prices)) {
          state.market.prices[sector] *= effects.priceMultiplierPerTick
        }
      }
      // Savings eroded — agents lose wealth to inflation
      if (Math.random() < 0.1) {
        for (const a of state.agents.filter(a => a.alive && a.wealth > 0)) {
          a.wealth *= (1 - effects.savingsDestructionRate)
        }
      }
      break

    case EVENT_TYPES.GENERAL_STRIKE:
      // Ongoing production suppression
      if (Math.random() < 0.15) {
        for (const b of state.businesses.filter(b => b.alive)) {
          b.capital -= b.capital * effects.businessCapitalDrain
        }
      }
      break

    case EVENT_TYPES.BANK_RUN:
      // Ongoing wealth destruction and hiring freeze
      if (Math.random() < 0.05) {
        for (const a of state.agents.filter(a => a.alive)) {
          a.wealth *= (1 - effects.wealthDestructionRate)
          a.wealth = Math.max(0, a.wealth)
        }
      }
      break

    case EVENT_TYPES.BRAIN_DRAIN:
      // Ongoing skill erosion in remaining workforce
      if (Math.random() < 0.02) {
        const skilled = state.agents.filter(a => a.alive && a.skill > 0.6)
        for (const a of skilled) {
          a.skill = clamp(a.skill - effects.skillErosionRate, 0, 1)
          // Small probability of emigration each tick
          if (Math.random() < effects.highSkillExitProbability) {
            a.alive = false
          }
        }
      }
      break
  }
}
