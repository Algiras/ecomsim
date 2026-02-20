export const SCENARIOS = {
  freeMarket: {
    id: 'freeMarket',
    name: 'Free Market Utopia',
    subtitle: 'No rules. Pure capitalism.',
    description: 'Zero regulation. No minimum wage, no taxes, no safety net. Watch monopolies form naturally and see who wins — and who gets left behind.',
    icon: '🦅',
    difficulty: 'Observe',
    color: '#3b82f6',
    policies: {
      incomeTax: 0,
      corporateTax: 0,
      minWage: 0,
      ubi: 0,
      interestRate: 0.02,
      antiMonopoly: false,
      educationFunding: 0,
      unemploymentBenefit: 0,
      priceControlFood: false,
      priceControlHousing: false,
      printMoney: 0,
      publicHealthcare: false,
      wealthTax: 0,
      openBorders: false,
      subsidiesFarming: false
    },
    agentCount: 200,
    businessCount: 20,
    wealthMultiplier: 1.2,
    wealthInequality: 1.5,
    avgSkill: 0.5,
    lesson: 'Natural monopolies emerge quickly. The rich get richer. But GDP grows fast at first.'
  },

  debtSpiral: {
    id: 'debtSpiral',
    name: 'The Debt Spiral',
    subtitle: 'Borrowed too much. Now what?',
    description: 'The government spent heavily on social programs. Debt is high, deficit is growing. Austerity or default — pick your poison.',
    icon: '💸',
    difficulty: 'Hard',
    color: '#ef4444',
    policies: {
      incomeTax: 0.45,
      corporateTax: 0.35,
      minWage: 15,
      ubi: 200,
      interestRate: 0.12,
      antiMonopoly: true,
      educationFunding: 0.8,
      unemploymentBenefit: 150,
      priceControlFood: false,
      priceControlHousing: false,
      printMoney: 5,
      publicHealthcare: true,
      wealthTax: 0.02,
      openBorders: false,
      subsidiesFarming: false
    },
    agentCount: 200,
    businessCount: 18,
    wealthMultiplier: 0.8,
    wealthInequality: 0.8,
    avgSkill: 0.55,
    startGovDebt: 5000,
    lesson: 'Cutting programs causes pain now. Keeping them causes pain later. The political economy of austerity.'
  },

  techDisruption: {
    id: 'techDisruption',
    name: 'Tech Disruption',
    subtitle: 'Automation is coming for jobs.',
    description: 'A stable, balanced economy. Then a tech breakthrough hits — half the jobs can be automated. Will you adapt or collapse?',
    icon: '🤖',
    difficulty: 'Medium',
    color: '#8b5cf6',
    policies: {
      incomeTax: 0.28,
      corporateTax: 0.21,
      minWage: 12,
      ubi: 0,
      interestRate: 0.05,
      antiMonopoly: false,
      educationFunding: 0.5,
      unemploymentBenefit: 80,
      priceControlFood: false,
      priceControlHousing: false,
      printMoney: 0,
      publicHealthcare: false,
      wealthTax: 0,
      openBorders: false,
      subsidiesFarming: false
    },
    agentCount: 200,
    businessCount: 20,
    wealthMultiplier: 1.0,
    wealthInequality: 1.0,
    avgSkill: 0.5,
    scheduledEvent: { type: 'techBreakthrough', atTick: 200 },
    lesson: 'Automation creates wealth but destroys jobs. UBI or retraining — which policy saves more people?'
  }
}

export function getScenario(id) {
  return SCENARIOS[id] || SCENARIOS.freeMarket
}

export const SCENARIO_LIST = Object.values(SCENARIOS)
