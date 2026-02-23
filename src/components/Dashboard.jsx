import { useMemo, useEffect, useRef } from 'react'
import {
  ResponsiveContainer, AreaChart, Area
} from 'recharts'
import { SECTOR_COLORS } from '../rendering/colors.js'
import { POLICY_DEFINITIONS } from '../data/policies.js'
import { PolicySlider, PolicyToggle } from './PolicyPanel.jsx'
import ObjectivesPanel from './ObjectivesPanel.jsx'

// ─── Policy grouping by section ────────────────────────────────────────────────
export const SECTION_POLICIES = {
  economy: ['interestRate', 'printMoney', 'helicopterMoney', 'exportSubsidies', 'foreignReserveIntervention', 'punitiveTargiffs'],
  fiscal: ['incomeTax', 'corporateTax', 'wealthTax', 'capitalGainsTax', 'subsidiesFarming'],
  inequality: ['minWage', 'ubi', 'unemploymentBenefit', 'openBorders', 'mandatoryProfitShare'],
  banking: ['reserveRequirement', 'maxLoanToValue', 'depositInsurance', 'debtJubilee', 'priceControlFood', 'priceControlHousing', 'antiMonopoly'],
  public: ['educationFunding', 'publicHealthcare', 'policeFunding', 'financialOversight', 'prisonReform'],
  weird: ['fourDayWeek', 'robotTax', 'breadAndCircuses', 'landValueTax', 'banAdvertising',
    'lotteryRedistribution', 'sumptuary', 'degrowth', 'algoCentralPlanning', 'universalBankAccount'],
  chaos: ['maximumWage', 'wealthConfiscation', 'nationalizeIndustries', 'guaranteedJobs']
}

const POLICY_MAP = Object.fromEntries(POLICY_DEFINITIONS.map(p => [p.id, p]))

export const SECTION_ORDER = ['economy', 'fiscal', 'inequality', 'banking', 'public', 'weird', 'chaos']

export const SECTION_META = {
  economy:    { title: 'Economy',      icon: '\ud83d\udcca', color: '#6366f1' },
  fiscal:     { title: 'Fiscal',       icon: '\ud83d\udcb0', color: '#3b82f6' },
  inequality: { title: 'Social',       icon: '\u2696\ufe0f', color: '#ec4899' },
  banking:    { title: 'Finance',      icon: '\ud83c\udfe6', color: '#f97316' },
  public:     { title: 'Gov',          icon: '\ud83c\udfdb\ufe0f', color: '#06b6d4' },
  weird:      { title: 'Labs',         icon: '\ud83e\uddea', color: '#f97316' },
  chaos:      { title: 'Chaos',        icon: '\ud83d\udd25', color: '#b91c1c' }
}

// Section unlock conditions
export const SECTION_UNLOCK = {
  economy:    { always: true },
  fiscal:     { always: true },
  inequality: { year: 2, metric: 'gini', threshold: 0.3, op: 'gte' },
  banking:    { year: 3, event: 'bank' },
  public:     { year: 2, metric: 'crimeRate', threshold: 0.1, op: 'gte' },
  weird:      { year: 5, scoreThreshold: 50 },
  chaos:      { year: 8, achievement: true }
}

// ─── Shared sub-components ─────────────────────────────────────────────────────

function MetricCard({ label, value, unit = '', trend, color = '#6366f1', history = [], format = 'number' }) {
  const displayValue = useMemo(() => {
    if (format === 'percent') return (value * 100).toFixed(1) + '%'
    if (format === 'currency') return '$' + formatNum(value)
    if (format === 'index') return value.toFixed(1)
    return formatNum(value)
  }, [value, format])

  const chartData = history.slice(-40).map((v, i) => ({ i, v }))

  return (
    <div className="bg-[#12121a] border border-[#1e1e2e] rounded-lg p-2.5 flex flex-col gap-1">
      <div className="text-[#64748b] text-[10px] uppercase tracking-wider font-mono">{label}</div>
      <div className="flex items-end gap-1.5">
        <span className="text-white text-base font-bold font-mono leading-none" style={{ color }}>
          {displayValue}
        </span>
        {unit && <span className="text-[#64748b] text-[10px] mb-0.5">{unit}</span>}
        {trend !== undefined && (
          <span className={`text-[10px] mb-0.5 ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {trend >= 0 ? '\u2191' : '\u2193'} {Math.abs(trend * 100).toFixed(1)}%
          </span>
        )}
      </div>
      {chartData.length > 5 && (
        <div className="h-6 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <Area type="monotone" dataKey="v" stroke={color} fill={color + '22'} strokeWidth={1} dot={false} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

function PriceGrid({ prices, supply, demand }) {
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {Object.entries(prices || {}).map(([sector, price]) => {
        const s = supply?.[sector] || 0
        const d = demand?.[sector] || 0
        const pressure = d > s ? 'text-red-400' : 'text-green-400'
        const pressureIcon = d > s ? '\u2191' : '\u2193'
        return (
          <div key={sector} className="flex justify-between items-center text-xs bg-[#12121a] border border-[#1e1e2e] rounded px-2 py-1">
            <span style={{ color: SECTOR_COLORS[sector] }} className="font-mono capitalize">{sector}</span>
            <span className={`font-mono font-bold ${pressure}`}>${price.toFixed(1)} {pressureIcon}</span>
          </div>
        )
      })}
    </div>
  )
}

function GiniBar({ value }) {
  const pct = (value * 100).toFixed(1)
  const color = value > 0.5 ? '#ef4444' : value > 0.35 ? '#f59e0b' : '#22c55e'
  return (
    <div className="bg-[#12121a] border border-[#1e1e2e] rounded-lg p-2">
      <div className="flex justify-between items-center mb-1">
        <span className="text-[#64748b] text-[10px] uppercase tracking-wider font-mono">Gini</span>
        <span className="text-xs font-bold font-mono" style={{ color }}>{pct}</span>
      </div>
      <div className="w-full bg-[#1e1e2e] rounded-full h-1.5">
        <div className="h-1.5 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, value * 100)}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

function EventBadge({ event }) {
  return (
    <div className="bg-[#1e1e2e] border border-[#334155] rounded px-2 py-0.5 text-[10px] flex items-center gap-1">
      <span>{event.icon}</span>
      <span className="text-[#e2e8f0] font-mono">{event.name}</span>
    </div>
  )
}

// ─── Policy controls for a section ─────────────────────────────────────────────

function SectionPolicies({ policyIds, policies, onPolicyChange, policyLag, highlightPolicy }) {
  return (
    <div className="flex flex-col gap-2.5 mt-1.5 bg-[#0d0d14] rounded-lg p-2.5 border border-[#1a1a28]">
      {policyIds.map(id => {
        const policy = POLICY_MAP[id]
        if (!policy) return null
        const lagEntry = policyLag?.[id]
        const lagProgress = lagEntry ? lagEntry.progress : undefined
        const lagTarget = lagEntry ? lagEntry.target : undefined
        const isHighlighted = highlightPolicy === id
        return (
          <div key={id}>
            {policy.type === 'slider' ? (
              <PolicySlider policy={policy} value={policies?.[id] ?? policy.min ?? 0} onChange={onPolicyChange} lagProgress={lagProgress} lagTarget={lagTarget} highlighted={isHighlighted} />
            ) : (
              <PolicyToggle policy={policy} value={policies?.[id] ?? false} onChange={onPolicyChange} highlighted={isHighlighted} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Section content render ────────────────────────────────────────────────────

function SectionContent({ section, metrics, market, policies, onPolicyChange, policyLag, highlightPolicy, gameMode = 'freeplay', tutorialLesson = null }) {
  const history = metrics?.history || {}
  const allIds = SECTION_POLICIES[section] || []

  // Determine which policy IDs to show based on game mode
  const visibleIds = gameMode === 'tutorial' && tutorialLesson
    ? allIds.filter(id => id === tutorialLesson.highlightPolicy)
    : allIds

  const showPolicies = gameMode !== 'story' && gameMode !== 'historical'

  const renderPolicies = () => {
    if (!showPolicies || visibleIds.length === 0) return null
    return (
      <>
        <div className="text-[9px] text-[#475569] font-mono uppercase tracking-wider mt-2 mb-0.5 px-1">
          Policy Levers ({visibleIds.length})
        </div>
        <SectionPolicies policyIds={visibleIds} policies={policies} onPolicyChange={onPolicyChange} policyLag={policyLag} highlightPolicy={highlightPolicy} />
      </>
    )
  }

  switch (section) {
    case 'economy':
      return (
        <>
          <div className="grid grid-cols-2 gap-1.5">
            <MetricCard label="GDP" value={metrics.gdp} format="currency" trend={metrics.gdpGrowth} color="#6366f1" history={history.gdp || []} />
            <MetricCard label="Unemployment" value={metrics.unemployment} format="percent" color={metrics.unemployment > 0.15 ? '#ef4444' : '#22c55e'} history={history.unemployment || []} />
            <MetricCard label="CPI" value={metrics.cpi} format="index" color={metrics.cpi > 120 ? '#f97316' : '#e2e8f0'} history={history.cpi || []} />
            <MetricCard label="Avg Wage" value={metrics.avgWage} format="currency" color="#06b6d4" />
          </div>
          {renderPolicies()}
        </>
      )
    case 'fiscal':
      return (
        <>
          <div className="grid grid-cols-2 gap-1.5">
            <MetricCard label="Gov Debt" value={Math.abs(metrics.govDebt || 0)} format="currency" color={(metrics.govDebt || 0) > 1000 ? '#ef4444' : '#64748b'} />
            <MetricCard label="Tax Revenue" value={metrics.taxRevenue || 0} format="currency" color="#3b82f6" />
          </div>
          {renderPolicies()}
        </>
      )
    case 'inequality':
      return (
        <>
          <GiniBar value={metrics.gini} />
          <div className="grid grid-cols-2 gap-1.5">
            <MetricCard label="Poverty" value={metrics.povertyRate} format="percent" color={metrics.povertyRate > 0.25 ? '#ef4444' : '#94a3b8'} />
            <MetricCard label="Unrest" value={metrics.socialUnrest} format="percent" color={metrics.socialUnrest > 0.5 ? '#ef4444' : '#94a3b8'} history={history.unrest || []} />
          </div>
          {renderPolicies()}
        </>
      )
    case 'banking':
      return (
        <>
          <div className="grid grid-cols-2 gap-1.5">
            <MetricCard label="Private Debt" value={metrics.totalPrivateDebt || 0} format="currency" color="#f97316" history={history.privateDebt || []} />
            <MetricCard label="Credit Score" value={metrics.avgCreditScore || 500} color={metrics.avgCreditScore > 650 ? '#22c55e' : metrics.avgCreditScore > 500 ? '#f59e0b' : '#ef4444'} history={history.creditScore || []} />
          </div>
          <PriceGrid prices={market?.prices} supply={market?.supply} demand={market?.demand} />
          {renderPolicies()}
        </>
      )
    case 'public':
      return (
        <>
          <div className="grid grid-cols-2 gap-1.5">
            <MetricCard label="Businesses" value={metrics.businessCount} color="#f59e0b" />
            <MetricCard label="Crime Rate" value={metrics.crimeRate || 0} unit="per 1K" color={(metrics.crimeRate || 0) > 0.3 ? '#ef4444' : '#94a3b8'} history={history.crime || []} />
          </div>
          {renderPolicies()}
        </>
      )
    case 'weird':
    case 'chaos':
      return renderPolicies()
    default:
      return null
  }
}

// ─── Economic event feed ──────────────────────────────────────────────────────

const SEVERITY_COLORS = {
  danger: { bg: '#ef444415', border: '#ef444433', text: '#fca5a5' },
  warning: { bg: '#f59e0b15', border: '#f59e0b33', text: '#fcd34d' },
  good: { bg: '#22c55e15', border: '#22c55e33', text: '#86efac' },
  info: { bg: '#6366f115', border: '#6366f133', text: '#a5b4fc' }
}

function EconFeed({ events, currentTick }) {
  // Deduplicate: keep only the latest occurrence of each event text
  const deduped = []
  const seen = new Set()
  for (let i = events.length - 1; i >= 0; i--) {
    const key = events[i].text
    if (!seen.has(key)) {
      seen.add(key)
      deduped.push(events[i])
    }
  }

  return (
    <div className="bg-[#0d0d14] border border-[#1a1a28] rounded-lg p-2">
      <div className="text-[9px] text-[#475569] font-mono uppercase tracking-wider mb-1">Economic Events</div>
      <div className="flex flex-col gap-1">
        {deduped.map((e, i) => {
          const colors = SEVERITY_COLORS[e.severity] || SEVERITY_COLORS.info
          const ticksAgo = currentTick - e.tick
          const timeLabel = ticksAgo < 52 ? `${ticksAgo}w ago` : `${Math.floor(ticksAgo / 52)}y ago`
          return (
            <div
              key={`${e.tick}-${i}`}
              className="flex items-center gap-1.5 text-[10px] font-mono rounded px-1.5 py-0.5"
              style={{ backgroundColor: colors.bg, border: `1px solid ${colors.border}` }}
            >
              <span>{e.icon}</span>
              <span style={{ color: colors.text }} className="flex-1">{e.text}</span>
              <span className="text-[#475569] flex-shrink-0">{timeLabel}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Tutorial card (interactive lessons) ──────────────────────────────────────

function TutorialLessonCard({ tutorialLesson, tutorialLessonIndex, tutorialTotal, tutorialComplete, completedLessons, onTutorialNext, onTutorialSkip }) {
  return (
    <div className="bg-[#161625] border border-[#6366f1] rounded-lg p-3 mb-2" style={{ boxShadow: '0 0 20px #6366f133' }}>
      <div className="flex items-center gap-1 mb-2">
        {Array.from({ length: tutorialTotal }, (_, i) => {
          const isComplete = completedLessons.includes(i)
          const isCurrent = i === tutorialLessonIndex
          return (
            <div
              key={i}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: isCurrent ? 16 : 8,
                backgroundColor: isCurrent ? (tutorialComplete ? '#22c55e' : '#6366f1') : isComplete ? '#22c55e' : '#334155'
              }}
            />
          )
        })}
        <div className="flex-1" />
        <span className="text-[10px] text-[#475569] font-mono">{completedLessons.length}/{tutorialTotal} complete</span>
      </div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">{tutorialLesson.icon}</span>
        <span className="text-sm font-bold text-white">{tutorialLesson.title}</span>
      </div>
      <div className="text-xs text-[#ef4444] bg-[#ef444411] rounded px-2 py-1.5 mb-2 leading-relaxed">
        {tutorialLesson.problem}
      </div>
      <div className="text-xs text-[#6366f1] bg-[#6366f111] rounded px-2 py-1.5 mb-3 leading-relaxed font-mono">
        {tutorialLesson.instruction}
      </div>
      {tutorialComplete ? (
        <>
          <div className="text-xs text-[#22c55e] bg-[#22c55e11] rounded px-2 py-1.5 mb-3 leading-relaxed">
            {tutorialLesson.successMessage}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1" />
            <button onClick={onTutorialSkip} className="text-[10px] text-[#475569] hover:text-[#94a3b8] font-mono px-2 py-1">Exit Tutorial</button>
            <button onClick={onTutorialNext} className="text-[10px] text-white font-mono px-3 py-1.5 rounded bg-[#22c55e] hover:bg-[#16a34a] transition-colors font-bold">
              {tutorialLessonIndex === tutorialTotal - 1 ? 'Finish Tutorial' : 'Next Lesson \u2192'}
            </button>
          </div>
        </>
      ) : (
        <div className="flex items-center gap-2">
          <div className="text-[10px] text-[#475569] font-mono flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-[#f59e0b] animate-pulse" />
            Waiting for correct adjustment...
          </div>
          <div className="flex-1" />
          <button onClick={onTutorialSkip} className="text-[10px] text-[#475569] hover:text-[#94a3b8] font-mono px-2 py-1">Skip Tutorial</button>
        </div>
      )}
    </div>
  )
}

// ─── Main Dashboard ────────────────────────────────────────────────────────────

export default function Dashboard({
  gameMode = 'freeplay',
  metrics, market, activeEvents = [], approvalRating = 50, policyLag = {},
  policies, onPolicyChange, econFeed = [],
  agents, objectives, scenarioDurationYears, year, scenarioName,
  score = 0, scoreHistory = [], achievements = [], milestoneProgress = 0, totalMilestones = 10, currentMilestone = null,
  tutorialLesson = null, tutorialLessonIndex = -1, tutorialTotal = 0, tutorialComplete = false,
  completedLessons = [], onTutorialNext = null, onTutorialSkip = null,
  activeSection = 'economy', onSectionChange, unlockedSections = new Set(['economy', 'fiscal'])
}) {
  const scrollRef = useRef(null)

  // When tutorial lesson changes, switch to its section
  // Handle sections not in SECTION_ORDER (e.g. 'crime' → 'public') by finding the tab containing the policy
  useEffect(() => {
    if (!tutorialLesson?.section || !onSectionChange) return
    let targetSection = tutorialLesson.section
    if (!SECTION_POLICIES[targetSection] && tutorialLesson.highlightPolicy) {
      for (const [sec, ids] of Object.entries(SECTION_POLICIES)) {
        if (ids.includes(tutorialLesson.highlightPolicy)) { targetSection = sec; break }
      }
    }
    onSectionChange(targetSection)
  }, [tutorialLesson, onSectionChange])

  if (!metrics) return (
    <div className="text-[#475569] text-sm font-mono p-4">Loading...</div>
  )

  const lagCount = Object.keys(policyLag).length
  const hasObjectives = objectives?.length > 0

  return (
    <div ref={scrollRef} className="flex flex-col h-full">
      {/* ─── Scrollable content ───────────────────────────────────── */}
      <div className="flex flex-col gap-2 p-3 overflow-y-auto flex-1">
        {/* Interactive tutorial lesson card */}
        {tutorialLesson && (
          <TutorialLessonCard
            tutorialLesson={tutorialLesson}
            tutorialLessonIndex={tutorialLessonIndex}
            tutorialTotal={tutorialTotal}
            tutorialComplete={tutorialComplete}
            completedLessons={completedLessons}
            onTutorialNext={onTutorialNext}
            onTutorialSkip={onTutorialSkip}
          />
        )}

        {/* Objectives — prominent in story/historical modes (shown at top) */}
        {hasObjectives && (gameMode === 'story' || gameMode === 'historical') && (
          <div className="border-b border-[#1e1e2e] pb-2">
            <ObjectivesPanel
              objectives={objectives}
              scenarioDurationYears={scenarioDurationYears}
              year={year}
              scenarioName={scenarioName}
            />
          </div>
        )}

        {/* Year/Pop + lag */}
        <div className="text-[#475569] text-[10px] font-mono px-1 flex justify-between">
          <span>Year {metrics.year} · Pop {metrics.population}</span>
          {lagCount > 0 && <span className="text-amber-400">{lagCount} pending</span>}
        </div>

        {/* Active events */}
        {activeEvents.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {activeEvents.map(e => <EventBadge key={e.id} event={e} />)}
          </div>
        )}

        {/* Economic event feed */}
        {econFeed.length > 0 && (
          <EconFeed events={econFeed} currentTick={metrics.tick} />
        )}

        {/* Active section content */}
        <SectionContent
          section={activeSection}
          metrics={metrics}
          market={market}
          policies={policies}
          onPolicyChange={onPolicyChange}
          policyLag={policyLag}
          highlightPolicy={tutorialLesson?.section === activeSection ? tutorialLesson.highlightPolicy : null}
          gameMode={gameMode}
          tutorialLesson={tutorialLesson}
        />

        {/* Objectives — in freeplay/tutorial at bottom */}
        {hasObjectives && gameMode !== 'story' && gameMode !== 'historical' && (
          <div className="border-t border-[#1e1e2e] pt-2">
            <ObjectivesPanel
              objectives={objectives}
              scenarioDurationYears={scenarioDurationYears}
              year={year}
              scenarioName={scenarioName}
            />
          </div>
        )}
      </div>
    </div>
  )
}

function formatNum(n) {
  if (n === undefined || n === null || isNaN(n)) return '0'
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return Math.round(n).toString()
}
