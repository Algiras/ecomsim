import { wealthColor, wealthColorRgba, STATE_COLORS, happinessGlow } from './colors.js'
import { AGENT_RADIUS } from '../utils/constants.js'

export function renderAgents(ctx, agents, selectedAgentId, tick) {
  for (const agent of agents) {
    if (!agent.alive) continue
    renderAgent(ctx, agent, agent.id === selectedAgentId, tick)
  }
}

export function renderAgent(ctx, agent, selected, tick) {
  const { x, y, state, wealth, happiness, unrest, employed, isOwner, age } = agent
  const r = AGENT_RADIUS

  ctx.save()

  // Glow for unhappy/distressed agents
  if (unrest > 0.5) {
    ctx.shadowColor = 'rgba(239,68,68,0.7)'
    ctx.shadowBlur = 8
  } else if (wealth > 5000) {
    ctx.shadowColor = 'rgba(251,191,36,0.5)'
    ctx.shadowBlur = 6
  }

  // Fill color based on wealth
  const fillColor = wealthColor(wealth)

  // Shape based on life stage/role
  ctx.beginPath()

  if (isOwner || state === 'owner') {
    // Diamond for business owners
    ctx.moveTo(x, y - r * 1.4)
    ctx.lineTo(x + r * 1.0, y)
    ctx.lineTo(x, y + r * 1.4)
    ctx.lineTo(x - r * 1.0, y)
    ctx.closePath()
  } else if (state === 'child' || age < 18 * 52) {
    // Small circle for children
    ctx.arc(x, y, r * 0.65, 0, Math.PI * 2)
  } else if (state === 'retired') {
    // Square for retirees
    ctx.rect(x - r * 0.9, y - r * 0.9, r * 1.8, r * 1.8)
  } else {
    // Circle for working/unemployed adults
    ctx.arc(x, y, r, 0, Math.PI * 2)
  }

  ctx.fillStyle = fillColor
  ctx.fill()

  // Border: employment status
  if (state === 'unemployed') {
    ctx.strokeStyle = '#ef4444'
    ctx.lineWidth = 1.5
    ctx.setLineDash([2, 2])
    ctx.stroke()
    ctx.setLineDash([])
  } else if (employed || isOwner) {
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'
    ctx.lineWidth = 1
    ctx.stroke()
  }

  // Poverty pulse animation
  if (wealth < 100 && state !== 'child') {
    const pulseAlpha = 0.3 + 0.3 * Math.sin(tick * 0.1)
    ctx.strokeStyle = `rgba(239,68,68,${pulseAlpha})`
    ctx.lineWidth = 2
    ctx.setLineDash([])
    ctx.beginPath()
    ctx.arc(x, y, r + 3, 0, Math.PI * 2)
    ctx.stroke()
  }

  // Selection ring
  if (selected) {
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2
    ctx.setLineDash([])
    ctx.beginPath()
    ctx.arc(x, y, r + 4, 0, Math.PI * 2)
    ctx.stroke()
  }

  ctx.restore()
}

export function renderEmploymentLines(ctx, agents, businesses, alpha = 0.12) {
  ctx.save()
  ctx.lineWidth = 0.5

  for (const agent of agents) {
    if (!agent.alive || !agent.employed || !agent.employerId) continue

    const employer = businesses.find(b => b.id === agent.employerId)
    if (!employer) continue

    ctx.beginPath()
    ctx.strokeStyle = `rgba(99,102,241,${alpha})`
    ctx.moveTo(agent.x, agent.y)
    ctx.lineTo(employer.x, employer.y)
    ctx.stroke()
  }

  ctx.restore()
}
