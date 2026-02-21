import { Agent, createInitialAgents } from './agent.js'
import { getScenario as _getScenario } from '../data/scenarios.js'
import { Business, createInitialBusinesses } from './business.js'
import { Bank, createInitialBanks, assignAgentsToBanks } from './bank.js'
import { createMarketState, updatePrices } from './market.js'
import { runLaborMarket } from './labor.js'
import { createPolicyState, applyPolicyEffects } from './policy.js'
import { createMetricsState, updateMetrics, toMetricsSnapshot } from './metrics.js'
import { createEventsState, tickEvents, resolveEventChoice } from './events.js'
import { createGlobalEconomyState, tickGlobalEconomy } from './globalEconomy.js'
import { SCENARIO_OBJECTIVES, evaluateObjective, objectiveProgress } from '../data/objectives.js'
import {
  INITIAL_AGENTS, INITIAL_BUSINESSES, METRICS_UPDATE_EVERY,
  WORKER_UPDATE_EVERY, STARTUP_PROBABILITY, POLICY_LAG_TICKS
} from '../utils/constants.js'
import { normalRand, clamp } from '../utils/math.js'
import { ACHIEVEMENTS, MILESTONES, computeScore } from '../data/achievements.js'

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

    // Banking
    this.banks = createInitialBanks(3)
    assignAgentsToBanks(this.agents, this.banks)

    // Global economy
    this.globalEconomy = createGlobalEconomyState()

    // Objectives
    this.objectives = SCENARIO_OBJECTIVES[scenario.id] || []
    this.objectiveProgress = this.objectives.map(o => ({
      ...o, met: false, completed: false, sustainCount: 0, progress: 0, sustainProgress: 0
    }))
    this.initialMetrics = null  // captured after first metrics update
    this.scenarioComplete = false
    this.scenarioFailed = false
    this._zeroGdpStreak = 0  // consecutive metrics updates with GDP = 0

    // Scheduled events (array)
    this.scheduledEvents = scenario.scheduledEvents || []
    if (scenario.scheduledEvent) {
      this.scheduledEvents = [...this.scheduledEvents, scenario.scheduledEvent]
    }
    // Story mode: only fire predefined events, no random shocks
    this.isStoryMode = !!scenario.isStory

    this._pendingMessages = []

    // Policy lag
    this.policyLag = {}  // { policyKey: { start, target, lagTicks, elapsed } }

    // Approval rating
    this.approvalRating = 50
    this.approvalHistory = []
    this._prevMetricsForApproval = null

    // Economic event feed (circular buffer, max 20)
    this._econFeed = []

    // Gamification
    this._score = 0
    this._scoreHistory = []
    this._unlockedAchievements = new Set()  // achievement ids
    this._newAchievements = []              // freshly unlocked (cleared after snapshot)
    this._completedMilestones = new Set()   // milestone ids
    this._milestoneProgress = 0             // index of next milestone to complete
    this._sustainedCounters = {}            // for sustained achievements/milestones
    this._peakGdp = 0
    this._sawHyperinflation = false
    this._sawGdpCrash = false

    // Warm up the economy so it starts in a healthy state
    this._warmup()
  }

  _warmup() {
    // Pre-assign employees to businesses so the economy starts running
    const unemployed = this.agents.filter(a => a.alive && !a.employed && !a.isOwner)
    const businesses = this.businesses.filter(b => b.alive)

    // Distribute workers across businesses — only fill ~80% of slots for realistic starting unemployment
    const totalSlots = businesses.reduce((s, b) => s + (b.maxEmployees - b.employees.length), 0)
    const targetFill = Math.floor(totalSlots * 0.8)
    let filled = 0

    for (const biz of businesses) {
      const slotsAvailable = biz.maxEmployees - biz.employees.length
      for (let i = 0; i < slotsAvailable && unemployed.length > 0 && filled < targetFill; i++) {
        const idx = Math.floor(Math.random() * unemployed.length)
        const agent = unemployed[idx]
        unemployed.splice(idx, 1)

        agent.employed = true
        agent.employerId = biz.id
        agent.jobSector = biz.sector
        const baseWage = 8 + agent.skill * 12
        agent.wage = Math.max(this.policies.minWage || 0, baseWage)
        agent.unemployedTicks = 0
        biz.employees.push(agent.id)
        filled++
      }
    }

    // Set agent social class, credit scores, and deposits
    for (const agent of this.agents) {
      if (!agent.alive) continue
      if (agent.wealth > 1500) agent.socialClass = 'rich'
      else if (agent.wealth > 300) agent.socialClass = 'middle'
      else agent.socialClass = 'poor'

      agent.creditScore = clamp(
        400 + Math.floor(agent.wealth / 10) + Math.floor(agent.skill * 100),
        300, 850
      )

      if (agent.employed && agent.wage > 0) {
        agent.income = agent.wage
        agent.deposits = agent.wage * (5 + Math.random() * 10)
      }
    }

    // Give businesses starting production and inventory
    for (const biz of businesses) {
      const workerCount = biz.employees.length
      biz.production = workerCount * biz.productivity * 2
      biz.inventory = biz.production * 3
      biz.revenue = biz.production * (biz.price || 5)
      biz.profit = biz.revenue * 0.15
      biz.profitHistory = Array(5).fill(biz.profit * (0.8 + Math.random() * 0.4))
    }

    // Initialize market supply/demand from current state
    for (const sector of ['food', 'housing', 'tech', 'luxury']) {
      const sectorBiz = businesses.filter(b => b.sector === sector)
      this.market.supply[sector] = sectorBiz.reduce((s, b) => s + b.production, 0)
      this.market.demand[sector] = this.agents.filter(a => a.alive).length * 2
    }

    // Compute initial metrics so UI has non-zero values on first frame
    const state = this._buildState()
    updateMetrics(this.metrics, state, this.market, this.policies)
  }

  // Called by worker message handler
  applyMessage(msg) {
    switch (msg.type) {
      case 'SET_POLICY': {
        const lagTicks = POLICY_LAG_TICKS[msg.policy]
        if (lagTicks && typeof msg.value === 'number') {
          // Numeric policy with lag — start transition
          const current = this.policies[msg.policy]
          if (current !== msg.value) {
            this.policyLag[msg.policy] = {
              start: current,
              target: msg.value,
              lagTicks,
              elapsed: 0
            }
          }
        } else {
          // Boolean toggle or non-lagged policy — instant
          this.policies[msg.policy] = msg.value
        }
        break
      }
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
      case 'RESOLVE_CHOICE':
        resolveEventChoice(this.eventsState, msg.eventId, msg.choiceId, this._buildState())
        break
      case 'FORCE_SHOCK':
        this._pendingForceShock = true
        break
    }
  }

  _reset(scenarioId) {
    const scenario = _getScenario(scenarioId) || {}
    this.scenario = scenario
    this.tick = 0
    this.policies = createPolicyState(scenario.policies || {})
    this.market = createMarketState()
    this.metrics = createMetricsState()
    this.eventsState = createEventsState()
    this.agents = createInitialAgents(scenario.agentCount || INITIAL_AGENTS, scenario)
    this.businesses = createInitialBusinesses(scenario.businessCount || INITIAL_BUSINESSES, this.agents, scenario)
    this.banks = createInitialBanks(3)
    assignAgentsToBanks(this.agents, this.banks)
    this.globalEconomy = createGlobalEconomyState()
    this.objectives = SCENARIO_OBJECTIVES[scenario.id] || []
    this.objectiveProgress = this.objectives.map(o => ({
      ...o, met: false, completed: false, sustainCount: 0, progress: 0, sustainProgress: 0
    }))
    this.initialMetrics = null
    this.scenarioComplete = false
    this.scenarioFailed = false
    this._zeroGdpStreak = 0
    this.scheduledEvents = scenario.scheduledEvents || []
    if (scenario.scheduledEvent) {
      this.scheduledEvents = [...this.scheduledEvents, scenario.scheduledEvent]
    }
    this.isStoryMode = !!scenario.isStory
    this._firedInsights = null
    this._lastInsightTick = null
    this.policyLag = {}
    this.approvalRating = 50
    this.approvalHistory = []
    this._prevMetricsForApproval = null
    this._noConfidenceTriggered = false
    this._econFeed = []
    this._prevEconMetrics = {}
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

    // 2b. Tick all banks
    for (const bank of this.banks) {
      if (bank.alive) bank.tick(state, this.policies)
    }

    // 3. Run labor market matching every 5 ticks
    if (this.tick % 5 === 0) {
      runLaborMarket(state, this.policies)
    }

    // 3b. Advance policy lag transitions
    this._advancePolicyLag()

    // 3c. Tick global economy (trade flows, FX, world prices)
    const { tradeFlows, shockEvent } = tickGlobalEconomy(
      this.globalEconomy, this.market, this.policies, this.metrics
    )
    if (shockEvent) {
      const shockNarrationKey = `global_${shockEvent.type}`
      this._emitEconEvent(shockEvent.icon, `${shockEvent.label} — world markets disrupted`, 'danger')
      this._pendingMessages.push({ type: 'globalShock', ...shockEvent, narrationKey: shockNarrationKey })
    }

    // 4. Update market prices (with trade flow injection)
    updatePrices(this.market, state, this.policies, tradeFlows)

    // 4b. Monopoly social consequences
    if (!this.policies.antiMonopoly) {
      for (const sector of ['food', 'housing', 'tech', 'luxury']) {
        const sectorBiz = this.businesses.filter(b => b.alive && b.sector === sector)
        const dominant = sectorBiz.find(b => b.dominance > 0.5)
        if (dominant) {
          // Monopolies anger people
          for (const agent of this.agents) {
            if (agent.alive) agent.unrest = clamp((agent.unrest || 0) + 0.003, 0, 1)
          }
          // Food monopoly amplifies inflation
          if (sector === 'food') {
            this.market.prices.food *= 1.001
          }
          // Housing monopoly: agents pay more
          if (sector === 'housing') {
            for (const agent of this.agents) {
              if (agent.alive && !agent.hasMortgage) {
                agent.wealth -= agent.expenses * 0.002
              }
            }
          }
          // Extreme dominance: predatory pricing kills competitors
          if (dominant.dominance > 0.7) {
            for (const comp of sectorBiz) {
              if (comp.id !== dominant.id) {
                comp.capital -= comp.capital * 0.02
              }
            }
          }
        }
      }
    }

    // 5. Apply policy effects
    applyPolicyEffects(state, this.policies, this.market)

    // 5b. Auto-reset one-shot weird laws
    if (state._jubileeApplied) {
      this.policies.debtJubilee = false
      delete state._jubileeApplied
    }

    // 6. Fire scheduled events at their designated tick
    for (const se of this.scheduledEvents) {
      if (this.tick === se.atTick) {
        tickEvents(this.eventsState, state, this.policies, this.tick, se.type)
      }
    }

    // 6b. Handle random events + forced shocks
    let forceType = null
    if (this._pendingForceShock) {
      this._pendingForceShock = false
      forceType = '_random'
    }
    const newEvent = forceType
      ? tickEvents(this.eventsState, state, this.policies, this.tick, forceType)
      : (!this.isStoryMode ? tickEvents(this.eventsState, state, this.policies, this.tick) : null)
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
      // Capture initial metrics snapshot (first time only)
      if (!this.initialMetrics) {
        this.initialMetrics = { ...toMetricsSnapshot(this.metrics) }
      }
      this._updateApprovalRating()
      this._updateObjectives()
      this._updateGamification()
    }

    // 10b. Detect economic events for feed
    if (this.tick % METRICS_UPDATE_EVERY === 0) {
      this._detectEconEvents()
    }

    // 11. Check insight triggers
    const insight = this._checkInsights()

    // 12. Check failure conditions
    let scenarioFailed = null
    if (!this.scenarioFailed && !this.scenarioComplete) {
      scenarioFailed = this._checkFailure()
    }

    // 13. Check scenario completion
    let scenarioComplete = null
    if (!this.scenarioComplete && !this.scenarioFailed && this.scenario.durationYears) {
      const year = Math.floor(this.tick / 52)
      if (year >= this.scenario.durationYears) {
        this.scenarioComplete = true
        scenarioComplete = this._buildReport()
      }
    }

    return {
      shouldUpdate: this.tick % WORKER_UPDATE_EVERY === 0,
      event: newEvent,
      insight,
      scenarioComplete,
      scenarioFailed
    }
  }

  _buildState() {
    return {
      agents: this.agents,
      businesses: this.businesses,
      banks: this.banks,
      policies: this.policies,
      market: this.market,
      metrics: this.metrics,
      globalEconomy: this.globalEconomy,
      prices: this.market.prices  // agents read prices via state.prices
    }
  }

  _updateObjectives() {
    const metrics = toMetricsSnapshot(this.metrics)
    for (const obj of this.objectiveProgress) {
      const met = evaluateObjective(obj, metrics, this.initialMetrics)
      obj.met = met
      obj.progress = objectiveProgress(obj, metrics, this.initialMetrics)

      if (met) {
        obj.sustainCount = (obj.sustainCount || 0) + METRICS_UPDATE_EVERY
        const required = obj.sustainTicks || 0
        obj.sustainProgress = required > 0 ? Math.min(1, obj.sustainCount / required) : 1
        if (obj.sustainCount >= required && !obj.completed) {
          obj.completed = true
        }
      } else {
        obj.sustainCount = 0
        obj.sustainProgress = 0
      }
    }
  }

  _buildObjectivesSnapshot() {
    return this.objectiveProgress.map(o => ({
      id: o.id,
      label: o.label,
      description: o.description,
      icon: o.icon,
      tip: o.tip,
      met: o.met,
      completed: o.completed,
      progress: o.progress,
      sustainProgress: o.sustainProgress,
      weight: o.weight
    }))
  }

  _buildReport() {
    const metrics = toMetricsSnapshot(this.metrics)
    const objectives = this._buildObjectivesSnapshot()

    const totalWeight = objectives.reduce((s, o) => s + (o.weight || 0), 0) || 1
    const weightedScore = objectives.reduce((s, o) => {
      const score = o.completed ? 100 : o.met ? 50 : Math.round(o.progress * 40)
      return s + score * (o.weight || 0)
    }, 0) / totalWeight

    let finalScore = Math.round(weightedScore)

    // Historical scenario: compare player outcome to real history
    let verdict = null
    const beatHistory = this.scenario.isHistorical && this.scenario.historicalOutcome && this.initialMetrics
      ? (() => {
          const gdpChange = (metrics.gdp - this.initialMetrics.gdp) / (this.initialMetrics.gdp || 1)
          return gdpChange > (this.scenario.historicalOutcome.gdpChange || -1)
        })()
      : false

    if (this.scenario.isHistorical) {
      if (beatHistory && finalScore < 70) {
        // Player beat history but got a low absolute score — boost grade and explain
        finalScore = Math.max(finalScore, 65) // floor at 65 to avoid F/D with "beat history"
        verdict = 'You outperformed history — but the era was brutal. Grade adjusted.'
        // Bump effective score by ~10 to push C→B territory
        finalScore = Math.min(100, finalScore + 10)
      } else if (beatHistory && finalScore >= 70) {
        verdict = 'Exceptional — you rewrote history.'
      } else if (this.scenario.historicalOutcome) {
        verdict = 'History proved hard to beat.'
      }
    }

    const grade = finalScore >= 90 ? 'A+' : finalScore >= 80 ? 'A' : finalScore >= 70 ? 'B'
      : finalScore >= 60 ? 'C' : finalScore >= 45 ? 'D' : 'F'

    const giniScore = Math.round(Math.max(0, (1 - this.metrics.gini / 0.7) * 100))
    const growthScore = Math.round(Math.min(100, Math.max(0, (metrics.gdpGrowth + 0.02) * 2000)))
    const stabilityScore = Math.round(Math.max(0, 100 - Math.abs(metrics.inflation) * 5 - metrics.socialUnrest * 100))

    return {
      scenarioId: this.scenario.id,
      scenarioName: this.scenario.name,
      finalScore,
      grade,
      verdict,
      beatHistory,
      domains: {
        equality: { score: giniScore, label: 'Equality' },
        growth: { score: growthScore, label: 'Growth' },
        stability: { score: stabilityScore, label: 'Stability' }
      },
      objectives,
      playerOutcome: {
        gdpChangePercent: this.initialMetrics
          ? Math.round(((metrics.gdp - this.initialMetrics.gdp) / (this.initialMetrics.gdp || 1)) * 100)
          : 0,
        peakUnemployment: Math.round(metrics.unemployment * 100),
        inflationAvg: Math.round(metrics.inflation * 10) / 10,
        gini: Math.round(metrics.gini * 100) / 100,
        povertyRate: Math.round(metrics.povertyRate * 100)
      },
      finalPolicies: { ...this.policies },
      year: Math.floor(this.tick / 52)
    }
  }

  _checkFailure() {
    const aliveAgents = this.agents.filter(a => a.alive)

    // GAME OVER: No one left alive
    if (aliveAgents.length === 0) {
      this.scenarioFailed = true
      return {
        reason: 'extinction',
        message: 'Everyone is dead. Your civilization has ended.',
        report: this._buildReport()
      }
    }

    // GAME OVER: GDP = 0 for 5+ consecutive metrics updates
    if (this.tick % METRICS_UPDATE_EVERY === 0) {
      if (this.metrics.gdp === 0) {
        this._zeroGdpStreak++
      } else {
        this._zeroGdpStreak = 0
      }

      if (this._zeroGdpStreak >= 5) {
        this.scenarioFailed = true
        return {
          reason: 'economic_collapse',
          message: 'GDP has been zero for an extended period — the economy has flatlined.',
          report: this._buildReport()
        }
      }
    }

    return null
  }

  _processBirths() {
    const aliveAdults = this.agents.filter(a =>
      a.alive && a.age > 20 * 52 && a.age < 45 * 52
    )

    for (const parent of aliveAdults) {
      // No population cap — overpopulation creates supply/demand pressure naturally
      const birthChance = 0.02
      if (Math.random() < birthChance) {
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
      const needsLoan = agent._needsBusinessLoan
      delete agent._wantsToStartBusiness
      delete agent._needsBusinessLoan

      if (this.businesses.filter(b => b.alive).length >= 80) continue

      let startCapital
      if (needsLoan) {
        // Try to get a business loan
        const loanAmount = 300
        const bank = this.banks.find(b => b.alive && b.canIssueLoan(agent, 'business', loanAmount, this.policies).approved)
        if (!bank) continue
        bank.issueLoan(agent, 'business', loanAmount, this.policies)
        startCapital = loanAmount
        agent.events.push(`Took business loan ($${loanAmount}) at age ${Math.floor(agent.age / 52)}`)
      } else {
        if (agent.wealth < 300) continue
        startCapital = agent.wealth * 0.5
        agent.wealth -= startCapital
      }

      const { SECTORS } = { SECTORS: ['food', 'housing', 'tech', 'luxury'] }
      const sector = SECTORS[Math.floor(Math.random() * SECTORS.length)]
      const biz = new Business({
        sector,
        capital: startCapital,
        ownerId: agent.id,
        productivity: clamp(normalRand(agent.skill, 0.2), 0.3, 2)
      })

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

    // Remove failed banks
    this.banks = this.banks.filter(b => b.alive)

    // Central bank intervention: create a new bank if all died
    if (this.banks.length === 0) {
      const newBank = new Bank({ reserves: 5000 })
      this.banks.push(newBank)
      // Assign unbanked agents
      for (const agent of this.agents) {
        if (agent.alive && !agent._bankId) {
          agent._bankId = newBank.id
        }
      }
    }
  }

  _emitEconEvent(icon, text, severity = 'info') {
    this._econFeed.push({ icon, text, severity, tick: this.tick })
    if (this._econFeed.length > 20) this._econFeed.shift()
  }

  _detectEconEvents() {
    const m = this.metrics
    const prev = this._prevEconMetrics || {}

    // Deflation spiral
    if (this.market.deflationDrag > 0.05) {
      this._emitEconEvent('📉', `Debt-deflation drag at ${(this.market.deflationDrag * 100).toFixed(0)}%`, 'danger')
    }

    // Panic selling detected (market cap drop >15% in one update)
    if (prev.totalMarketCap > 0 && m.totalMarketCap < prev.totalMarketCap * 0.85) {
      this._emitEconEvent('🔻', 'Panic selling — market crash', 'danger')
    }

    // Bank failure
    if (prev.bankCount !== undefined && m.bankCount < prev.bankCount) {
      this._emitEconEvent('🏦', `Bank failure! ${prev.bankCount - m.bankCount} bank(s) collapsed`, 'danger')
    }

    // Debt spiral surge
    if (m.agentsInDebtSpiral > m.population * 0.15 && (prev.agentsInDebtSpiral || 0) < m.population * 0.15) {
      this._emitEconEvent('🌀', `Debt spiral — ${m.agentsInDebtSpiral} agents trapped`, 'warning')
    }

    // Wage-price spiral (Phillips curve effect)
    if (m.unemployment < 0.03 && m.inflation > 5) {
      this._emitEconEvent('🔥', 'Wage-price spiral — tight labor + high inflation', 'warning')
    }

    // Sovereign debt crisis
    const debtToGdp = Math.abs(m.govDebt) / Math.max(m.gdp, 1)
    if (debtToGdp > 1.5 && (!prev.govDebt || Math.abs(prev.govDebt) / Math.max(prev.gdp, 1) <= 1.5)) {
      this._emitEconEvent('💰', 'Sovereign debt crisis — debt/GDP > 150%', 'danger')
    }

    // Credit boom
    if (m.totalPrivateDebt > m.gdp * 2 && (prev.totalPrivateDebt || 0) <= (prev.gdp || 1) * 2) {
      this._emitEconEvent('💳', 'Credit boom — private debt > 2x GDP', 'warning')
    }

    // Housing bubble (housing price doubled from start)
    const housingPrices = m.history?.sectorPrices?.housing || []
    if (housingPrices.length > 10) {
      const startPrice = housingPrices[0]
      const currentPrice = housingPrices[housingPrices.length - 1]
      if (startPrice > 0 && currentPrice > startPrice * 2.5 && (!prev._housingBubbleEmitted)) {
        this._emitEconEvent('🏠', 'Housing bubble — prices 2.5x from start', 'warning')
        this._prevEconMetrics._housingBubbleEmitted = true
      }
    }

    // Full employment
    if (m.unemployment < 0.02 && (prev.unemployment || 1) >= 0.02) {
      this._emitEconEvent('✅', 'Near full employment!', 'good')
    }

    // Recession detected (GDP shrinking for consecutive updates)
    if (m.gdpGrowth < -0.02 && (prev.gdpGrowth || 0) < -0.02) {
      this._emitEconEvent('📊', 'Recession — GDP contracting', 'danger')
    }

    // Currency crisis (FX rate > 2.0 = severe depreciation)
    const ge = this.globalEconomy
    if (ge.fxRate > 2.0 && (prev.fxRate || 1) <= 2.0) {
      this._emitEconEvent('💱', `Currency crisis — FX rate at ${ge.fxRate.toFixed(2)}`, 'danger')
    }

    // Foreign reserve depletion
    if (ge.foreignReserves < 50 && (prev.foreignReserves || 500) >= 50) {
      this._emitEconEvent('🏦', 'Foreign reserves critically low!', 'danger')
    }

    // Persistent trade deficit
    if (ge.cumulativeTradeBalance < -500 && (prev.cumulativeTradeBalance || 0) >= -500) {
      this._emitEconEvent('📦', 'Chronic trade deficit — imports far exceed exports', 'warning')
    }

    this._prevEconMetrics = {
      totalMarketCap: m.totalMarketCap,
      bankCount: m.bankCount,
      agentsInDebtSpiral: m.agentsInDebtSpiral,
      govDebt: m.govDebt,
      gdp: m.gdp,
      gdpGrowth: m.gdpGrowth,
      totalPrivateDebt: m.totalPrivateDebt,
      unemployment: m.unemployment,
      fxRate: ge.fxRate,
      foreignReserves: ge.foreignReserves,
      cumulativeTradeBalance: ge.cumulativeTradeBalance,
      _housingBubbleEmitted: prev._housingBubbleEmitted
    }
  }

  _advancePolicyLag() {
    for (const key of Object.keys(this.policyLag)) {
      const lag = this.policyLag[key]
      lag.elapsed++
      // Approval affects speed: >80 speeds by 30%, <30 slows by 20%
      let speedMult = 1
      if (this.approvalRating > 80) speedMult = 1.3
      else if (this.approvalRating < 30) speedMult = 0.8
      const effectiveElapsed = lag.elapsed * speedMult
      const progress = Math.min(1, effectiveElapsed / lag.lagTicks)
      this.policies[key] = lag.start + (lag.target - lag.start) * progress
      if (progress >= 1) {
        this.policies[key] = lag.target
        delete this.policyLag[key]
      }
    }
  }

  _updateApprovalRating() {
    const m = this.metrics
    const prev = this._prevMetricsForApproval
    let delta = 0

    if (prev) {
      // GDP growth
      if (m.gdpGrowth > 0) delta += m.gdpGrowth * 20
      else delta += m.gdpGrowth * 30  // negative growth hurts more

      // Unemployment change
      const dUnemp = m.unemployment - (prev.unemployment || 0)
      if (dUnemp < 0) delta += 2  // falling unemployment
      else if (dUnemp > 0) delta -= 3  // rising unemployment

      // Wage growth
      const dWage = m.avgWage - (prev.avgWage || 0)
      if (dWage > 0) delta += 1

      // Poverty change
      const dPov = m.povertyRate - (prev.povertyRate || 0)
      if (dPov < 0) delta += 1.5
      else if (dPov > 0) delta -= 1.5
    }

    // Absolute penalties
    if (m.inflation > 8) delta -= (m.inflation - 8) * 0.15
    if (m.povertyRate > 0.3) delta -= 1
    if (m.socialUnrest > 0.5) delta -= m.socialUnrest * 2
    if ((m.crimeRate || 0) > 0.3) delta -= 1

    // Debt spiral penalty
    if ((m.agentsInDebtSpiral || 0) > m.population * 0.1) delta -= 1

    // Unpopular policies
    const p = this.policies
    if (p.incomeTax > 0.4) delta -= 1
    if (p.wealthConfiscation > 0) delta -= 2
    if (p.nationalizeIndustries) delta -= 1.5

    // Popular policies
    if (p.ubi > 100) delta += 0.5
    if (p.publicHealthcare) delta += 0.3
    if (p.breadAndCircuses) delta += 1

    // Smooth and clamp
    this.approvalRating = clamp(this.approvalRating + delta * 0.3, 0, 100)
    this.approvalHistory.push(Math.round(this.approvalRating * 10) / 10)
    if (this.approvalHistory.length > 200) this.approvalHistory.shift()

    // Save for next delta computation
    this._prevMetricsForApproval = { ...toMetricsSnapshot(m) }

    // Vote of no confidence check
    if (this.approvalRating < 20 && !this._noConfidenceTriggered) {
      this._noConfidenceTriggered = true
      tickEvents(this.eventsState, this._buildState(), this.policies, this.tick, 'voteOfNoConfidence')
    }
    if (this.approvalRating >= 25) {
      this._noConfidenceTriggered = false
    }
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
        id: 'bank_crisis',
        condition: () => this.banks.filter(b => b.alive).length < 2 && this.banks.length >= 2,
        title: 'Banking Crisis',
        body: 'Banks are failing! Reserves depleted by bad loans. Credit dries up and the economy contracts.',
        realWorld: 'The 2008 financial crisis started with bad mortgages. When banks fail, credit freezes, businesses can\'t borrow, and unemployment spikes.'
      },
      {
        id: 'credit_bubble',
        condition: () => m.totalPrivateDebt > m.gdp * 2 && m.gdp > 0,
        title: 'Credit Bubble',
        body: `Private debt is ${((m.totalPrivateDebt / (m.gdp || 1)) * 100).toFixed(0)}% of GDP. Overleveraged economy — one shock could cascade.`,
        realWorld: 'Japan in 1991 and the US in 2008 both had private debt exceeding 200% of GDP before their crashes. Steve Keen\'s research shows this is a key predictor.'
      },
      {
        id: 'stagnation',
        condition: () => m.gdpGrowth < 0 && m.unemployment > 0.12,
        title: 'Stagflation Risk',
        body: 'GDP is shrinking and unemployment is rising simultaneously. The classic policy dilemma.',
        realWorld: 'The 1970s oil crisis created stagflation. Cutting interest rates helps unemployment but worsens inflation. Raising them helps inflation but worsens unemployment.'
      },
      {
        id: 'crime_wave',
        condition: () => (m.crimeRate || 0) > 0.3,
        title: 'Crime Wave',
        body: `Crime rate hit ${(m.crimeRate || 0).toFixed(1)} per 1000. Poverty and unemployment are driving people to desperate measures.`,
        realWorld: 'Research consistently shows crime correlates with poverty, inequality, and unemployment. Policing alone rarely solves root causes.'
      },
      {
        id: 'corporate_scandal',
        condition: () => (m.corporateCrimeCount || 0) > 3,
        title: 'Corporate Scandal',
        body: 'A wave of corporate fraud is eroding trust in the financial system. Businesses are stealing from employees, customers, and banks.',
        realWorld: 'Enron (2001), WorldCom, and the 2008 mortgage fraud — corporate crime costs the economy far more than street crime but receives less attention.'
      },
      {
        id: 'prison_overcrowding',
        condition: () => m.population > 0 && (m.prisonPopulation || 0) / m.population > 0.1,
        title: 'Prison Overcrowding',
        body: `${m.prisonPopulation || 0} people are incarcerated — over 10% of the population. The prison-industrial complex is consuming the workforce.`,
        realWorld: 'The US incarcerates more people per capita than any other nation. Mass incarceration costs $80B/year and removes productive workers from the economy.'
      },
      {
        id: 'debt_spiral',
        condition: () => m.population > 0 && (m.agentsInDebtSpiral || 0) / m.population > 0.15,
        title: 'Debt Trap',
        body: `${(((m.agentsInDebtSpiral || 0) / Math.max(1, m.population)) * 100).toFixed(0)}% of agents are in debt spirals. Poverty becomes self-reinforcing as compounding debt prevents recovery.`,
        realWorld: 'US payday loans trap 12 million Americans yearly in debt cycles. Average borrower pays $520 in fees to borrow $375.'
      },
      {
        id: 'unanchored_expectations',
        condition: () => (m.centralBankCredibility || 1) < 0.3,
        title: 'Unanchored Inflation Expectations',
        body: `Central bank credibility collapsed to ${((m.centralBankCredibility || 0) * 100).toFixed(0)}%. People expect high inflation — and their behavior makes it self-fulfilling.`,
        realWorld: 'Turkey 2021-2023: unorthodox rate cuts destroyed credibility. Inflation expectations unanchored from 15% to 80%+. Once lost, credibility takes years to rebuild.'
      },
      {
        id: 'currency_crisis',
        condition: () => this.globalEconomy.fxRate > 1.8,
        title: 'Currency Crisis',
        body: `Your currency has depreciated to ${this.globalEconomy.fxRate.toFixed(2)}x. Imports are becoming unaffordable. Foreign reserves are draining.`,
        realWorld: 'The 1997 Asian Financial Crisis saw currencies lose 50-80% of value in months. Capital flight, import inflation, and debt denominated in foreign currency create a vicious spiral.'
      },
      {
        id: 'trade_deficit',
        condition: () => this.globalEconomy.cumulativeTradeBalance < -300,
        title: 'Chronic Trade Deficit',
        body: 'Your economy is importing far more than it exports. Foreign reserves are depleting. The currency is under pressure.',
        realWorld: 'The US has run trade deficits since the 1970s, funded by the dollar\'s reserve currency status. Most countries can\'t sustain this — eventually the currency adjusts.'
      },
      {
        id: 'wealth_via_stocks',
        condition: () => {
          const rich = this.agents.filter(a => a.alive && a.wealth > 5000)
          const stockOwners = rich.filter(a => a.portfolio && a.portfolio.length > 0)
          return stockOwners.length > rich.length * 0.7 && m.gini > 0.5
        },
        title: 'Stock Market Inequality',
        body: 'Over 70% of wealthy agents own stocks while the poor cannot invest. Dividends compound inequality faster than wages ever could.',
        realWorld: 'The top 10% of Americans own 93% of all stocks. Investment income grows exponentially while wages grow linearly — the core engine of modern inequality.'
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

  _updateGamification() {
    const m = toMetricsSnapshot(this.metrics)
    const s = {
      approvalRating: this.approvalRating,
      policies: this.policies,
      _score: this._score,
      _peakGdp: this._peakGdp,
      _sawHyperinflation: this._sawHyperinflation,
      _sawGdpCrash: this._sawGdpCrash
    }

    // Track peaks and crashes for recovery achievements
    if (m.gdp > this._peakGdp) this._peakGdp = m.gdp
    if (m.cpi > 200) this._sawHyperinflation = true
    if (this._peakGdp > 0 && m.gdp < this._peakGdp * 0.5) this._sawGdpCrash = true

    // Score
    this._score = computeScore(m, this.approvalRating)
    this._scoreHistory.push(this._score)
    if (this._scoreHistory.length > 200) this._scoreHistory.shift()

    // Check achievements
    for (const ach of ACHIEVEMENTS) {
      if (this._unlockedAchievements.has(ach.id)) continue
      try {
        if (ach.sustained) {
          // Sustained achievement: must be true for N ticks
          if (ach.check(m, s)) {
            this._sustainedCounters[ach.id] = (this._sustainedCounters[ach.id] || 0) + METRICS_UPDATE_EVERY
            if (this._sustainedCounters[ach.id] >= ach.sustained) {
              this._unlockedAchievements.add(ach.id)
              this._newAchievements.push(ach)
            }
          } else {
            this._sustainedCounters[ach.id] = 0
          }
        } else if (ach.check(m, s)) {
          this._unlockedAchievements.add(ach.id)
          this._newAchievements.push(ach)
        }
      } catch { /* guard against missing fields */ }
    }

    // Check milestones (sequential)
    if (this._milestoneProgress < MILESTONES.length) {
      const ms = MILESTONES[this._milestoneProgress]
      try {
        if (ms.sustained) {
          const key = 'ms_' + ms.id
          if (ms.check(m, s)) {
            this._sustainedCounters[key] = (this._sustainedCounters[key] || 0) + METRICS_UPDATE_EVERY
            if (this._sustainedCounters[key] >= ms.sustained) {
              this._completedMilestones.add(ms.id)
              this._milestoneProgress++
            }
          } else {
            this._sustainedCounters[key] = 0
          }
        } else if (ms.check(m, s)) {
          this._completedMilestones.add(ms.id)
          this._milestoneProgress++
        }
      } catch { /* guard */ }
    }
  }

  getSnapshot() {
    return {
      tick: this.tick,
      year: Math.floor(this.tick / 52),
      agents: this.agents.map(a => a.toSnapshot()),
      businesses: this.businesses.map(b => b.toSnapshot()),
      banks: this.banks.map(b => b.toSnapshot()),
      metrics: toMetricsSnapshot(this.metrics),
      market: {
        prices: { ...this.market.prices },
        supply: { ...this.market.supply },
        demand: { ...this.market.demand },
        cpi: this.market.cpi,
        inflation: this.market.inflation,
        avgExpectedInflation: this.market.avgExpectedInflation,
        centralBankCredibility: this.market.centralBankCredibility
      },
      policies: { ...this.policies },
      activeEvents: this.eventsState.activeEvents.map(e => ({
        id: e.id,
        name: e.name,
        icon: e.icon,
        description: e.description,
        startTick: e.startTick
      })),
      pendingChoice: this.eventsState.pendingChoiceEvent ? {
        id: this.eventsState.pendingChoiceEvent.id,
        type: this.eventsState.pendingChoiceEvent.type,
        name: this.eventsState.pendingChoiceEvent.name,
        description: this.eventsState.pendingChoiceEvent.description,
        icon: this.eventsState.pendingChoiceEvent.icon,
        choices: this.eventsState.pendingChoiceEvent.definition.choices
      } : null,
      objectives: this._buildObjectivesSnapshot(),
      scenarioDurationYears: this.scenario.durationYears || null,
      isHistorical: this.scenario.isHistorical || false,
      policyLag: Object.fromEntries(
        Object.entries(this.policyLag).map(([key, lag]) => [key, {
          current: this.policies[key],
          target: lag.target,
          progress: Math.min(1, lag.elapsed / lag.lagTicks)
        }])
      ),
      approvalRating: this.approvalRating,
      approvalHistory: this.approvalHistory,
      // Gamification (strip functions — postMessage can't clone them)
      score: this._score,
      scoreHistory: [...this._scoreHistory],
      achievements: [...this._unlockedAchievements],  // Set of ids → array of strings
      newAchievements: this._newAchievements.splice(0).map(a => ({
        id: a.id, name: a.name, icon: a.icon, description: a.description, category: a.category
      })),
      milestoneProgress: this._milestoneProgress,
      totalMilestones: MILESTONES.length,
      currentMilestone: this._milestoneProgress < MILESTONES.length
        ? { id: MILESTONES[this._milestoneProgress].id, name: MILESTONES[this._milestoneProgress].name, icon: MILESTONES[this._milestoneProgress].icon, description: MILESTONES[this._milestoneProgress].description }
        : null,
      econFeed: this._econFeed.slice(-10),
      globalEconomy: {
        worldPrices: { ...this.globalEconomy.worldPrices },
        fxRate: this.globalEconomy.fxRate,
        foreignReserves: this.globalEconomy.foreignReserves,
        tradeBalance: { ...this.globalEconomy.tradeBalance },
        cumulativeTradeBalance: this.globalEconomy.cumulativeTradeBalance,
        activeShock: this.globalEconomy.activeShock ? {
          type: this.globalEconomy.activeShock.type,
          label: this.globalEconomy.activeShock.label,
          icon: this.globalEconomy.activeShock.icon,
          ticksRemaining: this.globalEconomy.activeShock.ticksRemaining
        } : null,
        history: {
          fxRate: this.globalEconomy.history.fxRate.slice(-100),
          foreignReserves: this.globalEconomy.history.foreignReserves.slice(-100),
          tradeBalance: this.globalEconomy.history.tradeBalance.slice(-100)
        }
      }
    }
  }
}
