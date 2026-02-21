import { useMemo } from 'react'

const CHIPS = [
  { key: 'gdp', label: 'GDP', metric: 'gdpGrowth', format: 'trend', tab: 'economy',
    thresholds: { good: 0.02, warn: 0, danger: -0.05 } },
  { key: 'jobs', label: 'Jobs', metric: 'unemployment', format: 'percent', tab: 'inequality',
    thresholds: { good: 0.05, warn: 0.15, danger: 0.25 }, invert: true },
  { key: 'prices', label: 'Prices', metric: 'inflation', format: 'percentRaw', tab: 'economy',
    thresholds: { good: 3, warn: 8, danger: 15 }, invert: true },
  { key: 'approval', label: 'Approval', metric: 'approvalRating', format: 'bar', tab: 'fiscal',
    thresholds: { good: 60, warn: 30, danger: 15 }, useRoot: true },
  { key: 'fx', label: 'FX', metric: 'fxRate', format: 'number', tab: 'economy',
    thresholds: { good: 0.3, warn: 0.6, danger: 1.0 }, deviation: true }
]

function chipColor(chip, value) {
  if (value === undefined || value === null) return '#475569'
  const t = chip.thresholds
  if (chip.deviation) {
    const dev = Math.abs(value - 1)
    if (dev <= t.good) return '#22c55e'
    if (dev <= t.warn) return '#f59e0b'
    return '#ef4444'
  }
  if (chip.invert) {
    if (value <= t.good) return '#22c55e'
    if (value <= t.warn) return '#f59e0b'
    return '#ef4444'
  }
  if (value >= t.good) return '#22c55e'
  if (value >= t.warn) return '#f59e0b'
  return '#ef4444'
}

function formatChipValue(chip, value) {
  if (value === undefined || value === null) return '--'
  switch (chip.format) {
    case 'trend': {
      const arrow = value >= 0 ? '\u2191' : '\u2193'
      return `${arrow}${Math.abs(value * 100).toFixed(1)}%`
    }
    case 'percent':
      return `${(value * 100).toFixed(1)}%`
    case 'percentRaw':
      return `${value.toFixed(1)}%`
    case 'bar':
      return `${Math.round(value)}%`
    case 'number':
      return value.toFixed(2)
    default:
      return String(value)
  }
}

export default function VitalSigns({ metrics, approvalRating, onTabSwitch }) {
  const chips = useMemo(() => {
    if (!metrics) return CHIPS.map(c => ({ ...c, value: undefined, color: '#475569' }))
    return CHIPS.map(c => {
      const value = c.useRoot ? approvalRating : (c.metric === 'inflation' ? metrics.history?.inflation?.slice(-1)[0] : metrics[c.metric])
      return { ...c, value, color: chipColor(c, value) }
    })
  }, [metrics, approvalRating])

  return (
    <div className="bg-[#0d0d14] border-b border-[#1e1e2e] px-3 py-1.5 flex items-center gap-2 overflow-x-auto">
      {chips.map(chip => (
        <button
          key={chip.key}
          onClick={() => onTabSwitch?.(chip.tab)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all hover:bg-[#12121a] flex-shrink-0"
          style={{ borderColor: chip.color + '44' }}
          title={`${chip.label} - Click to view ${chip.tab} tab`}
        >
          {/* Health dot */}
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: chip.color }}
          />
          <span className="text-[10px] font-mono text-[#64748b] uppercase">{chip.label}</span>
          <span className="text-xs font-mono font-bold" style={{ color: chip.color }}>
            {formatChipValue(chip, chip.value)}
          </span>
          {/* Mini bar for approval */}
          {chip.format === 'bar' && chip.value !== undefined && (
            <div className="w-8 h-1.5 bg-[#1e1e2e] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, chip.value)}%`, backgroundColor: chip.color }}
              />
            </div>
          )}
        </button>
      ))}
    </div>
  )
}
