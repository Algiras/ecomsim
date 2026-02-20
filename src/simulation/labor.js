import { WAGE_NEGOTIATION_POWER } from '../utils/constants.js'
import { clamp } from '../utils/math.js'

// Run job matching cycle — connects unemployed agents with hiring businesses
export function runLaborMarket(state, policies) {
  const { agents, businesses } = state

  const unemployed = agents.filter(a =>
    a.alive && a.state === 'unemployed' && a.age > 18 * 52
  )

  const hiringBiz = businesses.filter(b =>
    b.alive && b.employees.length < b.maxEmployees && b.capital > b.wageOffered * 10
  )

  if (unemployed.length === 0 || hiringBiz.length === 0) return

  // Simple matching: each hiring business picks best available candidate
  for (const biz of hiringBiz) {
    if (unemployed.length === 0) break

    // Find best match: skill + location proximity
    let bestIdx = 0
    let bestScore = -Infinity
    for (let i = 0; i < unemployed.length; i++) {
      const agent = unemployed[i]
      const dx = agent.x - biz.x
      const dy = agent.y - biz.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      const score = agent.skill * 0.7 + agent.education * 0.3 - dist * 0.001
      if (score > bestScore) {
        bestScore = score
        bestIdx = i
      }
    }

    const candidate = unemployed[bestIdx]
    const wage = negotiateWage(biz, candidate, policies)

    // Hire if they can afford it
    if (biz.capital > wage * 5) {
      candidate.hire(biz, wage)
      biz.employees.push(candidate.id)
      biz.hiringCooldown = 10
      unemployed.splice(bestIdx, 1)
    }
  }
}

export function negotiateWage(business, agent, policies) {
  const minWage = policies.minWage || 0
  const baseWage = business.wageOffered

  // Skill premium
  const skillPremium = agent.skill * 10 + agent.education * 5

  // Negotiation power shifts wage
  const negotiated = baseWage * (1 - WAGE_NEGOTIATION_POWER) + skillPremium * WAGE_NEGOTIATION_POWER

  return Math.max(negotiated, minWage)
}

export function computeAverageWage(agents) {
  const employed = agents.filter(a => a.alive && a.employed && a.wage > 0)
  if (employed.length === 0) return 0
  return employed.reduce((sum, a) => sum + a.wage, 0) / employed.length
}

export function computeWageDistribution(agents) {
  const employed = agents.filter(a => a.alive && a.employed && a.wage > 0)
  return employed.map(a => a.wage)
}
