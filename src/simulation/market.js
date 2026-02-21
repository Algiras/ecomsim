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
    basePrices: { ...INITIAL_PRICES }, // baseline for CPI
    inflationHistory: [],
    avgExpectedInflation: 0.02,
    centralBankCredibility: 1.0,
    deflationDrag: 0
  }
}

export function updatePrices(market, state, policies, tradeFlows = {}) {
  const { agents, businesses } = state

  const aliveAgents = agents.filter(a => a.alive && a.state !== 'child')
  const aliveBusinesses = businesses.filter(b => b.alive)

  let totalInflation = 0

  for (const sector of SECTORS) {
    // Supply = total production of businesses in this sector
    let supply = aliveBusinesses
      .filter(b => b.sector === sector)
      .reduce((sum, b) => sum + b.production, 0)

    // Trade flows: imports add to supply, exports drain it
    const flow = tradeFlows[sector]
    if (flow) {
      supply += flow.imports || 0
      supply -= flow.exports || 0
      supply = Math.max(0, supply)
    }

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

    let demand = aliveAgents.length * avgIncome * (demandPerAgent[sector] || 0.1)

    // Random demand shock per sector: ±8% noise creates natural business cycles
    demand *= (0.92 + Math.random() * 0.16)

    // Debt-deflation drag suppresses demand
    demand *= (1 - (market.deflationDrag || 0))

    // Asset price channel: low interest rates inflate housing demand
    if (sector === 'housing') {
      const rateGap = Math.max(0, 0.05 - (policies.interestRate || 0.05))
      demand *= 1 + rateGap * 20
    }

    // Inflation expectations boost demand (self-fulfilling)
    const avgExp = market.avgExpectedInflation || 0.02
    demand *= 1 + Math.max(0, avgExp - 0.02) * 3

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

    // Food price → inflation amplifier: food costs drive everything up
    const foodPrice = market.prices.food || 10
    if (foodPrice > 30) {
      priceChange += 0.002  // food crisis drives all prices up
    } else if (foodPrice > 20) {
      priceChange += 0.0005 // cost-of-living pass-through
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

  // Debt-deflation spiral: deflation raises real debt burden
  const avgInflation = totalInflation / SECTORS.length
  if (avgInflation < 0) {
    const deflationMag = Math.abs(avgInflation)
    // Increase real debt burden on agents with loans
    for (const agent of aliveAgents) {
      if (!agent.loans || agent.loans.length === 0) continue
      for (const loan of agent.loans) {
        if (loan.active) {
          loan.remaining *= 1 + deflationMag * 0.5
        }
      }
    }
    // Suppress next tick's demand
    market.deflationDrag = clamp(deflationMag * 2, 0, 0.3)
  } else {
    // Decay drag when inflation returns
    market.deflationDrag = Math.max(0, (market.deflationDrag || 0) * 0.9)
  }

  // CPI (basket of goods, weighted)
  const cpiWeights = { food: 0.35, housing: 0.35, tech: 0.15, luxury: 0.15 }
  market.cpi = SECTORS.reduce((sum, s) => {
    return sum + (market.prices[s] / market.basePrices[s]) * cpiWeights[s] * 100
  }, 0)

  market.inflation = totalInflation / SECTORS.length

  // Update business market share / dominance
  _updateMarketShare(aliveBusinesses)

  // Track inflation history
  market.inflationHistory.push(market.inflation)
  if (market.inflationHistory.length > 200) market.inflationHistory.shift()

  // Aggregate agent inflation expectations
  if (aliveAgents.length > 0) {
    market.avgExpectedInflation = aliveAgents.reduce((s, a) =>
      s + (a.inflationExpectation || 0.02), 0) / aliveAgents.length
  }

  // Central bank credibility
  const inflationDeviation = Math.abs(market.inflation * 100 - 2) // target = 2%
  if (inflationDeviation > 5) {
    market.centralBankCredibility = clamp(market.centralBankCredibility - 0.002, 0, 1)
  } else {
    market.centralBankCredibility = clamp(market.centralBankCredibility + 0.001, 0, 1)
  }

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
