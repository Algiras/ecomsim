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
    this._adjustPriceStrategy(state)
    this._adjustWorkforce(state, policies)
    this._checkBankruptcy(state)
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
      this.wageOffered = Math.max(this.wageOffered * 0.98, minWage)
    }
  }

  _adjustPriceStrategy(state) {
    // Markup pricing: cost-plus with competitive awareness
    const avgWage = this.wageOffered
    const costPerUnit = this.employees.length > 0
      ? (avgWage * this.employees.length) / Math.max(this.production, 1)
      : 1

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

    const wage = Math.max(this.wageOffered, policies.minWage || 0)
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
      ownerId: this.ownerId
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
        capital: BUSINESS_START_CAPITAL * (scenario.startCapitalMultiplier || 1),
        productivity: clamp(normalRand(scenario.avgProductivity || 1.0, 0.2), 0.3, 2.5)
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
