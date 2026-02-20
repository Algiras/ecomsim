import { useState, useEffect, useRef, useCallback } from 'react'
import Canvas from './components/Canvas.jsx'
import Dashboard from './components/Dashboard.jsx'
import PolicyPanel from './components/PolicyPanel.jsx'
import Header from './components/Header.jsx'
import ScenarioSelect from './components/ScenarioSelect.jsx'
import InsightPopup from './components/InsightPopup.jsx'
import AgentTooltip from './components/AgentTooltip.jsx'
import WealthHistogram from './components/WealthHistogram.jsx'
import ObjectivesPanel from './components/ObjectivesPanel.jsx'
import EventChoiceModal from './components/EventChoiceModal.jsx'
import ReportCard from './components/ReportCard.jsx'
import { validatePolicy } from './simulation/policy.js'
import { loadScenario, saveScenario } from './utils/storage.js'
import { useNarrator } from './hooks/useNarrator.js'
import { SCENARIOS } from './data/scenarios.js'

const TABS = ['dashboard', 'objectives', 'policies', 'histogram']

export default function App() {
  const narrator = useNarrator()
  const workerRef = useRef(null)
  const [simState, setSimState] = useState(null)
  const [paused, setPaused] = useState(false)
  const [speed, setSpeed] = useState(5)
  const [scenarioId, setScenarioId] = useState(loadScenario())
  const [showScenario, setShowScenario] = useState(false)
  const [currentInsight, setCurrentInsight] = useState(null)
  const [selectedAgent, setSelectedAgent] = useState(null)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [pendingChoice, setPendingChoice] = useState(null)   // event awaiting player choice
  const [reportCard, setReportCard] = useState(null)         // end-of-scenario report

  // Initialize worker
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
          setReportCard(report)
          setPaused(true)
          break
      }
    })

    worker.postMessage({ type: 'INIT', scenarioId })
    workerRef.current = worker

    return () => worker.terminate()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const sendToWorker = useCallback((msg) => {
    workerRef.current?.postMessage(msg)
  }, [])

  const handlePause = useCallback(() => {
    setPaused(true)
    sendToWorker({ type: 'PAUSE' })
  }, [sendToWorker])

  const handleResume = useCallback(() => {
    setPaused(false)
    sendToWorker({ type: 'RESUME' })
  }, [sendToWorker])

  const handleReset = useCallback(() => {
    setSimState(null)
    setCurrentInsight(null)
    setSelectedAgent(null)
    setPendingChoice(null)
    setReportCard(null)
    sendToWorker({ type: 'RESET', scenarioId })
    setPaused(false)
  }, [sendToWorker, scenarioId])

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
  }, [sendToWorker])

  const handleScenarioSelect = useCallback((id) => {
    setScenarioId(id)
    saveScenario(id)
    setSimState(null)
    setCurrentInsight(null)
    setSelectedAgent(null)
    setPendingChoice(null)
    setReportCard(null)
    sendToWorker({ type: 'RESET', scenarioId: id })
    setPaused(false)
    // Switch to objectives tab for historical scenarios
    if (SCENARIOS[id]?.isHistorical) setActiveTab('objectives')
  }, [sendToWorker])

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
    setShowScenario(true)
  }, [])

  const scenarioName = SCENARIOS[scenarioId]?.name || 'Free Market'

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
        onScenarioOpen={() => setShowScenario(true)}
        onShockMe={handleShockMe}
        scenarioName={scenarioName}
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
        </div>

        {/* Right panel */}
        <div className="w-72 flex flex-col border-l border-[#1e1e2e] bg-[#0a0a0f]">
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

      {/* Scenario complete report card */}
      {reportCard && (
        <ReportCard report={reportCard} onRetry={handleRetry} onNextScenario={handleNextScenario} />
      )}

      {/* Scenario picker */}
      {showScenario && (
        <ScenarioSelect
          current={scenarioId}
          onSelect={handleScenarioSelect}
          onClose={() => setShowScenario(false)}
        />
      )}
    </div>
  )
}
