import { describe, it, expect } from 'vitest'
import { negotiateWage, computeAverageWage, computeWageDistribution, runLaborMarket } from './labor.js'
import { WAGE_NEGOTIATION_POWER } from '../utils/constants.js'

function makeAgent(overrides = {}) {
  return {
    id: overrides.id ?? 1,
    alive: true,
    state: overrides.state ?? 'unemployed',
    employed: overrides.employed ?? false,
    isOwner: false,
    wage: overrides.wage ?? 0,
    skill: overrides.skill ?? 0.5,
    education: overrides.education ?? 0.5,
    age: overrides.age ?? 30 * 52,
    x: overrides.x ?? 100,
    y: overrides.y ?? 100,
    employerId: null,
    jobSector: null,
    unemployedTicks: 0,
    workHistory: [],
    events: [],
    hire(biz, wage) {
      this.employed = true
      this.employerId = biz.id
      this.wage = wage
      this.jobSector = biz.sector
      this.state = 'working'
    },
    fire() {
      this.employed = false
      this.employerId = null
      this.wage = 0
    },
    _updateState() {}
  }
}

function makeBusiness(overrides = {}) {
  return {
    id: overrides.id ?? 1,
    alive: true,
    sector: overrides.sector ?? 'food',
    wageOffered: overrides.wageOffered ?? 15,
    employees: overrides.employees ?? [],
    maxEmployees: overrides.maxEmployees ?? 10,
    capital: overrides.capital ?? 1000,
    hiringCooldown: 0,
    x: overrides.x ?? 100,
    y: overrides.y ?? 100
  }
}

// ─── negotiateWage ──────────────────────────────────────────────────────────

describe('negotiateWage', () => {
  it('returns at least minWage', () => {
    const wage = negotiateWage(
      makeBusiness({ wageOffered: 5 }),
      makeAgent({ skill: 0.1, education: 0.1 }),
      { minWage: 15 }
    )
    expect(wage).toBeGreaterThanOrEqual(15)
  })

  it('higher skill gets higher wage', () => {
    const biz = makeBusiness({ wageOffered: 15 })
    const lowSkill = negotiateWage(biz, makeAgent({ skill: 0.2, education: 0.2 }), {})
    const highSkill = negotiateWage(biz, makeAgent({ skill: 0.9, education: 0.9 }), {})
    expect(highSkill).toBeGreaterThan(lowSkill)
  })

  it('computes correct formula', () => {
    const biz = makeBusiness({ wageOffered: 20 })
    const agent = makeAgent({ skill: 0.6, education: 0.4 })
    // skillPremium = 0.6*10 + 0.4*5 = 8
    // negotiated = 20*(1-0.3) + 8*0.3 = 14 + 2.4 = 16.4
    // Phillips curve: tightness = 1 - 0.1 = 0.9, bonus = 0.9^3 * 0.3 ≈ 0.2187
    // final = 16.4 * 1.2187 ≈ 19.987
    const wage = negotiateWage(biz, agent, {}, { metrics: { unemployment: 0.1 } })
    expect(wage).toBeCloseTo(19.987, 1)
  })

  it('with zero min wage, can go below base wage for low skill', () => {
    const wage = negotiateWage(
      makeBusiness({ wageOffered: 10 }),
      makeAgent({ skill: 0.1, education: 0.0 }),
      { minWage: 0 }
    )
    expect(wage).toBeLessThan(10) // skill premium is low
  })
})

// ─── computeAverageWage ─────────────────────────────────────────────────────

describe('computeAverageWage', () => {
  it('computes average of employed agents wages', () => {
    const agents = [
      makeAgent({ employed: true, wage: 10, id: 1 }),
      makeAgent({ employed: true, wage: 20, id: 2 }),
      makeAgent({ employed: true, wage: 30, id: 3 })
    ]
    expect(computeAverageWage(agents)).toBe(20)
  })

  it('excludes unemployed agents', () => {
    const agents = [
      makeAgent({ employed: true, wage: 20 }),
      makeAgent({ employed: false, wage: 0, id: 2 })
    ]
    expect(computeAverageWage(agents)).toBe(20)
  })

  it('returns 0 when nobody employed', () => {
    expect(computeAverageWage([makeAgent({ employed: false })])).toBe(0)
  })
})

// ─── computeWageDistribution ────────────────────────────────────────────────

describe('computeWageDistribution', () => {
  it('returns array of wages for employed agents', () => {
    const agents = [
      makeAgent({ employed: true, wage: 15 }),
      makeAgent({ employed: true, wage: 25, id: 2 }),
      makeAgent({ employed: false, wage: 0, id: 3 })
    ]
    const dist = computeWageDistribution(agents)
    expect(dist).toEqual([15, 25])
  })
})

// ─── runLaborMarket ─────────────────────────────────────────────────────────

describe('runLaborMarket', () => {
  it('matches unemployed agents to hiring businesses', () => {
    const agent = makeAgent({ skill: 0.8, education: 0.6 })
    const biz = makeBusiness({ capital: 500 })
    const state = { agents: [agent], businesses: [biz] }

    runLaborMarket(state, { minWage: 10 })

    expect(agent.employed).toBe(true)
    expect(agent.employerId).toBe(biz.id)
    expect(biz.employees).toContain(agent.id)
  })

  it('does nothing if no unemployed agents', () => {
    const agent = makeAgent({ state: 'working', employed: true })
    const biz = makeBusiness()
    const state = { agents: [agent], businesses: [biz] }

    runLaborMarket(state, {})
    expect(biz.employees.length).toBe(0)
  })

  it('does nothing if no hiring businesses', () => {
    const agent = makeAgent()
    const biz = makeBusiness({ employees: Array(10).fill(0), maxEmployees: 10 })
    const state = { agents: [agent], businesses: [biz] }

    runLaborMarket(state, {})
    expect(agent.employed).toBe(false)
  })

  it('prefers higher-skilled candidates', () => {
    const lowSkill = makeAgent({ id: 1, skill: 0.2, education: 0.2 })
    const highSkill = makeAgent({ id: 2, skill: 0.9, education: 0.8 })
    const biz = makeBusiness({ capital: 500, maxEmployees: 1 })
    const state = { agents: [lowSkill, highSkill], businesses: [biz] }

    runLaborMarket(state, {})
    expect(highSkill.employed).toBe(true)
    expect(lowSkill.employed).toBe(false)
  })

  it('does not hire if business cannot afford wage', () => {
    const agent = makeAgent({ skill: 0.5 })
    const biz = makeBusiness({ capital: 1, wageOffered: 100 })
    const state = { agents: [agent], businesses: [biz] }

    runLaborMarket(state, {})
    expect(agent.employed).toBe(false)
  })
})
