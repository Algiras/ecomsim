// Builds a compact economy context string for the LLM narrator (~150 tokens)

export function buildEconomyContext(simState) {
  if (!simState?.metrics) return null

  const m = simState.metrics
  const parts = []

  // Time
  if (simState.year) parts.push(`Year ${simState.year}`)

  // Key indicators
  const pop = m.population ?? m.alive
  if (pop !== undefined) parts.push(`Population: ${pop}`)

  if (m.gdp !== undefined) {
    const gdpStr = m.gdp >= 1e6 ? `${(m.gdp / 1e6).toFixed(1)}M` : m.gdp >= 1e3 ? `${(m.gdp / 1e3).toFixed(1)}K` : m.gdp.toFixed(0)
    parts.push(`GDP: $${gdpStr}`)
  }

  if (m.gdpGrowth !== undefined) {
    const sign = m.gdpGrowth >= 0 ? '+' : ''
    parts.push(`GDP Growth: ${sign}${(m.gdpGrowth * 100).toFixed(1)}%`)
  }

  if (m.unemployment !== undefined) parts.push(`Unemployment: ${(m.unemployment * 100).toFixed(1)}%`)
  if (m.inflation !== undefined) parts.push(`Inflation: ${(m.inflation * 100).toFixed(1)}%`)
  if (m.gini !== undefined) parts.push(`Gini: ${m.gini.toFixed(2)}`)
  if (m.povertyRate !== undefined) parts.push(`Poverty: ${(m.povertyRate * 100).toFixed(1)}%`)
  if (m.unrest !== undefined) parts.push(`Unrest: ${(m.unrest * 100).toFixed(0)}%`)

  // GDP trend from history
  if (m.gdpHistory?.length >= 3) {
    const recent = m.gdpHistory.slice(-3)
    const trend = recent[2] > recent[0] ? 'rising' : recent[2] < recent[0] ? 'falling' : 'flat'
    parts.push(`GDP trend: ${trend}`)
  }

  // Active events
  if (simState.activeEvents?.length > 0) {
    const eventNames = simState.activeEvents.map(e => e.name || e.type).slice(0, 3)
    parts.push(`Active events: ${eventNames.join(', ')}`)
  }

  // Recent feed headlines (last 3)
  if (simState.econFeed?.length > 0) {
    const headlines = simState.econFeed.slice(-3).map(f => f.text || f).join('; ')
    parts.push(`Recent: ${headlines}`)
  }

  return parts.join('. ') + '.'
}
