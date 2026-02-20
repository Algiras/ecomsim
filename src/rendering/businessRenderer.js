import { SECTOR_COLORS } from './colors.js'

export function renderBusinesses(ctx, businesses, tick) {
  for (const biz of businesses) {
    if (!biz.alive) continue
    renderBusiness(ctx, biz, tick)
  }
}

export function renderBusiness(ctx, biz, tick) {
  const { x, y, sector, employeeCount, radius, pulse, dominance, capital } = biz
  const color = SECTOR_COLORS[sector] || '#94a3b8'

  ctx.save()

  // Dominant business glow
  if (dominance > 0.4) {
    ctx.shadowColor = color
    ctx.shadowBlur = 15 + dominance * 20
  } else if (capital > 2000) {
    ctx.shadowColor = color
    ctx.shadowBlur = 8
  }

  // Business hex/circle
  const r = radius || 10
  ctx.beginPath()
  drawHexagon(ctx, x, y, r)
  ctx.fillStyle = color + '33'  // transparent fill
  ctx.fill()
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  ctx.stroke()

  // Sector symbol in center
  ctx.fillStyle = color
  ctx.font = `${Math.max(8, r * 0.8)}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(SECTOR_ICONS[sector] || '?', x, y)

  // Employee count badge
  if (employeeCount > 0) {
    ctx.fillStyle = 'rgba(0,0,0,0.7)'
    ctx.beginPath()
    ctx.arc(x + r * 0.8, y - r * 0.8, 6, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.font = '7px sans-serif'
    ctx.fillText(employeeCount, x + r * 0.8, y - r * 0.8)
  }

  // Struggling indicator
  if (capital < 100) {
    const flashAlpha = 0.4 + 0.4 * Math.sin(tick * 0.15)
    ctx.strokeStyle = `rgba(239,68,68,${flashAlpha})`
    ctx.lineWidth = 2
    ctx.beginPath()
    drawHexagon(ctx, x, y, r + 4)
    ctx.stroke()
  }

  ctx.restore()
}

function drawHexagon(ctx, x, y, r) {
  ctx.beginPath()
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6
    const px = x + r * Math.cos(angle)
    const py = y + r * Math.sin(angle)
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
}

const SECTOR_ICONS = {
  food: '🌾',
  housing: '🏠',
  tech: '💻',
  luxury: '💎'
}

export function renderBusinessZones(ctx, businesses, width, height) {
  // Draw soft radius circles showing business "territory"
  ctx.save()
  for (const biz of businesses) {
    if (!biz.alive) continue
    const color = SECTOR_COLORS[biz.sector] || '#94a3b8'
    const r = 30 + biz.employeeCount * 5

    const gradient = ctx.createRadialGradient(biz.x, biz.y, 0, biz.x, biz.y, r)
    gradient.addColorStop(0, color + '15')
    gradient.addColorStop(1, 'transparent')

    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(biz.x, biz.y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}
