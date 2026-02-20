// Historical outcomes — what actually happened in each crisis
// Used in the Report Card "You vs History" comparison

export const HISTORICAL_BASELINES = {
  greatDepression: {
    summary: 'The US experienced 10 years of contraction. GDP fell 46% peak-to-trough. Unemployment peaked at 25% in 1933. Deflation wiped out savings.',
    turningPoint: 'FDR\'s New Deal (1933): bank reform, work programs (CCC, WPA), agricultural relief, and abandoning the gold standard.',
    whatWorked: 'Government spending restarted demand. Banking reform restored confidence. Devaluing the dollar stopped deflation.',
    whatFailed: 'Initial Hoover austerity and Smoot-Hawley tariffs deepened the slump. Balanced-budget orthodoxy was catastrophically wrong.',
    historicalGrade: 'D+',
    metrics: {
      gdpChangePercent: -46,
      peakUnemployment: 25,
      inflationAvg: -6,
      gini: 0.63,
      povertyRate: 35,
      recoveryYears: 10
    },
    quote: '"The only thing we have to fear is fear itself." — FDR, 1933'
  },

  weimarHyperinflation: {
    summary: 'Germany printed money to pay WWI reparations. By Nov 1923 a loaf of bread cost 200 billion marks. The middle class was wiped out.',
    turningPoint: 'The Rentenmark (Nov 1923): a new currency backed by land assets, issued by an independent body. Printing stopped cold.',
    whatWorked: 'Completely stopping money creation. Issuing a credible new currency. International loans (Dawes Plan) stabilized reparations.',
    whatFailed: 'There was no painless exit. Savings were permanently destroyed. The political fallout helped fuel the rise of extremism.',
    historicalGrade: 'C',
    metrics: {
      gdpChangePercent: -25,
      peakUnemployment: 30,
      inflationAvg: 29500,
      gini: 0.70,
      povertyRate: 45,
      recoveryYears: 6
    },
    quote: '"Inflation is the most important single factor in the politico-economic history of the Weimar Republic." — Adam Fergusson'
  },

  stagflation1970s: {
    summary: 'OPEC oil embargo (1973) triggered both high inflation AND high unemployment simultaneously — violating Keynesian assumptions.',
    turningPoint: 'Volcker Shock (1979–82): Federal Reserve raised rates to 20%, deliberately causing a recession to break inflationary expectations.',
    whatWorked: 'Aggressive interest rate hikes eventually tamed inflation. Supply-side reforms improved productivity.',
    whatFailed: 'Wage-price controls (Nixon 1971) temporarily masked inflation then made it worse. Easy money in the early 70s was a mistake.',
    historicalGrade: 'C+',
    metrics: {
      gdpChangePercent: -3,
      peakUnemployment: 13,
      inflationAvg: 11,
      gini: 0.40,
      povertyRate: 15,
      recoveryYears: 8
    },
    quote: '"Inflation is always and everywhere a monetary phenomenon." — Milton Friedman'
  },

  crisisOf2008: {
    summary: 'US housing bubble collapsed. Lehman Brothers failed Sep 2008. Global credit froze. Worst recession since the Great Depression.',
    turningPoint: 'TARP bank bailouts ($700B), Fed QE programs ($4T), Obama stimulus ($787B). Slow but sustained recovery 2009–2019.',
    whatWorked: 'Massive fiscal stimulus, quantitative easing, and bank recapitalization prevented a second Great Depression.',
    whatFailed: 'Austerity in Europe caused a double-dip recession. Too little debt relief for homeowners prolonged household balance sheet repair.',
    historicalGrade: 'B-',
    metrics: {
      gdpChangePercent: -4.3,
      peakUnemployment: 10,
      inflationAvg: 1.5,
      gini: 0.47,
      povertyRate: 15,
      recoveryYears: 6
    },
    quote: '"We came very close to a complete collapse of the financial system." — Ben Bernanke'
  },

  japanLostDecade: {
    summary: 'Japan\'s asset bubble burst in 1991. Despite near-zero rates and stimulus, GDP stagnated for 20+ years. Deflation became entrenched.',
    turningPoint: 'Abenomics (2012): aggressive QE, fiscal stimulus, structural reforms. Partially effective — ended deflation but growth remained weak.',
    whatWorked: 'Eventually: currency devaluation, quantitative easing at scale, negative interest rates.',
    whatFailed: 'Years of half-measures and zombie bank forbearance. Failure to force bad debt write-offs kept the economy in stasis.',
    historicalGrade: 'D',
    metrics: {
      gdpChangePercent: 10,
      peakUnemployment: 5.5,
      inflationAvg: -0.2,
      gini: 0.34,
      povertyRate: 16,
      recoveryYears: 20
    },
    quote: '"Japan\'s experience suggests that it\'s very hard to escape deflation once it becomes entrenched." — Ben Bernanke'
  },

  nordicMiracle: {
    summary: 'Nordic countries (esp. Sweden 1990s) combined high taxes, strong unions, universal welfare, and open markets into sustained prosperity.',
    turningPoint: 'Sweden\'s 1990s bank crisis resolution: swift bank nationalization, transparent debt writedowns, then re-privatization. Full recovery in 3 years.',
    whatWorked: 'Universal education and healthcare create a productive workforce. Strong safety nets allow risk-taking. Transparent institutions reduce corruption.',
    whatFailed: 'Model requires high trust, homogeneity, and strong institutions to function. Difficult to replicate in larger, more diverse economies.',
    historicalGrade: 'A',
    metrics: {
      gdpChangePercent: 35,
      peakUnemployment: 8,
      inflationAvg: 2.1,
      gini: 0.27,
      povertyRate: 8,
      recoveryYears: 3
    },
    quote: '"The Nordic model is not socialism. It\'s a highly competitive market economy with strong social insurance." — Daron Acemoglu'
  }
}

export function getHistoricalBaseline(scenarioId) {
  return HISTORICAL_BASELINES[scenarioId] || null
}
