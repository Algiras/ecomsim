// Story Mode — a 5-chapter economic history campaign
// Each chapter has a scripted narrative, objectives, events, and carries meaning forward.

export const STORY_CHAPTERS = [
  {
    id: 'story_ch1',
    number: 1,
    title: 'The Industrial Revolution',
    era: '1850 – 1880',
    tagline: 'Harness the power of industry — without breaking the people who build it.',
    icon: '🏭',
    color: '#f59e0b',
    durationYears: 30,

    openingNarrative: `The year is 1850. Steam engines thunder. Factories rise where fields once stretched.

Your small nation stands at the threshold of the industrial age. Entrepreneurs are building mills and mines. Workers are flooding in from the countryside — hungry, desperate, and ready to work for almost nothing.

You control the levers of power. How you shape this transformation will echo for generations.

Industrialise too fast and brutal inequality will tear your society apart. Go too slow and you'll fall behind competing nations. History rarely rewards caution — but it punishes cruelty.

What kind of industrial nation will you build?`,

    kokoroNarration: `The year is 1850. Steam engines thunder. Factories rise where fields once stretched. Your nation stands at the threshold of the industrial age. Workers are flooding in from the countryside — hungry, desperate, and ready to work for almost nothing. How you shape this transformation will echo for generations.`,

    closingNarrative: {
      excellent: `Your industrial revolution was a model of managed progress. Workers were protected. Productivity soared. You proved that growth and dignity are not opposites. History will remember this era as a turning point for human welfare.`,
      good: `Your industrial revolution delivered real growth — but left scars. Inequality rose faster than wages. Some workers lived better; many did not. The foundations you built are strong, but the cracks will show in time.`,
      poor: `The factories ran. The profits flowed — to the few. Workers labored in brutal conditions, children among them. You fed the machine of progress with human suffering. The resentment has only begun to fester.`
    },

    scenarioConfig: {
      agentCount: 150,
      businessCount: 12,
      wealthMultiplier: 0.8,
      wealthInequality: 1.2,
      avgSkill: 0.35,
      policies: {
        incomeTax: 0.05,
        corporateTax: 0.05,
        minWage: 0,
        ubi: 0,
        interestRate: 0.08,
        antiMonopoly: false,
        educationFunding: 0.1,
        unemploymentBenefit: 0,
        priceControlFood: false,
        priceControlHousing: false,
        printMoney: 0,
        publicHealthcare: false,
        wealthTax: 0,
        openBorders: false,
        subsidiesFarming: true
      }
    },

    scheduledEvents: [
      { atTick: 100, type: 'techBreakthrough' },   // The steam revolution
      { atTick: 350, type: 'generalStrike' },       // First labour movement
      { atTick: 600, type: 'immigrationWave' }      // Rural migration wave
    ],

    objectives: [
      {
        id: 'industrialize',
        label: 'Industrialise',
        icon: '⚙️',
        description: 'Grow GDP to 3× starting value',
        metric: 'gdp', operator: 'gt_initial', threshold: 3.0, sustainTicks: 0, weight: 0.3,
        tip: 'Reduce interest rates to encourage business investment'
      },
      {
        id: 'contain_inequality',
        label: 'Contain Inequality',
        icon: '⚖️',
        description: 'Keep Gini coefficient below 0.65',
        metric: 'gini', operator: 'lt', threshold: 0.65, sustainTicks: 52, weight: 0.35,
        tip: 'Education funding and minimum wage slow inequality accumulation'
      },
      {
        id: 'prevent_unrest',
        label: 'Prevent Revolution',
        icon: '🔥',
        description: 'Keep social unrest below 60%',
        metric: 'socialUnrest', operator: 'lt', threshold: 0.60, sustainTicks: 52, weight: 0.35,
        tip: 'Workers strike when inequality is extreme. Early labour protections help.'
      }
    ]
  },

  {
    id: 'story_ch2',
    number: 2,
    title: 'The Great Depression',
    era: '1929 – 1939',
    tagline: 'The bubble has burst. The banks are failing. Can you stop the collapse?',
    icon: '📉',
    color: '#ef4444',
    durationYears: 10,

    openingNarrative: `October 1929. The stock market has just crashed. Overnight, millions lost their savings.

Banks are failing. Factories are shutting. Unemployment lines stretch around the block. The industrial prosperity you inherited now threatens to become the greatest catastrophe in economic history.

Herbert Hoover is doing nothing. The markets will correct themselves, they say. They have not corrected. They are freefall.

You have a decade to stop the collapse, prevent total social breakdown, and set the stage for recovery. Every decision will be second-guessed by historians for the next hundred years.

What do you do?`,

    kokoroNarration: `October 1929. The stock market has just crashed. Banks are failing. Factories are shutting. Unemployment lines stretch around the block. You have one decade to stop the collapse. Every decision you make will be second-guessed by historians for the next hundred years.`,

    closingNarrative: {
      excellent: `You navigated the Depression better than history did. The New Deal worked — or something like it. Workers were put back to work, banks were stabilised, and the social contract held. Future generations will look back at this as the moment government proved its worth.`,
      good: `Recovery came, but slowly and unevenly. Unemployment fell but never fully resolved. You avoided total collapse — which is more than Hoover managed. The scars remain, but the patient survived.`,
      poor: `The Depression deepened on your watch. Unemployment exceeded 30%. Hunger marches turned violent. The social fabric frayed. You've created the conditions for something dangerous to fill the vacuum.`
    },

    scenarioConfig: {
      agentCount: 200,
      businessCount: 25,
      wealthMultiplier: 1.5,
      wealthInequality: 2.5,
      avgSkill: 0.45,
      startingGovDebt: 2000,
      policies: {
        incomeTax: 0.25,
        corporateTax: 0.15,
        minWage: 0,
        ubi: 0,
        interestRate: 0.06,
        antiMonopoly: false,
        educationFunding: 0.2,
        unemploymentBenefit: 0,
        priceControlFood: false,
        priceControlHousing: false,
        printMoney: 0,
        publicHealthcare: false,
        wealthTax: 0,
        openBorders: false,
        subsidiesFarming: false
      }
    },

    scheduledEvents: [
      { atTick: 10,  type: 'financialBubble' },   // immediate crash
      { atTick: 80,  type: 'bankRun' },            // banking crisis
      { atTick: 200, type: 'recession' },          // deepening depression
      { atTick: 350, type: 'cropFailure' }         // Dust Bowl
    ],

    objectives: [
      {
        id: 'employment',
        label: 'Reduce Unemployment',
        icon: '👷',
        description: 'Get unemployment below 15%',
        metric: 'unemployment', operator: 'lt', threshold: 0.15, sustainTicks: 104, weight: 0.4,
        tip: 'Stimulus spending, guaranteed jobs, or UBI can absorb the unemployed'
      },
      {
        id: 'no_collapse',
        label: 'Prevent Social Collapse',
        icon: '🏛️',
        description: 'Keep social unrest below 70%',
        metric: 'socialUnrest', operator: 'lt', threshold: 0.70, sustainTicks: 0, weight: 0.35,
        tip: 'Hungry, unemployed people revolt. Food aid and benefits are not luxuries here.'
      },
      {
        id: 'gdp_recovery',
        label: 'Stabilise GDP',
        icon: '📈',
        description: 'Stop GDP from falling below 50% of starting value',
        metric: 'gdp', operator: 'gt_initial', threshold: 0.5, sustainTicks: 52, weight: 0.25,
        tip: 'Austerity deepens depressions. Keynes said so. Try stimulus.'
      }
    ]
  },

  {
    id: 'story_ch3',
    number: 3,
    title: 'The Golden Age',
    era: '1950 – 1975',
    tagline: 'Postwar prosperity. Build the welfare state — before stagflation ends it.',
    icon: '✨',
    color: '#22c55e',
    durationYears: 25,

    openingNarrative: `The war is over. Soldiers have come home. Baby carriages fill the streets.

The economy is booming. Factories, infrastructure, education — everything needs to be built. There is broad political consensus that government should provide education, healthcare, and a safety net. This is your window.

But the prosperity won't last forever. By the mid-1970s, oil shocks will trigger stagflation — high inflation and high unemployment at the same time, the nightmare scenario that breaks every economic model.

Your task: build a welfare state that is both generous and resilient enough to survive when the oil runs out.`,

    kokoroNarration: `The war is over. Soldiers have come home. The economy is booming. This is your window to build the welfare state. But the prosperity won't last forever. By the mid-seventies, oil shocks will trigger stagflation — the nightmare scenario that breaks every economic model. Build something resilient.`,

    closingNarrative: {
      excellent: `You built the most successful welfare state in history. Education, healthcare, housing — all delivered. When stagflation hit, your economy had the resilience to absorb the shock. This will be remembered as the Golden Age it promised to be.`,
      good: `You built a reasonable welfare state and survived stagflation with manageable damage. Not Sweden, but not collapse either. The middle class is large. Inequality is moderate. The foundations are solid.`,
      poor: `The Golden Age became the Age of Stagflation on your watch. Inflation spiralled, unemployment spiked, and the welfare programs you couldn't afford to maintain were cut. The social contract is fraying.`
    },

    scenarioConfig: {
      agentCount: 220,
      businessCount: 28,
      wealthMultiplier: 1.2,
      wealthInequality: 1.3,
      avgSkill: 0.55,
      policies: {
        incomeTax: 0.35,
        corporateTax: 0.28,
        minWage: 8,
        ubi: 0,
        interestRate: 0.04,
        antiMonopoly: true,
        educationFunding: 0.5,
        unemploymentBenefit: 80,
        priceControlFood: false,
        priceControlHousing: false,
        printMoney: 0,
        publicHealthcare: true,
        wealthTax: 0,
        openBorders: false,
        subsidiesFarming: true
      }
    },

    scheduledEvents: [
      { atTick: 50,  type: 'boom' },              // postwar boom
      { atTick: 200, type: 'techBreakthrough' },  // postwar technology wave
      { atTick: 600, type: 'recession' },         // stagflation begins
      { atTick: 750, type: 'hyperinflation' }     // oil shock inflation
    ],

    objectives: [
      {
        id: 'welfare',
        label: 'Build Welfare State',
        icon: '🏥',
        description: 'Keep poverty rate below 15%',
        metric: 'povertyRate', operator: 'lt', threshold: 0.15, sustainTicks: 104, weight: 0.35,
        tip: 'Healthcare, education, unemployment benefits — all reduce poverty'
      },
      {
        id: 'growth',
        label: 'Sustained Growth',
        icon: '📈',
        description: 'Maintain positive GDP growth for 5 years',
        metric: 'gdpGrowth', operator: 'gt', threshold: 0.0, sustainTicks: 260, weight: 0.35,
        tip: 'The postwar boom is yours to manage. Don\'t break it.'
      },
      {
        id: 'survive_stagflation',
        label: 'Survive Stagflation',
        icon: '🛡️',
        description: 'Keep inflation below 15% when it hits',
        metric: 'inflation', operator: 'lt', threshold: 15, sustainTicks: 52, weight: 0.3,
        tip: 'Tight monetary policy can fight inflation — but it triggers recession'
      }
    ]
  },

  {
    id: 'story_ch4',
    number: 4,
    title: 'The Neoliberal Turn',
    era: '1980 – 2000',
    tagline: 'Deregulate everything. But who gets left behind?',
    icon: '🦁',
    color: '#8b5cf6',
    durationYears: 20,

    openingNarrative: `Reagan is in the White House. Thatcher is at 10 Downing Street. The message is clear: government is the problem. Markets are the solution.

Inflation has been crushed — but at the cost of brutal unemployment. The industrial heartland is hollowing out. Financialisation is replacing manufacturing. Inequality is rising faster than at any time since the Gilded Age.

The tech revolution is beginning. This could be a tremendous era of growth — or the beginning of a 40-year inequality explosion.

The choice is yours. Deregulate and grow fast, or manage the transition and protect those left behind?`,

    kokoroNarration: `Reagan is in the White House. Thatcher is at Downing Street. The message is clear — government is the problem. Markets are the solution. Inflation has been crushed. The tech revolution is beginning. This could be tremendous growth — or the beginning of a 40-year inequality explosion. The choice is yours.`,

    closingNarrative: {
      excellent: `You managed the neoliberal era with rare wisdom — capturing the growth benefits of deregulation while protecting workers from its worst effects. Inequality rose modestly. The middle class survived. The tech revolution was distributed, not just captured by the elite.`,
      good: `Growth was real. So was the inequality. The 1990s produced genuine prosperity for many, but the gap between the top and bottom widened considerably. The seeds of future discontent were planted, but the economy is functional.`,
      poor: `Trickle-down didn't trickle. Deregulation unleashed a financial sector that captured all the gains. Workers who lost manufacturing jobs never found equivalent work. The economy is a casino — and the house always wins.`
    },

    scenarioConfig: {
      agentCount: 240,
      businessCount: 30,
      wealthMultiplier: 1.4,
      wealthInequality: 1.8,
      avgSkill: 0.5,
      policies: {
        incomeTax: 0.28,
        corporateTax: 0.35,
        minWage: 5,
        ubi: 0,
        interestRate: 0.15,
        antiMonopoly: false,
        educationFunding: 0.3,
        unemploymentBenefit: 60,
        priceControlFood: false,
        priceControlHousing: false,
        printMoney: 0,
        publicHealthcare: false,
        wealthTax: 0,
        openBorders: true,
        subsidiesFarming: false
      }
    },

    scheduledEvents: [
      { atTick: 80,  type: 'techBreakthrough' },   // PC revolution
      { atTick: 250, type: 'financialBubble' },    // S&L crisis / dot-com
      { atTick: 400, type: 'brainDrain' },         // skills mismatch
      { atTick: 600, type: 'boom' }                // dot-com boom
    ],

    objectives: [
      {
        id: 'growth_neo',
        label: 'Deliver Growth',
        icon: '📈',
        description: 'Grow GDP to 2× starting value',
        metric: 'gdp', operator: 'gt_initial', threshold: 2.0, sustainTicks: 0, weight: 0.3,
        tip: 'Low rates and deregulation stimulate growth — short-term'
      },
      {
        id: 'inequality_neo',
        label: 'Contain Inequality',
        icon: '⚖️',
        description: 'Keep Gini below 0.55',
        metric: 'gini', operator: 'lt', threshold: 0.55, sustainTicks: 104, weight: 0.4,
        tip: 'The hardest challenge of this era. Redistribution fights against market forces.'
      },
      {
        id: 'employment_neo',
        label: 'Full Employment',
        icon: '👷',
        description: 'Keep unemployment below 8%',
        metric: 'unemployment', operator: 'lt', threshold: 0.08, sustainTicks: 104, weight: 0.3,
        tip: 'Technology displaces workers. Education and retraining are your best tools.'
      }
    ]
  },

  {
    id: 'story_ch5',
    number: 5,
    title: 'The Age of Crises',
    era: '2008 – Now',
    tagline: 'Financial crash. Pandemic. Inequality explosion. Can you hold it together?',
    icon: '🌍',
    color: '#6366f1',
    durationYears: 20,

    openingNarrative: `September 2008. Lehman Brothers has just filed for bankruptcy. The global financial system is in cardiac arrest.

Everything you built over the previous decades is now being tested. The debt is enormous. The inequality is extreme. The financial sector is insolvent. And in a decade, a pandemic will arrive that shuts down the entire world economy.

This is the final chapter. The cumulative weight of every previous decision — industrial exploitation, Depression policy, welfare choices, neoliberal inequality — comes due now.

Can you hold civilisation together? Or will this be where it finally breaks?`,

    kokoroNarration: `September 2008. Lehman Brothers has just filed for bankruptcy. The global financial system is in cardiac arrest. Everything you built over decades is being tested. And in a decade, a pandemic will arrive. This is the final chapter. Can you hold it together?`,

    closingNarrative: {
      excellent: `Against extraordinary odds, you navigated the Age of Crises. The 2008 crash was contained. The pandemic was managed. Inequality, while still high, was brought back to manageable levels. This is what competent governance looks like in the hardest times.`,
      good: `The crises were severe but not fatal. Recovery was slow and uneven. The wealthy recovered faster than the workers — as always. But the system held. Democracy survived. This is the realistic best-case outcome.`,
      poor: `The crises broke what the previous decades had strained. Unemployment, inequality, social unrest — all reached historic highs. The social contract you inherited lies in ruins. Whatever comes next won't look like what came before.`
    },

    scenarioConfig: {
      agentCount: 250,
      businessCount: 35,
      wealthMultiplier: 2.0,
      wealthInequality: 3.0,
      avgSkill: 0.6,
      startingGovDebt: 3500,
      policies: {
        incomeTax: 0.30,
        corporateTax: 0.25,
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
      }
    },

    scheduledEvents: [
      { atTick: 10,  type: 'financialBubble' },   // 2008 crash
      { atTick: 100, type: 'bankRun' },            // banking crisis
      { atTick: 250, type: 'recession' },          // prolonged recession
      { atTick: 500, type: 'pandemic' },           // COVID
      { atTick: 650, type: 'hyperinflation' }      // post-pandemic inflation
    ],

    objectives: [
      {
        id: 'survive_crash',
        label: 'Survive the Crash',
        icon: '🏦',
        description: 'Keep GDP above 60% of starting value',
        metric: 'gdp', operator: 'gt_initial', threshold: 0.6, sustainTicks: 52, weight: 0.3,
        tip: 'Stimulus, QE, and deposit guarantees are your tools for the crash'
      },
      {
        id: 'inequality_final',
        label: 'Reduce Inequality',
        icon: '⚖️',
        description: 'Bring Gini below 0.5',
        metric: 'gini', operator: 'lt', threshold: 0.5, sustainTicks: 104, weight: 0.35,
        tip: 'This is the defining challenge of the 21st century. Wealth taxes, UBI, education.'
      },
      {
        id: 'stability_final',
        label: 'Social Stability',
        icon: '🕊️',
        description: 'Keep social unrest below 50%',
        metric: 'socialUnrest', operator: 'lt', threshold: 0.50, sustainTicks: 52, weight: 0.35,
        tip: 'People who have nothing to lose are dangerous. Safety nets buy stability.'
      }
    ]
  }
]

// Score a chapter completion 0–100 based on objectives met
export function scoreChapter(objectives = []) {
  if (!objectives.length) return 50
  const total = objectives.reduce((s, o) => s + (o.weight || 1), 0)
  const earned = objectives.reduce((s, o) => s + (o.completed ? (o.weight || 1) : 0), 0)
  return Math.round((earned / total) * 100)
}

// Grade from score
export function gradeChapter(score) {
  if (score >= 85) return { grade: 'S', label: 'Excellent', color: '#f59e0b' }
  if (score >= 65) return { grade: 'A', label: 'Good', color: '#22c55e' }
  if (score >= 40) return { grade: 'B', label: 'Adequate', color: '#6366f1' }
  if (score >= 20) return { grade: 'C', label: 'Poor', color: '#f97316' }
  return { grade: 'F', label: 'Failed', color: '#ef4444' }
}

// Closing narrative key based on score
export function closingNarrativeKey(score) {
  if (score >= 65) return 'excellent'
  if (score >= 35) return 'good'
  return 'poor'
}
