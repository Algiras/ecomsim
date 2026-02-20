import { clamp } from '../utils/math.js'

// Wealth-based color gradient: poverty red → middle blue → rich gold
export const WEALTH_COLORS = [
  { threshold: 0, color: [220, 38, 38] },      // deep red (poverty)
  { threshold: 100, color: [234, 88, 12] },     // orange
  { threshold: 300, color: [100, 116, 139] },   // slate (lower middle)
  { threshold: 800, color: [59, 130, 246] },    // blue (middle class)
  { threshold: 2000, color: [6, 182, 212] },    // cyan (upper middle)
  { threshold: 5000, color: [234, 179, 8] },    // yellow-gold (wealthy)
  { threshold: 10000, color: [251, 191, 36] },  // bright gold (very wealthy)
]

export function wealthColor(wealth) {
  const w = Math.max(0, wealth)
  let lower = WEALTH_COLORS[0]
  let upper = WEALTH_COLORS[WEALTH_COLORS.length - 1]

  for (let i = 0; i < WEALTH_COLORS.length - 1; i++) {
    if (w >= WEALTH_COLORS[i].threshold && w < WEALTH_COLORS[i + 1].threshold) {
      lower = WEALTH_COLORS[i]
      upper = WEALTH_COLORS[i + 1]
      break
    }
  }

  const range = upper.threshold - lower.threshold
  const t = range > 0 ? (w - lower.threshold) / range : 1

  const r = Math.round(lower.color[0] + (upper.color[0] - lower.color[0]) * t)
  const g = Math.round(lower.color[1] + (upper.color[1] - lower.color[1]) * t)
  const b = Math.round(lower.color[2] + (upper.color[2] - lower.color[2]) * t)

  return `rgb(${r},${g},${b})`
}

export function wealthColorRgba(wealth, alpha = 1) {
  const w = Math.max(0, wealth)
  let lower = WEALTH_COLORS[0]
  let upper = WEALTH_COLORS[WEALTH_COLORS.length - 1]

  for (let i = 0; i < WEALTH_COLORS.length - 1; i++) {
    if (w >= WEALTH_COLORS[i].threshold && w < WEALTH_COLORS[i + 1].threshold) {
      lower = WEALTH_COLORS[i]
      upper = WEALTH_COLORS[i + 1]
      break
    }
  }

  const range = upper.threshold - lower.threshold
  const t = range > 0 ? (w - lower.threshold) / range : 1

  const r = Math.round(lower.color[0] + (upper.color[0] - lower.color[0]) * t)
  const g = Math.round(lower.color[1] + (upper.color[1] - lower.color[1]) * t)
  const b = Math.round(lower.color[2] + (upper.color[2] - lower.color[2]) * t)

  return `rgba(${r},${g},${b},${alpha})`
}

// Sector colors
export const SECTOR_COLORS = {
  food: '#22c55e',
  housing: '#f59e0b',
  tech: '#6366f1',
  luxury: '#ec4899'
}

export const SECTOR_COLORS_DARK = {
  food: '#166534',
  housing: '#92400e',
  tech: '#3730a3',
  luxury: '#9d174d'
}

// State-based colors
export const STATE_COLORS = {
  working: '#22c55e',
  unemployed: '#ef4444',
  child: '#94a3b8',
  retired: '#64748b',
  owner: '#f59e0b',
  dead: 'rgba(0,0,0,0)'
}

// Happiness-based fill for agent glow
export function happinessGlow(happiness) {
  if (happiness > 0.7) return 'rgba(251, 191, 36, 0.3)'   // golden glow
  if (happiness > 0.4) return 'rgba(99, 102, 241, 0.2)'   // neutral blue
  return 'rgba(239, 68, 68, 0.3)'                          // red distress
}

// Social unrest overlay color
export function unrestColor(unrest) {
  const alpha = clamp(unrest * 0.8, 0, 0.8)
  return `rgba(239, 68, 68, ${alpha})`
}
