import { useState, useEffect, useRef, useCallback } from 'react'
import Canvas from './components/Canvas.jsx'
import Dashboard from './components/Dashboard.jsx'
import PolicyPanel from './components/PolicyPanel.jsx'
import Header from './components/Header.jsx'
import ScenarioSelect from './components/ScenarioSelect.jsx'
import InsightPopup from './components/InsightPopup.jsx'
import AgentTooltip from './components/AgentTooltip.jsx'
import WealthHistogram from './components/WealthHistogram.jsx'
import { validatePolicy } from './simulation/policy.js'
import { loadScenario, saveScenario } from './utils/storage.js'

export default function App() {
  const workerRef = useRef(null)
  const [simState, setSimState] = useState(null)
  const [paused, setPaused] = useState(false)
  const [speed, setSpeed] = useState(5)
  const [scenarioId, setScenarioId] = useState(loadScenario())
  const [showScenario, setShowScenario] = useState(false)
  const [currentInsight, setCurrentInsight] = useState(null)
  const [insightLog, setInsightLog] = useState([])
  const [selectedAgent, setSelectedAgent] = useState(null)
  const [activeTab, setActiveTab] = useState('dashboard') // dashboard | policies | histogram

  // Initialize worker
  useEffect(() => {
    const worker = new Worker(
      new URL('./workers/simWorker.js', import.meta.url),
      { type: 'module' }
    )

    worker.addEventListener('message', (e) => {
      const { type, state, event, insight } = e.data
      switch (type) {
        case 'STATE_UPDATE':
          setSimState(state)
          break
        case 'EVENT':
          // Could show event notification here
          console.log('[Event]', event.name)
          break
        case 'INSIGHT':
          setCurrentInsight(insight)
          setInsightLog(prev => [insight, ...prev].slice(0, 20))
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
    sendToWorker({ type: 'RESET', scenarioId })
    if (paused) {
      setPaused(false)
      sendToWorker({ type: 'RESUME' })
    }
  }, [sendToWorker, scenarioId, paused])

  const handleSpeedChange = useCallback((s) => {
    setSpeed(s)
    sendToWorker({ type: 'SET_SPEED', speed: s })
  }, [sendToWorker])

  const handlePolicyChange = useCallback((key, value) => {
    const validated = validatePolicy(key, value)
    sendToWorker({ type: 'SET_POLICY', policy: key, value: validated })
    // Optimistically update local state for responsive UI
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
    sendToWorker({ type: 'RESET', scenarioId: id })
    setPaused(false)
  }, [sendToWorker])

  const handleShockMe = useCallback(() => {
    // Trigger a random event by temporarily boosting shock probability
    sendToWorker({ type: 'SET_POLICY', policy: '_forceShock', value: true })
  }, [sendToWorker])

  const handleAgentClick = useCallback((agent) => {
    setSelectedAgent(agent)
  }, [])

  const scenarioName = simState
    ? (scenarioId === 'freeMarket' ? 'Free Market' : scenarioId === 'debtSpiral' ? 'Debt Spiral' : 'Tech Disruption')
    : 'Loading...'

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0f] text-[#e2e8f0] overflow-hidden font-mono">
      {/* Header */}
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
      />

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Canvas — center */}
        <div className="flex-1 relative bg-[#0a0a0f]">
          <Canvas
            simState={simState}
            onAgentClick={handleAgentClick}
            selectedAgentId={selectedAgent?.id}
          />

          {/* Agent tooltip overlay */}
          {selectedAgent && (
            <AgentTooltip
              agent={selectedAgent}
              onClose={() => setSelectedAgent(null)}
            />
          )}
        </div>

        {/* Right panel */}
        <div className="w-72 flex flex-col border-l border-[#1e1e2e] bg-[#0a0a0f]">
          {/* Tabs */}
          <div className="flex border-b border-[#1e1e2e]">
            {['dashboard', 'policies', 'histogram'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 text-xs font-mono capitalize transition-colors ${
                  activeTab === tab
                    ? 'text-[#6366f1] border-b border-[#6366f1]'
                    : 'text-[#475569] hover:text-[#94a3b8]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-3">
            {activeTab === 'dashboard' && (
              <Dashboard
                metrics={simState?.metrics}
                market={simState?.market}
                activeEvents={simState?.activeEvents}
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
        <InsightPopup
          insight={currentInsight}
          onDismiss={() => setCurrentInsight(null)}
        />
      )}

      {/* Scenario modal */}
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
