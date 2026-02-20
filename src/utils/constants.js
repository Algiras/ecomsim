// ─── Simulation parameters ──────────────────────────────────────────────────

export const TICK_RATE = 60 // ticks per second target
export const WORKER_UPDATE_EVERY = 3 // send state to UI every N ticks

// ─── Population ─────────────────────────────────────────────────────────────

export const INITIAL_AGENTS = 200
export const MAX_AGENTS = 500
export const MIN_AGENTS = 20

export const BIRTH_RATE_BASE = 0.0003 // per agent per tick
export const DEATH_RATE_BASE = 0.0001 // per agent per tick
export const RETIREMENT_AGE = 65 * 52 // ticks (1 year = 52 ticks)
export const WORKING_AGE = 18 * 52
export const MAX_AGE = 85 * 52

// ─── Economy sectors ─────────────────────────────────────────────────────────

export const SECTORS = ['food', 'housing', 'tech', 'luxury']

export const SECTOR_NAMES = {
  food: 'Food & Agriculture',
  housing: 'Housing & Shelter',
  tech: 'Technology',
  luxury: 'Luxury Goods'
}

export const INITIAL_PRICES = {
  food: 10,
  housing: 50,
  tech: 30,
  luxury: 80
}

export const PRICE_ELASTICITY = {
  food: 0.15,    // inelastic — people need food
  housing: 0.2,
  tech: 0.8,
  luxury: 1.5    // elastic — luxury is optional
}

export const PRICE_MIN = {
  food: 2,
  housing: 10,
  tech: 5,
  luxury: 10
}

export const PRICE_MAX = {
  food: 200,
  housing: 500,
  tech: 300,
  luxury: 800
}

// Base production per business per tick
export const BASE_PRODUCTION = {
  food: 15,
  housing: 5,
  tech: 10,
  luxury: 8
}

// ─── Businesses ──────────────────────────────────────────────────────────────

export const INITIAL_BUSINESSES = 20
export const MAX_BUSINESSES = 80
export const MIN_EMPLOYEES = 1
export const MAX_EMPLOYEES = 15
export const BUSINESS_START_CAPITAL = 500
export const BUSINESS_BANKRUPTCY_THRESHOLD = -200 // goes bankrupt if capital < this
export const BUSINESS_HIRE_THRESHOLD = 0.7  // hire when utilization > 70%
export const BUSINESS_FIRE_THRESHOLD = 0.3  // fire when utilization < 30%
export const PROFIT_MARGIN_TARGET = 0.15    // target profit margin
export const STARTUP_PROBABILITY = 0.00005  // per unemployed agent per tick

// ─── Wages ───────────────────────────────────────────────────────────────────

export const BASE_WAGE = 15          // per tick
export const MIN_WAGE_DEFAULT = 10
export const WAGE_NEGOTIATION_POWER = 0.3  // 0=employer wins, 1=worker wins

// ─── Agent finances ──────────────────────────────────────────────────────────

export const INITIAL_WEALTH_MEAN = 500
export const INITIAL_WEALTH_STD = 300
export const CONSUMPTION_RATE = {
  food: 0.15,    // fraction of income spent on food
  housing: 0.3,
  tech: 0.1,
  luxury: 0.05
}
export const SAVINGS_RATE_BASE = 0.1
export const POVERTY_THRESHOLD = 100    // wealth below this = poverty
export const RICH_THRESHOLD = 5000      // wealth above this = wealthy

// ─── Canvas / rendering ──────────────────────────────────────────────────────

export const CANVAS_WIDTH = 800
export const CANVAS_HEIGHT = 600
export const AGENT_RADIUS = 4
export const BUSINESS_RADIUS = 10
export const MOVE_SPEED = 0.8
export const WANDER_STRENGTH = 0.2

// ─── Policy defaults ─────────────────────────────────────────────────────────

export const DEFAULT_POLICIES = {
  incomeTax: 0.25,          // 0–0.6
  corporateTax: 0.21,       // 0–0.5
  minWage: 10,              // 0 = off
  ubi: 0,                   // 0 = off, else amount per tick
  interestRate: 0.05,       // 0–0.2
  antiMonopoly: false,
  educationFunding: 0.3,    // 0–1
  unemploymentBenefit: 50,  // 0 = off
  priceControlFood: false,
  priceControlHousing: false,
  printMoney: 0,            // 0 = off, else inflation injection per tick
  publicHealthcare: false,
  wealthTax: 0,             // 0–0.05
  openBorders: false,
  subsidiesFarming: false,
  // ─── Weird Laws ───────────────────────────────────────────────────────────
  fourDayWeek: false,
  robotTax: 0,              // 0–0.5 (fraction of tech production taxed)
  breadAndCircuses: false,
  mandatoryProfitShare: 0,  // 0–0.3 (fraction of profit redistributed to employees)
  landValueTax: 0,          // 0–0.05 annual LVT rate
  banAdvertising: false,
  debtJubilee: false,       // one-time trigger — engine resets it
  lotteryRedistribution: false,
  sumptuary: false,
  degrowth: false,
  algoCentralPlanning: false,
  universalBankAccount: false
}

// ─── Economic shocks ─────────────────────────────────────────────────────────

export const SHOCK_PROBABILITY = 0.0002   // per tick chance of random event

// ─── Spatial hash ────────────────────────────────────────────────────────────

export const SPATIAL_CELL_SIZE = 60

// ─── Metrics ─────────────────────────────────────────────────────────────────

export const METRICS_HISTORY_LENGTH = 200  // data points kept for charts
export const METRICS_UPDATE_EVERY = 10     // compute metrics every N ticks

// ─── Scenarios ───────────────────────────────────────────────────────────────

export const SCENARIO_IDS = ['freeMarket', 'debtSpiral', 'techDisruption']
