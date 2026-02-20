import { useMemo } from 'react'
import {
  LineChart, Line, ResponsiveContainer, Tooltip, AreaChart, Area
} from 'recharts'
import { SECTOR_COLORS } from '../rendering/colors.js'

function MetricCard({ label, value, unit = '', trend, color = '#6366f1', history = [], format = 'number' }) {
  const displayValue = useMemo(() => {
    if (format === 'percent') return (value * 100).toFixed(1) + '%'
    if (format === 'currency') return '$' + formatNum(value)
    if (format === 'index') return value.toFixed(1)
    return formatNum(value)
  }, [value, format])

  const chartData = history.slice(-40).map((v, i) => ({ i, v }))

  return (
    <div className="bg-[#12121a] border border-[#1e1e2e] rounded-lg p-3 flex flex-col gap-1">
      <div className="text-[#64748b] text-xs uppercase tracking-wider font-mono">{label}</div>
      <div className="flex items-end gap-2">
        <span className="text-white text-xl font-bold font-mono" style={{ color }}>
          {displayValue}
        </span>
        {unit && <span className="text-[#64748b] text-xs mb-1">{unit}</span>}
        {trend !== undefined && (
          <span className={`text-xs mb-1 ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend * 100).toFixed(1)}%
          </span>
        )}
      </div>
      {chartData.length > 5 && (
        <div className="h-8 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <Area
                type="monotone"
                dataKey="v"
                stroke={color}
                fill={color + '22'}
                strokeWidth={1}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

function PriceGrid({ prices, supply, demand }) {
  return (
    <div className="bg-[#12121a] border border-[#1e1e2e] rounded-lg p-3">
      <div className="text-[#64748b] text-xs uppercase tracking-wider font-mono mb-2">Market Prices</div>
      <div className="grid grid-cols-2 gap-1.5">
        {Object.entries(prices || {}).map(([sector, price]) => {
          const s = supply?.[sector] || 0
          const d = demand?.[sector] || 0
          const pressure = d > s ? 'text-red-400' : 'text-green-400'
          const pressureIcon = d > s ? '↑' : '↓'
          return (
            <div key={sector} className="flex justify-between items-center text-xs">
              <span style={{ color: SECTOR_COLORS[sector] }} className="font-mono capitalize">
                {sector}
              </span>
              <span className={`font-mono font-bold ${pressure}`}>
                ${price.toFixed(1)} {pressureIcon}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function GiniBar({ value }) {
  const pct = (value * 100).toFixed(1)
  const color = value > 0.5 ? '#ef4444' : value > 0.35 ? '#f59e0b' : '#22c55e'
  return (
    <div className="bg-[#12121a] border border-[#1e1e2e] rounded-lg p-3">
      <div className="text-[#64748b] text-xs uppercase tracking-wider font-mono mb-2">
        Inequality (Gini) — {pct}
      </div>
      <div className="w-full bg-[#1e1e2e] rounded-full h-2 mb-1">
        <div
          className="h-2 rounded-full transition-all duration-500"
          style={{ width: `${Math.min(100, value * 100)}%`, backgroundColor: color }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-[#475569]">
        <span>Perfect Equality (0)</span>
        <span>Total Inequality (1)</span>
      </div>
    </div>
  )
}

function EventBadge({ event }) {
  return (
    <div className="bg-[#1e1e2e] border border-[#334155] rounded px-2 py-1 text-xs flex items-center gap-1">
      <span>{event.icon}</span>
      <span className="text-[#e2e8f0] font-mono">{event.name}</span>
    </div>
  )
}

export default function Dashboard({ metrics, market, activeEvents = [] }) {
  if (!metrics) return (
    <div className="text-[#475569] text-sm font-mono p-4">Loading metrics...</div>
  )

  const { history = {} } = metrics

  return (
    <div className="flex flex-col gap-2 overflow-y-auto h-full">
      {/* Active events */}
      {activeEvents.length > 0 && (
        <div className="flex flex-wrap gap-1 px-1">
          {activeEvents.map(e => <EventBadge key={e.id} event={e} />)}
        </div>
      )}

      {/* Year/Tick */}
      <div className="text-[#475569] text-xs font-mono px-1">
        Year {metrics.year} · Tick {metrics.tick} · Pop {metrics.population}
      </div>

      {/* Primary metrics */}
      <div className="grid grid-cols-2 gap-2">
        <MetricCard
          label="GDP"
          value={metrics.gdp}
          format="currency"
          trend={metrics.gdpGrowth}
          color="#6366f1"
          history={history.gdp || []}
        />
        <MetricCard
          label="Unemployment"
          value={metrics.unemployment}
          format="percent"
          color={metrics.unemployment > 0.15 ? '#ef4444' : '#22c55e'}
          history={history.unemployment || []}
        />
        <MetricCard
          label="Inflation (CPI)"
          value={metrics.cpi}
          format="index"
          color={metrics.cpi > 120 ? '#f97316' : '#e2e8f0'}
          history={history.cpi || []}
        />
        <MetricCard
          label="Avg Wage"
          value={metrics.avgWage}
          format="currency"
          color="#06b6d4"
        />
      </div>

      {/* Gini bar */}
      <GiniBar value={metrics.gini} />

      {/* Prices */}
      <PriceGrid prices={market?.prices} supply={market?.supply} demand={market?.demand} />

      {/* Secondary metrics */}
      <div className="grid grid-cols-2 gap-2">
        <MetricCard
          label="Poverty Rate"
          value={metrics.povertyRate}
          format="percent"
          color={metrics.povertyRate > 0.25 ? '#ef4444' : '#94a3b8'}
        />
        <MetricCard
          label="Social Unrest"
          value={metrics.socialUnrest}
          format="percent"
          color={metrics.socialUnrest > 0.5 ? '#ef4444' : '#94a3b8'}
          history={history.unrest || []}
        />
        <MetricCard
          label="Businesses"
          value={metrics.businessCount}
          color="#f59e0b"
        />
        <MetricCard
          label="Gov Debt"
          value={Math.abs(metrics.govDebt || 0)}
          format="currency"
          color={(metrics.govDebt || 0) > 1000 ? '#ef4444' : '#64748b'}
        />
      </div>
    </div>
  )
}

function formatNum(n) {
  if (n === undefined || n === null || isNaN(n)) return '0'
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(1) + 'B'
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return Math.round(n).toString()
}
