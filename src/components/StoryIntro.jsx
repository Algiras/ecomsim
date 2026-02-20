import { useState } from 'react'

export default function StoryIntro({ chapter, onBegin, onBack, chapterScore }) {
  const [reading, setReading] = useState(true)

  const paragraphs = chapter.openingNarrative.trim().split('\n\n')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm">
      <div
        className="max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto rounded-2xl border p-8 shadow-2xl"
        style={{ borderColor: chapter.color + '55', background: '#0a0a0f' }}
      >
        {/* Chapter badge */}
        <div className="flex items-center gap-3 mb-6">
          <span className="text-5xl">{chapter.icon}</span>
          <div>
            <div
              className="text-xs font-mono uppercase tracking-widest mb-1"
              style={{ color: chapter.color }}
            >
              Chapter {chapter.number} · {chapter.era}
            </div>
            <h2 className="text-white font-bold text-2xl leading-tight">{chapter.title}</h2>
            <p className="text-[#64748b] text-sm mt-0.5 italic">{chapter.tagline}</p>
          </div>
        </div>

        {/* Previous chapter score badge */}
        {chapterScore !== undefined && (
          <div
            className="mb-5 p-3 rounded-lg border text-xs font-mono"
            style={{ borderColor: chapter.color + '33', background: chapter.color + '11' }}
          >
            <span style={{ color: chapter.color }}>
              ◀ Chapter {chapter.number - 1} score: {chapterScore}/100 — you've earned this chapter
            </span>
          </div>
        )}

        {/* Narrative */}
        <div className="mb-6 space-y-4">
          {paragraphs.map((para, i) => (
            <p
              key={i}
              className={`font-mono leading-relaxed ${
                i === 0 ? 'text-white text-sm font-bold' : 'text-[#94a3b8] text-sm'
              }`}
            >
              {para}
            </p>
          ))}
        </div>

        {/* Objectives preview */}
        <div className="mb-6 p-4 rounded-xl border border-[#1e1e2e] bg-[#12121a]">
          <div className="text-[10px] font-mono text-[#475569] uppercase tracking-wider mb-3">Your objectives</div>
          <div className="flex flex-col gap-2">
            {chapter.objectives.map(obj => (
              <div key={obj.id} className="flex items-start gap-2">
                <span className="text-base flex-shrink-0">{obj.icon}</span>
                <div>
                  <div className="text-xs font-mono font-bold text-[#e2e8f0]">{obj.label}</div>
                  <div className="text-[10px] text-[#64748b]">{obj.description}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-[10px] font-mono text-[#334155]">
            ⏱ You have {chapter.durationYears} in-game years
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="flex-none px-4 py-2.5 rounded-xl text-xs font-mono border border-[#1e1e2e] text-[#475569] hover:text-[#94a3b8] transition-colors"
            >
              ← Back
            </button>
          )}
          <button
            onClick={onBegin}
            className="flex-1 py-3 rounded-xl font-mono font-bold text-sm text-white transition-colors"
            style={{ background: chapter.color }}
          >
            ▶ Begin Chapter {chapter.number}
          </button>
        </div>
      </div>
    </div>
  )
}
