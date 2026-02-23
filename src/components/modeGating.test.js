// ─── Mode-Based Control Gating Tests ─────────────────────────────────────────
// Verifies that each game mode correctly gates policies, tabs, and UI elements.

import { describe, it, expect } from 'vitest'
import { SECTION_ORDER, SECTION_META, SECTION_POLICIES, SECTION_UNLOCK } from './Dashboard.jsx'
import { TUTORIAL_LESSONS } from '../data/tutorialLessons.js'

// ─── Helper: replicates the SectionContent gating logic ──────────────────────

function getVisiblePolicies(section, gameMode, tutorialLesson = null) {
  const allIds = SECTION_POLICIES[section] || []

  if (gameMode === 'story' || gameMode === 'historical') {
    return [] // no policies in story/historical
  }

  if (gameMode === 'tutorial' && tutorialLesson) {
    return allIds.filter(id => id === tutorialLesson.highlightPolicy)
  }

  return allIds // freeplay: all policies
}

// ─── Helper: replicates the Header tab filtering logic ───────────────────────

function tutorialTabSection(lesson) {
  if (!lesson) return null
  const section = lesson.section
  if (SECTION_ORDER.includes(section)) return section
  for (const [sec, ids] of Object.entries(SECTION_POLICIES)) {
    if (ids.includes(lesson.highlightPolicy)) return sec
  }
  return null
}

function getVisibleTabs(gameMode, tutorialLesson = null, unlockedSections = new Set(SECTION_ORDER)) {
  return SECTION_ORDER.filter(section => {
    if (gameMode === 'tutorial' && tutorialLesson) {
      const tutTab = tutorialTabSection(tutorialLesson)
      return section === tutTab
    }
    return true
  })
}

function showHealthDots(gameMode) {
  return gameMode !== 'story' && gameMode !== 'historical'
}

function showVitalSigns(gameMode) {
  return gameMode !== 'tutorial'
}

// ─── Free Play ───────────────────────────────────────────────────────────────

describe('Free Play mode', () => {
  const mode = 'freeplay'

  it('shows all 7 tabs', () => {
    const tabs = getVisibleTabs(mode)
    expect(tabs).toEqual(SECTION_ORDER)
    expect(tabs).toHaveLength(7)
  })

  it('shows all policies for each section', () => {
    for (const section of SECTION_ORDER) {
      const visible = getVisiblePolicies(section, mode)
      expect(visible).toEqual(SECTION_POLICIES[section])
      expect(visible.length).toBeGreaterThan(0)
    }
  })

  it('shows health dots on tabs', () => {
    expect(showHealthDots(mode)).toBe(true)
  })

  it('shows VitalSigns strip', () => {
    expect(showVitalSigns(mode)).toBe(true)
  })

  it('total policy count across all sections is 42', () => {
    const total = SECTION_ORDER.reduce((sum, s) => sum + SECTION_POLICIES[s].length, 0)
    expect(total).toBe(42)
  })
})

// ─── Tutorial Mode ───────────────────────────────────────────────────────────

describe('Tutorial mode', () => {
  const mode = 'tutorial'

  it('shows only 1 tab per lesson', () => {
    for (const lesson of TUTORIAL_LESSONS) {
      const tabs = getVisibleTabs(mode, lesson)
      expect(tabs).toHaveLength(1)
    }
  })

  it('tab matches the section containing the highlighted policy', () => {
    for (const lesson of TUTORIAL_LESSONS) {
      const tabs = getVisibleTabs(mode, lesson)
      const tab = tabs[0]
      // The highlighted policy must exist in that tab's policies
      expect(SECTION_POLICIES[tab]).toContain(lesson.highlightPolicy)
    }
  })

  it('shows only 1 policy slider (the highlighted one) per lesson', () => {
    for (const lesson of TUTORIAL_LESSONS) {
      const tab = getVisibleTabs(mode, lesson)[0]
      const visible = getVisiblePolicies(tab, mode, lesson)
      expect(visible).toHaveLength(1)
      expect(visible[0]).toBe(lesson.highlightPolicy)
    }
  })

  it('other sections show 0 policies', () => {
    for (const lesson of TUTORIAL_LESSONS) {
      const activeTab = getVisibleTabs(mode, lesson)[0]
      for (const section of SECTION_ORDER) {
        if (section === activeTab) continue
        const visible = getVisiblePolicies(section, mode, lesson)
        // Other sections won't have the highlighted policy, so should be empty
        if (!SECTION_POLICIES[section].includes(lesson.highlightPolicy)) {
          expect(visible).toHaveLength(0)
        }
      }
    }
  })

  it('hides VitalSigns strip', () => {
    expect(showVitalSigns(mode)).toBe(false)
  })

  it('hides health dots (only 1 tab so moot, but still)', () => {
    // In tutorial, health dots are shown but only 1 tab is visible
    expect(showHealthDots(mode)).toBe(true)
  })

  it('poverty trap lesson maps to inequality tab', () => {
    const povertyLesson = TUTORIAL_LESSONS.find(l => l.id === 'tut_crime')
    expect(povertyLesson).toBeDefined()
    expect(povertyLesson.section).toBe('inequality')
    const tabs = getVisibleTabs(mode, povertyLesson)
    expect(tabs).toEqual(['inequality'])
    expect(SECTION_POLICIES.inequality).toContain(povertyLesson.highlightPolicy)
  })
})

// ─── Story Mode ──────────────────────────────────────────────────────────────

describe('Story mode', () => {
  const mode = 'story'

  it('shows all 7 tabs (for metrics/chart navigation)', () => {
    const tabs = getVisibleTabs(mode)
    expect(tabs).toEqual(SECTION_ORDER)
    expect(tabs).toHaveLength(7)
  })

  it('shows 0 policies for every section', () => {
    for (const section of SECTION_ORDER) {
      const visible = getVisiblePolicies(section, mode)
      expect(visible).toHaveLength(0)
    }
  })

  it('hides health dots on tabs', () => {
    expect(showHealthDots(mode)).toBe(false)
  })

  it('shows VitalSigns strip', () => {
    expect(showVitalSigns(mode)).toBe(true)
  })
})

// ─── Historical Mode ────────────────────────────────────────────────────────

describe('Historical mode', () => {
  const mode = 'historical'

  it('shows all 7 tabs', () => {
    const tabs = getVisibleTabs(mode)
    expect(tabs).toEqual(SECTION_ORDER)
    expect(tabs).toHaveLength(7)
  })

  it('shows 0 policies for every section', () => {
    for (const section of SECTION_ORDER) {
      const visible = getVisiblePolicies(section, mode)
      expect(visible).toHaveLength(0)
    }
  })

  it('hides health dots on tabs', () => {
    expect(showHealthDots(mode)).toBe(false)
  })

  it('shows VitalSigns strip', () => {
    expect(showVitalSigns(mode)).toBe(true)
  })

  it('behaves identically to story mode for policies', () => {
    for (const section of SECTION_ORDER) {
      expect(getVisiblePolicies(section, 'historical'))
        .toEqual(getVisiblePolicies(section, 'story'))
    }
  })
})

// ─── Cross-mode consistency ─────────────────────────────────────────────────

describe('Cross-mode consistency', () => {
  it('every tutorial lesson has a valid highlightPolicy that exists in some section', () => {
    const allPolicies = new Set(Object.values(SECTION_POLICIES).flat())
    for (const lesson of TUTORIAL_LESSONS) {
      expect(allPolicies.has(lesson.highlightPolicy)).toBe(true)
    }
  })

  it('SECTION_ORDER matches SECTION_META keys', () => {
    for (const section of SECTION_ORDER) {
      expect(SECTION_META[section]).toBeDefined()
      expect(SECTION_META[section].title).toBeTruthy()
      expect(SECTION_META[section].icon).toBeTruthy()
    }
  })

  it('all sections in SECTION_ORDER have policies defined', () => {
    for (const section of SECTION_ORDER) {
      expect(SECTION_POLICIES[section]).toBeDefined()
      expect(SECTION_POLICIES[section].length).toBeGreaterThan(0)
    }
  })

  it('all sections have unlock conditions', () => {
    for (const section of SECTION_ORDER) {
      expect(SECTION_UNLOCK[section]).toBeDefined()
    }
  })
})
