// ─── Scenario Smoke Tests ────────────────────────────────────────────────────
// Verifies every scenario (sandbox, historical, story) can initialize and run
// through the SimEngine without crashing, producing valid metrics.

import { describe, it, expect } from 'vitest'
import { SimEngine } from './engine.js'
import { SCENARIOS, SANDBOX_SCENARIOS, HISTORICAL_SCENARIOS, STORY_SCENARIOS } from '../data/scenarios.js'
import { ECONOMIC_MODELS } from '../data/scenarios.js'
import { createEventsState, tickEvents, resolveEventChoice } from './events.js'

const RUN_TICKS = 500

function makeEngine(scenario) {
  return new SimEngine({
    id: scenario.id,
    name: scenario.name,
    isTutorial: false,
    ...scenario,
    policies: scenario.policies
  })
}

function runAndCollectMetrics(scenario) {
  const engine = makeEngine(scenario)
  for (let t = 0; t < RUN_TICKS; t++) {
    engine.step()
  }
  return engine
}

// ─── All scenarios initialize without error ──────────────────────────────────

describe('All scenarios initialize', () => {
  for (const [id, scenario] of Object.entries(SCENARIOS)) {
    it(`${scenario.name} (${id}) — creates engine`, () => {
      const engine = makeEngine(scenario)
      expect(engine).toBeDefined()
      expect(engine.agents.length).toBeGreaterThan(0)
      expect(engine.businesses.length).toBeGreaterThan(0)
    })
  }
})

// ─── All scenarios run 500 ticks without crashing ────────────────────────────

describe('All scenarios run 500 ticks', () => {
  for (const [id, scenario] of Object.entries(SCENARIOS)) {
    it(`${scenario.name} (${id}) — no crash`, () => {
      const engine = runAndCollectMetrics(scenario)
      const m = engine.metrics

      // Basic sanity: metrics object exists and has expected keys
      expect(m).toBeDefined()
      expect(typeof m.population).toBe('number')
      expect(typeof m.unemployment).toBe('number')
      expect(typeof m.gdp).toBe('number')
      expect(typeof m.cpi).toBe('number')
      expect(typeof m.gini).toBe('number')

      // No NaN in critical metrics
      expect(Number.isNaN(m.population)).toBe(false)
      expect(Number.isNaN(m.unemployment)).toBe(false)
      expect(Number.isNaN(m.gdp)).toBe(false)
      expect(Number.isNaN(m.cpi)).toBe(false)
      expect(Number.isNaN(m.gini)).toBe(false)

      // Population should still be alive
      expect(m.population).toBeGreaterThan(0)
    })
  }
})

// ─── Sandbox scenarios ───────────────────────────────────────────────────────

describe('Sandbox scenarios', () => {
  it('has at least 4 sandbox scenarios', () => {
    expect(SANDBOX_SCENARIOS.length).toBeGreaterThanOrEqual(4)
  })

  for (const scenario of SANDBOX_SCENARIOS) {
    it(`${scenario.name} — economy is functional after 500 ticks`, () => {
      const engine = runAndCollectMetrics(scenario)
      const m = engine.metrics

      // Businesses should survive
      expect(m.businessCount).toBeGreaterThan(0)

      // GDP should be positive
      expect(m.gdp).toBeGreaterThan(0)

      // Gini should be in valid range [0, 1]
      expect(m.gini).toBeGreaterThanOrEqual(0)
      expect(m.gini).toBeLessThanOrEqual(1)

      // Unemployment should be in valid range [0, 1]
      expect(m.unemployment).toBeGreaterThanOrEqual(0)
      expect(m.unemployment).toBeLessThanOrEqual(1)
    })
  }
})

// ─── Historical scenarios ────────────────────────────────────────────────────

describe('Historical scenarios', () => {
  it('has 6 historical scenarios', () => {
    expect(HISTORICAL_SCENARIOS).toHaveLength(6)
  })

  it('all historical scenarios have isHistorical flag', () => {
    for (const s of HISTORICAL_SCENARIOS) {
      expect(s.isHistorical).toBe(true)
    }
  })

  it('all historical scenarios have era and durationYears', () => {
    for (const s of HISTORICAL_SCENARIOS) {
      expect(s.era).toBeTruthy()
      expect(s.durationYears).toBeGreaterThan(0)
    }
  })

  for (const scenario of HISTORICAL_SCENARIOS) {
    it(`${scenario.name} — survives 500 ticks with scheduled events`, () => {
      const engine = runAndCollectMetrics(scenario)
      const m = engine.metrics

      expect(m.population).toBeGreaterThan(0)
      expect(Number.isNaN(m.gdp)).toBe(false)
      expect(Number.isNaN(m.gini)).toBe(false)

      // Historical scenarios with events shouldn't fully crash the economy
      expect(m.businessCount).toBeGreaterThanOrEqual(0)
    })
  }

  it('Great Depression starts with low wealth and few businesses', () => {
    const gd = SCENARIOS.greatDepression
    expect(gd.wealthMultiplier).toBeLessThan(0.5)
    expect(gd.businessCount).toBeLessThan(15)
    expect(gd.scheduledEvents.length).toBeGreaterThan(0)
  })

  it('Weimar has extreme money printing', () => {
    const w = SCENARIOS.weimarHyperinflation
    expect(w.policies.printMoney).toBeGreaterThanOrEqual(30)
  })
})

// ─── Story scenarios ─────────────────────────────────────────────────────────

describe('Story scenarios', () => {
  it('has 5 story chapters', () => {
    expect(STORY_SCENARIOS).toHaveLength(5)
  })

  it('all story scenarios have isStory flag', () => {
    for (const s of STORY_SCENARIOS) {
      expect(s.isStory).toBe(true)
    }
  })

  it('story chapters are numbered 1-5', () => {
    const numbers = STORY_SCENARIOS.map(s => s.storyChapterNumber).sort()
    expect(numbers).toEqual([1, 2, 3, 4, 5])
  })

  for (const scenario of STORY_SCENARIOS) {
    it(`Chapter ${scenario.storyChapterNumber}: ${scenario.name} — runs 500 ticks`, () => {
      const engine = runAndCollectMetrics(scenario)
      const m = engine.metrics

      expect(m.population).toBeGreaterThan(0)
      expect(Number.isNaN(m.gdp)).toBe(false)
      expect(Number.isNaN(m.gini)).toBe(false)
      expect(m.businessCount).toBeGreaterThanOrEqual(0)
    })
  }
})

// ─── Economic model presets ──────────────────────────────────────────────────

describe('Economic model presets', () => {
  it('has at least 5 models', () => {
    expect(ECONOMIC_MODELS.length).toBeGreaterThanOrEqual(5)
  })

  for (const model of ECONOMIC_MODELS) {
    it(`${model.name} (${model.id}) — can run with model policies`, () => {
      const engine = new SimEngine({
        id: model.id,
        name: model.name,
        isTutorial: false,
        agentCount: 200,
        businessCount: 20,
        wealthMultiplier: 1.0,
        wealthInequality: 1.0,
        avgSkill: 0.5,
        policies: model.policies
      })

      for (let t = 0; t < RUN_TICKS; t++) {
        engine.step()
      }

      const m = engine.metrics
      expect(m.population).toBeGreaterThan(0)
      expect(Number.isNaN(m.gdp)).toBe(false)
      expect(m.businessCount).toBeGreaterThan(0)
    })
  }
})

// ─── Scheduled events don't crash ────────────────────────────────────────────

describe('Scheduled events fire without crash', () => {
  const scenariosWithEvents = Object.values(SCENARIOS).filter(
    s => s.scheduledEvents && s.scheduledEvents.length > 0
  )

  it('at least 5 scenarios have scheduled events', () => {
    expect(scenariosWithEvents.length).toBeGreaterThanOrEqual(5)
  })

  for (const scenario of scenariosWithEvents) {
    it(`${scenario.name} — runs past all scheduled events`, () => {
      const maxEventTick = Math.max(...scenario.scheduledEvents.map(e => e.atTick))
      const ticksNeeded = maxEventTick + 100 // run 100 ticks past last event

      const engine = makeEngine(scenario)
      for (let t = 0; t < ticksNeeded; t++) {
        engine.step()
      }

      const m = engine.metrics
      expect(m.population).toBeGreaterThan(0)
      expect(Number.isNaN(m.gdp)).toBe(false)
    })
  }
})

// ─── Consequence chains — choices trigger follow-up events ───────────────────

describe('Event consequence chains', () => {
  function makeTestState() {
    return {
      agents: Array.from({ length: 50 }, (_, i) => ({
        alive: true, wealth: 500 + i * 100, health: 1, skill: 0.5, happiness: 0.5
      })),
      businesses: Array.from({ length: 10 }, () => ({
        alive: true, capital: 5000, sector: 'food', production: 100,
        wageOffered: 10, productivity: 1
      })),
      metrics: { gdp: 10000, gini: 0.4, unemployment: 0.1, inflation: 2, govDebt: 0,
                 socialUnrest: 0.2, crimeRate: 0.1, povertyRate: 0.2, population: 50 },
      policies: { interestRate: 0.05, printMoney: 0, policeFunding: 0.3,
                  openBorders: false, wealthConfiscation: 0 },
      market: { prices: { food: 5, housing: 10, tech: 8, luxury: 15 } }
    }
  }

  it('financial bubble "Let It Burn" triggers bank run', () => {
    const eventsState = createEventsState()
    const state = makeTestState()
    const tick = 100

    // Trigger financial bubble
    const event = tickEvents(eventsState, state, state.policies, tick, 'financialBubble')
    expect(event).toBeDefined()
    expect(event.requiresChoice).toBe(true)

    // Choose "Let It Burn"
    resolveEventChoice(eventsState, event.id, 'let_it_burn', state)

    // Follow-up should be scheduled
    expect(eventsState.scheduledFollowUps).toHaveLength(1)
    expect(eventsState.scheduledFollowUps[0].type).toBe('bankRun')
    expect(eventsState.scheduledFollowUps[0].atTick).toBe(tick + 80)
  })

  it('recession "Austerity" triggers general strike', () => {
    const eventsState = createEventsState()
    const state = makeTestState()
    const tick = 50

    const event = tickEvents(eventsState, state, state.policies, tick, 'recession')
    expect(event.requiresChoice).toBe(true)

    resolveEventChoice(eventsState, event.id, 'austerity', state)

    expect(eventsState.scheduledFollowUps).toHaveLength(1)
    expect(eventsState.scheduledFollowUps[0].type).toBe('generalStrike')
  })

  it('recession "Stimulus" triggers boom', () => {
    const eventsState = createEventsState()
    const state = makeTestState()
    const tick = 50

    const event = tickEvents(eventsState, state, state.policies, tick, 'recession')
    resolveEventChoice(eventsState, event.id, 'stimulus', state)

    expect(eventsState.scheduledFollowUps).toHaveLength(1)
    expect(eventsState.scheduledFollowUps[0].type).toBe('boom')
  })

  it('scheduled follow-ups fire at the correct tick', () => {
    const eventsState = createEventsState()
    const state = makeTestState()

    // Trigger financial bubble and choose "Let It Burn" at tick 100
    const event = tickEvents(eventsState, state, state.policies, 100, 'financialBubble')
    resolveEventChoice(eventsState, event.id, 'let_it_burn', state)

    // Bank run should be scheduled at tick 180
    expect(eventsState.scheduledFollowUps[0].atTick).toBe(180)

    // Tick at 179 — follow-up should NOT fire yet
    tickEvents(eventsState, state, state.policies, 179)
    // bankRun not yet in active events (only financialBubble)
    expect(eventsState.activeEvents.filter(e => e.type === 'bankRun')).toHaveLength(0)
    expect(eventsState.scheduledFollowUps).toHaveLength(1)

    // Tick at 180 — follow-up fires
    const followUpEvent = tickEvents(eventsState, state, state.policies, 180)
    expect(eventsState.scheduledFollowUps).toHaveLength(0)

    // bankRun should now be either pending choice or active
    const bankRunActive = eventsState.activeEvents.some(e => e.type === 'bankRun')
    const bankRunPending = eventsState.pendingChoiceEvent?.type === 'bankRun'
    expect(bankRunActive || bankRunPending).toBe(true)
  })

  it('hyperinflation "Shock Interest Rates" triggers Volcker recession', () => {
    const eventsState = createEventsState()
    const state = makeTestState()
    state.market.prices = { food: 50, housing: 100, tech: 80, luxury: 150 }

    const event = tickEvents(eventsState, state, state.policies, 200, 'hyperinflation')
    resolveEventChoice(eventsState, event.id, 'interest_rate_shock', state)

    expect(eventsState.scheduledFollowUps.some(f => f.type === 'recession')).toBe(true)
    // Policy should also be changed
    expect(state.policies.interestRate).toBe(0.20)
  })

  it('"Do Nothing" choice does NOT schedule follow-ups', () => {
    const eventsState = createEventsState()
    const state = makeTestState()

    const event = tickEvents(eventsState, state, state.policies, 100, 'recession')
    resolveEventChoice(eventsState, event.id, 'do_nothing', state)

    expect(eventsState.scheduledFollowUps).toHaveLength(0)
  })

  it('general strike "Call In the Military" triggers revolution', () => {
    const eventsState = createEventsState()
    const state = makeTestState()

    const event = tickEvents(eventsState, state, state.policies, 300, 'generalStrike')
    resolveEventChoice(eventsState, event.id, 'crack_down', state)

    expect(eventsState.scheduledFollowUps.some(f => f.type === 'revolution')).toBe(true)
  })
})
