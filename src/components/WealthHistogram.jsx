import { useMemo } from 'react'
import {
  BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line
} from 'recharts'
import { lorenzCurve } from '../utils/math.js'

function WealthBucket(wealth) {
  if (wealth < 100) return '<$100'
  if (wealth < 300) return '$100-300'
  if (wealth < 800) return '$300-800'
  if (wealth < 2000) return '$800-2K'
  if (wealth < 5000) return '$2K-5K'
  return '>$5K'
}

const BUCKET_ORDER = ['<$100', '$100-300', '$300-800', '$800-2K', '$2K-5K', '>$5K']
const BUCKET_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#f59e0b']

export default function WealthHistogram({ agents }) {
  const histData = useMemo(() => {
    if (!agents?.length) return []
    const buckets = {}
    BUCKET_ORDER.forEach(b => { buckets[b] = 0 })
    for (const a of agents) {
      if (!a.alive) continue
      const bucket = WealthBucket(a.wealth)
      buckets[bucket] = (buckets[bucket] || 0) + 1
    }
    return BUCKET_ORDER.map((name, i) => ({
      name,
      count: buckets[name] || 0,
      fill: BUCKET_COLORS[i]
    }))
  }, [agents])

  const lorenzData = useMemo(() => {
    if (!agents?.length) return []
    const wealthValues = agents.filter(a => a.alive).map(a => Math.max(0, a.wealth))
    return lorenzCurve(wealthValues, 20)
  }, [agents])

  return (
    <div className="flex flex-col gap-3">
      {/* Histogram */}
      <div>
        <div className="text-[#64748b] text-xs uppercase tracking-wider font-mono mb-2">
          Wealth Distribution
        </div>
        <div className="h-28">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={histData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <XAxis
                dataKey="name"
                tick={{ fontSize: 8, fill: '#475569', fontFamily: 'monospace' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 8, fill: '#475569', fontFamily: 'monospace' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{ background: '#12121a', border: '1px solid #1e1e2e', fontSize: 10 }}
                labelStyle={{ color: '#e2e8f0' }}
                itemStyle={{ color: '#6366f1' }}
              />
              <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                {histData.map((entry, index) => (
                  <Cell key={index} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Lorenz curve */}
      {lorenzData.length > 2 && (
        <div>
          <div className="text-[#64748b] text-xs uppercase tracking-wider font-mono mb-2">
            Lorenz Curve
          </div>
          <div className="h-24">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lorenzData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                <XAxis
                  dataKey="population"
                  tick={{ fontSize: 8, fill: '#475569' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={v => v + '%'}
                />
                <YAxis
                  tick={{ fontSize: 8, fill: '#475569' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={v => v + '%'}
                />
                {/* Perfect equality line */}
                <Line
                  data={[{ population: 0, perfect: 0 }, { population: 100, perfect: 100 }]}
                  type="linear"
                  dataKey="perfect"
                  stroke="#334155"
                  strokeWidth={1}
                  dot={false}
                  strokeDasharray="3 3"
                />
                <Line
                  type="monotone"
                  dataKey="wealth"
                  stroke="#6366f1"
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                />
                <Tooltip
                  contentStyle={{ background: '#12121a', border: '1px solid #1e1e2e', fontSize: 10 }}
                  formatter={(v) => v.toFixed(1) + '%'}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="text-[10px] text-[#334155] text-center font-mono">
            Area between lines = Gini coefficient
          </div>
        </div>
      )}
    </div>
  )
}
