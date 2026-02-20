import { useState } from 'react'
import { SANDBOX_SCENARIOS, HISTORICAL_SCENARIOS } from '../data/scenarios.js'
import { STORY_CHAPTERS, gradeChapter } from '../data/storyMode.js'

// ─── Scenario cards ────────────────────────────────────────────────────────────

function ScenarioCard({ scenario, onSelect, current }) {
  const isActive = current === scenario.id
  return (
    <button
      onClick={() => onSelect(scenario.id)}
      className={`w-full text-left p-3 rounded-xl border transition-all ${
        isActive ? '' : 'border-[#1e1e2e] bg-[#12121a] hover:border-[#334155]'
      }`}
      style={{
        borderColor: isActive ? scenario.color : undefined,
        backgroundColor: isActive ? scenario.color + '10' : undefined
      }}
    >
      <div className="flex items-start gap-2">
        <span className="text-xl">{scenario.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white font-bold text-xs">{scenario.name}</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded font-mono flex-shrink-0"
              style={{ backgroundColor: scenario.color + '22', color: scenario.color }}>
              {scenario.difficulty}
            </span>
            {scenario.durationYears && (
              <span className="text-[9px] px-1.5 py-0.5 rounded font-mono bg-[#1e1e2e] text-[#64748b] flex-shrink-0">
                {scenario.durationYears}yr
              </span>
            )}
          </div>
          {scenario.era && <div className="text-[9px] text-[#475569] font-mono">{scenario.era}</div>}
          <p className="text-[#64748b] text-[10px] leading-relaxed mt-0.5">{scenario.description}</p>
        </div>
      </div>
    </button>
  )
}

// ─── Story chapter card ────────────────────────────────────────────────────────

function StoryCard({ chapter, storyProgress, onSelect, current, chapterIndex }) {
  const isUnlocked = chapter.number <= storyProgress.unlockedChapter
  const score = storyProgress.scores?.[chapter.id]
  const hasScore = score !== undefined
  const isActive = current === chapter.id
  const { grade, color: gradeColor } = hasScore ? gradeChapter(score) : {}

  return (
    <button
      onClick={() => isUnlocked && onSelect(chapter.id)}
      disabled={!isUnlocked}
      className={`w-full text-left p-3 rounded-xl border transition-all relative ${
        !isUnlocked
          ? 'border-[#1e1e2e] bg-[#0a0a0f] opacity-40 cursor-not-allowed'
          : isActive
          ? ''
          : 'border-[#1e1e2e] bg-[#12121a] hover:border-[#334155]'
      }`}
      style={{
        borderColor: isActive ? chapter.color : undefined,
        backgroundColor: isActive ? chapter.color + '10' : undefined
      }}
    >
      {/* Lock overlay */}
      {!isUnlocked && (
        <div className="absolute top-2 right-2 text-[#334155] text-xs">🔒</div>
      )}

      <div className="flex items-start gap-2">
        <span className="text-xl">{chapter.icon}</span>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded"
              style={{ backgroundColor: chapter.color + '22', color: chapter.color }}>
              Ch.{chapter.number}
            </span>
            <span className="text-white font-bold text-xs">{chapter.title}</span>
            {hasScore && (
              <span className="text-[9px] font-mono font-bold ml-auto" style={{ color: gradeColor }}>
                {grade} · {score}/100
              </span>
            )}
          </div>
          <div className="text-[9px] font-mono text-[#475569] mt-0.5">{chapter.era}</div>
          <p className="text-[#64748b] text-[10px] mt-0.5 leading-relaxed">{chapter.tagline}</p>
        </div>
      </div>

      {/* Progress bar if scored */}
      {hasScore && (
        <div className="mt-2 w-full bg-[#1e1e2e] rounded-full h-0.5">
          <div
            className="h-0.5 rounded-full"
            style={{ width: `${score}%`, backgroundColor: gradeColor }}
          />
        </div>
      )}
    </button>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

const MODES = [
  { id: 'freeplay', label: '🎮 Free Play', desc: 'No time limit. No objectives. Experiment freely.' },
  { id: 'historical', label: '📜 Historical', desc: 'Real crises. Can you do better than history?' },
  { id: 'story', label: '📖 Story Mode', desc: '5-chapter campaign through economic history.' }
]

export default function ModeSelect({ current, onSelect, onClose, storyProgress }) {
  const [activeMode, setActiveMode] = useState(() => {
    const sc = SANDBOX_SCENARIOS.find(s => s.id === current)
    const hc = HISTORICAL_SCENARIOS.find(s => s.id === current)
    const story = STORY_CHAPTERS.find(c => c.id === current)
    if (story) return 'story'
    if (hc) return 'historical'
    return 'freeplay'
  })

  const completedChapters = Object.keys(storyProgress?.scores || {}).length
  const totalChapters = STORY_CHAPTERS.length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0d0d14] border border-[#1e1e2e] rounded-2xl p-5 max-w-2xl w-full mx-4 max-h-[92vh] overflow-hidden flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-start justify-between mb-4 flex-shrink-0">
          <div>
            <h2 className="text-white font-bold text-lg font-mono">🐾 EconSim</h2>
            <p className="text-[#64748b] text-xs mt-0.5">Choose your mode</p>
          </div>
          <button onClick={onClose} className="text-[#475569] hover:text-white text-xl ml-4">✕</button>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-1 mb-4 bg-[#12121a] rounded-xl p-1 flex-shrink-0">
          {MODES.map(mode => (
            <button
              key={mode.id}
              onClick={() => setActiveMode(mode.id)}
              className={`flex-1 text-center py-2 rounded-lg text-xs font-mono transition-all ${
                activeMode === mode.id
                  ? 'bg-[#1e1e2e] text-white font-bold'
                  : 'text-[#475569] hover:text-[#94a3b8]'
              }`}
            >
              {mode.label}
              {mode.id === 'story' && completedChapters > 0 && (
                <span className="ml-1 text-[9px] text-[#6366f1]">{completedChapters}/{totalChapters}</span>
              )}
            </button>
          ))}
        </div>

        {/* Mode description */}
        <div className="text-[10px] text-[#475569] font-mono mb-3 flex-shrink-0">
          {MODES.find(m => m.id === activeMode)?.desc}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1">

          {activeMode === 'freeplay' && (
            <>
              {SANDBOX_SCENARIOS.map(s => (
                <ScenarioCard
                  key={s.id}
                  scenario={s}
                  current={current}
                  onSelect={id => { onSelect(id); onClose() }}
                />
              ))}
              <div className="mt-2 p-3 rounded-xl bg-[#12121a] border border-[#1e1e2e]">
                <div className="text-[10px] font-mono text-[#475569] leading-relaxed">
                  💡 Free Play tips: use <span className="text-[#f59e0b]">⚡ Shock</span> to trigger random crises,
                  try the <span className="text-[#dc2626]">💣 Chaos Levers</span> to stress-test the economy,
                  or the <span className="text-[#f97316]">⚗️ Weird Laws</span> for unusual interventions.
                  Open <span className="text-[#6366f1]">📊 Stats</span> for the full macroeconomic dashboard.
                </div>
              </div>
            </>
          )}

          {activeMode === 'historical' && (
            <>
              <div className="text-[10px] font-mono text-[#334155] mb-1">
                Real economic crises, simulated. Your decisions are compared to what actually happened.
              </div>
              {HISTORICAL_SCENARIOS.map(s => (
                <ScenarioCard
                  key={s.id}
                  scenario={s}
                  current={current}
                  onSelect={id => { onSelect(id); onClose() }}
                />
              ))}
            </>
          )}

          {activeMode === 'story' && (
            <>
              <div className="text-[10px] font-mono text-[#334155] mb-1">
                A 5-chapter campaign through the history of capitalism. Each chapter unlocks after completing the previous one.
              </div>
              {STORY_CHAPTERS.map((ch, i) => (
                <StoryCard
                  key={ch.id}
                  chapter={ch}
                  storyProgress={storyProgress}
                  current={current}
                  chapterIndex={i}
                  onSelect={id => { onSelect(id); onClose() }}
                />
              ))}
              {completedChapters === totalChapters && (
                <div className="p-3 rounded-xl bg-[#f59e0b11] border border-[#f59e0b33] text-center">
                  <div className="text-[#f59e0b] font-mono font-bold text-sm">🏆 Campaign Complete!</div>
                  <div className="text-[#94a3b8] text-xs mt-1">You've navigated 200 years of economic history.</div>
                </div>
              )}
              {completedChapters > 0 && (
                <button
                  onClick={() => {
                    if (window.confirm('Reset story progress? This cannot be undone.')) {
                      onSelect('_reset_story')
                    }
                  }}
                  className="text-[9px] font-mono text-[#334155] hover:text-[#ef4444] text-center py-1 transition-colors"
                >
                  Reset story progress
                </button>
              )}
            </>
          )}
        </div>

        <div className="mt-3 text-center text-[#334155] text-[10px] font-mono flex-shrink-0">
          Changing scenario resets the simulation
        </div>
      </div>
    </div>
  )
}
