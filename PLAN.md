# ECONSIM — Full Economy Simulator Design Document

## Vision

A browser-based particle economy simulator where players discover **why economics is complicated** by applying "obvious" solutions and watching them fail in unexpected ways. The game teaches through **emergent behavior**, not lectures — every lesson is something the player discovers by breaking things.

The core loop: **Observe → Intervene → Watch Consequences → Understand Trade-offs**

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    ECONSIM ENGINE                        │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │  AGENTS  │──│ MARKETS  │──│  FIRMS   │              │
│  │  Module  │  │  Module  │  │  Module  │              │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘              │
│       │              │              │                    │
│  ┌────┴─────┐  ┌────┴─────┐  ┌────┴─────┐              │
│  │  NEEDS   │  │  PRICES  │  │  LABOR   │              │
│  │  System  │  │  System  │  │  Market  │              │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘              │
│       │              │              │                    │
│  ┌────┴──────────────┴──────────────┴─────┐             │
│  │          POLICY ENGINE                  │             │
│  │  (Player interventions modify params)   │             │
│  └────────────────┬───────────────────────┘             │
│                   │                                      │
│  ┌────────────────┴───────────────────────┐             │
│  │         METRICS & ANALYTICS            │             │
│  │  Gini, GDP, CPI, Unemployment, etc.    │             │
│  └────────────────────────────────────────┘             │
│                                                         │
│  ┌────────────────────────────────────────┐             │
│  │         SCENARIO / EVENT ENGINE        │             │
│  │  Shocks, disasters, tech booms, etc.   │             │
│  └────────────────────────────────────────┘             │
└─────────────────────────────────────────────────────────┘
```

**Tech Stack**: React + HTML5 Canvas (rendering) + Web Workers (simulation offload)
**Target**: 200-400 agents at 60fps, fully client-side, deployable to GitHub Pages

---

## Phase 1: Core Agent System (CURRENT — Mostly Done)

### 1.1 Agent Lifecycle
- [x] Birth, aging, death (lifespan 55-90 years)
- [x] Child → Working age → Retirement
- [x] Reproduction with inherited traits
- [ ] **Education phase** (age 5-18): skill development influenced by family wealth
- [ ] **Health system**: illness probability, healthcare access affects lifespan
- [ ] **Inheritance**: wealth transfer on death to children (if any)
- [ ] **Migration**: agents can "leave" (despawn) if conditions are terrible, "arrive" if conditions are good

### 1.2 Agent Properties (Expanded)
```
Agent {
  // Identity
  id, generation, parentId

  // Demographics
  age, lifespan, alive, gender
  educationLevel: 0-4 (none, basic, trade, college, advanced)
  healthScore: 0-1

  // Economics
  wealth, income (per tick), debt
  savings (separate from liquid wealth)
  consumptionNeeds: { food, housing, healthcare, education, luxury }

  // Labor
  skill: 0-1 (base talent)
  training: 0-1 (learned skill from education + experience)
  effectiveProductivity: f(skill, training, health, age, morale)
  employed, businessId, jobSearchCooldown
  yearsExperience
  sector: "agriculture" | "manufacturing" | "services" | "tech"

  // Social
  morale: 0-1
  socialClass: computed from wealth percentile
  networkStrength: connections to other agents
  politicalLeaning: -1 to 1 (not displayed, affects policy response)

  // Spatial
  x, y, vx, vy
  housingQuality: 0-1
  neighborhood: computed from position
}
```

### 1.3 Agent Behavior Tree
```
EVERY TICK:
  1. Age + health update
  2. Consume (food, housing, etc.) — deduct costs
  3. If employed → produce → earn wage
  4. If unemployed + working age → job search
  5. If enough capital → consider starting business
  6. If fertile age + stable → consider reproduction
  7. Spend discretionary income (luxury goods → feeds businesses)
  8. Save remainder (or go into debt)
  9. Social interactions with nearby agents
  10. Movement (toward work, away from poverty zones, etc.)
```

---

## Phase 2: Market System

### 2.1 Goods & Services (4 Sectors)
The economy produces and consumes goods across sectors:

| Sector | Produces | Needed By | Notes |
|--------|----------|-----------|-------|
| **Agriculture** | Food | Everyone (mandatory) | Low skill, low margin, essential |
| **Manufacturing** | Goods | Everyone (variable) | Medium skill, economies of scale |
| **Services** | Housing, Healthcare, Education | Everyone (variable) | High labor intensity |
| **Technology** | Productivity boosts | Businesses | High skill, winner-take-all |

### 2.2 Price Discovery
Prices emerge from supply and demand, NOT set by the simulator:

```
For each good:
  supply = total production by businesses in that sector
  demand = total consumption desire by agents
  
  priceChange = (demand - supply) / supply × elasticity
  price = previousPrice × (1 + priceChange)
  
  Elasticity varies:
    Food: 0.2 (inelastic — people must eat)
    Housing: 0.3
    Healthcare: 0.25
    Luxury: 1.5 (elastic — people cut luxuries first)
    Tech: 0.8
```

### 2.3 Money Supply & Banking (Simplified)
```
CentralBank {
  interestRate: 0-0.20
  moneySupply: total currency in circulation
  reserveRequirement: 0.1-0.5
  
  // Money creation: when businesses take loans, money is created
  // Money destruction: when loans are repaid
  
  inflation = moneySupply growth rate - GDP growth rate
  CPI = weighted basket of goods prices
}
```

Banks aren't individual entities but a system:
- Agents with savings earn interest
- Businesses can borrow to expand (creates money)
- Interest rate affects borrowing appetite
- Player can adjust interest rate as a policy lever

---

## Phase 3: Business System (Expanded)

### 3.1 Business Properties
```
Business {
  id, ownerId, sector
  x, y (physical location)
  
  // Operations
  employees: [agentId]
  capital: money reserves
  equipment: 0-1 (productivity multiplier, degrades)
  inventory: unsold goods
  
  // Market
  priceMarkup: multiplier on base cost
  marketShare: fraction of sector
  brandValue: 0-1 (customer loyalty)
  
  // Strategy (emergent)
  wageRate: what fraction of revenue goes to wages
  reinvestmentRate: fraction of profit reinvested
  
  // Status
  age, monopolyPower, debt
  isMonopoly: marketShare > 0.5
  isCartel: coordinating prices with similar businesses
}
```

### 3.2 Business Behaviors
```
EVERY TICK:
  1. Produce goods (based on employees × productivity × equipment)
  2. Set prices (cost + markup, influenced by competition)
  3. Sell goods (demand allocated by price competitiveness + brand)
  4. Pay employees
  5. Pay overhead (rent, equipment depreciation)
  6. Calculate profit
  7. Decision: hire/fire based on demand forecast
  8. Decision: invest in equipment or hoard cash
  9. Decision: adjust prices (undercut competitors or raise if monopoly)
  10. Decision: attempt merger if deregulated
```

### 3.3 Emergent Business Dynamics
These aren't coded as rules — they emerge from the system:

**Monopoly Formation** (when deregulated):
- Bigger firms have lower per-unit costs (economies of scale)
- Can temporarily lower prices to bankrupt competitors
- Then raise prices once competition is gone
- Employees have nowhere else to go → wages drop

**Cartel Behavior**:
- When few businesses remain in a sector, they implicitly coordinate
- All keep prices high (no incentive to undercut when you're 1 of 3)
- New entrants face barriers (established brand, scale disadvantage)

**Zombie Firms** (when bailed out):
- Unprofitable firms kept alive by bailouts
- Absorb workers who could be more productive elsewhere
- Drag down sector efficiency

**Creative Destruction** (natural cycle):
- Old businesses with outdated equipment fail
- Workers are temporarily unemployed
- New businesses form with better tech
- Short-term pain, long-term gain
- UNLESS you protect all jobs (then stagnation)

---

## Phase 4: Labor Market

### 4.1 Job Search Model
```
Unemployed agent job search:
  1. Scan nearby businesses (spatial proximity matters)
  2. Filter by sector match (agriculture worker can't do tech immediately)
  3. Apply (probability based on skill match)
  4. Business evaluates: productivity vs. wage cost
  5. If hired: relocation toward business, desperation drops
  6. If rejected: desperation rises, willing to accept lower wage
  
  After N months unemployed:
    - Skills begin degrading (use-it-or-lose-it)
    - Health drops (stress, poverty)
    - May accept any sector at lower wage
    - Children's education suffers (family stress)
```

### 4.2 Wage Determination
```
wage = baseProductivity × sectorDemand × (1 - unemployment) × (1 + experience × 0.02)

Modifiers:
  - Deregulated: wages can drop to survival minimum
  - Union (potential policy): wage floor, but hiring slows
  - Meritocracy: skill multiplier amplified, luck factor removed
  - Minimum wage (potential policy): floor, but cuts low-skill jobs
```

### 4.3 Unemployment Types (All Emergent)
- **Frictional**: between jobs, short-term, natural
- **Structural**: skills don't match available jobs (e.g., manufacturing workers when only tech jobs exist)
- **Cyclical**: businesses contracting due to low demand
- **Technological**: automation replaces workers (Phase 6 feature)

---

## Phase 5: Social Systems

### 5.1 Education
```
EducationSystem {
  publicSchoolQuality: 0-1 (funded by taxes)
  privateSchoolAvailable: boolean (costs wealth)
  
  Effect on agents:
    - Children aged 5-18 gain skill based on school quality
    - Family wealth → private school → higher skill
    - Creates: intergenerational inequality
    - Without public education: only rich kids develop skills
}
```

### 5.2 Healthcare
```
HealthcareSystem {
  publicHealthQuality: 0-1 (funded by taxes)
  privateCareAvailable: boolean
  
  Effect on agents:
    - Health decays naturally with age
    - Poor health → lower productivity → lower income → less healthcare → spiral
    - Without healthcare: poor die younger, can't work as long
    - Creates: poverty trap through health
}
```

### 5.3 Housing Market
```
HousingSystem {
  zones: [{ x, y, quality, price }]  // emerge from agent clustering
  
  Dynamics:
    - Wealthy agents cluster → neighborhood quality rises → prices rise
    - Poor agents pushed to edges → long commute → lower effective wage
    - Gentrification: businesses move to cheap area → workers follow → prices rise → poor displaced
    - Creates: spatial inequality, commute costs, segregation
}
```

### 5.4 Social Mobility Score
```
mobility = correlation(parent.wealth, child.wealth)
  0 = no correlation (perfect mobility)
  1 = perfect correlation (caste system)
  
Factors that reduce mobility:
  - Inherited wealth (strong)
  - Education quality tied to wealth (strong)
  - Neighborhood effects (medium)
  - Inherited skill (weak but real)
  - Network effects (who you know)
```

### 5.5 Social Unrest
```
unrest = f(gini, unemployment, povertyRate, inflationRate, mobilityScore)

When unrest > threshold:
  - Productivity drops (protests, strikes)
  - Businesses lose value
  - Some agents "leave" (emigration)
  - Visible on canvas: agents move erratically, red zones appear
```

---

## Phase 6: Technology & Progress

### 6.1 Innovation System
```
TechLevel {
  agriculture: 1.0+     // yield per worker
  manufacturing: 1.0+   // output per worker
  services: 1.0+        // capacity per worker
  automation: 0-1        // fraction of jobs automatable
}

Innovation rate = f(
  numTechBusinesses,
  educationLevel of workforce,
  R&D investment,
  randomBreakthroughs
)
```

### 6.2 Automation Wave (Mid-Game Event)
```
When automation > threshold:
  - Manufacturing jobs start disappearing
  - Remaining workers are more productive
  - Business profits surge (fewer wages, same output)
  - Mass unemployment in low-skill sectors
  - Tech sector booms
  - Creates: the "robots taking jobs" scenario
  
Player must respond:
  - Retrain workers? (slow, expensive)
  - UBI? (inflation risk)
  - Tax automation? (slows progress)
  - Do nothing? (social unrest)
```

### 6.3 Productivity Paradox
- More tech → more output → prices drop → deflation risk
- But also: more tech → fewer jobs → less spending → recession
- Shows why "just automate everything" isn't simple

---

## Phase 7: Policy Engine (Player Controls)

### 7.1 Fiscal Policies
| Policy | Parameters | Immediate Effect | Side Effects |
|--------|-----------|-----------------|--------------|
| **Income Tax** | rate: 0-60% | Revenue from workers | Reduces work incentive at high rates |
| **Corporate Tax** | rate: 0-40% | Revenue from businesses | Reduces investment, businesses relocate |
| **Wealth Tax** | rate: 0-10%, threshold | Reduces inequality | Capital flight, less business formation |
| **Sales Tax/VAT** | rate: 0-25% | Revenue from consumption | Regressive (hurts poor more), reduces spending |
| **Estate Tax** | rate: 0-80% | Reduces inherited inequality | Families break up wealth pre-death |
| **Tariffs** | rate per sector | Protects domestic industry | Higher prices for consumers |

### 7.2 Monetary Policies
| Policy | Parameters | Immediate Effect | Side Effects |
|--------|-----------|-----------------|--------------|
| **Interest Rate** | 0-20% | Controls borrowing | Too low → bubbles, too high → recession |
| **Print Money / QE** | amount | Stimulates spending | Inflation, Cantillon effect |
| **Reserve Requirements** | ratio | Controls bank lending | Too tight → credit crunch |

### 7.3 Regulatory Policies
| Policy | Parameters | Immediate Effect | Side Effects |
|--------|-----------|-----------------|--------------|
| **Minimum Wage** | amount | Wage floor | Unemployment for low-skill workers |
| **Maximum Work Hours** | hours/tick | Worker wellbeing | Reduced output, businesses need more workers |
| **Anti-Monopoly** | on/off | Break up large firms | Short-term disruption, long-term competition |
| **Price Controls** | ceiling per good | Affordability | Shortages, black markets, business closures |
| **Rent Control** | ceiling | Affordable housing | Reduced housing investment, deterioration |
| **Environmental Regs** | strictness | Long-term health | Short-term business costs |
| **Banking Regulation** | strictness | Prevent bubbles | Slower growth |
| **Labor Protection** | strictness | Job security | Hiring freeze, rigidity |

### 7.4 Social Policies
| Policy | Parameters | Immediate Effect | Side Effects |
|--------|-----------|-----------------|--------------|
| **UBI** | amount/month | Poverty floor | Inflation, work disincentive debate |
| **Unemployment Benefits** | amount, duration | Safety net | Moral hazard (stay unemployed longer?) |
| **Public Education** | funding level | Skill development | Expensive, slow ROI (generation-long) |
| **Public Healthcare** | funding level | Health improvement | Expensive, reduces mortality |
| **Public Housing** | units built | Shelter for poor | Expensive, can concentrate poverty |
| **Job Training Programs** | funding | Reskill workers | Slow, not always effective |
| **Child Benefits** | amount | Support families | Population growth, costs |

### 7.5 Policy Funding
Every policy costs money. Revenue comes from taxes.
```
budget = taxRevenue - policySpending
if deficit → borrow (increases national debt, future interest payments)
if debt too high → credit rating drops → borrowing costs rise → austerity trap
```

---

## Phase 8: Scenarios & Events

### 8.1 Scenario Mode
Pre-built starting conditions that teach specific lessons:

**Scenario 1: "The Free Market Utopia"**
- Start: No regulations, no taxes, no social programs
- Watch: Monopolies form, inequality explodes, poverty trap
- Lesson: Markets need rules to function fairly

**Scenario 2: "The Planned Economy"**
- Start: Full price controls, job protection, heavy regulation
- Watch: Shortages, no innovation, brain drain
- Lesson: Over-control kills dynamism

**Scenario 3: "The Resource Curse"**
- Start: One dominant sector (agriculture) generates all wealth
- Watch: Dutch disease, volatility, no diversification
- Lesson: Monocultures are fragile

**Scenario 4: "The Aging Society"**
- Start: Low birth rate, aging population
- Watch: Too few workers, pension crisis, dependency ratio collapse
- Lesson: Demographics are destiny

**Scenario 5: "The Tech Disruption"**
- Start: Stable economy, then automation wave hits
- Watch: Mass unemployment, inequality spike, social unrest
- Lesson: Progress creates winners and losers simultaneously

**Scenario 6: "The Debt Spiral"**
- Start: Government has been borrowing heavily for decades
- Watch: Interest payments consume budget, austerity vs. default
- Lesson: Short-term borrowing has long-term costs

**Scenario 7: "Post-War Rebuild"**
- Start: Few businesses, damaged infrastructure, high unemployment
- Watch: How different approaches rebuild differently
- Lesson: Same starting point, radically different outcomes based on policy

**Scenario 8: "The Inequality Machine"**
- Start: Moderate economy, but education is privatized
- Watch: Rich kids get educated → get good jobs → their kids too. Poor locked out.
- Lesson: Intergenerational inequality is self-reinforcing

### 8.2 Random Events (Shocks)
Events that periodically disrupt the simulation:

```
Events = [
  {
    name: "Pandemic",
    effect: "Health drops, businesses close, remote-capable survive",
    frequency: "Rare",
    teaches: "Interconnectedness, unequal impact by class"
  },
  {
    name: "Natural Disaster",
    effect: "Destroys businesses/housing in one area",
    frequency: "Occasional",
    teaches: "Geographic inequality, insurance, rebuilding costs"
  },
  {
    name: "Tech Breakthrough",
    effect: "One sector suddenly 2x productive",
    frequency: "Occasional",
    teaches: "Creative destruction, transition costs"
  },
  {
    name: "Financial Bubble",
    effect: "Asset prices inflate then crash",
    frequency: "Cyclical (if unregulated)",
    teaches: "Boom-bust cycles, systemic risk"
  },
  {
    name: "Trade Deal (immigration wave)",
    effect: "New agents arrive with varied skills",
    frequency: "Player-triggered or random",
    teaches: "Immigration economics, labor competition, cultural tension"
  },
  {
    name: "Crop Failure / Supply Shock",
    effect: "Food prices spike, poor suffer most",
    frequency: "Occasional",
    teaches: "Inelastic demand, vulnerability of the poor"
  },
  {
    name: "War Draft",
    effect: "Working-age agents removed, production drops",
    frequency: "Rare",
    teaches: "Economic cost of conflict"
  },
  {
    name: "Corruption Scandal",
    effect: "Tax revenue disappears, trust drops, unrest rises",
    frequency: "More likely with concentrated power",
    teaches: "Institutional integrity matters"
  }
]
```

---

## Phase 9: Visualization & UX

### 9.1 Canvas Rendering Layers
```
Layer 0: Background grid + zone heatmap (wealth density)
Layer 1: Housing zones / neighborhoods (colored regions)
Layer 2: Business zones (radial gradients)
Layer 3: Employment connections (thin lines)
Layer 4: Agents (particles with shape/color encoding)
Layer 5: Effects (death particles, birth sparkles, unrest waves)
Layer 6: Overlay (inflation haze, recession grey, bubble shimmer)
Layer 7: UI overlay (tooltips on hover)
```

### 9.2 Agent Visual Encoding
```
Shape:
  ● Circle = Working-age adult
  ● Small circle = Child
  ■ Square = Retired
  ◆ Diamond = Business owner
  ☆ Star = Innovator/Tech leader

Color (wealth spectrum):
  Deep red → Orange → Blue → Cyan → Gold

Size:
  Radius scales with wealth (min 2px, max 14px)

Border:
  Solid white = Employed
  Dashed red = Unemployed (seeking work)
  Dashed grey = Discouraged (gave up)
  Glowing = Recently promoted / life event

Animation:
  Pulse red = In poverty
  Pulse gold = Wealthy + growing
  Fade in = Newborn
  Shrink + fade = Dying
  Erratic movement = Unrest
```

### 9.3 Dashboard Panels
```
┌──────────────────────────────────────────────────┐
│  CANVAS (main simulation view)                   │
├──────────┬──────────┬──────────┬────────────────┤
│ DEMOGR.  │ INEQUAL. │ LABOR    │ ECONOMY        │
│ Pop      │ Gini     │ Unemp%   │ GDP            │
│ Births   │ Top10%   │ Workers  │ CPI/Inflation  │
│ Deaths   │ Mobility │ Sectors  │ Debt/Deficit   │
│ Avg Age  │ Poverty  │ Biz #    │ Trade Balance  │
│ [chart]  │ [chart]  │ [chart]  │ [chart]        │
├──────────┴──────────┴──────────┴────────────────┤
│  WEALTH DISTRIBUTION HISTOGRAM (live updating)   │
│  ████▓▓▒▒░░░  ← shows shape of distribution     │
└──────────────────────────────────────────────────┘
```

### 9.4 Interaction Modes
```
OBSERVE MODE (default):
  - Hover agent → tooltip with name, age, wealth, job, health
  - Click agent → follow mode (camera tracks, shows life history)
  - Hover business → employee count, revenue, sector

POLICY MODE (right panel):
  - Toggle switches for each policy
  - Sliders for policy parameters
  - Budget display (revenue vs spending)
  - Warning indicators when budget is negative

ANALYTICS MODE (expandable bottom panel):
  - Full-screen charts
  - Wealth distribution histogram
  - Sector breakdown pie chart
  - Historical comparison (before/after policy)
  - Lorenz curve

SCENARIO MODE (overlay):
  - Choose starting scenario
  - Objectives displayed (reduce poverty below X, grow GDP by Y)
  - Score/grade at end
```

---

## Phase 10: Educational Layer

### 10.1 Insight System
When the simulation reaches certain states, insights pop up:

```
Insights = [
  {
    trigger: gini > 0.6 && policy("deregulate"),
    title: "Monopoly Alert",
    text: "Without regulation, businesses naturally consolidate...",
    realWorld: "This mirrors the Gilded Age (1870s-1900s)..."
  },
  {
    trigger: inflation > 3 && policy("printmoney"),
    title: "Hyperinflation Risk",
    text: "More money chasing the same goods...",
    realWorld: "Zimbabwe 2008, Weimar Germany 1923..."
  },
  {
    trigger: unemployment > 0.3 && policy("pricecontrol"),
    title: "Price Signal Failure",
    text: "Businesses can't profit → can't hire...",
    realWorld: "Soviet bread lines, Venezuelan shortages..."
  },
  {
    trigger: mobility < 0.2 && policy("meritocracy"),
    title: "Meritocracy Paradox",
    text: "When 'merit' includes inherited advantages...",
    realWorld: "Studies show zip code predicts income better than talent..."
  },
  // ... 30+ more insights
]
```

### 10.2 Comparison Mode
After running a scenario, player can:
- Reset and try different policies
- See side-by-side comparison of outcomes
- Understand that there's no "right answer" — only trade-offs

### 10.3 "What Would You Do?" Challenges
- Present a real-world economic crisis (simplified)
- Player applies policies to their simulation
- Compare outcome with what actually happened historically
- Not about being "right" — about understanding the complexity

---

## Implementation Phases & Priority

### Sprint 1 (Current): Foundation ✅
- [x] Agent particles with movement
- [x] Basic business system
- [x] Birth, aging, death
- [x] Employment/unemployment
- [x] 8 policy toggles
- [x] Core metrics dashboard
- [x] Sparkline charts

### Sprint 2: Economic Realism
- [ ] Multi-sector economy (agriculture, manufacturing, services, tech)
- [ ] Emergent price system (supply/demand)
- [ ] Agent consumption needs (food, housing, healthcare)
- [ ] Business competition (pricing, market share)
- [ ] Debt system (agents and businesses can borrow)
- [ ] Fix: policy budget (taxes must fund spending)
- [ ] Savings vs spending behavior

### Sprint 3: Social Systems
- [ ] Education system (public/private, affects child skill development)
- [ ] Healthcare system (affects lifespan, productivity)
- [ ] Housing zones (spatial inequality)
- [ ] Inheritance on death
- [ ] Social mobility tracking (parent-child wealth correlation)
- [ ] Social unrest meter
- [ ] Migration (in/out based on conditions)

### Sprint 4: Advanced Policies
- [ ] Full tax system (income, corporate, wealth, sales, estate)
- [ ] Interest rate control
- [ ] Budget/deficit/debt tracking
- [ ] Minimum wage
- [ ] Anti-monopoly enforcement
- [ ] Unemployment benefits (with duration)
- [ ] Public services funding sliders
- [ ] Policy interaction effects

### Sprint 5: Events & Scenarios
- [ ] Random event system
- [ ] 8 pre-built scenarios with objectives
- [ ] Pandemic event
- [ ] Tech disruption / automation wave
- [ ] Financial bubble cycle
- [ ] Natural disaster
- [ ] Event notification system

### Sprint 6: Technology & Progress
- [ ] Tech level per sector
- [ ] Innovation from tech businesses
- [ ] Automation replacing jobs
- [ ] Productivity growth over time
- [ ] Creative destruction cycles

### Sprint 7: Visualization Polish
- [ ] Wealth distribution histogram
- [ ] Lorenz curve
- [ ] Agent hover tooltips
- [ ] Click-to-follow agent
- [ ] Neighborhood heatmap
- [ ] Death/birth particle effects
- [ ] Sector breakdown charts
- [ ] Comparison mode (A/B policy testing)

### Sprint 8: Educational Layer
- [ ] Insight popup system (30+ triggers)
- [ ] Real-world parallels for each insight
- [ ] "What Would You Do?" challenges
- [ ] Score/grade system for scenarios
- [ ] Glossary of economic terms
- [ ] Tutorial walkthrough

### Sprint 9: Performance & Polish
- [ ] Move simulation to Web Worker (off main thread)
- [ ] Spatial hash grid for O(1) neighbor lookups
- [ ] Object pooling for agents (avoid GC)
- [ ] Canvas rendering optimization (dirty rects)
- [ ] Mobile responsive layout
- [ ] Touch controls for mobile
- [ ] Save/load simulation state (localStorage)
- [ ] Share scenario results (URL encoding)

---

## Technical Architecture Detail

### State Management
```
SimulationState {
  agents: Agent[]           // mutable array, indexed by ID
  businesses: Business[]    // mutable array
  markets: {
    [sector]: { supply, demand, price, history }
  }
  centralBank: { interestRate, moneySupply, reserves }
  government: { budget, debt, taxRevenue, spending, policies }
  tech: { [sector]: level }
  events: Event[]           // active events
  metrics: MetricsSnapshot  // computed each tick
  tick: number
  year: number              // tick / TICKS_PER_YEAR
}
```

### Performance Targets
```
200 agents: 60fps on mid-range laptop (MUST)
400 agents: 60fps on desktop (SHOULD)
600 agents: 30fps acceptable (NICE TO HAVE)

Bottlenecks to watch:
  - Agent-agent interactions (O(n²) → use spatial hash)
  - Business employee iteration (keep arrays small)
  - Canvas draw calls (batch by type)
  - Price calculation (cache per tick)
```

### Web Worker Architecture
```
Main Thread:
  - React UI
  - Canvas rendering
  - User input handling
  - Receives state snapshots from worker

Worker Thread:
  - Full simulation loop
  - All agent/business/market logic
  - Sends state snapshot every N ticks
  - Receives policy changes from main thread

Message Protocol:
  Main → Worker: { type: "SET_POLICY", policy, value }
  Main → Worker: { type: "SET_SPEED", speed }
  Main → Worker: { type: "RESET" }
  Worker → Main: { type: "STATE_UPDATE", agents, businesses, metrics }
  Worker → Main: { type: "EVENT", event }
```

### File Structure
```
econsim/
├── public/
│   └── index.html
├── src/
│   ├── App.jsx                    # Root component
│   ├── components/
│   │   ├── Canvas.jsx             # Rendering layer
│   │   ├── Dashboard.jsx          # Metrics panels
│   │   ├── PolicyPanel.jsx        # Policy controls
│   │   ├── ScenarioSelect.jsx     # Scenario picker
│   │   ├── InsightPopup.jsx       # Educational popups
│   │   ├── AgentTooltip.jsx       # Hover info
│   │   ├── WealthHistogram.jsx    # Distribution chart
│   │   └── Header.jsx             # Controls bar
│   ├── simulation/
│   │   ├── engine.js              # Main simulation loop
│   │   ├── agent.js               # Agent creation & behavior
│   │   ├── business.js            # Business logic
│   │   ├── market.js              # Price system
│   │   ├── labor.js               # Job market
│   │   ├── policy.js              # Policy effects
│   │   ├── events.js              # Random events
│   │   ├── metrics.js             # Metric computation
│   │   └── spatial.js             # Spatial hash grid
│   ├── data/
│   │   ├── policies.js            # Policy definitions
│   │   ├── scenarios.js           # Scenario configs
│   │   ├── insights.js            # Educational content
│   │   └── events.js              # Event definitions
│   ├── rendering/
│   │   ├── agentRenderer.js       # Draw agents
│   │   ├── businessRenderer.js    # Draw businesses
│   │   ├── effectRenderer.js      # Particles, overlays
│   │   └── colors.js              # Color utilities
│   ├── workers/
│   │   └── simWorker.js           # Web Worker entry
│   └── utils/
│       ├── math.js                # Gini, lerp, etc.
│       └── constants.js           # All magic numbers
├── package.json
└── vite.config.js
```

---

## Key Design Principles

### 1. Emergence Over Rules
Don't code "monopolies are bad." Code the mechanics that CAUSE monopolies (economies of scale, barriers to entry, network effects) and let them emerge. The player discovers the problem themselves.

### 2. Every Policy Has a Cost
No free lunches. UBI costs money. Where does it come from? Taxes. What do taxes do? Reduce investment. What does that do? Fewer jobs. The chain of consequences is always visible.

### 3. Time Horizons Matter
Some policies look great for 5 years and terrible for 50 (debt-funded spending). Others look terrible for 5 years and great for 50 (education investment). The simulation runs long enough to show both.

### 4. Fairness ≠ Equality ≠ Justice
The simulation shows that equal treatment (meritocracy) can produce unequal outcomes (inherited advantage). Equal outcomes (forced redistribution) can produce unfair incentives. There is no single "correct" answer.

### 5. Scale Changes Everything
What works for 10 people doesn't work for 10,000. The simulation should demonstrate that intuitions from small groups fail at macro scale.

### 6. The Seen and the Unseen
Frédéric Bastiat's principle: every policy has visible benefits and invisible costs. The simulation makes the invisible visible by tracking all second and third-order effects.

---

## Success Metrics for the Game

The game succeeds if players come away understanding:
1. **There are no simple solutions** to economic problems
2. **Every policy has trade-offs** — the question is which trade-offs you accept
3. **Intentions ≠ outcomes** — good intentions can cause harm
4. **Systems are interconnected** — pulling one lever moves many others
5. **Time horizons matter** — short-term fixes can create long-term problems
6. **Inequality has multiple causes** — skill, luck, inheritance, policy, geography
7. **Markets and governments both fail** — the question is how to balance them
8. **People aren't particles** — but even simple agents produce bewildering complexity