import { gini, mean, percentile } from '../utils/math.js'
import { POVERTY_THRESHOLD, RICH_THRESHOLD, METRICS_HISTORY_LENGTH } from '../utils/constants.js'
import { computeGDP, computeUnemploymentRate, computePovertyRate } from './market.js'

export function createMetricsState() {
  return {
    tick: 0,
    year: 0,
    gdp: 0,
    gdpGrowth: 0,
    gini: 0,
    unemployment: 0,
    povertyRate: 0,
    cpi: 100,
    inflation: 0,
    avgWage: 0,
    avgWealth: 0,
    medianWealth: 0,
    socialUnrest: 0,
    population: 0,
    businessCount: 0,
    bankruptcies: 0,
    totalTaxRevenue: 0,
    govBudget: 0,
    govDebt: 0,
    history: {
      gdp: [],
      gini: [],
      unemployment: [],
      cpi: [],
      inflation: [],
      population: [],
      unrest: [],
      wages: [],
      poverty: [],
      govBudget: [],
      businessCount: [],
      medianWealth: [],
      sectorPrices: { food: [], housing: [], tech: [], luxury: [] }
    }
  }
}

export function updateMetrics(metrics, state, market, policies) {
  const { agents, businesses } = state
  const aliveAgents = agents.filter(a => a.alive && a.state !== 'dead')
  const aliveBusinesses = businesses.filter(b => b.alive)

  metrics.tick++
  metrics.year = Math.floor(metrics.tick / 52)

  // Population
  metrics.population = aliveAgents.length
  metrics.businessCount = aliveBusinesses.length

  // Wealth metrics
  const wealthValues = aliveAgents.map(a => Math.max(0, a.wealth))
  metrics.gini = gini(wealthValues)
  metrics.avgWealth = mean(wealthValues)
  metrics.medianWealth = percentile(wealthValues, 50)

  // GDP
  const prevGDP = metrics.gdp
  metrics.gdp = computeGDP(state, market)
  metrics.gdpGrowth = prevGDP > 0 ? (metrics.gdp - prevGDP) / prevGDP : 0

  // Labor
  metrics.unemployment = computeUnemploymentRate(aliveAgents)
  metrics.povertyRate = computePovertyRate(aliveAgents)

  const employed = aliveAgents.filter(a => a.employed && a.wage > 0)
  metrics.avgWage = employed.length > 0
    ? employed.reduce((sum, a) => sum + a.wage, 0) / employed.length
    : 0

  // Prices
  metrics.cpi = market.cpi
  metrics.inflation = market.inflation * 100

  // Social unrest — weighted average of individual unrest
  const unrestValues = aliveAgents.map(a => a.unrest)
  metrics.socialUnrest = mean(unrestValues)

  // Government budget (simplified)
  const taxRevenue = _computeTaxRevenue(aliveAgents, aliveBusinesses, policies)
  const govSpending = _computeGovSpending(aliveAgents, policies)
  metrics.totalTaxRevenue = taxRevenue
  metrics.govBudget = taxRevenue - govSpending
  metrics.govDebt += -metrics.govBudget * 0.1 // simplification

  // History (push and trim)
  const hist = metrics.history
  _pushHistory(hist.gdp, metrics.gdp)
  _pushHistory(hist.gini, metrics.gini)
  _pushHistory(hist.unemployment, metrics.unemployment * 100)
  _pushHistory(hist.cpi, metrics.cpi)
  _pushHistory(hist.inflation, metrics.inflation)
  _pushHistory(hist.population, metrics.population)
  _pushHistory(hist.unrest, metrics.socialUnrest * 100)
  _pushHistory(hist.wages, metrics.avgWage)
  _pushHistory(hist.poverty, metrics.povertyRate * 100)
  _pushHistory(hist.govBudget, metrics.govBudget)
  _pushHistory(hist.businessCount, metrics.businessCount)
  _pushHistory(hist.medianWealth, metrics.medianWealth)

  if (!hist.sectorPrices) hist.sectorPrices = { food: [], housing: [], tech: [], luxury: [] }
  for (const sector of ['food', 'housing', 'tech', 'luxury']) {
    _pushHistory(hist.sectorPrices[sector], market.prices?.[sector] || 0)
  }

  return metrics
}

function _pushHistory(arr, value) {
  arr.push(Math.round(value * 100) / 100)
  if (arr.length > METRICS_HISTORY_LENGTH) arr.shift()
}

function _computeTaxRevenue(agents, businesses, policies) {
  const incomeTax = agents
    .filter(a => a.employed && a.wage > 0)
    .reduce((sum, a) => sum + a.wage * (policies.incomeTax || 0), 0)

  const corpTax = businesses
    .filter(b => b.profit > 0)
    .reduce((sum, b) => sum + b.profit * (policies.corporateTax || 0), 0)

  const wealthTax = agents
    .filter(a => a.wealth > RICH_THRESHOLD)
    .reduce((sum, a) => sum + (a.wealth - RICH_THRESHOLD) * (policies.wealthTax || 0), 0)

  return incomeTax + corpTax + wealthTax
}

function _computeGovSpending(agents, policies) {
  const unemployed = agents.filter(a => a.state === 'unemployed')
  const benefitSpend = unemployed.length * (policies.unemploymentBenefit || 0) * 0.1

  const ubiSpend = agents.filter(a => a.state !== 'child').length * (policies.ubi || 0) * 0.01

  const healthcareSpend = policies.publicHealthcare ? agents.length * 0.5 : 0
  const educationSpend = agents.length * (policies.educationFunding || 0) * 0.2

  return benefitSpend + ubiSpend + healthcareSpend + educationSpend
}

export function toMetricsSnapshot(metrics) {
  return {
    tick: metrics.tick,
    year: metrics.year,
    gdp: metrics.gdp,
    gdpGrowth: metrics.gdpGrowth,
    gini: metrics.gini,
    unemployment: metrics.unemployment,
    povertyRate: metrics.povertyRate,
    cpi: metrics.cpi,
    inflation: metrics.inflation,
    avgWage: metrics.avgWage,
    avgWealth: metrics.avgWealth,
    medianWealth: metrics.medianWealth,
    socialUnrest: metrics.socialUnrest,
    population: metrics.population,
    businessCount: metrics.businessCount,
    govDebt: metrics.govDebt,
    totalTaxRevenue: metrics.totalTaxRevenue,
    history: metrics.history
  }
}
