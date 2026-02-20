export const SCENARIOS = {
  // ─── Sandbox scenarios ───────────────────────────────────────────────────

  freeMarket: {
    id: 'freeMarket',
    name: 'Free Market Utopia',
    subtitle: 'No rules. Pure capitalism.',
    description: 'Zero regulation. No minimum wage, no taxes, no safety net. Watch monopolies form naturally and see who wins — and who gets left behind.',
    icon: '🦅',
    difficulty: 'Observe',
    color: '#3b82f6',
    isHistorical: false,
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
    isHistorical: false,
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
    isHistorical: false,
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
    scheduledEvents: [{ type: 'techBreakthrough', atTick: 200 }],
    lesson: 'Automation creates wealth but destroys jobs. UBI or retraining — which policy saves more people?'
  },

  // ─── Historical crisis challenges ─────────────────────────────────────────

  greatDepression: {
    id: 'greatDepression',
    name: 'The Great Depression',
    subtitle: 'October 1929. The markets have collapsed.',
    description: 'GDP has fallen 30%. Unemployment is climbing toward 25%. Banks are failing daily. Hoover says "be patient." Do you agree?',
    icon: '📉',
    difficulty: 'Very Hard',
    color: '#78716c',
    isHistorical: true,
    era: '1929–1939 · United States',
    durationYears: 15,
    policies: {
      incomeTax: 0.02,
      corporateTax: 0.12,
      minWage: 0,
      ubi: 0,
      interestRate: 0.06,
      antiMonopoly: false,
      educationFunding: 0.1,
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
    businessCount: 12,
    wealthMultiplier: 0.35,
    wealthInequality: 2.0,
    avgSkill: 0.4,
    scheduledEvents: [
      { type: 'recession', atTick: 1 },
      { type: 'financialBubble', atTick: 80 }
    ],
    lesson: 'Austerity deepened the Depression. FDR\'s New Deal proved government spending could restart demand.'
  },

  weimarHyperinflation: {
    id: 'weimarHyperinflation',
    name: 'Weimar Hyperinflation',
    subtitle: 'A loaf of bread costs a wheelbarrow of cash.',
    description: 'Post-WWI Germany is printing money to pay reparations. Inflation is doubling daily. The middle class is being wiped out. Can you stabilize the currency before society collapses?',
    icon: '💹',
    difficulty: 'Expert',
    color: '#dc2626',
    isHistorical: true,
    era: '1921–1924 · Germany',
    durationYears: 10,
    policies: {
      incomeTax: 0.15,
      corporateTax: 0.10,
      minWage: 0,
      ubi: 0,
      interestRate: 0.01,
      antiMonopoly: false,
      educationFunding: 0.2,
      unemploymentBenefit: 0,
      priceControlFood: true,
      priceControlHousing: false,
      printMoney: 40,
      publicHealthcare: false,
      wealthTax: 0,
      openBorders: false,
      subsidiesFarming: false
    },
    agentCount: 180,
    businessCount: 15,
    wealthMultiplier: 0.5,
    wealthInequality: 1.8,
    avgSkill: 0.45,
    scheduledEvents: [],
    lesson: 'Stopping hyperinflation requires cold turkey: halt money printing, issue new credible currency, accept short-term pain.'
  },

  stagflation1970s: {
    id: 'stagflation1970s',
    name: '1970s Stagflation',
    subtitle: 'Inflation up. Unemployment up. Nothing works.',
    description: 'OPEC\'s oil embargo just hit. Prices are surging but the economy is stagnating. Your standard policy tools are pointing in opposite directions. What do you do?',
    icon: '⛽',
    difficulty: 'Hard',
    color: '#d97706',
    isHistorical: true,
    era: '1973–1982 · United States',
    durationYears: 12,
    policies: {
      incomeTax: 0.30,
      corporateTax: 0.48,
      minWage: 8,
      ubi: 0,
      interestRate: 0.06,
      antiMonopoly: false,
      educationFunding: 0.4,
      unemploymentBenefit: 100,
      priceControlFood: false,
      priceControlHousing: false,
      printMoney: 8,
      publicHealthcare: false,
      wealthTax: 0,
      openBorders: false,
      subsidiesFarming: false
    },
    agentCount: 200,
    businessCount: 18,
    wealthMultiplier: 0.85,
    wealthInequality: 1.1,
    avgSkill: 0.5,
    scheduledEvents: [
      { type: 'cropFailure', atTick: 20 },
      { type: 'recession', atTick: 150 }
    ],
    lesson: 'Stagflation broke Keynesian consensus. Volcker\'s painful rate hikes eventually worked — but cost millions their jobs.'
  },

  crisisOf2008: {
    id: 'crisisOf2008',
    name: '2008 Financial Crisis',
    subtitle: 'Lehman just failed. The banks are frozen.',
    description: 'The US housing bubble has burst. Banks are insolvent. Credit is frozen. The global economy is in freefall. Bail out the banks, let them fail, or something else?',
    icon: '🏦',
    difficulty: 'Hard',
    color: '#7c3aed',
    isHistorical: true,
    era: '2008–2015 · Global',
    durationYears: 10,
    policies: {
      incomeTax: 0.28,
      corporateTax: 0.35,
      minWage: 10,
      ubi: 0,
      interestRate: 0.05,
      antiMonopoly: false,
      educationFunding: 0.4,
      unemploymentBenefit: 100,
      priceControlFood: false,
      priceControlHousing: false,
      printMoney: 0,
      publicHealthcare: false,
      wealthTax: 0,
      openBorders: false,
      subsidiesFarming: false
    },
    agentCount: 200,
    businessCount: 16,
    wealthMultiplier: 0.7,
    wealthInequality: 1.6,
    avgSkill: 0.5,
    scheduledEvents: [
      { type: 'financialBubble', atTick: 1 },
      { type: 'recession', atTick: 30 }
    ],
    lesson: 'Bailouts prevented a depression but rewarded recklessness. The political consequences lasted a decade.'
  },

  japanLostDecade: {
    id: 'japanLostDecade',
    name: 'Japan\'s Lost Decade',
    subtitle: 'Zero rates. Zero growth. Zero inflation.',
    description: 'Japan\'s asset bubble burst in 1991. Interest rates are near zero. Stimulus packages come and go. Nothing works. Can you escape the deflationary trap that trapped Japan for 20 years?',
    icon: '🗾',
    difficulty: 'Expert',
    color: '#0891b2',
    isHistorical: true,
    era: '1991–2010 · Japan',
    durationYears: 15,
    policies: {
      incomeTax: 0.33,
      corporateTax: 0.38,
      minWage: 6,
      ubi: 0,
      interestRate: 0.005,
      antiMonopoly: false,
      educationFunding: 0.6,
      unemploymentBenefit: 80,
      priceControlFood: false,
      priceControlHousing: false,
      printMoney: 2,
      publicHealthcare: true,
      wealthTax: 0,
      openBorders: false,
      subsidiesFarming: false
    },
    agentCount: 200,
    businessCount: 20,
    wealthMultiplier: 0.9,
    wealthInequality: 0.9,
    avgSkill: 0.65,
    scheduledEvents: [
      { type: 'financialBubble', atTick: 1 },
      { type: 'recession', atTick: 10 }
    ],
    lesson: 'Half-measures and zombie banks prolonged Japan\'s stagnation for 20 years. Swift, decisive action matters.'
  },

  nordicMiracle: {
    id: 'nordicMiracle',
    name: 'Build the Nordic Model',
    subtitle: 'High taxes. High trust. High happiness.',
    description: 'You\'re building a new nation. Can you achieve the Nordic balance: low inequality, high productivity, strong safety net, and sustained growth? This is what success looks like.',
    icon: '🌍',
    difficulty: 'Blueprint',
    color: '#059669',
    isHistorical: true,
    era: 'Reference Model · Scandinavia',
    durationYears: 20,
    policies: {
      incomeTax: 0.45,
      corporateTax: 0.25,
      minWage: 18,
      ubi: 0,
      interestRate: 0.03,
      antiMonopoly: true,
      educationFunding: 0.9,
      unemploymentBenefit: 200,
      priceControlFood: false,
      priceControlHousing: false,
      printMoney: 0,
      publicHealthcare: true,
      wealthTax: 0.01,
      openBorders: false,
      subsidiesFarming: true
    },
    agentCount: 200,
    businessCount: 22,
    wealthMultiplier: 1.0,
    wealthInequality: 0.7,
    avgSkill: 0.6,
    avgEducation: 0.65,
    scheduledEvents: [],
    lesson: 'The Nordic model requires high institutional trust, universal services, AND open competitive markets. All three.'
  }
}

// ─── Story Mode chapters injected as scenarios ───────────────────────────────
import { STORY_CHAPTERS } from './storyMode.js'

for (const ch of STORY_CHAPTERS) {
  SCENARIOS[ch.id] = {
    id: ch.id,
    name: ch.title,
    subtitle: ch.era,
    description: ch.tagline,
    icon: ch.icon,
    difficulty: `Chapter ${ch.number}`,
    color: ch.color,
    isHistorical: false,
    isStory: true,
    storyChapterNumber: ch.number,
    durationYears: ch.durationYears,
    era: ch.era,
    lesson: ch.tagline,
    scheduledEvents: ch.scheduledEvents || [],
    ...ch.scenarioConfig,
    policies: ch.scenarioConfig.policies
  }
}

export function getScenario(id) {
  return SCENARIOS[id] || SCENARIOS.freeMarket
}

export const SCENARIO_LIST = Object.values(SCENARIOS)
export const SANDBOX_SCENARIOS = SCENARIO_LIST.filter(s => !s.isHistorical && !s.isStory)
export const HISTORICAL_SCENARIOS = SCENARIO_LIST.filter(s => s.isHistorical)
export const STORY_SCENARIOS = SCENARIO_LIST.filter(s => s.isStory)
