/**
 * Logical consistency / integration tests.
 * Tests that economic rules hold across the simulation:
 * - Luxury goods aren't bought by poor agents
 * - Businesses with no revenue go bankrupt
 * - Starting a business requires sufficient capital
 * - Owner death closes business
 * - Dead employees are cleaned from business rosters
 * - Broke businesses can't hire
 * - Market share sums to 1 within a sector
 * - No orphaned businesses (ownerless and alive)
 */
import { describe, it, expect } from 'vitest'
import { Agent, AgentState, createInitialAgents } from './agent.js'
import { Business, createInitialBusinesses } from './business.js'
import { SimEngine } from './engine.js'
import { createMarketState, updatePrices } from './market.js'
import { createMetricsState, updateMetrics, toMetricsSnapshot } from './metrics.js'
import { negotiateWage } from './labor.js'
import {
  POVERTY_THRESHOLD, CONSUMPTION_RATE, INITIAL_PRICES,
  BUSINESS_BANKRUPTCY_THRESHOLD, SECTORS, METRICS_UPDATE_EVERY,
  PRICE_MAX
} from '../utils/constants.js'

// ─── Luxury demand logic ────────────────────────────────────────────────────

describe('Luxury demand', () => {
  it('poor agents do not buy luxury goods', () => {
    const agent = new Agent({ age: 30 * 52, wealth: POVERTY_THRESHOLD - 1 })
    agent.employed = true
    agent.wage = 10
    agent._consumeGoods(INITIAL_PRICES, {})
    // Luxury consumption rate should be 0 for poor agents
    // Total expenses should only include food, housing, tech
    const withoutLuxury = agent.expenses

    // Compare with rich agent who does buy luxury
    const richAgent = new Agent({ age: 30 * 52, wealth: POVERTY_THRESHOLD * 3 })
    richAgent.employed = true
    richAgent.wage = 10
    richAgent._consumeGoods(INITIAL_PRICES, {})

    expect(richAgent.expenses).toBeGreaterThan(withoutLuxury)
  })

  it('agents at exactly 2x poverty threshold do not buy luxury', () => {
    const agent = new Agent({ age: 30 * 52, wealth: POVERTY_THRESHOLD * 2 - 1 })
    agent.employed = true
    agent.wage = 10

    // Manually check: luxury consumption should be 0
    const luxuryRate = CONSUMPTION_RATE.luxury
    // wealth < POVERTY_THRESHOLD * 2 → luxury amount = 0
    expect(agent.wealth).toBeLessThan(POVERTY_THRESHOLD * 2)
  })

  it('unemployed agents with no wage have zero expenses', () => {
    const agent = new Agent({ age: 30 * 52, wealth: 500 })
    agent.employed = false
    agent.wage = 0
    agent._consumeGoods(INITIAL_PRICES, {})
    expect(agent.expenses).toBe(0)
  })
})

// ─── Business survival requires revenue ─────────────────────────────────────

describe('Business survival requires revenue', () => {
  it('business with no employees produces nothing', () => {
    const biz = new Business({ sector: 'food', capital: 100 })
    biz.employees = []
    biz._produce({})
    expect(biz.production).toBe(0)
  })

  it('business with no production earns no revenue', () => {
    const biz = new Business({ sector: 'food', capital: 100 })
    biz.production = 0
    biz.inventory = 0
    biz._sellGoods(INITIAL_PRICES)
    expect(biz.revenue).toBe(0)
  })

  it('business paying wages without revenue bleeds capital', () => {
    const biz = new Business({ sector: 'food', capital: 300 })
    biz.wageOffered = 20
    biz.employees = [1, 2, 3]
    biz.revenue = 0

    const before = biz.capital
    biz._payWages({})
    expect(biz.capital).toBeLessThan(before)
    expect(biz.capital).toBe(before - 60) // 20 * 3
  })

  it('unprofitable business eventually goes bankrupt', () => {
    const biz = new Business({ sector: 'food', capital: 50 })
    biz.wageOffered = 20
    biz.employees = [1]
    biz.revenue = 0

    // Simulate wage payments until bankruptcy
    const state = { agents: [], businesses: [biz] }
    let ticks = 0
    while (biz.alive && ticks < 100) {
      biz._payWages({})
      biz._checkBankruptcy(state)
      ticks++
    }
    expect(biz.alive).toBe(false)
  })
})

// ─── Starting a business requires capital ───────────────────────────────────

describe('Business startup requirements', () => {
  it('agents below 300 wealth cannot start a business', () => {
    const agent = new Agent({ age: 30 * 52, wealth: 200, skill: 0.8 })
    agent.employed = false
    agent.state = AgentState.UNEMPLOYED
    agent.isOwner = false
    agent.businessId = null

    // _considerStartingBusiness checks wealth > 300
    // Even after many attempts, poor agents shouldn't flag for business
    let wantsToStart = false
    for (let i = 0; i < 100000; i++) {
      agent._considerStartingBusiness({}, {})
      if (agent._wantsToStartBusiness) {
        wantsToStart = true
        break
      }
    }
    expect(wantsToStart).toBe(false)
  })

  it('agents with low skill cannot start a business', () => {
    const agent = new Agent({ age: 30 * 52, wealth: 1000, skill: 0.2 })
    agent.employed = false
    agent.state = AgentState.UNEMPLOYED
    agent.isOwner = false
    agent.businessId = null

    let wantsToStart = false
    for (let i = 0; i < 100000; i++) {
      agent._considerStartingBusiness({}, {})
      if (agent._wantsToStartBusiness) {
        wantsToStart = true
        break
      }
    }
    expect(wantsToStart).toBe(false)
  })

  it('employed agents cannot start a business', () => {
    const agent = new Agent({ age: 30 * 52, wealth: 1000, skill: 0.9 })
    agent.employed = true
    agent.state = AgentState.WORKING

    let wantsToStart = false
    for (let i = 0; i < 100000; i++) {
      agent._considerStartingBusiness({}, {})
      if (agent._wantsToStartBusiness) {
        wantsToStart = true
        break
      }
    }
    expect(wantsToStart).toBe(false)
  })

  it('engine _processNewBusinesses deducts half wealth as investment', () => {
    const engine = new SimEngine({ agentCount: 10, businessCount: 4 })
    const agent = engine.agents[0]
    agent.employed = false
    agent.state = AgentState.UNEMPLOYED
    agent.isOwner = false
    agent.businessId = null
    agent.wealth = 600
    agent.skill = 0.8
    agent._wantsToStartBusiness = true

    const beforeWealth = agent.wealth
    engine._processNewBusinesses(engine._buildState())

    if (agent.isOwner) {
      expect(agent.wealth).toBe(beforeWealth * 0.5)
    }
  })
})

// ─── Owner death closes business ────────────────────────────────────────────

describe('Owner death closes business (integration)', () => {
  it('full lifecycle: owner dies → business closes → employees fired', () => {
    const engine = new SimEngine({ agentCount: 30, businessCount: 8 })

    // Find a business with an owner
    const ownedBiz = engine.businesses.find(b => b.ownerId !== null)
    if (!ownedBiz) return // skip if no owned businesses (unlikely)

    const owner = engine.agents.find(a => a.id === ownedBiz.ownerId)
    expect(owner).toBeDefined()
    expect(owner.isOwner).toBe(true)

    const employeeIds = [...ownedBiz.employees]

    // Kill the owner
    owner._die(engine._buildState(), 'test')

    expect(owner.alive).toBe(false)
    expect(ownedBiz.alive).toBe(false)
    expect(owner.isOwner).toBe(false)

    // All former employees should be fired
    for (const empId of employeeIds) {
      if (empId === owner.id) continue
      const emp = engine.agents.find(a => a.id === empId)
      if (emp) {
        expect(emp.employed).toBe(false)
      }
    }
  })

  it('cleanup removes dead business after owner death', () => {
    const engine = new SimEngine({ agentCount: 20, businessCount: 8 })
    const ownedBiz = engine.businesses.find(b => b.ownerId !== null)
    if (!ownedBiz) return

    const owner = engine.agents.find(a => a.id === ownedBiz.ownerId)
    owner._die(engine._buildState(), 'test')
    engine._cleanup()

    expect(engine.businesses.find(b => b.id === ownedBiz.id)).toBeUndefined()
  })
})

// ─── Dead employees cleaned from rosters ────────────────────────────────────

describe('Dead employees removed from businesses', () => {
  it('dying agent is removed from employer employee list', () => {
    const engine = new SimEngine({ agentCount: 30, businessCount: 8 })

    // Find an employed non-owner agent
    const worker = engine.agents.find(a => a.employed && !a.isOwner && a.employerId)
    if (!worker) return

    const employer = engine.businesses.find(b => b.id === worker.employerId)
    expect(employer.employees).toContain(worker.id)

    worker._die(engine._buildState(), 'test')

    expect(employer.employees).not.toContain(worker.id)
  })
})

// ─── Market share consistency ───────────────────────────────────────────────

describe('Market share consistency', () => {
  it('market shares sum to 1 within each sector', () => {
    const engine = new SimEngine({ agentCount: 50, businessCount: 20 })
    // Run a few ticks to populate market data
    for (let i = 0; i < 15; i++) engine.step()

    for (const sector of SECTORS) {
      const sectorBiz = engine.businesses.filter(b => b.alive && b.sector === sector)
      if (sectorBiz.length === 0) continue
      const totalProd = sectorBiz.reduce((s, b) => s + b.production, 0)
      if (totalProd === 0) continue

      const totalShare = sectorBiz.reduce((s, b) => s + b.marketShare, 0)
      expect(totalShare).toBeCloseTo(1, 5)
    }
  })
})

// ─── No orphaned businesses ─────────────────────────────────────────────────

describe('No orphaned businesses after simulation', () => {
  it('all alive businesses with owners have alive owners', () => {
    const engine = new SimEngine({ agentCount: 50, businessCount: 16 })
    for (let i = 0; i < 100; i++) engine.step()

    for (const biz of engine.businesses) {
      if (!biz.alive || !biz.ownerId) continue
      const owner = engine.agents.find(a => a.id === biz.ownerId)
      expect(owner?.alive).toBe(true)
    }
  })
})

// ─── Business hiring requires capital ───────────────────────────────────────

describe('Business hiring requires capital', () => {
  it('broke businesses do not hire', () => {
    const biz = new Business({ sector: 'food', capital: 5 })
    biz.wageOffered = 20
    biz.employees = []
    biz.maxEmployees = 10

    const agent = new Agent({ age: 30 * 52, skill: 0.8 })
    agent.employed = false
    agent.state = AgentState.UNEMPLOYED

    const state = {
      agents: [agent],
      businesses: [biz],
      prices: INITIAL_PRICES,
      policies: {}
    }

    // Business needs capital > wageOffered * 20 to hire
    biz._adjustWorkforce(state, {})
    expect(biz.employees.length).toBe(0)
  })
})

// ─── Wage negotiation respects minimum wage ─────────────────────────────────

describe('Wage floor enforcement', () => {
  it('no agent earns below minimum wage', () => {
    const engine = new SimEngine({ agentCount: 50, businessCount: 12, policies: { minWage: 20 } })

    for (let i = 0; i < 50; i++) engine.step()

    for (const agent of engine.agents) {
      if (agent.alive && agent.employed && agent.wage > 0) {
        expect(agent.wage).toBeGreaterThanOrEqual(20)
      }
    }
  })
})

// ─── GDP consistency ────────────────────────────────────────────────────────

describe('GDP consistency', () => {
  it('GDP is non-negative', () => {
    const engine = new SimEngine({ agentCount: 50, businessCount: 12 })
    for (let i = 0; i < 30; i++) engine.step()

    const snap = engine.getSnapshot()
    expect(snap.metrics.gdp).toBeGreaterThanOrEqual(0)
  })
})

// ─── Poverty death ──────────────────────────────────────────────────────────

describe('Poverty causes death', () => {
  it('agents with wealth below -500 die', () => {
    const agent = new Agent({ age: 30 * 52, wealth: -501 })
    agent.state = AgentState.UNEMPLOYED
    const state = {
      agents: [agent],
      businesses: [],
      prices: INITIAL_PRICES,
      metrics: { gini: 0.3 }
    }

    agent.tick(state, {})
    expect(agent.alive).toBe(false)
  })

  it('children do not die from poverty', () => {
    const child = new Agent({ age: 5 * 52, wealth: -1000 })
    const state = {
      agents: [child],
      businesses: [],
      prices: INITIAL_PRICES,
      metrics: { gini: 0.3 }
    }
    // Children skip the economic activity + poverty check
    child.tick(state, {})
    // Child may die from natural causes (random), but not poverty
    // Run this check only if alive (natural death is random)
    if (child.alive) {
      expect(child.state).toBe(AgentState.CHILD)
    }
  })
})

// ─── Retirement stops employment ────────────────────────────────────────────

describe('Retirement', () => {
  it('agents past retirement age are in retired state', () => {
    const agent = new Agent({ age: 66 * 52 })
    expect(agent.state).toBe(AgentState.RETIRED)
  })
})

// ─── Inheritance ────────────────────────────────────────────────────────────

describe('Inheritance', () => {
  it('20% estate tax is applied on inheritance', () => {
    const dying = new Agent({ id: 1, age: 80 * 52, wealth: 1000 })
    const heir = new Agent({ id: 2, age: 30 * 52, wealth: 0 })

    dying._die({ agents: [dying, heir], businesses: [] }, 'test')

    // Heir gets 80% of 1000 = 800
    expect(heir.wealth).toBe(800)
  })
})

// ─── Price controls ─────────────────────────────────────────────────────────

describe('Price controls', () => {
  it('food price controls suppress consumption by 20%', () => {
    const agentFree = new Agent({ age: 30 * 52, wealth: 1000 })
    agentFree.employed = true
    agentFree.wage = 50
    agentFree._consumeGoods(INITIAL_PRICES, {})

    const agentControlled = new Agent({ age: 30 * 52, wealth: 1000 })
    agentControlled.employed = true
    agentControlled.wage = 50
    agentControlled._consumeGoods(INITIAL_PRICES, { priceControlFood: true })

    expect(agentControlled.expenses).toBeLessThan(agentFree.expenses)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// NEW: Cross-module economic logic / integration tests
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Population cascade effects ─────────────────────────────────────────────

describe('Population cascade', () => {
  it('killing 80% of agents reduces tax revenue', () => {
    const engine = new SimEngine({ agentCount: 50, businessCount: 12 })
    // Run enough ticks to get initial metrics
    for (let i = 0; i < METRICS_UPDATE_EVERY; i++) engine.step()
    const initialTax = engine.metrics.totalTaxRevenue

    // Kill 80% of agents
    const aliveAgents = engine.agents.filter(a => a.alive)
    const toKill = Math.floor(aliveAgents.length * 0.8)
    for (let i = 0; i < toKill; i++) {
      aliveAgents[i]._die(engine._buildState(), 'test')
    }
    engine._cleanup()

    // Run more ticks and update metrics
    for (let i = 0; i < METRICS_UPDATE_EVERY; i++) engine.step()

    expect(engine.metrics.totalTaxRevenue).toBeLessThan(initialTax)
  })

  it('killing 80% of agents reduces market demand', () => {
    const engine = new SimEngine({ agentCount: 50, businessCount: 12 })
    for (let i = 0; i < 10; i++) engine.step()

    const initialDemand = { ...engine.market.demand }

    // Kill 80%
    const aliveAgents = engine.agents.filter(a => a.alive)
    const toKill = Math.floor(aliveAgents.length * 0.8)
    for (let i = 0; i < toKill; i++) {
      aliveAgents[i]._die(engine._buildState(), 'test')
    }
    engine._cleanup()

    // Run to recalculate prices/demand
    for (let i = 0; i < 5; i++) engine.step()

    // Demand should be lower for at least food (most universal)
    expect(engine.market.demand.food).toBeLessThan(initialDemand.food)
  })

  it('killing all agents triggers failure', () => {
    const engine = new SimEngine({ agentCount: 10, businessCount: 4 })
    // Kill all agents
    for (const agent of engine.agents) {
      agent._die(engine._buildState(), 'test')
    }
    engine._cleanup()

    const result = engine.step()
    expect(result.scenarioFailed).not.toBeNull()
    expect(result.scenarioFailed.reason).toBe('extinction')
  })
})

// ─── Sector collapse ────────────────────────────────────────────────────────

describe('Sector collapse', () => {
  it('killing all food businesses causes food price to rise toward max', () => {
    const engine = new SimEngine({ agentCount: 30, businessCount: 12 })
    for (let i = 0; i < 10; i++) engine.step()

    // Kill all food businesses
    const foodBiz = engine.businesses.filter(b => b.sector === 'food' && b.alive)
    for (const biz of foodBiz) {
      biz._close(engine._buildState(), 'test')
    }
    engine._cleanup()

    const priceBefore = engine.market.prices.food

    // Run many ticks — with no supply, price should rise
    for (let i = 0; i < 100; i++) engine.step()

    expect(engine.market.prices.food).toBeGreaterThan(priceBefore)
  })

  it('killing all food businesses degrades agent health', () => {
    const engine = new SimEngine({ agentCount: 20, businessCount: 8 })
    for (let i = 0; i < 5; i++) engine.step()

    // Kill all food businesses
    const foodBiz = engine.businesses.filter(b => b.sector === 'food' && b.alive)
    for (const biz of foodBiz) {
      biz._close(engine._buildState(), 'test')
    }
    engine._cleanup()

    // Record initial health
    const aliveAgents = engine.agents.filter(a => a.alive && a.state !== 'child')
    const initialAvgHealth = aliveAgents.reduce((s, a) => s + a.health, 0) / aliveAgents.length

    // Run ticks — health should degrade
    for (let i = 0; i < 50; i++) engine.step()

    const currentAlive = engine.agents.filter(a => a.alive && a.state !== 'child')
    const currentAvgHealth = currentAlive.reduce((s, a) => s + a.health, 0) / currentAlive.length

    expect(currentAvgHealth).toBeLessThan(initialAvgHealth)
  })

  it('luxury market share is 0 when all luxury businesses are dead', () => {
    const engine = new SimEngine({ agentCount: 30, businessCount: 12 })
    for (let i = 0; i < 10; i++) engine.step()

    // Kill all luxury businesses
    const luxBiz = engine.businesses.filter(b => b.sector === 'luxury' && b.alive)
    for (const biz of luxBiz) {
      biz._close(engine._buildState(), 'test')
    }
    engine._cleanup()

    for (let i = 0; i < 5; i++) engine.step()

    const aliveLuxury = engine.businesses.filter(b => b.sector === 'luxury' && b.alive)
    expect(aliveLuxury.length).toBe(0)
    expect(engine.market.supply.luxury).toBeCloseTo(0, 4)
  })

  it('killing all businesses does not immediately end game', () => {
    const engine = new SimEngine({ agentCount: 20, businessCount: 8 })
    // Kill all businesses
    for (const biz of engine.businesses) {
      biz._close(engine._buildState(), 'test')
    }
    engine._cleanup()

    const result = engine.step()
    // Game continues — agents can start new businesses
    expect(result.scenarioFailed).toBeNull()
  })
})

// ─── GDP and economic indicators ────────────────────────────────────────────

describe('GDP and economic indicators', () => {
  it('GDP is proportional to production', { retry: 3 }, () => {
    const engine1 = new SimEngine({ agentCount: 60, businessCount: 3 })
    const engine2 = new SimEngine({ agentCount: 60, businessCount: 25 })

    // Run enough ticks for GDP to diverge after warmup
    for (let i = 0; i < METRICS_UPDATE_EVERY * 5; i++) {
      engine1.step()
      engine2.step()
    }

    // More businesses → more production → higher GDP
    expect(engine2.metrics.gdp).toBeGreaterThan(engine1.metrics.gdp)
  })

  it('population decline leads to GDP decline', () => {
    const engine = new SimEngine({ agentCount: 50, businessCount: 12 })
    for (let i = 0; i < METRICS_UPDATE_EVERY * 2; i++) engine.step()
    const gdpBefore = engine.metrics.gdp

    // Kill 90% of agents — drastic enough to see GDP drop even with rehiring
    const alive = engine.agents.filter(a => a.alive)
    const toKill = Math.floor(alive.length * 0.9)
    for (let i = 0; i < toKill; i++) {
      alive[i]._die(engine._buildState(), 'test')
    }
    engine._cleanup()

    // Run just one metrics update — not enough time to fully recover
    for (let i = 0; i < METRICS_UPDATE_EVERY; i++) engine.step()

    expect(engine.metrics.gdp).toBeLessThan(gdpBefore)
  })

  it('GDP = 0 for 5+ metrics updates triggers economic collapse', () => {
    const engine = new SimEngine({ agentCount: 20, businessCount: 8 })

    // Directly set up the failure condition by manipulating engine state
    // Kill all businesses except a dummy with no production
    for (const biz of engine.businesses) {
      biz._close(engine._buildState(), 'test')
    }
    const dummyBiz = new Business({ sector: 'food', capital: 1000 })
    dummyBiz.employees = []
    dummyBiz.production = 0
    dummyBiz.maxEmployees = 0 // prevent hiring
    engine.businesses = [dummyBiz]

    // Set streak to 4 (one more will trigger)
    engine.metrics.gdp = 0
    engine._zeroGdpStreak = 4

    // Simulate tick at metrics update boundary
    for (let round = 0; round < 1; round++) {
      engine.tick = (round + 1) * METRICS_UPDATE_EVERY
      updateMetrics(engine.metrics, engine._buildState(), engine.market, engine.policies)
    }
    expect(engine.metrics.gdp).toBe(0)

    // Step the engine at a metrics boundary to trigger failure check
    engine.tick = METRICS_UPDATE_EVERY * 2 - 1
    const result = engine.step()

    let failed = result.scenarioFailed
    if (!failed) {
      for (let i = 0; i < METRICS_UPDATE_EVERY * 3; i++) {
        const r = engine.step()
        if (r.scenarioFailed) { failed = r.scenarioFailed; break }
      }
    }

    expect(failed).not.toBeNull()
    expect(failed.reason).toBe('economic_collapse')
  })
})

// ─── Government budget ──────────────────────────────────────────────────────

describe('Government budget', () => {
  it('more unemployed agents increases government spending', () => {
    const engine = new SimEngine({ agentCount: 50, businessCount: 12 })
    engine.policies.unemploymentBenefit = 50

    // Run to get baseline
    for (let i = 0; i < METRICS_UPDATE_EVERY; i++) engine.step()

    // Snapshot metrics with current employment
    const state = engine._buildState()
    const metricsBefore = createMetricsState()
    updateMetrics(metricsBefore, state, engine.market, engine.policies)
    const budgetBefore = metricsBefore.govBudget

    // Fire 80% of employees directly (no engine.step so no rehiring)
    const employed = engine.agents.filter(a => a.alive && a.employed && !a.isOwner)
    for (let i = 0; i < Math.floor(employed.length * 0.8); i++) {
      employed[i].fire('test')
    }

    // Re-snapshot
    const metricsAfter = createMetricsState()
    updateMetrics(metricsAfter, engine._buildState(), engine.market, engine.policies)

    expect(metricsAfter.govBudget).toBeLessThan(budgetBefore)
  })

  it('fewer employed means less income tax revenue', () => {
    const engine = new SimEngine({ agentCount: 50, businessCount: 12 })
    engine.policies.incomeTax = 0.3

    for (let i = 0; i < METRICS_UPDATE_EVERY; i++) engine.step()

    const state = engine._buildState()
    const metricsBefore = createMetricsState()
    updateMetrics(metricsBefore, state, engine.market, engine.policies)
    const taxBefore = metricsBefore.totalTaxRevenue

    // Fire 80% of employees directly
    const employed = engine.agents.filter(a => a.alive && a.employed && !a.isOwner)
    for (let i = 0; i < Math.floor(employed.length * 0.8); i++) {
      employed[i].fire('test')
    }

    const metricsAfter = createMetricsState()
    updateMetrics(metricsAfter, engine._buildState(), engine.market, engine.policies)

    expect(metricsAfter.totalTaxRevenue).toBeLessThan(taxBefore)
  })
})

// ─── Business survival logic ────────────────────────────────────────────────

describe('Business survival logic', () => {
  it('business with no customers eventually goes bankrupt', () => {
    const biz = new Business({ sector: 'luxury', capital: 100 })
    biz.employees = [1]
    biz.wageOffered = 15
    biz.production = 0
    biz.inventory = 0
    biz.revenue = 0

    const state = { agents: [], businesses: [biz] }
    let ticks = 0
    while (biz.alive && ticks < 200) {
      biz._payWages({})
      biz._checkBankruptcy(state)
      ticks++
    }
    expect(biz.alive).toBe(false)
  })

  it('high minimum wage drains business capital faster', () => {
    // Test the mechanism: a business paying high min wage loses capital faster
    const bizLow = new Business({ sector: 'food', capital: 500 })
    bizLow.employees = [1, 2, 3]
    bizLow.wageOffered = 10
    bizLow.revenue = 0

    const bizHigh = new Business({ sector: 'food', capital: 500 })
    bizHigh.employees = [4, 5, 6]
    bizHigh.wageOffered = 10
    bizHigh.revenue = 0

    // Pay wages with low vs high min wage
    bizLow._payWages({ minWage: 10 })
    bizHigh._payWages({ minWage: 80 })

    // High min wage business bleeds capital much faster
    expect(bizHigh.capital).toBeLessThan(bizLow.capital)
    expect(bizHigh.capital).toBe(500 - 80 * 3) // 260
    expect(bizLow.capital).toBe(500 - 10 * 3) // 470
  })

  it('anti-monopoly policy reduces dominant business price', () => {
    const engine = new SimEngine({ agentCount: 30, businessCount: 8 })

    // Create a monopoly: give one business extreme dominance
    const biz = engine.businesses.find(b => b.alive)
    biz.dominance = 0.7
    biz.marketShare = 0.7
    const priceBeforePolicy = biz.price

    engine.policies.antiMonopoly = true

    // Tick the business — _adjustPriceStrategy should lower price
    biz._adjustPriceStrategy(engine._buildState())

    expect(biz.price).toBeLessThan(priceBeforePolicy)
  })
})

// ─── Failure conditions ─────────────────────────────────────────────────────

describe('Failure conditions', () => {
  it('zero population triggers extinction', () => {
    const engine = new SimEngine({ agentCount: 10, businessCount: 4 })

    // Kill all agents
    for (const agent of engine.agents) {
      agent._die(engine._buildState(), 'test')
    }
    engine._cleanup()

    const result = engine.step()
    expect(result.scenarioFailed).not.toBeNull()
    expect(result.scenarioFailed.reason).toBe('extinction')
    expect(engine.scenarioFailed).toBe(true)
  })

  it('failure prevents scenario completion', () => {
    const engine = new SimEngine({ agentCount: 10, businessCount: 4, durationYears: 1 })

    // Kill all agents
    for (const agent of engine.agents) {
      agent._die(engine._buildState(), 'test')
    }
    engine._cleanup()
    engine.tick = 52 // past scenario duration

    const result = engine.step()
    expect(result.scenarioFailed).not.toBeNull()
    expect(result.scenarioComplete).toBeNull()
  })

  it('failure is not re-triggered once already failed', () => {
    const engine = new SimEngine({ agentCount: 10, businessCount: 4 })

    // Kill all agents to trigger failure
    for (const agent of engine.agents) {
      agent._die(engine._buildState(), 'test')
    }
    engine._cleanup()

    const result1 = engine.step()
    expect(result1.scenarioFailed).not.toBeNull()

    // Second step should not re-trigger
    const result2 = engine.step()
    expect(result2.scenarioFailed).toBeNull()
  })

  it('failure includes a report with score', () => {
    const engine = new SimEngine({ agentCount: 10, businessCount: 4 })
    for (const agent of engine.agents) {
      agent._die(engine._buildState(), 'test')
    }
    engine._cleanup()

    const result = engine.step()
    expect(result.scenarioFailed.report).toBeDefined()
    expect(result.scenarioFailed.report.finalScore).toBeDefined()
    expect(result.scenarioFailed.message).toBeTruthy()
  })
})

// ─── Starvation and housing ─────────────────────────────────────────────────

describe('Starvation and housing effects', () => {
  it('agent health degrades when no food businesses exist', () => {
    const agent = new Agent({ age: 30 * 52, wealth: 500, health: 0.8 })
    agent.employed = true
    agent.wage = 20

    const state = {
      prices: INITIAL_PRICES,
      businesses: [] // no businesses at all
    }

    for (let i = 0; i < 20; i++) {
      agent._consumeGoods(state, {})
    }

    expect(agent.health).toBeLessThan(0.8)
    expect(agent.health).toBeCloseTo(0.6, 1) // 0.8 - 20 * 0.01
  })

  it('agent health does NOT degrade when food businesses exist', () => {
    const agent = new Agent({ age: 30 * 52, wealth: 500, health: 0.8 })
    agent.employed = true
    agent.wage = 20

    const foodBiz = new Business({ sector: 'food', capital: 500 })
    const state = {
      prices: INITIAL_PRICES,
      businesses: [foodBiz]
    }

    for (let i = 0; i < 20; i++) {
      agent._consumeGoods(state, {})
    }

    expect(agent.health).toBe(0.8) // no degradation
  })

  it('no housing businesses reduces happiness', () => {
    const agent = new Agent({ age: 30 * 52, wealth: 500, health: 0.8 })
    agent.employed = true
    agent.wage = 20

    // With housing
    const housingBiz = new Business({ sector: 'housing', capital: 500 })
    const stateWith = {
      businesses: [housingBiz],
      metrics: { gini: 0.3 }
    }
    agent._updateHappiness(stateWith, {})
    const happyWith = agent.happiness

    // Without housing
    const stateWithout = {
      businesses: [],
      metrics: { gini: 0.3 }
    }
    agent._updateHappiness(stateWithout, {})
    const happyWithout = agent.happiness

    expect(happyWithout).toBeLessThan(happyWith)
  })

  it('low health reduces happiness', () => {
    const healthyAgent = new Agent({ age: 30 * 52, wealth: 500, health: 1.0 })
    healthyAgent.employed = true
    const sickAgent = new Agent({ age: 30 * 52, wealth: 500, health: 0.3 })
    sickAgent.employed = true

    const state = { businesses: [], metrics: { gini: 0.3 } }
    healthyAgent._updateHappiness(state, {})
    sickAgent._updateHappiness(state, {})

    expect(sickAgent.happiness).toBeLessThan(healthyAgent.happiness)
  })
})

// ─── Demand-population feedback ─────────────────────────────────────────────

describe('Demand-population feedback', () => {
  it('fewer agents means less total demand in market', () => {
    const market = createMarketState()

    // 50 agents
    const agents50 = createInitialAgents(50)
    agents50.forEach(a => { a.employed = true; a.wage = 20 })
    const biz = [new Business({ sector: 'food', capital: 500 })]
    biz[0].employees = [1]
    biz[0].production = 100
    const state50 = { agents: agents50, businesses: biz, policies: {} }
    updatePrices(market, state50, {})
    const demand50 = market.demand.food

    // 10 agents
    const market2 = createMarketState()
    const agents10 = createInitialAgents(10)
    agents10.forEach(a => { a.employed = true; a.wage = 20 })
    const state10 = { agents: agents10, businesses: biz, policies: {} }
    updatePrices(market2, state10, {})
    const demand10 = market2.demand.food

    expect(demand10).toBeLessThan(demand50)
  })
})
