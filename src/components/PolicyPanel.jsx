import { useState } from 'react'
import { POLICY_DEFINITIONS, POLICY_CATEGORIES } from '../data/policies.js'

export function PolicySlider({ policy, value, onChange, lagProgress, lagTarget, highlighted }) {
  const fmt = (v) => {
    if (policy.format === 'percent') return (v * 100).toFixed(0) + '%'
    if (policy.format === 'currency') return '$' + v
    return v
  }

  const isPending = lagProgress !== undefined && lagProgress < 1

  return (
    <div className={`group ${highlighted ? 'rounded-lg p-1.5 -m-1.5' : ''}`}
      style={highlighted ? { boxShadow: '0 0 12px #6366f166, inset 0 0 8px #6366f122', border: '1.5px solid #6366f1', background: '#6366f10a' } : undefined}
    >
      <div className="flex justify-between items-center mb-1">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">{policy.icon}</span>
          <span className="text-xs text-[#e2e8f0] font-mono">{policy.name}</span>
          {isPending && (
            <span className="text-[9px] font-mono text-amber-400 bg-amber-400/10 px-1 rounded animate-pulse">
              {Math.round(lagProgress * 100)}%
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs font-bold font-mono text-[#6366f1]">{fmt(value)}</span>
          {isPending && lagTarget !== undefined && (
            <span className="text-[10px] font-mono text-amber-400">
              → {fmt(lagTarget)}
            </span>
          )}
        </div>
      </div>
      <input
        type="range"
        min={policy.min}
        max={policy.max}
        step={policy.step}
        value={isPending && lagTarget !== undefined ? lagTarget : value}
        onChange={(e) => onChange(policy.id, parseFloat(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${((value - policy.min) / (policy.max - policy.min)) * 100}%, ${isPending ? '#f59e0b33' : '#1e1e2e'} ${((value - policy.min) / (policy.max - policy.min)) * 100}%, ${isPending && lagTarget !== undefined ? '#f59e0b33 ' + ((lagTarget - policy.min) / (policy.max - policy.min)) * 100 + '%, #1e1e2e ' + ((lagTarget - policy.min) / (policy.max - policy.min)) * 100 + '%' : '#1e1e2e'} 100%)`
        }}
        title={policy.description}
      />
      {isPending && (
        <div className="w-full bg-[#1e1e2e] rounded-full h-1 mt-1">
          <div className="h-1 rounded-full bg-amber-400 transition-all" style={{ width: `${lagProgress * 100}%` }} />
        </div>
      )}
      <div className="text-[10px] text-[#475569] mt-1 leading-tight">
        {policy.tradeoff}
      </div>
    </div>
  )
}

export function PolicyToggle({ policy, value, onChange, highlighted }) {
  return (
    <div className={`py-0.5 ${highlighted ? 'rounded-lg p-1.5 -m-0.5' : ''}`}
      style={highlighted ? { boxShadow: '0 0 12px #6366f166, inset 0 0 8px #6366f122', border: '1.5px solid #6366f1', background: '#6366f10a' } : undefined}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-sm flex-shrink-0">{policy.icon}</span>
          <span className="text-xs text-[#e2e8f0] font-mono truncate">{policy.name}</span>
        </div>
        <button
          onClick={() => onChange(policy.id, !value)}
          className="flex-shrink-0 ml-2"
          style={{
            position: 'relative',
            width: 36,
            height: 20,
            borderRadius: 10,
            backgroundColor: value ? '#6366f1' : '#1e1e2e',
            border: value ? '2px solid #6366f1' : '2px solid #475569',
            cursor: 'pointer',
            transition: 'background-color 0.2s, border-color 0.2s'
          }}
        >
          <span
            style={{
              position: 'absolute',
              top: 2,
              left: value ? 16 : 2,
              width: 12,
              height: 12,
              borderRadius: '50%',
              backgroundColor: value ? '#fff' : '#94a3b8',
              boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
              transition: 'left 0.2s'
            }}
          />
        </button>
      </div>
      <div className="text-[10px] text-[#475569] mt-1 leading-tight">
        {policy.tradeoff}
      </div>
    </div>
  )
}

export default function PolicyPanel({ policies, onPolicyChange }) {
  const [activeCategory, setActiveCategory] = useState('fiscal')
  const [expanded, setExpanded] = useState(true)

  const categorized = POLICY_DEFINITIONS.filter(p => p.category === activeCategory)

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs uppercase tracking-widest text-[#64748b] font-mono">Policy Controls</h3>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-[#475569] hover:text-[#e2e8f0] text-xs"
        >
          {expanded ? '▼' : '▶'}
        </button>
      </div>

      {expanded && (
        <>
          {/* Category tabs */}
          <div className="flex flex-wrap gap-1 mb-3">
            {Object.entries(POLICY_CATEGORIES).map(([id, cat]) => (
              <button
                key={id}
                onClick={() => setActiveCategory(id)}
                className={`text-[10px] px-2 py-0.5 rounded font-mono transition-colors ${
                  activeCategory === id
                    ? 'text-white'
                    : 'text-[#475569] hover:text-[#94a3b8]'
                }`}
                style={{
                  backgroundColor: activeCategory === id ? cat.color + '33' : 'transparent',
                  borderColor: cat.color + '44',
                  border: '1px solid'
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Policy controls */}
          <div className="flex flex-col gap-3 overflow-y-auto flex-1">
            {categorized.map(policy => (
              <div key={policy.id}>
                {policy.type === 'slider' ? (
                  <PolicySlider
                    policy={policy}
                    value={policies?.[policy.id] ?? 0}
                    onChange={onPolicyChange}
                  />
                ) : (
                  <PolicyToggle
                    policy={policy}
                    value={policies?.[policy.id] ?? false}
                    onChange={onPolicyChange}
                  />
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
