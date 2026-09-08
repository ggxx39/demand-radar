# Self-Hosted Demand Radar: VPS, n8n & Instant Alerts (`self-hosted-radar.md`)

> **Objective**: Deploy an automated, 24/7 cloud Demand Radar daemon on a low-cost VPS ($4–$6/month on Hetzner or DigitalOcean, or free on Oracle Cloud Free Tier) that monitors target communities, extracts pain points, scores opportunities, and pings your Telegram or Slack when a high-potential opportunity is detected.

---

## 1. System Architecture

```
                 [ 24/7 VPS Server ]
 ┌────────────────────────────────────────────────────────┐
 │                                                        │
 │   ┌─────────────────┐        ┌─────────────────────┐   │
 │   │  Cron / Timers  │ ─────> │ Ingestion Harvester │   │
 │   └─────────────────┘        └──────────┬──────────┘   │
 │                                         │              │
 │                                         ▼              │
 │   ┌─────────────────┐        ┌─────────────────────┐   │
 │   │  Local Storage  │ <────  │  Ollama / OpenRouter│   │
 │   │ (SQLite / JSON) │        │ (Extraction & Score)│   │
 │   └─────────────────┘        └──────────┬──────────┘   │
 │                                         │              │
 │                                         ▼              │
 │                              ┌─────────────────────┐   │
 │                              │ n8n Alert Filter    │   │
 │                              │ (Score >= 75 check) │   │
 │                              └──────────┬──────────┘   │
 └─────────────────────────────────────────┼──────────────┘
                                           │ (Webhook HTTPS)
                                           ▼
                           [ Telegram Bot / Slack Webhook ]
```

---

## 2. Docker Compose Deployment

Create a directory on your VPS `~/demand-radar` and write `docker-compose.yml`:

```yaml
version: '3.8'

services:
  ollama:
    image: ollama/ollama:latest
    container_name: radar-ollama
    restart: unless-stopped
    ports:
      - "127.0.0.1:11434:11434"
    volumes:
      - ollama_data:/root/.ollama

  n8n:
    image: docker.n8n.io/n8nio/n8n:latest
    container_name: radar-n8n
    restart: unless-stopped
    ports:
      - "127.0.0.1:5678:5678"
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=CHANGE_ME_SECURE_PASSWORD
      - N8N_HOST=radar.yourdomain.com
      - N8N_PORT=5678
      - N8N_PROTOCOL=https
      - WEBHOOK_URL=https://radar.yourdomain.com/
      - GENERIC_TIMEZONE=UTC
    volumes:
      - n8n_data:/home/node/.n8n

volumes:
  ollama_data:
  n8n_data:
```

---

## 3. The 4-Stage Automated n8n Pipeline

### Stage 1: Scheduled Trigger (Cron)
- Trigger every 4 hours: `0 */4 * * *`

### Stage 2: Fetch Signals & Filter Seen IDs
- HTTP Request node queries target subreddit or HN API:
  - URL: `https://www.reddit.com/r/webdev+devops+SaaS/new.json?limit=50`
  - User-Agent: `demand-radar-vps:v1.0 (contact: admin@yourdomain.com)`
- Check against local SQLite DB to only pass unseen post IDs.

### Stage 3: LLM Extraction & Opportunity Scoring
- Call Ollama API (`http://radar-ollama:11434/api/generate`):
  - Send `prompts/extract.md` to extract Pain Card.
  - If `pain_intensity` $\ge 6$ and `paying_intent_clues.has_explicit_buying_statement == true`, immediately invoke `prompts/score.md`.

### Stage 4: Alert Dispatch via Telegram Bot
- Filter Node: `total_weighted_score >= 75` AND `is_killed == false`.
- HTTP Request to Telegram Bot API:
  - URL: `https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/sendMessage`
  - Payload:

```json
{
  "chat_id": "<YOUR_TELEGRAM_CHAT_ID>",
  "parse_mode": "MarkdownV2",
  "text": "🚨 *DEMAND RADAR: High-Score Opportunity Detected\\!*\n\n*Title*: `GitHub Actions Docker Cache Busting`\n*Score*: *82/100* \\(Pursue Immediately\\)\n\n*Target Audience*: DevOps / Fullstack Engineer\n*Pain Friction*: Manual layer rebuilds causing 25min delay and cloud budget spikes\\.\n*Paying Clue*: _\"I would gladly pay $30/mo out of pocket for a CLI that just fixes this\\.\"_\n\n🔗 [View Source Thread](https://reddit.com/...)\n\n*Next Action*: Schedule Mom Test interview or draft Opportunity Brief\\."
}
```

---

## 4. Alternative: Lightweight 0-Dependency Shell Cron

If you do not wish to run n8n, you can run a single self-contained Node.js or Bash script via standard system cron on your VPS:

```bash
# /etc/cron.d/demand-radar
0 */4 * * * rock /usr/bin/node /home/rock/demand-radar/scripts/cron-worker.js >> /var/log/demand-radar.log 2>&1
```

### Alert Payload Example (Slack Webhook)
```bash
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"🎯 *New Pain Point Card Harvested*\n*Audience*: Shopify Merchant\n*Friction*: Inventory desync across 3 warehouses\n*Loss*: ~$400/mo in refunded orders\n*Source*: r/ecommerce"}' \
  https://hooks.slack.com/services/T00/B00/XXXX
```
