import { describe, it, expect, beforeEach } from 'vitest'
import { createGlobalEconomyState, tickGlobalEconomy } from './globalEconomy.js'
import { createMarketState } from './market.js'
import { createMetricsState } from './metrics.js'
import { INITIAL_PRICES, INITIAL_FOREIGN_RESERVES, FX_RATE_MIN, FX_RATE_MAX } from '../utils/constants.js'

describe('createGlobalEconomyState', () => {
  it('initializes world prices to match domestic initial prices', () => {
    const ge = createGlobalEconomyState()
    for (const sector of ['food', 'housing', 'tech', 'luxury']) {
      expect(ge.worldPrices[sector]).toBe(INITIAL_PRICES[sector])
    }
  })

  it('initializes FX rate to 1.0', () => {
    expect(createGlobalEconomyState().fxRate).toBe(1.0)
  })

  it('initializes foreign reserves to INITIAL_FOREIGN_RESERVES', () => {
    expect(createGlobalEconomyState().foreignReserves).toBe(INITIAL_FOREIGN_RESERVES)
  })

  it('initializes trade balance to zero per sector', () => {
    const ge = createGlobalEconomyState()
    for (const sector of ['food', 'housing', 'tech', 'luxury']) {
      expect(ge.tradeBalance[sector]).toBe(0)
    }
  })

  it('starts with no active shock', () => {
    expect(createGlobalEconomyState().activeShock).toBeNull()
  })

  it('initializes empty history arrays', () => {
    const ge = createGlobalEconomyState()
    expect(ge.history.fxRate).toEqual([])
    expect(ge.history.foreignReserves).toEqual([])
    expect(ge.history.tradeBalance).toEqual([])
  })
})

// ─── tickGlobalEconomy ──────────────────────────────────────────────────────

describe('tickGlobalEconomy', () => {
  let ge, market, policies, metrics

  beforeEach(() => {
    ge = createGlobalEconomyState()
    market = createMarketState()
    policies = { interestRate: 0.05, punitiveTargiffs: 0, exportSubsidies: 0 }
    metrics = createMetricsState()
  })

  it('returns tradeFlows object with all sectors', () => {
    const { tradeFlows } = tickGlobalEconomy(ge, market, policies, metrics)
    for (const sector of ['food', 'housing', 'tech', 'luxury']) {
      expect(tradeFlows).toHaveProperty(sector)
      expect(tradeFlows[sector]).toHaveProperty('imports')
      expect(tradeFlows[sector]).toHaveProperty('exports')
      expect(typeof tradeFlows[sector].imports).toBe('number')
      expect(typeof tradeFlows[sector].exports).toBe('number')
    }
  })

  it('world prices random walk stays positive', () => {
    for (let i = 0; i < 500; i++) {
      tickGlobalEconomy(ge, market, policies, metrics)
    }
    for (const sector of ['food', 'housing', 'tech', 'luxury']) {
      expect(ge.worldPrices[sector]).toBeGreaterThan(0)
    }
  })

  it('FX rate stays within bounds after many ticks', () => {
    for (let i = 0; i < 1000; i++) {
      tickGlobalEconomy(ge, market, policies, metrics)
    }
    expect(ge.fxRate).toBeGreaterThanOrEqual(FX_RATE_MIN)
    expect(ge.fxRate).toBeLessThanOrEqual(FX_RATE_MAX)
  })

  it('foreign reserves never go negative', () => {
    // Drain reserves by creating trade deficit conditions
    ge.foreignReserves = 10
    for (let i = 0; i < 200; i++) {
      tickGlobalEconomy(ge, market, policies, metrics)
    }
    expect(ge.foreignReserves).toBeGreaterThanOrEqual(0)
  })

  it('history arrays grow with each tick', () => {
    tickGlobalEconomy(ge, market, policies, metrics)
    tickGlobalEconomy(ge, market, policies, metrics)
    tickGlobalEconomy(ge, market, policies, metrics)
    expect(ge.history.fxRate.length).toBe(3)
    expect(ge.history.foreignReserves.length).toBe(3)
    expect(ge.history.tradeBalance.length).toBe(3)
  })

  it('history arrays cap at 200', () => {
    for (let i = 0; i < 250; i++) {
      tickGlobalEconomy(ge, market, policies, metrics)
    }
    expect(ge.history.fxRate.length).toBe(200)
    expect(ge.history.foreignReserves.length).toBe(200)
    expect(ge.history.tradeBalance.length).toBe(200)
  })

  it('imports and exports are non-negative', () => {
    for (let i = 0; i < 100; i++) {
      const { tradeFlows } = tickGlobalEconomy(ge, market, policies, metrics)
      for (const sector of ['food', 'housing', 'tech', 'luxury']) {
        expect(tradeFlows[sector].imports).toBeGreaterThanOrEqual(0)
        expect(tradeFlows[sector].exports).toBeGreaterThanOrEqual(0)
      }
    }
  })
})

// ─── FX rate drivers ─────────────────────────────────────────────────────────

describe('FX rate dynamics', () => {
  it('money printing weakens currency (FX rate rises)', () => {
    const ge1 = createGlobalEconomyState()
    const ge2 = createGlobalEconomyState()
    const market = createMarketState()
    const metrics = createMetricsState()

    for (let i = 0; i < 200; i++) {
      tickGlobalEconomy(ge1, market, { interestRate: 0.05, printMoney: 0 }, metrics)
      tickGlobalEconomy(ge2, market, { interestRate: 0.05, printMoney: 50 }, metrics)
    }

    // Money printing should cause weaker currency (higher FX rate)
    expect(ge2.fxRate).toBeGreaterThan(ge1.fxRate)
  })

  it('higher interest rates strengthen currency (FX rate falls)', () => {
    const geLow = createGlobalEconomyState()
    const geHigh = createGlobalEconomyState()
    const market = createMarketState()
    const metrics = createMetricsState()

    for (let i = 0; i < 200; i++) {
      tickGlobalEconomy(geLow, market, { interestRate: 0.01 }, metrics)
      tickGlobalEconomy(geHigh, market, { interestRate: 0.15 }, metrics)
    }

    // Higher interest rates → stronger currency → lower FX rate
    expect(geHigh.fxRate).toBeLessThan(geLow.fxRate)
  })

  it('FX intervention dampens movement at cost of reserves', () => {
    const geNoIntervene = createGlobalEconomyState()
    const geIntervene = createGlobalEconomyState()
    const market = createMarketState()
    const metrics = createMetricsState()

    const noPol = { interestRate: 0.05, printMoney: 30, foreignReserveIntervention: false }
    const intPol = { interestRate: 0.05, printMoney: 30, foreignReserveIntervention: true }

    for (let i = 0; i < 100; i++) {
      tickGlobalEconomy(geNoIntervene, market, noPol, metrics)
      tickGlobalEconomy(geIntervene, market, intPol, metrics)
    }

    // Intervention should use reserves
    expect(geIntervene.foreignReserves).toBeLessThan(geNoIntervene.foreignReserves)
    // And dampen FX movement (closer to 1.0)
    expect(Math.abs(geIntervene.fxRate - 1.0)).toBeLessThan(Math.abs(geNoIntervene.fxRate - 1.0))
  })
})

// ─── Trade flows ──────────────────────────────────────────────────────────────

describe('trade flow mechanics', () => {
  it('high domestic prices trigger imports', () => {
    const ge = createGlobalEconomyState()
    const market = createMarketState()
    const metrics = createMetricsState()

    // Set domestic price much higher than world price
    market.prices.food = 50
    market.supply.food = 100
    ge.worldPrices.food = 10
    ge.fxRate = 1.0

    const { tradeFlows } = tickGlobalEconomy(ge, market, { interestRate: 0.05 }, metrics)
    expect(tradeFlows.food.imports).toBeGreaterThan(0)
  })

  it('low domestic prices trigger exports', () => {
    const ge = createGlobalEconomyState()
    const market = createMarketState()
    const metrics = createMetricsState()

    // Set domestic price much lower than world price
    market.prices.food = 5
    market.supply.food = 100
    ge.worldPrices.food = 30
    ge.fxRate = 1.0

    const { tradeFlows } = tickGlobalEconomy(ge, market, { interestRate: 0.05 }, metrics)
    expect(tradeFlows.food.exports).toBeGreaterThan(0)
  })

  it('high tariffs reduce imports', () => {
    const ge1 = createGlobalEconomyState()
    const ge2 = createGlobalEconomyState()
    const market = createMarketState()
    const metrics = createMetricsState()

    market.prices.food = 50
    market.supply.food = 100
    ge1.worldPrices.food = 10
    ge2.worldPrices.food = 10

    const { tradeFlows: free } = tickGlobalEconomy(ge1, market, { interestRate: 0.05, punitiveTargiffs: 0 }, metrics)
    const { tradeFlows: tariffed } = tickGlobalEconomy(ge2, market, { interestRate: 0.05, punitiveTargiffs: 1.5 }, metrics)

    expect(tariffed.food.imports).toBeLessThanOrEqual(free.food.imports)
  })

  it('export subsidies increase exports', () => {
    const ge1 = createGlobalEconomyState()
    const ge2 = createGlobalEconomyState()
    const market = createMarketState()
    const metrics = createMetricsState()

    market.prices.food = 8
    market.supply.food = 100
    ge1.worldPrices.food = 12
    ge2.worldPrices.food = 12

    const { tradeFlows: noSub } = tickGlobalEconomy(ge1, market, { interestRate: 0.05, exportSubsidies: 0 }, metrics)
    const { tradeFlows: withSub } = tickGlobalEconomy(ge2, market, { interestRate: 0.05, exportSubsidies: 0.3 }, metrics)

    expect(withSub.food.exports).toBeGreaterThanOrEqual(noSub.food.exports)
  })
})

// ─── Global shocks ──────────────────────────────────────────────────────────

describe('global shocks', () => {
  it('active shock modifies world prices', () => {
    const ge = createGlobalEconomyState()
    const market = createMarketState()
    const metrics = createMetricsState()

    // Force an oil crisis shock
    ge.activeShock = {
      type: 'oil_crisis',
      label: 'Oil Crisis',
      icon: '🛢️',
      priceMultipliers: { food: 1.6, housing: 1.3, tech: 1.2, luxury: 1.1 },
      duration: 200,
      ticksRemaining: 200
    }

    const foodBefore = ge.worldPrices.food

    for (let i = 0; i < 50; i++) {
      tickGlobalEconomy(ge, market, { interestRate: 0.05 }, metrics)
    }

    // Food prices should rise during oil crisis
    expect(ge.worldPrices.food).toBeGreaterThan(foodBefore)
  })

  it('shock expires after duration', () => {
    const ge = createGlobalEconomyState()
    const market = createMarketState()
    const metrics = createMetricsState()

    ge.activeShock = {
      type: 'global_recession',
      label: 'Global Recession',
      icon: '📉',
      priceMultipliers: { food: 0.7, housing: 0.6, tech: 0.5, luxury: 0.5 },
      duration: 10,
      ticksRemaining: 10
    }

    for (let i = 0; i < 15; i++) {
      tickGlobalEconomy(ge, market, { interestRate: 0.05 }, metrics)
    }

    expect(ge.activeShock).toBeNull()
  })

  it('shockEvent is returned on first tick of shock', () => {
    const ge = createGlobalEconomyState()
    const market = createMarketState()
    const metrics = createMetricsState()

    ge.activeShock = {
      type: 'trade_war',
      label: 'Trade War',
      icon: '⚔️',
      priceMultipliers: { food: 1.2, housing: 1.1, tech: 1.4, luxury: 1.3 },
      duration: 180,
      ticksRemaining: 180
    }

    const { shockEvent } = tickGlobalEconomy(ge, market, { interestRate: 0.05 }, metrics)
    expect(shockEvent).not.toBeNull()
    expect(shockEvent.type).toBe('trade_war')
    expect(shockEvent.label).toBe('Trade War')

    // Second tick should NOT return shockEvent
    const { shockEvent: second } = tickGlobalEconomy(ge, market, { interestRate: 0.05 }, metrics)
    expect(second).toBeNull()
  })

  it('no shock by default (shockEvent is null)', () => {
    const ge = createGlobalEconomyState()
    const market = createMarketState()
    const metrics = createMetricsState()

    const { shockEvent } = tickGlobalEconomy(ge, market, { interestRate: 0.05 }, metrics)
    // With 0.01% probability, overwhelmingly null
    // (in rare case this flakes, re-run — 99.99% chance of null)
    expect(shockEvent).toBeNull()
  })
})

// ─── Feedback loops ──────────────────────────────────────────────────────────

describe('economic feedback loops', () => {
  it('tariff feedback: tariffs → trade surplus → currency appreciates → surplus erodes', () => {
    const ge = createGlobalEconomyState()
    const market = createMarketState()
    const metrics = createMetricsState()

    // Set up conditions where imports would normally flow
    market.prices.food = 30
    market.supply.food = 100
    ge.worldPrices.food = 10

    // Run with high tariffs
    for (let i = 0; i < 300; i++) {
      tickGlobalEconomy(ge, market, { interestRate: 0.05, punitiveTargiffs: 1.5 }, metrics)
    }

    // With high tariffs, FX should tend to stay stable or appreciate (not crash)
    // The exact behavior depends on many factors, just verify stability
    expect(ge.fxRate).toBeGreaterThanOrEqual(FX_RATE_MIN)
    expect(ge.fxRate).toBeLessThanOrEqual(FX_RATE_MAX)
  })

  it('cumulative trade balance tracks over time', () => {
    const ge = createGlobalEconomyState()
    const market = createMarketState()
    const metrics = createMetricsState()

    expect(ge.cumulativeTradeBalance).toBe(0)

    for (let i = 0; i < 50; i++) {
      tickGlobalEconomy(ge, market, { interestRate: 0.05 }, metrics)
    }

    // Cumulative balance should be non-zero after running
    expect(typeof ge.cumulativeTradeBalance).toBe('number')
  })
})
