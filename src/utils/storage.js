// Save/load simulation state via localStorage + URL sharing

const SAVE_KEY = 'ecomsim_save'
const STORY_KEY = 'ecomsim_story'

export function savePolicies(policies) {
  try {
    localStorage.setItem(SAVE_KEY + '_policies', JSON.stringify(policies))
  } catch (e) {
    console.warn('Save failed:', e)
  }
}

export function loadPolicies() {
  try {
    const raw = localStorage.getItem(SAVE_KEY + '_policies')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveScenario(scenarioId) {
  try {
    localStorage.setItem(SAVE_KEY + '_scenario', scenarioId)
  } catch (e) {}
}

export function loadScenario() {
  try {
    return localStorage.getItem(SAVE_KEY + '_scenario') || 'freeMarket'
  } catch {
    return 'freeMarket'
  }
}

// URL sharing: encode policies as compact URL hash
export function policiesToUrlHash(policies) {
  const parts = Object.entries(policies)
    .map(([k, v]) => `${k}:${typeof v === 'boolean' ? (v ? '1' : '0') : v}`)
    .join(',')
  return '#policies=' + encodeURIComponent(parts)
}

export function urlHashToPolicies(hash) {
  if (!hash || !hash.includes('policies=')) return null
  try {
    const raw = decodeURIComponent(hash.replace('#policies=', ''))
    const policies = {}
    for (const part of raw.split(',')) {
      const [k, v] = part.split(':')
      if (v === '1' || v === '0') {
        policies[k] = v === '1'
      } else {
        policies[k] = parseFloat(v)
      }
    }
    return policies
  } catch {
    return null
  }
}

export function getShareUrl(policies) {
  const base = window.location.origin + window.location.pathname
  return base + policiesToUrlHash(policies)
}

// ─── Story mode progress ─────────────────────────────────────────────────────

export function saveStoryProgress(progress) {
  try { localStorage.setItem(STORY_KEY, JSON.stringify(progress)) } catch (e) {}
}

export function loadStoryProgress() {
  try {
    const raw = localStorage.getItem(STORY_KEY)
    return raw ? JSON.parse(raw) : { unlockedChapter: 1, scores: {} }
  } catch {
    return { unlockedChapter: 1, scores: {} }
  }
}

export function resetStoryProgress() {
  try { localStorage.removeItem(STORY_KEY) } catch (e) {}
}

export function copyShareUrl(policies) {
  const url = getShareUrl(policies)
  if (navigator.clipboard) {
    navigator.clipboard.writeText(url)
    return url
  }
  return url
}
