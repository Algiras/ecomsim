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
    govInterestPayments: 0,
    // Crime
    crimeRate: 0,
    streetCrimeCount: 0,
    corporateCrimeCount: 0,
    prisonPopulation: 0,
    // Banking
    totalPrivateDebt: 0,
    nonPerformingLoans: 0,
    avgCreditScore: 0,
    bankCount: 0,
    mortgageRate: 0,
    // Debt spirals
    agentsInDebtSpiral: 0,
    avgDebtToIncome: 0,
    // Inflation expectations
    inflationExpectations: 0.02,
    centralBankCredibility: 1.0,
    // Stock market
    totalMarketCap: 0,
    publicCompanies: 0,
    avgDividendYield: 0,
    // Trade & FX
    tradeBalance: 0,
    fxRate: 1.0,
    foreignReserves: 500,
    exports: 0,
    imports: 0,
    // Approval
    pendingPolicyCount: 0,
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
      privateDebt: [],
      creditScore: [],
      crime: [],
      prisonPop: [],
      sectorPrices: { food: [], housing: [], tech: [], luxury: [] },
      debtSpiral: [],
      inflationExp: [],
      cbCredibility: [],
      marketCap: [],
      fxRate: [],
      tradeBalance: []
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
  metrics.govDebt += -metrics.govBudget * 0.1

  // Interest on government debt — sovereign debt spiral
  const debtToGdpRatio = Math.abs(metrics.govDebt) / Math.max(metrics.gdp, 1)
  const riskPremium = debtToGdpRatio > 1 ? (debtToGdpRatio - 1) * 0.02 : 0
  const govInterestRate = (policies.interestRate || 0.05) + riskPremium
  if (metrics.govDebt > 0) {
    const interestPayment = metrics.govDebt * govInterestRate * 0.01
    metrics.govDebt += interestPayment
    metrics.govInterestPayments = interestPayment
  } else {
    metrics.govInterestPayments = 0
  }

  // Clamp debt to a sane range — village economies don't have trillions
  metrics.govDebt = Math.max(-50000, Math.min(50000, metrics.govDebt))

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

  // Crime metrics
  const crimeLog = state._crimeLog || []
  metrics.streetCrimeCount = crimeLog.filter(c => c.category === 'street').length
  metrics.corporateCrimeCount = crimeLog.filter(c => c.category === 'corporate').length
  const totalCrimes = metrics.streetCrimeCount + metrics.corporateCrimeCount
  metrics.crimeRate = metrics.population > 0 ? (totalCrimes / metrics.population) * 1000 : 0
  metrics.prisonPopulation = aliveAgents.filter(a => a.incarcerated).length
  // Clear crime log after metrics update (accumulates between updates)
  if (state._crimeLog) state._crimeLog.length = 0

  // Crime history
  if (!hist.crime) hist.crime = []
  if (!hist.prisonPop) hist.prisonPop = []
  _pushHistory(hist.crime, metrics.crimeRate)
  _pushHistory(hist.prisonPop, metrics.prisonPopulation)

  // Banking metrics
  const banks = state.banks || []
  const aliveBanks = banks.filter(b => b.alive)
  metrics.bankCount = aliveBanks.length

  // Total private debt (sum of all agent loans)
  metrics.totalPrivateDebt = aliveAgents.reduce((sum, a) => {
    return sum + (a.loans || []).reduce((s, l) => s + (l.remaining || 0), 0)
  }, 0)

  // Non-performing loans
  metrics.nonPerformingLoans = aliveBanks.reduce((sum, b) => {
    return sum + (b.loanBook || []).filter(l => l.active && l.ticksOverdue > 0).length
  }, 0)

  // Average credit score
  const creditScores = aliveAgents.map(a => a.creditScore || 500)
  metrics.avgCreditScore = creditScores.length > 0
    ? creditScores.reduce((s, v) => s + v, 0) / creditScores.length
    : 500

  // Effective mortgage rate
  const baseRate = policies.interestRate || 0.05
  const avgSpread = aliveBanks.length > 0
    ? aliveBanks.reduce((s, b) => s + b.interestSpread, 0) / aliveBanks.length
    : 0.02
  metrics.mortgageRate = baseRate + avgSpread

  // Banking history
  if (!hist.privateDebt) hist.privateDebt = []
  if (!hist.creditScore) hist.creditScore = []
  _pushHistory(hist.privateDebt, metrics.totalPrivateDebt)
  _pushHistory(hist.creditScore, metrics.avgCreditScore)

  // Debt spiral metrics
  metrics.agentsInDebtSpiral = aliveAgents.filter(a => a.inDebtSpiral).length
  const agentsWithIncome = aliveAgents.filter(a => a.income > 0)
  metrics.avgDebtToIncome = agentsWithIncome.length > 0
    ? agentsWithIncome.reduce((s, a) => {
        const debt = (a.loans || []).reduce((d, l) => d + (l.remaining || 0), 0)
        return s + debt / Math.max(a.income, 1)
      }, 0) / agentsWithIncome.length
    : 0
  if (!hist.debtSpiral) hist.debtSpiral = []
  _pushHistory(hist.debtSpiral, metrics.agentsInDebtSpiral)

  // Inflation expectations metrics
  metrics.inflationExpectations = market.avgExpectedInflation || 0.02
  metrics.centralBankCredibility = market.centralBankCredibility || 1.0
  if (!hist.inflationExp) hist.inflationExp = []
  if (!hist.cbCredibility) hist.cbCredibility = []
  _pushHistory(hist.inflationExp, metrics.inflationExpectations * 100)
  _pushHistory(hist.cbCredibility, metrics.centralBankCredibility * 100)

  // Stock market metrics
  metrics.publicCompanies = aliveBusinesses.filter(b => b.isPublic).length
  metrics.totalMarketCap = aliveBusinesses
    .filter(b => b.isPublic)
    .reduce((s, b) => s + (b.sharePrice || 0) * (b.sharesOutstanding || 0), 0)
  const publicBiz = aliveBusinesses.filter(b => b.isPublic && b.sharePrice > 0)
  metrics.avgDividendYield = publicBiz.length > 0
    ? publicBiz.reduce((s, b) => s + (b.dividendRate || 0), 0) / publicBiz.length
    : 0
  if (!hist.marketCap) hist.marketCap = []
  _pushHistory(hist.marketCap, metrics.totalMarketCap)

  // Trade & FX metrics (from global economy state)
  const ge = state.globalEconomy
  if (ge) {
    metrics.fxRate = ge.fxRate
    metrics.foreignReserves = ge.foreignReserves
    const tb = ge.tradeBalance
    metrics.tradeBalance = Object.values(tb).reduce((s, v) => s + v, 0)
    metrics.exports = Object.values(tb).reduce((s, v) => s + Math.max(0, v), 0)
    metrics.imports = Object.values(tb).reduce((s, v) => s + Math.abs(Math.min(0, v)), 0)
  }
  if (!hist.fxRate) hist.fxRate = []
  if (!hist.tradeBalance) hist.tradeBalance = []
  _pushHistory(hist.fxRate, metrics.fxRate)
  _pushHistory(hist.tradeBalance, metrics.tradeBalance)

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
  const policeSpend = agents.length * (policies.policeFunding || 0) * 0.05
  const oversightSpend = agents.length * (policies.financialOversight || 0) * 0.03
  const prisonSpend = policies.prisonReform ? agents.filter(a => a.incarcerated).length * 0.02 : 0
  const exportSubSpend = agents.length * (policies.exportSubsidies || 0) * 0.1

  return benefitSpend + ubiSpend + healthcareSpend + educationSpend + policeSpend + oversightSpend + prisonSpend + exportSubSpend
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
    govInterestPayments: metrics.govInterestPayments,
    totalTaxRevenue: metrics.totalTaxRevenue,
    crimeRate: metrics.crimeRate,
    streetCrimeCount: metrics.streetCrimeCount,
    corporateCrimeCount: metrics.corporateCrimeCount,
    prisonPopulation: metrics.prisonPopulation,
    totalPrivateDebt: metrics.totalPrivateDebt,
    nonPerformingLoans: metrics.nonPerformingLoans,
    avgCreditScore: metrics.avgCreditScore,
    bankCount: metrics.bankCount,
    mortgageRate: metrics.mortgageRate,
    agentsInDebtSpiral: metrics.agentsInDebtSpiral,
    avgDebtToIncome: metrics.avgDebtToIncome,
    inflationExpectations: metrics.inflationExpectations,
    centralBankCredibility: metrics.centralBankCredibility,
    totalMarketCap: metrics.totalMarketCap,
    publicCompanies: metrics.publicCompanies,
    avgDividendYield: metrics.avgDividendYield,
    pendingPolicyCount: metrics.pendingPolicyCount,
    tradeBalance: metrics.tradeBalance,
    fxRate: metrics.fxRate,
    foreignReserves: metrics.foreignReserves,
    exports: metrics.exports,
    imports: metrics.imports,
    history: metrics.history
  }
}
