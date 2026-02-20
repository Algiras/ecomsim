import { useState } from 'react'

const SPEEDS = [
  { label: '1×', value: 1, title: 'Slow — watch individual agents' },
  { label: '5×', value: 5, title: 'Normal play' },
  { label: '20×', value: 20, title: 'Fast-forward' },
  { label: 'Max', value: 60, title: 'Stress test' }
]

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
  narratorEnabled,
  narratorLoading,
  onNarratorToggle
}) {
  const [copied, setCopied] = useState(false)

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
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
          {scenarioName || 'Free Market'} ▾
        </button>

        {year !== undefined && (
          <span className="text-[#475569] text-xs font-mono">Year {year}</span>
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
          {paused ? '▶ Play' : '⏸ Pause'}
        </button>

        {/* Reset */}
        <button
          onClick={onReset}
          className="text-xs font-mono px-3 py-1.5 rounded border border-[#1e1e2e] text-[#64748b]
            hover:border-[#ef4444] hover:text-[#ef4444] transition-colors"
          title="Reset simulation"
        >
          ↺ Reset
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

        {/* Share */}
        <button
          onClick={handleShare}
          className="text-xs font-mono px-3 py-1.5 rounded border border-[#1e1e2e] text-[#64748b]
            hover:border-[#22c55e] hover:text-[#22c55e] transition-colors"
          title="Copy shareable link"
        >
          {copied ? '✓ Copied!' : '🔗 Share'}
        </button>

        {/* Narrator toggle */}
        <button
          onClick={onNarratorToggle}
          disabled={narratorLoading}
          className={`text-xs font-mono px-3 py-1.5 rounded border transition-colors ${
            narratorEnabled
              ? 'border-[#06b6d4] text-[#06b6d4] bg-[#06b6d411]'
              : 'border-[#1e1e2e] text-[#475569] hover:border-[#06b6d4] hover:text-[#06b6d4]'
          } ${narratorLoading ? 'opacity-50 cursor-wait' : ''}`}
          title={narratorEnabled ? 'Disable narration' : 'Enable AI narration (loads ~40MB model)'}
        >
          {narratorLoading ? '⏳ Loading…' : narratorEnabled ? '🔊 Voice On' : '🔇 Voice'}
        </button>
      </div>
    </header>
  )
}
