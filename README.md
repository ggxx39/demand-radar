<div align="center">

# 📡 Demand Radar (需求雷达)

### *Stop building in the dark. Stop asking ChatGPT for "million dollar ideas".*  
**An open-source, evidence-driven customer demand intelligence system for indie hackers, solo founders, and agile product teams.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![JSON Schema: 2020-12](https://img.shields.io/badge/JSON_Schema-2020--12-blue)](schemas/)
[![Platform](https://img.shields.io/badge/Platform-Local_First_%7C_Self_Hosted-green)](guides/)
[![Methodology](https://img.shields.io/badge/Methodology-6--Step_Demand_Loop-purple)](README.md#the-6-step-methodology)
[![Language: 中文](https://img.shields.io/badge/Language-%E4%B8%AD%E6%96%87-red)](README.zh-CN.md)

[English](README.md) · [简体中文](README.zh-CN.md) · [Live Dashboard](https://demand-radar-8n8.pages.dev) · [JSON Schemas](schemas/) · [Prompts](prompts/) · [Templates](templates/) · [Guides](guides/)

</div>

---

## 🌐 Live Web Dashboard (ThreeUI Aesthetic)

Demand Radar provides a fast, dark-mode single-page application and serverless intelligence platform styled after **ThreeUI** (`https://threeui.com/browse`), deployable for free on Cloudflare Pages:

- **Live URL**: [https://demand-radar-8n8.pages.dev](https://demand-radar-8n8.pages.dev)
- **Features**:
  - 🎨 **ThreeUI Palette Switcher**: Seamless switching between `Mono`, `Azure`, `Moss`, and `Amber` colorways.
  - 📡 **Canvas HUD Radar Sweep**: Ambient background radar scanner displaying live signal blips.
  - 🕸️ **8-Dimensional Opportunity Radar**: Interactive SVG polygon measuring Pain Intensity, Frequency, Workaround Friction, Paying Intent, Recurrence, Competitive Gap, Solo Feasibility, and Distribution Accessibility.
  - 🔴 **Adversarial Hard Kill Gates**: Instant breakdown of fatal flaws for rejected ideas (e.g. Paying Intent < 5, Pain Intensity < 6).
  - 💬 **The Mom Test Interview Script & DM Outreaches**: Automated 5-stage customer discovery scripts + 1-click Reddit/GitHub cold outreach copy.
  - ⚡ **Live Signal Scanner**: Real-time signal mining from Reddit (`r/SaaS`, `r/webdev`, `r/devops`) and Hacker News (`Ask HN`) with LLM integration (AMD Radeon DeepSeek-V4-Flash / Qwen3.8-Flash or OpenAI) and built-in heuristic classifiers.

```bash
# Run local dev server with Cloudflare Pages Functions
npm run dev

# Deploy to Cloudflare Pages
npm run deploy
```

---

## 💡 Why Demand Radar?

The number one reason indie hacker projects fail is not bad code, poor UI, or slow servers — **it is building things nobody is desperate enough to pay for**.

Most developers validate ideas using the worst possible method: asking friends, posting speculative surveys, or asking an LLM *"Is this a good SaaS idea?"*. Everyone smiles politely, nods, and promises they'd buy it. Then you spend 4 months coding in isolation, launch on Product Hunt, and hear crickets.

**Demand Radar replaces speculative delusion with verifiable organic evidence.**

```
                     THE 6-STEP DEMAND RADAR LOOP
                     
  [ 1. Signal ] ────> [ 2. Pain ] ────> [ 3. Evidence ]
  Ambient listening    Structured pain   Cross-channel
  in developer hubs    cards extraction  triangulation
         │                                     │
         ▼                                     ▼
  [ 6. Build ]  <──── [ 5. Validation ] <──── [ 4. Opportunity ]
  2-week knife-edge    The Mom Test &     8-Dimension rubric &
  MVP wedge            fatal kill gates   adversarial scoring
```

---

## 🎯 The 6-Step Methodology

### 1. 🔵 Signal (信号采集)
- **What**: Continuously monitor organic developer and user conversations where people vent unfiltered frustration.
- **Channels**: Reddit (`r/devops`, `r/webdev`, `r/SaaS`), Hacker News, GitHub Issues, X/Twitter, App Store 1–3 star reviews, and Discord channels.
- **Principles**: Capture conversations where users are actively struggling with an ongoing task, not polished marketing threads.

### 2. 🟢 Pain (痛点抽取)
- **What**: Transform messy, multi-paragraph comments into atomic, machine-readable **Pain Cards** adhering to [`schemas/pain-card.schema.json`](schemas/pain-card.schema.json).
- **Core Card Dimensions**:
  - `target_audience`: Exact role, domain, and operational scale.
  - `scenario`: The specific workflow step where the failure occurs.
  - `friction`: The precise mechanism of blockage.
  - `current_workaround`: The hack, shell script, or manual duct-tape they currently use.
  - `cost_or_loss`: Quantified wasted hours, dollar loss, or emotional toll.
  - `paying_intent_clues`: Stated budget, expenditure on hacks, or explicit buying phrases.
  - `raw_quote`: Verbatim quote preserving original words without AI distortion.

### 3. 🟡 Evidence (交叉验证)
- **What**: Confirm that a pain point is not a one-off grievance by a lone complainer.
- **Triangulation**: Check if the friction recurs across 2+ distinct platforms (e.g. both Reddit and GitHub Issues).
- **Competitive Check**: Verify via tools like [Rival](https://github.com/tessak22/rival) or [competitor-monitor](https://github.com/Keerthivasan-Venkitajalam/competitor-monitor) that major incumbents haven't already solved this in their latest release.

### 4. 🟠 Opportunity (机会评分)
- **What**: Cluster related pain cards and evaluate commercial viability using our standardized 8-dimensional scoring engine ([`schemas/opportunity-score.schema.json`](schemas/opportunity-score.schema.json) & [`prompts/score.md`](prompts/score.md)).
- **The 8 Dimensions**:
  1. **Pain Intensity** (0.15) — Severity of the blocker (Vitamin vs. Painkiller).
  2. **Frequency** (0.08) — How often it occurs (Daily vs. Annual).
  3. **Workaround Friction** (0.15) — Inefficiency of existing hacks.
  4. **Paying Intent** (0.20) — Verifiable commercial budget or spend.
  5. **Cross-Source Recurrence** (0.07) — Volume and multi-source presence.
  6. **Competitive Gap** (0.10) — Whitespace neglected by incumbent giants.
  7. **Solo Feasibility** (0.10) — Can 1 developer build an MVP in 1–3 weeks?
  8. **Distribution Accessibility** (0.15) — Can target buyers be reached cheaply?
- **Fatal Kill Gates**: Automatically kill ideas where Pain $< 6$, Paying Intent $< 5$, Feasibility $< 4$, or Distribution $< 4$.

### 5. 🔴 Validation (用户验证)
- **What**: Human-to-human verification before writing production code.
- **The Mom Test**: Conduct 5 to 10 discovery calls using [`templates/mom-test-questions.md`](templates/mom-test-questions.md) — digging into past behavior rather than pitching futures.
- **Pre-Code Smoke Test**: Launch a 48-hour landing page or GitHub README with a concrete call-to-action (pre-order, pilot deposit, or beta install).
- **Anti-Delusion Audit**: Review [`templates/kill-criteria.md`](templates/kill-criteria.md) to kill false needs early.

### 6. 🚀 Build (靶向交付)
- **What**: Ship a knife-edge MVP wedge in under 10 days targeting the single most agonizing bottleneck.
- **Scope Fence**: No bloated multi-tenant dashboards or complex billing tiers in v0.1. A single CLI, GitHub Action, or focused utility that solves the problem completely.

---

## 🗂 Repository Structure

```text
demand-radar/
├── schemas/                            # JSON Schemas (Draft 2020-12)
│   ├── pain-card.schema.json           # Standard schema for extracted pain cards
│   └── opportunity-score.schema.json   # Standard schema for 8-dim opportunity scores
│
├── prompts/                            # Production LLM prompts (Ollama/Claude/GPT)
│   ├── extract.md                      # Raw discussion -> structured Pain Card
│   ├── cluster.md                      # Semantic clustering of cards into opportunities
│   └── score.md                        # Adversarial 8-dimensional scoring
│
├── templates/                          # Actionable founder templates
│   ├── mom-test-questions.md           # The Mom Test discovery question bank & script
│   ├── opportunity-brief.md            # 1-page opportunity memo format
│   └── kill-criteria.md                # 10 fatal red flags & anti-delusion checklist
│
├── guides/                             # Practical implementation guides
│   ├── tool-stack.md                   # Curated open-source ecosystem (20+ projects)
│   ├── zero-cost-setup.md              # Zero-cost local setup (Ollama + SQLite + Obsidian)
│   └── self-hosted-radar.md            # Self-hosted VPS + n8n + Telegram/Slack alerts
│
├── examples/                           # Concrete, desensitized real-world samples
│   ├── sample-pain-cards/
│   │   ├── pain-b2b-saas.json          # Multi-tenant DB migration drift
│   │   ├── pain-dev-tools.json         # GitHub Actions Docker cache invalidation
│   │   └── pain-consumer-prosumer.json # Creator audio loudness & LUFS mismatch
│   ├── sample-opportunity-scores/
│   │   ├── opp-score-ci-docker-cache.json  # High-scoring candidate (82.6/100)
│   │   └── opp-score-creator-audio.json    # Borderline candidate (57.5/100)
│   └── sample-opportunity-briefs/
│       └── brief-docker-cache-guardian.md  # 1-page opportunity brief example
│
├── scripts/
│   └── validate.js                     # Zero-dependency schema & example validation runner
├── package.json
└── LICENSE                             # MIT License
```

---

## 🛠 Recommended Open-Source Tool Stack

No single tool covers the entire loop yet, but you can assemble an ultra-effective stack using these open-source projects (see detailed breakdown in [`guides/tool-stack.md`](guides/tool-stack.md)):

| Phase | Recommended Tool | License | Highlights |
| :--- | :--- | :---: | :--- |
| **Signal Ingestion** | **[Harken](https://github.com/VladUZH/harken)** | MIT | Multi-source, zero-config local SQLite ambient listener. |
| **Targeted Query** | **[reddit-research-mcp](https://github.com/dialog-tools/reddit-research-mcp)** | MIT | MCP server connecting Claude Code & Cursor to 20,000+ subreddits. |
| **Pain Extraction** | **[pain-discovery](https://github.com/albertorsesc/pain-discovery)** | Open | Cron + Ollama local model + cursor tracking (85% pipeline coverage). |
| **Adversarial Check** | **[crowdmind](https://github.com/yasintoy/crowdmind)** | MIT | 4-persona AI adversarial stress test (Skeptic, Buyer, Frugal Dev, Superuser). |
| **Competitor Watch** | **[Rival](https://github.com/tessak22/rival)** | MIT | Next.js dashboard tracking competitor pricing and changelogs. |
| **Human Validation** | **Demand Radar Templates** | MIT | Mom Test script + Kill criteria checklist. |

---

## ⚡ Quickstart

### Option A: Zero-Cost Local Machine (Recommended for Solo Hackers)
1. Install [Ollama](https://ollama.ai) and pull `qwen2.5:7b-instruct`:
   ```bash
   brew install ollama
   ollama pull qwen2.5:7b-instruct
   ```
2. Clone this repository:
   ```bash
   git clone https://github.com/ggxx39/demand-radar.git
   cd demand-radar
   ```
3. Run the schema validation suite:
   ```bash
   npm test
   ```
4. Follow [`guides/zero-cost-setup.md`](guides/zero-cost-setup.md) to set up your free Reddit/HN ingestors and Obsidian dashboard.

### Option B: 24/7 Cloud Daemon on a $5 VPS
Follow [`guides/self-hosted-radar.md`](guides/self-hosted-radar.md) to launch a Docker Compose setup running cron jobs and instant Telegram/Slack alerts for opportunities scoring $\ge 75$.

---

## 🤝 Contributing

Contributions are welcome! You can contribute by:
- Submitting anonymized, high-quality **Pain Cards** to `examples/sample-pain-cards/`.
- Enhancing prompt edge-case detection in `prompts/`.
- Adding new open-source connectors to `guides/tool-stack.md`.

Please ensure all added JSON files pass validation before opening a PR:
```bash
npm run validate
```

---

## 📄 License

MIT License. Copyright (c) 2026 [ggxx39](https://github.com/ggxx39). Free for personal, open-source, and commercial research.
