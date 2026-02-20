import { SANDBOX_SCENARIOS, HISTORICAL_SCENARIOS } from '../data/scenarios.js'

function ScenarioCard({ scenario, onSelect, current }) {
  const isActive = current === scenario.id

  return (
    <button
      onClick={() => onSelect(scenario.id)}
      className={`w-full text-left p-4 rounded-xl border transition-all ${
        isActive ? '' : 'border-[#1e1e2e] bg-[#12121a] hover:border-[#334155]'
      }`}
      style={{
        borderColor: isActive ? scenario.color : undefined,
        backgroundColor: isActive ? scenario.color + '10' : undefined
      }}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl">{scenario.icon}</span>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className="text-white font-bold text-sm">{scenario.name}</span>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded font-mono"
              style={{ backgroundColor: scenario.color + '22', color: scenario.color }}
            >
              {scenario.difficulty}
            </span>
            {scenario.durationYears && (
              <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-[#1e1e2e] text-[#64748b]">
                {scenario.durationYears}yr challenge
              </span>
            )}
          </div>
          {scenario.era && (
            <div className="text-[10px] font-mono text-[#475569] mb-1">{scenario.era}</div>
          )}
          <p className="text-[#64748b] text-xs leading-relaxed">{scenario.description}</p>
          <div className="mt-2 text-[10px] font-mono text-[#475569] border-l-2 pl-2"
            style={{ borderColor: scenario.color + '55' }}>
            💡 {scenario.lesson}
          </div>
        </div>
      </div>
    </button>
  )
}

function ScenarioGroup({ title, subtitle, scenarios, current, onSelect }) {
  return (
    <div>
      <div className="mb-3">
        <h3 className="text-white font-bold text-sm">{title}</h3>
        {subtitle && <p className="text-[#475569] text-xs mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex flex-col gap-2">
        {scenarios.map(s => (
          <ScenarioCard key={s.id} scenario={s} current={current} onSelect={onSelect} />
        ))}
      </div>
    </div>
  )
}

export default function ScenarioSelect({ current, onSelect, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
      <div className="bg-[#0d0d14] border border-[#1e1e2e] rounded-2xl p-6 max-w-2xl w-full mx-4 max-h-[92vh] overflow-y-auto shadow-2xl">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-white font-bold text-xl font-mono">Choose Scenario</h2>
            <p className="text-[#64748b] text-sm mt-1">
              Sandbox: experiment freely. Historical Crises: can you do better than history did?
            </p>
          </div>
          <button onClick={onClose} className="text-[#475569] hover:text-white text-xl ml-4 flex-shrink-0">✕</button>
        </div>

        <div className="flex flex-col gap-6">
          <ScenarioGroup
            title="🧪 Sandbox"
            subtitle="No time limit. Experiment with policy freely."
            scenarios={SANDBOX_SCENARIOS}
            current={current}
            onSelect={(id) => { onSelect(id); onClose() }}
          />

          <div className="border-t border-[#1e1e2e] pt-6">
            <ScenarioGroup
              title="📜 Historical Crises — Can You Do Better?"
              subtitle="Real economic crises, simulated. Each has objectives and a report card. Your outcome is compared to what actually happened."
              scenarios={HISTORICAL_SCENARIOS}
              current={current}
              onSelect={(id) => { onSelect(id); onClose() }}
            />
          </div>
        </div>

        <div className="mt-4 text-center text-[#334155] text-xs font-mono">
          Changing scenario resets the simulation
        </div>
      </div>
    </div>
  )
}
