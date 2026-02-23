import { useState } from 'react'

const SHARE_URL = typeof window !== 'undefined' ? window.location.origin : 'https://econsim.app'

function openShareWindow(url) {
  window.open(url, '_blank', 'width=600,height=400,noopener,noreferrer')
}

function ShareButton({ icon, label, color, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-mono transition-colors"
      style={{
        color,
        background: color + '11',
        border: `1px solid ${color}33`
      }}
      onMouseEnter={e => { e.currentTarget.style.background = color + '22' }}
      onMouseLeave={e => { e.currentTarget.style.background = color + '11' }}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  )
}

export default function SharePanel({ text, url = SHARE_URL, compact = false }) {
  const [copied, setCopied] = useState(false)

  const encodedText = encodeURIComponent(text)
  const encodedUrl = encodeURIComponent(url)

  const platforms = [
    {
      icon: '𝕏',
      label: 'Twitter',
      color: '#1d9bf0',
      url: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`
    },
    {
      icon: 'f',
      label: 'Facebook',
      color: '#1877f2',
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`
    },
    {
      icon: 'r/',
      label: 'Reddit',
      color: '#ff4500',
      url: `https://reddit.com/submit?url=${encodedUrl}&title=${encodedText}`
    },
    {
      icon: 'in',
      label: 'LinkedIn',
      color: '#0a66c2',
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`
    }
  ]

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(`${text} ${url}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className={`flex ${compact ? 'gap-1' : 'flex-wrap gap-1.5'}`}>
      {platforms.map(p => (
        <ShareButton
          key={p.label}
          icon={p.icon}
          label={compact ? '' : p.label}
          color={p.color}
          onClick={() => openShareWindow(p.url)}
        />
      ))}
      <ShareButton
        icon={copied ? '✓' : '🔗'}
        label={compact ? '' : (copied ? 'Copied!' : 'Copy')}
        color={copied ? '#22c55e' : '#94a3b8'}
        onClick={handleCopy}
      />
    </div>
  )
}
