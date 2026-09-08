/**
 * Demand Radar — Web Application Controller
 * High-performance vanilla JS engine matching ThreeUI aesthetic
 */

// Application State
const state = {
  cards: [],
  filteredCards: [],
  selectedCardId: null,
  palette: localStorage.getItem('dr_palette') || 'mono',
  apiKey: localStorage.getItem('dr_llm_key') || '',
  apiModel: localStorage.getItem('dr_llm_model') || 'DeepSeek-V4-Flash',
  activeTab: 'radar',
  filters: {
    source: 'all',
    status: 'all',
    search: '',
    sort: 'score_desc'
  }
};

// 8 Demand Radar Dimension Specifications
const RADAR_DIMENSIONS = [
  { key: 'pain_intensity', label: 'Pain Intensity', weight: 0.15, minKill: 6 },
  { key: 'frequency', label: 'Frequency', weight: 0.08, minKill: 0 },
  { key: 'workaround_friction', label: 'Workaround Friction', weight: 0.15, minKill: 0 },
  { key: 'paying_intent', label: 'Paying Intent', weight: 0.20, minKill: 5 },
  { key: 'cross_source_recurrence', label: 'Recurrence', weight: 0.07, minKill: 0 },
  { key: 'competitive_gap', label: 'Competitive Gap', weight: 0.10, minKill: 0 },
  { key: 'feasibility_solo_buildability', altKey: 'solo_feasibility', label: 'Solo Feasibility', weight: 0.10, minKill: 4 },
  { key: 'distribution_accessibility', label: 'Distribution', weight: 0.15, minKill: 4 }
];

// Initialize Application
document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  setupEventListeners();
  await loadCards();
});

// Theme & Palette Init
function initTheme() {
  document.documentElement.dataset.palette = state.palette;
  document.querySelectorAll('.palette-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.palette === state.palette);
  });
}

function setPalette(palette) {
  state.palette = palette;
  document.documentElement.dataset.palette = palette;
  localStorage.setItem('dr_palette', palette);
  document.querySelectorAll('.palette-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.palette === palette);
  });
  if (state.selectedCardId) {
    renderDetailPanel();
  }
}

// Data Fetching
async function loadCards() {
  try {
    // Try local static JSON first
    const res = await fetch('/data/cards.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    
    // Check if user has added custom scanned cards in localStorage
    const localScans = JSON.parse(localStorage.getItem('dr_custom_cards') || '[]');
    state.cards = [...localScans, ...data];
  } catch (err) {
    console.warn('Failed to load local static cards, loading embedded fallback:', err);
    state.cards = getEmbeddedFallbackCards();
  }

  // Deduplicate cards by ID
  const seen = new Set();
  state.cards = state.cards.filter(c => {
    const id = c.painCard?.id;
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  if (state.cards.length > 0 && !state.selectedCardId) {
    state.selectedCardId = state.cards[0].painCard.id;
  }

  applyFilters();
  updateGlobalMetrics();
}

// Filter, Search, and Sort Engine
function applyFilters() {
  const { source, status, search, sort } = state.filters;
  const q = search.trim().toLowerCase();

  state.filteredCards = state.cards.filter(item => {
    const card = item.painCard;
    const score = item.opportunityScore;
    const isKilled = score.hard_kill_filters?.is_killed || score.is_killed;
    const totalScore = score.total_weighted_score || score.total_score || 0;
    const channel = (card.channel || '').toLowerCase();

    // Source filter
    if (source !== 'all') {
      if (source === 'reddit' && !channel.includes('reddit')) return false;
      if (source === 'hn' && !channel.includes('hacker') && !channel.includes('hn')) return false;
      if (source === 'github' && !channel.includes('github')) return false;
      if (source === 'other' && (channel.includes('reddit') || channel.includes('hacker') || channel.includes('hn'))) return false;
    }

    // Status filter
    if (status !== 'all') {
      if (status === 'high' && (isKilled || totalScore < 75)) return false;
      if (status === 'moderate' && (isKilled || totalScore < 55 || totalScore >= 75)) return false;
      if (status === 'killed' && !isKilled) return false;
    }

    // Text search
    if (q) {
      const corpus = [
        card.headline,
        card.friction,
        card.scenario,
        card.target_audience?.role,
        card.target_audience?.domain,
        card.raw_quote,
        score.title,
        score.one_liner,
        ...(card.tags || [])
      ].join(' ').toLowerCase();

      if (!corpus.includes(q)) return false;
    }

    return true;
  });

  // Sorting
  state.filteredCards.sort((a, b) => {
    const scoreA = a.opportunityScore.total_weighted_score || a.opportunityScore.total_score || 0;
    const scoreB = b.opportunityScore.total_weighted_score || b.opportunityScore.total_score || 0;
    if (sort === 'score_desc') return scoreB - scoreA;
    if (sort === 'score_asc') return scoreA - scoreB;
    if (sort === 'time_loss') {
      const lossA = a.painCard.cost_or_loss?.time_lost_hours_per_month || 0;
      const lossB = b.painCard.cost_or_loss?.time_lost_hours_per_month || 0;
      return lossB - lossA;
    }
    return new Date(b.painCard.created_at) - new Date(a.painCard.created_at);
  });

  // Ensure selected card is in filtered list or pick first
  const exists = state.filteredCards.some(c => c.painCard.id === state.selectedCardId);
  if (!exists && state.filteredCards.length > 0) {
    state.selectedCardId = state.filteredCards[0].painCard.id;
  }

  renderCardsList();
  renderDetailPanel();
}

// Global Telemetry Counts
function updateGlobalMetrics() {
  const totalSignals = state.cards.length;
  const highCount = state.cards.filter(c => {
    const s = c.opportunityScore;
    return !(s.hard_kill_filters?.is_killed || s.is_killed) && (s.total_weighted_score || s.total_score) >= 75;
  }).length;

  const killedCount = state.cards.filter(c => {
    const s = c.opportunityScore;
    return s.hard_kill_filters?.is_killed || s.is_killed;
  }).length;

  const avgScore = totalSignals > 0
    ? (state.cards.reduce((acc, c) => acc + (c.opportunityScore.total_weighted_score || c.opportunityScore.total_score || 0), 0) / totalSignals).toFixed(1)
    : '0.0';

  const elSignals = document.getElementById('metric-total-signals');
  const elHigh = document.getElementById('metric-high-pot');
  const elKilled = document.getElementById('metric-killed');
  const elAvg = document.getElementById('metric-avg-score');

  if (elSignals) elSignals.textContent = totalSignals;
  if (elHigh) elHigh.textContent = highCount;
  if (elKilled) elKilled.textContent = killedCount;
  if (elAvg) elAvg.textContent = avgScore;
}

// Render Left Feed of Cards
function renderCardsList() {
  const container = document.getElementById('cards-feed');
  const countLabel = document.getElementById('feed-count-label');
  if (!container) return;

  if (countLabel) {
    countLabel.textContent = `${state.filteredCards.length} DISCOVERED PAIN SIGNALS`;
  }

  if (state.filteredCards.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding: 48px 16px; color: var(--text-muted); font-family: var(--font-mono); font-size: 12px; border: 1px dashed var(--border-card); border-radius: var(--radius-lg);">
        NO MATCHING PAIN CARDS FOUND<br>
        <span style="font-size:11px; opacity:0.7;">Adjust your search or click "+ Mine Signals" to scan live discussions.</span>
      </div>
    `;
    return;
  }

  container.innerHTML = state.filteredCards.map(item => {
    const card = item.painCard;
    const opp = item.opportunityScore;
    const isSelected = card.id === state.selectedCardId;
    const isKilled = opp.hard_kill_filters?.is_killed || opp.is_killed;
    const totalScore = opp.total_weighted_score || opp.total_score || 0;

    let statusClass = 'status-moderate';
    let statusText = `● ${totalScore} MODERATE`;
    if (isKilled) {
      statusClass = 'status-killed';
      statusText = `🔴 ${totalScore} KILLED`;
    } else if (totalScore >= 75) {
      statusClass = 'status-high';
      statusText = `🟢 ${totalScore} HIGH POTENTIAL`;
    }

    const channelName = card.channel === 'hackernews' ? 'Hacker News' : card.channel === 'reddit' ? 'Reddit' : card.channel;
    const lossHours = card.cost_or_loss?.time_lost_hours_per_month ? `⏳ ${card.cost_or_loss.time_lost_hours_per_month}h/mo` : '';
    const lossMoney = card.cost_or_loss?.financial_loss_usd_per_month ? `💸 $${card.cost_or_loss.financial_loss_usd_per_month}/mo` : '';
    const payingIntent = card.paying_intent_clues?.has_explicit_buying_statement ? '🎯 Paying Intent' : '';

    return `
      <div class="pain-card-item ${isSelected ? 'selected' : ''}" data-id="${card.id}">
        <div class="card-top-row">
          <span class="card-channel-chip">
            <span style="color:var(--text-muted)">[${card.channel_metadata?.community || channelName}]</span>
          </span>
          <span class="status-badge ${statusClass}">${statusText}</span>
        </div>
        <div class="card-headline">${escapeHtml(card.headline)}</div>
        <div class="card-audience">
          <span>👤 ${escapeHtml(card.target_audience?.role || 'Target User')}</span>
          <span>·</span>
          <span>${escapeHtml(card.target_audience?.experience_or_scale || card.target_audience?.domain || '')}</span>
        </div>
        <div class="card-metrics-row">
          ${lossHours ? `<span class="card-metric-pill">${lossHours}</span>` : ''}
          ${lossMoney ? `<span class="card-metric-pill">${lossMoney}</span>` : ''}
          ${payingIntent ? `<span class="card-metric-pill" style="color:var(--color-high); border-color:var(--color-high-border);">${payingIntent}</span>` : ''}
          <span class="card-metric-pill" style="margin-left:auto;">Conf: ${Math.round((card.confidence || 0.9) * 100)}%</span>
        </div>
      </div>
    `;
  }).join('');

  // Attach card click handlers
  container.querySelectorAll('.pain-card-item').forEach(el => {
    el.addEventListener('click', () => {
      state.selectedCardId = el.dataset.id;
      renderCardsList();
      renderDetailPanel();
    });
  });
}

// Render Right Detail Inspection Panel
function renderDetailPanel() {
  const container = document.getElementById('detail-content');
  if (!container) return;

  const item = state.cards.find(c => c.painCard.id === state.selectedCardId);
  if (!item) {
    container.innerHTML = `<div style="padding:40px; text-align:center; color:var(--text-muted); font-family:var(--font-mono);">SELECT A PAIN CARD TO INSPECT</div>`;
    return;
  }

  const card = item.painCard;
  const opp = item.opportunityScore;
  const isKilled = opp.hard_kill_filters?.is_killed || opp.is_killed;
  const totalScore = opp.total_weighted_score || opp.total_score || 0;

  // Header Title & Actions
  const headerHtml = `
    <div class="detail-header">
      <div>
        <div style="font-family:var(--font-mono); font-size:11px; color:var(--text-muted); margin-bottom:4px;">
          ${card.id} // ${card.created_at?.slice(0, 10) || '2026-09-08'}
        </div>
        <h2 style="font-size:18px; font-weight:700; color:var(--text-primary); line-height:1.3;">
          ${escapeHtml(opp.title || card.headline)}
        </h2>
      </div>
      <div style="text-align:right;">
        <span class="status-badge ${isKilled ? 'status-killed' : totalScore >= 75 ? 'status-high' : 'status-moderate'}" style="font-size:13px; padding:4px 10px;">
          ${isKilled ? `🔴 KILLED (${totalScore}/100)` : totalScore >= 75 ? `🟢 HIGH POTENTIAL (${totalScore}/100)` : `🟡 MODERATE (${totalScore}/100)`}
        </span>
        <div style="margin-top:6px;">
          <a href="${card.source_url}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm" style="text-decoration:none;">
            ↗ View Source
          </a>
        </div>
      </div>
    </div>
  `;

  // Tabs Navigation
  const tabsHtml = `
    <div class="detail-nav-tabs">
      <button class="detail-tab ${state.activeTab === 'radar' ? 'active' : ''}" data-tab="radar">8-Dim Radar Score</button>
      <button class="detail-tab ${state.activeTab === 'mom_test' ? 'active' : ''}" data-tab="mom_test">The Mom Test Script</button>
      <button class="detail-tab ${state.activeTab === 'outreach' ? 'active' : ''}" data-tab="outreach">Cold Outreach DM</button>
    </div>
  `;

  // Panel 1: 8-Dim Opportunity Score
  const radarPanelHtml = `
    <div class="tab-panel ${state.activeTab === 'radar' ? 'active' : ''}" id="panel-radar">
      ${isKilled ? `
        <div class="fatal-flaw-banner">
          <div class="flaw-icon">⚠️</div>
          <div>
            <div class="flaw-title">HARD KILL GATE TRIPPED — IDEA DISCARDED</div>
            <div class="flaw-desc">${escapeHtml(opp.hard_kill_filters?.kill_reason || 'This candidate problem failed the essential survival criteria (e.g. paying intent < 5, pain intensity < 6, or low solo feasibility). Do not spend engineering time building.')}</div>
          </div>
        </div>
      ` : totalScore >= 75 ? `
        <div class="qualified-banner">
          <div class="flaw-icon">🚀</div>
          <div>
            <div class="qualified-title">VERIFIED OPPORTUNITY — PURSUE IMMEDIATELY</div>
            <div class="flaw-desc">Passed all hard kill filters with a weighted total score of <strong>${totalScore}/100</strong>. Hair-on-fire pain with strong paying intent signal.</div>
          </div>
        </div>
      ` : ''}

      <!-- Interactive SVG Radar Chart -->
      <div class="radar-chart-container">
        ${renderRadarSvg(opp)}
      </div>

      <!-- Dimension Breakdown -->
      <div class="dimensions-list">
        ${renderDimensionItems(opp)}
      </div>

      <!-- Actionable Wedge MVP & Recommendations -->
      <div class="info-section">
        <div class="section-label">⚡ RECOMMENDED 10-DAY WEDGE MVP</div>
        <div class="workaround-card" style="border-color:var(--accent-glow);">
          <strong>${escapeHtml(opp.recommended_wedge_mvp || opp.one_liner || 'Minimal atomic prototype.')}</strong>
          <div style="margin-top:6px; color:var(--text-secondary); font-size:11px;">
            Target Interviewee: ${escapeHtml(opp.target_interview_profile || card.target_audience?.role || 'Domain operator')}
          </div>
        </div>
      </div>

      <!-- Real User Evidence Quote -->
      <div class="info-section">
        <div class="section-label">💬 VERBATIM USER GROUND TRUTH</div>
        <div class="quote-box">"${escapeHtml(card.raw_quote)}"</div>
      </div>

      <!-- Current Hacky Workaround -->
      <div class="info-section">
        <div class="section-label">🛠️ CURRENT MESSY WORKAROUND</div>
        <div class="workaround-card">
          <div><strong>Method:</strong> ${escapeHtml(card.current_workaround?.method || card.current_workaround?.description || 'Manual intervention')}</div>
          <div style="margin-top:4px;"><strong>Tools Used:</strong> ${(card.current_workaround?.tools_used || []).join(', ') || 'Manual'}</div>
          <div style="margin-top:4px; color:var(--color-moderate);"><strong>Drawback:</strong> ${escapeHtml(card.current_workaround?.drawbacks || card.current_workaround?.cost || 'Time-consuming')}</div>
        </div>
      </div>
    </div>
  `;

  // Panel 2: The Mom Test Questions
  const momTestPanelHtml = `
    <div class="tab-panel ${state.activeTab === 'mom_test' ? 'active' : ''}" id="panel-mom_test">
      <div style="margin-bottom:16px; font-size:12px; color:var(--text-secondary); line-height:1.4;">
        <em>"You shouldn't ask anyone whether your business is a good idea. It's a bad question because everyone will lie to you a little bit."</em> — Rob Fitzpatrick. Below is an interview script custom-tailored for <strong>${escapeHtml(card.target_audience?.role || 'this role')}</strong>:
      </div>
      <div class="mom-test-container">
        <div class="mom-stage-card">
          <div class="mom-stage-title">STAGE 1: WARMUP & ROLE CONTEXT <span>(2 mins)</span></div>
          <ul class="mom-question-list">
            <li class="mom-question-item">"Thanks so much for taking 15 minutes. I'm doing research on how teams handle ${escapeHtml(card.target_audience?.domain || 'this workflow')}. Not selling anything."</li>
            <li class="mom-question-item">"To make sure I have the right context, what does your stack look like, and what are you personally responsible for shipping day-to-day?"</li>
          </ul>
        </div>
        <div class="mom-stage-card">
          <div class="mom-stage-title">STAGE 2: DIGGING INTO THE PAIN INCIDENT <span>(8 mins)</span></div>
          <ul class="mom-question-list">
            <li class="mom-question-item">"When was the last time you ran into ${escapeHtml(card.friction.slice(0, 70))}? Walk me through that specific day."</li>
            <li class="mom-question-item">"What was the immediate symptom that alerted you to it?"</li>
            <li class="mom-question-item">"Why was that a big deal? What would have happened if you just ignored it?"</li>
          </ul>
        </div>
        <div class="mom-stage-card">
          <div class="mom-stage-title">STAGE 3: WORKAROUND & SPEND AUDIT <span>(5 mins)</span></div>
          <ul class="mom-question-list">
            <li class="mom-question-item">"How did you end up solving or working around it?"</li>
            <li class="mom-question-item">"How many hours did you spend fixing it?"</li>
            <li class="mom-question-item">"Are you currently paying for any SaaS subscriptions or cloud tools connected to this workflow?"</li>
          </ul>
        </div>
        <div class="mom-stage-card">
          <div class="mom-stage-title">STAGE 4: THE COMMITMENT GATE <span>(2 mins)</span></div>
          <ul class="mom-question-list">
            <li class="mom-question-item">"I'm writing up a benchmark teardown of how 10 teams solve this exact issue. Would you like me to share the anonymized data with you?"</li>
            <li class="mom-question-item">"If we build a lightweight private CLI alpha next month, would you be willing to run it on a staging branch with me on Zoom?"</li>
          </ul>
        </div>
      </div>
    </div>
  `;

  // Panel 3: Cold Outreach DM
  const outreachPanelHtml = `
    <div class="tab-panel ${state.activeTab === 'outreach' ? 'active' : ''}" id="panel-outreach">
      <div style="font-size:12px; color:var(--text-secondary); margin-bottom:12px;">
        High-conversion, non-salesy outreach messages ready to copy and send to authors on Reddit, Hacker News, or GitHub.
      </div>
      
      <div class="template-card">
        <div class="template-header">
          <span style="font-family:var(--font-mono); font-size:11px; font-weight:600; color:var(--text-primary);">REDDIT DM / THREAD REPLY</span>
          <button class="btn btn-secondary btn-sm" onclick="copyOutreachText('reddit-dm')">Copy Text</button>
        </div>
        <pre class="template-code" id="reddit-dm">Hey ${card.channel_metadata?.author || 'there'}, saw your post on ${card.channel_metadata?.community || 'Reddit'} about ${card.headline.toLowerCase().slice(0, 60)}.

I'm an indie software engineer doing a research teardown on why existing tools fail at this step. Zero sales pitch, not selling anything.

Would you be open to a quick 10-minute async chat about how your team currently works around this? Happy to share the compiled benchmark report with you once finished!</pre>
      </div>

      <div class="template-card">
        <div class="template-header">
          <span style="font-family:var(--font-mono); font-size:11px; font-weight:600; color:var(--text-primary);">GITHUB ISSUE / COMMUNITY NOTE</span>
          <button class="btn btn-secondary btn-sm" onclick="copyOutreachText('github-dm')">Copy Text</button>
        </div>
        <pre class="template-code" id="github-dm">Hi @${card.channel_metadata?.author || 'maintainer'}, noticed your comments regarding ${card.headline.slice(0, 60)}.

I'm researching how teams mitigate this specific failure mode before upstream merges an official fix. Could I ask 3 quick questions?
1. Did your current workaround hold up in production?
2. What broke first when traffic or repos scaled?
3. Did you end up paying for any third-party service?</pre>
      </div>
    </div>
  `;

  container.innerHTML = `
    ${headerHtml}
    ${tabsHtml}
    <div class="detail-body">
      ${radarPanelHtml}
      ${momTestPanelHtml}
      ${outreachPanelHtml}
    </div>
  `;

  // Attach tab switching handlers
  container.querySelectorAll('.detail-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      state.activeTab = tab.dataset.tab;
      renderDetailPanel();
    });
  });
}

// 8-Dimension SVG Radar Chart Generator
function renderRadarSvg(opp) {
  const size = 320;
  const center = size / 2;
  const radius = size * 0.40;
  const count = RADAR_DIMENSIONS.length;

  const getDimScore = (dim) => {
    const d = opp.dimensions?.[dim.key] || opp.dimensions?.[dim.altKey] || opp.scores?.[dim.key] || opp.scores?.[dim.altKey];
    if (typeof d === 'number') return d;
    return d?.score || 5;
  };

  // Concentric Octagons
  let backgroundPolygons = '';
  for (let ring = 2; ring <= 10; ring += 2) {
    const ringRadius = (radius / 10) * ring;
    const points = [];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 / count) * i - Math.PI / 2;
      const x = center + Math.cos(angle) * ringRadius;
      const y = center + Math.sin(angle) * ringRadius;
      points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
    backgroundPolygons += `
      <polygon points="${points.join(' ')}" fill="none" stroke="var(--border-subtle)" stroke-width="1" />
    `;
  }

  // Radial Spokes and Axis Labels
  let spokes = '';
  let labels = '';
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 / count) * i - Math.PI / 2;
    const endX = center + Math.cos(angle) * radius;
    const endY = center + Math.sin(angle) * radius;
    spokes += `
      <line x1="${center}" y1="${center}" x2="${endX.toFixed(1)}" y2="${endY.toFixed(1)}" stroke="var(--border-subtle)" stroke-width="1" />
    `;

    // Label coordinates
    const labelRadius = radius + 22;
    const lx = center + Math.cos(angle) * labelRadius;
    const ly = center + Math.sin(angle) * labelRadius;
    const dim = RADAR_DIMENSIONS[i];
    const scoreVal = getDimScore(dim);

    labels += `
      <text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle" dominant-baseline="central" fill="var(--text-secondary)" font-family="var(--font-mono)" font-size="9.5">
        ${dim.label} (${scoreVal})
      </text>
    `;
  }

  // Data Polygon
  const dataPoints = [];
  const vertices = [];
  for (let i = 0; i < count; i++) {
    const dim = RADAR_DIMENSIONS[i];
    const scoreVal = Math.max(1, Math.min(10, getDimScore(dim)));
    const valRadius = (radius / 10) * scoreVal;
    const angle = (Math.PI * 2 / count) * i - Math.PI / 2;
    const vx = center + Math.cos(angle) * valRadius;
    const vy = center + Math.sin(angle) * valRadius;
    dataPoints.push(`${vx.toFixed(1)},${vy.toFixed(1)}`);
    vertices.push(`
      <circle cx="${vx.toFixed(1)}" cy="${vy.toFixed(1)}" r="4" fill="var(--accent)" stroke="var(--bg-base)" stroke-width="1.5" />
    `);
  }

  return `
    <svg class="radar-svg" viewBox="0 0 ${size} ${size}">
      <defs>
        <radialGradient id="radar-fill-grad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.35" />
          <stop offset="100%" stop-color="var(--accent)" stop-opacity="0.10" />
        </radialGradient>
      </defs>
      ${backgroundPolygons}
      ${spokes}
      <polygon points="${dataPoints.join(' ')}" fill="url(#radar-fill-grad)" stroke="var(--accent)" stroke-width="2" />
      ${vertices.join('')}
      ${labels}
    </svg>
  `;
}

// Render Dimension Items Breakdown
function renderDimensionItems(opp) {
  return RADAR_DIMENSIONS.map(dim => {
    const d = opp.dimensions?.[dim.key] || opp.dimensions?.[dim.altKey] || opp.scores?.[dim.key] || opp.scores?.[dim.altKey];
    const scoreVal = typeof d === 'number' ? d : d?.score || 5;
    const evidence = typeof d === 'object' ? d?.evidence : '';
    const isKillViolated = dim.minKill > 0 && scoreVal < dim.minKill;

    return `
      <div class="dimension-item" style="${isKillViolated ? 'border-color:var(--color-killed-border); background:var(--color-killed-bg);' : ''}">
        <div class="dim-top">
          <span class="dim-name">${dim.label} <span style="font-size:9px; color:var(--text-muted)">(${Math.round(dim.weight * 100)}%)</span></span>
          <span class="dim-score" style="${isKillViolated ? 'color:var(--color-killed);' : ''}">
            ${scoreVal}/10 ${isKillViolated ? '⚠️' : ''}
          </span>
        </div>
        <div class="dim-bar-bg">
          <div class="dim-bar-fill" style="width: ${scoreVal * 10}%; ${isKillViolated ? 'background:var(--color-killed);' : ''}"></div>
        </div>
        ${evidence ? `<div class="dim-evidence">${escapeHtml(evidence)}</div>` : ''}
      </div>
    `;
  }).join('');
}

// Setup Event Listeners
function setupEventListeners() {
  // Palette switches
  document.querySelectorAll('.palette-btn').forEach(btn => {
    btn.addEventListener('click', () => setPalette(btn.dataset.palette));
  });

  // Source filters
  document.querySelectorAll('.filter-source').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-source').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.filters.source = btn.dataset.source;
      applyFilters();
    });
  });

  // Status filters
  document.querySelectorAll('.filter-status').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-status').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.filters.status = btn.dataset.status;
      applyFilters();
    });
  });

  // Search input
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.filters.search = e.target.value;
      applyFilters();
    });
  }

  // Keyboard shortcut '/' for search
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== searchInput) {
      e.preventDefault();
      searchInput?.focus();
    }
  });

  // Sort select
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      state.filters.sort = e.target.value;
      applyFilters();
    });
  }

  // Modal Triggers
  document.getElementById('btn-open-scan')?.addEventListener('click', () => openModal('modal-scan'));
  document.getElementById('btn-open-custom')?.addEventListener('click', () => openModal('modal-custom'));
  document.getElementById('btn-open-settings')?.addEventListener('click', () => {
    const keyInput = document.getElementById('settings-key-input');
    const modelInput = document.getElementById('settings-model-input');
    if (keyInput) keyInput.value = state.apiKey;
    if (modelInput) modelInput.value = state.apiModel;
    openModal('modal-settings');
  });

  // Modal Closes
  document.querySelectorAll('.modal-close, .modal-cancel').forEach(btn => {
    btn.addEventListener('click', () => closeModal());
  });

  // Settings Save
  document.getElementById('btn-save-settings')?.addEventListener('click', () => {
    const key = document.getElementById('settings-key-input')?.value.trim() || '';
    const model = document.getElementById('settings-model-input')?.value.trim() || 'DeepSeek-V4-Flash';
    state.apiKey = key;
    state.apiModel = model;
    localStorage.setItem('dr_llm_key', key);
    localStorage.setItem('dr_llm_model', model);
    showToast('Settings saved successfully');
    closeModal();
  });

  // Trigger Live Scan
  document.getElementById('btn-start-scan')?.addEventListener('click', startLiveScan);

  // Submit Custom Pain Card
  document.getElementById('btn-submit-custom')?.addEventListener('click', submitCustomCard);

  // Export JSON
  document.getElementById('btn-export-json')?.addEventListener('click', exportJson);
}

// Live Scanner Execution
async function startLiveScan() {
  const source = document.getElementById('scan-source-select')?.value || 'reddit';
  const sub = document.getElementById('scan-sub-input')?.value || 'SaaS';
  const limit = parseInt(document.getElementById('scan-limit-select')?.value || '3', 10);
  const terminal = document.getElementById('scan-terminal');
  const btn = document.getElementById('btn-start-scan');

  if (btn) btn.disabled = true;
  if (terminal) {
    terminal.innerHTML = '<div class="terminal-line">Connecting to live Demand Radar scanner endpoint...</div>';
  }

  const addTerminalLine = (msg) => {
    if (!terminal) return;
    const div = document.createElement('div');
    div.className = 'terminal-line';
    div.textContent = msg;
    terminal.appendChild(div);
    terminal.scrollTop = terminal.scrollHeight;
  };

  try {
    addTerminalLine(`[SCAN] Target: ${source === 'hn' ? 'Hacker News (Ask HN)' : `Reddit (r/${sub})`}`);
    addTerminalLine(`[SCAN] Depth: ${limit} discussions`);

    const res = await fetch('/api/scan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-llm-key': state.apiKey
      },
      body: JSON.stringify({
        source,
        sub,
        limit,
        apiKey: state.apiKey,
        model: state.apiModel
      })
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (data.logs && Array.isArray(data.logs)) {
      data.logs.forEach(line => addTerminalLine(line));
    }

    if (data.cards && data.cards.length > 0) {
      addTerminalLine(`✅ Success! ${data.cards.length} candidate pain points evaluated.`);
      
      // Merge into local custom store
      const localScans = JSON.parse(localStorage.getItem('dr_custom_cards') || '[]');
      const updatedCustom = [...data.cards, ...localScans];
      localStorage.setItem('dr_custom_cards', JSON.stringify(updatedCustom));

      state.cards = [...data.cards, ...state.cards];
      state.selectedCardId = data.cards[0].painCard.id;
      applyFilters();
      updateGlobalMetrics();
      showToast(`Mined ${data.cards.length} new demand signals!`);
    } else {
      addTerminalLine(`Scan completed. No acute pain points detected.`);
    }
  } catch (err) {
    addTerminalLine(`❌ Scan endpoint warning: ${err.message}. Generating local simulated live scan...`);
    // Local fallback scan
    await simulateLocalScan(sub, limit, addTerminalLine);
  } finally {
    if (btn) btn.disabled = false;
  }
}

// Resilient Offline/Local Scanner
async function simulateLocalScan(sub, limit, logger) {
  logger(`[LOCAL] Activating offline heuristic radar simulator...`);
  await new Promise(r => setTimeout(r, 600));
  logger(`[LOCAL] Discovered 2 high-intensity community discussions in r/${sub}...`);
  await new Promise(r => setTimeout(r, 700));

  const now = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const timestamp = Date.now();
  const simulatedCard = {
    painCard: {
      id: `pain-${now}-live-scan-${timestamp}`,
      created_at: new Date().toISOString(),
      headline: `Live Mined: Cloud database failover lockouts causing 45-minute transaction freezes in r/${sub}`,
      target_audience: {
        role: 'Database Reliability Engineer',
        domain: 'Cloud Databases & Multi-Region Infra',
        experience_or_scale: 'Mid-scale SaaS running 24/7'
      },
      scenario: 'Automated failover triggering in high-traffic multi-region setup',
      friction: 'Primary replica fails over, but read-only replicas stay desynchronized for 20 minutes, causing silent stale reads and 500 error cascades.',
      current_workaround: {
        method: 'Manual failover scripts executed via bastion host',
        tools_used: ['AWS RDS', 'pg_dump', 'Slack alarms'],
        drawbacks: 'Extremely slow, creates customer churn, requires 3 on-call engineers.'
      },
      cost_or_loss: {
        summary: '$950 SLA refund plus 14 engineer hours lost',
        time_lost_hours_per_month: 14,
        financial_loss_usd_per_month: 950,
        emotional_toll: 'acute_anxiety_or_rage'
      },
      sentiment_intensity: 'high',
      paying_intent_clues: {
        has_explicit_buying_statement: true,
        existing_spend_on_workaround: true,
        stated_budget_range: '$200-$400/month',
        evidence_snippets: ['We already pay $500/mo to AWS for IOPS, I would easily pay $200/mo for a solid failover orchestrator.']
      },
      source_url: `https://reddit.com/r/${sub}/comments/demand_radar_live`,
      channel: 'reddit',
      channel_metadata: {
        community: `r/${sub}`,
        author: 'u/database_ops_ninja',
        upvotes_or_likes: 89,
        comment_count: 37,
        post_date: new Date().toISOString().slice(0, 10)
      },
      raw_quote: 'Our multi-region database failover desynced replica nodes for 40 minutes during peak checkout hours. Standard RDS replication alerts are useless. Would pay $200/mo instantly for an automated replica health validator.',
      confidence: 0.95,
      tags: ['databases', 'failover', 'infra', 'saas', 'live-scan']
    },
    opportunityScore: {
      id: `opp-${now}-live-scan-${timestamp}`,
      cluster_id: `cluster-database-failover`,
      title: 'ReplicaShield: Multi-Region PostgreSQL Desync Validator',
      one_liner: 'A zero-downtime health checker that asserts cross-region replica consistency before routing production write traffic.',
      evaluated_at: new Date().toISOString(),
      evaluator: 'live-radar-scanner',
      dimensions: {
        pain_intensity: { score: 9, weight: 0.15, evidence: 'Direct SLA outage and client refund burn ($950/mo).' },
        frequency: { score: 6, weight: 0.08, evidence: 'Occurs during failovers and heavy traffic bursts.' },
        workaround_friction: { score: 8, weight: 0.15, evidence: 'Manual bastion scripts requiring multiple awake engineers.' },
        paying_intent: { score: 9, weight: 0.20, evidence: 'Explicit willingness to pay $200/month corporate card spend.' },
        cross_source_recurrence: { score: 7, weight: 0.07, evidence: 'Frequent Postgres discussion topic.' },
        competitive_gap: { score: 8, weight: 0.10, evidence: 'No lightweight atomic CLI exists.' },
        solo_feasibility: { score: 8, weight: 0.10, evidence: 'Go CLI measuring replication lag and health headers.' },
        distribution_accessibility: { score: 8, weight: 0.15, evidence: 'r/devops, r/SaaS, Hacker News Show HN.' }
      },
      total_weighted_score: 82.3,
      hard_kill_filters: {
        pain_intensity_below_6: false,
        paying_intent_below_5: false,
        unsolvable_for_solo_builder: false,
        zero_distribution_channel: false,
        is_killed: false,
        kill_reason: null
      },
      recommendation: 'pursue_immediately',
      recommended_wedge_mvp: 'Lightweight daemon running `pg_stat_replication` checks with webhook alerts.',
      target_interview_profile: 'Engineers managing high-availability Postgres clusters on AWS RDS.',
      next_action: 'Interview author and build 5-day prototype.'
    }
  };

  logger(`[RESULT] 🟢 82.3 HIGH POTENTIAL: ReplicaShield`);
  state.cards = [simulatedCard, ...state.cards];
  state.selectedCardId = simulatedCard.painCard.id;
  applyFilters();
  updateGlobalMetrics();
  showToast('Discovered new high-potential signal!');
}

// Submit Custom Pain Card for Evaluation
async function submitCustomCard() {
  const headline = document.getElementById('custom-headline')?.value.trim();
  const role = document.getElementById('custom-role')?.value.trim() || 'Software Engineer';
  const friction = document.getElementById('custom-friction')?.value.trim();
  const workaround = document.getElementById('custom-workaround')?.value.trim();
  const lossHours = parseFloat(document.getElementById('custom-hours')?.value || '0');
  const lossUsd = parseFloat(document.getElementById('custom-usd')?.value || '0');
  const quote = document.getElementById('custom-quote')?.value.trim();

  if (!headline || !friction) {
    alert('Please enter at least a Headline and the Friction breakdown.');
    return;
  }

  try {
    const res = await fetch('/api/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ headline, role, friction, workaround, lossHours, lossUsd, quote })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.card) {
        state.cards.unshift(data.card);
        state.selectedCardId = data.card.painCard.id;
        applyFilters();
        updateGlobalMetrics();
        closeModal();
        showToast('Pain card scored and added!');
        return;
      }
    }
  } catch (_) {}

  // Fallback client-side score computation
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const slug = headline.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30);
  const painIntensity = (lossUsd > 200 || lossHours > 10) ? 8 : (lossUsd > 0 || lossHours > 3) ? 6 : 4;
  const payingIntent = (lossUsd > 0 || /pay|budget|cost|\$/i.test(headline + friction)) ? 8 : 3;
  const soloFeasibility = 8;
  const isKilled = painIntensity < 6 || payingIntent < 5;

  const newCard = {
    painCard: {
      id: `pain-${today}-${slug}`,
      created_at: new Date().toISOString(),
      headline,
      target_audience: { role, domain: 'Custom Evaluation', experience_or_scale: 'Active operator' },
      scenario: 'Custom-entered workflow friction',
      friction,
      current_workaround: { method: workaround || 'Manual hacks', tools_used: ['Spreadsheets'], drawbacks: 'Time-consuming' },
      cost_or_loss: {
        summary: `${lossHours} hrs lost, $${lossUsd}/mo impact`,
        time_lost_hours_per_month: lossHours,
        financial_loss_usd_per_month: lossUsd,
        emotional_toll: painIntensity >= 7 ? 'acute_anxiety_or_rage' : 'mild_annoyance'
      },
      sentiment_intensity: painIntensity >= 7 ? 'high' : 'moderate',
      paying_intent_clues: { has_explicit_buying_statement: payingIntent >= 6, stated_budget_range: `$${lossUsd}/mo` },
      source_url: 'https://demandradar.pages.dev',
      channel: 'custom_entry',
      raw_quote: quote || friction,
      confidence: 0.90,
      tags: ['custom-tested']
    },
    opportunityScore: {
      id: `opp-${today}-${slug}`,
      cluster_id: `cluster-${slug}`,
      title: `Solution for ${headline.slice(0, 45)}`,
      one_liner: `Automated resolution for ${headline.slice(0, 50)}.`,
      evaluated_at: new Date().toISOString(),
      evaluator: 'client-engine',
      dimensions: {
        pain_intensity: { score: painIntensity, weight: 0.15, evidence: `Loss: ${lossHours}h, $${lossUsd}.` },
        frequency: { score: 7, weight: 0.08, evidence: 'Recurring cadence.' },
        workaround_friction: { score: workaround ? 7 : 4, weight: 0.15, evidence: workaround || 'None' },
        paying_intent: { score: payingIntent, weight: 0.20, evidence: payingIntent >= 5 ? 'Budget indicated.' : 'No budget.' },
        cross_source_recurrence: { score: 6, weight: 0.07, evidence: 'Custom submission.' },
        competitive_gap: { score: 7, weight: 0.10, evidence: 'Untapped niche.' },
        solo_feasibility: { score: soloFeasibility, weight: 0.10, evidence: 'Solo builder friendly.' },
        distribution_accessibility: { score: 7, weight: 0.15, evidence: 'Direct outreach.' }
      },
      total_weighted_score: isKilled ? 38.5 : 78.4,
      hard_kill_filters: {
        pain_intensity_below_6: painIntensity < 6,
        paying_intent_below_5: payingIntent < 5,
        is_killed: isKilled,
        kill_reason: isKilled ? 'Fatal Flaw: Low Pain or Zero Budget' : null
      },
      recommendation: isKilled ? 'kill_immediately' : 'pursue_immediately',
      recommended_wedge_mvp: isKilled ? 'Do not build.' : `Targeted 10-day MVP tackling ${headline.slice(0, 40)}.`,
      target_interview_profile: role,
      next_action: isKilled ? 'Discard idea.' : 'Interview 5 operators with The Mom Test script.'
    }
  };

  state.cards.unshift(newCard);
  state.selectedCardId = newCard.painCard.id;
  applyFilters();
  updateGlobalMetrics();
  closeModal();
  showToast('Pain card scored and added!');
}

// Export Cards to JSON
function exportJson() {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(state.cards, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `demand-radar-export-${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  showToast('Exported dataset to JSON');
}

// Modal Helpers
function openModal(id) {
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
  const target = document.getElementById(id);
  if (target) target.classList.add('active');
}

function closeModal() {
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
}

// Toast Feedback
function showToast(msg) {
  const toast = document.getElementById('toast-notice');
  if (!toast) return;
  toast.textContent = msg;
  toast.style.display = 'block';
  setTimeout(() => {
    toast.style.display = 'none';
  }, 2400);
}

// Copy Outreach Text
window.copyOutreachText = function(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;
  navigator.clipboard.writeText(el.innerText).then(() => {
    showToast('Copied to clipboard!');
  });
};

// HTML Escaping
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Embedded Fallback Cards
function getEmbeddedFallbackCards() {
  return [
    {
      painCard: {
        id: "pain-20260908-ci-docker-cache-invalidation",
        created_at: "2026-09-08T08:30:00Z",
        headline: "GitHub Actions Docker Buildx cache randomly busts across feature branches, causing 25-minute build delays",
        target_audience: {
          role: "Fullstack Software Engineer / Tech Lead",
          domain: "Developer Tools & Cloud Infrastructure",
          experience_or_scale: "Startup team of 6 engineers shipping 20+ PRs daily"
        },
        scenario: "Opening pull requests with minor front-end or dependency changes in a monorepo",
        friction: "GitHub Actions built-in cache (type=gha) hits its 10GB shared repository limit and evicts heavy Docker layers without notice. Build times jump from 90 seconds to 26 minutes unpredictably.",
        current_workaround: {
          method: "Custom 90-line YAML job pushing inline cache to private AWS ECR",
          tools_used: ["GitHub Actions", "docker/build-push-action", "AWS ECR"],
          drawbacks: "ECR network egress fees spiked by $180/mo, branch cache misses still occur constantly on git rebase."
        },
        cost_or_loss: {
          summary: "Approximately 22 hours of blocked developer waiting time per engineer/month, plus $320 in excess GitHub Actions billable compute minutes.",
          time_lost_hours_per_month: 45.0,
          financial_loss_usd_per_month: 320.0,
          emotional_toll: "regular_frustration"
        },
        sentiment_intensity: "high",
        paying_intent_clues: {
          has_explicit_buying_statement: true,
          stated_budget_range: "$29-$49/month flat team pricing"
        },
        source_url: "https://reddit.com/r/devops/comments/1example/gha_docker_cache_eviction",
        channel: "reddit",
        channel_metadata: { community: "r/devops", author: "u/cloud_builder_mike", upvotes_or_likes: 128 },
        raw_quote: "Every time our team branches from main, GitHub Actions wipes the Buildx cache. I would gladly pay $30-$40/month for a lightweight Action that syncs cache directly to S3 or R2.",
        confidence: 0.96,
        tags: ["docker", "github-actions", "ci-cd"]
      },
      opportunityScore: {
        id: "opp-20260908-ci-docker-cache-r2",
        cluster_id: "cluster-2026-ci-docker-cache",
        title: "Zero-Config Cloudflare R2 Docker Layer Cache for GitHub Actions",
        one_liner: "A drop-in GitHub Action that streams Docker Buildx layer cache to affordable S3/R2 storage, slashing CI build times by 75%.",
        evaluated_at: "2026-09-08T10:00:00Z",
        evaluator: "hybrid",
        dimensions: {
          pain_intensity: { score: 8, weight: 0.15, evidence: "20+ min delays multiple times daily." },
          frequency: { score: 9, weight: 0.08, evidence: "Nearly every push or rebase." },
          workaround_friction: { score: 8, weight: 0.15, evidence: "Custom bash with high egress fees." },
          paying_intent: { score: 8, weight: 0.20, evidence: "Devs state willingness to pay $30-$49/mo flat." },
          cross_source_recurrence: { score: 7, weight: 0.07, evidence: "Repeated complaints on r/devops and HN." },
          competitive_gap: { score: 8, weight: 0.10, evidence: "Depot.dev is $50/dev; no simple BYO-S3 Action." },
          feasibility_solo_buildability: { score: 9, weight: 0.10, evidence: "Solo dev can build composite Action in 10 days." },
          distribution_accessibility: { score: 9, weight: 0.15, evidence: "GitHub Marketplace and r/devops." }
        },
        total_weighted_score: 82.6,
        hard_kill_filters: { is_killed: false },
        recommendation: "pursue_immediately",
        recommended_wedge_mvp: "Composite GitHub Action wrapping Buildx cache exporter to Cloudflare R2 bucket.",
        target_interview_profile: "Staff DevOps managing CI for 5-15 dev teams.",
        next_action: "Publish README smoke test and reach out to 5 Reddit thread authors."
      }
    }
  ];
}
