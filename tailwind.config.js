/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sim: {
          bg: '#0a0a0f',
          panel: '#12121a',
          border: '#1e1e2e',
          text: '#e2e8f0',
          muted: '#64748b',
          accent: '#6366f1',
          green: '#22c55e',
          red: '#ef4444',
          yellow: '#eab308',
          cyan: '#06b6d4',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      }
    },
  },
  plugins: [],
}
