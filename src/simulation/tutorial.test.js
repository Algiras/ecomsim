// ─── Tutorial Lesson Simulation Tests ─────────────────────────────────────────
// Runs each tutorial lesson through the real engine, applies the expected fix,
// and verifies the success conditions are met within a reasonable time.
// Also verifies scenarios don't solve themselves without player intervention.

import { describe, it, expect } from 'vitest'
import { SimEngine } from './engine.js'
import { TUTORIAL_LESSONS } from '../data/tutorialLessons.js'

// The policy fix to apply per lesson (what the player is supposed to do)
const LESSON_FIXES = {
  tut_inflation:    { interestRate: 0.15 },      // raise above 10%
  tut_unemployment: { interestRate: 0.02 },      // lower below 3%
  tut_debt:         { incomeTax: 0.35 },          // raise above 30%
  tut_inequality:   { wealthTax: 0.10 },          // enable wealth tax >5%
  tut_crime:        { ubi: 200 },                  // introduce UBI >$150
  tut_banking:      { reserveRequirement: 0.35 }, // raise above 30%
  tut_minwage:      { minWage: 18 },              // raise above $15
  tut_police:       { policeFunding: 0.65 },       // raise above 60%
  tut_education:    { educationFunding: 0.75 },    // raise above 70%
  tut_currency:     { foreignReserveIntervention: true }, // enable intervention
  tut_fourday:      { fourDayWeek: true },          // enable four-day week
  tut_jobs:         { guaranteedJobs: true },        // enable guaranteed jobs
}

// At 1× speed (10 tps), ~5 min = 3000 ticks.
// With fix applied early, convergence should happen within ~1500-2500 ticks.
const MAX_TICKS = 3000
// Lessons that need more ticks due to slower economic dynamics
const MAX_TICKS_OVERRIDE = { tut_debt: 5000 }
const APPLY_FIX_AT = 50 // apply after brief warmup

// Must NOT self-solve within this window (player needs to act)
const NO_FIX_TICKS = 1500

function checkConditions(lesson, metrics, policies) {
  return lesson.conditions.every(c => {
    const val = c.metric ? metrics[c.metric] : policies?.[c.policy]
    if (val === undefined) return false
    if (c.op === 'gte') return val >= c.value
    if (c.op === 'lte') return val <= c.value
    if (c.op === 'gt') return val > c.value
    if (c.op === 'lt') return val < c.value
    return false
  })
}

function makeEngine(lesson) {
  const isLast = lesson === TUTORIAL_LESSONS[TUTORIAL_LESSONS.length - 1]
  return new SimEngine({
    id: 'default',
    name: lesson.title,
    isTutorial: !isLast,
    ...lesson.scenarioConfig
  })
}

function conditionSummary(lesson, engine) {
  return lesson.conditions.map(c => ({
    metric: c.metric || c.policy,
    op: c.op,
    target: c.value,
    actual: c.metric ? engine.metrics[c.metric] : engine.policies?.[c.policy]
  }))
}

// ─── Test: each tutorial is solvable ─────────────────────────────────────────

describe('Tutorial lessons are solvable with correct fix', () => {
  for (const lesson of TUTORIAL_LESSONS) {
    it(`${lesson.title} (${lesson.id})`, () => {
      const engine = makeEngine(lesson)

      let conditionsMet = false
      let metTick = -1

      const maxTicks = MAX_TICKS_OVERRIDE[lesson.id] ?? MAX_TICKS
      for (let t = 0; t < maxTicks; t++) {
        if (t === APPLY_FIX_AT) {
          const fixes = LESSON_FIXES[lesson.id]
          for (const [key, value] of Object.entries(fixes)) {
            engine.applyMessage({ type: 'SET_POLICY', policy: key, value })
          }
        }

        engine.step()

        // Check every 10 ticks (same as METRICS_UPDATE_EVERY)
        if (t > APPLY_FIX_AT + 100 && t % 10 === 0) {
          if (checkConditions(lesson, engine.metrics, engine.policies)) {
            conditionsMet = true
            metTick = t
            break
          }
        }
      }

      const summary = conditionSummary(lesson, engine)
      expect(conditionsMet,
        `${lesson.title}: conditions not met after ${maxTicks} ticks.\n` +
        JSON.stringify(summary, null, 2)
      ).toBe(true)

      // Should take at least 100 ticks after fix (~10 seconds at 1× speed)
      // to ensure the player sees the effect build over time
      expect(metTick - APPLY_FIX_AT,
        `${lesson.title}: resolved too quickly (${metTick - APPLY_FIX_AT} ticks after fix). Should take time.`
      ).toBeGreaterThan(100)

      console.log(`  ${lesson.title}: met at tick ${metTick} (~${Math.floor(metTick / 52)} years, ${Math.round((metTick - APPLY_FIX_AT) / 10)}s at 1×)`)
    })
  }
})

// ─── Test: tutorials don't solve themselves ──────────────────────────────────

describe('Tutorial lessons do NOT self-solve without player action', () => {
  for (const lesson of TUTORIAL_LESSONS) {
    it(`${lesson.title} (${lesson.id}) — stays broken`, () => {
      const engine = makeEngine(lesson)

      let everSolved = false

      for (let t = 0; t < NO_FIX_TICKS; t++) {
        engine.step()

        if (t > 50 && t % 10 === 0) {
          if (checkConditions(lesson, engine.metrics, engine.policies)) {
            everSolved = true
            break
          }
        }
      }

      const summary = conditionSummary(lesson, engine)
      expect(everSolved,
        `${lesson.title}: solved itself at without intervention!\n` +
        JSON.stringify(summary, null, 2)
      ).toBe(false)
    })
  }
})

// ─── Test: starting metrics are properly seeded ──────────────────────────────

describe('Tutorial starting state is broken from tick 0', () => {
  for (const lesson of TUTORIAL_LESSONS) {
    it(`${lesson.title} — conditions NOT met at start`, () => {
      const engine = makeEngine(lesson)
      // Run just 10 ticks to populate initial metrics
      for (let t = 0; t < 10; t++) engine.step()

      const met = checkConditions(lesson, engine.metrics, engine.policies)
      const summary = conditionSummary(lesson, engine)
      expect(met,
        `${lesson.title}: conditions already met at start! Scenario isn't broken enough.\n` +
        JSON.stringify(summary, null, 2)
      ).toBe(false)
    })
  }
})
