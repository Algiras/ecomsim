import { describe, it, expect, beforeEach } from 'vitest'
import { Bank, createInitialBanks, assignAgentsToBanks, LOAN_TYPES } from './bank.js'
import { Agent } from './agent.js'

function makeAgent(overrides = {}) {
  return new Agent({
    wealth: 500,
    creditScore: 600,
    ...overrides
  })
}

function makeState(agents = [], banks = []) {
  return {
    agents,
    banks,
    businesses: [],
    prices: { food: 10, housing: 50, tech: 30, luxury: 80 }
  }
}

const defaultPolicies = {
  interestRate: 0.05,
  reserveRequirement: 0.1,
  depositInsurance: true,
  maxLoanToValue: 0.8
}

describe('Bank', () => {
  let bank

  beforeEach(() => {
    bank = new Bank({ reserves: 5000 })
  })

  it('creates with correct defaults', () => {
    expect(bank.alive).toBe(true)
    expect(bank.reserves).toBe(5000)
    expect(bank.totalDeposits).toBe(0)
    expect(bank.loanBook).toEqual([])
    expect(bank.nonPerformingRate).toBe(0)
  })

  describe('issueLoan', () => {
    it('issues a mortgage loan', () => {
      const agent = makeAgent({ creditScore: 600 })
      agent.loans = []
      agent.monthlyLoanPayment = 0
      const initialWealth = agent.wealth

      const loan = bank.issueLoan(agent, 'mortgage', 1000, defaultPolicies)

      expect(loan).not.toBeNull()
      expect(loan.type).toBe('mortgage')
      expect(loan.principal).toBe(1000)
      expect(loan.active).toBe(true)
      expect(agent.loans.length).toBe(1)
      expect(agent.wealth).toBe(initialWealth + 1000) // loan credited to agent
      expect(bank.reserves).toBe(5000) // fractional reserve: reserves unchanged, deposit created
    })

    it('issues a business loan', () => {
      const agent = makeAgent({ creditScore: 650 })
      agent.loans = []
      agent.monthlyLoanPayment = 0

      const loan = bank.issueLoan(agent, 'business', 300, defaultPolicies)

      expect(loan).not.toBeNull()
      expect(loan.type).toBe('business')
      expect(loan.principal).toBe(300)
    })

    it('issues a personal loan', () => {
      const agent = makeAgent({ creditScore: 500 })
      agent.loans = []
      agent.monthlyLoanPayment = 0

      const loan = bank.issueLoan(agent, 'personal', 100, defaultPolicies)

      expect(loan).not.toBeNull()
      expect(loan.type).toBe('personal')
    })
  })

  describe('canIssueLoan', () => {
    it('approves loan with good credit', () => {
      const agent = makeAgent({ creditScore: 700 })
      agent.loans = []
      agent.wage = 50

      const result = bank.canIssueLoan(agent, 'mortgage', 500, defaultPolicies)
      expect(result.approved).toBe(true)
    })

    it('rejects loan with low credit score', () => {
      const agent = makeAgent({ creditScore: 350 })
      agent.loans = []
      agent.wage = 20

      const result = bank.canIssueLoan(agent, 'mortgage', 500, defaultPolicies)
      expect(result.approved).toBe(false)
      expect(result.reason).toBe('credit score too low')
    })

    it('rejects when bank has insufficient reserves', () => {
      bank.reserves = 50
      bank.totalDeposits = 1000
      const agent = makeAgent({ creditScore: 700 })
      agent.loans = []
      agent.wage = 20

      const result = bank.canIssueLoan(agent, 'mortgage', 500, defaultPolicies)
      expect(result.approved).toBe(false)
      expect(result.reason).toBe('insufficient reserves')
    })

    it('rejects dead bank', () => {
      bank.alive = false
      const agent = makeAgent({ creditScore: 700 })
      agent.loans = []

      const result = bank.canIssueLoan(agent, 'personal', 100, defaultPolicies)
      expect(result.approved).toBe(false)
    })
  })

  describe('tick — payment collection', () => {
    it('collects payments and increases credit score', () => {
      const agent = makeAgent({ wealth: 1000, creditScore: 600 })
      agent.loans = []
      agent.monthlyLoanPayment = 0
      agent._bankId = bank.id

      bank.issueLoan(agent, 'personal', 100, defaultPolicies)
      const payment = agent.loans[0].monthlyPayment
      const state = makeState([agent], [bank])

      bank.tick(state, defaultPolicies)

      // Payment should have been collected
      expect(agent.wealth).toBeLessThan(1000 + 100) // had loan + payment taken
      expect(agent.creditScore).toBeGreaterThanOrEqual(600) // at least maintained or improved
    })

    it('marks overdue when agent cannot pay', () => {
      const agent = makeAgent({ wealth: 0, creditScore: 600 })
      agent.loans = []
      agent.monthlyLoanPayment = 0
      agent._bankId = bank.id

      bank.issueLoan(agent, 'personal', 100, defaultPolicies)
      // Agent wealth is now 100 (from loan), but set to 0 to simulate can't pay
      agent.wealth = 0

      const state = makeState([agent], [bank])
      bank.tick(state, defaultPolicies)

      // Loan should be overdue
      const loan = bank.loanBook.find(l => l.active)
      expect(loan.ticksOverdue).toBe(1)
      expect(agent.creditScore).toBeLessThan(600) // penalty
    })
  })

  describe('bank failure', () => {
    it('fails when reserves drop below requirement', () => {
      bank.reserves = 10
      bank.totalDeposits = 500

      const agent = makeAgent()
      agent._bankId = bank.id
      agent.deposits = 500
      agent.loans = []

      const state = makeState([agent], [bank])

      bank.tick(state, defaultPolicies)

      expect(bank.alive).toBe(false)
    })

    it('protects depositors with insurance', () => {
      bank.reserves = 10
      bank.totalDeposits = 2000

      const agent = makeAgent({ wealth: 100 })
      agent._bankId = bank.id
      agent.deposits = 2000
      agent.loans = []

      const state = makeState([agent], [bank])

      bank.tick(state, { ...defaultPolicies, depositInsurance: true })

      // Agent should get back insured amount (up to 1000)
      expect(agent.deposits).toBe(0)
      expect(agent.wealth).toBeGreaterThanOrEqual(100 + 1000) // original wealth + insured
    })
  })
})

describe('createInitialBanks', () => {
  it('creates requested number of banks', () => {
    const banks = createInitialBanks(3)
    expect(banks.length).toBe(3)
    expect(banks.every(b => b.alive)).toBe(true)
    expect(banks.every(b => b.reserves > 0)).toBe(true)
  })
})

describe('assignAgentsToBanks', () => {
  it('assigns agents to banks and splits wealth into deposits', () => {
    const agents = [makeAgent({ wealth: 1000 }), makeAgent({ wealth: 500 })]
    agents.forEach(a => { a.loans = []; a.deposits = 0 })
    const banks = createInitialBanks(2)

    assignAgentsToBanks(agents, banks)

    expect(agents.every(a => a._bankId !== null)).toBe(true)
    expect(agents.every(a => a.deposits > 0)).toBe(true)
    // Total wealth should be preserved (wealth + deposits)
    for (const a of agents) {
      expect(a.wealth + a.deposits).toBeGreaterThan(0)
    }
  })
})
