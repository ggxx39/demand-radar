/**
 * Demand Radar // Admin Control Center Script
 * macOS Style Settings Interactivity & API Communications
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Sidebar Navigation
  const navButtons = document.querySelectorAll('.sidebar-item');
  const sections = document.querySelectorAll('.settings-section');

  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      navButtons.forEach(b => b.classList.remove('active'));
      sections.forEach(s => s.classList.remove('active'));

      btn.classList.add('active');
      const targetId = btn.getAttribute('data-target');
      const targetSection = document.getElementById(targetId);
      if (targetSection) targetSection.classList.add('active');
    });
  });

  // 2. Load LLM Configuration
  const providerLabel = document.getElementById('label-provider');
  const baseURLlabel = document.getElementById('label-baseurl');
  const keyStatusLabel = document.getElementById('label-key-status');
  const selectActiveModel = document.getElementById('select-active-model');
  const btnTestLLM = document.getElementById('btn-test-llm');
  const llmTestResult = document.getElementById('llm-test-result');

  async function loadLLMConfig() {
    try {
      const res = await fetch('/api/admin/llm-config');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success && data.config) {
        const c = data.config;
        if (providerLabel) providerLabel.textContent = c.provider;
        if (baseURLlabel) baseURLlabel.textContent = c.baseURL;
        if (keyStatusLabel) keyStatusLabel.textContent = `Key Configured (${c.maskedKey})`;
        if (selectActiveModel && c.activeModel) {
          selectActiveModel.value = c.activeModel;
        }
      }
    } catch (err) {
      console.warn('Could not load remote LLM config, using default AMD Radeon parameters:', err.message);
    }
  }

  loadLLMConfig();

  // 3. Ping / Test LLM Connection
  if (btnTestLLM) {
    btnTestLLM.addEventListener('click', async () => {
      const model = selectActiveModel ? selectActiveModel.value : 'DeepSeek-V4-Flash';
      btnTestLLM.disabled = true;
      btnTestLLM.innerHTML = '<span>⏳</span> Pinging...';
      if (llmTestResult) {
        llmTestResult.style.display = 'block';
        llmTestResult.textContent = `Connecting to AMD Radeon upstream API (${model})...\nWaiting for response...`;
      }

      try {
        const res = await fetch('/api/admin/llm-config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'test_connection', model })
        });
        const result = await res.json();
        btnTestLLM.disabled = false;
        btnTestLLM.innerHTML = '<span>⚡</span> Ping Model';

        if (result.success) {
          llmTestResult.textContent = `[SUCCESS] ${result.message}\n• Model: ${result.model}\n• Latency: ${result.latencyMs} ms\n• Model Reply: "${result.reply}"\n• Status: HTTP 200 OK`;
        } else {
          llmTestResult.textContent = `[ERROR] Failed to reach model:\n${result.error || 'Unknown error'}`;
        }
      } catch (err) {
        btnTestLLM.disabled = false;
        btnTestLLM.innerHTML = '<span>⚡</span> Ping Model';
        if (llmTestResult) {
          llmTestResult.textContent = `[CONNECTION ERROR] ${err.message}`;
        }
      }
    });
  }

  // 4. Radar Community Scanner
  const btnRunScan = document.getElementById('btn-run-scan');
  const scanTarget = document.getElementById('scan-target');
  const scanLimit = document.getElementById('scan-limit');
  const scanTerminal = document.getElementById('scan-terminal');

  if (btnRunScan) {
    btnRunScan.addEventListener('click', async () => {
      const target = scanTarget ? scanTarget.value : 'r/SaaS';
      const limit = scanLimit ? scanLimit.value : '5';
      let source = 'reddit';
      let sub = 'SaaS';

      if (target === 'hn:ask') {
        source = 'hn';
      } else {
        sub = target.replace('r/', '');
      }

      btnRunScan.disabled = true;
      btnRunScan.innerHTML = '<span>⏳</span> Scanning...';
      if (scanTerminal) {
        scanTerminal.textContent = `[SCAN INITIATED] Target: ${target}, Batch: ${limit} discussions...\nContacting community API and streaming discussions into inference pipeline...\n`;
      }

      try {
        const res = await fetch('/api/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source,
            sub,
            limit: parseInt(limit, 10),
            model: selectActiveModel ? selectActiveModel.value : 'DeepSeek-V4-Flash'
          })
        });

        const data = await res.json();
        btnRunScan.disabled = false;
        btnRunScan.innerHTML = '<span>🚀</span> Start Radar Scan';

        if (data.success) {
          let output = `[SCAN COMPLETE] Harvested & evaluated ${data.totalScanned || limit} discussions.\n\n`;
          if (data.cards && data.cards.length > 0) {
            data.cards.forEach((item, idx) => {
              const p = item.painCard;
              const s = item.opportunityScore;
              const badge = s.is_killed ? '[KILLED]' : `[SCORE: ${s.total_score || s.total_weighted_score}]`;
              output += `(${idx + 1}) ${badge} ${p.headline}\n    Friction: ${p.friction ? p.friction.slice(0, 90) : ''}...\n    MVP: ${s.recommended_wedge_mvp || 'None'}\n\n`;
            });
          } else {
            output += 'No high-friction complaints identified in this batch.\n';
          }
          scanTerminal.textContent = output;
          loadCurationCards(); // refresh card list
        } else {
          scanTerminal.textContent = `[SCAN ERROR] ${data.error || 'Failed to complete scan'}`;
        }
      } catch (err) {
        btnRunScan.disabled = false;
        btnRunScan.innerHTML = '<span>🚀</span> Start Radar Scan';
        if (scanTerminal) {
          scanTerminal.textContent = `[NETWORK ERROR] ${err.message}`;
        }
      }
    });
  }

  // 5. Card Curation Management
  const curationList = document.getElementById('curation-list');

  async function loadCurationCards() {
    if (!curationList) return;
    try {
      const res = await fetch('/api/cards');
      const data = await res.json();
      const cards = data.cards || [];

      if (cards.length === 0) {
        curationList.innerHTML = '<div style="padding:24px; text-align:center; color:var(--text-secondary);">No opportunities found. Run a scan to discover pain points.</div>';
        return;
      }

      // Read hidden cards from localStorage
      const hiddenIds = new Set(JSON.parse(localStorage.getItem('dr_hidden_cards') || '[]'));

      curationList.innerHTML = cards.map((item, idx) => {
        const p = item.painCard;
        const s = item.opportunityScore;
        const scoreVal = (s.total_score || s.total_weighted_score || 0).toFixed(1);
        const isKilled = s.is_killed || s.hard_kill_filters?.is_killed;
        const isVisible = !hiddenIds.has(p.id);

        const statusClass = isKilled ? 'danger' : scoreVal >= 75 ? 'success' : 'warning';
        const statusText = isKilled ? 'Killed' : scoreVal >= 75 ? 'High Potential' : 'Moderate';

        return `
          <div class="curation-item">
            <div class="curation-item-main">
              <div class="curation-item-headline">${p.headline}</div>
              <div class="curation-item-meta">
                <span class="status-pill ${statusClass}">
                  <span class="status-dot"></span>
                  ${statusText} (${scoreVal})
                </span>
                <span>Audience: ${p.target_audience?.role || 'General'}</span>
                <span>Source: ${p.channel || 'web'}</span>
              </div>
            </div>
            <div style="display:flex; align-items:center; gap:12px;">
              <span style="font-size:12px; color:var(--text-secondary);">
                ${isVisible ? 'Published' : 'Hidden'}
              </span>
              <label class="switch">
                <input type="checkbox" class="curation-toggle" data-id="${p.id}" ${isVisible ? 'checked' : ''}>
                <span class="slider"></span>
              </label>
            </div>
          </div>
        `;
      }).join('');

      // Add toggle listeners
      document.querySelectorAll('.curation-toggle').forEach(chk => {
        chk.addEventListener('change', (e) => {
          const cardId = e.target.getAttribute('data-id');
          const currentHidden = new Set(JSON.parse(localStorage.getItem('dr_hidden_cards') || '[]'));
          if (e.target.checked) {
            currentHidden.delete(cardId);
          } else {
            currentHidden.add(cardId);
          }
          localStorage.setItem('dr_hidden_cards', JSON.stringify(Array.from(currentHidden)));
          loadCurationCards();
        });
      });
    } catch (err) {
      curationList.innerHTML = `<div style="padding:24px; color:var(--accent-red);">Error loading cards: ${err.message}</div>`;
    }
  }

  loadCurationCards();

  // 6. Lock / Logout
  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      document.cookie = 'dr_admin_token=; Max-Age=0; path=/;';
      window.location.href = '/';
    });
  }
});
