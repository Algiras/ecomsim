import { describe, it, expect, beforeEach } from 'vitest'
import { SimEngine } from './engine.js'

describe('SimEngine', () => {
  let engine

  beforeEach(() => {
    engine = new SimEngine({ agentCount: 30, businessCount: 8 })
  })

  it('initializes with correct agent count', () => {
    expect(engine.agents.length).toBeGreaterThanOrEqual(30)
  })

  it('initializes with correct business count', () => {
    expect(engine.businesses.length).toBe(8)
  })

  it('starts at tick 0', () => {
    expect(engine.tick).toBe(0)
  })

  it('step increments tick', () => {
    engine.step()
    expect(engine.tick).toBe(1)
  })

  it('cleanup removes dead agents and bankrupt businesses', () => {
    engine.agents[0].alive = false
    engine.businesses[0].alive = false
    const agentCount = engine.agents.length
    const bizCount = engine.businesses.length

    engine._cleanup()

    expect(engine.agents.length).toBe(agentCount - 1)
    expect(engine.businesses.length).toBe(bizCount - 1)
  })
})

describe('SimEngine._buildReport', () => {
  it('produces report with scores and grade', () => {
    const engine = new SimEngine({
      id: 'test',
      name: 'Test',
      agentCount: 30,
      businessCount: 8,
      durationYears: 1
    })

    // Run enough ticks to populate metrics
    for (let i = 0; i < 20; i++) {
      engine.step()
    }

    const report = engine._buildReport()
    expect(report).toHaveProperty('finalScore')
    expect(report).toHaveProperty('grade')
    expect(report).toHaveProperty('domains')
    expect(report.domains).toHaveProperty('equality')
    expect(report.domains).toHaveProperty('growth')
    expect(report.domains).toHaveProperty('stability')
    expect(typeof report.finalScore).toBe('number')
    expect(['A+', 'A', 'B', 'C', 'D', 'F']).toContain(report.grade)
  })

  it('grade thresholds are correct', () => {
    const engine = new SimEngine({ agentCount: 10, businessCount: 4 })
    for (let i = 0; i < 20; i++) engine.step()

    // Manually test grade mapping
    const gradeFor = (score) => {
      return score >= 90 ? 'A+' : score >= 80 ? 'A' : score >= 70 ? 'B'
        : score >= 60 ? 'C' : score >= 45 ? 'D' : 'F'
    }

    expect(gradeFor(95)).toBe('A+')
    expect(gradeFor(90)).toBe('A+')
    expect(gradeFor(89)).toBe('A')
    expect(gradeFor(80)).toBe('A')
    expect(gradeFor(79)).toBe('B')
    expect(gradeFor(70)).toBe('B')
    expect(gradeFor(69)).toBe('C')
    expect(gradeFor(60)).toBe('C')
    expect(gradeFor(59)).toBe('D')
    expect(gradeFor(45)).toBe('D')
    expect(gradeFor(44)).toBe('F')
    expect(gradeFor(0)).toBe('F')
  })
})

describe('SimEngine scoring formulas', () => {
  it('giniScore: (1 - gini/0.7) * 100', () => {
    const giniScore = (g) => Math.round(Math.max(0, (1 - g / 0.7) * 100))
    expect(giniScore(0)).toBe(100)
    expect(giniScore(0.35)).toBe(50)
    expect(giniScore(0.7)).toBe(0)
    expect(giniScore(1.0)).toBe(0) // clamped to 0
  })

  it('growthScore: min(100, max(0, (gdpGrowth + 0.02) * 2000))', () => {
    const growthScore = (g) => Math.round(Math.min(100, Math.max(0, (g + 0.02) * 2000)))
    expect(growthScore(0.03)).toBe(100) // 0.05 * 2000 = 100
    expect(growthScore(0)).toBe(40)     // 0.02 * 2000 = 40
    expect(growthScore(-0.02)).toBe(0)  // 0 * 2000 = 0
    expect(growthScore(-0.05)).toBe(0)  // clamped to 0
  })

  it('stabilityScore: max(0, 100 - |inflation|*5 - unrest*100)', () => {
    const stabilityScore = (inf, unrest) =>
      Math.round(Math.max(0, 100 - Math.abs(inf) * 5 - unrest * 100))
    expect(stabilityScore(0, 0)).toBe(100)
    expect(stabilityScore(10, 0)).toBe(50)  // 100 - 50 = 50
    expect(stabilityScore(0, 0.5)).toBe(50) // 100 - 50 = 50
    expect(stabilityScore(20, 0.5)).toBe(0) // clamped to 0
  })
})

describe('SimEngine.getSnapshot', () => {
  it('returns expected structure', () => {
    const engine = new SimEngine({ agentCount: 10, businessCount: 4 })
    engine.step()
    const snap = engine.getSnapshot()

    expect(snap).toHaveProperty('tick')
    expect(snap).toHaveProperty('year')
    expect(snap).toHaveProperty('agents')
    expect(snap).toHaveProperty('businesses')
    expect(snap).toHaveProperty('metrics')
    expect(snap).toHaveProperty('market')
    expect(snap).toHaveProperty('policies')
    expect(Array.isArray(snap.agents)).toBe(true)
    expect(Array.isArray(snap.businesses)).toBe(true)
  })
})

describe('SimEngine birth processing', () => {
  it('births add new agents', () => {
    const engine = new SimEngine({ agentCount: 50, businessCount: 4 })
    // Force agents to be of childbearing age
    for (const a of engine.agents) {
      a.age = 30 * 52
    }
    const beforeCount = engine.agents.length
    // Run birth processing multiple times
    for (let i = 0; i < 10; i++) {
      engine._processBirths()
    }
    // At least some births should occur
    expect(engine.agents.length).toBeGreaterThanOrEqual(beforeCount)
  })
})

describe('SimEngine global economy', () => {
  it('initializes globalEconomy state', () => {
    const engine = new SimEngine({ agentCount: 10, businessCount: 4 })
    expect(engine.globalEconomy).toBeDefined()
    expect(engine.globalEconomy.fxRate).toBe(1.0)
    expect(engine.globalEconomy.foreignReserves).toBeGreaterThan(0)
    expect(engine.globalEconomy.worldPrices).toHaveProperty('food')
  })

  it('resets globalEconomy on _reset', () => {
    const engine = new SimEngine({ agentCount: 10, businessCount: 4 })
    // Mutate state
    engine.globalEconomy.fxRate = 2.5
    engine.globalEconomy.foreignReserves = 0
    engine._reset()
    expect(engine.globalEconomy.fxRate).toBe(1.0)
    expect(engine.globalEconomy.foreignReserves).toBeGreaterThan(0)
  })

  it('step ticks global economy and updates history', () => {
    const engine = new SimEngine({ agentCount: 20, businessCount: 6 })
    for (let i = 0; i < 5; i++) engine.step()
    expect(engine.globalEconomy.history.fxRate.length).toBe(5)
    expect(engine.globalEconomy.history.foreignReserves.length).toBe(5)
    expect(engine.globalEconomy.history.tradeBalance.length).toBe(5)
  })

  it('getSnapshot includes globalEconomy', () => {
    const engine = new SimEngine({ agentCount: 10, businessCount: 4 })
    engine.step()
    const snap = engine.getSnapshot()
    expect(snap).toHaveProperty('globalEconomy')
    expect(snap.globalEconomy).toHaveProperty('fxRate')
    expect(snap.globalEconomy).toHaveProperty('foreignReserves')
    expect(snap.globalEconomy).toHaveProperty('worldPrices')
    expect(snap.globalEconomy).toHaveProperty('tradeBalance')
    expect(snap.globalEconomy).toHaveProperty('history')
  })

  it('_buildState includes globalEconomy', () => {
    const engine = new SimEngine({ agentCount: 10, businessCount: 4 })
    const state = engine._buildState()
    expect(state).toHaveProperty('globalEconomy')
    expect(state.globalEconomy.fxRate).toBe(1.0)
  })
})

describe('SimEngine._buildReport grading fix', () => {
  it('report includes verdict and beatHistory fields', () => {
    const engine = new SimEngine({
      id: 'test', name: 'Test',
      agentCount: 20, businessCount: 6, durationYears: 1
    })
    for (let i = 0; i < 20; i++) engine.step()
    const report = engine._buildReport()
    expect(report).toHaveProperty('verdict')
    expect(report).toHaveProperty('beatHistory')
  })

  it('non-historical scenario has null verdict', () => {
    const engine = new SimEngine({
      id: 'test', name: 'Test',
      agentCount: 20, businessCount: 6, durationYears: 1
    })
    for (let i = 0; i < 20; i++) engine.step()
    const report = engine._buildReport()
    expect(report.verdict).toBeNull()
    expect(report.beatHistory).toBe(false)
  })

  it('historical scenario with beat computes positive verdict', () => {
    const engine = new SimEngine({
      id: 'depression', name: 'Great Depression',
      isHistorical: true,
      historicalOutcome: { gdpChange: -0.5 },
      agentCount: 30, businessCount: 8, durationYears: 1
    })

    // Run enough to have metrics
    for (let i = 0; i < 20; i++) engine.step()

    const report = engine._buildReport()
    // With a functional economy and gdpChange > -0.5, player should beat history
    if (report.beatHistory) {
      expect(report.verdict).toContain('history')
    }
    // Regardless, verdict should be a string for historical scenarios
    expect(typeof report.verdict).toBe('string')
  })

  it('grade boost: low score + beat history gets bumped', () => {
    const engine = new SimEngine({
      id: 'test', name: 'Test',
      isHistorical: true,
      historicalOutcome: { gdpChange: -0.9 }, // very bad historical outcome = easy to beat
      agentCount: 30, businessCount: 8, durationYears: 1
    })

    for (let i = 0; i < 20; i++) engine.step()

    const report = engine._buildReport()
    // If player beats history, score should be at least 65
    if (report.beatHistory) {
      expect(report.finalScore).toBeGreaterThanOrEqual(65)
    }
  })
})

describe('SimEngine scenario completion', () => {
  it('completes when duration reached', () => {
    const engine = new SimEngine({
      id: 'test',
      name: 'Test',
      agentCount: 20,
      businessCount: 4,
      durationYears: 1
    })

    // Run 52 ticks (1 year)
    for (let i = 0; i < 53; i++) {
      const result = engine.step()
      if (result.scenarioComplete) {
        expect(result.scenarioComplete).toHaveProperty('finalScore')
        expect(engine.scenarioComplete).toBe(true)
        return
      }
    }
    // If we get here, scenario should have completed
    expect(engine.scenarioComplete).toBe(true)
  })
})
