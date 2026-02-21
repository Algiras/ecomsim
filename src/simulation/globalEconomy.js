// Global economy layer — world prices, FX rate, trade flows, global shocks
// Self-contained module, no DOM — works in web worker

import { clamp } from '../utils/math.js'
import {
  SECTORS, INITIAL_PRICES,
  WORLD_PRICE_VOLATILITY, IMPORT_SURGE_FACTOR, EXPORT_DRAIN_FACTOR,
  GLOBAL_SHOCK_PROBABILITY, INITIAL_FOREIGN_RESERVES,
  FX_RATE_DIFFERENTIAL, FX_MEAN_REVERSION, FX_RATE_MIN, FX_RATE_MAX
} from '../utils/constants.js'

// ─── Global shock definitions ──────────────────────────────────────────────

const GLOBAL_SHOCKS = [
  {
    type: 'oil_crisis',
    label: 'Oil Crisis',
    icon: '🛢️',
    priceMultipliers: { food: 1.6, housing: 1.3, tech: 1.2, luxury: 1.1 },
    duration: 200
  },
  {
    type: 'global_recession',
    label: 'Global Recession',
    icon: '📉',
    priceMultipliers: { food: 0.7, housing: 0.6, tech: 0.5, luxury: 0.5 },
    duration: 300
  },
  {
    type: 'commodity_supercycle',
    label: 'Commodity Supercycle',
    icon: '📦',
    priceMultipliers: { food: 1.8, housing: 1.5, tech: 1.1, luxury: 1.2 },
    duration: 250
  },
  {
    type: 'trade_war',
    label: 'Trade War',
    icon: '⚔️',
    priceMultipliers: { food: 1.2, housing: 1.1, tech: 1.4, luxury: 1.3 },
    duration: 180
  },
  {
    type: 'tech_deflation',
    label: 'Tech Deflation',
    icon: '💻',
    priceMultipliers: { food: 1.0, housing: 1.0, tech: 0.4, luxury: 0.8 },
    duration: 200
  }
]

// ─── State creation ────────────────────────────────────────────────────────

export function createGlobalEconomyState() {
  return {
    worldPrices: { ...INITIAL_PRICES },
    basePrices: { ...INITIAL_PRICES },
    fxRate: 1.0,
    foreignReserves: INITIAL_FOREIGN_RESERVES,
    tradeBalance: { food: 0, housing: 0, tech: 0, luxury: 0 },
    cumulativeTradeBalance: 0,
    activeShock: null,
    history: {
      fxRate: [],
      foreignReserves: [],
      tradeBalance: []
    }
  }
}

// ─── Main tick ─────────────────────────────────────────────────────────────

export function tickGlobalEconomy(globalState, market, policies, metrics) {
  // 1. Walk world prices — mean-reverting random walk per sector
  for (const sector of SECTORS) {
    const base = globalState.basePrices[sector]
    const current = globalState.worldPrices[sector]
    const noise = (Math.random() - 0.5) * 2 * WORLD_PRICE_VOLATILITY
    const reversion = (base - current) / base * 0.001
    globalState.worldPrices[sector] = Math.max(1, current * (1 + noise + reversion))
  }

  // 2. Maybe trigger global shock
  if (!globalState.activeShock && Math.random() < GLOBAL_SHOCK_PROBABILITY) {
    const shock = GLOBAL_SHOCKS[Math.floor(Math.random() * GLOBAL_SHOCKS.length)]
    globalState.activeShock = {
      ...shock,
      ticksRemaining: shock.duration
    }
  }

  // 3. Apply active shock to world prices
  let shockEvent = null
  if (globalState.activeShock) {
    const shock = globalState.activeShock
    for (const sector of SECTORS) {
      const mult = shock.priceMultipliers[sector] || 1
      // Gradually apply — blend toward shock price over duration
      const progress = 1 - shock.ticksRemaining / shock.duration
      const blendedMult = 1 + (mult - 1) * Math.min(1, progress * 3) // ramp up in first third
      globalState.worldPrices[sector] *= blendedMult > 1
        ? 1 + (blendedMult - 1) * 0.01   // apply 1% per tick of the excess
        : 1 - (1 - blendedMult) * 0.01    // same for deflation
    }

    shock.ticksRemaining--
    if (shock.ticksRemaining <= 0) {
      globalState.activeShock = null
    }

    // Return shock info on first tick for event feed
    if (shock.ticksRemaining === shock.duration - 1) {
      shockEvent = {
        type: shock.type,
        label: shock.label,
        icon: shock.icon,
        duration: shock.duration
      }
    }
  }

  // 4. Update FX rate from macro signals
  const netTrade = Object.values(globalState.tradeBalance).reduce((s, v) => s + v, 0)
  const tradePresure = -netTrade * 0.00001 // deficit weakens currency

  // Interest rate differential — higher domestic rates attract capital → stronger currency
  const rateDiff = ((policies.interestRate || 0.05) - 0.05) * FX_RATE_DIFFERENTIAL * 100

  // Money printing → depreciation
  const printPressure = (policies.printMoney || 0) * 0.0002

  // Inflation differential
  const inflationPressure = (market.inflation || 0) * 0.005

  // Mean reversion toward 1.0
  const fxReversion = (1.0 - globalState.fxRate) * FX_MEAN_REVERSION

  let fxDelta = tradePresure - rateDiff + printPressure + inflationPressure + fxReversion
  globalState.fxRate = clamp(globalState.fxRate + fxDelta, FX_RATE_MIN, FX_RATE_MAX)

  // 5. FX intervention — dampen movement at cost of reserves
  if (policies.foreignReserveIntervention && globalState.foreignReserves > 50) {
    const dampening = fxDelta * 0.5
    globalState.fxRate -= dampening
    globalState.fxRate = clamp(globalState.fxRate, FX_RATE_MIN, FX_RATE_MAX)
    globalState.foreignReserves -= Math.abs(dampening) * 500
  }

  // 6. Compute trade flows per sector
  const tariff = policies.punitiveTargiffs || 0
  const exportSub = policies.exportSubsidies || 0
  const tradeFlows = {}
  let tickTradeBalance = 0

  for (const sector of SECTORS) {
    const domesticPrice = market.prices[sector] || 10
    const worldPrice = globalState.worldPrices[sector] * globalState.fxRate
    const importThreshold = worldPrice * (1 + tariff) * IMPORT_SURGE_FACTOR
    const exportThreshold = worldPrice * (1 + exportSub) * EXPORT_DRAIN_FACTOR

    let imports = 0
    let exports = 0

    // Imports: if domestic is expensive, foreign goods flow in
    if (domesticPrice > importThreshold && importThreshold > 0) {
      const priceDiff = (domesticPrice - importThreshold) / domesticPrice
      imports = priceDiff * market.supply[sector] * 0.15 // up to 15% of domestic supply
    }

    // Exports: if domestic is cheap, goods flow out
    if (domesticPrice < exportThreshold && domesticPrice > 0) {
      const priceDiff = (exportThreshold - domesticPrice) / exportThreshold
      exports = priceDiff * market.supply[sector] * 0.1 // up to 10% drained
    }

    tradeFlows[sector] = { imports, exports }

    const sectorBalance = exports * domesticPrice - imports * worldPrice
    globalState.tradeBalance[sector] = sectorBalance
    tickTradeBalance += sectorBalance
  }

  // Export subsidies cost government
  // (handled by metrics/govSpending reading the policy value)

  // 7. Update foreign reserves
  globalState.foreignReserves += tickTradeBalance * 0.01
  globalState.foreignReserves = Math.max(0, globalState.foreignReserves)
  globalState.cumulativeTradeBalance += tickTradeBalance

  // 8. Push history
  const hist = globalState.history
  hist.fxRate.push(Math.round(globalState.fxRate * 1000) / 1000)
  hist.foreignReserves.push(Math.round(globalState.foreignReserves))
  hist.tradeBalance.push(Math.round(tickTradeBalance))
  if (hist.fxRate.length > 200) hist.fxRate.shift()
  if (hist.foreignReserves.length > 200) hist.foreignReserves.shift()
  if (hist.tradeBalance.length > 200) hist.tradeBalance.shift()

  return { tradeFlows, shockEvent }
}
