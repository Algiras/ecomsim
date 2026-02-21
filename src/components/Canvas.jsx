import { useRef, useEffect, useCallback } from 'react'
import { renderAgents, renderEmploymentLines } from '../rendering/agentRenderer.js'
import { renderBusinesses, renderBusinessZones } from '../rendering/businessRenderer.js'
import { renderEffects, renderRevolutionOverlay, setRevolutionActive, addBirthEffect, addDeathEffect, addRevolutionEffect } from '../rendering/effectRenderer.js'
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../utils/constants.js'

export default function Canvas({ simState, onAgentClick, selectedAgentId }) {
  const canvasRef = useRef(null)
  const rafRef = useRef(null)
  const tickRef = useRef(0)
  const prevAgentIdsRef = useRef(new Set())
  const dprRef = useRef(1)
  const simStateRef = useRef(null)
  const selectedAgentIdRef = useRef(null)

  simStateRef.current = simState
  selectedAgentIdRef.current = selectedAgentId

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      dprRef.current = dpr
      const rect = canvas.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return
      canvas.width = Math.round(rect.width * dpr)
      canvas.height = Math.round(rect.height * dpr)
    }

    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const render = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      const state = simStateRef.current
      const selId = selectedAgentIdRef.current

      tickRef.current++
      const tick = tickRef.current

      const w = canvas.width
      const h = canvas.height

      ctx.setTransform(1, 0, 0, 1, 0, 0)
      const scaleX = w / CANVAS_WIDTH
      const scaleY = h / CANVAS_HEIGHT
      ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0)

      ctx.fillStyle = '#0a0a0f'
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

      if (!state) {
        ctx.fillStyle = '#334155'
        ctx.font = '14px monospace'
        ctx.textAlign = 'center'
        ctx.fillText('Initializing simulation...', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2)
        rafRef.current = requestAnimationFrame(render)
        return
      }

      const { agents = [], businesses = [] } = state

      const currentIds = new Set(agents.filter(a => a.alive).map(a => a.id))
      const prevIds = prevAgentIdsRef.current

      const isRevolution = state?.activeEvents?.some(e => e.type === 'revolution')
      setRevolutionActive(!!isRevolution)

      for (const id of prevIds) {
        if (!currentIds.has(id)) {
          const dead = agents.find(a => a.id === id)
          if (dead) {
            if (isRevolution) addRevolutionEffect(dead.x, dead.y)
            else addDeathEffect(dead.x, dead.y)
          }
        }
      }

      for (const id of currentIds) {
        if (!prevIds.has(id)) {
          const newAgent = agents.find(a => a.id === id)
          if (newAgent) addBirthEffect(newAgent.x, newAgent.y)
        }
      }
      prevAgentIdsRef.current = currentIds

      renderBusinessZones(ctx, businesses)
      renderEmploymentLines(ctx, agents, businesses)
      renderBusinesses(ctx, businesses, tick)
      renderAgents(ctx, agents, selId, tick)
      renderEffects(ctx)
      renderRevolutionOverlay(ctx, w, h)

      rafRef.current = requestAnimationFrame(render)
    }

    rafRef.current = requestAnimationFrame(render)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  const handleClick = useCallback((e) => {
    const state = simStateRef.current
    if (!state?.agents || !onAgentClick) return
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const dpr = dprRef.current
    const w = canvas.width
    const h = canvas.height
    const scaleX = w / CANVAS_WIDTH
    const scaleY = h / CANVAS_HEIGHT
    const cssX = e.clientX - rect.left
    const cssY = e.clientY - rect.top
    const mx = (cssX * dpr) / scaleX
    const my = (cssY * dpr) / scaleY

    let closest = null
    let closestDist = 12
    for (const agent of state.agents) {
      if (!agent.alive) continue
      const d = Math.sqrt((agent.x - mx) ** 2 + (agent.y - my) ** 2)
      if (d < closestDist) {
        closestDist = d
        closest = agent
      }
    }
    onAgentClick(closest)
  }, [onAgentClick])

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full cursor-crosshair"
      style={{ display: 'block' }}
      onClick={handleClick}
    />
  )
}
