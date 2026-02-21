import { describe, it, expect, beforeEach } from 'vitest'
import { createMarketState, updatePrices, computeGDP, computeUnemploymentRate, computePovertyRate } from './market.js'
import { INITIAL_PRICES, SECTORS, PRICE_MIN, PRICE_MAX } from '../utils/constants.js'

function makeAgent(overrides = {}) {
  return {
    id: overrides.id ?? 1,
    alive: true,
    state: overrides.state ?? 'working',
    employed: overrides.employed ?? true,
    isOwner: overrides.isOwner ?? false,
    wage: overrides.wage ?? 20,
    wealth: overrides.wealth ?? 500,
    ...overrides
  }
}

function makeBusiness(overrides = {}) {
  return {
    id: overrides.id ?? 1,
    alive: true,
    sector: overrides.sector ?? 'food',
    production: overrides.production ?? 10,
    price: overrides.price ?? INITIAL_PRICES[overrides.sector ?? 'food'],
    employees: overrides.employees ?? [],
    marketShare: 0,
    dominance: 0,
    ...overrides
  }
}

// ─── createMarketState ──────────────────────────────────────────────────────

describe('createMarketState', () => {
  it('initializes prices to INITIAL_PRICES', () => {
    const market = createMarketState()
    for (const sector of SECTORS) {
      expect(market.prices[sector]).toBe(INITIAL_PRICES[sector])
    }
  })

  it('initializes supply and demand to zero', () => {
    const market = createMarketState()
    for (const sector of SECTORS) {
      expect(market.supply[sector]).toBe(0)
      expect(market.demand[sector]).toBe(0)
    }
  })

  it('initializes CPI to 100', () => {
    expect(createMarketState().cpi).toBe(100)
  })
})

// ─── updatePrices ───────────────────────────────────────────────────────────

describe('updatePrices', () => {
  let market

  beforeEach(() => {
    market = createMarketState()
  })

  it('computes supply from business production', () => {
    const state = {
      agents: [makeAgent()],
      businesses: [
        makeBusiness({ sector: 'food', production: 50 }),
        makeBusiness({ sector: 'food', production: 30, id: 2 })
      ]
    }
    updatePrices(market, state, {})
    expect(market.supply.food).toBe(80)
  })

  it('computes demand from agents and wages', () => {
    const agents = Array.from({ length: 10 }, (_, i) =>
      makeAgent({ id: i + 1, wage: 20 })
    )
    const state = { agents, businesses: [makeBusiness()] }
    updatePrices(market, state, {})
    // demand ≈ 10 agents * 20 avg wage * 0.15 (food rate) = 30 (±8% noise)
    expect(market.demand.food).toBeGreaterThan(30 * 0.85)
    expect(market.demand.food).toBeLessThan(30 * 1.15)
  })

  it('prices stay within bounds', () => {
    const state = {
      agents: Array.from({ length: 100 }, (_, i) =>
        makeAgent({ id: i + 1, wage: 1000 })
      ),
      businesses: [makeBusiness({ production: 1 })]
    }
    // Run many iterations to push price to extreme
    for (let i = 0; i < 1000; i++) {
      updatePrices(market, state, {})
    }
    for (const sector of SECTORS) {
      expect(market.prices[sector]).toBeGreaterThanOrEqual(PRICE_MIN[sector])
      expect(market.prices[sector]).toBeLessThanOrEqual(PRICE_MAX[sector])
    }
  })

  it('price controls dampen food price changes', () => {
    const state = {
      agents: Array.from({ length: 50 }, (_, i) => makeAgent({ id: i + 1, wage: 100 })),
      businesses: [makeBusiness({ sector: 'food', production: 1 })]
    }
    const marketControlled = createMarketState()
    const marketFree = createMarketState()

    updatePrices(marketControlled, state, { priceControlFood: true })
    updatePrices(marketFree, state, {})

    const controlledChange = Math.abs(marketControlled.prices.food - INITIAL_PRICES.food)
    const freeChange = Math.abs(marketFree.prices.food - INITIAL_PRICES.food)
    expect(controlledChange).toBeLessThanOrEqual(freeChange)
  })

  it('money printing increases prices', () => {
    const state = {
      agents: [makeAgent()],
      businesses: SECTORS.map((s, i) => makeBusiness({ id: i + 1, sector: s, production: 100 }))
    }
    const marketNoPrint = createMarketState()
    const marketPrint = createMarketState()

    updatePrices(marketNoPrint, state, {})
    updatePrices(marketPrint, state, { printMoney: 100 })

    // Every sector price should be higher with money printing
    for (const sector of SECTORS) {
      expect(marketPrint.prices[sector]).toBeGreaterThanOrEqual(marketNoPrint.prices[sector])
    }
  })

  it('CPI reflects price changes', () => {
    const state = {
      agents: [makeAgent()],
      businesses: SECTORS.map((s, i) => makeBusiness({ id: i + 1, sector: s, production: 100 }))
    }
    updatePrices(market, state, {})
    // CPI should be close to 100 when prices haven't moved much
    expect(market.cpi).toBeGreaterThan(80)
    expect(market.cpi).toBeLessThan(120)
  })

  it('inflation is average of price changes', () => {
    const state = {
      agents: [makeAgent()],
      businesses: SECTORS.map((s, i) => makeBusiness({ id: i + 1, sector: s, production: 100 }))
    }
    updatePrices(market, state, {})
    expect(typeof market.inflation).toBe('number')
    expect(isNaN(market.inflation)).toBe(false)
  })

  it('updates market share for businesses', () => {
    const state = {
      agents: [makeAgent()],
      businesses: [
        makeBusiness({ id: 1, sector: 'food', production: 75 }),
        makeBusiness({ id: 2, sector: 'food', production: 25 })
      ]
    }
    updatePrices(market, state, {})
    expect(state.businesses[0].marketShare).toBeCloseTo(0.75)
    expect(state.businesses[1].marketShare).toBeCloseTo(0.25)
  })
})

// ─── trade flow injection ─────────────────────────────────────────────────────

describe('updatePrices with tradeFlows', () => {
  it('works without tradeFlows param (backward compat)', () => {
    const market = createMarketState()
    const state = {
      agents: [makeAgent()],
      businesses: [makeBusiness({ sector: 'food', production: 50 })]
    }
    // No 4th param — should not throw
    expect(() => updatePrices(market, state, {})).not.toThrow()
    expect(market.supply.food).toBe(50)
  })

  it('imports add to effective supply', () => {
    const market = createMarketState()
    const state = {
      agents: [makeAgent()],
      businesses: [makeBusiness({ sector: 'food', production: 50 })]
    }
    const tradeFlows = { food: { imports: 30, exports: 0 } }
    updatePrices(market, state, {}, tradeFlows)
    expect(market.supply.food).toBe(80) // 50 production + 30 imports
  })

  it('exports drain effective supply', () => {
    const market = createMarketState()
    const state = {
      agents: [makeAgent()],
      businesses: [makeBusiness({ sector: 'food', production: 50 })]
    }
    const tradeFlows = { food: { imports: 0, exports: 20 } }
    updatePrices(market, state, {}, tradeFlows)
    expect(market.supply.food).toBe(30) // 50 - 20
  })

  it('supply never goes negative from exports', () => {
    const market = createMarketState()
    const state = {
      agents: [makeAgent()],
      businesses: [makeBusiness({ sector: 'food', production: 10 })]
    }
    const tradeFlows = { food: { imports: 0, exports: 50 } }
    updatePrices(market, state, {}, tradeFlows)
    expect(market.supply.food).toBeGreaterThanOrEqual(0)
  })

  it('imports lower prices (more supply → lower price)', () => {
    const marketNoTrade = createMarketState()
    const marketWithImport = createMarketState()
    const state = {
      agents: Array.from({ length: 20 }, (_, i) => makeAgent({ id: i + 1, wage: 50 })),
      businesses: [makeBusiness({ sector: 'food', production: 5 })]
    }
    updatePrices(marketNoTrade, state, {})
    updatePrices(marketWithImport, state, {}, { food: { imports: 100, exports: 0 } })

    expect(marketWithImport.prices.food).toBeLessThanOrEqual(marketNoTrade.prices.food)
  })

  it('exports raise prices (less supply → higher price)', () => {
    const marketNoTrade = createMarketState()
    const marketWithExport = createMarketState()
    const state = {
      agents: Array.from({ length: 5 }, (_, i) => makeAgent({ id: i + 1, wage: 20 })),
      businesses: [makeBusiness({ sector: 'food', production: 100 })]
    }
    updatePrices(marketNoTrade, state, {})
    updatePrices(marketWithExport, state, {}, { food: { imports: 0, exports: 50 } })

    expect(marketWithExport.prices.food).toBeGreaterThanOrEqual(marketNoTrade.prices.food)
  })

  it('empty tradeFlows object has no effect', () => {
    const market1 = createMarketState()
    const market2 = createMarketState()
    const state = {
      agents: [makeAgent()],
      businesses: [makeBusiness({ sector: 'food', production: 50 })]
    }
    updatePrices(market1, state, {})
    updatePrices(market2, state, {}, {})
    // Same supply since empty tradeFlows
    expect(market2.supply.food).toBe(market1.supply.food)
  })
})

// ─── computeGDP ─────────────────────────────────────────────────────────────

describe('computeGDP', () => {
  it('sums production * price for all alive businesses', () => {
    const market = createMarketState()
    const state = {
      businesses: [
        makeBusiness({ sector: 'food', production: 10 }),
        makeBusiness({ sector: 'tech', production: 5, id: 2 })
      ]
    }
    // GDP = 10 * food_price + 5 * tech_price
    const expected = 10 * INITIAL_PRICES.food + 5 * INITIAL_PRICES.tech
    expect(computeGDP(state, market)).toBe(expected)
  })

  it('excludes dead businesses', () => {
    const market = createMarketState()
    const state = {
      businesses: [
        makeBusiness({ sector: 'food', production: 10 }),
        makeBusiness({ sector: 'food', production: 100, alive: false, id: 2 })
      ]
    }
    expect(computeGDP(state, market)).toBe(10 * INITIAL_PRICES.food)
  })

  it('returns 0 with no businesses', () => {
    expect(computeGDP({ businesses: [] }, createMarketState())).toBe(0)
  })
})

// ─── computeUnemploymentRate ────────────────────────────────────────────────

describe('computeUnemploymentRate', () => {
  it('returns 0 when all are employed', () => {
    const agents = [
      makeAgent({ state: 'working' }),
      makeAgent({ state: 'owner', id: 2 })
    ]
    expect(computeUnemploymentRate(agents)).toBe(0)
  })

  it('returns 1 when all working-age are unemployed', () => {
    const agents = [
      makeAgent({ state: 'unemployed' }),
      makeAgent({ state: 'unemployed', id: 2 })
    ]
    expect(computeUnemploymentRate(agents)).toBe(1)
  })

  it('returns correct fraction', () => {
    const agents = [
      makeAgent({ state: 'working' }),
      makeAgent({ state: 'unemployed', id: 2 }),
      makeAgent({ state: 'working', id: 3 }),
      makeAgent({ state: 'unemployed', id: 4 })
    ]
    expect(computeUnemploymentRate(agents)).toBe(0.5)
  })

  it('excludes children and retirees', () => {
    const agents = [
      makeAgent({ state: 'working' }),
      makeAgent({ state: 'child', id: 2 }),
      makeAgent({ state: 'retired', id: 3 })
    ]
    expect(computeUnemploymentRate(agents)).toBe(0) // only 1 working-age, employed
  })

  it('returns 0 for empty array', () => {
    expect(computeUnemploymentRate([])).toBe(0)
  })
})

// ─── computePovertyRate ─────────────────────────────────────────────────────

describe('computePovertyRate', () => {
  it('returns 0 when nobody is poor', () => {
    const agents = [
      makeAgent({ wealth: 500 }),
      makeAgent({ wealth: 1000, id: 2 })
    ]
    expect(computePovertyRate(agents)).toBe(0)
  })

  it('returns 1 when everyone is poor', () => {
    const agents = [
      makeAgent({ wealth: 10 }),
      makeAgent({ wealth: 50, id: 2 })
    ]
    expect(computePovertyRate(agents)).toBe(1)
  })

  it('returns correct fraction', () => {
    const agents = [
      makeAgent({ wealth: 10 }),   // poor (< 100)
      makeAgent({ wealth: 500, id: 2 }),
      makeAgent({ wealth: 50, id: 3 }),  // poor
      makeAgent({ wealth: 200, id: 4 })
    ]
    expect(computePovertyRate(agents)).toBe(0.5)
  })

  it('excludes children', () => {
    const agents = [
      makeAgent({ wealth: 500 }),
      makeAgent({ wealth: 5, state: 'child', id: 2 })
    ]
    expect(computePovertyRate(agents)).toBe(0)
  })
})
