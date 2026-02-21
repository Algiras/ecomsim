import { useMemo } from 'react'

const STATUS_COLORS = {
  employed: '#22c55e',
  unemployed: '#f59e0b',
  poor: '#ef4444',
  child: '#64748b',
  retired: '#8b5cf6',
  owner: '#6366f1'
}

const SECTOR_COLORS = {
  food: '#22c55e',
  housing: '#06b6d4',
  tech: '#6366f1',
  luxury: '#f59e0b'
}

export default function EconomyIndicator({ simState }) {
  const agentStats = useMemo(() => {
    if (!simState?.agents) return null
    const alive = simState.agents.filter(a => a.alive)
    return {
      total: alive.length,
      employed: alive.filter(a => a.state === 'working').length,
      unemployed: alive.filter(a => a.state === 'unemployed').length,
      poor: alive.filter(a => a.socialClass === 'poor').length,
      owners: alive.filter(a => a.state === 'owner').length,
      children: alive.filter(a => a.state === 'child').length,
      retired: alive.filter(a => a.state === 'retired').length
    }
  }, [simState?.agents])

  const bizStats = useMemo(() => {
    if (!simState?.businesses) return {}
    const alive = simState.businesses.filter(b => b.alive)
    const counts = {}
    for (const b of alive) {
      counts[b.sector] = (counts[b.sector] || 0) + 1
    }
    return counts
  }, [simState?.businesses])

  const crimeLevel = useMemo(() => {
    if (!simState?.metrics) return 'none'
    const rate = simState.metrics.crimeRate || 0
    if (rate > 0.5) return 'high'
    if (rate > 0.1) return 'medium'
    if (rate > 0) return 'low'
    return 'none'
  }, [simState?.metrics])

  const bankHealth = useMemo(() => {
    if (!simState?.banks) return 'none'
    const alive = simState.banks.filter(b => b.alive)
    if (alive.length === 0) return 'critical'
    const avgNPL = alive.reduce((s, b) => s + b.nonPerformingRate, 0) / alive.length
    if (avgNPL > 0.3) return 'danger'
    if (avgNPL > 0.1) return 'warning'
    return 'healthy'
  }, [simState?.banks])

  if (!agentStats) return null

  const bankColor = {
    healthy: '#22c55e', warning: '#f59e0b', danger: '#ef4444', critical: '#dc2626', none: '#475569'
  }[bankHealth]

  return (
    <div className="bg-[#0d0d14] border-b border-[#1e1e2e] px-4 py-2 flex items-center gap-4">
      {/* Population bar */}
      <div className="flex-1 flex items-center gap-2">
        <span className="text-[10px] font-mono text-[#475569] uppercase w-12 flex-shrink-0">Pop</span>
        <div className="flex-1 flex h-4 rounded overflow-hidden gap-px">
          {agentStats.total > 0 && (
            <>
              <div
                className="h-full transition-all duration-500"
                style={{ width: `${(agentStats.employed / agentStats.total) * 100}%`, backgroundColor: STATUS_COLORS.employed }}
                title={`Employed: ${agentStats.employed}`}
              />
              <div
                className="h-full transition-all duration-500"
                style={{ width: `${(agentStats.owners / agentStats.total) * 100}%`, backgroundColor: STATUS_COLORS.owner }}
                title={`Owners: ${agentStats.owners}`}
              />
              <div
                className="h-full transition-all duration-500"
                style={{ width: `${(agentStats.unemployed / agentStats.total) * 100}%`, backgroundColor: STATUS_COLORS.unemployed }}
                title={`Unemployed: ${agentStats.unemployed}`}
              />
              <div
                className="h-full transition-all duration-500"
                style={{ width: `${(agentStats.retired / agentStats.total) * 100}%`, backgroundColor: STATUS_COLORS.retired }}
                title={`Retired: ${agentStats.retired}`}
              />
              <div
                className="h-full transition-all duration-500"
                style={{ width: `${(agentStats.children / agentStats.total) * 100}%`, backgroundColor: STATUS_COLORS.child }}
                title={`Children: ${agentStats.children}`}
              />
            </>
          )}
        </div>
        <span className="text-xs font-mono text-[#94a3b8] w-8 text-right">{agentStats.total}</span>
      </div>

      {/* Business blocks */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-mono text-[#475569] uppercase">Biz</span>
        {['food', 'housing', 'tech', 'luxury'].map(sector => (
          <div
            key={sector}
            className="flex items-center gap-0.5"
            title={`${sector}: ${bizStats[sector] || 0}`}
          >
            <div
              className="w-2.5 h-2.5 rounded-sm"
              style={{ backgroundColor: SECTOR_COLORS[sector], opacity: (bizStats[sector] || 0) > 0 ? 1 : 0.2 }}
            />
            <span className="text-[10px] font-mono text-[#64748b]">{bizStats[sector] || 0}</span>
          </div>
        ))}
      </div>

      {/* Bank health */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-mono text-[#475569] uppercase">Banks</span>
        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: bankColor }} />
        <span className="text-[10px] font-mono" style={{ color: bankColor }}>
          {simState?.banks?.filter(b => b.alive).length || 0}
        </span>
      </div>

      {/* Crime level */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-mono text-[#475569] uppercase">Crime</span>
        <div className="w-2.5 h-2.5 rounded-full" style={{
          backgroundColor: { none: '#475569', low: '#22c55e', medium: '#f59e0b', high: '#ef4444' }[crimeLevel]
        }} />
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 text-[9px] font-mono text-[#475569]">
        <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full inline-block" style={{background: STATUS_COLORS.employed}} /> work</span>
        <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full inline-block" style={{background: STATUS_COLORS.unemployed}} /> idle</span>
        <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full inline-block" style={{background: STATUS_COLORS.owner}} /> own</span>
      </div>
    </div>
  )
}
