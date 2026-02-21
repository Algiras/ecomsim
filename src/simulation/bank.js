import { clamp } from '../utils/math.js'

let nextBankId = 1

export const LOAN_TYPES = {
  mortgage: { termTicks: 500, baseSpread: 0.01, label: 'Mortgage' },
  business: { termTicks: 200, baseSpread: 0.03, label: 'Business Loan' },
  personal: { termTicks: 100, baseSpread: 0.05, label: 'Personal Loan' }
}

const BANK_NAMES = [
  'First National Bank', 'Citizens Trust', 'Federal Reserve Bank',
  'Commerce Bank', 'Merchant Bank', 'People\'s Savings Bank',
  'Capital One Corp', 'Heritage Bank'
]

export class Bank {
  constructor(options = {}) {
    this.id = options.id ?? nextBankId++
    this.alive = true
    this.name = options.name ?? BANK_NAMES[(this.id - 1) % BANK_NAMES.length]
    this.reserves = options.reserves ?? 5000
    this.totalDeposits = 0
    this.loanBook = []        // { id, agentId, type, principal, remaining, rate, monthlyPayment, ticksOverdue }
    this.interestSpread = options.interestSpread ?? 0.02
    this.nonPerformingRate = 0
    this._nextLoanId = 1
    this._writeOffs = 0
  }

  tick(state, policies) {
    if (!this.alive) return

    const reserveReq = policies.reserveRequirement ?? 0.1

    // 1. Collect payments from agents
    for (const loan of this.loanBook) {
      if (!loan.active) continue
      const agent = state.agents.find(a => a.id === loan.agentId)
      if (!agent || !agent.alive) {
        // Agent is dead — write off
        this._writeOff(loan)
        continue
      }
      this._collectPayment(loan, agent, state, policies)
    }

    // 2. Pay depositors interest (small amount based on policy rate)
    const depositRate = Math.max(0, (policies.interestRate || 0.05) * 0.3)
    const interestPaid = this.totalDeposits * depositRate * 0.001
    this.reserves -= interestPaid

    // Credit interest to depositors
    for (const agent of state.agents) {
      if (!agent.alive || agent.deposits <= 0) continue
      if (agent._bankId !== this.id) continue
      const interest = agent.deposits * depositRate * 0.001
      agent.deposits += interest
    }

    // 3. Recalculate totals
    this.totalDeposits = state.agents
      .filter(a => a.alive && a._bankId === this.id)
      .reduce((sum, a) => sum + (a.deposits || 0), 0)

    // 4. Compute NPL rate
    const activeLoans = this.loanBook.filter(l => l.active)
    const overdue = activeLoans.filter(l => l.ticksOverdue > 0)
    this.nonPerformingRate = activeLoans.length > 0
      ? overdue.length / activeLoans.length
      : 0

    // 5. Clean up fully paid / written-off loans
    this.loanBook = this.loanBook.filter(l => l.active)

    // 6. Solvency check
    if (this.reserves < this.totalDeposits * reserveReq && this.totalDeposits > 0) {
      this._fail(state, policies)
    }
  }

  _collectPayment(loan, agent, state, policies) {
    const payment = loan.monthlyPayment

    if (agent.wealth >= payment) {
      // Agent can pay
      agent.wealth -= payment
      loan.remaining -= payment
      loan.ticksOverdue = 0
      agent.consecutiveMissedPayments = 0

      // Principal portion goes to reserves
      this.reserves += payment

      // Credit score boost for on-time payment
      agent.creditScore = clamp(agent.creditScore + 1, 300, 850)

      // Loan fully repaid
      if (loan.remaining <= 0) {
        loan.active = false
        agent.loans = agent.loans.filter(l => l.id !== loan.id)
        agent.monthlyLoanPayment -= payment
        agent.creditScore = clamp(agent.creditScore + 10, 300, 850)
        // Recovery from debt spiral if all loans paid
        if (agent.loans.length === 0) {
          agent.inDebtSpiral = false
          agent.wageGarnishmentRate = 0
          agent.consecutiveMissedPayments = 0
        }
      }
    } else {
      // Agent can't pay — overdue
      loan.ticksOverdue++
      agent.consecutiveMissedPayments++
      agent.creditScore = clamp(agent.creditScore - 5, 300, 850)

      // Debt spiral detection
      if (agent.consecutiveMissedPayments > 5) {
        agent.inDebtSpiral = true
      }

      // Wage garnishment for overdue loans
      const overdueLoans = (agent.loans || []).filter(l => l.ticksOverdue > 0)
      if (overdueLoans.length >= 3) {
        agent.wageGarnishmentRate = clamp(0.1 * overdueLoans.length, 0, 0.5)
      }

      // Desperation borrowing: overdue 10-50 ticks, small chance of taking a personal loan
      if (loan.ticksOverdue >= 10 && loan.ticksOverdue <= 50 && Math.random() < 0.05) {
        const desperationAmount = payment * 3
        if (state && policies && this.canIssueLoan(agent, 'personal', desperationAmount, policies).approved) {
          this.issueLoan(agent, 'personal', desperationAmount, policies)
          agent.events.push(`Took desperation loan ($${Math.round(desperationAmount)})`)
        }
      }

      // Write off after 50 ticks overdue
      if (loan.ticksOverdue > 50) {
        this._writeOff(loan)
        agent.creditScore = clamp(agent.creditScore - 50, 300, 850)
        agent.loans = agent.loans.filter(l => l.id !== loan.id)
        agent.monthlyLoanPayment -= payment
      }
    }
  }

  _writeOff(loan) {
    loan.active = false
    this.reserves -= loan.remaining * 0.5 // partial loss
    this._writeOffs += loan.remaining
  }

  canIssueLoan(agent, type, amount, policies) {
    if (!this.alive) return { approved: false, reason: 'bank closed' }

    const reserveReq = policies.reserveRequirement ?? 0.1
    // Fractional reserve: reserves must cover ratio AFTER new deposit is created
    const minReserves = (this.totalDeposits + amount) * reserveReq

    if (this.reserves < minReserves) {
      return { approved: false, reason: 'insufficient reserves' }
    }

    // Pro-cyclical lending: tighten when NPL rate is high
    if (this.nonPerformingRate > 0.25) {
      return { approved: false, reason: 'credit crunch — lending frozen' }
    }

    // Credit score requirements by loan type (raised during stress)
    const minScores = { mortgage: 500, business: 550, personal: 400 }
    let minScore = minScores[type] || 400
    if (this.nonPerformingRate > 0.15) {
      minScore += 100 // tighter lending standards during stress
    }
    if (agent.creditScore < minScore) {
      return { approved: false, reason: 'credit score too low' }
    }

    // Max loan-to-value for mortgages (simplified — uses fixed notional value)
    if (type === 'mortgage') {
      const maxLTV = policies.maxLoanToValue ?? 0.8
      const housingCost = 50 * 100 // notional housing value
      if (amount > housingCost * maxLTV) {
        return { approved: false, reason: 'exceeds max LTV' }
      }
    }

    // Debt-to-income check
    const totalDebt = agent.loans.reduce((s, l) => s + l.remaining, 0) + amount
    const income = Math.max(agent.wage || agent.income || 1, 1)
    if (totalDebt / income > 20) {
      return { approved: false, reason: 'debt-to-income too high' }
    }

    return { approved: true }
  }

  issueLoan(agent, type, amount, policies) {
    const loanConfig = LOAN_TYPES[type]
    if (!loanConfig) return null

    const baseRate = policies.interestRate || 0.05
    const riskPremium = Math.max(0, (700 - agent.creditScore) / 1000)
    const rate = baseRate + loanConfig.baseSpread + riskPremium
    const termTicks = loanConfig.termTicks
    const monthlyPayment = (amount * (1 + rate)) / termTicks

    const loan = {
      id: this._nextLoanId++,
      bankId: this.id,
      agentId: agent.id,
      type,
      principal: amount,
      remaining: amount * (1 + rate),
      rate,
      monthlyPayment,
      ticksOverdue: 0,
      active: true
    }

    this.loanBook.push(loan)
    // Fractional reserve money creation: loan creates a new deposit, not a reserve transfer
    this.totalDeposits += amount
    agent.deposits += amount
    agent.loans.push(loan)
    agent.monthlyLoanPayment += monthlyPayment
    agent.wealth += amount

    return loan
  }

  _fail(state, policies) {
    this.alive = false

    const hasInsurance = policies.depositInsurance ?? true
    const insuredLimit = 1000

    // Handle depositors
    for (const agent of state.agents) {
      if (!agent.alive || agent._bankId !== this.id) continue
      if (hasInsurance) {
        // Insured: get back up to limit
        agent.wealth += Math.min(agent.deposits, insuredLimit)
        if (agent.deposits > insuredLimit) {
          // Lose the excess
          agent.events.push(`Lost $${Math.round(agent.deposits - insuredLimit)} in bank failure`)
        }
      } else {
        // No insurance: lose all deposits
        agent.events.push(`Lost $${Math.round(agent.deposits)} in bank failure (no insurance)`)
      }
      agent.deposits = 0
      agent._bankId = null
    }

    // Transfer loans to surviving banks
    const survivingBanks = state.banks?.filter(b => b.alive && b.id !== this.id) || []
    if (survivingBanks.length > 0) {
      for (const loan of this.loanBook.filter(l => l.active)) {
        const targetBank = survivingBanks[Math.floor(Math.random() * survivingBanks.length)]
        loan.bankId = targetBank.id
        targetBank.loanBook.push(loan)
      }
    } else {
      // No surviving banks — forgive all loans
      for (const loan of this.loanBook.filter(l => l.active)) {
        loan.active = false
        const agent = state.agents.find(a => a.id === loan.agentId)
        if (agent) {
          agent.loans = agent.loans.filter(l => l.id !== loan.id)
          agent.monthlyLoanPayment -= loan.monthlyPayment
          agent.events.push('Loan forgiven — all banks failed')
        }
      }
    }

    this.loanBook = []
  }

  toSnapshot() {
    const activeLoans = this.loanBook.filter(l => l.active)
    return {
      id: this.id,
      name: this.name,
      alive: this.alive,
      reserves: this.reserves,
      totalDeposits: this.totalDeposits,
      activeLoans: activeLoans.length,
      totalLoanValue: activeLoans.reduce((s, l) => s + l.remaining, 0),
      nonPerformingRate: this.nonPerformingRate,
      interestSpread: this.interestSpread
    }
  }
}

export function createInitialBanks(count = 3) {
  nextBankId = 1
  const banks = []
  for (let i = 0; i < count; i++) {
    banks.push(new Bank({
      reserves: 1500 + Math.random() * 2000,
      interestSpread: 0.015 + Math.random() * 0.01
    }))
  }
  return banks
}

// Assign agents to banks (call during init)
export function assignAgentsToBanks(agents, banks) {
  for (const agent of agents) {
    if (!agent.alive) continue
    const bank = banks[Math.floor(Math.random() * banks.length)]
    agent._bankId = bank.id
    // Move some wealth to deposits
    const depositFraction = 0.3 + Math.random() * 0.4
    const deposit = Math.max(0, agent.wealth * depositFraction)
    agent.deposits = deposit
    agent.wealth -= deposit
  }
}

// Helper: find the best bank for a loan
export function findLender(agent, type, amount, state, policies) {
  const banks = (state.banks || []).filter(b => b.alive)
  for (const bank of banks) {
    const check = bank.canIssueLoan(agent, type, amount, policies)
    if (check.approved) return bank
  }
  return null
}
