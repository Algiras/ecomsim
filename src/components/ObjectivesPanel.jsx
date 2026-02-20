export default function ObjectivesPanel({ objectives = [], scenarioDurationYears, year, scenarioName }) {
  if (!objectives.length) return (
    <div className="text-[#334155] text-xs font-mono p-2 text-center">
      No objectives in sandbox mode.<br/>
      <span className="text-[#475569]">Pick a Historical Crisis for a timed challenge.</span>
    </div>
  )

  const yearsLeft = scenarioDurationYears ? Math.max(0, scenarioDurationYears - (year || 0)) : null
  const completedCount = objectives.filter(o => o.completed).length

  return (
    <div className="flex flex-col gap-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-[#64748b] text-xs font-mono">
          {completedCount}/{objectives.length} objectives met
        </div>
        {yearsLeft !== null && (
          <div className={`text-xs font-mono font-bold ${yearsLeft < 3 ? 'text-[#ef4444]' : 'text-[#94a3b8]'}`}>
            {yearsLeft}yr left
          </div>
        )}
      </div>

      {/* Progress bar for time */}
      {scenarioDurationYears && (
        <div className="w-full bg-[#1e1e2e] rounded-full h-1">
          <div
            className="h-1 rounded-full transition-all duration-500 bg-[#6366f1]"
            style={{ width: `${Math.min(100, ((year || 0) / scenarioDurationYears) * 100)}%` }}
          />
        </div>
      )}

      {/* Objective cards */}
      {objectives.map(obj => {
        const statusColor = obj.completed ? '#22c55e' : obj.met ? '#f59e0b' : '#ef4444'
        const statusLabel = obj.completed ? 'Complete' : obj.met ? 'Active…' : 'Not met'
        return (
          <div
            key={obj.id}
            className="bg-[#12121a] border rounded-lg p-3"
            style={{ borderColor: statusColor + '44' }}
          >
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-1.5 text-xs font-mono text-[#e2e8f0]">
                <span>{obj.icon}</span>
                <span>{obj.label}</span>
              </div>
              <span className="text-[10px] font-mono flex-shrink-0" style={{ color: statusColor }}>
                {statusLabel}
              </span>
            </div>

            <div className="text-[10px] text-[#475569] mb-1.5">{obj.description}</div>

            {/* Progress bar */}
            <div className="w-full bg-[#0a0a0f] rounded-full h-1.5 mb-1">
              <div
                className="h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.round(obj.progress * 100)}%`, backgroundColor: statusColor }}
              />
            </div>

            {/* Sustain progress (if actively meeting condition) */}
            {obj.met && !obj.completed && obj.sustainProgress > 0 && (
              <div className="text-[9px] text-[#475569] font-mono">
                Sustaining: {Math.round(obj.sustainProgress * 100)}%
              </div>
            )}

            {/* Tip */}
            {!obj.completed && (
              <div className="text-[9px] text-[#334155] mt-1 leading-tight italic">
                💡 {obj.tip}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
