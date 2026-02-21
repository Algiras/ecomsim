// ─── Achievement Definitions ─────────────────────────────────────────────────
// Each achievement has: id, name, icon, description, category, check(metrics, state)

export const ACHIEVEMENTS = [
  // ─── Economy ───────────────────────────────────────────────────────────────
  {
    id: 'full_employment',
    name: 'Full Employment',
    icon: '💼',
    description: 'Reach unemployment below 3%',
    category: 'economy',
    check: (m) => m.unemployment < 0.03
  },
  {
    id: 'gdp_boom',
    name: 'Economic Boom',
    icon: '📈',
    description: 'Grow GDP above $50,000',
    category: 'economy',
    check: (m) => m.gdp > 50000
  },
  {
    id: 'stable_prices',
    name: 'Price Stability',
    icon: '⚖️',
    description: 'Keep CPI between 95 and 110 for 5 years',
    category: 'economy',
    sustained: 260, // 5 years in ticks
    check: (m) => m.cpi >= 95 && m.cpi <= 110
  },
  {
    id: 'hyperinflation_survivor',
    name: 'Hyperinflation Survivor',
    icon: '🔥',
    description: 'Recover from CPI above 200',
    category: 'economy',
    check: (m, s) => s._sawHyperinflation && m.cpi < 120
  },

  // ─── Equality ──────────────────────────────────────────────────────────────
  {
    id: 'equalizer',
    name: 'The Equalizer',
    icon: '🤝',
    description: 'Reduce Gini below 0.25',
    category: 'equality',
    check: (m) => m.gini < 0.25 && m.gini > 0
  },
  {
    id: 'zero_poverty',
    name: 'No One Left Behind',
    icon: '🏠',
    description: 'Reach 0% poverty rate',
    category: 'equality',
    check: (m) => m.povertyRate === 0 && m.population > 20
  },
  {
    id: 'billionaire_factory',
    name: 'Billionaire Factory',
    icon: '💎',
    description: 'Gini above 0.75 — extreme inequality',
    category: 'equality',
    check: (m) => m.gini > 0.75
  },

  // ─── Stability ─────────────────────────────────────────────────────────────
  {
    id: 'popular_mandate',
    name: 'Popular Mandate',
    icon: '🗳️',
    description: 'Reach 90% approval rating',
    category: 'stability',
    check: (m, s) => s.approvalRating > 90
  },
  {
    id: 'zero_crime',
    name: 'Utopian Peace',
    icon: '🕊️',
    description: 'Reduce crime rate to 0',
    category: 'stability',
    check: (m) => m.crimeRate === 0 && m.population > 20
  },
  {
    id: 'debt_free',
    name: 'Debt Free Nation',
    icon: '🏦',
    description: 'Bring government debt to $0 or surplus',
    category: 'stability',
    check: (m) => m.govDebt <= 0
  },

  // ─── Milestones ────────────────────────────────────────────────────────────
  {
    id: 'year_5',
    name: 'Getting Started',
    icon: '📅',
    description: 'Survive 5 years',
    category: 'milestone',
    check: (m) => m.year >= 5
  },
  {
    id: 'year_20',
    name: 'A Generation',
    icon: '📅',
    description: 'Survive 20 years',
    category: 'milestone',
    check: (m) => m.year >= 20
  },
  {
    id: 'year_50',
    name: 'Half Century',
    icon: '🏛️',
    description: 'Survive 50 years',
    category: 'milestone',
    check: (m) => m.year >= 50
  },
  {
    id: 'population_300',
    name: 'Growing Nation',
    icon: '👥',
    description: 'Population reaches 300',
    category: 'milestone',
    check: (m) => m.population >= 300
  },

  // ─── Chaos ─────────────────────────────────────────────────────────────────
  {
    id: 'recession_recovery',
    name: 'Phoenix Economy',
    icon: '🔄',
    description: 'Recover GDP after it drops below 50%',
    category: 'chaos',
    check: (m, s) => s._sawGdpCrash && m.gdp > s._peakGdp * 0.9
  },
  {
    id: 'population_collapse',
    name: 'Ghost Nation',
    icon: '💀',
    description: 'Population drops below 20',
    category: 'chaos',
    check: (m) => m.population < 20 && m.population > 0
  },
  {
    id: 'print_everything',
    name: 'Money Printer Go Brrrr',
    icon: '🖨️',
    description: 'Set money printing to maximum',
    category: 'chaos',
    check: (m, s) => s.policies?.printMoney >= 45
  },
  {
    id: 'confiscate_all',
    name: 'Seize the Means',
    icon: '⚒️',
    description: 'Enable wealth confiscation + nationalize industries',
    category: 'chaos',
    check: (m, s) => s.policies?.wealthConfiscation > 0.3 && s.policies?.nationalizeIndustries
  }
]

// ─── Score System ────────────────────────────────────────────────────────────
// Calculated each metrics update. Ranges 0-100.

export function computeScore(metrics, approvalRating) {
  let score = 0

  // Employment (0-20 pts)
  const unemp = metrics.unemployment || 0
  if (unemp < 0.03) score += 20
  else if (unemp < 0.05) score += 16
  else if (unemp < 0.10) score += 10
  else if (unemp < 0.20) score += 4

  // GDP growth (0-15 pts)
  const growth = metrics.gdpGrowth || 0
  if (growth > 0.05) score += 15
  else if (growth > 0.02) score += 12
  else if (growth > 0) score += 8
  else if (growth > -0.02) score += 3

  // Inflation near 2% target (0-15 pts)
  const infl = metrics.inflation || 0
  const inflDist = Math.abs(infl - 0.02)
  if (inflDist < 0.01) score += 15
  else if (inflDist < 0.03) score += 12
  else if (inflDist < 0.05) score += 8
  else if (inflDist < 0.10) score += 3

  // Low inequality (0-15 pts)
  const g = metrics.gini || 0.5
  if (g < 0.25) score += 15
  else if (g < 0.35) score += 12
  else if (g < 0.45) score += 8
  else if (g < 0.55) score += 4

  // Low poverty (0-10 pts)
  const pov = metrics.povertyRate || 0
  if (pov === 0) score += 10
  else if (pov < 0.05) score += 8
  else if (pov < 0.15) score += 5
  else if (pov < 0.25) score += 2

  // Low crime (0-10 pts)
  const crime = metrics.crimeRate || 0
  if (crime === 0) score += 10
  else if (crime < 0.1) score += 8
  else if (crime < 0.3) score += 5
  else if (crime < 0.5) score += 2

  // Approval (0-15 pts)
  const appr = approvalRating || 50
  if (appr > 80) score += 15
  else if (appr > 60) score += 12
  else if (appr > 40) score += 8
  else if (appr > 20) score += 4

  return Math.min(100, Math.max(0, score))
}

// ─── Milestones ──────────────────────────────────────────────────────────────
// Progressive goals. Each unlocks after the previous.

export const MILESTONES = [
  { id: 'm1', name: 'First Year', desc: 'Survive your first year', check: (m) => m.year >= 1 },
  { id: 'm2', name: 'Stable Start', desc: 'Keep unemployment below 15%', check: (m) => m.unemployment < 0.15 && m.year >= 2 },
  { id: 'm3', name: 'Growing Economy', desc: 'GDP exceeds $10,000', check: (m) => m.gdp > 10000 },
  { id: 'm4', name: 'Tax Collector', desc: 'Earn $500 in tax revenue', check: (m) => m.totalTaxRevenue > 500 },
  { id: 'm5', name: 'Low Crime', desc: 'Crime rate below 0.1', check: (m) => m.crimeRate < 0.1 && m.year >= 3 },
  { id: 'm6', name: 'Decade Leader', desc: 'Reach year 10 with approval > 50%', check: (m, s) => m.year >= 10 && s.approvalRating > 50 },
  { id: 'm7', name: 'Inequality Fighter', desc: 'Gini coefficient below 0.35', check: (m) => m.gini < 0.35 && m.gini > 0 },
  { id: 'm8', name: 'Budget Surplus', desc: 'Government debt below $0', check: (m) => m.govDebt <= 0 },
  { id: 'm9', name: 'Golden Age', desc: 'Score above 80 for 3 years', sustained: 156, check: (m, s) => s._score >= 80 },
  { id: 'm10', name: 'Economic Mastery', desc: 'Reach year 50 with score above 70', check: (m, s) => m.year >= 50 && s._score >= 70 }
]
