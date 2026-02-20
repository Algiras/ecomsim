import {
  INITIAL_WEALTH_MEAN, INITIAL_WEALTH_STD, WORKING_AGE, RETIREMENT_AGE,
  MAX_AGE, POVERTY_THRESHOLD, RICH_THRESHOLD, CONSUMPTION_RATE,
  CANVAS_WIDTH, CANVAS_HEIGHT, MOVE_SPEED, WANDER_STRENGTH,
  BIRTH_RATE_BASE
} from '../utils/constants.js'
import { normalRand, randBetween, clamp, randomDirection, add, scale, normalize } from '../utils/math.js'

let nextId = 1

export const AgentState = {
  CHILD: 'child',
  WORKING: 'working',
  UNEMPLOYED: 'unemployed',
  RETIRED: 'retired',
  BUSINESS_OWNER: 'owner',
  DEAD: 'dead'
}

export class Agent {
  constructor(options = {}) {
    this.id = options.id ?? nextId++
    this.alive = true

    // Position
    this.x = options.x ?? randBetween(20, CANVAS_WIDTH - 20)
    this.y = options.y ?? randBetween(20, CANVAS_HEIGHT - 20)
    this.vx = 0
    this.vy = 0
    this.targetX = this.x
    this.targetY = this.y

    // Demographics
    this.age = options.age ?? Math.floor(randBetween(WORKING_AGE, RETIREMENT_AGE * 0.6))
    this.gender = Math.random() > 0.5 ? 'M' : 'F'
    this.skill = options.skill ?? clamp(normalRand(0.5, 0.2), 0.1, 1.0) // 0-1 skill level
    this.health = options.health ?? clamp(normalRand(0.8, 0.15), 0.1, 1.0)
    this.education = options.education ?? clamp(normalRand(0.5, 0.25), 0, 1.0)

    // Finances
    this.wealth = options.wealth ?? clamp(normalRand(INITIAL_WEALTH_MEAN, INITIAL_WEALTH_STD), 10, Infinity)
    this.income = 0
    this.expenses = 0
    this.debt = 0

    // Employment
    this.employed = false
    this.employerId = null
    this.wage = 0
    this.jobSector = null
    this.unemployedTicks = 0
    this.workHistory = []

    // Business ownership
    this.businessId = null
    this.isOwner = false

    // Social
    this.happiness = 0.5
    this.unrest = 0
    this.socialClass = 'middle' // poor, middle, rich

    // Life history (for tooltip)
    this.events = []
    this.bornInYear = options.bornInYear ?? 0
    this.parentWealth = options.parentWealth ?? INITIAL_WEALTH_MEAN

    // Movement
    this.moveTimer = Math.random() * 60
    this.homeX = this.x
    this.homeY = this.y

    // Visual state
    this.highlight = false
    this.selected = false
    this.deathFade = 1.0

    this._updateState()
  }

  _updateState() {
    if (this.age < WORKING_AGE) {
      this.state = AgentState.CHILD
    } else if (this.age >= RETIREMENT_AGE) {
      this.state = AgentState.RETIRED
    } else if (this.isOwner) {
      this.state = AgentState.BUSINESS_OWNER
    } else if (this.employed) {
      this.state = AgentState.WORKING
    } else {
      this.state = AgentState.UNEMPLOYED
    }

    // Social class
    if (this.wealth < POVERTY_THRESHOLD) {
      this.socialClass = 'poor'
    } else if (this.wealth >= RICH_THRESHOLD) {
      this.socialClass = 'rich'
    } else {
      this.socialClass = 'middle'
    }
  }

  tick(state, policies) {
    if (!this.alive) return

    this.age++

    // Natural death
    if (this._shouldDie(policies)) {
      this._die(state, 'natural causes')
      return
    }

    // Age transitions
    this._updateState()

    // Movement
    this._move(state)

    // Economic activity
    if (this.state !== AgentState.CHILD) {
      this._consumeGoods(state.prices, policies)
      this._earnIncome(policies)
      this._updateHappiness(state, policies)
      this._considerStartingBusiness(state, policies)
    }

    // Poverty death
    if (this.wealth < -500 && this.state !== AgentState.CHILD) {
      this._die(state, 'poverty')
      return
    }
  }

  _shouldDie(policies) {
    if (this.age >= MAX_AGE) return true
    // Health-based death chance
    const healthMultiplier = policies.publicHealthcare ? 0.5 : 1.0
    const ageMultiplier = this.age > RETIREMENT_AGE ? 3 : 1
    const deathChance = 0.00005 * ageMultiplier * (1 - this.health * 0.5) * healthMultiplier
    return Math.random() < deathChance
  }

  _die(state, cause) {
    this.alive = false
    this.state = AgentState.DEAD
    this.employed = false
    this.employerId = null
    this.deathFade = 1.0
    this.events.push(`Died from ${cause} at age ${Math.floor(this.age / 52)}`)

    // Inheritance: pass wealth to random living agent
    if (this.wealth > 0 && state.agents) {
      const heirs = state.agents.filter(a => a.alive && a.id !== this.id)
      if (heirs.length > 0) {
        const heir = heirs[Math.floor(Math.random() * heirs.length)]
        heir.wealth += this.wealth * 0.8 // 20% estate tax (if enabled, handled in policy)
        heir.events.push(`Inherited ${Math.round(this.wealth * 0.8)} from agent #${this.id}`)
      }
    }
  }

  _move(state) {
    this.moveTimer--
    if (this.moveTimer <= 0) {
      this.moveTimer = randBetween(30, 120)
      // Move toward employer if employed
      if (this.employed && this.employerId && state.businesses) {
        const employer = state.businesses.find(b => b.id === this.employerId)
        if (employer) {
          this.targetX = employer.x + normalRand(0, 30)
          this.targetY = employer.y + normalRand(0, 30)
        } else {
          this._wanderTarget()
        }
      } else {
        this._wanderTarget()
      }
    }

    // Smooth movement toward target
    const dx = this.targetX - this.x
    const dy = this.targetY - this.y
    const d = Math.sqrt(dx * dx + dy * dy)
    if (d > 2) {
      this.vx = (dx / d) * MOVE_SPEED
      this.vy = (dy / d) * MOVE_SPEED
    } else {
      this.vx *= 0.9
      this.vy *= 0.9
    }

    // Add slight wander
    this.vx += (Math.random() - 0.5) * WANDER_STRENGTH
    this.vy += (Math.random() - 0.5) * WANDER_STRENGTH

    this.x = clamp(this.x + this.vx, 5, CANVAS_WIDTH - 5)
    this.y = clamp(this.y + this.vy, 5, CANVAS_HEIGHT - 5)
  }

  _wanderTarget() {
    this.targetX = clamp(this.x + normalRand(0, 60), 10, CANVAS_WIDTH - 10)
    this.targetY = clamp(this.y + normalRand(0, 60), 10, CANVAS_HEIGHT - 10)
  }

  _consumeGoods(prices, policies) {
    let totalExpenses = 0
    const income = this.wage || 0

    for (const sector of ['food', 'housing', 'tech', 'luxury']) {
      let amount = CONSUMPTION_RATE[sector]

      // Price controls suppress consumption
      if (policies[`priceControl${sector.charAt(0).toUpperCase() + sector.slice(1)}`]) {
        amount *= 0.8
      }

      // Wealth affects luxury spending
      if (sector === 'luxury' && this.wealth < POVERTY_THRESHOLD * 2) {
        amount = 0 // poor people don't buy luxury
      }

      const cost = (income * amount) / (prices[sector] || 1) * prices[sector]
      totalExpenses += cost
    }

    this.expenses = totalExpenses
    this.wealth -= totalExpenses * 0.1 // simplified consumption per tick
  }

  _earnIncome(policies) {
    let income = 0

    if (this.employed && this.wage > 0) {
      // Apply income tax
      const tax = policies.incomeTax || 0
      income = this.wage * (1 - tax)
    } else if (this.state === AgentState.UNEMPLOYED) {
      // Unemployment benefit
      if (policies.unemploymentBenefit > 0) {
        income = policies.unemploymentBenefit * 0.1
      }
      this.unemployedTicks++
    }

    // UBI
    if (policies.ubi > 0 && this.state !== AgentState.CHILD) {
      income += policies.ubi * 0.01
    }

    this.income = income
    this.wealth += income
  }

  _updateHappiness(state, policies) {
    let h = 0.5

    // Wealth factor
    const wealthRatio = this.wealth / 1000
    h += clamp(wealthRatio * 0.2, -0.3, 0.3)

    // Employment factor
    if (this.employed) h += 0.1
    else h -= 0.15

    // Inequality unhappiness (if very unequal)
    if (state.metrics?.gini > 0.6) h -= 0.1

    // Healthcare
    if (policies.publicHealthcare) h += 0.05

    this.happiness = clamp(h, 0, 1)
    this.unrest = clamp(1 - this.happiness - 0.3, 0, 1)
  }

  _considerStartingBusiness(state, policies) {
    // Unemployed agents with enough wealth might start a business
    if (
      this.state === AgentState.UNEMPLOYED &&
      this.wealth > 300 &&
      this.skill > 0.4 &&
      !this.businessId &&
      Math.random() < 0.00003
    ) {
      // Signal to engine to create business
      this._wantsToStartBusiness = true
    }
  }

  hire(business, wage) {
    this.employed = true
    this.employerId = business.id
    this.wage = wage
    this.jobSector = business.sector
    this.unemployedTicks = 0
    this.workHistory.push({ businessId: business.id, sector: business.sector, wage, startAge: this.age })
    this.events.push(`Hired at ${business.name} (age ${Math.floor(this.age / 52)})`)
    this._updateState()
  }

  fire(reason = 'layoff') {
    if (this.workHistory.length > 0) {
      const last = this.workHistory[this.workHistory.length - 1]
      last.endAge = this.age
      last.reason = reason
    }
    this.events.push(`Lost job (${reason}) at age ${Math.floor(this.age / 52)}`)
    this.employed = false
    this.employerId = null
    this.wage = 0
    this.jobSector = null
    this._updateState()
  }

  toSnapshot() {
    return {
      id: this.id,
      x: this.x,
      y: this.y,
      alive: this.alive,
      state: this.state,
      wealth: this.wealth,
      age: this.age,
      skill: this.skill,
      health: this.health,
      education: this.education,
      happiness: this.happiness,
      unrest: this.unrest,
      employed: this.employed,
      employerId: this.employerId,
      socialClass: this.socialClass,
      wage: this.wage,
      jobSector: this.jobSector,
      isOwner: this.isOwner,
      businessId: this.businessId,
      deathFade: this.deathFade,
      events: this.events.slice(-10) // last 10 events for tooltip
    }
  }
}

export function createInitialAgents(count, scenario = {}) {
  nextId = 1
  const agents = []
  for (let i = 0; i < count; i++) {
    const wealthBias = scenario.wealthInequality || 1
    const baseWealth = Math.max(10, normalRand(
      INITIAL_WEALTH_MEAN * (scenario.wealthMultiplier || 1),
      INITIAL_WEALTH_STD * wealthBias
    ))
    agents.push(new Agent({
      wealth: baseWealth,
      skill: clamp(normalRand(scenario.avgSkill || 0.5, 0.2), 0.05, 1),
      education: clamp(normalRand(scenario.avgEducation || 0.5, 0.25), 0, 1),
      bornInYear: 0
    }))
  }
  return agents
}
