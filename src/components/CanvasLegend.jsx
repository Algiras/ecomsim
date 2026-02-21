import { useState } from 'react'

const WEALTH_GRADIENT = [
  { color: '#dc2626', label: 'Poverty' },
  { color: '#f97316', label: '' },
  { color: '#64748b', label: '' },
  { color: '#3b82f6', label: 'Middle' },
  { color: '#06b6d4', label: '' },
  { color: '#f59e0b', label: 'Wealthy' },
]

const SECTORS = [
  { color: '#22c55e', icon: '🌾', label: 'Food' },
  { color: '#f59e0b', icon: '🏠', label: 'Housing' },
  { color: '#6366f1', icon: '💻', label: 'Tech' },
  { color: '#ec4899', icon: '💎', label: 'Luxury' },
]

function AgentShape({ type }) {
  const size = 22
  switch (type) {
    case 'owner':
      return (
        <svg width={size} height={size} viewBox="0 0 22 22">
          <polygon points="11,2 20,11 11,20 2,11" fill="#06b6d4" stroke="#ffffff" strokeWidth="1.5" />
        </svg>
      )
    case 'adult':
      return (
        <svg width={size} height={size} viewBox="0 0 22 22">
          <circle cx="11" cy="11" r="7" fill="#3b82f6" stroke="#ffffff" strokeWidth="1.5" />
        </svg>
      )
    case 'retiree':
      return (
        <svg width={size} height={size} viewBox="0 0 22 22">
          <rect x="4" y="4" width="14" height="14" fill="#64748b" stroke="#ffffff" strokeWidth="1.5" />
        </svg>
      )
    case 'child':
      return (
        <svg width={size} height={size} viewBox="0 0 22 22">
          <circle cx="11" cy="11" r="4" fill="#94a3b8" stroke="#ffffff" strokeWidth="1" />
        </svg>
      )
    case 'unemployed':
      return (
        <svg width={size} height={size} viewBox="0 0 22 22">
          <circle cx="11" cy="11" r="7" fill="#dc2626" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="3 2" />
        </svg>
      )
    case 'poverty':
      return (
        <svg width={size} height={size} viewBox="0 0 22 22">
          <circle cx="11" cy="11" r="9" fill="none" stroke="#dc262655" strokeWidth="2" />
          <circle cx="11" cy="11" r="6" fill="#dc2626" stroke="#ef4444" strokeWidth="1" strokeDasharray="3 2" />
        </svg>
      )
    case 'unrest':
      return (
        <svg width={size} height={size} viewBox="0 0 22 22">
          <circle cx="11" cy="11" r="7" fill="#ef4444" stroke="#ef4444" strokeWidth="1.5" />
          <text x="11" y="15" textAnchor="middle" fontSize="8" fill="white">!</text>
        </svg>
      )
    case 'rich':
      return (
        <svg width={size} height={size} viewBox="0 0 22 22">
          <circle cx="11" cy="11" r="7" fill="#f59e0b" stroke="#f59e0b" strokeWidth="2" />
        </svg>
      )
    default:
      return null
  }
}

export default function CanvasLegend() {
  const [open, setOpen] = useState(false)

  return (
    <div className="absolute bottom-3 left-3 z-10 font-mono">
      <button
        onClick={() => setOpen(v => !v)}
        className="px-2.5 py-1 rounded-lg text-[10px] font-mono bg-[#0d0d14cc] border border-[#1e1e2e] text-[#475569] hover:text-[#94a3b8] backdrop-blur-sm transition-colors"
      >
        {open ? '✕ Legend' : '? Legend'}
      </button>

      {open && (
        <div className="mt-1.5 w-52 bg-[#0d0d14ee] border border-[#1e1e2e] rounded-xl p-3 backdrop-blur-sm shadow-xl text-[10px]">

          {/* Agent shapes */}
          <div className="mb-3">
            <div className="text-[#475569] uppercase tracking-wider text-[9px] mb-1.5">Agent shapes</div>
            <div className="grid grid-cols-2 gap-y-1 gap-x-2">
              {[
                { type: 'owner', label: 'Business owner' },
                { type: 'adult', label: 'Worker' },
                { type: 'retiree', label: 'Retiree' },
                { type: 'child', label: 'Child' },
              ].map(({ type, label }) => (
                <div key={type} className="flex items-center gap-1.5">
                  <AgentShape type={type} />
                  <span className="text-[#94a3b8]">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Employment status */}
          <div className="mb-3">
            <div className="text-[#475569] uppercase tracking-wider text-[9px] mb-1.5">Status</div>
            <div className="flex flex-col gap-1">
              {[
                { type: 'adult', label: 'Employed (white ring)' },
                { type: 'unemployed', label: 'Unemployed (red dash)' },
                { type: 'poverty', label: 'Poverty (pulse ring)' },
              ].map(({ type, label }) => (
                <div key={type} className="flex items-center gap-1.5">
                  <AgentShape type={type} />
                  <span className="text-[#94a3b8]">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Glows */}
          <div className="mb-3">
            <div className="text-[#475569] uppercase tracking-wider text-[9px] mb-1.5">Glows</div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <AgentShape type="unrest" />
                <span className="text-[#94a3b8]">High social unrest</span>
              </div>
              <div className="flex items-center gap-1.5">
                <AgentShape type="rich" />
                <span className="text-[#94a3b8]">Very wealthy</span>
              </div>
            </div>
          </div>

          {/* Wealth colors */}
          <div className="mb-3">
            <div className="text-[#475569] uppercase tracking-wider text-[9px] mb-1.5">Wealth color</div>
            <div className="flex h-3 rounded overflow-hidden mb-1">
              {WEALTH_GRADIENT.map((s, i) => (
                <div key={i} className="flex-1" style={{ background: s.color }} />
              ))}
            </div>
            <div className="flex justify-between text-[#64748b] text-[9px]">
              <span>Poverty</span>
              <span>Middle</span>
              <span>Wealthy</span>
            </div>
          </div>

          {/* Business sectors */}
          <div className="mb-3">
            <div className="text-[#475569] uppercase tracking-wider text-[9px] mb-1.5">Business sectors</div>
            <div className="grid grid-cols-2 gap-y-1">
              {SECTORS.map(s => (
                <div key={s.label} className="flex items-center gap-1.5">
                  <svg width="16" height="16" viewBox="0 0 16 16">
                    <polygon
                      points="8,1 14,4.5 14,11.5 8,15 2,11.5 2,4.5"
                      fill={s.color + '22'}
                      stroke={s.color}
                      strokeWidth="1.5"
                    />
                  </svg>
                  <span className="text-[#94a3b8]">{s.icon} {s.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Lines */}
          <div>
            <div className="text-[#475569] uppercase tracking-wider text-[9px] mb-1.5">Lines</div>
            <div className="flex items-center gap-2">
              <svg width="30" height="8">
                <line x1="0" y1="4" x2="30" y2="4" stroke="#6366f1" strokeWidth="1" strokeOpacity="0.6" />
              </svg>
              <span className="text-[#94a3b8]">Employment link</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
