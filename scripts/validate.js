#!/usr/bin/env node

/**
 * Demand Radar Schema and Example Validator
 * Validates schemas and sample JSON files without external heavy dependencies.
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const SCHEMAS_DIR = path.join(REPO_ROOT, 'schemas');
const PAIN_CARDS_DIR = path.join(REPO_ROOT, 'examples', 'sample-pain-cards');
const OPP_SCORES_DIR = path.join(REPO_ROOT, 'examples', 'sample-opportunity-scores');

let totalErrors = 0;
let totalChecks = 0;

function logPass(msg) {
  console.log(`  \x1b[32m✔\x1b[0m ${msg}`);
  totalChecks++;
}

function logFail(msg, err) {
  console.error(`  \x1b[31m✖\x1b[0m ${msg}`);
  if (err) console.error(`    \x1b[33mError: ${err}\x1b[0m`);
  totalErrors++;
  totalChecks++;
}

function readJsonFile(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    throw new Error(`Failed to read/parse JSON at ${filePath}: ${e.message}`);
  }
}

// 1. Validate Schemas
console.log('\n--- 1. Validating JSON Schemas ---');

try {
  const painSchema = readJsonFile(path.join(SCHEMAS_DIR, 'pain-card.schema.json'));
  if (painSchema.title === 'PainCard' && painSchema.required && painSchema.required.length > 0) {
    logPass(`pain-card.schema.json is valid (${painSchema.required.length} required fields)`);
  } else {
    logFail('pain-card.schema.json missing title or required properties');
  }
} catch (e) {
  logFail('pain-card.schema.json failed parsing', e.message);
}

try {
  const oppSchema = readJsonFile(path.join(SCHEMAS_DIR, 'opportunity-score.schema.json'));
  if (oppSchema.title === 'OpportunityScore' && oppSchema.required && oppSchema.required.length > 0) {
    logPass(`opportunity-score.schema.json is valid (${oppSchema.required.length} required fields)`);
  } else {
    logFail('opportunity-score.schema.json missing title or required properties');
  }
} catch (e) {
  logFail('opportunity-score.schema.json failed parsing', e.message);
}

// 2. Validate Pain Cards
console.log('\n--- 2. Validating Sample Pain Cards ---');
const painCardFiles = fs.readdirSync(PAIN_CARDS_DIR).filter(f => f.endsWith('.json'));

const validChannels = [
  'reddit', 'hackernews', 'x_twitter', 'github_issues', 'discord',
  'app_store', 'play_store', 'trustpilot', 'g2', 'v2ex', 'producthunt',
  'discourse_forum', 'other'
];

const validEmotionalTolls = [
  'mild_annoyance', 'regular_frustration', 'acute_anxiety_or_rage', 'burnout_risk'
];

painCardFiles.forEach(file => {
  const filePath = path.join(PAIN_CARDS_DIR, file);
  try {
    const card = readJsonFile(filePath);

    // Required fields check
    const required = [
      'id', 'created_at', 'headline', 'target_audience', 'scenario',
      'friction', 'current_workaround', 'cost_or_loss', 'sentiment_intensity',
      'paying_intent_clues', 'source_url', 'channel', 'raw_quote', 'confidence'
    ];
    for (const req of required) {
      if (card[req] === undefined) throw new Error(`Missing required property: ${req}`);
    }

    // Pattern checks
    if (!/^pain-[0-9]{8}-[a-z0-9-]+$/.test(card.id)) {
      throw new Error(`Invalid ID format '${card.id}'. Expected '^pain-YYYYMMDD-<slug>$'`);
    }

    // Channel check
    if (!validChannels.includes(card.channel)) {
      throw new Error(`Invalid channel '${card.channel}'`);
    }

    // Emotional toll check
    if (!validEmotionalTolls.includes(card.cost_or_loss.emotional_toll)) {
      throw new Error(`Invalid emotional_toll '${card.cost_or_loss.emotional_toll}'`);
    }

    // Confidence check
    if (typeof card.confidence !== 'number' || card.confidence < 0 || card.confidence > 1) {
      throw new Error(`Confidence must be a number between 0 and 1. Got ${card.confidence}`);
    }

    logPass(`${file} [id: ${card.id}] matches schema`);
  } catch (e) {
    logFail(`${file} validation failed`, e.message);
  }
});

// 3. Validate Opportunity Scores
console.log('\n--- 3. Validating Sample Opportunity Scores ---');
const oppFiles = fs.readdirSync(OPP_SCORES_DIR).filter(f => f.endsWith('.json'));

const expectedDimensions = [
  'pain_intensity', 'frequency', 'workaround_friction', 'paying_intent',
  'cross_source_recurrence', 'competitive_gap', 'feasibility_solo_buildability',
  'distribution_accessibility'
];

oppFiles.forEach(file => {
  const filePath = path.join(OPP_SCORES_DIR, file);
  try {
    const opp = readJsonFile(filePath);

    // Required check
    const required = [
      'id', 'cluster_id', 'title', 'one_liner', 'evaluated_at',
      'evaluator', 'dimensions', 'total_weighted_score', 'hard_kill_filters',
      'recommendation', 'next_action'
    ];
    for (const req of required) {
      if (opp[req] === undefined) throw new Error(`Missing required property: ${req}`);
    }

    // Pattern check
    if (!/^opp-[0-9]{8}-[a-z0-9-]+$/.test(opp.id)) {
      throw new Error(`Invalid ID format '${opp.id}'. Expected '^opp-YYYYMMDD-<slug>$'`);
    }

    // Dimensions check
    let calculatedScore = 0;
    let totalWeight = 0;
    for (const dim of expectedDimensions) {
      const d = opp.dimensions[dim];
      if (!d) throw new Error(`Missing dimension: ${dim}`);
      if (d.score < 1 || d.score > 10) throw new Error(`Dimension ${dim} score must be 1-10`);
      if (d.weight <= 0 || d.weight > 1) throw new Error(`Dimension ${dim} weight must be between 0 and 1`);
      calculatedScore += (d.score * d.weight);
      totalWeight += d.weight;
    }

    if (Math.abs(totalWeight - 1.0) > 0.01) {
      throw new Error(`Total dimension weights must sum to 1.0. Sum is ${totalWeight}`);
    }

    const expectedScore = Math.round(calculatedScore * 10 * 10) / 10;
    const diff = Math.abs(expectedScore - opp.total_weighted_score);
    if (diff > 0.5) {
      throw new Error(`Calculated score (${expectedScore}) differs from total_weighted_score (${opp.total_weighted_score})`);
    }

    // Hard kill check
    const kill = opp.hard_kill_filters;
    if (kill.pain_intensity_below_6 !== (opp.dimensions.pain_intensity.score < 6)) {
      throw new Error('Inconsistent pain_intensity_below_6 flag');
    }
    if (kill.paying_intent_below_5 !== (opp.dimensions.paying_intent.score < 5)) {
      throw new Error('Inconsistent paying_intent_below_5 flag');
    }

    logPass(`${file} [id: ${opp.id}, score: ${opp.total_weighted_score}] matches schema & rubrics`);
  } catch (e) {
    logFail(`${file} validation failed`, e.message);
  }
});

// 4. Validate Web App Seed Dataset (web/data/cards.json)
console.log('\n--- 4. Validating Web Application cards.json ---');
const webCardsPath = path.join(REPO_ROOT, 'web', 'data', 'cards.json');
try {
  const webCards = readJsonFile(webCardsPath);
  if (!Array.isArray(webCards) || webCards.length === 0) {
    throw new Error('cards.json must be a non-empty array of cards');
  }

  const validRecommendations = ['pursue_immediately', 'deepen_investigation', 'archive_or_monitor', 'kill'];
  const validEvaluators = ['llm', 'human', 'hybrid'];

  webCards.forEach((item, idx) => {
    const card = item.painCard;
    const opp = item.opportunityScore;
    if (!card || !opp) {
      throw new Error(`Card #${idx + 1} missing painCard or opportunityScore container`);
    }

    // Validate painCard
    const painRequired = [
      'id', 'created_at', 'headline', 'target_audience', 'scenario',
      'friction', 'current_workaround', 'cost_or_loss', 'sentiment_intensity',
      'paying_intent_clues', 'source_url', 'channel', 'raw_quote', 'confidence'
    ];
    for (const req of painRequired) {
      if (card[req] === undefined) throw new Error(`[${card.id || `card-${idx}`}] Missing required pain property: ${req}`);
    }
    if (!validChannels.includes(card.channel)) {
      throw new Error(`[${card.id}] Invalid channel '${card.channel}'`);
    }
    if (!validEmotionalTolls.includes(card.cost_or_loss.emotional_toll)) {
      throw new Error(`[${card.id}] Invalid emotional_toll '${card.cost_or_loss.emotional_toll}'`);
    }

    // Validate opportunityScore
    const oppRequired = [
      'id', 'cluster_id', 'title', 'one_liner', 'evaluated_at',
      'evaluator', 'dimensions', 'total_weighted_score', 'hard_kill_filters',
      'recommendation', 'next_action'
    ];
    for (const req of oppRequired) {
      if (opp[req] === undefined) throw new Error(`[${opp.id || `opp-${idx}`}] Missing required opp property: ${req}`);
    }

    if (!validRecommendations.includes(opp.recommendation)) {
      throw new Error(`[${opp.id}] Invalid recommendation '${opp.recommendation}' (must be one of: ${validRecommendations.join(', ')})`);
    }
    if (!validEvaluators.includes(opp.evaluator)) {
      throw new Error(`[${opp.id}] Invalid evaluator '${opp.evaluator}' (must be one of: ${validEvaluators.join(', ')})`);
    }

    let calculatedScore = 0;
    let totalWeight = 0;
    for (const dim of expectedDimensions) {
      const d = opp.dimensions[dim];
      if (!d) throw new Error(`[${opp.id}] Missing dimension: ${dim}`);
      if (d.score < 1 || d.score > 10) throw new Error(`[${opp.id}] Dimension ${dim} score must be 1-10`);
      calculatedScore += (d.score * d.weight);
      totalWeight += d.weight;
    }

    if (Math.abs(totalWeight - 1.0) > 0.01) {
      throw new Error(`[${opp.id}] Total weights sum (${totalWeight}) != 1.0`);
    }

    const expectedScore = Math.round(calculatedScore * 10 * 10) / 10;
    const diff = Math.abs(expectedScore - opp.total_weighted_score);
    if (diff > 0.5) {
      throw new Error(`[${opp.id}] Score mismatch: expected ${expectedScore}, found ${opp.total_weighted_score}`);
    }

    const kill = opp.hard_kill_filters;
    if (kill.pain_intensity_below_6 !== (opp.dimensions.pain_intensity.score < 6)) {
      throw new Error(`[${opp.id}] Inconsistent pain_intensity_below_6 flag`);
    }
    if (kill.paying_intent_below_5 !== (opp.dimensions.paying_intent.score < 5)) {
      throw new Error(`[${opp.id}] Inconsistent paying_intent_below_5 flag`);
    }

    logPass(`web/data/cards.json #${idx + 1} [${card.id} / ${opp.id}, score: ${opp.total_weighted_score}] matches schema & rubrics`);
  });
} catch (e) {
  logFail('web/data/cards.json validation failed', e.message);
}

console.log(`\n================================================`);
console.log(`Validation Complete: ${totalChecks} checks run, ${totalErrors} errors.`);
console.log(`================================================\n`);

if (totalErrors > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
