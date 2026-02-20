import { useState, useEffect } from 'react'
import { INSIGHTS } from '../data/insights.js'

export default function InsightPopup({ insight, onDismiss }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (insight) {
      setVisible(true)
    }
  }, [insight])

  if (!insight || !visible) return null

  const def = INSIGHTS[insight.id] || {
    title: insight.title,
    emoji: '💡',
    body: insight.body,
    realWorld: insight.realWorld,
    color: '#6366f1'
  }

  const handleDismiss = () => {
    setVisible(false)
    setTimeout(() => onDismiss?.(), 300)
  }

  return (
    <div
      className={`fixed bottom-6 right-6 z-40 max-w-sm transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      <div
        className="bg-[#0d0d14] border rounded-xl p-4 shadow-2xl"
        style={{ borderColor: def.color + '66' }}
      >
        <div className="flex items-start gap-3">
          <span className="text-2xl flex-shrink-0">{def.emoji}</span>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-white font-bold text-sm">{def.title}</h4>
              <button
                onClick={handleDismiss}
                className="text-[#475569] hover:text-white text-sm ml-2"
              >
                ✕
              </button>
            </div>

            <p className="text-[#94a3b8] text-xs leading-relaxed mb-2">
              {def.body}
            </p>

            <div
              className="text-[10px] text-[#64748b] leading-relaxed border-l-2 pl-2 italic"
              style={{ borderColor: def.color + '66' }}
            >
              🌍 {def.realWorld}
            </div>

            <div className="text-[9px] text-[#334155] mt-2 font-mono">
              Year {insight.year} · {insight.id}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
