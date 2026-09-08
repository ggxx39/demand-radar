/**
 * Demand Radar // Apple Minimalist Public App Script
 */

document.addEventListener('DOMContentLoaded', () => {
  let allCards = [];
  let currentStatus = 'all';
  let currentSource = 'all';

  const cardsContainer = document.getElementById('cards-container');
  const metricTotal = document.getElementById('metric-total');
  const metricHigh = document.getElementById('metric-high');
  const metricKilled = document.getElementById('metric-killed');

  const modalBackdrop = document.getElementById('radar-modal');
  const modalClose = document.getElementById('modal-close');
  const modalContent = document.getElementById('modal-content');

  // 1. Fetch Cards
  async function loadCards() {
    try {
      let cards = [];
      try {
        const res = await fetch('/api/cards');
        if (res.ok) {
          const data = await res.json();
          cards = data.cards || [];
        }
      } catch (_) {}

      if (cards.length === 0) {
        const localRes = await fetch('/data/cards.json');
        if (localRes.ok) cards = await localRes.json();
      }

      // Filter out cards marked as hidden by the admin
      const hiddenIds = new Set(JSON.parse(localStorage.getItem('dr_hidden_cards') || '[]'));
      allCards = cards.filter(item => !hiddenIds.has(item.painCard.id));

      updateMetrics();
      renderCards();
    } catch (err) {
      if (cardsContainer) {
        cardsContainer.innerHTML = `<div style="text-align:center; padding:40px; color:var(--text-secondary);">Could not load opportunity cards. Please refresh.</div>`;
      }
    }
  }

  // 2. Metrics Counter
  function updateMetrics() {
    if (!metricTotal) return;
    const total = allCards.length;
    let high = 0;
    let killed = 0;

    allCards.forEach(c => {
      const s = c.opportunityScore;
      const score = s.total_score || s.total_weighted_score || 0;
      const isKilled = s.is_killed || s.hard_kill_filters?.is_killed;
      if (isKilled) killed++;
      else if (score >= 75) high++;
    });

    metricTotal.textContent = total;
    if (metricHigh) metricHigh.textContent = high;
    if (metricKilled) metricKilled.textContent = killed;
  }

  // 3. Render Cards
  function renderCards() {
    if (!cardsContainer) return;

    const filtered = allCards.filter(item => {
      const s = item.opportunityScore;
      const p = item.painCard;
      const score = s.total_score || s.total_weighted_score || 0;
      const isKilled = s.is_killed || s.hard_kill_filters?.is_killed;

      // Status filter
      if (currentStatus === 'high' && (isKilled || score < 75)) return false;
      if (currentStatus === 'moderate' && (isKilled || score >= 75)) return false;
      if (currentStatus === 'killed' && !isKilled) return false;

      // Source filter
      if (currentSource !== 'all') {
        const channel = (p.channel || '').toLowerCase();
        if (currentSource === 'reddit' && !channel.includes('reddit')) return false;
        if (currentSource === 'hackernews' && !channel.includes('hacker')) return false;
        if (currentSource === 'x_twitter' && !channel.includes('twitter') && !channel.includes('x')) return false;
      }

      return true;
    });

    if (filtered.length === 0) {
      cardsContainer.innerHTML = `
        <div style="text-align:center; padding:64px 20px; color:var(--text-secondary);">
          <div style="font-size:24px; margin-bottom:8px;">🔍</div>
          <div>No opportunities match the selected criteria.</div>
        </div>
      `;
      return;
    }

    cardsContainer.innerHTML = filtered.map(item => {
      const p = item.painCard;
      const s = item.opportunityScore;
      const score = (s.total_score || s.total_weighted_score || 0).toFixed(1);
      const isKilled = s.is_killed || s.hard_kill_filters?.is_killed;

      const badgeClass = isKilled ? 'killed' : score >= 75 ? 'high' : 'moderate';
      const badgeText = isKilled ? 'Killed · Flaw Detected' : score >= 75 ? `${score} · Pursue Immediately` : `${score} · Moderate`;

      const channelLabel = (p.channel || 'community').replace('_', ' ');

      return `
        <article class="opportunity-card" data-id="${p.id}">
          <div class="card-top-row">
            <div class="card-source-tag">
              <span>●</span>
              <span style="text-transform:capitalize;">${channelLabel}</span>
              ${p.channel_metadata?.community ? `<span>/ ${p.channel_metadata.community}</span>` : ''}
            </div>
            <div class="card-score-badge ${badgeClass}">
              ${badgeText}
            </div>
          </div>

          <h2 class="card-headline">${p.headline}</h2>
          <p class="card-friction-text">${p.friction}</p>

          <div class="card-meta-row">
            <div class="card-meta-item">
              <span>Audience:</span>
              <strong>${p.target_audience?.role || 'General'}</strong>
            </div>
            <div class="card-meta-item">
              <span>Cost:</span>
              <strong>${p.cost_or_loss?.summary || 'Wasted hours & frustration'}</strong>
            </div>
            <div class="card-meta-item">
              <span>Hypothesis:</span>
              <strong>${s.title}</strong>
            </div>
          </div>

          <div class="card-actions-row">
            <div style="display:flex; gap:12px; flex-wrap:wrap;">
              <button class="btn-pill primary btn-inspect" data-id="${p.id}">
                <span>📊</span> Inspect Radar & MVP
              </button>
              <button class="btn-pill btn-mom-test" data-id="${p.id}">
                <span>💬</span> The Mom Test Script
              </button>
            </div>
            ${p.source_url ? `
              <a href="${p.source_url}" target="_blank" class="btn-pill ghost">
                <span>↗</span> View Original Thread
              </a>
            ` : ''}
          </div>
        </article>
      `;
    }).join('');

    // Attach button listeners
    document.querySelectorAll('.btn-inspect').forEach(b => {
      b.addEventListener('click', () => openRadarModal(b.getAttribute('data-id')));
    });

    document.querySelectorAll('.btn-mom-test').forEach(b => {
      b.addEventListener('click', () => openMomTestModal(b.getAttribute('data-id')));
    });
  }

  // 4. Modals
  function openRadarModal(cardId) {
    const item = allCards.find(c => c.painCard.id === cardId);
    if (!item) return;

    const p = item.painCard;
    const s = item.opportunityScore;
    const isKilled = s.is_killed || s.hard_kill_filters?.is_killed;
    const score = (s.total_score || s.total_weighted_score || 0).toFixed(1);

    modalContent.innerHTML = `
      <div style="margin-bottom:24px;">
        <div style="font-size:12px; color:var(--accent-blue); font-weight:600; text-transform:uppercase; letter-spacing:0.04em; margin-bottom:8px;">
          8-Dimensional Commercial Opportunity Audit
        </div>
        <h2 style="font-size:24px; font-weight:600; line-height:1.3; margin-bottom:12px;">${s.title}</h2>
        <p style="font-size:15px; color:var(--text-secondary); line-height:1.5;">${s.one_liner || p.headline}</p>
      </div>

      <div style="display:flex; align-items:center; gap:16px; padding:16px 20px; background:rgba(255,255,255,0.04); border-radius:var(--radius-md); margin-bottom:24px;">
        <div>
          <div style="font-size:28px; font-weight:700; color:${isKilled ? 'var(--accent-red)' : 'var(--accent-green)'};">${score}</div>
          <div style="font-size:11px; color:var(--text-secondary);">Composite Score (0-100)</div>
        </div>
        <div style="height:32px; width:1px; background:var(--border-subtle);"></div>
        <div style="font-size:13.5px;">
          ${isKilled ? `
            <span style="color:var(--accent-red); font-weight:600;">🔴 Fatal Flaw Detected:</span>
            <span style="color:var(--text-secondary);">${s.hard_kill_filters?.kill_reason || 'Breached hard viability gates.'}</span>
          ` : `
            <span style="color:var(--accent-green); font-weight:600;">🟢 Viable Opportunity:</span>
            <span style="color:var(--text-secondary);">${s.next_action || 'Ready for customer discovery.'}</span>
          `}
        </div>
      </div>

      <div style="margin-bottom:24px;">
        <h3 style="font-size:14px; text-transform:uppercase; letter-spacing:0.04em; color:var(--text-secondary); margin-bottom:12px;">Recommended Wedge MVP (10-Day Build)</h3>
        <div style="padding:16px; background:#0e0e10; border:1px solid var(--border-subtle); border-radius:var(--radius-md); font-size:14px; line-height:1.5;">
          ${s.recommended_wedge_mvp || 'No wedge MVP recommended (Project marked as killed).'}
        </div>
      </div>

      <div>
        <h3 style="font-size:14px; text-transform:uppercase; letter-spacing:0.04em; color:var(--text-secondary); margin-bottom:12px;">Target Discovery Profile</h3>
        <p style="font-size:14px; color:var(--text-secondary); line-height:1.5;">${s.target_interview_profile || 'Engineers or operators experiencing this specific friction.'}</p>
      </div>
    `;

    modalBackdrop.classList.add('open');
  }

  function openMomTestModal(cardId) {
    const item = allCards.find(c => c.painCard.id === cardId);
    if (!item) return;

    const p = item.painCard;

    modalContent.innerHTML = `
      <div style="margin-bottom:24px;">
        <div style="font-size:12px; color:var(--accent-green); font-weight:600; text-transform:uppercase; letter-spacing:0.04em; margin-bottom:8px;">
          The Mom Test Customer Discovery Guide
        </div>
        <h2 style="font-size:24px; font-weight:600; line-height:1.3; margin-bottom:12px;">Interview Questions (No Future Pitching)</h2>
        <p style="font-size:14px; color:var(--text-secondary); line-height:1.5;">
          Rule: Never ask "Would you buy this?". Ask only about their past behavior, current hacks, and what they actually spent.
        </p>
      </div>

      <div style="display:flex; flex-direction:column; gap:12px; margin-bottom:28px;">
        <div style="padding:14px 16px; background:rgba(255,255,255,0.03); border-radius:var(--radius-sm); font-size:13.5px;">
          <strong>1.</strong> "When was the last time you encountered this issue? Walk me through what happened step-by-step."
        </div>
        <div style="padding:14px 16px; background:rgba(255,255,255,0.03); border-radius:var(--radius-sm); font-size:13.5px;">
          <strong>2.</strong> "What tools, scripts, or manual workarounds do you currently use to bypass it?"
        </div>
        <div style="padding:14px 16px; background:rgba(255,255,255,0.03); border-radius:var(--radius-sm); font-size:13.5px;">
          <strong>3.</strong> "What is the hardest, most aggravating part of that current workaround?"
        </div>
        <div style="padding:14px 16px; background:rgba(255,255,255,0.03); border-radius:var(--radius-sm); font-size:13.5px;">
          <strong>4.</strong> "Have you or your team already spent money or hours trying to fix this?"
        </div>
        <div style="padding:14px 16px; background:rgba(255,255,255,0.03); border-radius:var(--radius-sm); font-size:13.5px;">
          <strong>5.</strong> "What else have you tried that didn't work, and why?"
        </div>
      </div>

      <div>
        <h3 style="font-size:13px; text-transform:uppercase; letter-spacing:0.04em; color:var(--text-secondary); margin-bottom:8px;">Ready-to-Send Outreach Message</h3>
        <textarea readonly style="width:100%; height:110px; background:#0c0c0e; border:1px solid var(--border-subtle); border-radius:var(--radius-sm); color:var(--text-primary); font-family:var(--font-sans); font-size:13px; padding:12px; line-height:1.5; resize:none;">Hey ${p.channel_metadata?.author || 'there'}, saw your post regarding "${p.headline.slice(0, 50)}...". I am researching how teams solve this exact workflow pain point. Not selling anything—would love to ask 3 quick questions about how you currently handle it. Do you have 5 minutes?</textarea>
      </div>
    `;

    modalBackdrop.classList.add('open');
  }

  if (modalClose) {
    modalClose.addEventListener('click', () => {
      modalBackdrop.classList.remove('open');
    });
  }

  if (modalBackdrop) {
    modalBackdrop.addEventListener('click', (e) => {
      if (e.target === modalBackdrop) {
        modalBackdrop.classList.remove('open');
      }
    });
  }

  // 5. Filter Controls
  document.querySelectorAll('#status-filters .seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#status-filters .seg-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentStatus = btn.getAttribute('data-filter');
      renderCards();
    });
  });

  document.querySelectorAll('#source-filters .source-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#source-filters .source-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentSource = btn.getAttribute('data-source');
      renderCards();
    });
  });

  loadCards();
});
