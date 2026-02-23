import { gradeChapter, closingNarrativeKey } from '../data/storyMode.js'
import SharePanel from './SharePanel.jsx'

function GradeRing({ grade, color }) {
  return (
    <div
      className="w-20 h-20 rounded-full border-4 flex items-center justify-center flex-shrink-0"
      style={{ borderColor: color }}
    >
      <span className="text-3xl font-bold font-mono" style={{ color }}>{grade}</span>
    </div>
  )
}

function ObjectiveResult({ obj }) {
  const color = obj.completed ? '#22c55e' : '#ef4444'
  const icon = obj.completed ? '✓' : '✗'
  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-[#1e1e2e] last:border-0">
      <span className="text-sm font-bold" style={{ color }}>{icon}</span>
      <span className="text-sm">{obj.icon}</span>
      <div className="flex-1">
        <div className="text-xs font-mono font-bold" style={{ color: obj.completed ? '#e2e8f0' : '#64748b' }}>
          {obj.label}
        </div>
        <div className="text-[10px] text-[#475569]">{obj.description}</div>
      </div>
      <div
        className="w-12 h-1.5 rounded-full bg-[#1e1e2e] overflow-hidden flex-shrink-0"
      >
        <div
          className="h-1.5 rounded-full transition-all"
          style={{ width: `${Math.round((obj.progress || 0) * 100)}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

export default function StoryOutro({ chapter, objectives = [], score, onNextChapter, onReplay, isLastChapter }) {
  const { grade, label, color } = gradeChapter(score)
  const narrativeKey = closingNarrativeKey(score)
  const narrative = chapter.closingNarrative[narrativeKey]

  const paragraphs = narrative.trim().split('\n\n')
  const shareText = `I completed Chapter ${chapter.number}: ${chapter.title} with grade ${grade} (${score}/100) in EconSim!`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm">
      <div
        className="max-w-xl w-full mx-4 max-h-[90vh] overflow-y-auto rounded-2xl border p-6 shadow-2xl"
        style={{ borderColor: color + '55', background: '#0a0a0f' }}
      >
        {/* Header */}
        <div className="flex items-center gap-4 mb-5">
          <GradeRing grade={grade} color={color} />
          <div>
            <div className="text-[10px] font-mono text-[#475569] uppercase tracking-widest mb-0.5">
              Chapter {chapter.number} Complete
            </div>
            <h2 className="text-white font-bold text-xl">{chapter.title}</h2>
            <div className="text-sm font-mono mt-0.5" style={{ color }}>
              {label} — {score}/100
            </div>
          </div>
        </div>

        {/* Score bar */}
        <div className="w-full bg-[#1e1e2e] rounded-full h-2 mb-5">
          <div
            className="h-2 rounded-full transition-all duration-1000"
            style={{ width: `${score}%`, backgroundColor: color }}
          />
        </div>

        {/* Objectives */}
        <div className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-3 mb-4">
          <div className="text-[10px] font-mono text-[#475569] uppercase tracking-wider mb-2">Objectives</div>
          {objectives.map(obj => <ObjectiveResult key={obj.id} obj={obj} />)}
        </div>

        {/* Historical verdict */}
        <div className="mb-5 p-4 rounded-xl" style={{ background: color + '11', border: `1px solid ${color}33` }}>
          <div className="text-[10px] font-mono uppercase tracking-wider mb-2" style={{ color }}>
            Historical verdict
          </div>
          {paragraphs.map((para, i) => (
            <p key={i} className="text-[#94a3b8] text-xs leading-relaxed mb-1.5">{para}</p>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onReplay}
            className="flex-none px-4 py-2.5 rounded-xl text-xs font-mono border border-[#1e1e2e] text-[#475569] hover:text-[#94a3b8] transition-colors"
          >
            ↺ Replay
          </button>
          {isLastChapter ? (
            <button
              onClick={onNextChapter}
              className="flex-1 py-3 rounded-xl font-mono font-bold text-sm text-white bg-[#6366f1] hover:bg-[#818cf8] transition-colors"
            >
              🏆 Campaign Complete
            </button>
          ) : (
            <button
              onClick={onNextChapter}
              className="flex-1 py-3 rounded-xl font-mono font-bold text-sm text-white transition-colors"
              style={{ background: color }}
            >
              → Chapter {chapter.number + 1}
            </button>
          )}
        </div>

        {/* Share */}
        <div className="mt-3 pt-3 border-t border-[#1e1e2e]">
          <div className="text-[10px] font-mono text-[#475569] uppercase tracking-wider mb-2">Share your result</div>
          <SharePanel text={shareText} />
        </div>
      </div>
    </div>
  )
}
