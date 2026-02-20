import { useMemo } from 'react'
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar, ScatterChart, Scatter,
  ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Cell
} from 'recharts'

// ─── Shared chart theme ────────────────────────────────────────────────────────

const DARK_TOOLTIP = {
  contentStyle: { background: '#0d0d14', border: '1px solid #334155', borderRadius: 8, fontSize: 11, fontFamily: 'monospace' },
  labelStyle: { color: '#94a3b8' },
  itemStyle: { color: '#e2e8f0' }
}

const AXIS_STYLE = {
  tick: { fill: '#475569', fontSize: 9, fontFamily: 'monospace' },
  axisLine: { stroke: '#1e1e2e' },
  tickLine: false
}

function ChartCard({ title, subtitle, color = '#6366f1', children, wide = false }) {
  return (
    <div className={`bg-[#0d0d14] border border-[#1e1e2e] rounded-xl p-3 flex flex-col gap-1 ${wide ? 'col-span-2' : ''}`}>
      <div className="flex-shrink-0">
        <div className="text-xs font-mono font-bold" style={{ color }}>{title}</div>
        {subtitle && <div className="text-[10px] font-mono text-[#475569]">{subtitle}</div>}
      </div>
      {/* Fixed pixel height so ResponsiveContainer height="100%" resolves */}
      <div style={{ height: 160, width: '100%' }}>
        {children}
      </div>
    </div>
  )
}

// ─── Individual chart panels ───────────────────────────────────────────────────

function GDPChart({ history }) {
  const data = (history.gdp || []).map((v, i) => ({ i, gdp: v }))
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gdpGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
        <XAxis dataKey="i" {...AXIS_STYLE} tickFormatter={i => `${Math.round(i / 52)}y`} interval={Math.floor((data.length - 1) / 5)} />
        <YAxis {...AXIS_STYLE} tickFormatter={v => v >= 1e6 ? `${(v/1e6).toFixed(0)}M` : v >= 1e3 ? `${(v/1e3).toFixed(0)}K` : v} width={36} />
        <Tooltip {...DARK_TOOLTIP} formatter={v => ['$' + formatNum(v), 'GDP']} labelFormatter={i => `Year ${Math.round(i / 52)}`} />
        <Area type="monotone" dataKey="gdp" stroke="#6366f1" fill="url(#gdpGrad)" strokeWidth={2} dot={false} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

function UnemploymentInflationChart({ history }) {
  const len = Math.min((history.unemployment || []).length, (history.inflation || []).length)
  const data = Array.from({ length: len }, (_, i) => ({
    i,
    unemployment: history.unemployment[i],
    inflation: history.inflation[i]
  }))
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
        <XAxis dataKey="i" {...AXIS_STYLE} tickFormatter={i => `${Math.round(i / 52)}y`} interval={Math.floor((data.length - 1) / 5)} />
        <YAxis {...AXIS_STYLE} tickFormatter={v => v.toFixed(0) + '%'} width={36} />
        <Tooltip {...DARK_TOOLTIP} formatter={(v, name) => [v.toFixed(1) + '%', name === 'unemployment' ? 'Unemployment' : 'Inflation']} labelFormatter={i => `Year ${Math.round(i / 52)}`} />
        <ReferenceLine y={5} stroke="#475569" strokeDasharray="3 3" />
        <Line type="monotone" dataKey="unemployment" stroke="#f59e0b" strokeWidth={2} dot={false} isAnimationActive={false} />
        <Line type="monotone" dataKey="inflation" stroke="#ef4444" strokeWidth={2} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}

const SECTOR_COLORS = { food: '#22c55e', housing: '#06b6d4', tech: '#6366f1', luxury: '#f59e0b' }

function SectorPricesChart({ sectorPrices }) {
  const sp = sectorPrices || {}
  const len = Math.max(...Object.values(sp).map(a => a?.length || 0), 0)
  const data = Array.from({ length: len }, (_, i) => ({
    i,
    food: sp.food?.[i],
    housing: sp.housing?.[i],
    tech: sp.tech?.[i],
    luxury: sp.luxury?.[i]
  }))
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
        <XAxis dataKey="i" {...AXIS_STYLE} tickFormatter={i => `${Math.round(i / 52)}y`} interval={Math.floor((data.length - 1) / 5)} />
        <YAxis {...AXIS_STYLE} tickFormatter={v => '$' + v?.toFixed(0)} width={36} />
        <Tooltip {...DARK_TOOLTIP} formatter={(v, name) => ['$' + (v || 0).toFixed(1), name]} labelFormatter={i => `Year ${Math.round(i / 52)}`} />
        {Object.entries(SECTOR_COLORS).map(([sector, color]) => (
          <Line key={sector} type="monotone" dataKey={sector} stroke={color} strokeWidth={1.5} dot={false} isAnimationActive={false} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}

function InequalityChart({ history }) {
  const len = Math.min((history.gini || []).length, (history.poverty || []).length)
  const data = Array.from({ length: len }, (_, i) => ({
    i,
    gini: history.gini[i] * 100,
    poverty: history.poverty[i]
  }))
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
        <XAxis dataKey="i" {...AXIS_STYLE} tickFormatter={i => `${Math.round(i / 52)}y`} interval={Math.floor((data.length - 1) / 5)} />
        <YAxis {...AXIS_STYLE} tickFormatter={v => v.toFixed(0)} width={28} domain={[0, 100]} />
        <Tooltip {...DARK_TOOLTIP} formatter={(v, name) => [v.toFixed(1), name === 'gini' ? 'Gini ×100' : 'Poverty %']} labelFormatter={i => `Year ${Math.round(i / 52)}`} />
        <ReferenceLine y={50} stroke="#ef444444" strokeDasharray="3 3" />
        <Line type="monotone" dataKey="gini" stroke="#ec4899" strokeWidth={2} dot={false} isAnimationActive={false} />
        <Line type="monotone" dataKey="poverty" stroke="#f97316" strokeWidth={2} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}

function GovBudgetChart({ history }) {
  const data = (history.govBudget || []).map((v, i) => ({ i, budget: v, fill: v >= 0 ? '#22c55e' : '#ef4444' }))
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
        <XAxis dataKey="i" {...AXIS_STYLE} tickFormatter={i => `${Math.round(i / 52)}y`} interval={Math.floor((data.length - 1) / 5)} />
        <YAxis {...AXIS_STYLE} tickFormatter={v => v >= 1e3 ? `${(v/1e3).toFixed(0)}K` : v} width={36} />
        <Tooltip {...DARK_TOOLTIP} formatter={v => [formatNum(v), v >= 0 ? 'Surplus' : 'Deficit']} labelFormatter={i => `Year ${Math.round(i / 52)}`} />
        <ReferenceLine y={0} stroke="#475569" />
        <Bar dataKey="budget" radius={[1, 1, 0, 0]} isAnimationActive={false}>
          {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

function PopulationChart({ history }) {
  const data = (history.population || []).map((v, i) => ({ i, pop: v }))
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="popGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
        <XAxis dataKey="i" {...AXIS_STYLE} tickFormatter={i => `${Math.round(i / 52)}y`} interval={Math.floor((data.length - 1) / 5)} />
        <YAxis {...AXIS_STYLE} width={28} />
        <Tooltip {...DARK_TOOLTIP} formatter={v => [v, 'Population']} labelFormatter={i => `Year ${Math.round(i / 52)}`} />
        <Area type="monotone" dataKey="pop" stroke="#06b6d4" fill="url(#popGrad)" strokeWidth={2} dot={false} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

function PhillipsCurveChart({ history }) {
  const unem = history.unemployment || []
  const infl = history.inflation || []
  const len = Math.min(unem.length, infl.length)

  // Take last 100 data points, color gradient from gray (old) to bright (recent)
  const pts = Array.from({ length: len }, (_, i) => ({
    x: unem[i],
    y: infl[i],
    age: i / len  // 0 = oldest, 1 = newest
  })).slice(-120)

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ScatterChart margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
        <XAxis dataKey="x" {...AXIS_STYLE} name="Unemployment" tickFormatter={v => v?.toFixed(0) + '%'} label={{ value: 'Unemployment %', position: 'insideBottom', offset: -2, style: { fill: '#475569', fontSize: 9 } }} />
        <YAxis dataKey="y" {...AXIS_STYLE} name="Inflation" tickFormatter={v => v?.toFixed(0) + '%'} width={28} />
        <Tooltip {...DARK_TOOLTIP} formatter={(v, name) => [v?.toFixed(1) + '%', name === 'x' ? 'Unemployment' : 'Inflation']} />
        <ReferenceLine y={0} stroke="#47556999" />
        <Scatter data={pts} isAnimationActive={false}>
          {pts.map((p, i) => (
            <Cell key={i} fill={`hsl(${240 + p.age * 90}, 80%, ${30 + p.age * 40}%)`} />
          ))}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  )
}

function BusinessChart({ history }) {
  const data = (history.businessCount || []).map((v, i) => ({ i, count: v }))
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="bizGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
        <XAxis dataKey="i" {...AXIS_STYLE} tickFormatter={i => `${Math.round(i / 52)}y`} interval={Math.floor((data.length - 1) / 5)} />
        <YAxis {...AXIS_STYLE} width={28} />
        <Tooltip {...DARK_TOOLTIP} formatter={v => [v, 'Businesses']} labelFormatter={i => `Year ${Math.round(i / 52)}`} />
        <Area type="monotone" dataKey="count" stroke="#f59e0b" fill="url(#bizGrad)" strokeWidth={2} dot={false} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

function WealthChart({ history }) {
  const len = Math.min((history.wages || []).length, (history.medianWealth || []).length)
  const data = Array.from({ length: len }, (_, i) => ({
    i,
    wage: history.wages[i],
    median: history.medianWealth[i]
  }))
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
        <XAxis dataKey="i" {...AXIS_STYLE} tickFormatter={i => `${Math.round(i / 52)}y`} interval={Math.floor((data.length - 1) / 5)} />
        <YAxis {...AXIS_STYLE} tickFormatter={v => '$' + v?.toFixed(0)} width={36} />
        <Tooltip {...DARK_TOOLTIP} formatter={(v, name) => ['$' + (v || 0).toFixed(1), name === 'wage' ? 'Avg Wage' : 'Median Wealth']} labelFormatter={i => `Year ${Math.round(i / 52)}`} />
        <Line type="monotone" dataKey="wage" stroke="#22c55e" strokeWidth={2} dot={false} isAnimationActive={false} />
        <Line type="monotone" dataKey="median" stroke="#8b5cf6" strokeWidth={2} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}

function CPIChart({ history }) {
  const data = (history.cpi || []).map((v, i) => ({ i, cpi: v }))
  const baseline = data[0]?.cpi || 100
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="cpiGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f97316" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#f97316" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
        <XAxis dataKey="i" {...AXIS_STYLE} tickFormatter={i => `${Math.round(i / 52)}y`} interval={Math.floor((data.length - 1) / 5)} />
        <YAxis {...AXIS_STYLE} domain={['auto', 'auto']} width={36} />
        <Tooltip {...DARK_TOOLTIP} formatter={v => [v.toFixed(1), 'CPI Index']} labelFormatter={i => `Year ${Math.round(i / 52)}`} />
        <ReferenceLine y={baseline} stroke="#47556966" strokeDasharray="3 3" label={{ value: 'Baseline', style: { fill: '#475569', fontSize: 9 } }} />
        <ReferenceLine y={baseline * 2} stroke="#ef444444" strokeDasharray="3 3" />
        <Area type="monotone" dataKey="cpi" stroke="#f97316" fill="url(#cpiGrad)" strokeWidth={2} dot={false} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ─── Stat pill ─────────────────────────────────────────────────────────────────

function StatPill({ label, value, color = '#94a3b8', bg = '#1e1e2e' }) {
  return (
    <div className="flex flex-col items-center px-3 py-2 rounded-lg" style={{ backgroundColor: bg + '44' }}>
      <span className="text-[10px] font-mono text-[#64748b] uppercase tracking-wider">{label}</span>
      <span className="text-sm font-bold font-mono mt-0.5" style={{ color }}>{value}</span>
    </div>
  )
}

// ─── Legend item ───────────────────────────────────────────────────────────────
function LegendDot({ color, label }) {
  return (
    <span className="flex items-center gap-1 text-[10px] font-mono text-[#64748b]">
      <span className="w-2 h-2 rounded-full inline-block flex-shrink-0" style={{ background: color }} />
      {label}
    </span>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function MacroDashboard({ metrics, market, onClose }) {
  const history = metrics?.history || {}

  const currentYear = metrics?.year ?? 0
  const giniPct = ((metrics?.gini ?? 0) * 100).toFixed(1)
  const giniColor = (metrics?.gini ?? 0) > 0.5 ? '#ef4444' : (metrics?.gini ?? 0) > 0.35 ? '#f59e0b' : '#22c55e'
  const cpiVal = (metrics?.cpi ?? 100).toFixed(1)
  const inflVal = (metrics?.inflation ?? 0).toFixed(2)
  const unemVal = ((metrics?.unemployment ?? 0) * 100).toFixed(1)
  const povertyVal = ((metrics?.povertyRate ?? 0) * 100).toFixed(1)
  const gdpVal = '$' + formatNum(metrics?.gdp ?? 0)
  const debtVal = '$' + formatNum(Math.abs(metrics?.govDebt ?? 0))
  const popVal = metrics?.population ?? 0
  const bizVal = metrics?.businessCount ?? 0

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm overflow-y-auto">
      <div className="max-w-7xl mx-auto px-4 py-4">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-white font-bold text-xl font-mono">📊 Macroeconomic Dashboard</h2>
            <p className="text-[#64748b] text-sm font-mono">Year {currentYear} · Live simulation statistics</p>
          </div>
          <button
            onClick={onClose}
            className="text-[#475569] hover:text-white text-2xl transition-colors leading-none"
          >✕</button>
        </div>

        {/* Key stats bar */}
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 mb-4">
          <StatPill label="GDP" value={gdpVal} color="#6366f1" bg="#6366f1" />
          <StatPill label="Growth" value={((metrics?.gdpGrowth ?? 0) * 100).toFixed(2) + '%'} color={(metrics?.gdpGrowth ?? 0) >= 0 ? '#22c55e' : '#ef4444'} bg={(metrics?.gdpGrowth ?? 0) >= 0 ? '#22c55e' : '#ef4444'} />
          <StatPill label="Unemploy" value={unemVal + '%'} color={parseFloat(unemVal) > 15 ? '#ef4444' : '#f59e0b'} bg="#f59e0b" />
          <StatPill label="Inflation" value={inflVal + '%'} color={parseFloat(inflVal) > 5 ? '#ef4444' : '#94a3b8'} bg="#f97316" />
          <StatPill label="Gini" value={giniPct} color={giniColor} bg={giniColor} />
          <StatPill label="Poverty" value={povertyVal + '%'} color={parseFloat(povertyVal) > 25 ? '#ef4444' : '#94a3b8'} bg="#ec4899" />
          <StatPill label="Gov Debt" value={debtVal} color={(metrics?.govDebt ?? 0) > 2000 ? '#ef4444' : '#94a3b8'} bg="#64748b" />
          <StatPill label="Pop / Biz" value={`${popVal} / ${bizVal}`} color="#06b6d4" bg="#06b6d4" />
        </div>

        {/* Chart grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">

          <ChartCard title="GDP" subtitle="Total economic output over time" color="#6366f1">
            <GDPChart history={history} />
          </ChartCard>

          <ChartCard title="Unemployment & Inflation" subtitle="— unemployment  — inflation" color="#f59e0b">
            <UnemploymentInflationChart history={history} />
            <div className="flex gap-3 mt-1">
              <LegendDot color="#f59e0b" label="Unemployment %" />
              <LegendDot color="#ef4444" label="Inflation %" />
            </div>
          </ChartCard>

          <ChartCard title="CPI Index" subtitle="Consumer price index — baseline = 100" color="#f97316">
            <CPIChart history={history} />
          </ChartCard>

          <ChartCard title="Sector Prices" subtitle="Food · Housing · Tech · Luxury" color="#22c55e">
            <SectorPricesChart sectorPrices={history.sectorPrices} />
            <div className="flex flex-wrap gap-3 mt-1">
              {Object.entries(SECTOR_COLORS).map(([s, c]) => (
                <LegendDot key={s} color={c} label={s} />
              ))}
            </div>
          </ChartCard>

          <ChartCard title="Inequality" subtitle="— Gini ×100  — Poverty %" color="#ec4899">
            <InequalityChart history={history} />
            <div className="flex gap-3 mt-1">
              <LegendDot color="#ec4899" label="Gini ×100" />
              <LegendDot color="#f97316" label="Poverty %" />
            </div>
          </ChartCard>

          <ChartCard title="Gov Budget" subtitle="Green = surplus · Red = deficit" color="#22c55e">
            <GovBudgetChart history={history} />
          </ChartCard>

          <ChartCard title="Phillips Curve" subtitle="Inflation vs unemployment — color = time (dark=old)" color="#8b5cf6">
            <PhillipsCurveChart history={history} />
          </ChartCard>

          <ChartCard title="Population" subtitle="Total alive agents" color="#06b6d4">
            <PopulationChart history={history} />
          </ChartCard>

          <ChartCard title="Wages & Wealth" subtitle="— avg wage  — median wealth" color="#22c55e">
            <WealthChart history={history} />
            <div className="flex gap-3 mt-1">
              <LegendDot color="#22c55e" label="Avg Wage" />
              <LegendDot color="#8b5cf6" label="Median Wealth" />
            </div>
          </ChartCard>

          <ChartCard title="Business Count" subtitle="Active firms over time" color="#f59e0b">
            <BusinessChart history={history} />
          </ChartCard>

          {/* Sector snapshot table */}
          <ChartCard title="Sector Snapshot" subtitle="Current supply vs demand" color="#06b6d4">
            <div className="flex flex-col gap-2 mt-2">
              {['food', 'housing', 'tech', 'luxury'].map(sector => {
                const price = market?.prices?.[sector] ?? 0
                const supply = market?.supply?.[sector] ?? 0
                const demand = market?.demand?.[sector] ?? 0
                const pressureRatio = demand / Math.max(supply, 1)
                const color = pressureRatio > 1.2 ? '#ef4444' : pressureRatio < 0.8 ? '#22c55e' : '#f59e0b'
                const barW = Math.min(100, (supply / Math.max(demand, 1)) * 50)
                return (
                  <div key={sector}>
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="text-xs font-mono capitalize" style={{ color: SECTOR_COLORS[sector] }}>{sector}</span>
                      <span className="text-xs font-mono font-bold" style={{ color }}>${price.toFixed(1)}</span>
                    </div>
                    <div className="flex gap-1 items-center">
                      <div className="flex-1 h-1.5 bg-[#1e1e2e] rounded-full overflow-hidden">
                        <div
                          className="h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${barW}%`, backgroundColor: SECTOR_COLORS[sector] }}
                        />
                      </div>
                      <span className="text-[9px] font-mono text-[#475569] w-16 text-right">
                        S:{supply.toFixed(0)} D:{demand.toFixed(0)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </ChartCard>

          {/* Social unrest */}
          <ChartCard title="Social Unrest" subtitle="% of population in unrest" color="#ef4444">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={(history.unrest || []).map((v, i) => ({ i, unrest: v }))} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="unrestGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
                <XAxis dataKey="i" {...AXIS_STYLE} tickFormatter={i => `${Math.round(i / 52)}y`} interval={Math.floor(((history.unrest || []).length - 1) / 5)} />
                <YAxis {...AXIS_STYLE} tickFormatter={v => v.toFixed(0) + '%'} width={32} domain={[0, 100]} />
                <Tooltip {...DARK_TOOLTIP} formatter={v => [v.toFixed(1) + '%', 'Unrest']} labelFormatter={i => `Year ${Math.round(i / 52)}`} />
                <ReferenceLine y={50} stroke="#ef444466" strokeDasharray="3 3" />
                <Area type="monotone" dataKey="unrest" stroke="#ef4444" fill="url(#unrestGrad)" strokeWidth={2} dot={false} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

        </div>

        <div className="mt-4 text-center text-[#334155] text-xs font-mono pb-4">
          Data updates every 10 ticks · Last {(history.gdp || []).length} data points shown
        </div>
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
