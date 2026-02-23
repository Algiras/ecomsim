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

    // Banking
    this.creditScore = options.creditScore ?? 500  // 300-850
    this.deposits = 0           // money held at bank
    this.loans = []             // active loan references
    this.monthlyLoanPayment = 0
    this.hasMortgage = false
    this._bankId = null

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

    // Debt spiral
    this.consecutiveMissedPayments = 0
    this.inDebtSpiral = false
    this.wageGarnishmentRate = 0

    // Inflation expectations
    this.inflationExpectation = 0.02

    // Stock portfolio
    this.portfolio = []  // [{ businessId, shares, avgCostBasis }]
    this.investmentIncome = 0

    // Crime
    this.criminalRecord = []    // [{ type, tick }]
    this.incarcerated = false
    this.prisonTicks = 0        // remaining sentence
    this.reoffendRisk = 0       // increases with each offense
    this.victimTick = 0         // tick when last victimized (for happiness penalty)

    // Life history (for tooltip)
    this.events = []
    this.bornInYear = options.bornInYear ?? 0
    this.parentWealth = options.parentWealth ?? INITIAL_WEALTH_MEAN

    // Movement — phase-based daily routine
    this.homeX = this.x
    this.homeY = this.y
    this.routinePhase = 'home'          // home | working | shopping | leisure
    this.routineTimer = Math.floor(Math.random() * 80)

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

    // Prison: serve sentence, skip economic activity
    if (this.incarcerated) {
      this._serveSentence(state, policies)
      return
    }

    // Economic activity
    if (this.state !== AgentState.CHILD) {
      this._updateInflationExpectation(state)
      this._consumeGoods(state, policies)
      this._earnIncome(policies)
      this._updateHappiness(state, policies)
      this._considerCrime(state, policies)
      this._considerStartingBusiness(state, policies)
      this._considerInvesting(state, policies)
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

    // Close owned business — owner is gone, business can't survive
    if (this.isOwner && this.businessId && state.businesses) {
      const biz = state.businesses.find(b => b.id === this.businessId)
      if (biz && biz.alive) {
        biz._close(state, 'owner died')
      }
    }
    this.isOwner = false
    this.businessId = null

    // Remove from employer's employee list
    if (state.businesses) {
      for (const biz of state.businesses) {
        biz.employees = biz.employees.filter(id => id !== this.id)
      }
    }

    // Clear banking state (loans handled by bank.tick detecting dead agents)
    this.deposits = 0
    this._bankId = null
    this.hasMortgage = false
    this.monthlyLoanPayment = 0

    // Inheritance: pass wealth + portfolio to random living agent
    if (this.wealth > 0 && state.agents) {
      const heirs = state.agents.filter(a => a.alive && a.id !== this.id)
      if (heirs.length > 0) {
        const heir = heirs[Math.floor(Math.random() * heirs.length)]
        heir.wealth += this.wealth * 0.8 // 20% estate tax (if enabled, handled in policy)
        // Inherit stock portfolio
        if (this.portfolio.length > 0) {
          for (const holding of this.portfolio) {
            const existing = heir.portfolio.find(p => p.businessId === holding.businessId)
            if (existing) {
              existing.shares += holding.shares
            } else {
              heir.portfolio.push({ ...holding })
            }
          }
          this.portfolio = []
        }
        heir.events.push(`Inherited ${Math.round(this.wealth * 0.8)} from agent #${this.id}`)
      }
    }
  }

  _move(state) {
    this.routineTimer--

    const dx = this.targetX - this.x
    const dy = this.targetY - this.y
    const d = Math.sqrt(dx * dx + dy * dy)
    const atTarget = d <= 8

    // Only advance routine when arrived (or after a generous grace period)
    if (this.routineTimer <= 0 && (atTarget || this.routineTimer < -120)) {
      this._advanceRoutine(state)
    }

    if (d > 2) {
      const ticksLeft = Math.max(this.routineTimer, 1)
      const speed = Math.max(MOVE_SPEED, d / (ticksLeft * 0.6))
      const desiredVx = (dx / d) * speed
      const desiredVy = (dy / d) * speed
      this.vx += (desiredVx - this.vx) * 0.3
      this.vy += (desiredVy - this.vy) * 0.3
    } else {
      this.vx *= 0.85
      this.vy *= 0.85
      this.vx += (Math.random() - 0.5) * WANDER_STRENGTH
      this.vy += (Math.random() - 0.5) * WANDER_STRENGTH
      if (this.routineTimer > 16) this.routineTimer = 16
    }

    this.x = clamp(this.x + this.vx, 5, CANVAS_WIDTH - 5)
    this.y = clamp(this.y + this.vy, 5, CANVAS_HEIGHT - 5)
  }

  // Phase-based daily routine: home → working → shopping → leisure → home
  _advanceRoutine(state) {
    const businesses = state.businesses?.filter(b => b.alive) || []

    // Children just play near home
    if (this.state === AgentState.CHILD) {
      this.targetX = clamp(this.homeX + normalRand(0, 25), 10, CANVAS_WIDTH - 10)
      this.targetY = clamp(this.homeY + normalRand(0, 25), 10, CANVAS_HEIGHT - 10)
      this.routineTimer = randBetween(40, 100)
      this.routinePhase = 'leisure'
      return
    }

    switch (this.routinePhase) {
      case 'home': {
        if (this.employed && this.employerId) {
          const employer = businesses.find(b => b.id === this.employerId)
          if (employer) {
            this.targetX = employer.x + normalRand(0, 18)
            this.targetY = employer.y + normalRand(0, 18)
            this.routinePhase = 'working'
            this.routineTimer = randBetween(50, 110)
          } else {
            this._setLeisureTarget()
            this.routinePhase = 'leisure'
            this.routineTimer = randBetween(30, 60)
          }
        } else {
          if (Math.random() < 0.45) {
            this._setShoppingTarget(businesses)
          } else {
            this._setLeisureTarget()
            this.routinePhase = 'leisure'
          }
          this.routineTimer = randBetween(40, 90)
        }
        break
      }

      case 'working': {
        if (Math.random() < 0.55) {
          this._setShoppingTarget(businesses)
          this.routineTimer = randBetween(24, 56)
        } else {
          this._goHome()
          this.routineTimer = randBetween(40, 80)
        }
        break
      }

      case 'shopping': {
        if (Math.random() < 0.35) {
          this._setLeisureTarget()
          this.routinePhase = 'leisure'
          this.routineTimer = randBetween(20, 50)
        } else {
          this._goHome()
          this.routineTimer = randBetween(40, 90)
        }
        break
      }

      case 'leisure': {
        this._goHome()
        this.routineTimer = randBetween(40, 100)
        break
      }

      default:
        this._goHome()
        this.routineTimer = randBetween(40, 80)
    }
  }

  _goHome() {
    this.targetX = this.homeX + normalRand(0, 18)
    this.targetY = this.homeY + normalRand(0, 18)
    this.routinePhase = 'home'
  }

  _setLeisureTarget() {
    this.targetX = clamp(this.x + normalRand(0, 30), 10, CANVAS_WIDTH - 10)
    this.targetY = clamp(this.y + normalRand(0, 30), 10, CANVAS_HEIGHT - 10)
    this.routinePhase = 'leisure'
  }

  _setShoppingTarget(businesses) {
    // Find a nearby food or housing business
    const shops = businesses.filter(b => b.sector === 'food' || b.sector === 'housing')
    if (shops.length === 0) {
      this._setLeisureTarget()
      return
    }
    // Weight by proximity (closer = more likely) — pick from nearest 4
    const sorted = shops
      .map(b => ({ b, d: (b.x - this.x) ** 2 + (b.y - this.y) ** 2 }))
      .sort((a, b) => a.d - b.d)
    const pick = sorted[Math.floor(Math.random() * Math.min(4, sorted.length))].b
    this.targetX = pick.x + normalRand(0, 18)
    this.targetY = pick.y + normalRand(0, 18)
    this.routinePhase = 'shopping'
  }

  _consumeGoods(state, policies) {
    const prices = state.prices || state
    if (!prices) return
    let totalExpenses = 0
    const income = this.wage || 0

    for (const sector of ['food', 'housing', 'tech', 'luxury']) {
      let amount = CONSUMPTION_RATE[sector]

      // Housing: mortgage holders pay fixed loan amount instead of market rent
      if (sector === 'housing' && this.hasMortgage) {
        // Mortgage payment handled by bank.tick — skip market cost
        continue
      }

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

    // Inflation expectations: if expecting high inflation, spend faster (self-fulfilling)
    if (this.inflationExpectation > 0.03) {
      const spendMult = 1 + Math.min(1, (this.inflationExpectation - 0.03) * 5)
      totalExpenses *= spendMult
    }

    // Lifestyle inflation: wealthy agents spend more (diminishing returns on hoarding)
    if (this.wealth > 1000) {
      const lifestyleDrain = (this.wealth - 1000) * 0.002 // 0.2% of excess wealth per tick
      totalExpenses += lifestyleDrain
    }

    // Random life events: unexpected expenses (medical, repair, emergency)
    if (Math.random() < 0.001) {
      const emergencyCost = this.wealth * (0.05 + Math.random() * 0.10)
      totalExpenses += Math.max(0, emergencyCost)
    }

    this.expenses = totalExpenses
    this.wealth -= totalExpenses * 0.65 // real consumption per tick

    // Try to get a mortgage if renting and eligible
    if (!this.hasMortgage && this.creditScore >= 500 && this.wealth > 100 && state.banks) {
      this._tryGetMortgage(state, policies)
    }

    // Food price pressure on health
    const businesses = state.businesses
    const foodPrice = prices.food || 10
    if (businesses) {
      const foodBiz = businesses.filter(b => b.alive && b.sector === 'food')
      if (foodBiz.length === 0) {
        this.health = Math.max(0, this.health - 0.01)
      } else if (foodPrice > 50) {
        // Food crisis: everyone suffers
        this.health = Math.max(0, this.health - 0.002)
      } else if (foodPrice > 30 && this.wealth < POVERTY_THRESHOLD) {
        // High food prices hit the poor hardest
        this.health = Math.max(0, this.health - 0.005)
      }
    }
  }

  _tryGetMortgage(state, policies) {
    if (Math.random() > 0.001) return // don't check every tick
    const banks = (state.banks || []).filter(b => b.alive)
    if (banks.length === 0) return

    const housingPrice = (state.prices?.housing || 50) * 100
    const maxLTV = policies.maxLoanToValue ?? 0.8
    const loanAmount = housingPrice * maxLTV
    const downPayment = housingPrice - loanAmount

    if (this.wealth < downPayment) return

    for (const bank of banks) {
      const check = bank.canIssueLoan(this, 'mortgage', loanAmount, policies)
      if (check.approved) {
        this.wealth -= downPayment
        bank.issueLoan(this, 'mortgage', loanAmount, policies)
        this.hasMortgage = true
        this.events.push(`Took mortgage ($${Math.round(loanAmount)}) at age ${Math.floor(this.age / 52)}`)
        break
      }
    }
  }

  _earnIncome(policies) {
    let income = 0

    if (this.employed && this.wage > 0) {
      // Apply income tax
      const tax = policies.incomeTax || 0
      income = this.wage * (1 - tax)
      // Wage garnishment for debt spiral
      if (this.wageGarnishmentRate > 0) {
        income -= income * this.wageGarnishmentRate
      }
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

    // Credit score: slowly build for employed, degrade for unemployed
    if (this.employed) {
      this.creditScore = clamp(this.creditScore + 0.5, 300, 850)
    }
  }

  _updateHappiness(state, policies) {
    let h = 0.5

    // Wealth factor
    const wealthRatio = this.wealth / 1000
    h += clamp(wealthRatio * 0.2, -0.3, 0.3)

    // Employment factor
    if (this.employed) h += 0.1
    else h -= 0.15

    // Health factor: low health reduces happiness
    h -= (1 - this.health) * 0.15

    // Homelessness: no housing businesses → happiness penalty
    if (state.businesses) {
      const housingBiz = state.businesses.filter(b => b.alive && b.sector === 'housing')
      if (housingBiz.length === 0) h -= 0.1
    }

    // Inequality unhappiness (if very unequal)
    if (state.metrics?.gini > 0.6) h -= 0.1

    // Healthcare
    if (policies.publicHealthcare) h += 0.05

    // Crime victim penalty (recent victimization)
    if (this.victimTick > 0 && (state.metrics?.tick || 0) - this.victimTick < 200) {
      h -= 0.15
    }

    // Debt spiral unhappiness
    if (this.inDebtSpiral) h -= 0.25

    this.happiness = clamp(h, 0, 1)
    this.unrest = clamp(1 - this.happiness - 0.3, 0, 1)
  }

  _considerStartingBusiness(state, policies) {
    // Unemployed agents with enough wealth (or credit) might start a business
    if (
      this.state === AgentState.UNEMPLOYED &&
      this.skill > 0.4 &&
      !this.businessId &&
      Math.random() < 0.00003
    ) {
      const canAfford = this.wealth > 300
      const canBorrow = this.creditScore >= 600 && (state.banks || []).some(b => b.alive)

      if (canAfford || canBorrow) {
        this._wantsToStartBusiness = true
        this._needsBusinessLoan = !canAfford && canBorrow
      }
    }
  }

  _considerCrime(state, policies) {
    if (this.state === AgentState.CHILD || this.state === AgentState.RETIRED) return

    // Street crime: poverty/unemployment driven
    if (!this.isOwner) {
      const basePropensity = 0.00002
      const povertyFactor = this.wealth < 100 ? 0.5 : 0
      const unemploymentFactor = !this.employed ? 0.3 : 0
      const unrestFactor = this.unrest * 0.3
      const youthFactor = (this.age > 18 * 52 && this.age < 35 * 52) ? 0.2 : 0
      const reoffendBonus = this.reoffendRisk * 0.3
      const policeDeterrent = -(policies.policeFunding || 0) * 0.5

      const streetCrimeChance = basePropensity * (1 + povertyFactor + unemploymentFactor + unrestFactor + youthFactor + reoffendBonus + policeDeterrent)

      if (Math.random() < streetCrimeChance) {
        this._commitStreetCrime(state, policies)
        return
      }
    }

    // Corporate crime: business owners only
    if (this.isOwner && this.businessId) {
      const basePropensity = 0.00001
      const lowRegulation = !policies.antiMonopoly ? 0.3 : 0
      const highInequality = (state.metrics?.gini || 0) > 0.5 ? 0.3 : 0
      const greedFactor = this.wealth > 2000 ? 0.2 : 0
      const bankLaxity = (policies.reserveRequirement || 0.1) < 0.1 ? 0.2 : 0
      const oversightDeterrent = -(policies.financialOversight || 0) * 0.5

      const corpCrimeChance = basePropensity * (1 + lowRegulation + highInequality + greedFactor + bankLaxity + oversightDeterrent)

      if (Math.random() < corpCrimeChance) {
        this._commitCorporateCrime(state, policies)
      }
    }
  }

  _commitStreetCrime(state, policies) {
    const agents = state.agents?.filter(a => a.alive && a.id !== this.id && !a.incarcerated) || []
    if (agents.length === 0) return

    const victim = agents[Math.floor(Math.random() * agents.length)]
    const tick = state.metrics?.tick || 0

    // Choose crime type based on conditions
    const roll = Math.random()
    let crimeType

    if (roll < 0.5) {
      // Theft: steal wealth
      crimeType = 'theft'
      const stolen = Math.min(victim.wealth * 0.1, 50)
      if (stolen > 0) {
        victim.wealth -= stolen
        this.wealth += stolen
        victim.victimTick = tick
      }
    } else if (roll < 0.8) {
      // Robbery: steal wealth + health damage
      crimeType = 'robbery'
      const stolen = Math.min(victim.wealth * 0.15, 80)
      if (stolen > 0) {
        victim.wealth -= stolen
        this.wealth += stolen
      }
      victim.health = clamp(victim.health - 0.05, 0.1, 1)
      victim.victimTick = tick
    } else {
      // Assault: health damage only
      crimeType = 'assault'
      victim.health = clamp(victim.health - 0.1, 0.1, 1)
      victim.victimTick = tick
    }

    // Track crime in state for metrics
    if (!state._crimeLog) state._crimeLog = []
    state._crimeLog.push({ type: crimeType, category: 'street', tick })

    // Arrest chance: based on police funding
    const arrestChance = 0.1 + (policies.policeFunding || 0) * 0.4
    if (Math.random() < arrestChance) {
      this._getArrested(state, policies, crimeType)
    }
  }

  _commitCorporateCrime(state, policies) {
    const tick = state.metrics?.tick || 0
    const biz = state.businesses?.find(b => b.id === this.businessId)
    if (!biz || !biz.alive) return

    const roll = Math.random()
    let crimeType

    if (roll < 0.5) {
      // Embezzlement: drain business capital
      crimeType = 'embezzlement'
      const stolen = biz.capital * 0.1
      biz.capital -= stolen
      this.wealth += stolen
    } else {
      // Fraud: extract from agents/banks
      crimeType = 'fraud'
      const agents = state.agents?.filter(a => a.alive && a.id !== this.id) || []
      const totalStolen = Math.min(this.wealth * 0.2, 200)
      this.wealth += totalStolen
      // Spread loss across random victims
      const victimCount = Math.min(5, agents.length)
      for (let i = 0; i < victimCount; i++) {
        const v = agents[Math.floor(Math.random() * agents.length)]
        v.wealth -= totalStolen / victimCount
        v.victimTick = tick
      }
    }

    if (!state._crimeLog) state._crimeLog = []
    state._crimeLog.push({ type: crimeType, category: 'corporate', tick })

    // Arrest chance: based on financial oversight
    const arrestChance = 0.05 + (policies.financialOversight || 0) * 0.35
    if (Math.random() < arrestChance) {
      this._getArrested(state, policies, crimeType)
    }
  }

  _getArrested(state, policies, crimeType) {
    this.incarcerated = true
    // Sentence length: corporate crimes get longer sentences
    const baseSentence = crimeType === 'fraud' || crimeType === 'embezzlement' ? 200 : 100
    this.prisonTicks = baseSentence + Math.floor(Math.random() * 100)
    this.criminalRecord.push({ type: crimeType, tick: state.metrics?.tick || 0 })
    this.reoffendRisk = clamp(this.reoffendRisk + 0.15, 0, 1)
    this.creditScore = clamp(this.creditScore - 100, 300, 850)

    // Lose job
    if (this.employed && !this.isOwner) {
      this.fire('arrested')
    }

    // If business owner, close business
    if (this.isOwner && this.businessId && state.businesses) {
      const biz = state.businesses.find(b => b.id === this.businessId)
      if (biz && biz.alive) {
        biz._close(state, 'owner arrested')
      }
      this.isOwner = false
      this.businessId = null
    }

    this.events.push(`Arrested for ${crimeType} at age ${Math.floor(this.age / 52)}`)
    this._updateState()
  }

  _serveSentence(state, policies) {
    this.prisonTicks--

    // Prison reform reduces reoffend risk
    if (policies.prisonReform && Math.random() < 0.001) {
      this.reoffendRisk = clamp(this.reoffendRisk - 0.01, 0, 1)
    }

    if (this.prisonTicks <= 0) {
      this.incarcerated = false
      this.prisonTicks = 0
      this.events.push(`Released from prison at age ${Math.floor(this.age / 52)}`)
      this._updateState()
    }
  }

  _updateInflationExpectation(state) {
    const recentInflation = (state.market?.inflation || 0)
    this.inflationExpectation = this.inflationExpectation * 0.9 + recentInflation * 0.1
    // Central bank rate signal: hawkish rates anchor expectations downward
    const rate = state.policies?.interestRate || 0.05
    if (rate > 0.05) {
      const hawkishPull = (rate - 0.05) * 0.3
      this.inflationExpectation -= hawkishPull * 0.1
    }
    // If central bank credibility is low, expectations amplify (unanchored)
    const credibility = state.market?.centralBankCredibility ?? 1.0
    if (credibility < 0.5) {
      const amplifier = 1 + (0.5 - credibility) * 0.5
      this.inflationExpectation *= amplifier
    }
    this.inflationExpectation = clamp(this.inflationExpectation, -0.1, 2.0)
  }

  _considerInvesting(state, policies) {
    if (this.state === AgentState.CHILD) return

    // Panic selling: dump stocks when losing >20% or in financial distress
    if (this.portfolio.length > 0) {
      for (const holding of [...this.portfolio]) {
        const biz = (state.businesses || []).find(b => b.id === holding.businessId)
        if (!biz || !biz.alive) {
          // Remove dead holdings
          this.portfolio = this.portfolio.filter(p => p.businessId !== holding.businessId)
          continue
        }
        const loss = (holding.avgCostBasis - biz.sharePrice) / Math.max(holding.avgCostBasis, 0.01)
        const distressed = this.inDebtSpiral || this.wealth < 100
        if ((loss > 0.2 && Math.random() < 0.1) || (distressed && Math.random() < 0.05)) {
          // Panic sell — liquidate entire position
          this.wealth += holding.shares * biz.sharePrice
          biz.sharesAvailable += holding.shares
          this.portfolio = this.portfolio.filter(p => p.businessId !== holding.businessId)
        }
      }
    }

    if (this.wealth < 200) return
    if (Math.random() > 0.005) return

    const publicBiz = (state.businesses || []).filter(b =>
      b.alive && b.isPublic && b.sharesAvailable > 0
    )
    if (publicBiz.length === 0) return

    // Buy shares in the most profitable available business
    publicBiz.sort((a, b) => {
      const profitA = a.profitHistory?.length > 0 ? a.profitHistory.reduce((s, v) => s + v, 0) / a.profitHistory.length : 0
      const profitB = b.profitHistory?.length > 0 ? b.profitHistory.reduce((s, v) => s + v, 0) / b.profitHistory.length : 0
      return profitB - profitA
    })

    const target = publicBiz[0]
    const investAmount = Math.min(this.wealth * 0.1, target.sharesAvailable * target.sharePrice)
    if (investAmount <= 0 || target.sharePrice <= 0) return

    const sharesToBuy = Math.min(
      Math.floor(investAmount / target.sharePrice),
      target.sharesAvailable
    )
    if (sharesToBuy <= 0) return

    const cost = sharesToBuy * target.sharePrice
    this.wealth -= cost
    target.sharesAvailable -= sharesToBuy

    const existing = this.portfolio.find(p => p.businessId === target.id)
    if (existing) {
      const totalShares = existing.shares + sharesToBuy
      existing.avgCostBasis = (existing.avgCostBasis * existing.shares + cost) / totalShares
      existing.shares = totalShares
    } else {
      this.portfolio.push({ businessId: target.id, shares: sharesToBuy, avgCostBasis: target.sharePrice })
    }

    // M&A: very wealthy agent buys out cheap business
    if (this.wealth > 5000 && target.sharePrice < 1 && target.capital < 100 && !this.isOwner) {
      const totalHeld = this.portfolio.find(p => p.businessId === target.id)?.shares || 0
      if (totalHeld > target.sharesOutstanding * 0.5) {
        target.ownerId = this.id
        this.isOwner = true
        this.businessId = target.id
        this.events.push(`Acquired ${target.name} via M&A`)
      }
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
      creditScore: this.creditScore,
      deposits: this.deposits,
      hasMortgage: this.hasMortgage,
      loanCount: this.loans.length,
      monthlyLoanPayment: this.monthlyLoanPayment,
      incarcerated: this.incarcerated,
      criminalRecordCount: this.criminalRecord.length,
      inDebtSpiral: this.inDebtSpiral,
      inflationExpectation: this.inflationExpectation,
      portfolioValue: this.portfolio.reduce((sum, p) => sum + (p.shares * (p.avgCostBasis || 0)), 0),
      investmentIncome: this.investmentIncome,
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
