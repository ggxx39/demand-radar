#!/usr/bin/env node

/**
 * demand-radar CLI Runner
 * Ingests live community signals (Reddit, Hacker News), extracts structured Pain Cards,
 * and performs 8-dimensional Opportunity Scoring using OpenCode's configured LLM (AMD Radeon DeepSeek/Qwen).
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT_DIR, 'output');
const PAIN_CARDS_DIR = path.join(OUTPUT_DIR, 'pain-cards');
const SCORES_DIR = path.join(OUTPUT_DIR, 'scores');

// Ensure output directories exist
for (const dir of [OUTPUT_DIR, PAIN_CARDS_DIR, SCORES_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// 1. Resolve LLM Configuration
function resolveLLMConfig() {
  // Check env vars first
  if (process.env.OPENAI_API_KEY) {
    return {
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      provider: 'custom-env'
    };
  }

  // Fallback to OpenCode local configuration (AMD Radeon)
  try {
    const homedir = process.env.HOME || '/Users/rock';
    const authPath = path.join(homedir, '.local/share/opencode/auth.json');
    const configPath = path.join(homedir, '.config/opencode/opencode.jsonc');

    let apiKey = null;
    if (fs.existsSync(authPath)) {
      const auth = JSON.parse(fs.readFileSync(authPath, 'utf8'));
      apiKey = auth['amd-radeon']?.key || auth['amd']?.key;
    }

    let baseURL = 'https://developer.amd.com.cn/radeon/api/v1';
    let defaultModel = 'DeepSeek-V4-Flash';

    if (fs.existsSync(configPath)) {
      try {
        const raw = fs.readFileSync(configPath, 'utf8').replace(/\/\/.*$/gm, '');
        const cfg = JSON.parse(raw);
        if (cfg.provider?.['amd-radeon']?.options?.baseURL) {
          baseURL = cfg.provider['amd-radeon'].options.baseURL;
        }
      } catch (_) {}
    }

    if (apiKey) {
      return {
        apiKey,
        baseURL,
        model: defaultModel,
        provider: 'OpenCode (AMD Radeon)'
      };
    }
  } catch (err) {
    // Ignore and fallback
  }

  return null;
}

// 2. Fetch Signals from Sources
async function fetchRedditPosts(subreddit, limit = 5) {
  const url = `https://www.reddit.com/r/${subreddit}/new.json?limit=${limit}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'demand-radar:v1.0 (indie-research-radar by /u/ggxx39)'
    }
  });
  if (!res.ok) throw new Error(`Reddit HTTP ${res.status}: ${await res.text()}`);
  const json = await res.json();
  const children = json?.data?.children || [];
  return children
    .map(c => c.data)
    .filter(d => d && !d.stickied)
    .map(d => ({
      id: `reddit_${d.id}`,
      channel: `reddit:r/${subreddit}`,
      title: d.title || '',
      body: d.selftext || '',
      url: `https://reddit.com${d.permalink}`,
      author: d.author,
      score: d.score,
      num_comments: d.num_comments,
      created_utc: d.created_utc
    }));
}

async function fetchHNPosts(limit = 5) {
  const listRes = await fetch('https://hacker-news.firebaseio.com/v0/askstories.json');
  if (!listRes.ok) throw new Error(`HN HTTP ${listRes.status}`);
  const ids = (await listRes.json()).slice(0, limit);

  const posts = [];
  for (const id of ids) {
    try {
      const itemRes = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
      if (itemRes.ok) {
        const d = await itemRes.json();
        if (d && d.title) {
          posts.push({
            id: `hn_${d.id}`,
            channel: 'hacker-news:ask',
            title: d.title,
            body: d.text || '',
            url: `https://news.ycombinator.com/item?id=${d.id}`,
            author: d.by,
            score: d.score,
            num_comments: d.descendants || 0,
            created_utc: d.time
          });
        }
      }
    } catch (_) {}
  }
  return posts;
}

// 3. LLM Chat Completion Helper
async function callLLM(llmConfig, messages, modelOverride, expectJson = true) {
  const targetModel = modelOverride || llmConfig.model;
  const url = `${llmConfig.baseURL.replace(/\/$/, '')}/chat/completions`;

  const body = {
    model: targetModel,
    messages,
    temperature: 0.2
  };
  if (expectJson) {
    body.response_format = { type: 'json_object' };
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${llmConfig.apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`LLM Error (${res.status}): ${errText}`);
  }

  const json = await res.json();
  let content = json?.choices?.[0]?.message?.content || '';

  if (!content && json?.choices?.[0]?.message?.reasoning) {
    content = json.choices[0].message.reasoning;
  }

  if (expectJson) {
    try {
      const clean = content.replace(/```json\s*/gi, '').replace(/```\s*$/g, '').trim();
      return JSON.parse(clean);
    } catch (parseErr) {
      const m = content.match(/\{[\s\S]*\}/);
      if (m) return JSON.parse(m[0]);
      throw new Error(`Failed to parse JSON response: ${content.slice(0, 200)}...`);
    }
  }

  return content;
}

// 4. Extract Pain Point
async function extractPainCard(llmConfig, post, model) {
  const systemPrompt = `You are an elite customer discovery researcher applying the 'Demand Radar' framework.
Your mission is to read raw community posts, detect real user complaints or friction points, and extract an atomic, standardized PainCard JSON.

Rules:
1. Ground every field in evidence. Do NOT fabricate or hallucinate.
2. If the post contains NO user complaint, friction, or unmet need (e.g. it is pure spam, self-promotion, or celebratory announcement), return: {"has_pain": false}
3. Otherwise, set "has_pain": true and return the standard PainCard schema.

Output Schema:
{
  "has_pain": boolean,
  "id": "pain-YYYYMMDD-kebab-topic",
  "headline": "One-line punchy summary of the friction",
  "target_audience": {
    "role": "Specific title/role",
    "domain": "Industry/domain",
    "scale": "Team scale or hobbyist/indie/smb/enterprise"
  },
  "scenario": "Specific workflow context when the problem strikes",
  "friction": "Exact failure mechanism or obstruction",
  "current_workaround": {
    "description": "How they deal with it today (hack, manual, competitor)",
    "type": "manual_effort | custom_script | spreadsheets | commercial_tool | unaddressed"
  },
  "cost_or_loss": {
    "hours_lost_per_week": number,
    "money_wasted_per_month_usd": number,
    "description": "Concrete damage description"
  },
  "sentiment": {
    "intensity": "rage | high_frustration | moderate_friction | mild_annoyance",
    "signals": ["list of emotional cue words"]
  },
  "paying_intent": {
    "has_signal": boolean,
    "clues": ["explicit phrases like 'I would pay', 'budget', etc."]
  },
  "evidence": {
    "source_channel": "${post.channel}",
    "source_url": "${post.url}",
    "raw_quote": "Verbatim quote from author",
    "confidence_score": 0.0 to 1.0
  }
}`;

  const userContent = `Post Title: ${post.title}\n\nPost Body:\n${post.body || '(No body text, title only)'}\n\nURL: ${post.url}`;

  return await callLLM(llmConfig, [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userContent }
  ], model);
}

// 5. Compute 8-Dimensional Opportunity Score
async function scoreOpportunity(llmConfig, painCard, model) {
  const systemPrompt = `You are an adversarial, hyper-rational venture scout and indie hacker mentor.
Your job is to critically evaluate a candidate pain point along the 8 Demand Radar dimensions on a scale of 0 to 10.
Be rigorously skeptical. Reject wishful thinking.

The 8 Dimensions and Weights:
1. pain_intensity (weight: 0.15) - 10: hair-on-fire loss; 0: mild triviality
2. frequency (weight: 0.08) - 10: multiple times daily; 0: once a year
3. workaround_friction (weight: 0.15) - 10: painful messy duct-tape; 0: effortless native fix
4. paying_intent (weight: 0.20) - 10: budget already spent or contract intent; 0: want free forever
5. cross_source_recurrence (weight: 0.07) - 10: heard across 5+ channels; 0: single person gripe
6. competitive_gap (weight: 0.10) - 10: incumbents neglect or overcharge; 0: solved perfectly by giants
7. solo_feasibility (weight: 0.10) - 10: 1 solo dev ships MVP in 1-2 weeks; 0: requires enterprise sales or heavy infra
8. distribution_accessibility (weight: 0.15) - 10: known hanging spot & easy reach; 0: inaccessible gatekeepers

Fatal Kill Gates:
- If pain_intensity < 6: is_killed = true ("Trivial problem")
- If paying_intent < 5: is_killed = true ("Zero budget")
- If solo_feasibility < 4: is_killed = true ("Scope too big")
- If distribution_accessibility < 4: is_killed = true ("Impossible to reach")

Output Schema:
{
  "opportunity_title": "Concise product hypothesis",
  "scores": {
    "pain_intensity": number,
    "frequency": number,
    "workaround_friction": number,
    "paying_intent": number,
    "cross_source_recurrence": number,
    "competitive_gap": number,
    "solo_feasibility": number,
    "distribution_accessibility": number
  },
  "total_score": number (0-100 weighted sum * 10),
  "is_killed": boolean,
  "fatal_flaws": ["list reasons if killed"],
  "recommended_wedge_mvp": "The 10-day minimal product solution",
  "target_interview_profile": "Who to interview for The Mom Test"
}`;

  return await callLLM(llmConfig, [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: JSON.stringify(painCard, null, 2) }
  ], model);
}

// 6. Main CLI Execution
async function main() {
  const args = process.argv.slice(2);
  const getArg = (flag, def) => {
    const idx = args.indexOf(flag);
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : def;
  };
  const hasFlag = flag => args.includes(flag);

  const source = getArg('--source', 'reddit');
  const sub = getArg('--sub', 'SaaS');
  const limit = parseInt(getArg('--limit', '5'), 10);
  const model = getArg('--model', null);
  const dryRun = hasFlag('--dry-run');

  console.log('\n========================================================');
  console.log('📡 DEMAND RADAR — Live Customer Demand Mining CLI');
  console.log('========================================================');

  const llmConfig = resolveLLMConfig();
  if (!dryRun) {
    if (!llmConfig) {
      console.error('\n❌ No LLM provider found! Please set OPENAI_API_KEY or configure OpenCode.');
      process.exit(1);
    }
    console.log(`🤖 LLM Provider : ${llmConfig.provider} (${llmConfig.baseURL})`);
    console.log(`🧠 Active Model : ${model || llmConfig.model}`);
  } else {
    console.log('🔍 Mode         : Dry Run (Fetch only, no LLM extraction)');
  }
  console.log(`🎯 Signal Source: ${source === 'hn' ? 'Hacker News (Ask HN)' : `Reddit (r/${sub})`}`);
  console.log(`📊 Post Limit   : ${limit}`);
  console.log('--------------------------------------------------------\n');

  console.log('⏳ Fetching latest community discussions...');
  let posts = [];
  try {
    if (source === 'hn') {
      posts = await fetchHNPosts(limit);
    } else {
      posts = await fetchRedditPosts(sub, limit);
    }
    console.log(`✅ Retrieved ${posts.length} discussions.\n`);
  } catch (err) {
    console.error(`❌ Failed to fetch signals: ${err.message}`);
    process.exit(1);
  }

  let painCount = 0;
  let qualifiedCount = 0;

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    console.log(`[${i + 1}/${posts.length}] 📝 "${post.title.slice(0, 70)}${post.title.length > 70 ? '...' : ''}"`);
    console.log(`     🔗 ${post.url} (💬 ${post.num_comments} comments, ⬆️ ${post.score})`);

    if (dryRun) continue;

    process.stdout.write('     ⏳ Analyzing with LLM...');
    try {
      const card = await extractPainCard(llmConfig, post, model);
      if (!card.has_pain) {
        console.log(' ⏭️  No painful friction detected. Skipping.');
        continue;
      }

      painCount++;
      console.log(` 🎯 Pain Found!`);
      console.log(`        Headline: ${card.headline}`);
      console.log(`        Audience: ${card.target_audience?.role || 'Unknown'} (${card.target_audience?.scale || ''})`);
      console.log(`        Friction: ${card.friction?.slice(0, 100)}...`);
      console.log(`        Workaround: ${card.current_workaround?.description?.slice(0, 80)}...`);

      // Save pain card
      const cardFilename = `${card.id || `pain-${Date.now()}`}.json`;
      const cardFilePath = path.join(PAIN_CARDS_DIR, cardFilename);
      fs.writeFileSync(cardFilePath, JSON.stringify(card, null, 2), 'utf8');

      // Opportunity Scoring
      process.stdout.write('     ⚖️  Running 8-Dim Opportunity Scoring...');
      const score = await scoreOpportunity(llmConfig, card, model);
      const isQualified = !score.is_killed && score.total_score >= 65;
      if (isQualified) qualifiedCount++;

      const statusBadge = score.is_killed ? '🔴 KILLED' : score.total_score >= 75 ? '🟢 HIGH POTENTIAL' : '🟡 MODERATE';
      console.log(` ${statusBadge} (Score: ${score.total_score}/100)`);
      if (score.is_killed) {
        console.log(`        Fatal Flaws: ${score.fatal_flaws?.join('; ')}`);
      } else {
        console.log(`        Wedge MVP: ${score.recommended_wedge_mvp}`);
        console.log(`        Interview: ${score.target_interview_profile}`);
      }

      // Save score
      const scoreFilename = `score-${card.id || Date.now()}.json`;
      const scoreFilePath = path.join(SCORES_DIR, scoreFilename);
      fs.writeFileSync(scoreFilePath, JSON.stringify(score, null, 2), 'utf8');

      console.log(`     💾 Saved to output/pain-cards/${cardFilename} and output/scores/${scoreFilename}\n`);
    } catch (err) {
      console.log(` ❌ Analysis error: ${err.message}\n`);
    }
  }

  console.log('========================================================');
  console.log(`🎉 Radar Scan Complete!`);
  console.log(`   Signals Scanned  : ${posts.length}`);
  if (!dryRun) {
    console.log(`   Pain Cards Found : ${painCount}`);
    console.log(`   Qualified Leaks  : ${qualifiedCount}`);
    console.log(`   Data Stored In   : ${OUTPUT_DIR}`);
  }
  console.log('========================================================\n');
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
