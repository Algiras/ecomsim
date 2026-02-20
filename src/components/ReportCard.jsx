import { getHistoricalBaseline } from '../data/historicalBaselines.js'

const GRADE_COLORS = {
  'A+': '#22c55e', A: '#22c55e', B: '#84cc16', C: '#eab308', D: '#f97316', F: '#ef4444'
}

function DomainBar({ label, score }) {
  const color = score >= 70 ? '#22c55e' : score >= 45 ? '#eab308' : '#ef4444'
  return (
    <div>
      <div className="flex justify-between items-center mb-1 text-xs font-mono">
        <span className="text-[#94a3b8]">{label}</span>
        <span style={{ color }}>{score}/100</span>
      </div>
      <div className="w-full bg-[#1e1e2e] rounded-full h-1.5">
        <div
          className="h-1.5 rounded-full transition-all duration-700"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

function ObjectiveRow({ obj }) {
  const icon = obj.completed ? '✅' : obj.met ? '🔄' : '❌'
  const color = obj.completed ? '#22c55e' : obj.met ? '#f59e0b' : '#ef4444'
  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-[#1e1e2e] last:border-0">
      <span className="text-sm flex-shrink-0 mt-0.5">{icon}</span>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-[#e2e8f0]">{obj.icon} {obj.label}</span>
          <span className="text-xs font-mono" style={{ color }}>
            {obj.completed ? 'Done' : obj.met ? 'In progress' : `${Math.round(obj.progress * 100)}%`}
          </span>
        </div>
        <div className="text-[10px] text-[#475569] mt-0.5">{obj.description}</div>
      </div>
    </div>
  )
}

function ComparisonTable({ playerOutcome, historicalOutcome }) {
  if (!historicalOutcome) return null

  const rows = [
    { label: 'GDP Change', player: `${playerOutcome.gdpChangePercent > 0 ? '+' : ''}${playerOutcome.gdpChangePercent}%`, history: `${historicalOutcome.metrics.gdpChangePercent}%`, betterIfHigher: true, playerVal: playerOutcome.gdpChangePercent, histVal: historicalOutcome.metrics.gdpChangePercent },
    { label: 'Peak Unemployment', player: `${playerOutcome.peakUnemployment}%`, history: `${historicalOutcome.metrics.peakUnemployment}%`, betterIfHigher: false, playerVal: playerOutcome.peakUnemployment, histVal: historicalOutcome.metrics.peakUnemployment },
    { label: 'Avg Inflation', player: `${playerOutcome.inflationAvg}%`, history: `${historicalOutcome.metrics.inflationAvg}%`, betterIfHigher: null, playerVal: Math.abs(playerOutcome.inflationAvg), histVal: Math.abs(historicalOutcome.metrics.inflationAvg) },
    { label: 'Gini Coefficient', player: playerOutcome.gini.toFixed(2), history: historicalOutcome.metrics.gini.toFixed(2), betterIfHigher: false, playerVal: playerOutcome.gini, histVal: historicalOutcome.metrics.gini },
    { label: 'Poverty Rate', player: `${playerOutcome.povertyRate}%`, history: `${historicalOutcome.metrics.povertyRate}%`, betterIfHigher: false, playerVal: playerOutcome.povertyRate, histVal: historicalOutcome.metrics.povertyRate }
  ]

  return (
    <div>
      <div className="text-[#64748b] text-xs uppercase tracking-wider font-mono mb-3">You vs History</div>
      <div className="bg-[#0d0d14] rounded-xl overflow-hidden border border-[#1e1e2e]">
        <div className="grid grid-cols-3 text-[10px] font-mono text-[#475569] px-3 py-1.5 border-b border-[#1e1e2e]">
          <span>Metric</span>
          <span className="text-center text-[#6366f1]">You</span>
          <span className="text-center">History</span>
        </div>
        {rows.map(row => {
          let playerColor = '#e2e8f0'
          if (row.betterIfHigher === true) playerColor = row.playerVal >= row.histVal ? '#22c55e' : '#ef4444'
          else if (row.betterIfHigher === false) playerColor = row.playerVal <= row.histVal ? '#22c55e' : '#ef4444'
          return (
            <div key={row.label} className="grid grid-cols-3 px-3 py-1.5 text-xs font-mono border-b border-[#0a0a0f] last:border-0">
              <span className="text-[#64748b]">{row.label}</span>
              <span className="text-center font-bold" style={{ color: playerColor }}>{row.player}</span>
              <span className="text-center text-[#475569]">{row.history}</span>
            </div>
          )
        })}
      </div>
      {/* Historical grade comparison */}
      <div className="mt-2 flex items-center justify-between text-xs font-mono text-[#475569] px-1">
        <span>History's grade: <span style={{ color: GRADE_COLORS[historicalOutcome.historicalGrade] || '#94a3b8' }} className="font-bold">{historicalOutcome.historicalGrade}</span></span>
        <span className="text-[10px] italic">"{historicalOutcome.quote?.slice(0, 50)}…"</span>
      </div>
    </div>
  )
}

export default function ReportCard({ report, onRetry, onNextScenario }) {
  if (!report) return null

  const baseline = getHistoricalBaseline(report.scenarioId)
  const gradeColor = GRADE_COLORS[report.grade] || '#94a3b8'
  const beatHistory = baseline && report.finalScore > (
    { 'A+': 95, A: 85, B: 70, C: 55, D: 40, F: 20 }[baseline.historicalGrade] || 50
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm">
      <div className="bg-[#0d0d14] border border-[#1e1e2e] rounded-2xl p-6 max-w-lg w-full mx-4 max-h-[92vh] overflow-y-auto shadow-2xl">

        {/* Grade header */}
        <div className="text-center mb-5">
          <div className="text-6xl font-bold font-mono mb-1" style={{ color: gradeColor }}>
            {report.grade}
          </div>
          <div className="text-white font-bold text-lg">{report.scenarioName}</div>
          <div className="text-[#64748b] text-sm">Year {report.year} · Score {report.finalScore}/100</div>
          {beatHistory && (
            <div className="mt-2 text-[#22c55e] text-sm font-mono">
              🏆 You did better than history!
            </div>
          )}
        </div>

        {/* Domain scores */}
        <div className="bg-[#12121a] rounded-xl p-4 mb-4 flex flex-col gap-2.5">
          <DomainBar label="Equality" score={report.domains.equality.score} />
          <DomainBar label="Growth" score={report.domains.growth.score} />
          <DomainBar label="Stability" score={report.domains.stability.score} />
        </div>

        {/* Objectives */}
        {report.objectives?.length > 0 && (
          <div className="bg-[#12121a] rounded-xl p-4 mb-4">
            <div className="text-[#64748b] text-xs uppercase tracking-wider font-mono mb-2">Objectives</div>
            {report.objectives.map(o => <ObjectiveRow key={o.id} obj={o} />)}
          </div>
        )}

        {/* You vs History */}
        {baseline && (
          <div className="bg-[#12121a] rounded-xl p-4 mb-4">
            <ComparisonTable playerOutcome={report.playerOutcome} historicalOutcome={baseline} />
            <div className="mt-3 border-t border-[#1e1e2e] pt-3">
              <div className="text-[10px] text-[#475569] font-mono uppercase tracking-wider mb-1">What worked in history</div>
              <p className="text-[#64748b] text-xs leading-relaxed">{baseline.whatWorked}</p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onRetry}
            className="flex-1 py-3 rounded-xl border border-[#1e1e2e] text-[#94a3b8] hover:border-[#6366f1] hover:text-[#6366f1] font-mono text-sm transition-colors"
          >
            ↺ Try Again
          </button>
          <button
            onClick={onNextScenario}
            className="flex-1 py-3 rounded-xl bg-[#6366f1] hover:bg-[#818cf8] text-white font-mono font-bold text-sm transition-colors"
          >
            Next Challenge →
          </button>
        </div>
      </div>
    </div>
  )
}
