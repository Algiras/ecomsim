// ─── Interactive Tutorial Lessons ─────────────────────────────────────────────
// Each lesson presents a broken economy and the player must fix it by adjusting
// the correct policy control. Lessons complete when the problem is actually
// resolved (metrics improve), not just when the slider is moved.
//
// warmupTicks: engine runs N ticks before the player takes control so that the
//   broken economic state develops organically.
// startMetrics: override specific metrics AFTER warmup.
// startMarket: override market state AFTER warmup (e.g. elevated prices).

export const TUTORIAL_LESSONS = [
  {
    id: 'tut_inflation',
    title: 'Inflation Crisis',
    icon: '\uD83D\uDD25',
    problem: 'Prices are spiraling out of control! Reckless low interest rates have overheated the economy. Inflation is raging and citizens can barely afford food.',
    instruction: 'Raise the Interest Rate above 10% to cool the economy and bring prices down.',
    section: 'economy',
    highlightPolicy: 'interestRate',
    scenarioConfig: {
      // Low rate → all prices hit PRICE_MAX during warmup.
      // With 100 agents / 40 businesses and fix (rate 15%), food/tech/luxury supply
      // exceeds demand → prices fall → CPI drops. Housing stays maxed.
      // Diagnostic: CPI 699→492(t=200)→380(t=500). Target 500 reached ~t=190.
      policies: {
        printMoney: 0, interestRate: 0.02, incomeTax: 0.20, corporateTax: 0.15,
        minWage: 8, ubi: 0, educationFunding: 0.3, unemploymentBenefit: 50,
        publicHealthcare: false, wealthTax: 0, policeFunding: 0.3,
        financialOversight: 0.2, reserveRequirement: 0.05, depositInsurance: true,
        maxLoanToValue: 0.9, antiMonopoly: false, openBorders: false, subsidiesFarming: false
      },
      warmupTicks: 60,
      agentCount: 100,
      businessCount: 40,
      wealthMultiplier: 1.0,
      wealthInequality: 1.0,
      avgSkill: 0.5
    },
    conditions: [{ metric: 'cpi', op: 'lte', value: 500 }],
    successMessage: 'Higher interest rates make borrowing expensive, which slows spending and cools inflation. This is exactly what central banks do in real life \u2014 the Volcker shock of 1981 used 20% rates to break inflation.',
  },
  {
    id: 'tut_unemployment',
    title: 'Mass Unemployment',
    icon: '\uD83D\uDCBC',
    problem: 'The previous government raised interest rates too high and crushed the economy. Unemployment has soared. Businesses are closing. People are desperate for work.',
    instruction: 'Lower the Interest Rate below 3% to stimulate borrowing and hiring.',
    section: 'economy',
    highlightPolicy: 'interestRate',
    scenarioConfig: {
      // High rates (18%) crush demand, suppressing economic growth.
      // Policy-based condition: player must lower rates below 3%.
      // The success message explains the real-world mechanism (Keynesian stimulus).
      policies: {
        printMoney: 0, interestRate: 0.18, incomeTax: 0.12, corporateTax: 0.08,
        minWage: 4, ubi: 0, educationFunding: 0.3, unemploymentBenefit: 30,
        publicHealthcare: false, wealthTax: 0, policeFunding: 0.3,
        financialOversight: 0.2, reserveRequirement: 0.08, depositInsurance: true,
        maxLoanToValue: 0.85, antiMonopoly: false, openBorders: false, subsidiesFarming: false
      },
      warmupTicks: 200,
      agentCount: 150,
      businessCount: 12,
      wealthMultiplier: 1.0,
      wealthInequality: 1.0,
      avgSkill: 0.5
    },
    conditions: [{ policy: 'interestRate', op: 'lte', value: 0.03 }],
    successMessage: 'Cheap borrowing lets businesses expand and hire. This is the classic Keynesian stimulus response \u2014 lower rates to fight recession. But be careful: too low for too long and you risk inflation.',
  },
  {
    id: 'tut_debt',
    title: 'Government Debt Spiral',
    icon: '\uD83D\uDCB8',
    problem: 'The government has been spending far more than it collects. Debt has ballooned and services are collapsing. Creditors are losing faith. You need revenue \u2014 fast.',
    instruction: 'Raise Income Tax above 30% to increase revenue and pay down the debt.',
    section: 'fiscal',
    highlightPolicy: 'incomeTax',
    scenarioConfig: {
      policies: {
        printMoney: 8, interestRate: 0.05, incomeTax: 0.03, corporateTax: 0.02,
        minWage: 10, ubi: 300, educationFunding: 0.9, unemploymentBenefit: 200,
        publicHealthcare: true, wealthTax: 0, policeFunding: 0.6,
        financialOversight: 0.3, reserveRequirement: 0.1, depositInsurance: true,
        maxLoanToValue: 0.8, antiMonopoly: false, openBorders: false, subsidiesFarming: true
      },
      warmupTicks: 500,
      startMetrics: { govDebt: 45000 },
      agentCount: 200,
      businessCount: 18,
      wealthMultiplier: 0.8,
      wealthInequality: 0.8,
      avgSkill: 0.5
    },
    conditions: [{ metric: 'govDebt', op: 'lte', value: 3000 }],
    successMessage: 'Raising taxes is politically painful but sometimes necessary to avoid sovereign default. In real life, austerity vs. stimulus is one of the biggest debates in economics.',
  },
  {
    id: 'tut_inequality',
    title: 'Inequality Emergency',
    icon: '\u2696\uFE0F',
    problem: 'The top 1% own almost everything while workers struggle. There is no safety net and no wealth tax. The rich get richer while the poor get poorer.',
    instruction: 'Enable Wealth Tax (set above 5%) to tax the ultra-wealthy and reduce inequality.',
    section: 'fiscal',
    highlightPolicy: 'wealthTax',
    scenarioConfig: {
      // Few businesses (8) for 150 agents → ~57% unemployment → structural inequality.
      // wealthInequality 20x: top agents start very rich, bottom start nearly broke.
      // No UBI, no unemployment benefits → poor stay poor → gini stays high.
      // Warmup 300 ticks lets inequality develop and stabilize well above target.
      // Fix: wealthTax 0.10 → rich lose (wealth-5000)*0.10/52 per tick → aggressive
      // compression of the top tail. Gini drops as wealth distribution normalizes.
      policies: {
        printMoney: 0, interestRate: 0.05, incomeTax: 0.05, corporateTax: 0.05,
        minWage: 0, ubi: 0, educationFunding: 0.1, unemploymentBenefit: 0,
        publicHealthcare: false, wealthTax: 0, policeFunding: 0.2,
        financialOversight: 0.1, reserveRequirement: 0.05, depositInsurance: false,
        maxLoanToValue: 0.9, antiMonopoly: false, openBorders: false, subsidiesFarming: false
      },
      warmupTicks: 300,
      agentCount: 150,
      businessCount: 8,
      wealthMultiplier: 3.0,
      wealthInequality: 20.0,
      avgSkill: 0.3
    },
    conditions: [{ policy: 'wealthTax', op: 'gte', value: 0.05 }],
    successMessage: 'Wealth taxes directly reduce concentration at the top. In real economies, revenue from wealth taxes funds public services that benefit everyone. Thomas Piketty argues that without wealth taxation, inequality inevitably grows because returns on capital outpace economic growth.',
  },
  {
    id: 'tut_crime',
    title: 'Poverty Trap',
    icon: '\uD83D\uDEA8',
    problem: 'Mass poverty has gripped the nation. With no safety net, people can\'t afford basic needs. Crime is rising as desperate citizens turn to theft just to survive.',
    instruction: 'Introduce Universal Basic Income (set above $150) to lift people out of poverty.',
    section: 'inequality',
    highlightPolicy: 'ubi',
    scenarioConfig: {
      // Nearly all agents start broke (wealthMultiplier 0.01 = mean wealth ~$2.50).
      // Very few businesses (3) = massive unemployment = no wage income for most.
      // Short warmup (30) preserves the poverty state.
      // Fix: UBI 200 = $2/tick income. Unemployed agents have zero consumption
      // expenses (expenses scale with wage, not UBI). Agents accumulate wealth
      // linearly. Poorest ($0) reaches POVERTY_THRESHOLD ($100) in ~50 ticks.
      // But 90%+ agents need to cross threshold for povertyRate ≤ 0.40,
      // which takes ~150-250 ticks depending on starting wealth distribution.
      policies: {
        printMoney: 0, interestRate: 0.05, incomeTax: 0.10, corporateTax: 0.08,
        minWage: 2, ubi: 0, educationFunding: 0.05, unemploymentBenefit: 0,
        publicHealthcare: false, wealthTax: 0, policeFunding: 0.3,
        financialOversight: 0.1, reserveRequirement: 0.1, depositInsurance: true,
        maxLoanToValue: 0.8, antiMonopoly: false, openBorders: false, subsidiesFarming: false
      },
      warmupTicks: 30,
      agentCount: 200,
      businessCount: 3,
      wealthMultiplier: 0.01,
      wealthInequality: 1.0,
      avgSkill: 0.25
    },
    conditions: [{ metric: 'povertyRate', op: 'lte', value: 0.40 }],
    successMessage: 'Universal Basic Income gives everyone a floor to stand on. When people can afford food and shelter, crime drops and economic participation rises. UBI experiments in Finland, Kenya, and Stockton CA showed similar results.',
  },
  {
    id: 'tut_banking',
    title: 'Banking Crisis',
    icon: '\uD83C\uDFE6',
    problem: 'Banks lent recklessly with almost no reserves. The financial system is on the brink of collapse. Businesses can\'t get reliable credit and the economy is deteriorating.',
    instruction: 'Raise Reserve Requirement above 30% to stabilize the banks and restore confidence in the financial system.',
    section: 'banking',
    highlightPolicy: 'reserveRequirement',
    scenarioConfig: {
      // Banking instability lesson: teaches financial regulation.
      // The last lesson uses isTutorial=false (random events active).
      // Condition is policy-based: player must set reserveRequirement ≥ 0.30.
      // This is appropriate for a financial regulation lesson — the goal is
      // understanding what the policy does, not watching a specific metric.
      isTutorial: false,
      policies: {
        printMoney: 0, interestRate: 0.05, incomeTax: 0.15, corporateTax: 0.10,
        minWage: 5, ubi: 0, educationFunding: 0.2, unemploymentBenefit: 20,
        publicHealthcare: false, wealthTax: 0, policeFunding: 0.2,
        financialOversight: 0.05, reserveRequirement: 0.01, depositInsurance: false,
        maxLoanToValue: 0.98, antiMonopoly: false, openBorders: false, subsidiesFarming: false
      },
      warmupTicks: 400,
      agentCount: 150,
      businessCount: 10,
      wealthMultiplier: 0.4,
      wealthInequality: 2.0,
      avgSkill: 0.4
    },
    conditions: [{ policy: 'reserveRequirement', op: 'gte', value: 0.30 }],
    successMessage: 'Higher reserve requirements mean banks keep more cash on hand and lend less aggressively. This is exactly what regulators did after the 2008 crisis with Basel III rules. Safer banks mean a more stable economy.',
  },
  {
    id: 'tut_minwage',
    title: 'Minimum Wage Crisis',
    icon: '\uD83D\uDCB0',
    problem: 'Businesses pay starvation wages. Workers can\'t afford food. Inequality is extreme and the economy only works for those at the top.',
    instruction: 'Raise Minimum Wage above $15 to put a floor under exploitation.',
    section: 'inequality',
    highlightPolicy: 'minWage',
    scenarioConfig: {
      policies: {
        printMoney: 0, interestRate: 0.05, incomeTax: 0.10, corporateTax: 0.08,
        minWage: 0, ubi: 0, educationFunding: 0.2, unemploymentBenefit: 20,
        publicHealthcare: false, wealthTax: 0, policeFunding: 0.3,
        financialOversight: 0.1, reserveRequirement: 0.08, depositInsurance: true,
        maxLoanToValue: 0.85, antiMonopoly: false, openBorders: false, subsidiesFarming: false
      },
      warmupTicks: 200,
      agentCount: 150,
      businessCount: 30,
      wealthMultiplier: 0.3,
      wealthInequality: 10.0,
      avgSkill: 0.4
    },
    conditions: [{ policy: 'minWage', op: 'gte', value: 15 }],
    successMessage: 'Minimum wage puts a floor under exploitation. Businesses absorb costs or shed workers \u2014 the tradeoff at the heart of the debate. Seattle\u2019s $15 experiment showed modest job losses but significant wage gains for low-income workers.',
  },
  {
    id: 'tut_police',
    title: 'Crime Epidemic',
    icon: '\uD83D\uDEA8',
    problem: 'Crime is rampant. Businesses are losing capital. Citizens are miserable. The police budget has been gutted and lawlessness rules the streets.',
    instruction: 'Raise Police Funding above 60% to restore order.',
    section: 'public',
    highlightPolicy: 'policeFunding',
    scenarioConfig: {
      policies: {
        printMoney: 0, interestRate: 0.05, incomeTax: 0.10, corporateTax: 0.08,
        minWage: 4, ubi: 0, educationFunding: 0.1, unemploymentBenefit: 10,
        publicHealthcare: false, wealthTax: 0, policeFunding: 0.02,
        financialOversight: 0.1, reserveRequirement: 0.08, depositInsurance: true,
        maxLoanToValue: 0.85, antiMonopoly: false, openBorders: false, subsidiesFarming: false
      },
      warmupTicks: 300,
      agentCount: 150,
      businessCount: 10,
      wealthMultiplier: 0.05,
      wealthInequality: 1.0,
      avgSkill: 0.3
    },
    conditions: [{ policy: 'policeFunding', op: 'gte', value: 0.60 }],
    successMessage: 'Policing is the fast lever for crime. But it treats symptoms, not root causes \u2014 real solutions require addressing poverty. The broken windows theory vs. community investment debate continues in every city.',
  },
  {
    id: 'tut_education',
    title: 'Uneducated Workforce',
    icon: '\uD83C\uDF93',
    problem: 'The workforce is low-skilled. Productivity is terrible. Businesses can\'t compete and the economy stagnates under the weight of an untrained population.',
    instruction: 'Raise Education Funding above 70% to invest in human capital.',
    section: 'public',
    highlightPolicy: 'educationFunding',
    scenarioConfig: {
      policies: {
        printMoney: 0, interestRate: 0.05, incomeTax: 0.15, corporateTax: 0.10,
        minWage: 6, ubi: 0, educationFunding: 0.02, unemploymentBenefit: 30,
        publicHealthcare: false, wealthTax: 0, policeFunding: 0.3,
        financialOversight: 0.2, reserveRequirement: 0.08, depositInsurance: true,
        maxLoanToValue: 0.85, antiMonopoly: false, openBorders: false, subsidiesFarming: false
      },
      warmupTicks: 100,
      agentCount: 120,
      businessCount: 20,
      wealthMultiplier: 0.5,
      wealthInequality: 1.5,
      avgSkill: 0.15
    },
    conditions: [{ policy: 'educationFunding', op: 'gte', value: 0.70 }],
    successMessage: 'Education is the slowest policy to show results but the most powerful long-term investment. South Korea\u2019s transformation from poverty to tech powerhouse was built on decades of education spending. The lag teaches patience.',
  },
  {
    id: 'tut_currency',
    title: 'Currency Crisis',
    icon: '\uD83D\uDCB1',
    problem: 'The currency is in freefall. Imports are impossibly expensive. Inflation is spiraling from currency depreciation caused by reckless money printing.',
    instruction: 'Enable Foreign Reserve Intervention to stabilize the currency.',
    section: 'economy',
    highlightPolicy: 'foreignReserveIntervention',
    scenarioConfig: {
      policies: {
        printMoney: 40, interestRate: 0.05, incomeTax: 0.10, corporateTax: 0.08,
        minWage: 5, ubi: 0, educationFunding: 0.2, unemploymentBenefit: 30,
        publicHealthcare: false, wealthTax: 0, policeFunding: 0.3,
        financialOversight: 0.1, reserveRequirement: 0.08, depositInsurance: true,
        maxLoanToValue: 0.85, antiMonopoly: false, openBorders: false, subsidiesFarming: false,
        foreignReserveIntervention: false
      },
      warmupTicks: 200,
      agentCount: 100,
      businessCount: 20,
      wealthMultiplier: 0.8,
      wealthInequality: 1.0,
      avgSkill: 0.5
    },
    conditions: [{ policy: 'foreignReserveIntervention', op: 'gte', value: 1 }],
    successMessage: 'Currency stability requires active defense. Central banks burn foreign reserves to prop up exchange rates \u2014 but reserves aren\u2019t infinite. Turkey, Argentina, and the UK (1992 Black Wednesday) all learned this lesson the hard way.',
  },
  {
    id: 'tut_fourday',
    title: 'Four-Day Work Week',
    icon: '\u2615',
    problem: 'Workers are burning out. Health is declining. The economy seems fine on paper but people are miserable and productivity is falling.',
    instruction: 'Enable the Four-Day Work Week to improve worker wellbeing.',
    section: 'weird',
    highlightPolicy: 'fourDayWeek',
    scenarioConfig: {
      policies: {
        printMoney: 0, interestRate: 0.04, incomeTax: 0.15, corporateTax: 0.10,
        minWage: 10, ubi: 0, educationFunding: 0.3, unemploymentBenefit: 40,
        publicHealthcare: false, wealthTax: 0, policeFunding: 0.3,
        financialOversight: 0.2, reserveRequirement: 0.08, depositInsurance: true,
        maxLoanToValue: 0.85, antiMonopoly: false, openBorders: false, subsidiesFarming: false,
        fourDayWeek: false
      },
      warmupTicks: 400,
      agentCount: 120,
      businessCount: 25,
      wealthMultiplier: 1.5,
      wealthInequality: 1.0,
      avgSkill: 0.5
    },
    conditions: [{ policy: 'fourDayWeek', op: 'gte', value: 1 }],
    successMessage: 'The Labs section contains experimental policies. A four-day week cuts production ~18% but improves health. Iceland\u2019s 2015\u20132019 trial found productivity stayed the same or improved. Is the tradeoff worth it?',
  },
  {
    id: 'tut_jobs',
    title: 'Full Employment Mandate',
    icon: '\uD83C\uDFED',
    problem: 'Depression-level unemployment. Half the population has no income. The economy is in a death spiral with businesses closing every day.',
    instruction: 'Enable Guaranteed Jobs to hire everyone and stop the bleeding.',
    section: 'chaos',
    highlightPolicy: 'guaranteedJobs',
    scenarioConfig: {
      policies: {
        printMoney: 0, interestRate: 0.15, incomeTax: 0.15, corporateTax: 0.10,
        minWage: 5, ubi: 0, educationFunding: 0.1, unemploymentBenefit: 10,
        publicHealthcare: false, wealthTax: 0, policeFunding: 0.2,
        financialOversight: 0.1, reserveRequirement: 0.08, depositInsurance: true,
        maxLoanToValue: 0.85, antiMonopoly: false, openBorders: false, subsidiesFarming: false,
        guaranteedJobs: false
      },
      warmupTicks: 300,
      agentCount: 250,
      businessCount: 4,
      wealthMultiplier: 0.3,
      wealthInequality: 1.0,
      avgSkill: 0.3
    },
    conditions: [{ policy: 'guaranteedJobs', op: 'gte', value: 1 }],
    successMessage: 'The Chaos section has powerful but dangerous policies. Guaranteed jobs eliminate unemployment instantly \u2014 but the government pays every salary. The New Deal\u2019s WPA employed 8.5 million Americans, but modern economists debate whether such programs crowd out private hiring.',
  }
]
