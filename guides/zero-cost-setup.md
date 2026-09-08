# Zero-Cost Setup Guide: Local Demand Radar (`zero-cost-setup.md`)

> **Philosophy**: You do not need $300/month SaaS subscriptions to run a world-class customer demand radar. By combining free public APIs, local open-weight LLMs (Ollama), and local-first storage (SQLite + Obsidian), you can build a 100% private, zero-cost intelligence machine on your local Mac or laptop.

---

## 1. System Architecture Overview

```
[ Free Public Endpoints ]
  • Reddit Public .json / RSS
  • Hacker News Firebase API
  • GitHub REST API (5k req/hr free)
         │ (curl / fetch)
         ▼
[ Ingestion & Deduplication ]
  • SQLite (local state database, cursor tracking)
         │ (raw text)
         ▼
[ Local LLM Processing ]
  • Ollama (qwen2.5:7b-instruct or llama3.2:3b)
  • prompts/extract.md (Pain Cards)
  • prompts/score.md (8-Dim Rubric)
         │ (structured JSON)
         ▼
[ Knowledge Base & Visualization ]
  • Obsidian Vault (Markdown files + Dataview queries)
  • SQLite pain_cards & opportunity_scores tables
```

---

## 2. Step 1: Zero-Cost Signal Ingestion Sources

### 1. Reddit (No OAuth / API Key Required)
Append `.json` to any subreddit or search query URL. Always pass a unique `User-Agent` header to prevent HTTP 429 rate limits:

```bash
# Fetch the 25 newest posts from r/SaaS
curl -s -H "User-Agent: demand-radar-harvester:v1.0 (by /u/ggxx39)" \
  "https://www.reddit.com/r/SaaS/new.json?limit=25" | jq '.data.children[].data | {title, selftext, url, score}'
```

### 2. Hacker News (Official Free Firebase REST API)
Hacker News provides a completely free, lightning-fast public API:

```bash
# Get top 50 new stories
curl -s "https://hacker-news.firebaseio.com/v0/newstories.json" | jq '.[0:20]'

# Fetch specific item
curl -s "https://hacker-news.firebaseio.com/v0/item/41500000.json" | jq '{title, text, url}'
```

### 3. GitHub Issues & Discussions
Track user frustration in open-source issue trackers using a standard free personal access token (5,000 requests/hour):

```bash
curl -s -H "Authorization: Bearer YOUR_GITHUB_TOKEN" \
  "https://api.github.com/repos/docker/compose/issues?state=open&sort=comments&direction=desc&per_page=10"
```

---

## 3. Step 2: Local LLM Engine (Ollama)

1. **Install Ollama** (macOS / Linux):
   ```bash
   brew install ollama
   ollama serve &
   ```

2. **Pull the Recommended Model**:
   `qwen2.5:7b-instruct` has outstanding JSON schema compliance and bilingual proficiency:
   ```bash
   ollama pull qwen2.5:7b-instruct
   ```
   *(For low-RAM machines or MacBooks with 8GB RAM, use `llama3.2:3b`)*.

3. **Run Extraction in JSON Mode**:
   ```bash
   # Test local JSON extraction
   RAW_TEXT="I am so sick of manual docker cache busting in GitHub Actions. We wasted 15 hours last week."
   
   PROMPT_CONTENT=$(cat prompts/extract.md)
   
   curl -s http://localhost:11434/api/generate -d '{
     "model": "qwen2.5:7b-instruct",
     "prompt": "'"$PROMPT_CONTENT"'\n\nInput Post:\n'"$RAW_TEXT"'",
     "format": "json",
     "stream": false
   }' | jq -r '.response'
   ```

---

## 4. Step 3: Local SQLite Storage & Schema

Initialize a lightweight SQLite database `radar.sqlite` to record state, prevent processing duplicate posts, and store structured cards:

```sql
-- schema.sql
CREATE TABLE IF NOT EXISTS seen_signals (
  signal_id TEXT PRIMARY KEY,
  channel TEXT NOT NULL,
  seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pain_cards (
  id TEXT PRIMARY KEY,
  headline TEXT NOT NULL,
  target_role TEXT,
  friction TEXT,
  emotional_toll TEXT,
  paying_intent_signal INTEGER,
  source_url TEXT UNIQUE,
  confidence REAL,
  created_at TIMESTAMP,
  raw_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS opportunity_scores (
  id TEXT PRIMARY KEY,
  cluster_id TEXT NOT NULL,
  title TEXT NOT NULL,
  total_score REAL NOT NULL,
  is_killed INTEGER NOT NULL,
  recommendation TEXT NOT NULL,
  raw_json TEXT NOT NULL,
  evaluated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 5. Step 4: Obsidian Integration (The Visual Dashboard)

For indie developers who use [Obsidian](https://obsidian.md), you can mirror pain cards as Markdown files into an `Obsidian/Demand-Radar/` vault folder with frontmatter:

```markdown
---
id: pain-20260908-figma-tailwind-sync
type: pain-card
role: Frontend Developer
sentiment: high
paying_intent: true
confidence: 0.95
source: reddit
tags: [figma, tailwind, tokens]
---

# Manual Figma variable syncing to Tailwind CSS

> "Every single sprint, our designer updates typography scale... I spent 4 hours on Sunday evening diffing Figma variables vs CSS."

- **Scenario**: Design handoff sprint
- **Workaround**: Manual copy-paste from Slack/Notion into CSS
- **Estimated Loss**: 8h/mo
- **Source**: [Reddit Link](https://reddit.com/...)
```

### Dataview Table Query:
In Obsidian, create a `Radar-Dashboard.md` note with this query:

````markdown
```dataview
TABLE role, sentiment, paying_intent, confidence
FROM "Demand-Radar"
WHERE type = "pain-card" AND paying_intent = true
SORT confidence DESC
```
````

You now have a real-time, searchable, offline, free customer demand dashboard!
