export const POLICY_DEFINITIONS = [
  {
    id: 'incomeTax',
    name: 'Income Tax',
    category: 'fiscal',
    type: 'slider',
    min: 0,
    max: 0.6,
    step: 0.01,
    format: 'percent',
    icon: '🏛️',
    description: 'Tax on worker wages. Funds public spending. Too high reduces work incentive.',
    tradeoff: '↑ Revenue but ↓ Worker take-home pay'
  },
  {
    id: 'corporateTax',
    name: 'Corporate Tax',
    category: 'fiscal',
    type: 'slider',
    min: 0,
    max: 0.5,
    step: 0.01,
    format: 'percent',
    icon: '🏢',
    description: 'Tax on business profits. High rates may deter investment.',
    tradeoff: '↑ Revenue but ↓ Business investment'
  },
  {
    id: 'minWage',
    name: 'Minimum Wage',
    category: 'labor',
    type: 'slider',
    min: 0,
    max: 30,
    step: 1,
    format: 'currency',
    icon: '💼',
    description: 'Floor on wages. Protects workers but may price out low-skill labor.',
    tradeoff: '↑ Worker wages but ↑ Unemployment risk'
  },
  {
    id: 'ubi',
    name: 'Universal Basic Income',
    category: 'welfare',
    type: 'slider',
    min: 0,
    max: 500,
    step: 10,
    format: 'currency',
    icon: '🎁',
    description: 'Unconditional payment to all citizens. Eliminates poverty floor. Very expensive.',
    tradeoff: '↑ Equality but ↑↑ Government spending'
  },
  {
    id: 'interestRate',
    name: 'Interest Rate',
    category: 'monetary',
    type: 'slider',
    min: 0,
    max: 0.2,
    step: 0.005,
    format: 'percent',
    icon: '🏦',
    description: 'Cost of borrowing money. High rates fight inflation but slow growth.',
    tradeoff: '↑ Fights inflation but ↓ Business investment'
  },
  {
    id: 'antiMonopoly',
    name: 'Anti-Monopoly Laws',
    category: 'regulation',
    type: 'toggle',
    icon: '⚖️',
    description: 'Break up businesses that dominate a market. Prevents price gouging.',
    tradeoff: '↑ Competition but ↓ Economies of scale'
  },
  {
    id: 'educationFunding',
    name: 'Education Spending',
    category: 'public',
    type: 'slider',
    min: 0,
    max: 1,
    step: 0.05,
    format: 'percent',
    icon: '📚',
    description: 'Invests in workforce quality over time. Slow payoff, lasting effect.',
    tradeoff: '↑ Long-term productivity but ↑ Government spending now'
  },
  {
    id: 'unemploymentBenefit',
    name: 'Unemployment Benefits',
    category: 'welfare',
    type: 'slider',
    min: 0,
    max: 300,
    step: 10,
    format: 'currency',
    icon: '🛡️',
    description: 'Payments to unemployed workers. Maintains demand but may reduce job search urgency.',
    tradeoff: '↑ Stability but may ↑ Unemployment duration'
  },
  {
    id: 'priceControlFood',
    name: 'Food Price Controls',
    category: 'regulation',
    type: 'toggle',
    icon: '🌾',
    description: 'Caps food prices to protect the poor. May cause shortages if price is too low.',
    tradeoff: '↑ Affordability but ↓ Farm investment'
  },
  {
    id: 'priceControlHousing',
    name: 'Rent Controls',
    category: 'regulation',
    type: 'toggle',
    icon: '🏠',
    description: 'Limits housing rent increases. Helps existing tenants, discourages new supply.',
    tradeoff: '↑ Affordability but ↓ New housing construction'
  },
  {
    id: 'printMoney',
    name: 'Quantitative Easing',
    category: 'monetary',
    type: 'slider',
    min: 0,
    max: 50,
    step: 1,
    format: 'number',
    icon: '🖨️',
    description: 'Inject money into the economy. Boosts demand but causes inflation.',
    tradeoff: '↑ Short-term demand but ↑↑ Inflation risk'
  },
  {
    id: 'publicHealthcare',
    name: 'Public Healthcare',
    category: 'public',
    type: 'toggle',
    icon: '🏥',
    description: 'Government-funded health. Improves health, reduces death rate, increases happiness.',
    tradeoff: '↑ Health + happiness but ↑↑ Government spending'
  },
  {
    id: 'wealthTax',
    name: 'Wealth Tax',
    category: 'fiscal',
    type: 'slider',
    min: 0,
    max: 0.05,
    step: 0.001,
    format: 'percent',
    icon: '💎',
    description: 'Annual tax on total wealth above threshold. Directly reduces inequality.',
    tradeoff: '↑ Equality but ↓ Capital accumulation'
  },
  {
    id: 'openBorders',
    name: 'Open Immigration',
    category: 'labor',
    type: 'toggle',
    icon: '🌍',
    description: 'Allow skilled immigrants. Boosts labor supply and productivity, may suppress wages.',
    tradeoff: '↑ Productivity but ↑ Job competition'
  },
  {
    id: 'subsidiesFarming',
    name: 'Farm Subsidies',
    category: 'fiscal',
    type: 'toggle',
    icon: '🚜',
    description: 'Government support for food production. Lowers food prices but costs taxpayers.',
    tradeoff: '↑ Food supply + lower prices but ↑ Spending'
  },

  // ─── Weird Laws ──────────────────────────────────────────────────────────────
  {
    id: 'fourDayWeek',
    name: '4-Day Work Week',
    category: 'weird',
    type: 'toggle',
    icon: '🗓️',
    description: 'Mandate a 4-day work week for all businesses. Workers are happier and healthier — but businesses get 20% less output per worker.',
    tradeoff: '↑ Worker health & morale but ↓ Business productivity'
  },
  {
    id: 'robotTax',
    name: 'Robot Tax',
    category: 'weird',
    type: 'slider',
    min: 0,
    max: 0.5,
    step: 0.05,
    format: 'percent',
    icon: '🤖',
    description: 'Tax on automated production in the tech sector. Slows job displacement and funds redistribution.',
    tradeoff: '↑ Employment but ↓ Tech sector growth'
  },
  {
    id: 'breadAndCircuses',
    name: 'Bread & Circuses',
    category: 'weird',
    type: 'toggle',
    icon: '🎪',
    description: 'Government-funded free food and entertainment for all. Romans used it to keep the masses pacified. Crushes unrest — briefly.',
    tradeoff: '↓ Unrest now but ↑ Gov spending + dependency risk'
  },
  {
    id: 'mandatoryProfitShare',
    name: 'Mandatory Profit Sharing',
    category: 'weird',
    type: 'slider',
    min: 0,
    max: 0.3,
    step: 0.05,
    format: 'percent',
    icon: '🤝',
    description: 'Businesses must share a percentage of profits with all employees. Reduces inequality, may deter investment.',
    tradeoff: '↑ Worker wealth + lower Gini but ↓ Business capital'
  },
  {
    id: 'landValueTax',
    name: 'Land Value Tax',
    category: 'weird',
    type: 'slider',
    min: 0,
    max: 0.05,
    step: 0.005,
    format: 'percent',
    icon: '🌍',
    description: 'Annual tax on land value only (not buildings). Georgist reform — discourages speculation, funds government efficiently.',
    tradeoff: '↑ Gov revenue + lower housing prices but unpopular with landowners'
  },
  {
    id: 'banAdvertising',
    name: 'Ban Advertising',
    category: 'weird',
    type: 'toggle',
    icon: '🚫',
    description: 'Outlaws all commercial advertising. Luxury demand collapses. People only buy what they actually need. Businesses struggle to grow.',
    tradeoff: '↓ Luxury consumption + lower Gini but ↓ Business growth'
  },
  {
    id: 'debtJubilee',
    name: 'Debt Jubilee',
    category: 'weird',
    type: 'toggle',
    icon: '🎺',
    description: 'One-time Biblical-style cancellation of all debts. Agents with negative wealth are reset to zero. Happens once then turns off.',
    tradeoff: 'Massive one-time equality reset — may destabilize lenders'
  },
  {
    id: 'lotteryRedistribution',
    name: 'Wealth Lottery',
    category: 'weird',
    type: 'toggle',
    icon: '🎰',
    description: 'Each tick, a random wealthy citizen pays a "luck tax" directly to a random poor citizen. Chaotic but surprisingly equalizing.',
    tradeoff: '↓ Extreme wealth concentration but unpredictable and arbitrary'
  },
  {
    id: 'sumptuary',
    name: 'Sumptuary Laws',
    category: 'weird',
    type: 'toggle',
    icon: '👑',
    description: 'Legal limits on luxury spending for the wealthy. Medieval kings used these. Luxury sector collapses but inequality drops.',
    tradeoff: '↓ Inequality + ↓ Gini but luxury sector destruction'
  },
  {
    id: 'degrowth',
    name: 'Degrowth Policy',
    category: 'weird',
    type: 'toggle',
    icon: '🌱',
    description: 'Deliberately slow economic growth. Less GDP obsession means less stress, more stability, better health — but economists freak out.',
    tradeoff: '↓ GDP growth + ↑ Health & stability but controversial'
  },
  {
    id: 'algoCentralPlanning',
    name: 'Algorithmic Planning',
    category: 'weird',
    type: 'toggle',
    icon: '🧮',
    description: 'An AI algorithm sets all prices and wages. Eliminates market volatility. Cold, efficient, and slightly dystopian.',
    tradeoff: '↓ Price chaos but removes market discovery + creepy'
  },
  {
    id: 'universalBankAccount',
    name: 'Universal Bank Account',
    category: 'weird',
    type: 'toggle',
    icon: '🏧',
    description: 'Every citizen gets a free government bank account. Reduces financial exclusion, enables direct transfers, improves savings rates.',
    tradeoff: '↑ Financial inclusion + savings but ↑ Gov infrastructure cost'
  }
]

export const POLICY_CATEGORIES = {
  fiscal: { label: 'Fiscal Policy', color: '#3b82f6' },
  monetary: { label: 'Monetary Policy', color: '#f59e0b' },
  labor: { label: 'Labor Market', color: '#22c55e' },
  welfare: { label: 'Welfare', color: '#ec4899' },
  regulation: { label: 'Regulation', color: '#8b5cf6' },
  public: { label: 'Public Services', color: '#06b6d4' },
  weird: { label: '⚗️ Weird Laws', color: '#f97316' }
}
