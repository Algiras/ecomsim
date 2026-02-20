// ─── Core math utilities ─────────────────────────────────────────────────────

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

export function lerp(a, b, t) {
  return a + (b - a) * clamp(t, 0, 1)
}

export function lerp2(a, b, t) {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) }
}

export function dist(a, b) {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.sqrt(dx * dx + dy * dy)
}

export function normalRand(mean = 0, std = 1) {
  // Box-Muller transform
  let u = 0, v = 0
  while (u === 0) u = Math.random()
  while (v === 0) v = Math.random()
  return mean + std * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
}

export function randBetween(min, max) {
  return Math.random() * (max - min) + min
}

export function randInt(min, max) {
  return Math.floor(randBetween(min, max + 1))
}

export function weightedRandom(weights) {
  const total = weights.reduce((a, b) => a + b, 0)
  let r = Math.random() * total
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i]
    if (r <= 0) return i
  }
  return weights.length - 1
}

// ─── Economic metrics ────────────────────────────────────────────────────────

export function gini(values) {
  if (!values || values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const n = sorted.length
  const sum = sorted.reduce((a, b) => a + b, 0)
  if (sum === 0) return 0
  let giniSum = 0
  for (let i = 0; i < n; i++) {
    giniSum += (2 * (i + 1) - n - 1) * sorted[i]
  }
  return clamp(giniSum / (n * sum), 0, 1)
}

export function mean(values) {
  if (!values || values.length === 0) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}

export function median(values) {
  if (!values || values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2
}

export function stdDev(values) {
  const m = mean(values)
  const variance = mean(values.map(v => (v - m) ** 2))
  return Math.sqrt(variance)
}

export function percentile(values, p) {
  if (!values || values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const idx = Math.floor((p / 100) * (sorted.length - 1))
  return sorted[idx]
}

// Lorenz curve points (for wealth histogram)
export function lorenzCurve(values, points = 20) {
  if (!values || values.length === 0) return []
  const sorted = [...values].sort((a, b) => a - b)
  const total = sorted.reduce((a, b) => a + b, 0)
  if (total === 0) return []
  const result = [{ population: 0, wealth: 0 }]
  for (let i = 1; i <= points; i++) {
    const idx = Math.floor((i / points) * sorted.length)
    const wealthSlice = sorted.slice(0, idx).reduce((a, b) => a + b, 0)
    result.push({
      population: (i / points) * 100,
      wealth: (wealthSlice / total) * 100
    })
  }
  return result
}

// ─── Vector math ─────────────────────────────────────────────────────────────

export function normalize(v) {
  const mag = Math.sqrt(v.x * v.x + v.y * v.y)
  if (mag === 0) return { x: 0, y: 0 }
  return { x: v.x / mag, y: v.y / mag }
}

export function scale(v, s) {
  return { x: v.x * s, y: v.y * s }
}

export function add(a, b) {
  return { x: a.x + b.x, y: a.y + b.y }
}

export function randomDirection() {
  const angle = Math.random() * Math.PI * 2
  return { x: Math.cos(angle), y: Math.sin(angle) }
}
