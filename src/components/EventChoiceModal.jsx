import { useState } from 'react'

// Predict likely downstream consequences of each choice for the fork display
function predictOutcome(choice) {
  const id = choice.id
  const e = choice.effectOverride || {}

  const outcomes = []
  if (e.demandMultiplier !== undefined) {
    outcomes.push(e.demandMultiplier > 0.7 ? '↑ GDP recovery' : '↓ GDP contraction')
  }
  if (e.wealthCrashPhase !== undefined) {
    outcomes.push(e.wealthCrashPhase > 0.5 ? '↗ Softer crash' : '↘ Hard crash')
  }
  if (e.deathRateMultiplier !== undefined) {
    outcomes.push(e.deathRateMultiplier > 2 ? '↑↑ Deaths' : '↑ Fewer deaths')
  }
  if (e.techProductivityMultiplier !== undefined) {
    outcomes.push(e.techProductivityMultiplier > 1.5 ? '↑ GDP spike' : '→ Moderate growth')
    outcomes.push(e.otherJobsAutomatedRate > 0.1 ? '↓↓ Jobs lost' : '↓ Some jobs lost')
  }
  if (e.foodSupplyMultiplier !== undefined) {
    outcomes.push(e.foodPriceMultiplier > 1.8 ? '↑↑ Food prices' : '↑ Food prices')
  }
  if (choice.govDebtPenalty) {
    outcomes.push(`↑ Debt +${choice.govDebtPenalty}`)
  }
  if (id === 'do_nothing') {
    outcomes.push('→ Default market response')
    outcomes.push('? Outcome uncertain')
  }
  return outcomes
}

function ChoiceCard({ choice, selected, onSelect }) {
  const outcomes = predictOutcome(choice)
  const isDoNothing = choice.id === 'do_nothing'

  return (
    <button
      onClick={() => onSelect(choice.id)}
      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
        selected
          ? 'border-[#6366f1] bg-[#6366f111]'
          : isDoNothing
          ? 'border-[#334155] border-dashed bg-[#12121a] hover:border-[#475569]'
          : 'border-[#1e1e2e] bg-[#12121a] hover:border-[#334155] hover:bg-[#1a1a28]'
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl flex-shrink-0 mt-0.5">{choice.emoji}</span>
        <div className="flex-1">
          <div className="font-bold text-white text-sm mb-1">{choice.label}</div>
          <p className="text-[#94a3b8] text-xs leading-relaxed mb-2">{choice.description}</p>
          <div className="flex items-start gap-1.5 mb-2">
            <span className="text-[#f59e0b] text-[10px] flex-shrink-0 mt-0.5">⚠</span>
            <span className="text-[#f59e0b] text-[10px] leading-relaxed">{choice.tradeoff}</span>
          </div>
          {outcomes.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {outcomes.map((o, i) => (
                <span key={i} className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                  o.startsWith('↑') || o.startsWith('↗') ? 'bg-[#22c55e22] text-[#22c55e]'
                  : o.startsWith('↓') || o.startsWith('↘') ? 'bg-[#ef444422] text-[#ef4444]'
                  : 'bg-[#1e1e2e] text-[#64748b]'
                }`}>{o}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </button>
  )
}

export default function EventChoiceModal({ event, onChoose }) {
  const [selected, setSelected] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const [hintVisible, setHintVisible] = useState(false)

  if (!event) return null

  const handleConfirm = () => {
    if (!selected) return
    if (!revealed) {
      setRevealed(true)
      return
    }
    onChoose(event.id, selected)
  }

  const selectedChoice = event.choices?.find(c => c.id === selected)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0d0d14] border border-[#334155] rounded-2xl p-6 max-w-xl w-full mx-4 max-h-[90vh] overflow-y-auto shadow-2xl">

        {/* Event header */}
        <div className="flex items-center gap-3 mb-4">
          <span className="text-4xl">{event.icon}</span>
          <div>
            <h2 className="text-white font-bold text-lg">{event.name}</h2>
            <p className="text-[#94a3b8] text-sm">{event.description}</p>
          </div>
        </div>

        <div className="border-t border-[#1e1e2e] pt-4 mb-4">
          <p className="text-[#64748b] text-xs font-mono uppercase tracking-wider mb-3">
            ⚡ Simulation paused — your decision required
          </p>
          <div className="flex flex-col gap-2">
            {event.choices?.map(choice => (
              <ChoiceCard
                key={choice.id}
                choice={choice}
                selected={selected === choice.id}
                onSelect={setSelected}
              />
            ))}
          </div>
        </div>

        {/* Hint toggle */}
        {event.hint && (
          <div className="mb-4">
            {!hintVisible ? (
              <button
                onClick={() => setHintVisible(true)}
                className="text-xs font-mono text-[#6366f1] hover:text-[#818cf8] transition-colors"
              >
                💡 Need a hint?
              </button>
            ) : (
              <div className="p-3 bg-[#1e1e2e] rounded-lg border border-[#6366f133]">
                <div className="text-[#6366f1] text-[10px] uppercase tracking-wider font-mono mb-1">
                  💡 Hint
                </div>
                <p className="text-[#94a3b8] text-xs leading-relaxed italic">
                  {event.hint}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Historical note — revealed only after selection */}
        {revealed && selectedChoice && (
          <div className="mb-4 p-3 bg-[#1e1e2e] rounded-lg border border-[#334155]">
            <div className="text-[#64748b] text-[10px] uppercase tracking-wider font-mono mb-1">
              📚 What history did
            </div>
            <p className="text-[#94a3b8] text-xs leading-relaxed italic">
              {selectedChoice.historicalNote}
            </p>
          </div>
        )}

        <button
          onClick={handleConfirm}
          disabled={!selected}
          className={`w-full py-3 rounded-xl font-mono font-bold text-sm transition-colors ${
            selected
              ? 'bg-[#6366f1] hover:bg-[#818cf8] text-white'
              : 'bg-[#1e1e2e] text-[#475569] cursor-not-allowed'
          }`}
        >
          {!selected
            ? 'Select a response'
            : !revealed
            ? 'Confirm — see what history did →'
            : '▶ Apply and continue'}
        </button>
      </div>
    </div>
  )
}
