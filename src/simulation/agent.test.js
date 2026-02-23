import { describe, it, expect } from 'vitest'
import { Agent, AgentState, createInitialAgents } from './agent.js'
import {
  WORKING_AGE, RETIREMENT_AGE, MAX_AGE,
  POVERTY_THRESHOLD, RICH_THRESHOLD, INITIAL_WEALTH_MEAN
} from '../utils/constants.js'

function makeState(overrides = {}) {
  return {
    agents: overrides.agents ?? [],
    businesses: overrides.businesses ?? [],
    prices: overrides.prices ?? { food: 10, housing: 50, tech: 30, luxury: 80 },
    metrics: overrides.metrics ?? { gini: 0.3 },
    policies: overrides.policies ?? {}
  }
}

function makeBusiness(overrides = {}) {
  return {
    id: overrides.id ?? 1,
    alive: overrides.alive ?? true,
    sector: overrides.sector ?? 'food',
    employees: overrides.employees ?? [],
    name: 'TestBiz',
    _close(state, reason) {
      this.alive = false
      this.employees = []
    }
  }
}

// ─── Agent constructor ──────────────────────────────────────────────────────

describe('Agent constructor', () => {
  it('creates alive agent with defaults', () => {
    const agent = new Agent({ age: 30 * 52 })
    expect(agent.alive).toBe(true)
    expect(agent.employed).toBe(false)
    expect(agent.happiness).toBe(0.5)
  })

  it('applies overrides', () => {
    const agent = new Agent({ wealth: 999, skill: 0.9, age: 25 * 52 })
    expect(agent.wealth).toBe(999)
    expect(agent.skill).toBe(0.9)
  })
})

// ─── _updateState ───────────────────────────────────────────────────────────

describe('Agent._updateState', () => {
  it('child when under working age', () => {
    const agent = new Agent({ age: 10 * 52 })
    expect(agent.state).toBe(AgentState.CHILD)
  })

  it('retired when over retirement age', () => {
    const agent = new Agent({ age: RETIREMENT_AGE + 1 })
    expect(agent.state).toBe(AgentState.RETIRED)
  })

  it('working when employed', () => {
    const agent = new Agent({ age: 30 * 52 })
    agent.employed = true
    agent._updateState()
    expect(agent.state).toBe(AgentState.WORKING)
  })

  it('unemployed when not employed', () => {
    const agent = new Agent({ age: 30 * 52 })
    agent.employed = false
    agent.isOwner = false
    agent._updateState()
    expect(agent.state).toBe(AgentState.UNEMPLOYED)
  })

  it('owner when isOwner', () => {
    const agent = new Agent({ age: 30 * 52 })
    agent.isOwner = true
    agent._updateState()
    expect(agent.state).toBe(AgentState.BUSINESS_OWNER)
  })

  it('poor social class when below poverty threshold', () => {
    const agent = new Agent({ age: 30 * 52, wealth: POVERTY_THRESHOLD - 1 })
    expect(agent.socialClass).toBe('poor')
  })

  it('rich social class when above rich threshold', () => {
    const agent = new Agent({ age: 30 * 52, wealth: RICH_THRESHOLD + 1 })
    expect(agent.socialClass).toBe('rich')
  })

  it('middle class in between', () => {
    const agent = new Agent({ age: 30 * 52, wealth: 500 })
    expect(agent.socialClass).toBe('middle')
  })
})

// ─── _shouldDie ─────────────────────────────────────────────────────────────

describe('Agent._shouldDie', () => {
  it('returns true at MAX_AGE', () => {
    const agent = new Agent({ age: MAX_AGE })
    expect(agent._shouldDie({})).toBe(true)
  })

  it('returns false for healthy young agent (with high probability)', () => {
    const agent = new Agent({ age: 25 * 52, health: 1.0 })
    // Run many times — should almost never die
    let deaths = 0
    for (let i = 0; i < 10000; i++) {
      if (agent._shouldDie({})) deaths++
    }
    expect(deaths).toBeLessThan(100) // very unlikely to die
  })

  it('public healthcare reduces death chance', () => {
    const agent = new Agent({ age: 70 * 52, health: 0 })
    let deathsNoHealth = 0
    let deathsHealth = 0
    const TRIALS = 1_000_000
    for (let i = 0; i < TRIALS; i++) {
      if (agent._shouldDie({})) deathsNoHealth++
      if (agent._shouldDie({ publicHealthcare: true })) deathsHealth++
    }
    // Healthcare multiplier is 0.5 — with 1M trials the signal is clear
    // Allow 20% margin so the test is robust against variance
    expect(deathsHealth).toBeLessThan(deathsNoHealth * 0.8)
    expect(deathsHealth).toBeGreaterThan(0) // still some deaths
  })
})

// ─── _die ───────────────────────────────────────────────────────────────────

describe('Agent._die', () => {
  it('sets agent to dead state', () => {
    const agent = new Agent({ age: 80 * 52 })
    agent._die(makeState({ agents: [agent] }), 'natural causes')
    expect(agent.alive).toBe(false)
    expect(agent.state).toBe(AgentState.DEAD)
  })

  it('passes inheritance to a living agent', () => {
    const dying = new Agent({ id: 1, age: 80 * 52, wealth: 1000 })
    const heir = new Agent({ id: 2, age: 30 * 52, wealth: 100 })
    dying._die(makeState({ agents: [dying, heir] }), 'natural causes')
    // heir gets 80% of 1000 = 800
    expect(heir.wealth).toBe(900)
  })

  it('closes owned business when owner dies', () => {
    const biz = makeBusiness({ id: 5 })
    const owner = new Agent({ id: 1, age: 80 * 52, wealth: 500 })
    owner.isOwner = true
    owner.businessId = 5

    owner._die(makeState({ agents: [owner], businesses: [biz] }), 'natural causes')

    expect(biz.alive).toBe(false)
    expect(owner.isOwner).toBe(false)
    expect(owner.businessId).toBe(null)
  })

  it('removes dead agent from employer employee list', () => {
    const biz = makeBusiness({ id: 1, employees: [1, 2, 3] })
    const agent = new Agent({ id: 2, age: 80 * 52, wealth: 100 })
    agent.employed = true
    agent.employerId = 1

    agent._die(makeState({ agents: [agent], businesses: [biz] }), 'natural causes')

    expect(biz.employees).toEqual([1, 3])
  })
})

// ─── _earnIncome ────────────────────────────────────────────────────────────

describe('Agent._earnIncome', () => {
  it('earns wage minus income tax when employed', () => {
    const agent = new Agent({ age: 30 * 52, wealth: 0 })
    agent.employed = true
    agent.wage = 100
    agent._earnIncome({ incomeTax: 0.25 })
    expect(agent.income).toBe(75) // 100 * (1 - 0.25)
    expect(agent.wealth).toBe(75)
  })

  it('earns unemployment benefit when unemployed', () => {
    const agent = new Agent({ age: 30 * 52, wealth: 0 })
    agent.state = AgentState.UNEMPLOYED
    agent._earnIncome({ unemploymentBenefit: 50 })
    expect(agent.income).toBe(5) // 50 * 0.1
  })

  it('receives UBI', () => {
    const agent = new Agent({ age: 30 * 52, wealth: 0 })
    agent.state = AgentState.UNEMPLOYED
    agent._earnIncome({ ubi: 100, unemploymentBenefit: 0 })
    expect(agent.income).toBe(1) // 100 * 0.01
  })

  it('children do not receive UBI', () => {
    const agent = new Agent({ age: 5 * 52, wealth: 0 })
    agent._earnIncome({ ubi: 100 })
    expect(agent.income).toBe(0)
  })
})

// ─── _updateHappiness ───────────────────────────────────────────────────────

describe('Agent._updateHappiness', () => {
  it('employed agents are happier', () => {
    const employed = new Agent({ age: 30 * 52, wealth: 500 })
    employed.employed = true
    employed._updateHappiness(makeState(), {})

    const unemployed = new Agent({ age: 30 * 52, wealth: 500 })
    unemployed.employed = false
    unemployed._updateHappiness(makeState(), {})

    expect(employed.happiness).toBeGreaterThan(unemployed.happiness)
  })

  it('wealth increases happiness', () => {
    const rich = new Agent({ age: 30 * 52, wealth: 5000 })
    rich._updateHappiness(makeState(), {})

    const poor = new Agent({ age: 30 * 52, wealth: 10 })
    poor._updateHappiness(makeState(), {})

    expect(rich.happiness).toBeGreaterThan(poor.happiness)
  })

  it('high inequality reduces happiness', () => {
    const agent1 = new Agent({ age: 30 * 52, wealth: 500 })
    agent1._updateHappiness(makeState({ metrics: { gini: 0.3 } }), {})

    const agent2 = new Agent({ age: 30 * 52, wealth: 500 })
    agent2._updateHappiness(makeState({ metrics: { gini: 0.7 } }), {})

    expect(agent1.happiness).toBeGreaterThan(agent2.happiness)
  })

  it('public healthcare improves happiness', () => {
    // Pin health to a fixed value so random initialization doesn't affect comparison
    const noHealth = new Agent({ age: 30 * 52, wealth: 500, health: 0.8 })
    noHealth._updateHappiness(makeState(), {})

    const withHealth = new Agent({ age: 30 * 52, wealth: 500, health: 0.8 })
    withHealth._updateHappiness(makeState(), { publicHealthcare: true })

    expect(withHealth.happiness).toBeGreaterThan(noHealth.happiness)
  })

  it('happiness is clamped to [0, 1]', () => {
    const agent = new Agent({ age: 30 * 52, wealth: 100000 })
    agent.employed = true
    agent._updateHappiness(makeState(), { publicHealthcare: true })
    expect(agent.happiness).toBeLessThanOrEqual(1)
    expect(agent.happiness).toBeGreaterThanOrEqual(0)
  })

  it('unrest is inverse of happiness', () => {
    const agent = new Agent({ age: 30 * 52, wealth: 10 })
    agent.employed = false
    agent._updateHappiness(makeState({ metrics: { gini: 0.8 } }), {})
    expect(agent.unrest).toBeGreaterThan(0)
  })
})

// ─── hire / fire ────────────────────────────────────────────────────────────

describe('Agent hire/fire', () => {
  it('hire sets employment state', () => {
    const agent = new Agent({ age: 30 * 52 })
    agent.hire({ id: 1, name: 'TestBiz', sector: 'food' }, 25)
    expect(agent.employed).toBe(true)
    expect(agent.employerId).toBe(1)
    expect(agent.wage).toBe(25)
    expect(agent.jobSector).toBe('food')
    expect(agent.state).toBe(AgentState.WORKING)
  })

  it('fire clears employment state', () => {
    const agent = new Agent({ age: 30 * 52 })
    agent.hire({ id: 1, name: 'TestBiz', sector: 'food' }, 25)
    agent.fire('layoff')
    expect(agent.employed).toBe(false)
    expect(agent.employerId).toBe(null)
    expect(agent.wage).toBe(0)
    expect(agent.state).toBe(AgentState.UNEMPLOYED)
  })
})

// ─── createInitialAgents ────────────────────────────────────────────────────

describe('createInitialAgents', () => {
  it('creates correct count', () => {
    const agents = createInitialAgents(50)
    expect(agents.length).toBe(50)
  })

  it('all agents are alive', () => {
    const agents = createInitialAgents(20)
    expect(agents.every(a => a.alive)).toBe(true)
  })

  it('respects scenario wealth multiplier', () => {
    const normal = createInitialAgents(100)
    const rich = createInitialAgents(100, { wealthMultiplier: 3 })
    const avgNormal = normal.reduce((s, a) => s + a.wealth, 0) / normal.length
    const avgRich = rich.reduce((s, a) => s + a.wealth, 0) / rich.length
    expect(avgRich).toBeGreaterThan(avgNormal * 1.5)
  })
})
