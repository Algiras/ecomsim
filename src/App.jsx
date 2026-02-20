import { useState, useEffect, useRef, useCallback } from 'react'
import Canvas from './components/Canvas.jsx'
import Dashboard from './components/Dashboard.jsx'
import PolicyPanel from './components/PolicyPanel.jsx'
import Header from './components/Header.jsx'
import ModeSelect from './components/ModeSelect.jsx'
import InsightPopup from './components/InsightPopup.jsx'
import AgentTooltip from './components/AgentTooltip.jsx'
import WealthHistogram from './components/WealthHistogram.jsx'
import ObjectivesPanel from './components/ObjectivesPanel.jsx'
import EventChoiceModal from './components/EventChoiceModal.jsx'
import ReportCard from './components/ReportCard.jsx'
import MacroDashboard from './components/MacroDashboard.jsx'
import CanvasLegend from './components/CanvasLegend.jsx'
import StoryIntro from './components/StoryIntro.jsx'
import StoryOutro from './components/StoryOutro.jsx'
import { validatePolicy } from './simulation/policy.js'
import { loadScenario, saveScenario, loadStoryProgress, saveStoryProgress, resetStoryProgress } from './utils/storage.js'
import { useNarrator } from './hooks/useNarrator.js'
import { SCENARIOS } from './data/scenarios.js'
import { STORY_CHAPTERS, scoreChapter } from './data/storyMode.js'

const TABS = ['dashboard', 'objectives', 'policies', 'histogram']

export default function App() {
  const narrator = useNarrator()
  const workerRef = useRef(null)
  const [simState, setSimState] = useState(null)
  const [paused, setPaused] = useState(false)
  const [speed, setSpeed] = useState(5)
  const [scenarioId, setScenarioId] = useState(loadScenario())
  const [showModeSelect, setShowModeSelect] = useState(true)
  const [currentInsight, setCurrentInsight] = useState(null)
  const [selectedAgent, setSelectedAgent] = useState(null)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [pendingChoice, setPendingChoice] = useState(null)
  const [reportCard, setReportCard] = useState(null)
  const [showStats, setShowStats] = useState(false)

  // Story mode state
  const [storyProgress, setStoryProgress] = useState(loadStoryProgress)
  const [storyIntro, setStoryIntro] = useState(null)    // chapter to show intro for
  const [storyOutro, setStoryOutro] = useState(null)    // { chapter, objectives, score }

  // ─── Worker init ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const worker = new Worker(
      new URL('./workers/simWorker.js', import.meta.url),
      { type: 'module' }
    )

    worker.addEventListener('message', (e) => {
      const { type, state, event, insight, report } = e.data
      switch (type) {
        case 'STATE_UPDATE':
          setSimState(state)
          break
        case 'EVENT':
          narrator.onEvent(event?.type)
          break
        case 'CHOICE_REQUIRED':
          setPendingChoice(event)
          setPaused(true)
          break
        case 'INSIGHT':
          setCurrentInsight(insight)
          narrator.onInsight(insight.id)
          break
        case 'SCENARIO_COMPLETE':
          _handleScenarioComplete(report)
          break
      }
    })

    worker.postMessage({ type: 'INIT', scenarioId })
    workerRef.current = worker

    return () => worker.terminate()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Story scenario completion ─────────────────────────────────────────────
  const _handleScenarioComplete = useCallback((report) => {
    const scenario = SCENARIOS[scenarioId]
    if (scenario?.isStory) {
      const chapter = STORY_CHAPTERS.find(c => c.id === scenarioId)
      if (chapter) {
        const score = scoreChapter(report?.objectives || [])
        // Update progress
        setStoryProgress(prev => {
          const updated = {
            unlockedChapter: Math.max(prev.unlockedChapter, chapter.number + 1),
            scores: { ...prev.scores, [chapter.id]: score }
          }
          saveStoryProgress(updated)
          return updated
        })
        // Show outro instead of generic report card
        setStoryOutro({ chapter, objectives: report?.objectives || [], score })
        setPaused(true)
        if (narrator.enabled) {
          const key = score >= 65 ? 'excellent' : score >= 35 ? 'good' : 'poor'
          narrator.speak(chapter.closingNarrative[key])
        }
        return
      }
    }
    setReportCard(report)
    setPaused(true)
  }, [scenarioId, narrator])

  // ─── Helpers ──────────────────────────────────────────────────────────────────
  const sendToWorker = useCallback((msg) => {
    workerRef.current?.postMessage(msg)
  }, [])

  const _resetSim = useCallback((id) => {
    setSimState(null)
    setCurrentInsight(null)
    setSelectedAgent(null)
    setPendingChoice(null)
    setReportCard(null)
    setStoryOutro(null)
    sendToWorker({ type: 'RESET', scenarioId: id })
    setPaused(false)
  }, [sendToWorker])

  // ─── Controls ─────────────────────────────────────────────────────────────────
  const handlePause = useCallback(() => {
    setPaused(true)
    sendToWorker({ type: 'PAUSE' })
  }, [sendToWorker])

  const handleResume = useCallback(() => {
    setPaused(false)
    sendToWorker({ type: 'RESUME' })
  }, [sendToWorker])

  const handleReset = useCallback(() => {
    _resetSim(scenarioId)
  }, [_resetSim, scenarioId])

  const handleSpeedChange = useCallback((s) => {
    setSpeed(s)
    sendToWorker({ type: 'SET_SPEED', speed: s })
  }, [sendToWorker])

  const handlePolicyChange = useCallback((key, value) => {
    const validated = validatePolicy(key, value)
    sendToWorker({ type: 'SET_POLICY', policy: key, value: validated })
    setSimState(prev => prev ? {
      ...prev,
      policies: { ...prev.policies, [key]: validated }
    } : prev)
    narrator.onPolicy(key, validated)
  }, [sendToWorker, narrator])

  const handleModeSelect = useCallback((id) => {
    if (id === '_reset_story') {
      resetStoryProgress()
      setStoryProgress({ unlockedChapter: 1, scores: {} })
      return
    }

    const scenario = SCENARIOS[id]
    const chapter = scenario?.isStory ? STORY_CHAPTERS.find(c => c.id === id) : null

    setScenarioId(id)
    saveScenario(id)

    if (chapter) {
      // Show chapter intro before starting
      setStoryIntro(chapter)
      // Pre-load sim but keep paused
      _resetSim(id)
      setPaused(true)
      sendToWorker({ type: 'PAUSE' })
      setActiveTab('objectives')
      if (narrator.enabled) narrator.speak(chapter.kokoroNarration)
    } else {
      _resetSim(id)
      if (scenario?.isHistorical) setActiveTab('objectives')
      else setActiveTab('dashboard')
    }
  }, [_resetSim, sendToWorker, narrator])

  const handleShockMe = useCallback(() => {
    sendToWorker({ type: 'SET_POLICY', policy: '_forceShock', value: true })
  }, [sendToWorker])

  const handleChoiceResolved = useCallback((eventId, choiceId) => {
    setPendingChoice(null)
    sendToWorker({ type: 'RESOLVE_CHOICE', eventId, choiceId })
    setPaused(false)
  }, [sendToWorker])

  const handleRetry = useCallback(() => {
    setReportCard(null)
    handleReset()
  }, [handleReset])

  const handleNextScenario = useCallback(() => {
    setReportCard(null)
    setShowModeSelect(true)
  }, [])

  // Story outro actions
  const handleStoryReplay = useCallback(() => {
    setStoryOutro(null)
    _resetSim(scenarioId)
    const chapter = STORY_CHAPTERS.find(c => c.id === scenarioId)
    if (chapter) setStoryIntro(chapter)
  }, [_resetSim, scenarioId])

  const handleStoryNext = useCallback(() => {
    const currentChapter = STORY_CHAPTERS.find(c => c.id === scenarioId)
    const nextChapter = STORY_CHAPTERS.find(c => c.number === (currentChapter?.number || 0) + 1)
    setStoryOutro(null)
    if (nextChapter) {
      handleModeSelect(nextChapter.id)
    } else {
      // Campaign complete — go to mode select
      setShowModeSelect(true)
    }
  }, [scenarioId, handleModeSelect])

  // Story intro: begin chapter
  const handleStoryBegin = useCallback(() => {
    setStoryIntro(null)
    sendToWorker({ type: 'RESUME' })
    setPaused(false)
  }, [sendToWorker])

  // ─── Derived ──────────────────────────────────────────────────────────────────
  const scenarioName = SCENARIOS[scenarioId]?.name || 'Free Market'
  const currentScenario = SCENARIOS[scenarioId]
  const isStoryMode = currentScenario?.isStory
  const currentChapter = isStoryMode ? STORY_CHAPTERS.find(c => c.id === scenarioId) : null

  const hasObjectives = simState?.objectives?.length > 0
  const tabsToShow = hasObjectives ? TABS : TABS.filter(t => t !== 'objectives')

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0f] text-[#e2e8f0] overflow-hidden font-mono">
      <Header
        paused={paused}
        speed={speed}
        onPause={handlePause}
        onResume={handleResume}
        onReset={handleReset}
        onSpeedChange={handleSpeedChange}
        onScenarioOpen={() => setShowModeSelect(true)}
        onShockMe={handleShockMe}
        onStatsOpen={() => setShowStats(true)}
        scenarioName={
          isStoryMode && currentChapter
            ? `Ch.${currentChapter.number} ${currentChapter.title}`
            : scenarioName
        }
        year={simState?.year}
        narratorEnabled={narrator.enabled}
        narratorLoading={narrator.loading}
        onNarratorToggle={narrator.enabled ? narrator.disable : narrator.enable}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Canvas */}
        <div className="flex-1 relative bg-[#0a0a0f]">
          <Canvas
            simState={simState}
            onAgentClick={setSelectedAgent}
            selectedAgentId={selectedAgent?.id}
          />
          {selectedAgent && (
            <AgentTooltip agent={selectedAgent} onClose={() => setSelectedAgent(null)} />
          )}

          <CanvasLegend />

          {/* Story chapter banner */}
          {isStoryMode && currentChapter && !storyIntro && !storyOutro && (
            <div
              className="absolute top-3 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-xs font-mono font-bold pointer-events-none"
              style={{ background: currentChapter.color + '22', border: `1px solid ${currentChapter.color}44`, color: currentChapter.color }}
            >
              📖 Chapter {currentChapter.number}: {currentChapter.title} · {currentChapter.era}
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="w-80 shrink-0 flex flex-col border-l border-[#1e1e2e] bg-[#0a0a0f]">
          <div className="flex border-b border-[#1e1e2e]">
            {tabsToShow.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 text-xs font-mono capitalize transition-colors ${
                  activeTab === tab
                    ? 'text-[#6366f1] border-b border-[#6366f1]'
                    : 'text-[#475569] hover:text-[#94a3b8]'
                }`}
              >
                {tab === 'objectives' && hasObjectives
                  ? `🎯 ${simState.objectives.filter(o => o.completed).length}/${simState.objectives.length}`
                  : tab}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {activeTab === 'dashboard' && (
              <Dashboard
                metrics={simState?.metrics}
                market={simState?.market}
                activeEvents={simState?.activeEvents}
              />
            )}
            {activeTab === 'objectives' && (
              <ObjectivesPanel
                objectives={simState?.objectives}
                scenarioDurationYears={simState?.scenarioDurationYears}
                year={simState?.year}
                scenarioName={scenarioName}
              />
            )}
            {activeTab === 'policies' && (
              <PolicyPanel
                policies={simState?.policies}
                onPolicyChange={handlePolicyChange}
              />
            )}
            {activeTab === 'histogram' && (
              <WealthHistogram agents={simState?.agents} />
            )}
          </div>
        </div>
      </div>

      {/* Insight popup */}
      {currentInsight && (
        <InsightPopup insight={currentInsight} onDismiss={() => setCurrentInsight(null)} />
      )}

      {/* Event choice modal */}
      {pendingChoice && (
        <EventChoiceModal event={pendingChoice} onChoose={handleChoiceResolved} />
      )}

      {/* Generic report card (non-story) */}
      {reportCard && !isStoryMode && (
        <ReportCard report={reportCard} onRetry={handleRetry} onNextScenario={handleNextScenario} />
      )}

      {/* Macro stats overlay */}
      {showStats && (
        <MacroDashboard
          metrics={simState?.metrics}
          market={simState?.market}
          onClose={() => setShowStats(false)}
        />
      )}

      {/* Story chapter intro */}
      {storyIntro && (
        <StoryIntro
          chapter={storyIntro}
          onBegin={handleStoryBegin}
          onBack={() => { setStoryIntro(null); setShowModeSelect(true) }}
          chapterScore={
            storyIntro.number > 1
              ? storyProgress.scores?.[STORY_CHAPTERS[storyIntro.number - 2]?.id]
              : undefined
          }
        />
      )}

      {/* Story chapter outro */}
      {storyOutro && (
        <StoryOutro
          chapter={storyOutro.chapter}
          objectives={storyOutro.objectives}
          score={storyOutro.score}
          onReplay={handleStoryReplay}
          onNextChapter={handleStoryNext}
          isLastChapter={storyOutro.chapter.number === STORY_CHAPTERS.length}
        />
      )}

      {/* Mode selector (replaces old ScenarioSelect) */}
      {showModeSelect && (
        <ModeSelect
          current={scenarioId}
          onSelect={(id) => { handleModeSelect(id); setShowModeSelect(false) }}
          onClose={() => setShowModeSelect(false)}
          storyProgress={storyProgress}
        />
      )}
    </div>
  )
}
