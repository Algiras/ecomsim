import {
  SECTORS, INITIAL_PRICES, BASE_PRODUCTION, CANVAS_WIDTH, CANVAS_HEIGHT,
  BUSINESS_START_CAPITAL, BUSINESS_BANKRUPTCY_THRESHOLD,
  BUSINESS_HIRE_THRESHOLD, BUSINESS_FIRE_THRESHOLD,
  MAX_EMPLOYEES, MIN_EMPLOYEES, PROFIT_MARGIN_TARGET
} from '../utils/constants.js'
import { normalRand, randBetween, clamp } from '../utils/math.js'

let nextBusinessId = 1

const BUSINESS_NAMES = {
  food: ['FarmFresh', 'GrainCo', 'HarvestHub', 'OrchardInc', 'FoodWorks', 'NourishCo'],
  housing: ['ShelterCo', 'HomeBase', 'RoofWorks', 'DwellCo', 'AbodeLtd', 'NestBuilders'],
  tech: ['DataSpark', 'ByteForge', 'CodeWorks', 'TechVault', 'NeuralCo', 'SyntaxLtd'],
  luxury: ['GoldEdge', 'EliteCo', 'PremiumHub', 'LuxuryInc', 'OpalWorks', 'CrestLtd']
}

export class Business {
  constructor(options = {}) {
    this.id = options.id ?? nextBusinessId++
    this.alive = true

    this.sector = options.sector ?? SECTORS[Math.floor(Math.random() * SECTORS.length)]
    const names = BUSINESS_NAMES[this.sector]
    this.name = options.name ?? names[Math.floor(Math.random() * names.length)] + ' #' + this.id

    // Position
    this.x = options.x ?? randBetween(30, CANVAS_WIDTH - 30)
    this.y = options.y ?? randBetween(30, CANVAS_HEIGHT - 30)

    // Finances
    this.capital = options.capital ?? BUSINESS_START_CAPITAL
    this.revenue = 0
    this.expenses = 0
    this.profit = 0
    this.profitHistory = []

    // Production
    this.productivity = options.productivity ?? clamp(normalRand(1.0, 0.2), 0.3, 2.5)
    this.production = 0
    this.price = INITIAL_PRICES[this.sector]
    this.inventory = 0
    this.maxInventory = 100

    // Employees
    this.employees = [] // array of agent IDs
    this.maxEmployees = options.maxEmployees ?? Math.floor(randBetween(MIN_EMPLOYEES, MAX_EMPLOYEES))
    this.wageOffered = options.wageOffered ?? 12
    this.hiringCooldown = 0
    this.firingCooldown = 0

    // Market share
    this.marketShare = 0
    this.dominance = 0

    // Owner
    this.ownerId = options.ownerId ?? null

    // Stock market
    this.sharesOutstanding = 100
    this.sharesAvailable = 100  // shares not held by anyone
    this.sharePrice = 0
    this.isPublic = false
    this.dividendRate = 0

    // History
    this.age = 0
    this.totalProduced = 0
    this.totalRevenue = 0
    this.events = []

    // Visual
    this.radius = 10
    this.pulse = 0
  }

  tick(state, policies) {
    if (!this.alive) return

    this.age++
    this.hiringCooldown = Math.max(0, this.hiringCooldown - 1)
    this.firingCooldown = Math.max(0, this.firingCooldown - 1)

    this._produce(policies)
    this._sellGoods(state.prices)
    this._payWages(policies)
    this._applySecurityCosts(state)
    this._applyDepreciation()
    this._adjustPriceStrategy(state)
    this._adjustWorkforce(state, policies)
    this._checkBankruptcy(state)
    this._checkIPO()
    this._updateSharePrice(state)
    this._payDividends(state)
    this._updateVisuals()
  }

  _produce(policies) {
    const employeeCount = this.employees.length
    if (employeeCount === 0) {
      this.production = 0
      return
    }

    let prod = BASE_PRODUCTION[this.sector] * employeeCount * this.productivity

    // Policy effects
    if (policies.subsidiesFarming && this.sector === 'food') prod *= 1.3
    if (policies.educationFunding > 0.5) prod *= (1 + policies.educationFunding * 0.1)

    this.production = Math.floor(prod)
    this.inventory = Math.min(this.inventory + this.production, this.maxInventory)
    this.totalProduced += this.production
  }

  _sellGoods(prices) {
    const price = prices[this.sector] || INITIAL_PRICES[this.sector]
    const sold = Math.min(this.inventory, Math.floor(this.production * 0.9))
    this.revenue = sold * price
    this.inventory = Math.max(0, this.inventory - sold)
    this.capital += this.revenue
    this.totalRevenue += this.revenue
  }

  _payWages(policies) {
    const minWage = policies.minWage || 0
    const effectiveWage = Math.max(this.wageOffered, minWage)
    const totalWages = effectiveWage * this.employees.length

    this.expenses = totalWages
    this.capital -= totalWages
    this.profit = this.revenue - this.expenses
    this.profitHistory.push(this.profit)
    if (this.profitHistory.length > 50) this.profitHistory.shift()

    // Corporate tax
    if (this.profit > 0) {
      const tax = policies.corporateTax || 0
      const taxPaid = this.profit * tax
      this.capital -= taxPaid
    }

    // Adjust wage offering based on profit
    if (this.profit > this.revenue * PROFIT_MARGIN_TARGET * 2) {
      this.wageOffered = Math.min(this.wageOffered * 1.02, 100)
    } else if (this.profit < 0 && this.employees.length > 0) {
      if (this.capital < BUSINESS_BANKRUPTCY_THRESHOLD / 2) {
        this.wageOffered = Math.max(this.wageOffered * 0.92, minWage) // emergency cut
      } else {
        this.wageOffered = Math.max(this.wageOffered * 0.95, minWage)
      }
    }
  }

  _applySecurityCosts(state) {
    // Higher crime rate → higher security costs for businesses
    const crimeRate = state.metrics?.crimeRate || 0
    if (crimeRate > 0) {
      const securityCost = crimeRate * this.employees.length * 0.1
      this.capital -= securityCost
    }
  }

  _applyDepreciation() {
    // Capital depreciation: maintenance, equipment wear, overhead
    // ~0.3% per tick — prevents unbounded capital accumulation
    if (this.capital > 500) {
      this.capital -= (this.capital - 500) * 0.003
    }
    // Fixed operating costs: even idle businesses bleed money
    this.capital -= this.employees.length * 0.5
  }

  _adjustPriceStrategy(state) {
    // Markup pricing: cost-plus with competitive awareness
    const avgWage = this.wageOffered
    const costPerUnit = this.employees.length > 0
      ? (avgWage * this.employees.length) / Math.max(this.production, 1)
      : 1

    // Cost-push inflation: rising costs push prices up
    if (this._prevCostPerUnit && costPerUnit > this._prevCostPerUnit * 1.02) {
      this.price *= 1 + (costPerUnit / this._prevCostPerUnit - 1) * 0.3
    }
    this._prevCostPerUnit = costPerUnit

    // If inventory is piling up, lower price; if low, raise price
    const inventoryRatio = this.inventory / this.maxInventory
    if (inventoryRatio > 0.8) {
      this.price *= 0.995  // overstock, discount
    } else if (inventoryRatio < 0.2 && this.production > 0) {
      this.price *= 1.005  // scarce, raise price
    }

    // Anti-monopoly: if market share > 40%, regulators force lower prices
    if (state.policies?.antiMonopoly && this.dominance > 0.4) {
      this.price *= 0.99
    }

    // Price fixing: dominant businesses inflate prices when unregulated
    if (!state.policies?.antiMonopoly && this.dominance > 0.7) {
      this.price *= 1.035  // aggressive gouging
    } else if (!state.policies?.antiMonopoly && this.dominance > 0.5) {
      this.price *= 1.02   // collude to raise prices
    }
  }

  _adjustWorkforce(state, policies) {
    const utilizationRate = this.production > 0
      ? Math.min(this.production / (BASE_PRODUCTION[this.sector] * this.maxEmployees * this.productivity), 1)
      : 0

    // Hiring
    if (
      this.hiringCooldown === 0 &&
      this.employees.length < this.maxEmployees &&
      utilizationRate > BUSINESS_HIRE_THRESHOLD &&
      this.capital > this.wageOffered * 20
    ) {
      this._hire(state)
    }

    // Firing
    if (
      this.firingCooldown === 0 &&
      this.employees.length > 1 &&
      (utilizationRate < BUSINESS_FIRE_THRESHOLD || this.capital < 0)
    ) {
      this._fire(state)
    }
  }

  _hire(state) {
    const unemployed = state.agents?.filter(a =>
      a.alive && !a.employed && !a.isOwner && a.state !== 'child' && a.state !== 'retired'
    ) || []

    if (unemployed.length === 0) return

    // Hire the most skilled available
    unemployed.sort((a, b) => b.skill - a.skill)
    const candidate = unemployed[0]

    const wage = Math.max(this.wageOffered, state.policies?.minWage || 0)
    candidate.hire(this, wage)
    this.employees.push(candidate.id)
    this.hiringCooldown = 10
    this.events.push(`Hired agent #${candidate.id}`)
  }

  _fire(state) {
    if (this.employees.length === 0) return

    const agentId = this.employees[this.employees.length - 1] // fire last hired
    this.employees = this.employees.filter(id => id !== agentId)

    const agent = state.agents?.find(a => a.id === agentId)
    if (agent) {
      agent.fire('layoff')
    }
    this.firingCooldown = 15
    this.events.push(`Fired agent #${agentId}`)
  }

  _checkBankruptcy(state) {
    if (this.capital < BUSINESS_BANKRUPTCY_THRESHOLD) {
      this._close(state, 'bankruptcy')
    }
  }

  _close(state, reason) {
    this.alive = false
    this.events.push(`Closed due to ${reason}`)

    // Fire all employees
    for (const agentId of this.employees) {
      const agent = state.agents?.find(a => a.id === agentId)
      if (agent) agent.fire(reason)
    }
    this.employees = []

    // Liquidate shares — pay shareholders capital / shares
    if (this.isPublic && this.capital > 0 && state.agents) {
      const perShare = Math.max(0, this.capital / this.sharesOutstanding)
      for (const agent of state.agents) {
        if (!agent.alive || !agent.portfolio) continue
        const idx = agent.portfolio.findIndex(p => p.businessId === this.id)
        if (idx === -1) continue
        agent.wealth += agent.portfolio[idx].shares * perShare
        agent.portfolio.splice(idx, 1)
      }
    }

    // Notify owner
    if (this.ownerId) {
      const owner = state.agents?.find(a => a.id === this.ownerId)
      if (owner) {
        owner.isOwner = false
        owner.businessId = null
        owner.events.push(`Business closed (${reason}) at age ${Math.floor(owner.age / 52)}`)
        owner._updateState?.()
      }
    }
  }

  _checkIPO() {
    if (this.isPublic) return
    if (this.age > 100 && this.capital > 1000 && this.profit > 0) {
      this.isPublic = true
      // Owner retains 40 shares, 60 available for purchase
      this.sharesAvailable = 60
      this.events.push('Went public via IPO')
    }
  }

  _updateSharePrice(state) {
    if (!this.isPublic) return
    const avgProfit = this.profitHistory.length > 0
      ? this.profitHistory.reduce((s, v) => s + v, 0) / this.profitHistory.length
      : 0
    // Rate-sensitive PE: low rates → higher valuations (asset price channel)
    const ratePremium = Math.max(0, 0.05 - (state.policies?.interestRate || 0.05)) * 100
    const peMultiple = 10 + (this.marketShare || 0) * 20 + ratePremium
    this.sharePrice = Math.max(0, avgProfit * peMultiple / this.sharesOutstanding)
    // Inflation discount
    const avgExpInfl = state.market?.avgExpectedInflation || 0.02
    if (avgExpInfl > 0.05) {
      this.sharePrice *= 1 - Math.max(0, (avgExpInfl - 0.05) * 2)
      this.sharePrice = Math.max(0, this.sharePrice)
    }
  }

  _payDividends(state) {
    if (!this.isPublic || this.profit <= 0) return
    if (this.age % 10 !== 0) return  // pay dividends every 10 ticks

    this.dividendRate = clamp(0.1 + Math.random() * 0.2, 0.1, 0.3)
    const totalDividend = this.profit * this.dividendRate
    const capitalGainsTax = state.policies?.capitalGainsTax || 0.15

    // Distribute to shareholders (agents with portfolio entries)
    const agents = state.agents || []
    for (const agent of agents) {
      if (!agent.alive || !agent.portfolio) continue
      const holding = agent.portfolio.find(p => p.businessId === this.id)
      if (!holding || holding.shares <= 0) continue

      const share = holding.shares / this.sharesOutstanding
      const payout = totalDividend * share
      const afterTax = payout * (1 - capitalGainsTax)
      agent.wealth += afterTax
      agent.investmentIncome += afterTax
    }

    // Tax revenue goes to govBudget
    if (state.metrics) {
      state.metrics.govBudget = (state.metrics.govBudget || 0) + totalDividend * capitalGainsTax * 0.1
    }

    this.capital -= totalDividend
  }

  _updateVisuals() {
    // Pulse effect when profitable
    if (this.profit > this.revenue * 0.2) {
      this.pulse = Math.min(1, this.pulse + 0.05)
    } else {
      this.pulse = Math.max(0, this.pulse - 0.03)
    }
    this.radius = 8 + this.employees.length * 0.5 + this.pulse * 3
  }

  toSnapshot() {
    return {
      id: this.id,
      x: this.x,
      y: this.y,
      alive: this.alive,
      sector: this.sector,
      name: this.name,
      capital: this.capital,
      revenue: this.revenue,
      profit: this.profit,
      production: this.production,
      price: this.price,
      inventory: this.inventory,
      employees: [...this.employees],
      employeeCount: this.employees.length,
      maxEmployees: this.maxEmployees,
      wageOffered: this.wageOffered,
      marketShare: this.marketShare,
      dominance: this.dominance,
      productivity: this.productivity,
      age: this.age,
      radius: this.radius,
      pulse: this.pulse,
      ownerId: this.ownerId,
      isPublic: this.isPublic,
      sharePrice: this.sharePrice,
      sharesOutstanding: this.sharesOutstanding,
      sharesAvailable: this.sharesAvailable,
      dividendRate: this.dividendRate
    }
  }
}

export function createInitialBusinesses(count, agents, scenario = {}) {
  nextBusinessId = 1
  const businesses = []

  // Distribute across sectors
  const perSector = Math.floor(count / SECTORS.length)

  for (const sector of SECTORS) {
    for (let i = 0; i < perSector; i++) {
      const business = new Business({
        sector,
        capital: BUSINESS_START_CAPITAL * (scenario.startCapitalMultiplier || 1) * (0.5 + Math.random()),
        productivity: clamp(normalRand(scenario.avgProductivity || 1.0, 0.2), 0.3, 2.5) * (0.7 + Math.random() * 0.6)
      })

      // Assign an owner from unemployed agents
      const availableOwners = agents.filter(a =>
        a.alive && !a.employed && !a.isOwner && a.state !== 'child' && a.state !== 'retired' && a.skill > 0.4
      )
      if (availableOwners.length > 0) {
        availableOwners.sort((a, b) => b.skill - a.skill)
        const owner = availableOwners[0]
        business.ownerId = owner.id
        owner.isOwner = true
        owner.businessId = business.id
        owner.employed = true
        owner.employerId = business.id
        owner.wage = 20 // owner pays themselves
        owner.jobSector = sector
        owner.state = 'owner'
        business.employees.push(owner.id)
      }

      businesses.push(business)
    }
  }

  return businesses
}
