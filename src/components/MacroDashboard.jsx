import { useMemo, useState } from 'react'
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar, ScatterChart, Scatter,
  ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, ReferenceArea, Cell
} from 'recharts'

// ─── Shared chart theme ────────────────────────────────────────────────────────

const DARK_TOOLTIP = {
  contentStyle: { background: '#0d0d14', border: '1px solid #334155', borderRadius: 8, fontSize: 11, fontFamily: 'monospace', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' },
  labelStyle: { color: '#94a3b8', marginBottom: 2 },
  itemStyle: { color: '#e2e8f0', padding: '1px 0' },
  cursor: { stroke: '#6366f144', strokeWidth: 1 }
}

const AXIS_STYLE = {
  tick: { fill: '#475569', fontSize: 9, fontFamily: 'monospace' },
  axisLine: { stroke: '#1e1e2e' },
  tickLine: false
}

const ZONE_WARN = '#f59e0b0a'
const ZONE_DANGER = '#ef44440d'
const ZONE_GOOD = '#22c55e08'
const LINE_WARN = '#f59e0b55'
const LINE_DANGER = '#ef444455'
const LINE_GOOD = '#22c55e44'

function ChartCard({ title, subtitle, color = '#6366f1', children, wide = false }) {
  return (
    <div className={`bg-[#0d0d14] border border-[#1e1e2e] rounded-xl p-3 flex flex-col gap-1 ${wide ? 'col-span-2' : ''}`}>
      <div className="flex-shrink-0">
        <div className="text-xs font-mono font-bold" style={{ color }}>{title}</div>
        {subtitle && <div className="text-[10px] font-mono text-[#475569]">{subtitle}</div>}
      </div>
      <div style={{ height: 140, width: '100%' }}>
        {children}
      </div>
    </div>
  )
}

// ─── Individual chart panels ───────────────────────────────────────────────────

function ApprovalChart({ approvalHistory }) {
  const data = (approvalHistory || []).map((v, i) => ({ i, approval: v }))
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="approvalGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
        <ReferenceArea y1={0} y2={20} fill={ZONE_DANGER} />
        <ReferenceArea y1={20} y2={30} fill={ZONE_WARN} />
        <ReferenceArea y1={80} y2={100} fill={ZONE_GOOD} />
        <XAxis dataKey="i" {...AXIS_STYLE} tickFormatter={i => `${Math.round(i / 52)}y`} interval={Math.floor((data.length - 1) / 5)} />
        <YAxis {...AXIS_STYLE} domain={[0, 100]} width={28} />
        <Tooltip {...DARK_TOOLTIP} formatter={v => [v?.toFixed(1) + '%', 'Approval']} labelFormatter={i => `Year ${Math.round(i / 52)}`} />
        <ReferenceLine y={20} stroke={LINE_DANGER} strokeDasharray="3 3" label={{ value: 'Regime Risk', fill: '#ef4444', fontSize: 8, position: 'insideBottomLeft' }} />
        <ReferenceLine y={80} stroke={LINE_GOOD} strokeDasharray="3 3" label={{ value: 'Mandate', fill: '#22c55e', fontSize: 8, position: 'insideTopLeft' }} />
        <Area type="monotone" dataKey="approval" stroke="#06b6d4" fill="url(#approvalGrad)" strokeWidth={2} dot={false} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

function GDPChart({ history }) {
  const data = (history.gdp || []).map((v, i) => ({ i, gdp: v }))
  const startGDP = data.length > 0 ? data[0].gdp : 0
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
        {startGDP > 0 && <ReferenceArea y1={0} y2={startGDP * 0.5} fill={ZONE_DANGER} />}
        {startGDP > 0 && <ReferenceArea y1={startGDP * 0.5} y2={startGDP * 0.8} fill={ZONE_WARN} />}
        <XAxis dataKey="i" {...AXIS_STYLE} tickFormatter={i => `${Math.round(i / 52)}y`} interval={Math.floor((data.length - 1) / 5)} />
        <YAxis {...AXIS_STYLE} tickFormatter={v => v >= 1e6 ? `${(v/1e6).toFixed(0)}M` : v >= 1e3 ? `${(v/1e3).toFixed(0)}K` : v} width={36} />
        <Tooltip {...DARK_TOOLTIP} formatter={v => ['$' + formatNum(v), 'GDP']} labelFormatter={i => `Year ${Math.round(i / 52)}`} />
        {startGDP > 0 && <ReferenceLine y={startGDP} stroke="#47556944" strokeDasharray="3 3" label={{ value: 'Start', fill: '#475569', fontSize: 8, position: 'insideTopRight' }} />}
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
        <ReferenceArea y1={10} y2={20} fill={ZONE_WARN} />
        <ReferenceArea y1={20} y2={100} fill={ZONE_DANGER} />
        <XAxis dataKey="i" {...AXIS_STYLE} tickFormatter={i => `${Math.round(i / 52)}y`} interval={Math.floor((data.length - 1) / 5)} />
        <YAxis {...AXIS_STYLE} tickFormatter={v => v.toFixed(0) + '%'} width={36} />
        <Tooltip {...DARK_TOOLTIP} formatter={(v, name) => [v.toFixed(1) + '%', name === 'unemployment' ? 'Unemployment' : 'Inflation']} labelFormatter={i => `Year ${Math.round(i / 52)}`} />
        <ReferenceLine y={5} stroke={LINE_GOOD} strokeDasharray="3 3" label={{ value: 'Healthy', fill: '#22c55e', fontSize: 8, position: 'insideTopLeft' }} />
        <ReferenceLine y={10} stroke={LINE_WARN} strokeDasharray="3 3" />
        <ReferenceLine y={20} stroke={LINE_DANGER} strokeDasharray="3 3" label={{ value: 'Crisis', fill: '#ef4444', fontSize: 8, position: 'insideTopLeft' }} />
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
  const startFood = data.length > 0 ? data[0].food || 10 : 10
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
        <ReferenceArea y1={startFood * 3} y2={startFood * 100} fill={ZONE_DANGER} />
        <XAxis dataKey="i" {...AXIS_STYLE} tickFormatter={i => `${Math.round(i / 52)}y`} interval={Math.floor((data.length - 1) / 5)} />
        <YAxis {...AXIS_STYLE} tickFormatter={v => '$' + v?.toFixed(0)} width={36} />
        <Tooltip {...DARK_TOOLTIP} formatter={(v, name) => ['$' + (v || 0).toFixed(1), name]} labelFormatter={i => `Year ${Math.round(i / 52)}`} />
        <ReferenceLine y={startFood} stroke="#47556944" strokeDasharray="3 3" label={{ value: 'Base', fill: '#475569', fontSize: 8, position: 'insideTopRight' }} />
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
        <ReferenceArea y1={35} y2={50} fill={ZONE_WARN} />
        <ReferenceArea y1={50} y2={100} fill={ZONE_DANGER} />
        <XAxis dataKey="i" {...AXIS_STYLE} tickFormatter={i => `${Math.round(i / 52)}y`} interval={Math.floor((data.length - 1) / 5)} />
        <YAxis {...AXIS_STYLE} tickFormatter={v => v.toFixed(0)} width={28} domain={[0, 100]} />
        <Tooltip {...DARK_TOOLTIP} formatter={(v, name) => [v.toFixed(1), name === 'gini' ? 'Gini x100' : 'Poverty %']} labelFormatter={i => `Year ${Math.round(i / 52)}`} />
        <ReferenceLine y={35} stroke={LINE_WARN} strokeDasharray="3 3" label={{ value: 'High', fill: '#f59e0b', fontSize: 8, position: 'insideTopLeft' }} />
        <ReferenceLine y={50} stroke={LINE_DANGER} strokeDasharray="3 3" label={{ value: 'Extreme', fill: '#ef4444', fontSize: 8, position: 'insideTopLeft' }} />
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
        <ReferenceArea y1={-999999} y2={0} fill={ZONE_DANGER} />
        <XAxis dataKey="i" {...AXIS_STYLE} tickFormatter={i => `${Math.round(i / 52)}y`} interval={Math.floor((data.length - 1) / 5)} />
        <YAxis {...AXIS_STYLE} tickFormatter={v => v >= 1e3 ? `${(v/1e3).toFixed(0)}K` : v} width={36} />
        <Tooltip {...DARK_TOOLTIP} formatter={v => [formatNum(v), v >= 0 ? 'Surplus' : 'Deficit']} labelFormatter={i => `Year ${Math.round(i / 52)}`} />
        <ReferenceLine y={0} stroke="#475569" label={{ value: 'Balanced', fill: '#475569', fontSize: 8, position: 'insideTopLeft' }} />
        <Bar dataKey="budget" radius={[1, 1, 0, 0]} isAnimationActive={false}>
          {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

function PopulationChart({ history }) {
  const data = (history.population || []).map((v, i) => ({ i, pop: v }))
  const startPop = data.length > 0 ? data[0].pop : 0
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
        {startPop > 0 && <ReferenceArea y1={0} y2={startPop * 0.3} fill={ZONE_DANGER} />}
        {startPop > 0 && <ReferenceArea y1={startPop * 0.3} y2={startPop * 0.6} fill={ZONE_WARN} />}
        <XAxis dataKey="i" {...AXIS_STYLE} tickFormatter={i => `${Math.round(i / 52)}y`} interval={Math.floor((data.length - 1) / 5)} />
        <YAxis {...AXIS_STYLE} width={28} />
        <Tooltip {...DARK_TOOLTIP} formatter={v => [v, 'Population']} labelFormatter={i => `Year ${Math.round(i / 52)}`} />
        {startPop > 0 && <ReferenceLine y={startPop * 0.5} stroke={LINE_DANGER} strokeDasharray="3 3" label={{ value: 'Collapse', fill: '#ef4444', fontSize: 8, position: 'insideTopLeft' }} />}
        <Area type="monotone" dataKey="pop" stroke="#06b6d4" fill="url(#popGrad)" strokeWidth={2} dot={false} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

function PrivateDebtChart({ history }) {
  const data = (history.privateDebt || []).map((v, i) => ({ i, debt: v }))
  const gdpData = history.gdp || []
  const avgGDP = gdpData.length > 0 ? gdpData.reduce((a, b) => a + b, 0) / gdpData.length : 0
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="debtGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f97316" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#f97316" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
        {avgGDP > 0 && <ReferenceArea y1={avgGDP} y2={avgGDP * 2} fill={ZONE_WARN} />}
        {avgGDP > 0 && <ReferenceArea y1={avgGDP * 2} y2={avgGDP * 100} fill={ZONE_DANGER} />}
        <XAxis dataKey="i" {...AXIS_STYLE} tickFormatter={i => `${Math.round(i / 52)}y`} interval={Math.floor((data.length - 1) / 5)} />
        <YAxis {...AXIS_STYLE} tickFormatter={v => v >= 1e3 ? `${(v/1e3).toFixed(0)}K` : v} width={36} />
        <Tooltip {...DARK_TOOLTIP} formatter={v => ['$' + formatNum(v), 'Private Debt']} labelFormatter={i => `Year ${Math.round(i / 52)}`} />
        {avgGDP > 0 && <ReferenceLine y={avgGDP} stroke={LINE_WARN} strokeDasharray="3 3" label={{ value: 'Debt=GDP', fill: '#f59e0b', fontSize: 8, position: 'insideTopLeft' }} />}
        <Area type="monotone" dataKey="debt" stroke="#f97316" fill="url(#debtGrad)" strokeWidth={2} dot={false} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

function CreditScoreChart({ history }) {
  const data = (history.creditScore || []).map((v, i) => ({ i, score: v }))
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="creditGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
        <ReferenceArea y1={300} y2={500} fill={ZONE_DANGER} />
        <ReferenceArea y1={500} y2={600} fill={ZONE_WARN} />
        <ReferenceArea y1={700} y2={850} fill={ZONE_GOOD} />
        <XAxis dataKey="i" {...AXIS_STYLE} tickFormatter={i => `${Math.round(i / 52)}y`} interval={Math.floor((data.length - 1) / 5)} />
        <YAxis {...AXIS_STYLE} domain={[300, 850]} width={32} />
        <Tooltip {...DARK_TOOLTIP} formatter={v => [Math.round(v), 'Avg Credit Score']} labelFormatter={i => `Year ${Math.round(i / 52)}`} />
        <ReferenceLine y={500} stroke={LINE_DANGER} strokeDasharray="3 3" label={{ value: 'Poor', fill: '#ef4444', fontSize: 8, position: 'insideBottomLeft' }} />
        <ReferenceLine y={600} stroke={LINE_WARN} strokeDasharray="3 3" label={{ value: 'Fair', fill: '#f59e0b', fontSize: 8, position: 'insideBottomLeft' }} />
        <ReferenceLine y={700} stroke={LINE_GOOD} strokeDasharray="3 3" label={{ value: 'Good', fill: '#22c55e', fontSize: 8, position: 'insideTopLeft' }} />
        <Area type="monotone" dataKey="score" stroke="#8b5cf6" fill="url(#creditGrad)" strokeWidth={2} dot={false} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

function CrimeChart({ history }) {
  const crimeData = history.crime || []
  const prisonData = history.prisonPop || []
  const len = Math.max(crimeData.length, prisonData.length)
  const data = Array.from({ length: len }, (_, i) => ({
    i,
    crime: crimeData[i] ?? 0,
    prison: prisonData[i] ?? 0
  }))
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
        <ReferenceArea y1={0.3} y2={0.5} fill={ZONE_WARN} />
        <ReferenceArea y1={0.5} y2={100} fill={ZONE_DANGER} />
        <XAxis dataKey="i" {...AXIS_STYLE} tickFormatter={i => `${Math.round(i / 52)}y`} interval={Math.floor((data.length - 1) / 5)} />
        <YAxis {...AXIS_STYLE} width={32} />
        <Tooltip {...DARK_TOOLTIP} formatter={(v, name) => [v.toFixed(1), name === 'crime' ? 'Crime Rate' : 'Prison Pop']} labelFormatter={i => `Year ${Math.round(i / 52)}`} />
        <ReferenceLine y={0.3} stroke={LINE_WARN} strokeDasharray="3 3" label={{ value: 'High', fill: '#f59e0b', fontSize: 8, position: 'insideTopLeft' }} />
        <ReferenceLine y={0.5} stroke={LINE_DANGER} strokeDasharray="3 3" label={{ value: 'Crisis', fill: '#ef4444', fontSize: 8, position: 'insideTopLeft' }} />
        <Line type="monotone" dataKey="crime" stroke="#ef4444" strokeWidth={2} dot={false} isAnimationActive={false} />
        <Line type="monotone" dataKey="prison" stroke="#f97316" strokeWidth={1.5} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}

function LegendDot({ color, label }) {
  return (
    <span className="flex items-center gap-1 text-[10px] font-mono text-[#64748b]">
      <span className="w-2 h-2 rounded-full inline-block flex-shrink-0" style={{ background: color }} />
      {label}
    </span>
  )
}

function InflationExpectationsChart({ history }) {
  const inflData = history.inflation || []
  const expData = history.inflationExp || []
  const len = Math.min(inflData.length, expData.length)
  const data = Array.from({ length: len }, (_, i) => ({
    i,
    actual: inflData[i],
    expected: expData[i]
  }))
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
        <ReferenceArea y1={5} y2={10} fill={ZONE_WARN} />
        <ReferenceArea y1={10} y2={200} fill={ZONE_DANGER} />
        <XAxis dataKey="i" {...AXIS_STYLE} tickFormatter={i => `${Math.round(i / 52)}y`} interval={Math.floor((data.length - 1) / 5)} />
        <YAxis {...AXIS_STYLE} tickFormatter={v => v?.toFixed(0) + '%'} width={36} />
        <Tooltip {...DARK_TOOLTIP} formatter={(v, name) => [(v || 0).toFixed(1) + '%', name === 'actual' ? 'Actual Inflation' : 'Expected Inflation']} labelFormatter={i => `Year ${Math.round(i / 52)}`} />
        <ReferenceLine y={2} stroke={LINE_GOOD} strokeDasharray="3 3" label={{ value: 'Target 2%', fill: '#22c55e', fontSize: 8, position: 'insideTopLeft' }} />
        <ReferenceLine y={5} stroke={LINE_WARN} strokeDasharray="3 3" />
        <ReferenceLine y={10} stroke={LINE_DANGER} strokeDasharray="3 3" label={{ value: 'Hyper', fill: '#ef4444', fontSize: 8, position: 'insideTopLeft' }} />
        <Line type="monotone" dataKey="actual" stroke="#ef4444" strokeWidth={2} dot={false} isAnimationActive={false} />
        <Line type="monotone" dataKey="expected" stroke="#f59e0b" strokeWidth={2} dot={false} isAnimationActive={false} strokeDasharray="5 3" />
      </LineChart>
    </ResponsiveContainer>
  )
}

function StockMarketChart({ history }) {
  const data = (history.marketCap || []).map((v, i) => ({ i, cap: v }))
  const startCap = data.length > 0 ? data[0].cap : 0
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="stockGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
        {startCap > 0 && <ReferenceArea y1={0} y2={startCap * 0.5} fill={ZONE_DANGER} />}
        {startCap > 0 && <ReferenceArea y1={startCap * 0.5} y2={startCap * 0.8} fill={ZONE_WARN} />}
        <XAxis dataKey="i" {...AXIS_STYLE} tickFormatter={i => `${Math.round(i / 52)}y`} interval={Math.floor((data.length - 1) / 5)} />
        <YAxis {...AXIS_STYLE} tickFormatter={v => v >= 1e3 ? `${(v/1e3).toFixed(0)}K` : v} width={36} />
        <Tooltip {...DARK_TOOLTIP} formatter={v => ['$' + formatNum(v), 'Market Cap']} labelFormatter={i => `Year ${Math.round(i / 52)}`} />
        {startCap > 0 && <ReferenceLine y={startCap} stroke="#47556944" strokeDasharray="3 3" label={{ value: 'IPO', fill: '#475569', fontSize: 8, position: 'insideTopRight' }} />}
        <Area type="monotone" dataKey="cap" stroke="#8b5cf6" fill="url(#stockGrad)" strokeWidth={2} dot={false} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function MacroDashboard({ metrics, market, approvalHistory, activeSection = 'economy' }) {
  const history = metrics?.history || {}

  // Render a chart by its id
  const renderChart = (id) => {
    switch (id) {
      case 'gdp':
        return (
          <ChartCard key={id} title="GDP" subtitle="Total economic output" color="#6366f1">
            <GDPChart history={history} />
          </ChartCard>
        )
      case 'unemployment_inflation':
        return (
          <ChartCard key={id} title="Unemployment & Inflation" color="#f59e0b">
            <UnemploymentInflationChart history={history} />
            <div className="flex gap-3 mt-1">
              <LegendDot color="#f59e0b" label="Unemployment %" />
              <LegendDot color="#ef4444" label="Inflation %" />
            </div>
          </ChartCard>
        )
      case 'approval':
        return (
          <ChartCard key={id} title="Approval Rating" subtitle="20% = no confidence, 80% = mandate" color="#06b6d4" wide>
            <ApprovalChart approvalHistory={approvalHistory} />
          </ChartCard>
        )
      case 'gov_budget':
        return (
          <ChartCard key={id} title="Gov Budget" subtitle="Green = surplus, Red = deficit" color="#22c55e">
            <GovBudgetChart history={history} />
          </ChartCard>
        )
      case 'inequality':
        return (
          <ChartCard key={id} title="Inequality" subtitle="Gini x100 & Poverty %" color="#ec4899">
            <InequalityChart history={history} />
            <div className="flex gap-3 mt-1">
              <LegendDot color="#ec4899" label="Gini" />
              <LegendDot color="#f97316" label="Poverty" />
            </div>
          </ChartCard>
        )
      case 'population':
        return (
          <ChartCard key={id} title="Population" subtitle="Total alive agents" color="#06b6d4">
            <PopulationChart history={history} />
          </ChartCard>
        )
      case 'private_debt':
        return (
          <ChartCard key={id} title="Private Debt" subtitle="Total outstanding loans" color="#f97316">
            <PrivateDebtChart history={history} />
          </ChartCard>
        )
      case 'credit_score':
        return (
          <ChartCard key={id} title="Credit Score" subtitle="Average credit score" color="#8b5cf6">
            <CreditScoreChart history={history} />
          </ChartCard>
        )
      case 'crime':
        return (
          <ChartCard key={id} title="Crime" subtitle="Crime rate & prison population" color="#ef4444">
            <CrimeChart history={history} />
            <div className="flex gap-3 mt-1">
              <LegendDot color="#ef4444" label="Crime Rate" />
              <LegendDot color="#f97316" label="Prison Pop" />
            </div>
          </ChartCard>
        )
      case 'sector_prices':
        return (
          <ChartCard key={id} title="Sector Prices" color="#22c55e">
            <SectorPricesChart sectorPrices={history.sectorPrices} />
            <div className="flex flex-wrap gap-2 mt-1">
              {Object.entries(SECTOR_COLORS).map(([s, c]) => (
                <LegendDot key={s} color={c} label={s} />
              ))}
            </div>
          </ChartCard>
        )
      case 'inflation_expectations':
        return (
          <ChartCard key={id} title="Inflation vs Expectations" subtitle="Actual vs expected" color="#ef4444">
            <InflationExpectationsChart history={history} />
            <div className="flex gap-3 mt-1">
              <LegendDot color="#ef4444" label="Actual" />
              <LegendDot color="#f59e0b" label="Expected" />
            </div>
          </ChartCard>
        )
      case 'stock_market':
        return (
          <ChartCard key={id} title="Stock Market" subtitle="Total market capitalization" color="#8b5cf6">
            <StockMarketChart history={history} />
          </ChartCard>
        )
      default:
        return null
    }
  }

  const SECTION_CHARTS = {
    economy:    ['gdp', 'unemployment_inflation', 'stock_market'],
    fiscal:     ['gov_budget', 'approval'],
    inequality: ['inequality', 'population'],
    banking:    ['private_debt', 'credit_score'],
    public:     ['crime', 'sector_prices'],
    weird:      ['inflation_expectations', 'sector_prices'],
    chaos:      ['approval', 'gdp']
  }

  const allChartIds = [
    'approval', 'gdp', 'unemployment_inflation', 'inflation_expectations',
    'stock_market', 'sector_prices', 'inequality', 'private_debt',
    'gov_budget', 'population', 'crime', 'credit_score'
  ]

  const [showAll, setShowAll] = useState(false)
  const focused = SECTION_CHARTS[activeSection] || allChartIds.slice(0, 3)
  const rest = allChartIds.filter(id => !focused.includes(id))

  return (
    <div className="flex flex-col gap-3 overflow-y-auto h-full p-2">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        {focused.map(id => renderChart(id))}
      </div>
      {rest.length > 0 && (
        <>
          <button
            onClick={() => setShowAll(prev => !prev)}
            className="text-[10px] font-mono text-[#475569] hover:text-[#94a3b8] transition-colors self-start px-1"
          >
            {showAll ? '▲ Hide other charts' : `▼ Show all charts (${rest.length} more)`}
          </button>
          {showAll && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
              {rest.map(id => renderChart(id))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function formatNum(n) {
  if (n === undefined || n === null || isNaN(n)) return '0'
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return Math.round(n).toString()
}
