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

  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    tickRef.current++
    const tick = tickRef.current

    // Clear with dark background
    ctx.fillStyle = '#0a0a0f'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

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
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const mx = (e.clientX - rect.left) * scaleX
    const my = (e.clientY - rect.top) * scaleY

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
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      className="w-full h-full cursor-crosshair"
      style={{ imageRendering: 'pixelated', display: 'block' }}
      onClick={handleClick}
    />
  )
}
