import { useState } from 'react'
import { POLICY_DEFINITIONS, POLICY_CATEGORIES } from '../data/policies.js'

function PolicySlider({ policy, value, onChange }) {
  const fmt = (v) => {
    if (policy.format === 'percent') return (v * 100).toFixed(0) + '%'
    if (policy.format === 'currency') return '$' + v
    return v
  }

  return (
    <div className="group">
      <div className="flex justify-between items-center mb-1">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">{policy.icon}</span>
          <span className="text-xs text-[#e2e8f0] font-mono">{policy.name}</span>
        </div>
        <span className="text-xs font-bold font-mono text-[#6366f1]">{fmt(value)}</span>
      </div>
      <input
        type="range"
        min={policy.min}
        max={policy.max}
        step={policy.step}
        value={value}
        onChange={(e) => onChange(policy.id, parseFloat(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${((value - policy.min) / (policy.max - policy.min)) * 100}%, #1e1e2e ${((value - policy.min) / (policy.max - policy.min)) * 100}%, #1e1e2e 100%)`
        }}
        title={policy.description}
      />
      <div className="hidden group-hover:block text-[10px] text-[#475569] mt-1 leading-tight">
        {policy.tradeoff}
      </div>
    </div>
  )
}

function PolicyToggle({ policy, value, onChange }) {
  return (
    <div className="flex items-center justify-between group">
      <div className="flex items-center gap-1.5">
        <span className="text-sm">{policy.icon}</span>
        <span className="text-xs text-[#e2e8f0] font-mono">{policy.name}</span>
      </div>
      <button
        onClick={() => onChange(policy.id, !value)}
        className={`relative w-9 h-5 rounded-full transition-colors duration-200 flex-shrink-0 ${
          value ? 'bg-[#6366f1]' : 'bg-[#334155]'
        }`}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
            value ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </button>
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
