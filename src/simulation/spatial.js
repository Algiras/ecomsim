import { SPATIAL_CELL_SIZE } from '../utils/constants.js'

// Spatial hash grid for O(1) average neighbor lookups
export class SpatialHash {
  constructor(cellSize = SPATIAL_CELL_SIZE) {
    this.cellSize = cellSize
    this.cells = new Map()
  }

  _key(x, y) {
    const cx = Math.floor(x / this.cellSize)
    const cy = Math.floor(y / this.cellSize)
    return `${cx},${cy}`
  }

  clear() {
    this.cells.clear()
  }

  insert(entity) {
    const key = this._key(entity.x, entity.y)
    if (!this.cells.has(key)) this.cells.set(key, [])
    this.cells.get(key).push(entity)
  }

  buildFromAgents(agents) {
    this.clear()
    for (const a of agents) {
      if (a.alive) this.insert(a)
    }
  }

  query(x, y, radius) {
    const results = []
    const minCX = Math.floor((x - radius) / this.cellSize)
    const maxCX = Math.floor((x + radius) / this.cellSize)
    const minCY = Math.floor((y - radius) / this.cellSize)
    const maxCY = Math.floor((y + radius) / this.cellSize)

    const r2 = radius * radius

    for (let cx = minCX; cx <= maxCX; cx++) {
      for (let cy = minCY; cy <= maxCY; cy++) {
        const key = `${cx},${cy}`
        const cell = this.cells.get(key)
        if (!cell) continue
        for (const entity of cell) {
          const dx = entity.x - x
          const dy = entity.y - y
          if (dx * dx + dy * dy <= r2) {
            results.push(entity)
          }
        }
      }
    }
    return results
  }

  nearest(x, y, maxDist = Infinity) {
    const candidates = this.query(x, y, Math.min(maxDist, this.cellSize * 3))
    let best = null
    let bestDist = maxDist
    for (const e of candidates) {
      const dx = e.x - x
      const dy = e.y - y
      const d = Math.sqrt(dx * dx + dy * dy)
      if (d < bestDist) {
        bestDist = d
        best = e
      }
    }
    return best
  }
}
