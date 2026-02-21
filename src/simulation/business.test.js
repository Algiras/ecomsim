import { describe, it, expect, beforeEach } from 'vitest'
import { Business, createInitialBusinesses } from './business.js'
import {
  INITIAL_PRICES, BASE_PRODUCTION, BUSINESS_START_CAPITAL,
  BUSINESS_BANKRUPTCY_THRESHOLD, SECTORS
} from '../utils/constants.js'

function makeState(overrides = {}) {
  return {
    agents: overrides.agents ?? [],
    businesses: overrides.businesses ?? [],
    prices: overrides.prices ?? { ...INITIAL_PRICES },
    policies: overrides.policies ?? {},
    ...overrides
  }
}

function makeAgent(overrides = {}) {
  return {
    id: overrides.id ?? 1,
    alive: true,
    state: overrides.state ?? 'working',
    employed: overrides.employed ?? false,
    isOwner: overrides.isOwner ?? false,
    businessId: null,
    wage: 0,
    skill: overrides.skill ?? 0.5,
    education: overrides.education ?? 0.5,
    age: overrides.age ?? 30 * 52,
    events: [],
    fire(reason) {
      this.employed = false
      this.employerId = null
      this.wage = 0
    },
    hire(biz, wage) {
      this.employed = true
      this.employerId = biz.id
      this.wage = wage
    },
    _updateState() {}
  }
}

// ─── Business constructor ───────────────────────────────────────────────────

describe('Business constructor', () => {
  it('creates with defaults', () => {
    const biz = new Business()
    expect(biz.alive).toBe(true)
    expect(biz.capital).toBe(BUSINESS_START_CAPITAL)
    expect(SECTORS).toContain(biz.sector)
    expect(biz.employees).toEqual([])
    expect(biz.revenue).toBe(0)
    expect(biz.profit).toBe(0)
  })

  it('accepts overrides', () => {
    const biz = new Business({ sector: 'tech', capital: 1000 })
    expect(biz.sector).toBe('tech')
    expect(biz.capital).toBe(1000)
  })
})

// ─── _produce ───────────────────────────────────────────────────────────────

describe('Business._produce', () => {
  it('produces nothing with no employees', () => {
    const biz = new Business({ sector: 'food' })
    biz._produce({})
    expect(biz.production).toBe(0)
  })

  it('produces based on employees and productivity', () => {
    const biz = new Business({ sector: 'food', productivity: 1.0 })
    biz.employees = [1, 2, 3]
    biz._produce({})
    // production = BASE_PRODUCTION.food * 3 * 1.0 = 15 * 3 = 45
    expect(biz.production).toBe(45)
  })

  it('farming subsidies boost food production by 30%', () => {
    const biz = new Business({ sector: 'food', productivity: 1.0 })
    biz.employees = [1]
    biz._produce({ subsidiesFarming: true })
    // 15 * 1 * 1.0 * 1.3 = 19.5 → floor = 19
    expect(biz.production).toBe(19)
  })

  it('education funding boosts production', () => {
    const biz = new Business({ sector: 'food', productivity: 1.0 })
    biz.employees = [1]
    biz._produce({ educationFunding: 0.8 })
    // 15 * 1 * 1.0 * (1 + 0.8*0.1) = 15 * 1.08 = 16.2 → floor = 16
    expect(biz.production).toBe(16)
  })

  it('caps inventory at maxInventory', () => {
    const biz = new Business({ sector: 'food', productivity: 1.0 })
    biz.employees = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    biz.maxInventory = 50
    biz._produce({})
    expect(biz.inventory).toBeLessThanOrEqual(50)
  })
})

// ─── _sellGoods ─────────────────────────────────────────────────────────────

describe('Business._sellGoods', () => {
  it('sells 90% of production at market price', () => {
    const biz = new Business({ sector: 'food', productivity: 1.0 })
    biz.employees = [1]
    biz._produce({})
    const initialCapital = biz.capital
    biz._sellGoods({ food: 10 })
    // sold = min(inventory, floor(production * 0.9)) = min(15, 13) = 13
    // revenue = 13 * 10 = 130
    expect(biz.revenue).toBe(130)
    expect(biz.capital).toBe(initialCapital + 130)
  })

  it('reduces inventory after selling', () => {
    const biz = new Business({ sector: 'food', productivity: 1.0 })
    biz.inventory = 20
    biz.production = 20
    biz._sellGoods({ food: 10 })
    expect(biz.inventory).toBe(2) // 20 - 18 (floor(20*0.9))
  })
})

// ─── _payWages ──────────────────────────────────────────────────────────────

describe('Business._payWages', () => {
  it('pays employees and reduces capital', () => {
    const biz = new Business({ sector: 'food' })
    biz.wageOffered = 10
    biz.employees = [1, 2, 3]
    biz.revenue = 100
    const initialCapital = biz.capital
    biz._payWages({})
    expect(biz.expenses).toBe(30) // 10 * 3
    expect(biz.capital).toBe(initialCapital - 30)
    expect(biz.profit).toBe(70) // 100 - 30
  })

  it('enforces minimum wage', () => {
    const biz = new Business({ sector: 'food' })
    biz.wageOffered = 5
    biz.employees = [1]
    biz.revenue = 50
    biz._payWages({ minWage: 15 })
    expect(biz.expenses).toBe(15) // minWage enforced
  })

  it('deducts corporate tax on profit', () => {
    const biz = new Business({ sector: 'food' })
    biz.wageOffered = 10
    biz.employees = [1]
    biz.revenue = 100
    const initialCapital = biz.capital
    biz._payWages({ corporateTax: 0.2 })
    // expenses = 10, profit = 90, tax = 90 * 0.2 = 18
    expect(biz.capital).toBe(initialCapital - 10 - 18)
  })

  it('no corporate tax when not profitable', () => {
    const biz = new Business({ sector: 'food' })
    biz.wageOffered = 50
    biz.employees = [1]
    biz.revenue = 10
    const initialCapital = biz.capital
    biz._payWages({ corporateTax: 0.5 })
    // profit = 10 - 50 = -40, no tax
    expect(biz.capital).toBe(initialCapital - 50)
  })

  it('increases wage when very profitable', () => {
    const biz = new Business({ sector: 'food' })
    biz.wageOffered = 10
    biz.employees = [1]
    biz.revenue = 1000
    biz._payWages({})
    // profit = 990 > 1000 * 0.15 * 2 = 300 → wage increases
    expect(biz.wageOffered).toBeGreaterThan(10)
  })

  it('decreases wage when unprofitable', () => {
    const biz = new Business({ sector: 'food' })
    biz.wageOffered = 50
    biz.employees = [1]
    biz.revenue = 10
    biz._payWages({ minWage: 0 })
    expect(biz.wageOffered).toBeLessThan(50)
  })
})

// ─── _checkBankruptcy ───────────────────────────────────────────────────────

describe('Business._checkBankruptcy', () => {
  it('goes bankrupt when capital below threshold', () => {
    const biz = new Business({ sector: 'food' })
    biz.capital = BUSINESS_BANKRUPTCY_THRESHOLD - 1
    biz._checkBankruptcy(makeState())
    expect(biz.alive).toBe(false)
  })

  it('stays alive above threshold', () => {
    const biz = new Business({ sector: 'food' })
    biz.capital = 100
    biz._checkBankruptcy(makeState())
    expect(biz.alive).toBe(true)
  })
})

// ─── _close ─────────────────────────────────────────────────────────────────

describe('Business._close', () => {
  it('fires all employees on close', () => {
    const agent1 = makeAgent({ id: 1, employed: true })
    const agent2 = makeAgent({ id: 2, employed: true })
    const state = makeState({ agents: [agent1, agent2] })

    const biz = new Business({ sector: 'food' })
    biz.employees = [1, 2]
    biz._close(state, 'bankruptcy')

    expect(biz.alive).toBe(false)
    expect(biz.employees).toEqual([])
    expect(agent1.employed).toBe(false)
    expect(agent2.employed).toBe(false)
  })

  it('notifies owner on close', () => {
    const owner = makeAgent({ id: 1, isOwner: true })
    owner.businessId = 99
    const state = makeState({ agents: [owner] })

    const biz = new Business({ sector: 'food', id: 99, ownerId: 1 })
    biz._close(state, 'bankruptcy')

    expect(owner.isOwner).toBe(false)
    expect(owner.businessId).toBe(null)
  })
})

// ─── _adjustPriceStrategy ───────────────────────────────────────────────────

describe('Business._adjustPriceStrategy', () => {
  it('lowers price when overstocked', () => {
    const biz = new Business({ sector: 'food' })
    biz.price = 10
    biz.inventory = 90
    biz.maxInventory = 100
    biz._adjustPriceStrategy({ policies: {} })
    expect(biz.price).toBeLessThan(10)
  })

  it('raises price when inventory is low', () => {
    const biz = new Business({ sector: 'food' })
    biz.price = 10
    biz.inventory = 5
    biz.maxInventory = 100
    biz.production = 5
    biz._adjustPriceStrategy({ policies: {} })
    expect(biz.price).toBeGreaterThan(10)
  })
})

// ─── createInitialBusinesses ────────────────────────────────────────────────

describe('createInitialBusinesses', () => {
  it('creates correct number of businesses', () => {
    const agents = Array.from({ length: 20 }, (_, i) => makeAgent({
      id: i + 1, skill: 0.6, state: 'unemployed'
    }))
    const businesses = createInitialBusinesses(20, agents)
    expect(businesses.length).toBe(20)
  })

  it('distributes across all sectors', () => {
    const agents = Array.from({ length: 20 }, (_, i) => makeAgent({
      id: i + 1, skill: 0.6, state: 'unemployed'
    }))
    const businesses = createInitialBusinesses(20, agents)
    for (const sector of SECTORS) {
      expect(businesses.filter(b => b.sector === sector).length).toBe(5)
    }
  })

  it('assigns owners from available agents', () => {
    const agents = Array.from({ length: 20 }, (_, i) => makeAgent({
      id: i + 1, skill: 0.6, state: 'unemployed'
    }))
    const businesses = createInitialBusinesses(4, agents)
    const ownedCount = businesses.filter(b => b.ownerId !== null).length
    expect(ownedCount).toBeGreaterThan(0)
  })
})
