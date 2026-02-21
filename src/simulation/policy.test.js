import { describe, it, expect } from 'vitest'
import { createPolicyState, applyPolicyEffects, validatePolicy } from './policy.js'
import { DEFAULT_POLICIES, INITIAL_PRICES } from '../utils/constants.js'

function makeAgent(overrides = {}) {
  return {
    id: overrides.id ?? 1,
    alive: true,
    state: overrides.state ?? 'working',
    employed: overrides.employed ?? true,
    isOwner: false,
    wage: overrides.wage ?? 20,
    wealth: overrides.wealth ?? 500,
    health: overrides.health ?? 0.5,
    skill: overrides.skill ?? 0.5,
    education: overrides.education ?? 0.5,
    happiness: 0.5,
    age: overrides.age ?? 30 * 52,
    _govJob: false,
    _sumptuaryLimited: false,
    ...overrides
  }
}

function makeBusiness(overrides = {}) {
  return {
    id: overrides.id ?? 1,
    alive: true,
    sector: overrides.sector ?? 'food',
    wageOffered: overrides.wageOffered ?? 15,
    capital: overrides.capital ?? 1000,
    employees: overrides.employees ?? [1],
    production: overrides.production ?? 10,
    profit: overrides.profit ?? 5,
    maxEmployees: overrides.maxEmployees ?? 10,
    dominance: overrides.dominance ?? 0,
    _nationalized: false,
    ...overrides
  }
}

function makeState(agents, businesses) {
  return { agents, businesses }
}

function makeMarket() {
  return { prices: { ...INITIAL_PRICES } }
}

// ─── createPolicyState ──────────────────────────────────────────────────────

describe('createPolicyState', () => {
  it('returns defaults', () => {
    const policies = createPolicyState()
    expect(policies.incomeTax).toBe(DEFAULT_POLICIES.incomeTax)
    expect(policies.minWage).toBe(DEFAULT_POLICIES.minWage)
  })

  it('applies overrides', () => {
    const policies = createPolicyState({ incomeTax: 0.5, minWage: 30 })
    expect(policies.incomeTax).toBe(0.5)
    expect(policies.minWage).toBe(30)
  })
})

// ─── validatePolicy ─────────────────────────────────────────────────────────

describe('validatePolicy', () => {
  it('clamps incomeTax to [0, 0.6]', () => {
    expect(validatePolicy('incomeTax', -0.1)).toBe(0)
    expect(validatePolicy('incomeTax', 0.9)).toBe(0.6)
    expect(validatePolicy('incomeTax', 0.3)).toBe(0.3)
  })

  it('clamps minWage to [0, 50]', () => {
    expect(validatePolicy('minWage', 100)).toBe(50)
    expect(validatePolicy('minWage', -5)).toBe(0)
  })

  it('passes through boolean policies', () => {
    expect(validatePolicy('antiMonopoly', true)).toBe(true)
    expect(validatePolicy('publicHealthcare', false)).toBe(false)
  })
})

// ─── applyPolicyEffects ─────────────────────────────────────────────────────

describe('applyPolicyEffects', () => {
  it('enforces minimum wage on businesses', () => {
    const biz = makeBusiness({ wageOffered: 5 })
    const state = makeState([makeAgent()], [biz])
    applyPolicyEffects(state, { ...DEFAULT_POLICIES, minWage: 20 }, makeMarket())
    expect(biz.wageOffered).toBe(20)
  })

  it('anti-monopoly reduces maxEmployees for dominant businesses', () => {
    const biz = makeBusiness({ dominance: 0.7, maxEmployees: 20 })
    const state = makeState([], [biz])
    applyPolicyEffects(state, { ...DEFAULT_POLICIES, antiMonopoly: true }, makeMarket())
    expect(biz.maxEmployees).toBe(18) // floor(20 * 0.9)
  })

  it('interest rate drains business capital', () => {
    const biz = makeBusiness({ capital: 1000 })
    const state = makeState([], [biz])
    applyPolicyEffects(state, { ...DEFAULT_POLICIES, interestRate: 0.15 }, makeMarket())
    expect(biz.capital).toBeLessThan(1000)
  })

  it('money printing injects wealth into agents', () => {
    const agent = makeAgent({ wealth: 100 })
    const state = makeState([agent], [])
    applyPolicyEffects(state, { ...DEFAULT_POLICIES, printMoney: 50 }, makeMarket())
    expect(agent.wealth).toBeGreaterThan(100)
  })

  it('four-day week reduces production by ~18%', () => {
    const biz = makeBusiness({ production: 100 })
    const state = makeState([], [biz])
    applyPolicyEffects(state, { ...DEFAULT_POLICIES, fourDayWeek: true }, makeMarket())
    expect(biz.production).toBeCloseTo(82, 0)
  })

  it('robot tax drains tech business capital', () => {
    const biz = makeBusiness({ sector: 'tech', capital: 1000 })
    const state = makeState([], [biz])
    applyPolicyEffects(state, { ...DEFAULT_POLICIES, robotTax: 0.3 }, makeMarket())
    expect(biz.capital).toBeLessThan(1000)
  })

  it('mandatory profit sharing redistributes to employees', () => {
    const agent = makeAgent({ id: 1, wealth: 100 })
    const biz = makeBusiness({ capital: 1000, employees: [1] })
    const state = makeState([agent], [biz])
    applyPolicyEffects(state, { ...DEFAULT_POLICIES, mandatoryProfitShare: 0.2 }, makeMarket())
    expect(agent.wealth).toBeGreaterThan(100)
    expect(biz.capital).toBeLessThan(1000)
  })

  it('land value tax reduces wealthy agent wealth', () => {
    const agent = makeAgent({ wealth: 5000 })
    const state = makeState([agent], [])
    applyPolicyEffects(state, { ...DEFAULT_POLICIES, landValueTax: 0.03 }, makeMarket())
    expect(agent.wealth).toBeLessThan(5000)
  })

  it('debt jubilee resets negative wealth to zero', () => {
    const agent = makeAgent({ wealth: -300 })
    const state = makeState([agent], [])
    applyPolicyEffects(state, { ...DEFAULT_POLICIES, debtJubilee: true }, makeMarket())
    expect(agent.wealth).toBe(0)
    expect(state._jubileeApplied).toBe(true)
  })

  it('helicopter money adds wealth to all agents', () => {
    const agent = makeAgent({ wealth: 100 })
    const state = makeState([agent], [])
    applyPolicyEffects(state, { ...DEFAULT_POLICIES, helicopterMoney: 100 }, makeMarket())
    expect(agent.wealth).toBeGreaterThan(100)
  })

  it('maximum wage caps business wage offers', () => {
    const biz = makeBusiness({ wageOffered: 100 })
    const state = makeState([], [biz])
    applyPolicyEffects(state, { ...DEFAULT_POLICIES, maximumWage: 30 }, makeMarket())
    expect(biz.wageOffered).toBe(30)
  })

  it('wealth confiscation seizes wealth above threshold', () => {
    const agent = makeAgent({ wealth: 2000 })
    const state = makeState([agent], [])
    applyPolicyEffects(state, { ...DEFAULT_POLICIES, wealthConfiscation: 0.3 }, makeMarket())
    expect(agent.wealth).toBeLessThan(2000)
  })

  it('nationalize industries sets flat wage and production penalty', () => {
    const biz = makeBusiness({ wageOffered: 50, production: 100 })
    const state = makeState([], [biz])
    applyPolicyEffects(state, { ...DEFAULT_POLICIES, nationalizeIndustries: true, minWage: 15 }, makeMarket())
    expect(biz.wageOffered).toBe(15) // flat gov rate
    expect(biz.production).toBeCloseTo(92, 0) // 100 * 0.92
    expect(biz._nationalized).toBe(true)
  })

  it('punitive tariffs inflate prices', () => {
    const market = makeMarket()
    const initialFood = market.prices.food
    const state = makeState([], [])
    applyPolicyEffects(state, { ...DEFAULT_POLICIES, punitiveTargiffs: 1.0 }, market)
    expect(market.prices.food).toBeGreaterThan(initialFood)
  })

  it('guaranteed jobs employs all unemployed', () => {
    const agent = makeAgent({ employed: false, state: 'unemployed', age: 25 * 52 })
    const state = makeState([agent], [])
    applyPolicyEffects(state, { ...DEFAULT_POLICIES, guaranteedJobs: true, minWage: 12 }, makeMarket())
    expect(agent.employed).toBe(true)
    expect(agent._govJob).toBe(true)
  })
})
