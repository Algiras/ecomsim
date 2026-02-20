import { Agent, createInitialAgents, AgentState } from './agent.js'
import { getScenario as _getScenario } from '../data/scenarios.js'
import { Business, createInitialBusinesses } from './business.js'
import { createMarketState, updatePrices } from './market.js'
import { runLaborMarket } from './labor.js'
import { createPolicyState, applyPolicyEffects } from './policy.js'
import { createMetricsState, updateMetrics, toMetricsSnapshot } from './metrics.js'
import { createEventsState, tickEvents } from './events.js'
import {
  INITIAL_AGENTS, INITIAL_BUSINESSES, METRICS_UPDATE_EVERY,
  WORKER_UPDATE_EVERY, STARTUP_PROBABILITY
} from '../utils/constants.js'
import { normalRand, clamp } from '../utils/math.js'

export class SimEngine {
  constructor(scenario = {}) {
    this.tick = 0
    this.running = false
    this.speed = 1
    this.scenario = scenario

    this.policies = createPolicyState(scenario.policies || {})
    this.market = createMarketState()
    this.metrics = createMetricsState()
    this.eventsState = createEventsState()

    this.agents = createInitialAgents(
      scenario.agentCount || INITIAL_AGENTS,
      scenario
    )

    this.businesses = createInitialBusinesses(
      scenario.businessCount || INITIAL_BUSINESSES,
      this.agents,
      scenario
    )

    this._pendingMessages = []
  }

  // Called by worker message handler
  applyMessage(msg) {
    switch (msg.type) {
      case 'SET_POLICY':
        this.policies[msg.policy] = msg.value
        break
      case 'SET_SPEED':
        this.speed = msg.speed
        break
      case 'RESET':
        this._reset(msg.scenario)
        break
      case 'PAUSE':
        this.running = false
        break
      case 'RESUME':
        this.running = true
        break
    }
  }

  _reset(scenarioId) {
    const scenario = _getScenario(scenarioId) || {}
    this.tick = 0
    this.policies = createPolicyState(scenario.policies || {})
    this.market = createMarketState()
    this.metrics = createMetricsState()
    this.eventsState = createEventsState()
    this.agents = createInitialAgents(scenario.agentCount || INITIAL_AGENTS, scenario)
    this.businesses = createInitialBusinesses(scenario.businessCount || INITIAL_BUSINESSES, this.agents, scenario)
  }

  // Main tick function — run once per simulation step
  step() {
    this.tick++

    const state = this._buildState()

    // 1. Tick all agents
    for (const agent of this.agents) {
      if (agent.alive) agent.tick(state, this.policies)
    }

    // 2. Tick all businesses
    for (const biz of this.businesses) {
      if (biz.alive) biz.tick(state, this.policies)
    }

    // 3. Run labor market matching every 5 ticks
    if (this.tick % 5 === 0) {
      runLaborMarket(state, this.policies)
    }

    // 4. Update market prices
    updatePrices(this.market, state, this.policies)

    // 5. Apply policy effects
    applyPolicyEffects(state, this.policies, this.market)

    // 6. Handle events
    const newEvent = tickEvents(this.eventsState, state, this.policies, this.tick)
    if (newEvent) {
      // Handle immigration wave spawning
      if (newEvent._spawnAgents) {
        this._spawnImmigrants(newEvent._spawnAgents, newEvent._spawnSkillBonus)
      }
    }

    // 7. Natural births
    if (this.tick % 52 === 0) {
      this._processBirths()
    }

    // 8. Remove dead agents and bankrupt businesses
    this._cleanup()

    // 9. Spawn new businesses from entrepreneurial agents
    this._processNewBusinesses(state)

    // 10. Update metrics every N ticks
    if (this.tick % METRICS_UPDATE_EVERY === 0) {
      updateMetrics(this.metrics, state, this.market, this.policies)
    }

    // 11. Check insight triggers
    const insight = this._checkInsights()

    return {
      shouldUpdate: this.tick % WORKER_UPDATE_EVERY === 0,
      event: newEvent,
      insight
    }
  }

  _buildState() {
    return {
      agents: this.agents,
      businesses: this.businesses,
      policies: this.policies,
      market: this.market,
      metrics: this.metrics
    }
  }

  _processBirths() {
    const aliveAdults = this.agents.filter(a =>
      a.alive && a.age > 20 * 52 && a.age < 45 * 52
    )

    for (const parent of aliveAdults) {
      if (Math.random() < 0.02 && this.agents.filter(a => a.alive).length < 500) {
        const child = new Agent({
          x: parent.x + (Math.random() - 0.5) * 20,
          y: parent.y + (Math.random() - 0.5) * 20,
          age: 0,
          skill: clamp(normalRand(parent.skill, 0.15), 0.1, 1),
          education: 0,
          wealth: 10,
          parentWealth: parent.wealth,
          bornInYear: Math.floor(this.tick / 52)
        })
        this.agents.push(child)
      }
    }
  }

  _spawnImmigrants(count, skillBonus) {
    for (let i = 0; i < count; i++) {
      const agent = new Agent({
        skill: clamp(normalRand(0.6 + skillBonus, 0.15), 0.3, 1),
        education: clamp(normalRand(0.6, 0.2), 0.2, 1),
        wealth: clamp(normalRand(300, 100), 50, 800),
        bornInYear: Math.floor(this.tick / 52)
      })
      this.agents.push(agent)
    }
  }

  _processNewBusinesses(state) {
    const wannabes = this.agents.filter(a => a._wantsToStartBusiness)
    for (const agent of wannabes) {
      delete agent._wantsToStartBusiness

      if (this.businesses.filter(b => b.alive).length >= 80) continue
      if (agent.wealth < 300) continue

      const { SECTORS } = { SECTORS: ['food', 'housing', 'tech', 'luxury'] }
      const sector = SECTORS[Math.floor(Math.random() * SECTORS.length)]
      const biz = new Business({
        sector,
        capital: agent.wealth * 0.5,
        ownerId: agent.id,
        productivity: clamp(normalRand(agent.skill, 0.2), 0.3, 2)
      })

      agent.wealth *= 0.5  // invest in business
      agent.isOwner = true
      agent.businessId = biz.id
      agent.employed = true
      agent.employerId = biz.id
      agent.wage = 20
      agent.jobSector = sector
      biz.employees.push(agent.id)

      this.businesses.push(biz)
      agent.events.push(`Started ${biz.name} at age ${Math.floor(agent.age / 52)}`)
    }
  }

  _cleanup() {
    // Remove agents that have been dead for a while
    this.agents = this.agents.filter(a => a.alive)

    // Remove bankrupt businesses
    this.businesses = this.businesses.filter(b => b.alive)
  }

  _checkInsights() {
    const m = this.metrics
    // Avoid spamming — one insight per 100 ticks
    if (this._lastInsightTick && this.tick - this._lastInsightTick < 100) return null

    const INSIGHT_TRIGGERS = [
      {
        id: 'monopoly_forming',
        condition: () => this.businesses.some(b => b.dominance > 0.6),
        title: 'Monopoly Forming',
        body: 'One business controls over 60% of a market. Competition disappears, prices rise, and innovation stalls.',
        realWorld: 'This mirrors Standard Oil in 1911 or modern big tech. Anti-monopoly policy can break this up — but at what cost to efficiency?'
      },
      {
        id: 'high_inequality',
        condition: () => m.gini > 0.55,
        title: 'Extreme Inequality',
        body: `Gini coefficient hit ${(m.gini * 100).toFixed(0)}. The top 10% own most of the wealth. Social unrest is rising.`,
        realWorld: 'Research shows high inequality reduces social mobility, increases crime, and can destabilize democracies. Nordic countries maintain ~0.28 Gini through redistribution.'
      },
      {
        id: 'high_unemployment',
        condition: () => m.unemployment > 0.2,
        title: 'Mass Unemployment',
        body: `${(m.unemployment * 100).toFixed(0)}% unemployment. Businesses can\'t afford wages; workers can\'t find jobs.`,
        realWorld: 'The Great Depression peaked at 25% US unemployment. Keynes argued government spending could break the cycle.'
      },
      {
        id: 'inflation_spiral',
        condition: () => m.inflation > 8,
        title: 'Inflation Spiral',
        body: 'Prices are rising fast. Your money buys less each tick. Real wages are falling.',
        realWorld: 'Zimbabwe (2008) and Venezuela (2018) experienced hyperinflation from excessive money printing. Central banks fight this with higher interest rates.'
      },
      {
        id: 'min_wage_tradeoff',
        condition: () => this.policies.minWage > 15 && m.unemployment > 0.15,
        title: 'Minimum Wage Tradeoff',
        body: 'Minimum wage is high AND unemployment is rising. Small businesses can\'t afford to hire.',
        realWorld: 'The minimum wage debate: living wages vs. employment effects. Studies show it depends heavily on local cost of living and business type.'
      },
      {
        id: 'budget_surplus',
        condition: () => m.govBudget > 500 && m.govDebt < 0,
        title: 'Fiscal Surplus',
        body: 'The government is running a surplus! Tax revenue exceeds spending. Debt is falling.',
        realWorld: 'Budget surpluses allow debt reduction and investment in public goods — but may slow demand if taxes are too high.'
      },
      {
        id: 'stagnation',
        condition: () => m.gdpGrowth < 0 && m.unemployment > 0.12,
        title: 'Stagflation Risk',
        body: 'GDP is shrinking and unemployment is rising simultaneously. The classic policy dilemma.',
        realWorld: 'The 1970s oil crisis created stagflation. Cutting interest rates helps unemployment but worsens inflation. Raising them helps inflation but worsens unemployment.'
      }
    ]

    for (const trigger of INSIGHT_TRIGGERS) {
      if (
        trigger.condition() &&
        this._firedInsights?.has(trigger.id) !== true
      ) {
        if (!this._firedInsights) this._firedInsights = new Set()
        this._firedInsights.add(trigger.id)
        this._lastInsightTick = this.tick
        return {
          id: trigger.id,
          title: trigger.title,
          body: trigger.body,
          realWorld: trigger.realWorld,
          tick: this.tick,
          year: Math.floor(this.tick / 52)
        }
      }
    }
    return null
  }

  getSnapshot() {
    return {
      tick: this.tick,
      year: Math.floor(this.tick / 52),
      agents: this.agents.map(a => a.toSnapshot()),
      businesses: this.businesses.map(b => b.toSnapshot()),
      metrics: toMetricsSnapshot(this.metrics),
      market: {
        prices: { ...this.market.prices },
        supply: { ...this.market.supply },
        demand: { ...this.market.demand },
        cpi: this.market.cpi,
        inflation: this.market.inflation
      },
      policies: { ...this.policies },
      activeEvents: this.eventsState.activeEvents.map(e => ({
        id: e.id,
        name: e.name,
        icon: e.icon,
        description: e.description,
        startTick: e.startTick
      }))
    }
  }
}
