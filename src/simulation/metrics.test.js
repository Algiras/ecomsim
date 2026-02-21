import { describe, it, expect, beforeEach } from 'vitest'
import { createMetricsState, updateMetrics, toMetricsSnapshot } from './metrics.js'
import { createMarketState } from './market.js'
import { INITIAL_PRICES, RICH_THRESHOLD } from '../utils/constants.js'

function makeAgent(overrides = {}) {
  return {
    id: overrides.id ?? 1,
    alive: true,
    state: overrides.state ?? 'working',
    employed: overrides.employed ?? true,
    isOwner: false,
    wage: overrides.wage ?? 20,
    wealth: overrides.wealth ?? 500,
    unrest: overrides.unrest ?? 0.1,
    happiness: 0.5,
    ...overrides
  }
}

function makeBusiness(overrides = {}) {
  return {
    id: overrides.id ?? 1,
    alive: true,
    sector: overrides.sector ?? 'food',
    production: overrides.production ?? 10,
    profit: overrides.profit ?? 5,
    ...overrides
  }
}

describe('createMetricsState', () => {
  it('initializes all metrics to zero/default', () => {
    const m = createMetricsState()
    expect(m.gdp).toBe(0)
    expect(m.gini).toBe(0)
    expect(m.unemployment).toBe(0)
    expect(m.population).toBe(0)
    expect(m.cpi).toBe(100)
    expect(m.govDebt).toBe(0)
  })

  it('initializes history arrays', () => {
    const m = createMetricsState()
    expect(m.history.gdp).toEqual([])
    expect(m.history.gini).toEqual([])
  })
})

describe('updateMetrics', () => {
  let metrics, market

  beforeEach(() => {
    metrics = createMetricsState()
    market = createMarketState()
  })

  it('updates population count', () => {
    const state = {
      agents: [makeAgent(), makeAgent({ id: 2 }), makeAgent({ id: 3, alive: false })],
      businesses: []
    }
    updateMetrics(metrics, state, market, {})
    expect(metrics.population).toBe(2)
  })

  it('updates business count', () => {
    const state = {
      agents: [makeAgent()],
      businesses: [makeBusiness(), makeBusiness({ id: 2 }), makeBusiness({ id: 3, alive: false })]
    }
    updateMetrics(metrics, state, market, {})
    expect(metrics.businessCount).toBe(2)
  })

  it('computes GDP', () => {
    const state = {
      agents: [makeAgent()],
      businesses: [
        makeBusiness({ sector: 'food', production: 10 }),
        makeBusiness({ id: 2, sector: 'tech', production: 5 })
      ]
    }
    updateMetrics(metrics, state, market, {})
    expect(metrics.gdp).toBe(10 * INITIAL_PRICES.food + 5 * INITIAL_PRICES.tech)
  })

  it('computes GDP growth rate', () => {
    const state = {
      agents: [makeAgent()],
      businesses: [makeBusiness({ sector: 'food', production: 10 })]
    }
    updateMetrics(metrics, state, market, {})
    const firstGDP = metrics.gdp

    // Double production
    state.businesses[0].production = 20
    updateMetrics(metrics, state, market, {})
    expect(metrics.gdpGrowth).toBeCloseTo((200 - firstGDP) / firstGDP)
  })

  it('computes gini coefficient', () => {
    const state = {
      agents: [
        makeAgent({ wealth: 100 }),
        makeAgent({ id: 2, wealth: 100 }),
        makeAgent({ id: 3, wealth: 100 })
      ],
      businesses: []
    }
    updateMetrics(metrics, state, market, {})
    expect(metrics.gini).toBe(0) // perfect equality
  })

  it('computes unemployment', () => {
    const state = {
      agents: [
        makeAgent({ state: 'working', employed: true }),
        makeAgent({ id: 2, state: 'unemployed', employed: false })
      ],
      businesses: []
    }
    updateMetrics(metrics, state, market, {})
    expect(metrics.unemployment).toBe(0.5)
  })

  it('computes poverty rate', () => {
    const state = {
      agents: [
        makeAgent({ wealth: 10 }),
        makeAgent({ id: 2, wealth: 10 }),
        makeAgent({ id: 3, wealth: 1000 })
      ],
      businesses: []
    }
    updateMetrics(metrics, state, market, {})
    expect(metrics.povertyRate).toBeCloseTo(2 / 3)
  })

  it('computes social unrest as mean of agent unrest', () => {
    const state = {
      agents: [
        makeAgent({ unrest: 0.2 }),
        makeAgent({ id: 2, unrest: 0.4 }),
        makeAgent({ id: 3, unrest: 0.6 })
      ],
      businesses: []
    }
    updateMetrics(metrics, state, market, {})
    expect(metrics.socialUnrest).toBeCloseTo(0.4)
  })

  it('computes tax revenue', () => {
    const state = {
      agents: [
        makeAgent({ employed: true, wage: 100 }),
        makeAgent({ id: 2, wealth: RICH_THRESHOLD + 1000 })
      ],
      businesses: [makeBusiness({ profit: 200 })]
    }
    updateMetrics(metrics, state, market, { incomeTax: 0.25, corporateTax: 0.2, wealthTax: 0.01 })
    expect(metrics.totalTaxRevenue).toBeGreaterThan(0)
  })

  it('computes government budget (revenue - spending)', () => {
    const state = {
      agents: [
        makeAgent({ employed: true, wage: 100 }),
        makeAgent({ id: 2, state: 'unemployed', employed: false })
      ],
      businesses: [makeBusiness({ profit: 50 })]
    }
    updateMetrics(metrics, state, market, {
      incomeTax: 0.3, corporateTax: 0.2,
      unemploymentBenefit: 50, publicHealthcare: true
    })
    expect(typeof metrics.govBudget).toBe('number')
  })

  it('pushes to history arrays', () => {
    const state = {
      agents: [makeAgent()],
      businesses: [makeBusiness()]
    }
    updateMetrics(metrics, state, market, {})
    expect(metrics.history.gdp.length).toBe(1)
    expect(metrics.history.population.length).toBe(1)
  })
})

describe('trade & FX metrics', () => {
  it('initializes trade/FX metrics to defaults', () => {
    const m = createMetricsState()
    expect(m.tradeBalance).toBe(0)
    expect(m.fxRate).toBe(1.0)
    expect(m.foreignReserves).toBe(500)
    expect(m.exports).toBe(0)
    expect(m.imports).toBe(0)
  })

  it('initializes trade history arrays', () => {
    const m = createMetricsState()
    expect(m.history.fxRate).toEqual([])
    expect(m.history.tradeBalance).toEqual([])
  })

  it('reads trade/FX from globalEconomy state', () => {
    const metrics = createMetricsState()
    const market = createMarketState()
    const state = {
      agents: [makeAgent()],
      businesses: [makeBusiness()],
      globalEconomy: {
        fxRate: 1.5,
        foreignReserves: 300,
        tradeBalance: { food: 10, housing: -5, tech: 3, luxury: -2 }
      }
    }
    updateMetrics(metrics, state, market, {})
    expect(metrics.fxRate).toBe(1.5)
    expect(metrics.foreignReserves).toBe(300)
    expect(metrics.tradeBalance).toBe(6) // 10 + (-5) + 3 + (-2) = 6
    expect(metrics.exports).toBeGreaterThan(0)
    expect(metrics.imports).toBeGreaterThan(0)
  })

  it('handles missing globalEconomy gracefully', () => {
    const metrics = createMetricsState()
    const market = createMarketState()
    const state = {
      agents: [makeAgent()],
      businesses: [makeBusiness()]
      // no globalEconomy
    }
    expect(() => updateMetrics(metrics, state, market, {})).not.toThrow()
    // Should retain default values
    expect(metrics.fxRate).toBe(1.0)
  })

  it('pushes to fxRate and tradeBalance history', () => {
    const metrics = createMetricsState()
    const market = createMarketState()
    const state = {
      agents: [makeAgent()],
      businesses: [makeBusiness()],
      globalEconomy: {
        fxRate: 1.2,
        foreignReserves: 400,
        tradeBalance: { food: 5, housing: 0, tech: 0, luxury: 0 }
      }
    }
    updateMetrics(metrics, state, market, {})
    updateMetrics(metrics, state, market, {})
    expect(metrics.history.fxRate.length).toBe(2)
    expect(metrics.history.tradeBalance.length).toBe(2)
  })
})

describe('toMetricsSnapshot', () => {
  it('returns all expected fields', () => {
    const metrics = createMetricsState()
    const snap = toMetricsSnapshot(metrics)
    expect(snap).toHaveProperty('gdp')
    expect(snap).toHaveProperty('gini')
    expect(snap).toHaveProperty('unemployment')
    expect(snap).toHaveProperty('population')
    expect(snap).toHaveProperty('inflation')
    expect(snap).toHaveProperty('history')
  })

  it('includes trade/FX fields in snapshot', () => {
    const metrics = createMetricsState()
    const snap = toMetricsSnapshot(metrics)
    expect(snap).toHaveProperty('tradeBalance')
    expect(snap).toHaveProperty('fxRate')
    expect(snap).toHaveProperty('foreignReserves')
    expect(snap).toHaveProperty('exports')
    expect(snap).toHaveProperty('imports')
  })
})
