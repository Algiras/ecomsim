// Win conditions for each scenario — evaluated against live metrics

export const SCENARIO_OBJECTIVES = {
  greatDepression: [
    {
      id: 'restore_employment',
      label: 'Restore Employment',
      description: 'Bring unemployment below 10%',
      metric: 'unemployment',
      operator: 'lt',
      threshold: 0.10,
      sustainTicks: 52 * 2,
      weight: 0.4,
      icon: '👷',
      tip: 'Government work programs, public investment, and lower interest rates historically helped.'
    },
    {
      id: 'gdp_recovery',
      label: 'GDP Recovery',
      description: 'Grow GDP back to starting level',
      metric: 'gdp',
      operator: 'gt_initial',
      threshold: 1.0,
      sustainTicks: 0,
      weight: 0.4,
      icon: '📈',
      tip: 'Demand-side stimulus: UBI, public spending, and low interest rates can restart growth.'
    },
    {
      id: 'prevent_deflation',
      label: 'Stop Deflation',
      description: 'Keep CPI above 90 (avoid deflationary spiral)',
      metric: 'cpi',
      operator: 'gt',
      threshold: 90,
      sustainTicks: 52,
      weight: 0.2,
      icon: '🏦',
      tip: 'Deflation is self-reinforcing — people delay spending, worsening the cycle. QE can help.'
    }
  ],

  weimarHyperinflation: [
    {
      id: 'tame_inflation',
      label: 'Tame Hyperinflation',
      description: 'Bring inflation below 5% and hold for 3 years',
      metric: 'inflation',
      operator: 'lt',
      threshold: 5,
      sustainTicks: 52 * 3,
      weight: 0.5,
      icon: '🔥',
      tip: 'Stop money printing immediately. High interest rates are painful but necessary.'
    },
    {
      id: 'restore_trust',
      label: 'Restore Public Trust',
      description: 'Reduce social unrest below 30%',
      metric: 'socialUnrest',
      operator: 'lt',
      threshold: 0.30,
      sustainTicks: 52,
      weight: 0.3,
      icon: '🤝',
      tip: 'People need to believe the currency holds value. Actions speak louder than promises.'
    },
    {
      id: 'employment_stability',
      label: 'Employment Stability',
      description: 'Hold unemployment below 15%',
      metric: 'unemployment',
      operator: 'lt',
      threshold: 0.15,
      sustainTicks: 0,
      weight: 0.2,
      icon: '⚖️',
      tip: 'Stabilizing the currency will disrupt employment — the question is how much.'
    }
  ],

  stagflation1970s: [
    {
      id: 'tame_inflation_s',
      label: 'Control Inflation',
      description: 'Bring inflation below 5%',
      metric: 'inflation',
      operator: 'lt',
      threshold: 5,
      sustainTicks: 52 * 2,
      weight: 0.4,
      icon: '🔥',
      tip: 'High interest rates cure inflation — but cause a recession. Timing matters.'
    },
    {
      id: 'limit_unemployment_s',
      label: 'Limit Unemployment',
      description: 'Keep unemployment below 10%',
      metric: 'unemployment',
      operator: 'lt',
      threshold: 0.10,
      sustainTicks: 0,
      weight: 0.35,
      icon: '👷',
      tip: 'The classic dilemma: fixing inflation worsens unemployment and vice versa.'
    },
    {
      id: 'gdp_positive',
      label: 'Avoid Recession',
      description: 'Keep GDP growth positive',
      metric: 'gdpGrowth',
      operator: 'gt',
      threshold: 0,
      sustainTicks: 52,
      weight: 0.25,
      icon: '📊',
      tip: 'Near impossible to avoid entirely — the question is how deep the recession goes.'
    }
  ],

  crisisOf2008: [
    {
      id: 'prevent_depression',
      label: 'Prevent Depression',
      description: 'Keep unemployment below 12%',
      metric: 'unemployment',
      operator: 'lt',
      threshold: 0.12,
      sustainTicks: 0,
      weight: 0.35,
      icon: '🏦',
      tip: 'Bank bailouts and fiscal stimulus are expensive but prevent cascading failures.'
    },
    {
      id: 'restore_growth_08',
      label: 'Restore Growth',
      description: 'Return GDP to pre-crisis level within 10 years',
      metric: 'gdp',
      operator: 'gt_initial',
      threshold: 0.95,
      sustainTicks: 0,
      weight: 0.35,
      icon: '📈',
      tip: 'Austerity prolongs recessions. Targeted stimulus accelerates recovery.'
    },
    {
      id: 'inequality_check',
      label: 'Prevent Inequality Surge',
      description: 'Keep Gini below 0.55',
      metric: 'gini',
      operator: 'lt',
      threshold: 0.55,
      sustainTicks: 0,
      weight: 0.30,
      icon: '⚖️',
      tip: 'Bailouts that save banks but not homeowners cause lasting inequality damage.'
    }
  ],

  japanLostDecade: [
    {
      id: 'escape_deflation',
      label: 'Escape Deflation',
      description: 'Keep CPI above 95 for 5 years',
      metric: 'cpi',
      operator: 'gt',
      threshold: 95,
      sustainTicks: 52 * 5,
      weight: 0.4,
      icon: '📉',
      tip: 'Zero interest rates alone aren\'t enough. QE, fiscal spending, and structural reform all needed.'
    },
    {
      id: 'growth_japan',
      label: 'Restart Growth',
      description: 'Achieve positive GDP growth for 3 consecutive years',
      metric: 'gdpGrowth',
      operator: 'gt',
      threshold: 0.01,
      sustainTicks: 52 * 3,
      weight: 0.35,
      icon: '🌱',
      tip: 'Japan\'s half-measures dragged the slump out for 20 years. Bold action earlier helps.'
    },
    {
      id: 'low_unemployment_jp',
      label: 'Maintain Employment',
      description: 'Keep unemployment below 6%',
      metric: 'unemployment',
      operator: 'lt',
      threshold: 0.06,
      sustainTicks: 0,
      weight: 0.25,
      icon: '💼',
      tip: 'Japan kept employment through corporate welfare (zombie firms). Productive or not?'
    }
  ],

  nordicMiracle: [
    {
      id: 'equality_nordic',
      label: 'Achieve Equality',
      description: 'Bring Gini below 0.30',
      metric: 'gini',
      operator: 'lt',
      threshold: 0.30,
      sustainTicks: 52 * 3,
      weight: 0.35,
      icon: '⚖️',
      tip: 'Universal services + progressive taxation + strong unions. All three matter.'
    },
    {
      id: 'prosperity_nordic',
      label: 'Maintain Prosperity',
      description: 'Keep unemployment below 6% AND GDP growing',
      metric: 'unemployment',
      operator: 'lt',
      threshold: 0.06,
      sustainTicks: 52 * 2,
      weight: 0.35,
      icon: '🌟',
      tip: 'High taxes don\'t kill growth if trust, education, and institutions are strong.'
    },
    {
      id: 'poverty_nordic',
      label: 'Eliminate Poverty',
      description: 'Bring poverty rate below 10%',
      metric: 'povertyRate',
      operator: 'lt',
      threshold: 0.10,
      sustainTicks: 52,
      weight: 0.30,
      icon: '🏠',
      tip: 'Universal basic services (healthcare, education, housing support) matter more than cash transfers alone.'
    }
  ]
}

export function evaluateObjective(obj, metrics, initialMetrics) {
  const value = metrics[obj.metric]
  if (value === undefined || value === null) return false
  switch (obj.operator) {
    case 'lt':         return value < obj.threshold
    case 'gt':         return value > obj.threshold
    case 'gt_initial': return value > (initialMetrics?.[obj.metric] || 0) * obj.threshold
    default:           return false
  }
}

// Build a progress 0-1 value for display (how close to hitting the threshold)
export function objectiveProgress(obj, metrics, initialMetrics) {
  const value = metrics[obj.metric]
  if (value === undefined || value === null) return 0
  switch (obj.operator) {
    case 'lt':
      return Math.min(1, Math.max(0, 1 - (value / (obj.threshold * 1.5))))
    case 'gt':
      return Math.min(1, Math.max(0, value / (obj.threshold * 1.2)))
    case 'gt_initial': {
      const target = (initialMetrics?.[obj.metric] || 1) * obj.threshold
      return Math.min(1, Math.max(0, value / (target * 1.2)))
    }
    default: return 0
  }
}
