// Cloudflare Pages Function: GET /api/cards
export async function onRequestGet(context) {
  try {
    const url = new URL(context.request.url);
    const source = url.searchParams.get('source');
    const status = url.searchParams.get('status');
    const query = url.searchParams.get('q');

    // Fetch the bundled static cards JSON
    const assetUrl = new URL('/data/cards.json', context.request.url);
    const res = await context.env.ASSETS.fetch(assetUrl);
    if (!res.ok) {
      throw new Error(`Failed to load asset: ${res.status}`);
    }
    let items = await res.json();

    // Filter by channel/source
    if (source && source !== 'all') {
      items = items.filter(item => {
        const ch = (item.painCard.channel || '').toLowerCase();
        if (source === 'reddit') return ch.includes('reddit');
        if (source === 'hn' || source === 'hackernews') return ch.includes('hacker') || ch.includes('hn');
        if (source === 'github') return ch.includes('github');
        if (source === 'twitter' || source === 'x') return ch.includes('twitter') || ch.includes('x');
        return true;
      });
    }

    // Filter by status
    if (status && status !== 'all') {
      items = items.filter(item => {
        const isKilled = item.opportunityScore.hard_kill_filters?.is_killed || item.opportunityScore.is_killed;
        const score = item.opportunityScore.total_weighted_score || item.opportunityScore.total_score || 0;
        if (status === 'killed') return isKilled;
        if (status === 'high') return !isKilled && score >= 75;
        if (status === 'moderate') return !isKilled && score >= 55 && score < 75;
        return true;
      });
    }

    // Filter by search query
    if (query) {
      const q = query.toLowerCase();
      items = items.filter(item => {
        const text = [
          item.painCard.headline,
          item.painCard.friction,
          item.painCard.target_audience?.role,
          item.painCard.target_audience?.domain,
          item.painCard.raw_quote,
          item.opportunityScore.title,
          item.opportunityScore.one_liner,
          (item.painCard.tags || []).join(' ')
        ].join(' ').toLowerCase();
        return text.includes(q);
      });
    }

    return new Response(JSON.stringify({ success: true, count: items.length, cards: items }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
