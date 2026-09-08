/**
 * Demand Radar // 后台控制中心应用脚本 (macOS 风格中文交互)
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. 侧边栏导航切换
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

  // 2. 读取与页面配置大模型参数
  const inputBaseURL = document.getElementById('input-baseurl');
  const inputApiKey = document.getElementById('input-apikey');
  const btnToggleKey = document.getElementById('btn-toggle-key');
  const btnSaveLLM = document.getElementById('btn-save-llm');
  const selectActiveModel = document.getElementById('select-active-model');
  const btnTestLLM = document.getElementById('btn-test-llm');
  const llmTestResult = document.getElementById('llm-test-result');

  // 从本地 localStorage 加载保存的密钥与 Base URL
  const savedKey = localStorage.getItem('dr_api_key') || '';
  const savedBaseURL = localStorage.getItem('dr_base_url') || '';
  const savedModel = localStorage.getItem('dr_model') || '';

  if (savedKey && inputApiKey) inputApiKey.value = savedKey;
  if (savedBaseURL && inputBaseURL) inputBaseURL.value = savedBaseURL;
  if (savedModel && selectActiveModel) selectActiveModel.value = savedModel;

  // 明文切换
  if (btnToggleKey && inputApiKey) {
    btnToggleKey.addEventListener('click', () => {
      inputApiKey.type = inputApiKey.type === 'password' ? 'text' : 'password';
      btnToggleKey.textContent = inputApiKey.type === 'password' ? '👁️' : '🔒';
    });
  }

  // 保存设置到当前浏览器
  if (btnSaveLLM) {
    btnSaveLLM.addEventListener('click', () => {
      const k = inputApiKey ? inputApiKey.value.trim() : '';
      const b = inputBaseURL ? inputBaseURL.value.trim() : '';
      const m = selectActiveModel ? selectActiveModel.value : '';

      localStorage.setItem('dr_api_key', k);
      localStorage.setItem('dr_base_url', b);
      localStorage.setItem('dr_model', m);

      btnSaveLLM.innerHTML = '<span>✔</span> 已保存';
      setTimeout(() => {
        btnSaveLLM.innerHTML = '<span>💾</span> 保存配置';
      }, 2000);
    });
  }

  async function loadLLMConfig() {
    try {
      const res = await fetch('/api/admin/llm-config');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success && data.config) {
        const c = data.config;
        if (inputBaseURL && !savedBaseURL && c.baseURL) inputBaseURL.value = c.baseURL;
        if (selectActiveModel && !savedModel && c.activeModel) selectActiveModel.value = c.activeModel;
      }
    } catch (err) {
      console.warn('无法读取远程 LLM 配置，采用本地配置:', err.message);
    }
  }

  loadLLMConfig();

  // 3. Ping 探针测试大模型连通性 (优先使用页面输入的 API Key)
  if (btnTestLLM) {
    btnTestLLM.addEventListener('click', async () => {
      const model = selectActiveModel ? selectActiveModel.value : 'DeepSeek-V4-Flash';
      const apiKey = inputApiKey ? inputApiKey.value.trim() : '';
      const baseURL = inputBaseURL ? inputBaseURL.value.trim() : '';

      btnTestLLM.disabled = true;
      btnTestLLM.innerHTML = '<span>⏳</span> 正在测试...';
      if (llmTestResult) {
        llmTestResult.style.display = 'block';
        llmTestResult.textContent = `正在向上游模型 API (${model} via ${baseURL || 'default'})...\n等待模型返回...`;
      }

      try {
        const res = await fetch('/api/admin/llm-config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'test_connection', model, apiKey, baseURL })
        });
        const result = await res.json();
        btnTestLLM.disabled = false;
        btnTestLLM.innerHTML = '<span>⚡</span> Ping 测试模型';

        if (result.success) {
          llmTestResult.textContent = `[测试成功] ${result.message}\n• 当前测试模型: ${result.model}\n• 边缘端往返延迟: ${result.latencyMs} 毫秒\n• 模型回复内容: "${result.reply}"\n• 状态码: HTTP 200 OK`;
        } else {
          llmTestResult.textContent = `[连接错误] 无法连通大模型:\n${result.error || '未知网络错误'}`;
        }
      } catch (err) {
        btnTestLLM.disabled = false;
        btnTestLLM.innerHTML = '<span>⚡</span> Ping 测试模型';
        if (llmTestResult) {
          llmTestResult.textContent = `[网络异常] 请求失败: ${err.message}`;
        }
      }
    });
  }

  // 4. 发起社区扫描
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
      btnRunScan.innerHTML = '<span>⏳</span> 正在扫描中...';
      if (scanTerminal) {
        scanTerminal.textContent = `[扫描已启动] 目标渠道: ${target}，批次上限: ${limit} 篇新讨论...\n正在连接社区接口并流式输入大模型推理管道...\n`;
      }

      try {
        const res = await fetch('/api/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source,
            sub,
            limit: parseInt(limit, 10),
            model: selectActiveModel ? selectActiveModel.value : 'DeepSeek-V4-Flash',
            apiKey: (inputApiKey ? inputApiKey.value.trim() : '') || localStorage.getItem('dr_api_key') || '',
            baseURL: (inputBaseURL ? inputBaseURL.value.trim() : '') || localStorage.getItem('dr_base_url') || ''
          })
        });

        const data = await res.json();
        btnRunScan.disabled = false;
        btnRunScan.innerHTML = '<span>🚀</span> 开始雷达扫描';

        if (data.success) {
          let output = `[扫描完成] 成功抓取并评估 ${data.totalScanned || limit} 条社区讨论。\n\n`;
          if (data.cards && data.cards.length > 0) {
            data.cards.forEach((item, idx) => {
              const p = item.painCard;
              const s = item.opportunityScore;
              const badge = s.is_killed ? '[已杀死淘汰]' : `[评分: ${s.total_score || s.total_weighted_score} 分]`;
              output += `(${idx + 1}) ${badge} ${p.headline}\n    核心阻碍: ${p.friction ? p.friction.slice(0, 90) : ''}...\n    建议切入 MVP: ${s.recommended_wedge_mvp || '无'}\n\n`;
            });
          } else {
            output += '本批次中未发现具备强烈商业摩擦的痛点帖子。\n';
          }
          scanTerminal.textContent = output;
          loadCurationCards(); // 刷新卡片列表
        } else {
          scanTerminal.textContent = `[扫描异常] ${data.error || '扫描任务未能完成'}`;
        }
      } catch (err) {
        btnRunScan.disabled = false;
        btnRunScan.innerHTML = '<span>🚀</span> 开始雷达扫描';
        if (scanTerminal) {
          scanTerminal.textContent = `[网络连接异常] ${err.message}`;
        }
      }
    });
  }

  // 5. 机会卡片发布管理
  const curationList = document.getElementById('curation-list');

  async function loadCurationCards() {
    if (!curationList) return;
    try {
      const res = await fetch('/api/cards');
      const data = await res.json();
      const cards = data.cards || [];

      if (cards.length === 0) {
        curationList.innerHTML = '<div style="padding:24px; text-align:center; color:var(--text-secondary);">暂无机会卡片。请先执行一次雷达扫描。</div>';
        return;
      }

      // 从 localStorage 读取隐藏卡片
      const hiddenIds = new Set(JSON.parse(localStorage.getItem('dr_hidden_cards') || '[]'));

      curationList.innerHTML = cards.map((item, idx) => {
        const p = item.painCard;
        const s = item.opportunityScore;
        const scoreVal = (s.total_score || s.total_weighted_score || 0).toFixed(1);
        const isKilled = s.is_killed || s.hard_kill_filters?.is_killed;
        const isVisible = !hiddenIds.has(p.id);

        const statusClass = isKilled ? 'danger' : scoreVal >= 75 ? 'success' : 'warning';
        const statusText = isKilled ? '已杀死淘汰' : scoreVal >= 75 ? '高潜力' : '边际中等';

        return `
          <div class="curation-item">
            <div class="curation-item-main">
              <div class="curation-item-headline">${p.headline}</div>
              <div class="curation-item-meta">
                <span class="status-pill ${statusClass}">
                  <span class="status-dot"></span>
                  ${statusText} (${scoreVal} 分)
                </span>
                <span>目标客群: ${p.target_audience?.role || '通用'}</span>
                <span>来源: ${p.channel || 'web'}</span>
              </div>
            </div>
            <div style="display:flex; align-items:center; gap:12px;">
              <span style="font-size:12px; color:var(--text-secondary);">
                ${isVisible ? '公开发布' : '已隐藏'}
              </span>
              <label class="switch">
                <input type="checkbox" class="curation-toggle" data-id="${p.id}" ${isVisible ? 'checked' : ''}>
                <span class="slider"></span>
              </label>
            </div>
          </div>
        `;
      }).join('');

      // 绑定切换开关
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
      curationList.innerHTML = `<div style="padding:24px; color:var(--accent-red);">读取机会卡片出错: ${err.message}</div>`;
    }
  }

  loadCurationCards();

  // 6. 锁定退出
  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      document.cookie = 'dr_admin_token=; Max-Age=0; path=/;';
      window.location.href = '/';
    });
  }
});
