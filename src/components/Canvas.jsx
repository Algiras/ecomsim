import { useRef, useEffect, useCallback } from 'react'
import { renderAgents, renderEmploymentLines } from '../rendering/agentRenderer.js'
import { renderBusinesses, renderBusinessZones } from '../rendering/businessRenderer.js'
import { renderEffects, addBirthEffect, addDeathEffect } from '../rendering/effectRenderer.js'
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../utils/constants.js'

export default function Canvas({ simState, onAgentClick, selectedAgentId }) {
  const canvasRef = useRef(null)
  const rafRef = useRef(null)
  const tickRef = useRef(0)
  const prevAgentIdsRef = useRef(new Set())
  const dprRef = useRef(1)

  // Resize canvas to fill its container at device pixel ratio — eliminates pixelation
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

  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    tickRef.current++
    const tick = tickRef.current

    const dpr = dprRef.current
    const w = canvas.width
    const h = canvas.height

    // Scale context so simulation coordinates (0..CANVAS_WIDTH, 0..CANVAS_HEIGHT)
    // map cleanly onto the physical pixel buffer at any DPR or window size
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    const scaleX = w / CANVAS_WIDTH
    const scaleY = h / CANVAS_HEIGHT
    const scale = Math.min(scaleX, scaleY)
    const offsetX = (w - CANVAS_WIDTH * scale) / 2
    const offsetY = (h - CANVAS_HEIGHT * scale) / 2
    ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY)

    // Clear with dark background (in logical coords)
    ctx.fillStyle = '#0a0a0f'
    ctx.fillRect(-offsetX / scale, -offsetY / scale, w / scale, h / scale)

    if (!simState) {
      // Loading state
      ctx.fillStyle = '#334155'
      ctx.font = '14px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('Initializing simulation...', canvas.width / 2, canvas.height / 2)
      return
    }

    const { agents = [], businesses = [] } = simState

    // Track births/deaths for effects
    const currentIds = new Set(agents.filter(a => a.alive).map(a => a.id))
    const prevIds = prevAgentIdsRef.current

    // Deaths
    for (const id of prevIds) {
      if (!currentIds.has(id)) {
        const dead = agents.find(a => a.id === id)
        if (dead) addDeathEffect(dead.x, dead.y)
      }
    }

    // Births (new IDs we haven't seen)
    for (const id of currentIds) {
      if (!prevIds.has(id)) {
        const newAgent = agents.find(a => a.id === id)
        if (newAgent) addBirthEffect(newAgent.x, newAgent.y)
      }
    }
    prevAgentIdsRef.current = currentIds

    // Layer 1: Business zones (soft background glow)
    renderBusinessZones(ctx, businesses, canvas.width, canvas.height)

    // Layer 2: Employment connection lines
    renderEmploymentLines(ctx, agents, businesses)

    // Layer 3: Businesses
    renderBusinesses(ctx, businesses, tick)

    // Layer 4: Agents
    renderAgents(ctx, agents, selectedAgentId, tick)

    // Layer 5: Particle effects
    renderEffects(ctx)

    rafRef.current = requestAnimationFrame(render)
  }, [simState, selectedAgentId])

  useEffect(() => {
    rafRef.current = requestAnimationFrame(render)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [render])

  const handleClick = useCallback((e) => {
    if (!simState?.agents || !onAgentClick) return
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    // Map CSS pixels → simulation logical coordinates
    const dpr = dprRef.current
    const w = canvas.width
    const h = canvas.height
    const scale = Math.min(w / CANVAS_WIDTH, h / CANVAS_HEIGHT)
    const offsetX = (w - CANVAS_WIDTH * scale) / 2
    const offsetY = (h - CANVAS_HEIGHT * scale) / 2
    const cssX = e.clientX - rect.left
    const cssY = e.clientY - rect.top
    const mx = (cssX * dpr - offsetX) / scale
    const my = (cssY * dpr - offsetY) / scale

    // Find closest agent within 12px
    let closest = null
    let closestDist = 12
    for (const agent of simState.agents) {
      if (!agent.alive) continue
      const d = Math.sqrt((agent.x - mx) ** 2 + (agent.y - my) ** 2)
      if (d < closestDist) {
        closestDist = d
        closest = agent
      }
    }
    onAgentClick(closest)
  }, [simState, onAgentClick])

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full cursor-crosshair"
      style={{ display: 'block' }}
      onClick={handleClick}
    />
  )
}
