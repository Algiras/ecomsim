import { useState, useRef, useEffect } from 'react'
import { SECTION_ORDER, SECTION_META } from './Dashboard.jsx'

const SPEEDS = [
  { label: '1\u00d7', value: 1, title: 'Leisurely \u2014 watch the economy breathe' },
  { label: '2\u00d7', value: 2, title: 'Normal play' },
  { label: '5\u00d7', value: 5, title: 'Fast-forward' },
  { label: '10\u00d7', value: 10, title: 'Stress test' }
]

function sectionHealth(section, metrics, approvalRating) {
  if (!metrics) return '#475569'
  switch (section) {
    case 'economy': {
      const u = metrics.unemployment || 0
      const g = metrics.gdpGrowth || 0
      if (u > 0.2 || g < -0.1) return '#ef4444'
      if (u > 0.1 || g < 0) return '#f59e0b'
      return '#22c55e'
    }
    case 'fiscal': {
      const debt = Math.abs(metrics.govDebt || 0)
      const gdp = metrics.gdp || 1
      const ratio = debt / gdp
      if (ratio > 1.5) return '#ef4444'
      if (ratio > 0.8) return '#f59e0b'
      return '#22c55e'
    }
    case 'inequality': {
      const gini = metrics.gini || 0
      if (gini > 0.5) return '#ef4444'
      if (gini > 0.35) return '#f59e0b'
      return '#22c55e'
    }
    case 'banking': {
      const debt = metrics.totalPrivateDebt || 0
      const gdp = metrics.gdp || 1
      if (debt / gdp > 2) return '#ef4444'
      if (debt / gdp > 1) return '#f59e0b'
      return '#22c55e'
    }
    case 'public': {
      const crime = metrics.crimeRate || 0
      if (crime > 0.5) return '#ef4444'
      if (crime > 0.2) return '#f59e0b'
      return '#22c55e'
    }
    case 'weird':
    case 'chaos':
      return '#475569'
    default:
      return '#475569'
  }
}

export default function Header({
  paused,
  speed,
  onPause,
  onResume,
  onReset,
  onSpeedChange,
  onScenarioOpen,
  onShockMe,
  scenarioName,
  year,
  score,
  achievementCount,
  narratorEnabled,
  narratorLoading,
  onNarratorToggle,
  llmStatus,
  llmProgress,
  llmReady,
  activeSection,
  onSectionChange,
  unlockedSections,
  metrics,
  approvalRating
}) {
  const [copied, setCopied] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
    setMenuOpen(false)
  }

  return (
    <header className="flex items-center justify-between px-4 py-2 bg-[#0a0a0f] border-b border-[#1e1e2e] flex-wrap gap-2">
      {/* Logo + scenario */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🐾</span>
          <span className="text-[#e2e8f0] font-bold font-mono text-sm hidden sm:block">EconSim</span>
        </div>

        <button
          onClick={onScenarioOpen}
          className="text-xs font-mono text-[#6366f1] hover:text-[#818cf8] border border-[#6366f133] hover:border-[#6366f166] rounded px-2 py-1 transition-colors"
        >
          {scenarioName || 'Free Market'} {'▾'}
        </button>

        {year !== undefined && (
          <span className="text-[#475569] text-xs font-mono">Year {year}</span>
        )}

        {/* Score */}
        {score !== undefined && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded border border-[#1e1e2e] bg-[#12121a]">
            <span className="text-[10px] text-[#475569] font-mono">SCORE</span>
            <span className={`text-sm font-bold font-mono ${
              score >= 70 ? 'text-[#22c55e]' : score >= 40 ? 'text-[#f59e0b]' : 'text-[#ef4444]'
            }`}>{score}</span>
            {achievementCount > 0 && (
              <span className="text-[10px] text-[#6366f1] font-mono">🏆{achievementCount}</span>
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        {/* Speed */}
        <div className="flex items-center gap-0.5 bg-[#12121a] border border-[#1e1e2e] rounded px-1">
          {SPEEDS.map(s => (
            <button
              key={s.value}
              onClick={() => onSpeedChange(s.value)}
              title={s.title}
              className={`text-xs font-mono px-2 py-1 rounded transition-colors ${
                speed === s.value
                  ? 'bg-[#6366f1] text-white'
                  : 'text-[#64748b] hover:text-[#e2e8f0]'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Pause / Resume */}
        <button
          onClick={paused ? onResume : onPause}
          className="flex items-center gap-1 text-xs font-mono px-3 py-1.5 rounded border transition-colors
            border-[#1e1e2e] text-[#e2e8f0] hover:border-[#6366f1] hover:text-[#6366f1]"
        >
          {paused ? '\u25b6 Play' : '\u23f8 Pause'}
        </button>

        {/* Shock me */}
        <button
          onClick={onShockMe}
          className="text-xs font-mono px-3 py-1.5 rounded border border-[#f59e0b33] text-[#f59e0b]
            hover:bg-[#f59e0b11] transition-colors"
          title="Trigger a random economic event"
        >
          ⚡ Shock
        </button>

        {/* Overflow menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(prev => !prev)}
            className="text-xs font-mono px-2 py-1.5 rounded border border-[#1e1e2e] text-[#64748b]
              hover:border-[#6366f1] hover:text-[#94a3b8] transition-colors"
            title="More options"
          >
            ⋯
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 bg-[#12121a] border border-[#1e1e2e] rounded-lg shadow-xl z-50 min-w-[160px] py-1">
              {/* Reset */}
              <button
                onClick={() => { onReset(); setMenuOpen(false) }}
                className="w-full text-left text-xs font-mono px-3 py-2 text-[#64748b] hover:text-[#ef4444] hover:bg-[#ef444411] transition-colors"
              >
                ↺ Reset
              </button>
              {/* Share */}
              <button
                onClick={handleShare}
                className="w-full text-left text-xs font-mono px-3 py-2 text-[#64748b] hover:text-[#22c55e] hover:bg-[#22c55e11] transition-colors"
              >
                {copied ? '\u2713 Copied!' : '\ud83d\udd17 Share'}
              </button>
              {/* Narrator */}
              <button
                onClick={() => { onNarratorToggle(); setMenuOpen(false) }}
                disabled={narratorLoading}
                className={`w-full text-left text-xs font-mono px-3 py-2 transition-colors ${
                  narratorEnabled
                    ? 'text-[#06b6d4] hover:bg-[#06b6d411]'
                    : 'text-[#475569] hover:text-[#06b6d4] hover:bg-[#06b6d411]'
                } ${narratorLoading ? 'opacity-50 cursor-wait' : ''}`}
              >
                {narratorLoading && llmStatus !== 'loading' ? '\u23f3 Loading\u2026'
                  : llmStatus === 'loading' ? `\ud83e\udde0 AI ${llmProgress}%`
                  : narratorEnabled && llmReady ? '\ud83d\udd0a AI Narrator'
                  : narratorEnabled ? '\ud83d\udd0a Voice'
                  : '\ud83d\udd07 Voice Off'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex flex-wrap gap-0.5 w-full pt-1 px-2">
        {SECTION_ORDER.map(section => {
          const meta = SECTION_META[section]
          const isActive = activeSection === section
          const isLocked = !unlockedSections?.has(section)
          const health = sectionHealth(section, metrics, approvalRating)

          return (
            <button
              key={section}
              onClick={() => !isLocked && onSectionChange?.(section)}
              disabled={isLocked}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono font-bold transition-all ${
                isActive
                  ? 'bg-[#1e1e2e] text-white'
                  : isLocked
                    ? 'text-[#334155] cursor-not-allowed'
                    : 'text-[#64748b] hover:text-[#94a3b8] hover:bg-[#0d0d14]'
              }`}
              style={isActive ? { boxShadow: `0 0 0 1px ${meta.color}` } : undefined}
              title={isLocked ? 'Locked - keep playing to unlock' : meta.title}
            >
              {isLocked ? (
                <span className="text-[#334155]">🔒</span>
              ) : (
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: health }} />
              )}
              <span>{meta.icon}</span>
              <span>{meta.title}</span>
            </button>
          )
        })}
      </div>
    </header>
  )
}
