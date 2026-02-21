import { useState, useEffect, useRef, useCallback } from 'react'
import Dashboard from './components/Dashboard.jsx'
import { SECTION_ORDER, SECTION_META, SECTION_UNLOCK } from './components/Dashboard.jsx'
import Header from './components/Header.jsx'
import ModeSelect from './components/ModeSelect.jsx'
import InsightPopup from './components/InsightPopup.jsx'
import EventChoiceModal from './components/EventChoiceModal.jsx'
import ReportCard from './components/ReportCard.jsx'
import MacroDashboard from './components/MacroDashboard.jsx'
import VitalSigns from './components/VitalSigns.jsx'
import StoryIntro from './components/StoryIntro.jsx'
import StoryOutro from './components/StoryOutro.jsx'
import VoiceOrb from './components/VoiceOrb.jsx'
import { validatePolicy } from './simulation/policy.js'
import { loadScenario, saveScenario, loadStoryProgress, saveStoryProgress, resetStoryProgress } from './utils/storage.js'
import { useNarrator } from './hooks/useNarrator.js'
import { SCENARIOS, ECONOMIC_MODELS } from './data/scenarios.js'
import { STORY_CHAPTERS, scoreChapter } from './data/storyMode.js'
import { TUTORIAL_LESSONS } from './data/tutorialLessons.js'

// ─── Section unlock logic ─────────────────────────────────────────────────────

const UNLOCK_STORAGE_KEY = 'ecomsim_unlocked_sections'

function loadUnlockedSections() {
  try {
    const stored = JSON.parse(localStorage.getItem(UNLOCK_STORAGE_KEY) || '[]')
    const set = new Set(stored)
    // Economy + Fiscal always unlocked
    set.add('economy')
    set.add('fiscal')
    return set
  } catch {
    return new Set(['economy', 'fiscal'])
  }
}

function saveUnlockedSections(set) {
  localStorage.setItem(UNLOCK_STORAGE_KEY, JSON.stringify([...set]))
}

function checkUnlocks(metrics, year, score, achievements, currentUnlocked) {
  const newlyUnlocked = []
  for (const section of SECTION_ORDER) {
    if (currentUnlocked.has(section)) continue
    const rule = SECTION_UNLOCK[section]
    if (!rule) continue
    if (rule.always) { newlyUnlocked.push(section); continue }

    let unlocked = false
    // Year condition
    if (rule.year && year >= rule.year) unlocked = true
    // Metric threshold condition
    if (!unlocked && rule.metric && metrics) {
      const val = metrics[rule.metric] || 0
      if (rule.op === 'gte' && val >= rule.threshold) unlocked = true
    }
    // Bank event condition
    if (!unlocked && rule.event === 'bank' && metrics?.bankCount !== undefined && metrics.bankCount < 2) unlocked = true
    // Score threshold
    if (!unlocked && rule.scoreThreshold && score >= rule.scoreThreshold) unlocked = true
    // Achievement condition
    if (!unlocked && rule.achievement && achievements?.length > 0) unlocked = true

    if (unlocked) newlyUnlocked.push(section)
  }
  return newlyUnlocked
}

export default function App() {
  const narrator = useNarrator()
  const workerRef = useRef(null)
  const [simState, setSimState] = useState(null)
  const [paused, setPaused] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [scenarioId, setScenarioId] = useState(loadScenario())
  const [showModeSelect, setShowModeSelect] = useState(true)
  const [currentInsight, setCurrentInsight] = useState(null)
  const [pendingChoice, setPendingChoice] = useState(null)
  const [reportCard, setReportCard] = useState(null)

  // Active section for tab bar
  const [activeSection, setActiveSection] = useState('economy')

  // Section unlock state
  const [unlockedSections, setUnlockedSections] = useState(loadUnlockedSections)

  // Story mode state
  const [storyProgress, setStoryProgress] = useState(loadStoryProgress)
  const [storyIntro, setStoryIntro] = useState(null)
  const [storyOutro, setStoryOutro] = useState(null)

  // Tutorial state
  const [tutorialLessonIndex, setTutorialLessonIndex] = useState(-1) // -1 = inactive
  const [tutorialComplete, setTutorialComplete] = useState(false)
  const [completedLessons, setCompletedLessons] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ecomsim_tutorial_progress') || '[]') }
    catch { return [] }
  })

  // Achievement + unlock toasts
  const [achievementToasts, setAchievementToasts] = useState([])

  // Auto-dismiss toasts after 5 seconds
  useEffect(() => {
    if (achievementToasts.length === 0) return
    const timer = setInterval(() => {
      setAchievementToasts(t => {
        const filtered = t.filter(a => Date.now() - a.ts < 5000)
        return filtered.length === t.length ? t : filtered
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [achievementToasts.length])

  // Check section unlocks whenever simState changes
  useEffect(() => {
    if (!simState?.metrics) return
    const newlyUnlocked = checkUnlocks(
      simState.metrics,
      simState.year || 0,
      simState.score || 0,
      simState.achievements,
      unlockedSections
    )
    if (newlyUnlocked.length > 0) {
      setUnlockedSections(prev => {
        const next = new Set(prev)
        newlyUnlocked.forEach(s => next.add(s))
        saveUnlockedSections(next)
        return next
      })
      // Show unlock toasts
      const now = Date.now()
      setAchievementToasts(prev => [
        ...prev,
        ...newlyUnlocked.map(s => ({
          id: `unlock_${s}`,
          icon: SECTION_META[s].icon,
          name: `${SECTION_META[s].title} Unlocked`,
          description: `New policy area: ${SECTION_META[s].title}`,
          ts: now,
          isUnlock: true
        }))
      ])
    }
  }, [simState?.metrics, simState?.year, simState?.score, simState?.achievements]) // eslint-disable-line react-hooks/exhaustive-deps

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
          // Show achievement toasts for newly unlocked
          if (state.newAchievements?.length > 0) {
            const now = Date.now()
            setAchievementToasts(t => {
              const existing = new Set(t.map(x => x.id))
              const fresh = state.newAchievements
                .filter(a => !existing.has(a.id))
                .map(a => ({ ...a, ts: now }))
              return fresh.length ? [...t, ...fresh] : t
            })
          }
          // Merge user-set policy targets into snapshot to prevent UI flickering.
          if (state.policies) {
            const targets = policyTargetsRef.current
            for (const key of Object.keys(targets)) {
              if (state.policies[key] === targets[key]) {
                delete targets[key]
              } else {
                state.policies[key] = targets[key]
              }
            }
          }
          setSimState(state)
          // Check tutorial conditions against metrics
          if (state.metrics) {
            setTutorialLessonIndex(prevIdx => {
              if (prevIdx < 0 || prevIdx >= TUTORIAL_LESSONS.length) return prevIdx
              const lesson = TUTORIAL_LESSONS[prevIdx]
              const allMet = lesson.conditions.every(c => {
                const val = c.metric ? state.metrics[c.metric] : state.policies?.[c.policy]
                if (val === undefined) return false
                if (c.op === 'gte') return val >= c.value
                if (c.op === 'lte') return val <= c.value
                if (c.op === 'gt') return val > c.value
                if (c.op === 'lt') return val < c.value
                return false
              })
              if (allMet) setTutorialComplete(true)
              return prevIdx
            })
          }
          break
        case 'EVENT':
          if (narrator.llmReady) {
            narrator.generateAndSpeak(simStateRef.current, event?.type)
          } else {
            narrator.onEvent(event?.type)
          }
          break
        case 'CHOICE_REQUIRED':
          setPendingChoice(event)
          break
        case 'INSIGHT':
          setCurrentInsight(insight)
          if (narrator.llmReady) {
            narrator.generateAndSpeak(simStateRef.current, insight.id)
          } else {
            narrator.onInsight(insight.id)
          }
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

  // ─── Periodic AI narration ──────────────────────────────────────────────────
  const simStateRef = useRef(null)
  simStateRef.current = simState
  useEffect(() => {
    if (!narrator.enabled || !narrator.llmReady) return
    const interval = setInterval(() => {
      if (paused) return
      const s = simStateRef.current
      if (s) narrator.generateAndSpeak(s)
    }, 35_000)
    return () => clearInterval(interval)
  }, [narrator.enabled, narrator.llmReady, paused, narrator.generateAndSpeak])

  // ─── Story scenario completion ─────────────────────────────────────────────
  const _handleScenarioComplete = useCallback((report) => {
    const scenario = SCENARIOS[scenarioId]
    if (scenario?.isStory) {
      const chapter = STORY_CHAPTERS.find(c => c.id === scenarioId)
      if (chapter) {
        const score = scoreChapter(report?.objectives || [])
        setStoryProgress(prev => {
          const updated = {
            unlockedChapter: Math.max(prev.unlockedChapter, chapter.number + 1),
            scores: { ...prev.scores, [chapter.id]: score }
          }
          saveStoryProgress(updated)
          return updated
        })
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

  const activeModelRef = useRef(null)
  const policyTargetsRef = useRef({})

  const _resetSim = useCallback((id, scenarioConfig = null) => {
    setSimState(null)
    setCurrentInsight(null)
    setPendingChoice(null)
    setReportCard(null)
    setStoryOutro(null)
    policyTargetsRef.current = {}
    // Reset unlocked sections on scenario reset
    const fresh = new Set(['economy', 'fiscal'])
    setUnlockedSections(fresh)
    saveUnlockedSections(fresh)
    setActiveSection('economy')
    sendToWorker({ type: 'RESET', scenarioId: id, scenarioConfig: scenarioConfig || activeModelRef.current })
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
    policyTargetsRef.current[key] = validated
    sendToWorker({ type: 'SET_POLICY', policy: key, value: validated })
    setSimState(prev => prev ? {
      ...prev,
      policies: { ...prev.policies, [key]: validated }
    } : prev)
    narrator.onPolicy(key, validated)
  }, [sendToWorker, narrator])

  const handleTutorialNext = useCallback(() => {
    setCompletedLessons(prev => {
      const updated = prev.includes(tutorialLessonIndex) ? prev : [...prev, tutorialLessonIndex]
      localStorage.setItem('ecomsim_tutorial_progress', JSON.stringify(updated))
      return updated
    })

    const nextIdx = tutorialLessonIndex + 1
    if (nextIdx >= TUTORIAL_LESSONS.length) {
      setTutorialLessonIndex(-1)
      setTutorialComplete(false)
      setShowModeSelect(true)
      return
    }
    setTutorialLessonIndex(nextIdx)
    setTutorialComplete(false)
    const lesson = TUTORIAL_LESSONS[nextIdx]
    const config = {
      id: 'default',
      name: lesson.title,
      ...lesson.scenarioConfig
    }
    activeModelRef.current = config
    _resetSim('default', config)
  }, [tutorialLessonIndex, _resetSim])

  const handleTutorialSkip = useCallback(() => {
    setTutorialLessonIndex(-1)
    setTutorialComplete(false)
    setShowModeSelect(true)
  }, [])

  const handleSectionChange = useCallback((section) => {
    setActiveSection(section)
  }, [])

  const handleModeSelect = useCallback((id) => {
    if (id === '_tutorial') {
      const startIdx = completedLessons.length < TUTORIAL_LESSONS.length
        ? TUTORIAL_LESSONS.findIndex((_, i) => !completedLessons.includes(i))
        : 0
      setTutorialLessonIndex(startIdx)
      setTutorialComplete(false)
      const lesson = TUTORIAL_LESSONS[startIdx]
      const config = {
        id: 'default',
        name: lesson.title,
        ...lesson.scenarioConfig
      }
      activeModelRef.current = config
      setScenarioId('default')
      _resetSim('default', config)
      return
    }

    setTutorialLessonIndex(-1)
    setTutorialComplete(false)

    if (id === '_reset_story') {
      resetStoryProgress()
      setStoryProgress({ unlockedChapter: 1, scores: {} })
      return
    }

    if (id.startsWith('_model:')) {
      const modelId = id.slice(7)
      const model = ECONOMIC_MODELS.find(m => m.id === modelId)
      if (model) {
        const config = {
          id: 'default',
          name: model.name + ' Economy',
          policies: model.policies,
          agentCount: 200,
          businessCount: 20,
          wealthMultiplier: 1.0,
          wealthInequality: 1.0,
          avgSkill: 0.5
        }
        activeModelRef.current = config
        setScenarioId('default')
        saveScenario('default')
        _resetSim('default', config)
        return
      }
    }

    activeModelRef.current = null

    const scenario = SCENARIOS[id]
    const chapter = scenario?.isStory ? STORY_CHAPTERS.find(c => c.id === id) : null

    setScenarioId(id)
    saveScenario(id)

    if (chapter) {
      setStoryIntro(chapter)
      _resetSim(id)
      setPaused(true)
      sendToWorker({ type: 'PAUSE' })
      if (narrator.enabled) narrator.speak(chapter.kokoroNarration)
    } else {
      _resetSim(id)
    }
  }, [_resetSim, sendToWorker, narrator]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleShockMe = useCallback(() => {
    sendToWorker({ type: 'FORCE_SHOCK' })
  }, [sendToWorker])

  const handleChoiceResolved = useCallback((eventId, choiceId) => {
    setPendingChoice(null)
    sendToWorker({ type: 'RESOLVE_CHOICE', eventId, choiceId })
  }, [sendToWorker])

  const handleRetry = useCallback(() => {
    setReportCard(null)
    handleReset()
  }, [handleReset])

  const handleNextScenario = useCallback(() => {
    setReportCard(null)
    setShowModeSelect(true)
  }, [])

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
      setShowModeSelect(true)
    }
  }, [scenarioId, handleModeSelect])

  const handleStoryBegin = useCallback(() => {
    setStoryIntro(null)
    sendToWorker({ type: 'RESUME' })
    setPaused(false)
  }, [sendToWorker])

  // ─── Derived ──────────────────────────────────────────────────────────────────
  const scenarioName = activeModelRef.current?.name || SCENARIOS[scenarioId]?.name || 'Free Market'
  const currentScenario = SCENARIOS[scenarioId]
  const isStoryMode = currentScenario?.isStory
  const currentChapter = isStoryMode ? STORY_CHAPTERS.find(c => c.id === scenarioId) : null

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
        scenarioName={
          isStoryMode && currentChapter
            ? `Ch.${currentChapter.number} ${currentChapter.title}`
            : scenarioName
        }
        year={simState?.year}
        score={simState?.score}
        achievementCount={simState?.achievements?.length || 0}
        narratorEnabled={narrator.enabled}
        narratorLoading={narrator.loading}
        onNarratorToggle={narrator.enabled ? narrator.disable : narrator.enable}
        llmStatus={narrator.llmStatus}
        llmProgress={narrator.llmProgress}
        llmReady={narrator.llmReady}
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
        unlockedSections={unlockedSections}
        metrics={simState?.metrics}
        approvalRating={simState?.approvalRating ?? 50}
      />

      {/* Vital Signs strip */}
      <VitalSigns
        metrics={simState?.metrics}
        approvalRating={simState?.approvalRating ?? 50}
        onTabSwitch={handleSectionChange}
      />

      {/* Story chapter banner */}
      {isStoryMode && currentChapter && !storyIntro && !storyOutro && (
        <div className="flex justify-center py-1 bg-[#0a0a0f]">
          <div
            className="px-4 py-1 rounded-full text-xs font-mono font-bold"
            style={{ background: currentChapter.color + '22', border: `1px solid ${currentChapter.color}44`, color: currentChapter.color }}
          >
            Chapter {currentChapter.number}: {currentChapter.title} · {currentChapter.era}
          </div>
        </div>
      )}

      {/* Two-column layout: Metrics+Policies | Charts */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left column: Metrics + Policies */}
        <div className="w-[440px] flex-shrink-0 border-r border-[#1e1e2e] bg-[#0a0a0f] overflow-hidden">
          <Dashboard
            metrics={simState?.metrics}
            market={simState?.market}
            activeEvents={simState?.activeEvents}
            approvalRating={simState?.approvalRating ?? 50}
            policyLag={simState?.policyLag || {}}
            policies={simState?.policies}
            onPolicyChange={handlePolicyChange}
            econFeed={simState?.econFeed || []}
            agents={simState?.agents}
            objectives={simState?.objectives}
            scenarioDurationYears={simState?.scenarioDurationYears}
            year={simState?.year}
            scenarioName={scenarioName}
            score={simState?.score}
            scoreHistory={simState?.scoreHistory}
            achievements={simState?.achievements}
            milestoneProgress={simState?.milestoneProgress}
            totalMilestones={simState?.totalMilestones}
            currentMilestone={simState?.currentMilestone}
            tutorialLesson={tutorialLessonIndex >= 0 ? TUTORIAL_LESSONS[tutorialLessonIndex] : null}
            tutorialLessonIndex={tutorialLessonIndex}
            tutorialTotal={TUTORIAL_LESSONS.length}
            tutorialComplete={tutorialComplete}
            completedLessons={completedLessons}
            onTutorialNext={handleTutorialNext}
            onTutorialSkip={handleTutorialSkip}
            activeSection={activeSection}
            onSectionChange={handleSectionChange}
            unlockedSections={unlockedSections}
          />
        </div>

        {/* Right column: Charts */}
        <div className="flex-1 overflow-y-auto bg-[#08080d]">
          <MacroDashboard
            metrics={simState?.metrics}
            market={simState?.market}
            approvalHistory={simState?.approvalHistory || []}
            activeSection={activeSection}
          />
        </div>
      </div>

      {/* Achievement + unlock toasts */}
      {achievementToasts.length > 0 && (
        <div className="fixed top-16 right-4 z-50 flex flex-col gap-2">
          {achievementToasts.map((a) => (
            <div
              key={a.id}
              className="bg-[#161625] border rounded-lg pl-4 pr-2 py-3 shadow-lg"
              style={{
                animation: 'slideIn 0.3s ease-out',
                borderColor: a.isUnlock ? '#3b82f6' : '#f59e0b',
                boxShadow: `0 0 20px ${a.isUnlock ? '#3b82f633' : '#f59e0b33'}`
              }}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">{a.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-mono uppercase tracking-wider" style={{ color: a.isUnlock ? '#3b82f6' : '#f59e0b' }}>
                    {a.isUnlock ? 'Area Unlocked' : 'Achievement Unlocked'}
                  </div>
                  <div className="text-sm font-bold text-white">{a.name}</div>
                  <div className="text-[10px] text-[#94a3b8]">{a.description}</div>
                </div>
                <button
                  onClick={() => setAchievementToasts(t => t.filter(x => x.id !== a.id))}
                  className="text-[#64748b] hover:text-white text-sm px-1 self-start"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

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

      {/* Mode selector — full start screen */}
      {showModeSelect && (
        <ModeSelect
          onSelect={(id) => { handleModeSelect(id); setShowModeSelect(false) }}
          storyProgress={storyProgress}
          completedLessons={completedLessons}
        />
      )}

      {/* Voice orb — audio-reactive narrator indicator */}
      <VoiceOrb
        state={narrator.narratorState}
        progress={narrator.llmProgress}
        analyserNode={narrator.analyserNode}
        onClick={narrator.enabled ? narrator.disable : narrator.enable}
      />
    </div>
  )
}
