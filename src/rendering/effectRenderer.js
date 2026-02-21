// Visual effects: sparkles, death fades, unrest waves

const effects = []

export function addBirthEffect(x, y) {
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI * 2 / 6) * i
    effects.push({
      type: 'sparkle',
      x, y,
      vx: Math.cos(angle) * 2,
      vy: Math.sin(angle) * 2,
      life: 1.0,
      color: '#22c55e',
      size: 3
    })
  }
}

export function addDeathEffect(x, y) {
  for (let i = 0; i < 8; i++) {
    const angle = Math.random() * Math.PI * 2
    effects.push({
      type: 'fade',
      x: x + (Math.random() - 0.5) * 10,
      y: y + (Math.random() - 0.5) * 10,
      vx: Math.cos(angle) * 1.5,
      vy: Math.sin(angle) * 1.5,
      life: 1.0,
      color: '#ef4444',
      size: 2
    })
  }
}

export function addUnrestWave(x, y) {
  effects.push({
    type: 'wave',
    x, y,
    radius: 5,
    maxRadius: 40,
    life: 1.0,
    color: '#ef4444'
  })
}

export function addEventEffect(x, y, color = '#f59e0b') {
  for (let i = 0; i < 12; i++) {
    const angle = (Math.PI * 2 / 12) * i
    effects.push({
      type: 'sparkle',
      x, y,
      vx: Math.cos(angle) * 3,
      vy: Math.sin(angle) * 3,
      life: 1.0,
      color,
      size: 4
    })
  }
  effects.push({ type: 'wave', x, y, radius: 10, maxRadius: 80, life: 1.0, color })
}

export function addRevolutionEffect(x, y) {
  // Blood-red burst — execution or looting
  for (let i = 0; i < 10; i++) {
    const angle = Math.random() * Math.PI * 2
    const speed = 1.5 + Math.random() * 3
    effects.push({
      type: 'sparkle',
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1.0,
      color: Math.random() < 0.6 ? '#dc2626' : '#f97316',
      size: 3 + Math.random() * 3
    })
  }
  effects.push({ type: 'wave', x, y, radius: 8, maxRadius: 60, life: 1.0, color: '#dc2626' })
}

let _revolutionOverlayAlpha = 0
let _revolutionActive = false

export function setRevolutionActive(active) {
  _revolutionActive = active
}

export function renderRevolutionOverlay(ctx, w, h) {
  // Pulsing red tint overlay during revolution
  if (_revolutionActive) {
    _revolutionOverlayAlpha = Math.min(0.18, _revolutionOverlayAlpha + 0.005)
  } else {
    _revolutionOverlayAlpha = Math.max(0, _revolutionOverlayAlpha - 0.008)
  }
  if (_revolutionOverlayAlpha <= 0) return
  const pulse = Math.sin(Date.now() / 600) * 0.5 + 0.5
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.fillStyle = `rgba(220,38,38,${_revolutionOverlayAlpha * (0.5 + pulse * 0.5)})`
  ctx.fillRect(0, 0, w, h)
  ctx.restore()
}

export function renderEffects(ctx) {
  for (let i = effects.length - 1; i >= 0; i--) {
    const e = effects[i]

    ctx.save()
    ctx.globalAlpha = e.life

    switch (e.type) {
      case 'sparkle':
        ctx.fillStyle = e.color
        ctx.beginPath()
        ctx.arc(e.x, e.y, e.size * e.life, 0, Math.PI * 2)
        ctx.fill()
        e.x += e.vx
        e.y += e.vy
        e.vx *= 0.95
        e.vy *= 0.95
        e.life -= 0.04
        break

      case 'fade':
        ctx.fillStyle = e.color
        ctx.beginPath()
        ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2)
        ctx.fill()
        e.x += e.vx
        e.y += e.vy
        e.life -= 0.06
        break

      case 'wave':
        ctx.strokeStyle = e.color
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2)
        ctx.stroke()
        e.radius = e.radius + (e.maxRadius - e.radius) * 0.08
        e.life -= 0.03
        break
    }

    ctx.restore()

    if (e.life <= 0) {
      effects.splice(i, 1)
    }
  }
}
