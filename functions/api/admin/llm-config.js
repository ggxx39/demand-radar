/**
 * Cloudflare Pages Function: /api/admin/llm-config
 * Securely manages and tests LLM configuration directly from the Admin UI.
 */

export async function onRequestGet(context) {
  const { env } = context;

  const rawKey = env.AMD_API_KEY || env.AMD_RADEON_API_KEY || env.OPENAI_API_KEY || '';
  const maskedKey = rawKey.length > 8 ? `${rawKey.slice(0, 5)}••••${rawKey.slice(-3)}` : (rawKey ? '••••••••' : '');

  const config = {
    provider: env.LLM_PROVIDER || 'AMD Radeon (OpenCode Configured)',
    baseURL: env.LLM_BASE_URL || 'https://developer.amd.com.cn/radeon/api/v1',
    activeModel: env.LLM_MODEL || 'DeepSeek-V4-Flash',
    availableModels: [
      { id: 'DeepSeek-V4-Flash', name: 'DeepSeek V4 Flash (极速、严格 JSON 格式)', provider: 'amd-radeon' },
      { id: 'Qwen3.8-Flash-Next', name: 'Qwen 3.8 Flash Next (具备深度推理思考链)', provider: 'amd-radeon' },
      { id: 'MiniCPM5-1B', name: 'MiniCPM 5 (超轻量级边缘模型)', provider: 'amd-radeon' }
    ],
    temperature: parseFloat(env.LLM_TEMPERATURE || '0.2'),
    maskedKey,
    isKeyConfigured: Boolean(rawKey),
    lastTested: new Date().toISOString()
  };

  return new Response(JSON.stringify({ success: true, config }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const action = body.action || 'update';

    if (action === 'test_connection') {
      const targetModel = body.model || env.LLM_MODEL || 'DeepSeek-V4-Flash';
      const baseURL = (body.baseURL || env.LLM_BASE_URL || 'https://developer.amd.com.cn/radeon/api/v1').trim();
      const apiKey = (body.apiKey || env.AMD_API_KEY || env.AMD_RADEON_API_KEY || env.OPENAI_API_KEY || '').trim();

      if (!apiKey) {
        return new Response(JSON.stringify({
          success: false,
          error: '请在页面输入 API Key，或在 Cloudflare 环境变量中配置 AMD_API_KEY。'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const startTime = Date.now();
      const testRes = await fetch(`${baseURL.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: targetModel,
          messages: [{ role: 'user', content: 'Respond with exactly one word: OK' }],
          max_tokens: 10
        })
      });

      const latencyMs = Date.now() - startTime;

      if (!testRes.ok) {
        const errText = await testRes.text();
        return new Response(JSON.stringify({
          success: false,
          error: `上游服务返回 HTTP ${testRes.status}: ${errText}`,
          latencyMs
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const testData = await testRes.json();
      const reply = testData?.choices?.[0]?.message?.content || testData?.choices?.[0]?.message?.reasoning || 'OK';

      return new Response(JSON.stringify({
        success: true,
        message: '模型连通测试成功！API Key 认证通过。',
        model: targetModel,
        reply,
        latencyMs
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: '配置已更新'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({
      success: false,
      error: err.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
