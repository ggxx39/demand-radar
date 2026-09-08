/**
 * Demand Radar // 需求雷达前台中文应用脚本 (Apple 极简交互)
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

  // 1. 获取卡片数据
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

      // 过滤被后台标记为隐藏的卡片
      const hiddenIds = new Set(JSON.parse(localStorage.getItem('dr_hidden_cards') || '[]'));
      allCards = cards.filter(item => !hiddenIds.has(item.painCard.id));

      updateMetrics();
      renderCards();
    } catch (err) {
      if (cardsContainer) {
        cardsContainer.innerHTML = `<div style="text-align:center; padding:40px; color:var(--text-secondary);">加载机会卡片失败，请刷新重试。</div>`;
      }
    }
  }

  // 2. 指标计数更新
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

  // 3. 渲染机会卡片
  function renderCards() {
    if (!cardsContainer) return;

    const filtered = allCards.filter(item => {
      const s = item.opportunityScore;
      const p = item.painCard;
      const score = s.total_score || s.total_weighted_score || 0;
      const isKilled = s.is_killed || s.hard_kill_filters?.is_killed;

      // 状态筛选
      if (currentStatus === 'high' && (isKilled || score < 75)) return false;
      if (currentStatus === 'moderate' && (isKilled || score >= 75)) return false;
      if (currentStatus === 'killed' && !isKilled) return false;

      // 渠道筛选
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
          <div style="font-size:28px; margin-bottom:8px;">🔍</div>
          <div>当前筛选条件下暂无匹配的商业机会。</div>
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
      const badgeText = isKilled ? '已杀死 · 存在致命硬伤' : score >= 75 ? `${score} 分 · 推荐立即推进` : `${score} 分 · 边际潜力`;

      let channelName = '社区网络';
      if (p.channel?.includes('reddit')) channelName = 'Reddit 讨论区';
      else if (p.channel?.includes('hacker')) channelName = 'Hacker News';
      else if (p.channel?.includes('twitter') || p.channel?.includes('x')) channelName = 'X (Twitter)';

      return `
        <article class="opportunity-card" data-id="${p.id}">
          <div class="card-top-row">
            <div class="card-source-tag">
              <span>●</span>
              <span>${channelName}</span>
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
              <span>目标客群：</span>
              <strong>${p.target_audience?.role || '通用开发者/用户'}</strong>
            </div>
            <div class="card-meta-item">
              <span>当前损失：</span>
              <strong>${p.cost_or_loss?.summary || '大量时间浪费与操作阻碍'}</strong>
            </div>
            <div class="card-meta-item">
              <span>产品假设：</span>
              <strong>${s.title}</strong>
            </div>
          </div>

          <div class="card-actions-row">
            <div style="display:flex; gap:12px; flex-wrap:wrap;">
              <button class="btn-pill primary btn-inspect" data-id="${p.id}">
                <span>📊</span> 8 维商业审计与 MVP
              </button>
              <button class="btn-pill btn-mom-test" data-id="${p.id}">
                <span>💬</span> The Mom Test 访谈提纲
              </button>
            </div>
            ${p.source_url ? `
              <a href="${p.source_url}" target="_blank" class="btn-pill ghost">
                <span>↗</span> 查看原始帖子
              </a>
            ` : ''}
          </div>
        </article>
      `;
    }).join('');

    // 绑定弹窗事件
    document.querySelectorAll('.btn-inspect').forEach(b => {
      b.addEventListener('click', () => openRadarModal(b.getAttribute('data-id')));
    });

    document.querySelectorAll('.btn-mom-test').forEach(b => {
      b.addEventListener('click', () => openMomTestModal(b.getAttribute('data-id')));
    });
  }

  // 4. 模态弹窗处理
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
          8 维商业潜力对抗性审计
        </div>
        <h2 style="font-size:24px; font-weight:600; line-height:1.3; margin-bottom:12px;">${s.title}</h2>
        <p style="font-size:15px; color:var(--text-secondary); line-height:1.5;">${s.one_liner || p.headline}</p>
      </div>

      <div style="display:flex; align-items:center; gap:16px; padding:16px 20px; background:rgba(255,255,255,0.04); border-radius:var(--radius-md); margin-bottom:24px;">
        <div>
          <div style="font-size:28px; font-weight:700; color:${isKilled ? 'var(--accent-red)' : 'var(--accent-green)'};">${score}</div>
          <div style="font-size:11px; color:var(--text-secondary);">综合加权评分 (0-100)</div>
        </div>
        <div style="height:32px; width:1px; background:var(--border-subtle);"></div>
        <div style="font-size:13.5px;">
          ${isKilled ? `
            <span style="color:var(--accent-red); font-weight:600;">🔴 触发一票否决致命硬伤：</span>
            <span style="color:var(--text-secondary);">${s.hard_kill_filters?.kill_reason || '存在难以逾越的商业化或分发阻碍，建议立即放弃。'}</span>
          ` : `
            <span style="color:var(--accent-green); font-weight:600;">🟢 高置信度可验证机会：</span>
            <span style="color:var(--text-secondary);">${s.next_action || '建议立即进入 5-10 人真实用户 Mom Test 访谈验证。'}</span>
          `}
        </div>
      </div>

      <div style="margin-bottom:24px;">
        <h3 style="font-size:13px; text-transform:uppercase; letter-spacing:0.04em; color:var(--text-secondary); margin-bottom:12px;">建议最小切入点 MVP（10 天构建）</h3>
        <div style="padding:16px; background:#0e0e10; border:1px solid var(--border-subtle); border-radius:var(--radius-md); font-size:14px; line-height:1.5;">
          ${s.recommended_wedge_mvp || '无推荐 MVP（该方向已被否决，无需投入工程构建时间）。'}
        </div>
      </div>

      <div>
        <h3 style="font-size:13px; text-transform:uppercase; letter-spacing:0.04em; color:var(--text-secondary); margin-bottom:8px;">目标访谈画像</h3>
        <p style="font-size:14px; color:var(--text-secondary); line-height:1.5;">${s.target_interview_profile || '正在经历该特定工作流摩擦的一线工程师或企业负责人。'}</p>
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
          The Mom Test 客户访谈指南
        </div>
        <h2 style="font-size:24px; font-weight:600; line-height:1.3; margin-bottom:12px;">行为溯源问卷（严禁推销产品）</h2>
        <p style="font-size:14px; color:var(--text-secondary); line-height:1.5;">
          黄金法则：永远不要问“你愿意买这个产品吗？”，只追问他们过去的真实行为、现在的替代方案以及实际付出的金钱与时间代价。
        </p>
      </div>

      <div style="display:flex; flex-direction:column; gap:12px; margin-bottom:28px;">
        <div style="padding:14px 16px; background:rgba(255,255,255,0.03); border-radius:var(--radius-sm); font-size:13.5px;">
          <strong>1.</strong> “你最近一次遇到这个问题是什么时候？当时完整的处理过程是怎样的？”
        </div>
        <div style="padding:14px 16px; background:rgba(255,255,255,0.03); border-radius:var(--radius-sm); font-size:13.5px;">
          <strong>2.</strong> “你现在用什么工具、脚本或人工临时方案来应付它？”
        </div>
        <div style="padding:14px 16px; background:rgba(255,255,255,0.03); border-radius:var(--radius-sm); font-size:13.5px;">
          <strong>3.</strong> “在现有的临时方案中，最耗时、最痛苦、最容易出错的一步是什么？”
        </div>
        <div style="padding:14px 16px; background:rgba(255,255,255,0.03); border-radius:var(--radius-sm); font-size:13.5px;">
          <strong>4.</strong> “你或你们团队之前是否为了解决这个问题付过钱、雇过人或购买过类似工具？”
        </div>
        <div style="padding:14px 16px; background:rgba(255,255,255,0.03); border-radius:var(--radius-sm); font-size:13.5px;">
          <strong>5.</strong> “你还尝试过哪些方案？为什么后来没有继续使用？”
        </div>
      </div>

      <div>
        <h3 style="font-size:13px; text-transform:uppercase; letter-spacing:0.04em; color:var(--text-secondary); margin-bottom:8px;">可直接发送的私信/邮件沟通模版</h3>
        <textarea readonly style="width:100%; height:110px; background:#0c0c0e; border:1px solid var(--border-subtle); border-radius:var(--radius-sm); color:var(--text-primary); font-family:var(--font-sans); font-size:13px; padding:12px; line-height:1.5; resize:none;">你好 ${p.channel_metadata?.author || ''}，看到你在社区关于“${p.headline.slice(0, 45)}...”的讨论。我目前正在深入调研这个具体工作流中的摩擦痛点，绝对不做任何推销。想耽误你 3-5 分钟请教一下你们目前的实际处理方式，方便聊聊吗？</textarea>
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

  // 5. 过滤切换器
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
