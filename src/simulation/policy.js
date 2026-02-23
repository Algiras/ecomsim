import { DEFAULT_POLICIES } from '../utils/constants.js'
import { clamp } from '../utils/math.js'

export function createPolicyState(overrides = {}) {
  return { ...DEFAULT_POLICIES, ...overrides }
}

// Apply policy effects to simulation state each tick
export function applyPolicyEffects(state, policies, market) {
  const { agents, businesses } = state

  // Minimum wage enforcement
  if (policies.minWage > 0) {
    for (const b of businesses.filter(b => b.alive)) {
      if (b.wageOffered < policies.minWage) {
        b.wageOffered = policies.minWage
        // Small business may struggle to afford this
        if (b.capital < policies.minWage * b.employees.length * 20) {
          // Risk of layoffs — handled naturally in business.tick
        }
      }
    }
  }

  // Anti-monopoly: break up businesses with > 50% market share
  if (policies.antiMonopoly) {
    for (const b of businesses.filter(b => b.alive && b.dominance > 0.5)) {
      b.maxEmployees = Math.max(5, Math.floor(b.maxEmployees * 0.9))
    }
  }

  // Interest rate effects on business borrowing & investment.
  // Only drain capital for the ABOVE-baseline portion (rate > 5%) so that the
  // demand-suppression channel (market.js) dominates and CPI can actually fall.
  const excessRate = Math.max(0, policies.interestRate - 0.05)
  if (excessRate > 0) {
    for (const b of businesses.filter(b => b.alive)) {
      b.capital -= b.capital * excessRate * 0.0002  // 10× lighter than before
    }
  }

  // Print money: inject wealth into economy (inflation side-effect in market.js)
  if (policies.printMoney > 0) {
    const injection = policies.printMoney
    const recipients = agents.filter(a => a.alive && a.state !== 'dead')
    for (const a of recipients) {
      a.wealth += injection * 0.01
    }
  }

  // Education: slowly improves agent skills over time
  if (policies.educationFunding > 0.3) {
    const youngAgents = agents.filter(a => a.alive && a.age < 30 * 52 && a.state !== 'dead')
    for (const a of youngAgents) {
      if (Math.random() < policies.educationFunding * 0.0001) {
        a.skill = clamp(a.skill + 0.001, 0, 1)
        a.education = clamp(a.education + 0.001, 0, 1)
      }
    }
  }

  // Public healthcare: improves health, reduces death rate
  if (policies.publicHealthcare) {
    if (Math.random() < 0.001) {
      const sickest = agents.filter(a => a.alive && a.health < 0.5)
      for (const a of sickest.slice(0, 5)) {
        a.health = clamp(a.health + 0.01, 0, 1)
      }
    }
  }

  // UBI and unemployment benefit already handled in agent._earnIncome

  // ─── Weird Laws ────────────────────────────────────────────────────────────

  // 4-day work week: slightly reduce business production, improve agent health
  if (policies.fourDayWeek) {
    for (const b of businesses.filter(b => b.alive)) {
      b.production = (b.production || 1) * 0.82   // 4/5 working days ≈ 80%
    }
    if (Math.random() < 0.01) {
      for (const a of agents.filter(a => a.alive)) {
        a.health = clamp(a.health + 0.0005, 0, 1)
      }
    }
  }

  // Robot tax: drain tech businesses per unit of automation (proxied by tech sector capital)
  if (policies.robotTax > 0) {
    for (const b of businesses.filter(b => b.alive && b.sector === 'tech')) {
      const tax = b.capital * policies.robotTax * 0.0005
      b.capital -= tax
      state.govBudget = (state.govBudget || 0) + tax
    }
  }

  // Bread & Circuses: reduce unrest, cost government
  if (policies.breadAndCircuses) {
    state.govBudget = (state.govBudget || 0) - 0.5
    if (Math.random() < 0.02) {
      for (const a of agents.filter(a => a.alive)) {
        a.happiness = clamp((a.happiness || 0.5) + 0.002, 0, 1)
      }
    }
    state.unrestLevel = Math.max(0, (state.unrestLevel || 0) - 0.001)
  }

  // Mandatory profit sharing: redistribute portion of business profit to employees
  if (policies.mandatoryProfitShare > 0) {
    for (const b of businesses.filter(b => b.alive && b.employees?.length > 0)) {
      const share = Math.max(0, b.capital * policies.mandatoryProfitShare * 0.001)
      const perWorker = share / b.employees.length
      b.capital -= share
      for (const empId of b.employees) {
        const emp = agents.find(a => a.id === empId)
        if (emp) emp.wealth += perWorker
      }
    }
  }

  // Land Value Tax: tax all agents proportional to housing wealth
  if (policies.landValueTax > 0) {
    for (const a of agents.filter(a => a.alive && a.wealth > 100)) {
      const lvt = a.wealth * policies.landValueTax * 0.0002
      a.wealth -= lvt
      state.govBudget = (state.govBudget || 0) + lvt
    }
  }

  // Ban advertising: reduce luxury demand / limit luxury business growth
  if (policies.banAdvertising) {
    for (const b of businesses.filter(b => b.alive && b.sector === 'luxury')) {
      b.maxEmployees = Math.max(3, Math.floor((b.maxEmployees || 10) * 0.999))
    }
  }

  // Debt Jubilee: one-time reset of negative wealth + clear all loans
  if (policies.debtJubilee) {
    for (const a of agents.filter(a => a.alive && a.wealth < 0)) {
      a.wealth = 0
    }
    // Clear all active loans — banks take the write-off hit
    for (const a of agents.filter(a => a.alive && a.loans?.length > 0)) {
      for (const loan of a.loans) {
        // Bank takes the loss
        const banks = state.banks || []
        const bank = banks.find(b => b.id === loan.bankId)
        if (bank) {
          bank.reserves -= loan.remaining * 0.5
          bank.loanBook = bank.loanBook.filter(l => l.id !== loan.id)
        }
        loan.active = false
      }
      a.loans = []
      a.monthlyLoanPayment = 0
      a.hasMortgage = false
    }
    state._jubileeApplied = true
  }

  // Lottery redistribution: random rich → random poor wealth transfer
  if (policies.lotteryRedistribution && Math.random() < 0.05) {
    const rich = agents.filter(a => a.alive && a.wealth > 200).sort((a, b) => b.wealth - a.wealth)
    const poor = agents.filter(a => a.alive && a.wealth < 50)
    if (rich.length && poor.length) {
      const donor = rich[Math.floor(Math.random() * Math.min(10, rich.length))]
      const recipient = poor[Math.floor(Math.random() * poor.length)]
      const transfer = donor.wealth * 0.05
      donor.wealth -= transfer
      recipient.wealth += transfer
    }
  }

  // Sumptuary laws: cap luxury spending for wealthy agents
  if (policies.sumptuary) {
    for (const a of agents.filter(a => a.alive && a.wealth > 300)) {
      // Wealthy agents accumulate savings faster — luxury market starved
      a._sumptuaryLimited = true
    }
  } else {
    for (const a of agents.filter(a => a._sumptuaryLimited)) {
      a._sumptuaryLimited = false
    }
  }

  // Degrowth: slow overall production, improve health
  if (policies.degrowth) {
    if (Math.random() < 0.005) {
      for (const b of businesses.filter(b => b.alive)) {
        b.production = (b.production || 1) * 0.999
      }
      for (const a of agents.filter(a => a.alive)) {
        a.health = clamp(a.health + 0.0001, 0, 1)
      }
    }
  }

  // Algorithmic central planning: dampen price volatility each tick
  if (policies.algoCentralPlanning && market) {
    for (const sector of Object.keys(market.prices || {})) {
      const target = market.prices[sector]
      // Smooth price toward a moving average (stable)
      market.prices[sector] = target * 0.995 + (market._algoTarget?.[sector] || target) * 0.005
    }
  }

  // Universal bank account: poor agents slowly accumulate small savings buffer
  if (policies.universalBankAccount) {
    if (Math.random() < 0.002) {
      for (const a of agents.filter(a => a.alive && a.wealth < 20)) {
        a.wealth = clamp(a.wealth + 0.5, 0, 20)
      }
    }
  }

  // ─── Law & Order ───────────────────────────────────────────────────────────

  // Police funding: costs government budget
  if (policies.policeFunding > 0) {
    const policeCost = agents.filter(a => a.alive).length * policies.policeFunding * 0.05
    state.govBudget = (state.govBudget || 0) - policeCost
  }

  // Financial oversight: costs government budget
  if (policies.financialOversight > 0) {
    const oversightCost = businesses.filter(b => b.alive).length * policies.financialOversight * 0.03
    state.govBudget = (state.govBudget || 0) - oversightCost
  }

  // Prison reform: costs money, reduces reoffend risk for incarcerated agents
  if (policies.prisonReform) {
    const inmates = agents.filter(a => a.alive && a.incarcerated)
    state.govBudget = (state.govBudget || 0) - inmates.length * 0.02
  }

  // ─── Chaos Levers ──────────────────────────────────────────────────────────

  // Helicopter money: direct cash drop to every citizen each tick
  if (policies.helicopterMoney > 0) {
    const drop = policies.helicopterMoney * 0.01  // scaled so slider feels right
    for (const a of agents.filter(a => a.alive)) {
      a.wealth += drop
    }
    // Drives inflation via market.js price pressure (more demand = higher prices)
    state.govBudget = (state.govBudget || 0) - drop * agents.filter(a => a.alive).length * 0.1
  }

  // Maximum wage: cap wages and income for all agents
  if (policies.maximumWage > 0) {
    for (const b of businesses.filter(b => b.alive)) {
      if (b.wageOffered > policies.maximumWage) {
        b.wageOffered = policies.maximumWage
      }
    }
    // High earners accumulate resentment (emigration proxy — slowly lose skill)
    if (Math.random() < 0.002) {
      for (const a of agents.filter(a => a.alive && a.skill > 0.7)) {
        a.skill = clamp(a.skill - 0.001, 0, 1)  // brain drain
      }
    }
  }

  // Wealth confiscation: seize fraction of wealth above $1000 threshold
  if (policies.wealthConfiscation > 0) {
    for (const a of agents.filter(a => a.alive && a.wealth > 1000)) {
      const seizure = (a.wealth - 1000) * policies.wealthConfiscation * 0.01
      a.wealth -= seizure
      state.govBudget = (state.govBudget || 0) + seizure
    }
  }

  // Nationalize industries: gov controls all businesses, flat wages, production penalty
  if (policies.nationalizeIndustries) {
    for (const b of businesses.filter(b => b.alive)) {
      b._nationalized = true
      // Override wage to flat government rate
      const flatWage = Math.max(policies.minWage || 10, 15)
      b.wageOffered = flatWage
      // Production penalty — no profit incentive
      b.production = (b.production || 1) * 0.92
      // Gov pays the wages
      state.govBudget = (state.govBudget || 0) - b.employees.length * flatWage * 0.001
    }
  } else {
    for (const b of businesses.filter(b => b._nationalized)) {
      delete b._nationalized
    }
  }

  // Punitive tariffs: inflate all market prices
  if (policies.punitiveTargiffs > 0 && market?.prices) {
    for (const sector of Object.keys(market.prices)) {
      // Gradually inflate prices each tick
      market.prices[sector] *= (1 + policies.punitiveTargiffs * 0.0002)
    }
  }

  // Guaranteed jobs: gov employs all unemployed agents at minimum wage
  if (policies.guaranteedJobs) {
    const unemployed = agents.filter(a => a.alive && !a.employed && a.age > 18 * 52)
    for (const a of unemployed) {
      a.employed = true
      a._govJob = true
      a.wage = Math.max(policies.minWage || 10, 12)
      a.wealth += a.wage * 0.001
    }
    state.govBudget = (state.govBudget || 0) - unemployed.length * (policies.minWage || 12) * 0.001
  } else {
    for (const a of agents.filter(a => a._govJob)) {
      delete a._govJob
      // They don't automatically get fired — labor market will sort it
    }
  }
}

export function validatePolicy(key, value) {
  const bounds = {
    incomeTax: [0, 0.6],
    corporateTax: [0, 0.5],
    minWage: [0, 50],
    ubi: [0, 1000],
    interestRate: [0, 0.2],
    educationFunding: [0, 1],
    unemploymentBenefit: [0, 500],
    printMoney: [0, 100],
    wealthTax: [0, 0.05],
    reserveRequirement: [0, 0.5],
    maxLoanToValue: [0.5, 1.0],
    // Weird laws
    robotTax: [0, 0.5],
    mandatoryProfitShare: [0, 0.3],
    landValueTax: [0, 0.05],
    // Law & Order
    policeFunding: [0, 1],
    financialOversight: [0, 1],
    // Chaos levers
    helicopterMoney: [0, 500],
    maximumWage: [0, 500],
    wealthConfiscation: [0, 0.5],
    punitiveTargiffs: [0, 2.0],
    capitalGainsTax: [0, 0.5]
  }

  if (key in bounds) {
    const [min, max] = bounds[key]
    return clamp(Number(value), min, max)
  }
  return value // boolean policies pass through
}
