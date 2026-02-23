import { useState } from 'react'
import { SANDBOX_SCENARIOS, HISTORICAL_SCENARIOS, ECONOMIC_MODELS } from '../data/scenarios.js'
import { STORY_CHAPTERS, gradeChapter } from '../data/storyMode.js'
import { TUTORIAL_LESSONS } from '../data/tutorialLessons.js'

// ─── Scenario cards ────────────────────────────────────────────────────────────

function ScenarioCard({ scenario, onSelect }) {
  return (
    <button
      onClick={() => onSelect(scenario.id)}
      className="w-full text-left p-3 rounded-xl border border-[#1e1e2e] bg-[#12121a] hover:border-[#6366f1] hover:bg-[#6366f108] transition-all group"
    >
      <div className="flex items-start gap-2">
        <span className="text-xl">{scenario.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white font-bold text-xs group-hover:text-[#818cf8]">{scenario.name}</span>
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

function StoryCard({ chapter, storyProgress, onSelect }) {
  const isUnlocked = chapter.number <= storyProgress.unlockedChapter
  const score = storyProgress.scores?.[chapter.id]
  const hasScore = score !== undefined
  const { grade, color: gradeColor } = hasScore ? gradeChapter(score) : {}

  return (
    <button
      onClick={() => isUnlocked && onSelect(chapter.id)}
      disabled={!isUnlocked}
      className={`w-full text-left p-3 rounded-xl border transition-all relative group ${
        !isUnlocked
          ? 'border-[#1e1e2e] bg-[#0a0a0f] opacity-40 cursor-not-allowed'
          : 'border-[#1e1e2e] bg-[#12121a] hover:border-[#6366f1] hover:bg-[#6366f108]'
      }`}
    >
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
            <span className="text-white font-bold text-xs group-hover:text-[#818cf8]">{chapter.title}</span>
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
  { id: 'tutorial', label: '🎓 Tutorial', desc: 'Learn by doing. Fix broken economies one policy at a time.' },
  { id: 'story', label: '📖 Story Mode', desc: '5-chapter campaign through economic history.' },
  { id: 'historical', label: '📜 Historical', desc: 'Real crises. Can you do better than history?' },
  { id: 'freeplay', label: '🎮 Free Play', desc: 'No time limit. No objectives. Experiment freely.' }
]

export default function ModeSelect({ onSelect, storyProgress, completedLessons = [] }) {
  const [activeMode, setActiveMode] = useState('tutorial')

  const completedChapters = Object.keys(storyProgress?.scores || {}).length
  const totalChapters = STORY_CHAPTERS.length

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0a0f] flex flex-col">
      {/* Hero header */}
      <div className="flex-shrink-0 text-center pt-10 pb-6 px-4">
        <div className="text-4xl mb-2">🐾</div>
        <h1 className="text-white font-bold text-2xl font-mono tracking-tight">EconSim</h1>
        <p className="text-[#64748b] text-sm mt-1 font-mono">A particle economy simulator</p>
      </div>

      {/* Mode tabs */}
      <div className="flex-shrink-0 flex justify-center px-4 mb-4">
        <div className="flex gap-1 bg-[#12121a] rounded-xl p-1 max-w-md w-full">
          {MODES.map(mode => (
            <button
              key={mode.id}
              onClick={() => setActiveMode(mode.id)}
              className={`flex-1 text-center py-2.5 rounded-lg text-xs font-mono transition-all ${
                activeMode === mode.id
                  ? 'bg-[#1e1e2e] text-white font-bold shadow-sm'
                  : 'text-[#475569] hover:text-[#94a3b8]'
              }`}
            >
              {mode.label}
              {mode.id === 'tutorial' && completedLessons.length > 0 && (
                <span className="ml-1 text-[9px] text-[#22c55e]">{completedLessons.length}/{TUTORIAL_LESSONS.length}</span>
              )}
              {mode.id === 'story' && completedChapters > 0 && (
                <span className="ml-1 text-[9px] text-[#6366f1]">{completedChapters}/{totalChapters}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Mode description */}
      <div className="flex-shrink-0 text-center px-4 mb-4">
        <div className="text-xs text-[#475569] font-mono">
          {MODES.find(m => m.id === activeMode)?.desc}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-8">
        <div className="max-w-xl mx-auto flex flex-col gap-2">

          {activeMode === 'freeplay' && (
            <>
              {/* Economic model presets */}
              <div className="mb-2">
                <div className="text-[10px] font-mono text-[#64748b] uppercase tracking-wider mb-2">
                  Start with an economic model
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {ECONOMIC_MODELS.map(model => (
                    <button
                      key={model.id}
                      onClick={() => onSelect('_model:' + model.id)}
                      className="text-left p-3 rounded-xl border border-[#1e1e2e] bg-[#12121a] hover:border-[#6366f1] hover:bg-[#6366f108] transition-all group"
                    >
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-sm">{model.flag}</span>
                        <span className="text-[11px] text-white font-bold font-mono group-hover:text-[#818cf8]">{model.name}</span>
                      </div>
                      <div className="text-[9px] text-[#475569] leading-snug">{model.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-[10px] font-mono text-[#64748b] uppercase tracking-wider mb-2">
                Or pick a scenario
              </div>
              {SANDBOX_SCENARIOS.map(s => (
                <ScenarioCard key={s.id} scenario={s} onSelect={onSelect} />
              ))}
            </>
          )}

          {activeMode === 'tutorial' && (
            <>
              <div className="text-[10px] font-mono text-[#334155] mb-1">
                Each lesson gives you a broken economy. Fix it by adjusting the right policy.
              </div>
              {TUTORIAL_LESSONS.map((lesson, i) => {
                const done = completedLessons.includes(i)
                return (
                  <div
                    key={lesson.id}
                    className={`w-full text-left p-3 rounded-xl border bg-[#12121a] ${
                      done ? 'border-[#22c55e33]' : 'border-[#1e1e2e]'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-xl">{lesson.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-white font-bold text-xs">{lesson.title}</span>
                          {done ? (
                            <span className="text-[9px] px-1.5 py-0.5 rounded font-mono bg-[#22c55e22] text-[#22c55e] font-bold">
                              Completed
                            </span>
                          ) : (
                            <span className="text-[9px] px-1.5 py-0.5 rounded font-mono bg-[#6366f122] text-[#6366f1]">
                              Lesson {i + 1}
                            </span>
                          )}
                        </div>
                        <p className="text-[#64748b] text-[10px] leading-relaxed mt-0.5">{lesson.instruction}</p>
                      </div>
                      {done && <span className="text-[#22c55e] text-sm flex-shrink-0">&#10003;</span>}
                    </div>
                  </div>
                )
              })}
              {completedLessons.length === TUTORIAL_LESSONS.length && (
                <div className="p-3 rounded-xl bg-[#22c55e11] border border-[#22c55e33] text-center">
                  <div className="text-[#22c55e] font-mono font-bold text-sm">All Lessons Complete!</div>
                  <div className="text-[#94a3b8] text-xs mt-1">You've mastered the basics. Try Free Play or a Historical crisis.</div>
                </div>
              )}
              <button
                onClick={() => onSelect('_tutorial')}
                className="w-full py-3 rounded-xl bg-[#6366f1] hover:bg-[#5558e6] text-white font-bold text-sm font-mono transition-colors mt-2"
              >
                {completedLessons.length === 0 ? 'Start Tutorial' : completedLessons.length < TUTORIAL_LESSONS.length ? 'Continue Tutorial' : 'Replay Tutorial'}
              </button>
            </>
          )}

          {activeMode === 'historical' && (
            <>
              <div className="text-[10px] font-mono text-[#334155] mb-1">
                Real economic crises, simulated. Your decisions are compared to what actually happened.
              </div>
              {HISTORICAL_SCENARIOS.map(s => (
                <ScenarioCard key={s.id} scenario={s} onSelect={onSelect} />
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
                  onSelect={onSelect}
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
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 text-center py-3 border-t border-[#1e1e2e]">
        <div className="text-[#334155] text-[10px] font-mono">
          Select a game mode to begin
        </div>
      </div>
    </div>
  )
}
