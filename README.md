# 🐾 Awesome Pawesome Economy Simulator

> **Learn economics by breaking things.**

A browser-based particle economy simulator where 200–400 AI agents live, work, earn, spend, and die in a fully emergent market. Every policy you toggle has visible second-order effects. No lectures — just consequences.

**[▶ Live Demo](https://algiras.github.io/ecomsim/)**

---

## What it simulates

| Feature | Detail |
|---------|--------|
| **Agents** | 200–400 citizens with wealth, skill, health, age, employment |
| **Businesses** | 20–80 firms across 4 sectors with hiring, pricing, bankruptcy |
| **Market** | Supply/demand price discovery per sector each tick |
| **Labor** | Job matching, wage negotiation, unemployment |
| **Policies** | 15 levers: taxes, min wage, UBI, interest rate, healthcare, and more |
| **Events** | Pandemic, crop failure, tech breakthrough, financial bubble, recession… |
| **Insights** | Educational pop-ups triggered by emergent conditions |
| **Narration** | Optional AI voice narrator (kokoro-js, 82M model, runs in-browser) |

---

## Scenarios

| Scenario | Premise | Lesson |
|----------|---------|--------|
| 🦅 **Free Market Utopia** | Zero regulation, zero taxes | Monopolies form naturally; the rich get richer fast |
| 💸 **The Debt Spiral** | High debt, high spending | Austerity vs. default — pick your poison |
| 🤖 **Tech Disruption** | Stable economy, then automation hits | UBI or retraining: which saves more people? |

---

## Policy levers

- 📊 Income Tax (0–60%)
- 🏢 Corporate Tax (0–50%)
- 💼 Minimum Wage
- 🎁 Universal Basic Income
- 🏦 Interest Rate
- ⚖️ Anti-Monopoly Laws
- 📚 Education Spending
- 🛡️ Unemployment Benefits
- 🌾 Food Price Controls / 🏠 Rent Controls
- 🖨️ Quantitative Easing (print money)
- 🏥 Public Healthcare
- 💎 Wealth Tax
- 🌍 Open Immigration
- 🚜 Farm Subsidies

---

## Tech stack

```
React 18 + Vite 5     UI framework + build
HTML5 Canvas          Particle rendering at 60fps
Web Worker            Simulation off main thread
Recharts              Sparklines, histogram, Lorenz curve
Zustand               Lightweight state (UI layer)
Tailwind CSS          Styling
kokoro-js             In-browser AI narrator (82M ONNX TTS)
```

---

## Run locally

```bash
git clone https://github.com/Algiras/ecomsim
cd ecomsim
npm install
npm run dev
# → http://localhost:5173/ecomsim/
```

## Deploy

```bash
npm run deploy   # builds + pushes to gh-pages branch
```

Auto-deploy via GitHub Actions on every push to `main`.

---

## Keyboard / UI

| Control | Action |
|---------|--------|
| Click agent | Open life history panel |
| ⚡ Shock | Trigger a random economic event |
| 🔊 Voice | Enable AI narration (loads ~40MB model on first use) |
| Speed 1×–Max | Slow-motion to stress-test |
| Scenario picker | Switch starting conditions |

---

## Roadmap

- **v1.1** Social systems: education mobility, housing zones, inheritance
- **v1.2** Full 8-scenario library + 30+ insight triggers
- **v1.3** Tech level + automation wave
- **v1.4** A/B policy comparison mode
- **v2.0** Full 9-sprint scope
