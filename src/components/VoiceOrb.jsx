import { useRef, useEffect, useCallback } from 'react'

const SIZE = 48
const DPR = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 2
const CANVAS_SIZE = SIZE * DPR

// States: disabled, idle, loading, speaking
export default function VoiceOrb({ state = 'disabled', progress = 0, analyserNode, onClick }) {
  const canvasRef = useRef(null)
  const animRef = useRef(null)

  const draw = useCallback((time) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const cx = CANVAS_SIZE / 2
    const cy = CANVAS_SIZE / 2
    const baseR = CANVAS_SIZE * 0.32

    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

    if (state === 'disabled') {
      // Outer ring so it's always visible
      ctx.beginPath()
      ctx.arc(cx, cy, baseR * 0.75, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(99,102,241,0.35)'
      ctx.lineWidth = 1.5 * DPR
      ctx.stroke()

      // Dim orb fill
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseR * 0.7)
      grad.addColorStop(0, 'rgba(99,102,241,0.45)')
      grad.addColorStop(1, 'rgba(99,102,241,0.05)')
      ctx.beginPath()
      ctx.arc(cx, cy, baseR * 0.7, 0, Math.PI * 2)
      ctx.fillStyle = grad
      ctx.fill()

      // Core dot
      ctx.beginPath()
      ctx.arc(cx, cy, baseR * 0.2, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(99,102,241,0.5)'
      ctx.fill()
    }

    else if (state === 'idle') {
      // Breathing sine animation
      const breathe = 1 + 0.08 * Math.sin(time / 1200)
      const r = baseR * breathe

      // Outer ring
      ctx.beginPath()
      ctx.arc(cx, cy, r * 0.85, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(6,182,212,0.3)'
      ctx.lineWidth = 1.5 * DPR
      ctx.stroke()

      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
      grad.addColorStop(0, 'rgba(99,102,241,0.8)')
      grad.addColorStop(0.5, 'rgba(6,182,212,0.35)')
      grad.addColorStop(1, 'rgba(6,182,212,0)')
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.fillStyle = grad
      ctx.fill()

      // Core
      ctx.beginPath()
      ctx.arc(cx, cy, baseR * 0.2, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(99,102,241,0.9)'
      ctx.fill()
    }

    else if (state === 'loading') {
      // Spinning arc with progress
      const angle = (time / 600) % (Math.PI * 2)
      const sweepAngle = Math.PI * 1.2

      // Background ring
      ctx.beginPath()
      ctx.arc(cx, cy, baseR * 0.7, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(99,102,241,0.3)'
      ctx.lineWidth = 3 * DPR
      ctx.stroke()

      // Spinning arc
      ctx.beginPath()
      ctx.arc(cx, cy, baseR * 0.7, angle, angle + sweepAngle)
      ctx.strokeStyle = 'rgba(6,182,212,0.8)'
      ctx.lineWidth = 3 * DPR
      ctx.lineCap = 'round'
      ctx.stroke()

      // Progress text
      ctx.fillStyle = 'rgba(226,232,240,0.8)'
      ctx.font = `bold ${10 * DPR}px monospace`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(`${progress}%`, cx, cy)
    }

    else if (state === 'speaking') {
      // Audio-reactive pulse
      let amplitude = 0.5
      if (analyserNode) {
        const data = new Uint8Array(analyserNode.frequencyBinCount)
        analyserNode.getByteFrequencyData(data)
        // Average amplitude from frequency data
        let sum = 0
        for (let i = 0; i < data.length; i++) sum += data[i]
        amplitude = sum / (data.length * 255) // 0..1
      }

      const scale = 1.0 + amplitude * 0.4 // 1.0 to 1.4
      const r = baseR * scale
      const glowAlpha = 0.2 + amplitude * 0.5

      // Outer glow
      const glow = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r * 1.3)
      glow.addColorStop(0, `rgba(6,182,212,${glowAlpha})`)
      glow.addColorStop(1, 'rgba(6,182,212,0)')
      ctx.beginPath()
      ctx.arc(cx, cy, r * 1.3, 0, Math.PI * 2)
      ctx.fillStyle = glow
      ctx.fill()

      // Main orb
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
      grad.addColorStop(0, 'rgba(99,102,241,0.9)')
      grad.addColorStop(0.5, `rgba(6,182,212,${0.4 + amplitude * 0.3})`)
      grad.addColorStop(1, 'rgba(6,182,212,0)')
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.fillStyle = grad
      ctx.fill()

      // Bright core
      ctx.beginPath()
      ctx.arc(cx, cy, baseR * 0.2, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(255,255,255,${0.6 + amplitude * 0.3})`
      ctx.fill()
    }

    animRef.current = requestAnimationFrame(draw)
  }, [state, progress, analyserNode])

  useEffect(() => {
    animRef.current = requestAnimationFrame(draw)
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [draw])

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_SIZE}
      height={CANVAS_SIZE}
      onClick={onClick}
      title={
        state === 'disabled' ? 'Enable AI narrator'
          : state === 'loading' ? `Loading AI model (${progress}%)`
          : state === 'speaking' ? 'AI narrator speaking'
          : 'AI narrator idle — click to disable'
      }
      style={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        width: SIZE,
        height: SIZE,
        cursor: 'pointer',
        zIndex: 50
      }}
    />
  )
}
