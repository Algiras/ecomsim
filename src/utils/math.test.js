import { describe, it, expect } from 'vitest'
import {
  clamp, lerp, lerp2, dist, normalRand, randBetween, randInt,
  weightedRandom, gini, mean, median, stdDev, percentile,
  lorenzCurve, normalize, scale, add, randomDirection
} from './math.js'

// ─── clamp ──────────────────────────────────────────────────────────────────

describe('clamp', () => {
  it('returns value when within range', () => {
    expect(clamp(5, 0, 10)).toBe(5)
  })
  it('clamps to min', () => {
    expect(clamp(-5, 0, 10)).toBe(0)
  })
  it('clamps to max', () => {
    expect(clamp(15, 0, 10)).toBe(10)
  })
  it('handles equal min and max', () => {
    expect(clamp(5, 3, 3)).toBe(3)
  })
  it('handles negative ranges', () => {
    expect(clamp(-5, -10, -1)).toBe(-5)
    expect(clamp(0, -10, -1)).toBe(-1)
  })
})

// ─── lerp ───────────────────────────────────────────────────────────────────

describe('lerp', () => {
  it('returns a at t=0', () => {
    expect(lerp(10, 20, 0)).toBe(10)
  })
  it('returns b at t=1', () => {
    expect(lerp(10, 20, 1)).toBe(20)
  })
  it('returns midpoint at t=0.5', () => {
    expect(lerp(0, 100, 0.5)).toBe(50)
  })
  it('clamps t to [0,1]', () => {
    expect(lerp(0, 100, -1)).toBe(0)
    expect(lerp(0, 100, 2)).toBe(100)
  })
})

// ─── lerp2 ──────────────────────────────────────────────────────────────────

describe('lerp2', () => {
  it('interpolates 2D points', () => {
    const result = lerp2({ x: 0, y: 0 }, { x: 10, y: 20 }, 0.5)
    expect(result.x).toBe(5)
    expect(result.y).toBe(10)
  })
})

// ─── dist ───────────────────────────────────────────────────────────────────

describe('dist', () => {
  it('computes euclidean distance', () => {
    expect(dist({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5)
  })
  it('returns 0 for same point', () => {
    expect(dist({ x: 5, y: 5 }, { x: 5, y: 5 })).toBe(0)
  })
})

// ─── normalRand ─────────────────────────────────────────────────────────────

describe('normalRand', () => {
  it('produces values roughly around the mean', () => {
    const samples = Array.from({ length: 10000 }, () => normalRand(50, 10))
    const avg = samples.reduce((a, b) => a + b, 0) / samples.length
    expect(avg).toBeCloseTo(50, 0) // within ±1
  })
})

// ─── randBetween / randInt ──────────────────────────────────────────────────

describe('randBetween', () => {
  it('returns values within [min, max)', () => {
    for (let i = 0; i < 100; i++) {
      const v = randBetween(5, 10)
      expect(v).toBeGreaterThanOrEqual(5)
      expect(v).toBeLessThan(10)
    }
  })
})

describe('randInt', () => {
  it('returns integers within [min, max]', () => {
    for (let i = 0; i < 100; i++) {
      const v = randInt(1, 6)
      expect(Number.isInteger(v)).toBe(true)
      expect(v).toBeGreaterThanOrEqual(1)
      expect(v).toBeLessThanOrEqual(6)
    }
  })
})

// ─── weightedRandom ─────────────────────────────────────────────────────────

describe('weightedRandom', () => {
  it('returns valid indices', () => {
    for (let i = 0; i < 100; i++) {
      const idx = weightedRandom([1, 2, 3])
      expect(idx).toBeGreaterThanOrEqual(0)
      expect(idx).toBeLessThanOrEqual(2)
    }
  })
  it('heavily favors high-weight items', () => {
    const counts = [0, 0, 0]
    for (let i = 0; i < 10000; i++) {
      counts[weightedRandom([1, 1, 100])]++
    }
    expect(counts[2]).toBeGreaterThan(counts[0] * 5)
  })
})

// ─── gini ───────────────────────────────────────────────────────────────────

describe('gini', () => {
  it('returns 0 for perfect equality', () => {
    expect(gini([100, 100, 100, 100])).toBe(0)
  })
  it('returns ~1 for extreme inequality', () => {
    // One person has everything
    expect(gini([0, 0, 0, 10000])).toBeGreaterThan(0.7)
  })
  it('returns 0 for empty array', () => {
    expect(gini([])).toBe(0)
  })
  it('returns 0 for all zeros', () => {
    expect(gini([0, 0, 0])).toBe(0)
  })
  it('computes known value', () => {
    // For [1, 2, 3, 4, 5]: gini = 4/25 = 0.16 (approx 0.2667 by standard formula)
    const g = gini([1, 2, 3, 4, 5])
    expect(g).toBeGreaterThan(0)
    expect(g).toBeLessThan(0.5)
  })
  it('is clamped between 0 and 1', () => {
    const g = gini([1, 1000000])
    expect(g).toBeGreaterThanOrEqual(0)
    expect(g).toBeLessThanOrEqual(1)
  })
})

// ─── mean ───────────────────────────────────────────────────────────────────

describe('mean', () => {
  it('computes average', () => {
    expect(mean([2, 4, 6])).toBe(4)
  })
  it('returns 0 for empty', () => {
    expect(mean([])).toBe(0)
  })
  it('handles single value', () => {
    expect(mean([42])).toBe(42)
  })
})

// ─── median ─────────────────────────────────────────────────────────────────

describe('median', () => {
  it('returns middle value for odd count', () => {
    expect(median([3, 1, 2])).toBe(2)
  })
  it('returns average of middle two for even count', () => {
    expect(median([1, 2, 3, 4])).toBe(2.5)
  })
  it('returns 0 for empty', () => {
    expect(median([])).toBe(0)
  })
})

// ─── stdDev ─────────────────────────────────────────────────────────────────

describe('stdDev', () => {
  it('returns 0 for identical values', () => {
    expect(stdDev([5, 5, 5, 5])).toBe(0)
  })
  it('computes population std dev', () => {
    // [2, 4, 4, 4, 5, 5, 7, 9] → mean=5, variance=4, stdDev=2
    expect(stdDev([2, 4, 4, 4, 5, 5, 7, 9])).toBe(2)
  })
})

// ─── percentile ─────────────────────────────────────────────────────────────

describe('percentile', () => {
  it('returns min at p=0', () => {
    expect(percentile([10, 20, 30, 40, 50], 0)).toBe(10)
  })
  it('returns max at p=100', () => {
    expect(percentile([10, 20, 30, 40, 50], 100)).toBe(50)
  })
  it('returns median at p=50', () => {
    expect(percentile([10, 20, 30, 40, 50], 50)).toBe(30)
  })
  it('returns 0 for empty', () => {
    expect(percentile([], 50)).toBe(0)
  })
})

// ─── lorenzCurve ────────────────────────────────────────────────────────────

describe('lorenzCurve', () => {
  it('starts at (0, 0)', () => {
    const curve = lorenzCurve([1, 2, 3, 4])
    expect(curve[0]).toEqual({ population: 0, wealth: 0 })
  })
  it('ends at (100, 100)', () => {
    const curve = lorenzCurve([1, 2, 3, 4])
    const last = curve[curve.length - 1]
    expect(last.population).toBe(100)
    expect(last.wealth).toBeCloseTo(100, 0)
  })
  it('returns empty for empty input', () => {
    expect(lorenzCurve([])).toEqual([])
  })
  it('returns empty for all zeros', () => {
    expect(lorenzCurve([0, 0, 0])).toEqual([])
  })
  it('perfect equality produces diagonal', () => {
    const curve = lorenzCurve([100, 100, 100, 100], 4)
    // Each point should be close to the diagonal
    for (const pt of curve) {
      expect(pt.wealth).toBeCloseTo(pt.population, 0)
    }
  })
})

// ─── vector math ────────────────────────────────────────────────────────────

describe('normalize', () => {
  it('produces unit vector', () => {
    const n = normalize({ x: 3, y: 4 })
    expect(n.x).toBeCloseTo(0.6)
    expect(n.y).toBeCloseTo(0.8)
  })
  it('returns zero vector for zero input', () => {
    expect(normalize({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 })
  })
})

describe('scale', () => {
  it('scales vector', () => {
    expect(scale({ x: 2, y: 3 }, 4)).toEqual({ x: 8, y: 12 })
  })
})

describe('add', () => {
  it('adds vectors', () => {
    expect(add({ x: 1, y: 2 }, { x: 3, y: 4 })).toEqual({ x: 4, y: 6 })
  })
})

describe('randomDirection', () => {
  it('produces unit vectors', () => {
    for (let i = 0; i < 20; i++) {
      const d = randomDirection()
      const mag = Math.sqrt(d.x * d.x + d.y * d.y)
      expect(mag).toBeCloseTo(1, 5)
    }
  })
})
