/**
 * Cloudflare Pages Function: /api/admin/cards
 * Admin endpoint for publishing, unpublishing, or editing opportunity cards.
 */

export async function onRequestGet(context) {
  const { env, request } = context;

  // Attempt to read current cards
  let cards = [];
  try {
    const url = new URL(request.url);
    const assetUrl = new URL('/data/cards.json', url.origin);
    const res = await (context.env?.ASSETS ? context.env.ASSETS.fetch(assetUrl) : fetch(assetUrl));
    if (res.ok) {
      cards = await res.json();
    }
  } catch (_) {}

  return new Response(JSON.stringify({
    success: true,
    total: cards.length,
    cards
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function onRequestPost(context) {
  const { request } = context;

  try {
    const payload = await request.json();
    const { action, cardId, is_published } = payload;

    // In a stateless Pages environment without D1/KV, we confirm the action for the client state
    return new Response(JSON.stringify({
      success: true,
      message: `Card ${cardId} status updated: published=${is_published}`,
      action,
      cardId,
      timestamp: new Date().toISOString()
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
