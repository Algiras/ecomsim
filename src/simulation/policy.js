import { DEFAULT_POLICIES } from '../utils/constants.js'
import { clamp } from '../utils/math.js'

export function createPolicyState(overrides = {}) {
  return { ...DEFAULT_POLICIES, ...overrides }
}

// Apply policy effects to simulation state each tick
export function applyPolicyEffects(state, policies, market) {
  const { agents, businesses } = state

  // Minimum wage enforcement
  if (policies.minWage > 0) {
    for (const b of businesses.filter(b => b.alive)) {
      if (b.wageOffered < policies.minWage) {
        b.wageOffered = policies.minWage
        // Small business may struggle to afford this
        if (b.capital < policies.minWage * b.employees.length * 20) {
          // Risk of layoffs — handled naturally in business.tick
        }
      }
    }
  }

  // Anti-monopoly: break up businesses with > 50% market share
  if (policies.antiMonopoly) {
    for (const b of businesses.filter(b => b.alive && b.dominance > 0.5)) {
      b.maxEmployees = Math.max(5, Math.floor(b.maxEmployees * 0.9))
    }
  }

  // Interest rate effects on business borrowing & investment
  if (policies.interestRate > 0.1) {
    // High rates suppress business formation
    for (const b of businesses.filter(b => b.alive)) {
      b.capital -= b.capital * policies.interestRate * 0.001
    }
  }

  // Print money: inject wealth into economy (inflation side-effect in market.js)
  if (policies.printMoney > 0) {
    const injection = policies.printMoney
    const recipients = agents.filter(a => a.alive && a.state !== 'dead')
    for (const a of recipients) {
      a.wealth += injection * 0.01
    }
  }

  // Education: slowly improves agent skills over time
  if (policies.educationFunding > 0.3) {
    const youngAgents = agents.filter(a => a.alive && a.age < 30 * 52 && a.state !== 'dead')
    for (const a of youngAgents) {
      if (Math.random() < policies.educationFunding * 0.0001) {
        a.skill = clamp(a.skill + 0.001, 0, 1)
        a.education = clamp(a.education + 0.001, 0, 1)
      }
    }
  }

  // Public healthcare: improves health, reduces death rate
  if (policies.publicHealthcare) {
    if (Math.random() < 0.001) {
      const sickest = agents.filter(a => a.alive && a.health < 0.5)
      for (const a of sickest.slice(0, 5)) {
        a.health = clamp(a.health + 0.01, 0, 1)
      }
    }
  }

  // UBI and unemployment benefit already handled in agent._earnIncome
}

export function validatePolicy(key, value) {
  const bounds = {
    incomeTax: [0, 0.6],
    corporateTax: [0, 0.5],
    minWage: [0, 50],
    ubi: [0, 1000],
    interestRate: [0, 0.2],
    educationFunding: [0, 1],
    unemploymentBenefit: [0, 500],
    printMoney: [0, 100],
    wealthTax: [0, 0.05]
  }

  if (key in bounds) {
    const [min, max] = bounds[key]
    return clamp(Number(value), min, max)
  }
  return value // boolean policies pass through
}
