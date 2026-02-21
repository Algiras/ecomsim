// Diagnostic test — print actual metric values for each tutorial scenario
import { describe, it } from 'vitest'
import { SimEngine } from './engine.js'
import { TUTORIAL_LESSONS } from '../data/tutorialLessons.js'

const LESSON_FIXES = {
  tut_inflation:    { interestRate: 0.15 },
  tut_unemployment: { interestRate: 0.02 },
  tut_debt:         { incomeTax: 0.35 },
  tut_inequality:   { wealthTax: 0.10 },
  tut_crime:        { ubi: 200 },
  tut_banking:      { reserveRequirement: 0.35 },
  tut_minwage:      { minWage: 18 },
  tut_police:       { policeFunding: 0.65 },
  tut_education:    { educationFunding: 0.75 },
  tut_currency:     { foreignReserveIntervention: true },
  tut_fourday:      { fourDayWeek: true },
  tut_jobs:         { guaranteedJobs: true },
}

function trace(label, engine, lesson) {
  const m = engine.metrics
  const conds = lesson.conditions.map(c => {
    const val = c.metric ? m[c.metric] : engine.policies?.[c.policy]
    return `${c.metric||c.policy}=${typeof val === 'number' ? val.toFixed(4) : val} ${c.op} ${c.value}`
  }).join(', ')
  console.log(`  ${label}: ${conds} | biz=${m.businessCount} pop=${m.population} unemp=${(m.unemployment*100).toFixed(1)}% gini=${m.gini?.toFixed(3)} cpi=${m.cpi?.toFixed(0)} poverty=${(m.povertyRate*100).toFixed(1)}% crime=${m.crimeRate?.toFixed(1)} debt=${m.govDebt?.toFixed(0)}`)
}

describe('Diagnostic — WITH fix', () => {
  for (const lesson of TUTORIAL_LESSONS) {
    it(`${lesson.id}`, () => {
      const isLast = lesson === TUTORIAL_LESSONS[TUTORIAL_LESSONS.length - 1]
      const engine = new SimEngine({
        id: 'default', name: lesson.title,
        isTutorial: !isLast,
        ...lesson.scenarioConfig
      })
      for (let t = 0; t < 3000; t++) {
        if (t === 50) {
          const fixes = LESSON_FIXES[lesson.id]
          for (const [key, value] of Object.entries(fixes)) {
            engine.applyMessage({ type: 'SET_POLICY', policy: key, value })
          }
        }
        engine.step()
        if (t % 500 === 0 || t === 50 || t === 200 || t === 1000) {
          trace(`t=${t}`, engine, lesson)
        }
      }
    })
  }
})

describe('Diagnostic — WITHOUT fix (self-solve check)', () => {
  for (const lesson of TUTORIAL_LESSONS) {
    it(`${lesson.id} — no fix`, () => {
      const isLast = lesson === TUTORIAL_LESSONS[TUTORIAL_LESSONS.length - 1]
      const engine = new SimEngine({
        id: 'default', name: lesson.title,
        isTutorial: !isLast,
        ...lesson.scenarioConfig
      })
      for (let t = 0; t < 1500; t++) {
        engine.step()
        if (t % 500 === 0 || t === 200 || t === 1000) {
          trace(`t=${t}`, engine, lesson)
        }
      }
    })
  }
})
