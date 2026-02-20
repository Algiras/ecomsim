import { SCENARIO_LIST } from '../data/scenarios.js'

function ScenarioCard({ scenario, onSelect, current }) {
  const isActive = current === scenario.id

  return (
    <button
      onClick={() => onSelect(scenario.id)}
      className={`w-full text-left p-4 rounded-xl border transition-all ${
        isActive
          ? 'border-opacity-60 bg-opacity-10'
          : 'border-[#1e1e2e] bg-[#12121a] hover:border-[#334155]'
      }`}
      style={{
        borderColor: isActive ? scenario.color : undefined,
        backgroundColor: isActive ? scenario.color + '10' : undefined
      }}
    >
      <div className="flex items-start gap-3">
        <span className="text-3xl">{scenario.icon}</span>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-white font-bold text-sm">{scenario.name}</span>
            <span
              className="text-xs px-1.5 py-0.5 rounded font-mono"
              style={{ backgroundColor: scenario.color + '22', color: scenario.color }}
            >
              {scenario.difficulty}
            </span>
          </div>
          <p className="text-[#94a3b8] text-xs italic mb-2">{scenario.subtitle}</p>
          <p className="text-[#64748b] text-xs leading-relaxed">{scenario.description}</p>
          <div className="mt-2 text-[10px] font-mono text-[#475569] border-l-2 pl-2"
            style={{ borderColor: scenario.color + '66' }}>
            💡 {scenario.lesson}
          </div>
        </div>
      </div>
    </button>
  )
}

export default function ScenarioSelect({ current, onSelect, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#0d0d14] border border-[#1e1e2e] rounded-2xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-white font-bold text-xl font-mono">Choose Scenario</h2>
            <p className="text-[#64748b] text-sm mt-1">
              Each scenario starts from a different economic reality. Your choices determine what happens next.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[#475569] hover:text-white text-xl leading-none"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {SCENARIO_LIST.map(s => (
            <ScenarioCard
              key={s.id}
              scenario={s}
              current={current}
              onSelect={(id) => { onSelect(id); onClose() }}
            />
          ))}
        </div>

        <div className="mt-4 text-center text-[#475569] text-xs font-mono">
          Changing scenario resets the simulation
        </div>
      </div>
    </div>
  )
}
