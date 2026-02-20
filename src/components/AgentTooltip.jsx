import { wealthColor } from '../rendering/colors.js'

const STATE_LABELS = {
  working: 'Employed',
  unemployed: 'Unemployed',
  child: 'Child',
  retired: 'Retired',
  owner: 'Business Owner',
  dead: 'Deceased'
}

const STATE_COLORS = {
  working: '#22c55e',
  unemployed: '#ef4444',
  child: '#94a3b8',
  retired: '#64748b',
  owner: '#f59e0b',
  dead: '#374151'
}

export default function AgentTooltip({ agent, onClose }) {
  if (!agent) return null

  const ageYears = Math.floor(agent.age / 52)
  const wc = wealthColor(agent.wealth)

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 bg-[#0d0d14] border border-[#1e1e2e] rounded-xl p-4 shadow-2xl max-w-xs w-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded-full border border-white/20"
            style={{ backgroundColor: wc }}
          />
          <span className="text-white font-bold font-mono text-sm">Agent #{agent.id}</span>
        </div>
        <button onClick={onClose} className="text-[#475569] hover:text-white text-sm">✕</button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs mb-3">
        <StatRow label="Age" value={`${ageYears} yrs`} />
        <StatRow
          label="Status"
          value={STATE_LABELS[agent.state] || agent.state}
          color={STATE_COLORS[agent.state]}
        />
        <StatRow
          label="Wealth"
          value={`$${Math.round(agent.wealth)}`}
          color={wc}
        />
        <StatRow
          label="Wage"
          value={agent.wage > 0 ? `$${agent.wage.toFixed(1)}/tick` : '—'}
        />
        <StatRow label="Skill" value={`${(agent.skill * 100).toFixed(0)}%`} />
        <StatRow label="Education" value={`${(agent.education * 100).toFixed(0)}%`} />
        <StatRow label="Health" value={`${(agent.health * 100).toFixed(0)}%`} />
        <StatRow
          label="Happiness"
          value={`${(agent.happiness * 100).toFixed(0)}%`}
          color={agent.happiness > 0.6 ? '#22c55e' : agent.happiness < 0.3 ? '#ef4444' : '#e2e8f0'}
        />
        {agent.jobSector && (
          <StatRow label="Sector" value={agent.jobSector} />
        )}
        <StatRow
          label="Class"
          value={agent.socialClass}
          color={agent.socialClass === 'rich' ? '#f59e0b' : agent.socialClass === 'poor' ? '#ef4444' : '#e2e8f0'}
        />
      </div>

      {/* Life events */}
      {agent.events && agent.events.length > 0 && (
        <div>
          <div className="text-[#475569] text-[10px] uppercase tracking-wider font-mono mb-1.5">
            Life History
          </div>
          <ul className="space-y-0.5 max-h-24 overflow-y-auto">
            {agent.events.map((ev, i) => (
              <li key={i} className="text-[10px] text-[#64748b] font-mono leading-tight">
                • {ev}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function StatRow({ label, value, color }) {
  return (
    <>
      <span className="text-[#475569] font-mono">{label}</span>
      <span className="font-mono font-medium" style={{ color: color || '#e2e8f0' }}>{value}</span>
    </>
  )
}
