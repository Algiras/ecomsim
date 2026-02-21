// ─── Interactive Tutorial Lessons ─────────────────────────────────────────────
// Each lesson presents a broken economy and the player must fix it by adjusting
// the correct policy control. Lessons complete when the problem is actually
// resolved (metrics improve), not just when the slider is moved.

export const TUTORIAL_LESSONS = [
  {
    id: 'tut_inflation',
    title: 'Inflation Crisis',
    icon: '\uD83D\uDD25',
    problem: 'Prices are out of control! The government has been printing money recklessly and CPI has skyrocketed past 150. Citizens can barely afford food. Your economy is melting down.',
    instruction: 'Raise the Interest Rate above 10% to cool the economy. Watch CPI drop below 120.',
    section: 'economy',
    highlightPolicy: 'interestRate',
    scenarioConfig: {
      policies: {
        printMoney: 40, interestRate: 0.01, incomeTax: 0.20, corporateTax: 0.15,
        minWage: 8, ubi: 0, educationFunding: 0.3, unemploymentBenefit: 50,
        publicHealthcare: false, wealthTax: 0, policeFunding: 0.3,
        financialOversight: 0.2, reserveRequirement: 0.05, depositInsurance: true,
        maxLoanToValue: 0.9, antiMonopoly: false, openBorders: false, subsidiesFarming: false
      },
      agentCount: 200,
      businessCount: 20,
      wealthMultiplier: 1.0,
      wealthInequality: 1.0,
      avgSkill: 0.5
    },
    conditions: [{ metric: 'cpi', op: 'lte', value: 120 }],
    successMessage: 'Higher interest rates make borrowing expensive, which slows spending and cools inflation. This is exactly what central banks do in real life \u2014 the Volcker shock of 1981 used 20% rates to break inflation.',
  },
  {
    id: 'tut_unemployment',
    title: 'Mass Unemployment',
    icon: '\uD83D\uDCBC',
    problem: 'The previous government raised interest rates too high and crushed the economy. Unemployment has soared past 30%. Businesses are closing. People are desperate for work.',
    instruction: 'Lower the Interest Rate below 3% to stimulate borrowing and hiring. Get unemployment below 20%.',
    section: 'economy',
    highlightPolicy: 'interestRate',
    scenarioConfig: {
      policies: {
        printMoney: 0, interestRate: 0.18, incomeTax: 0.35, corporateTax: 0.30,
        minWage: 15, ubi: 0, educationFunding: 0.3, unemploymentBenefit: 30,
        publicHealthcare: false, wealthTax: 0, policeFunding: 0.3,
        financialOversight: 0.2, reserveRequirement: 0.15, depositInsurance: true,
        maxLoanToValue: 0.7, antiMonopoly: false, openBorders: false, subsidiesFarming: false
      },
      agentCount: 200,
      businessCount: 10,
      wealthMultiplier: 0.5,
      wealthInequality: 1.5,
      avgSkill: 0.4
    },
    conditions: [{ metric: 'unemployment', op: 'lte', value: 0.20 }],
    successMessage: 'Cheap borrowing lets businesses expand and hire. This is the classic Keynesian stimulus response \u2014 lower rates to fight recession. But be careful: too low for too long and you risk inflation.',
  },
  {
    id: 'tut_debt',
    title: 'Government Debt Spiral',
    icon: '\uD83D\uDCB8',
    problem: 'The government has been spending far more than it collects. Debt has ballooned past $5,000 and services are collapsing. Creditors are losing faith. You need revenue \u2014 fast.',
    instruction: 'Raise Income Tax above 30% to increase revenue. Bring government debt below $4,000.',
    section: 'fiscal',
    highlightPolicy: 'incomeTax',
    scenarioConfig: {
      policies: {
        printMoney: 5, interestRate: 0.05, incomeTax: 0.08, corporateTax: 0.05,
        minWage: 10, ubi: 200, educationFunding: 0.8, unemploymentBenefit: 150,
        publicHealthcare: true, wealthTax: 0, policeFunding: 0.5,
        financialOversight: 0.3, reserveRequirement: 0.1, depositInsurance: true,
        maxLoanToValue: 0.8, antiMonopoly: false, openBorders: false, subsidiesFarming: true
      },
      agentCount: 200,
      businessCount: 18,
      wealthMultiplier: 0.8,
      wealthInequality: 0.8,
      avgSkill: 0.5,
      startGovDebt: 5000
    },
    conditions: [{ metric: 'govDebt', op: 'lte', value: 4000 }],
    successMessage: 'Raising taxes is politically painful but sometimes necessary to avoid sovereign default. In real life, austerity vs. stimulus is one of the biggest debates in economics.',
  },
  {
    id: 'tut_inequality',
    title: 'Inequality Emergency',
    icon: '\u2696\uFE0F',
    problem: 'The top 1% own almost everything. Gini coefficient is above 0.8. Poverty is rampant, social unrest is rising, and crime is spiking. The people demand fairness.',
    instruction: 'Enable Wealth Tax (set above 0%) and raise Minimum Wage above $12. Bring Gini below 0.65.',
    section: 'inequality',
    highlightPolicy: 'minWage',
    scenarioConfig: {
      policies: {
        printMoney: 0, interestRate: 0.03, incomeTax: 0.10, corporateTax: 0.05,
        minWage: 0, ubi: 0, educationFunding: 0.1, unemploymentBenefit: 0,
        publicHealthcare: false, wealthTax: 0, policeFunding: 0.2,
        financialOversight: 0.1, reserveRequirement: 0.05, depositInsurance: false,
        maxLoanToValue: 0.9, antiMonopoly: false, openBorders: false, subsidiesFarming: false
      },
      agentCount: 200,
      businessCount: 15,
      wealthMultiplier: 1.5,
      wealthInequality: 3.0,
      avgSkill: 0.4
    },
    conditions: [{ metric: 'gini', op: 'lte', value: 0.65 }],
    successMessage: 'Wealth taxes directly reduce concentration at the top while minimum wage lifts the floor. Combining redistribution with wage floors is more effective than either alone.',
  },
  {
    id: 'tut_crime',
    title: 'Crime Wave',
    icon: '\uD83D\uDEA8',
    problem: 'Crime has exploded. Street crime and corporate fraud are both rampant. Citizens don\'t feel safe. Businesses are being robbed. The justice system is overwhelmed.',
    instruction: 'Raise Police Funding above 60% to restore order. Bring the crime rate below 0.15 per 1K.',
    section: 'crime',
    highlightPolicy: 'policeFunding',
    scenarioConfig: {
      policies: {
        printMoney: 0, interestRate: 0.05, incomeTax: 0.15, corporateTax: 0.10,
        minWage: 3, ubi: 0, educationFunding: 0.1, unemploymentBenefit: 0,
        publicHealthcare: false, wealthTax: 0, policeFunding: 0.05,
        financialOversight: 0.05, reserveRequirement: 0.1, depositInsurance: true,
        maxLoanToValue: 0.8, antiMonopoly: false, openBorders: false, subsidiesFarming: false
      },
      agentCount: 200,
      businessCount: 15,
      wealthMultiplier: 0.7,
      wealthInequality: 2.0,
      avgSkill: 0.35
    },
    conditions: [{ metric: 'crimeRate', op: 'lte', value: 0.15 }],
    successMessage: 'Police funding deters street crime through higher arrest rates. But notice \u2014 fixing poverty and inequality would address the root causes. Enforcement treats symptoms; policy treats causes.',
  },
  {
    id: 'tut_banking',
    title: 'Banking Crisis',
    icon: '\uD83C\uDFE6',
    problem: 'Banks lent recklessly with almost no reserves. Now loans are defaulting, banks are failing, and a credit crunch is freezing the economy. The financial system is on the brink.',
    instruction: 'Raise Reserve Requirement above 30% to stabilize the banks. Reduce debt spirals to under 10 agents.',
    section: 'banking',
    highlightPolicy: 'reserveRequirement',
    scenarioConfig: {
      policies: {
        printMoney: 10, interestRate: 0.02, incomeTax: 0.20, corporateTax: 0.15,
        minWage: 8, ubi: 0, educationFunding: 0.3, unemploymentBenefit: 50,
        publicHealthcare: false, wealthTax: 0, policeFunding: 0.3,
        financialOversight: 0.1, reserveRequirement: 0.02, depositInsurance: false,
        maxLoanToValue: 0.95, antiMonopoly: false, openBorders: false, subsidiesFarming: false
      },
      agentCount: 200,
      businessCount: 18,
      wealthMultiplier: 0.8,
      wealthInequality: 1.3,
      avgSkill: 0.5
    },
    conditions: [{ metric: 'agentsInDebtSpiral', op: 'lte', value: 10 }],
    successMessage: 'Higher reserve requirements mean banks keep more cash on hand and lend less aggressively. This is exactly what regulators did after the 2008 crisis with Basel III rules. Safer banks mean a more stable economy.',
  }
]
