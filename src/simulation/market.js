import {
  SECTORS, INITIAL_PRICES, PRICE_ELASTICITY, PRICE_MIN, PRICE_MAX
} from '../utils/constants.js'
import { clamp } from '../utils/math.js'

export function createMarketState() {
  return {
    prices: { ...INITIAL_PRICES },
    supply: { food: 0, housing: 0, tech: 0, luxury: 0 },
    demand: { food: 0, housing: 0, tech: 0, luxury: 0 },
    inflation: 0,
    cpi: 100,
    basePrices: { ...INITIAL_PRICES } // baseline for CPI
  }
}

export function updatePrices(market, state, policies) {
  const { agents, businesses } = state

  const aliveAgents = agents.filter(a => a.alive && a.state !== 'child')
  const aliveBusinesses = businesses.filter(b => b.alive)

  let totalInflation = 0

  for (const sector of SECTORS) {
    // Supply = total production of businesses in this sector
    const supply = aliveBusinesses
      .filter(b => b.sector === sector)
      .reduce((sum, b) => sum + b.production, 0)

    // Demand = what employed agents would buy
    const employedAgents = aliveAgents.filter(a => a.employed || a.isOwner)
    const avgIncome = employedAgents.length > 0
      ? employedAgents.reduce((sum, a) => sum + (a.wage || 20), 0) / employedAgents.length
      : 20

    const demandPerAgent = {
      food: 0.15,
      housing: 0.25,
      tech: 0.10,
      luxury: 0.05
    }

    const demand = aliveAgents.length * avgIncome * (demandPerAgent[sector] || 0.1)

    market.supply[sector] = supply
    market.demand[sector] = demand

    // Price discovery: price adjusts based on supply/demand ratio
    const supplyNonZero = Math.max(supply, 1)
    const imbalance = (demand - supplyNonZero) / supplyNonZero

    const elasticity = PRICE_ELASTICITY[sector]
    let priceChange = imbalance * elasticity * 0.05

    // Policy overrides
    if (sector === 'food' && policies.priceControlFood) {
      priceChange = clamp(priceChange, -0.01, 0.01) // price controls dampen movement
    }
    if (sector === 'housing' && policies.priceControlHousing) {
      priceChange = clamp(priceChange, -0.01, 0.01)
    }

    // Money printing causes inflation
    if (policies.printMoney > 0) {
      priceChange += policies.printMoney * 0.0001
    }

    const oldPrice = market.prices[sector]
    const newPrice = clamp(
      oldPrice * (1 + clamp(priceChange, -0.08, 0.08)),
      PRICE_MIN[sector],
      PRICE_MAX[sector]
    )
    market.prices[sector] = newPrice

    // Update business prices to reflect market
    for (const b of aliveBusinesses.filter(b => b.sector === sector)) {
      b.price = newPrice
    }

    totalInflation += (newPrice - oldPrice) / oldPrice
  }

  // CPI (basket of goods, weighted)
  const cpiWeights = { food: 0.35, housing: 0.35, tech: 0.15, luxury: 0.15 }
  market.cpi = SECTORS.reduce((sum, s) => {
    return sum + (market.prices[s] / market.basePrices[s]) * cpiWeights[s] * 100
  }, 0)

  market.inflation = totalInflation / SECTORS.length

  // Update business market share / dominance
  _updateMarketShare(aliveBusinesses)

  return market
}

function _updateMarketShare(businesses) {
  for (const sector of SECTORS) {
    const sectorBiz = businesses.filter(b => b.sector === sector)
    const totalProd = sectorBiz.reduce((sum, b) => sum + b.production, 0)
    if (totalProd === 0) continue

    for (const b of sectorBiz) {
      b.marketShare = b.production / totalProd
      b.dominance = b.marketShare
    }
  }
}

export function computeGDP(state, market) {
  // GDP = total production value at market prices
  const aliveBusinesses = state.businesses.filter(b => b.alive)
  return aliveBusinesses.reduce((sum, b) => {
    return sum + b.production * market.prices[b.sector]
  }, 0)
}

export function computeUnemploymentRate(agents) {
  const workingAge = agents.filter(a =>
    a.alive && a.state !== 'child' && a.state !== 'retired' && a.state !== 'dead'
  )
  if (workingAge.length === 0) return 0
  const unemployed = workingAge.filter(a => a.state === 'unemployed')
  return unemployed.length / workingAge.length
}

export function computePovertyRate(agents) {
  const adults = agents.filter(a => a.alive && a.state !== 'dead' && a.state !== 'child')
  if (adults.length === 0) return 0
  const poor = adults.filter(a => a.wealth < 100)
  return poor.length / adults.length
}
