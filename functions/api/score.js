// Cloudflare Pages Function: POST /api/score
// Evaluates a custom pain card using the 8 Demand Radar dimensions

export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const { headline, role, domain, scenario, friction, workaround, lossHours, lossUsd, quote, source } = body;

    if (!headline || !friction) {
      return new Response(JSON.stringify({ success: false, error: 'Headline and friction description are required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const slug = (headline || 'custom').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30);

    const painIntensity = (lossUsd > 200 || lossHours > 10) ? 8 : (lossUsd > 0 || lossHours > 3) ? 6 : 4;
    const frequency = 7;
    const workaroundFriction = workaround ? 7 : 4;
    const payingIntent = (lossUsd > 0 || /pay|budget|cost|\$/i.test(headline + friction)) ? 8 : 3;
    const crossRecurrence = 6;
    const competitiveGap = 7;
    const soloFeasibility = 8;
    const distribution = 7;

    const isKilled = painIntensity < 6 || payingIntent < 5 || soloFeasibility < 4;
    let killReason = null;
    if (isKilled) {
      if (painIntensity < 6 && payingIntent < 5) {
        killReason = `Fatal Flaw: Low Pain (${painIntensity}/10 < 6) and Zero Budget (${payingIntent}/10 < 5).`;
      } else if (payingIntent < 5) {
        killReason = `Fatal Flaw: Paying Intent (${payingIntent}/10 < 5). Users want this for free.`;
      } else {
        killReason = `Fatal Flaw: Pain Intensity (${painIntensity}/10 < 6) is too mild for a high-converting software wedge.`;
      }
    }

    const dimensions = {
      pain_intensity: { score: painIntensity, weight: 0.15, evidence: `Estimated from hours lost (${lossHours || 0}h) and reported financial burn ($${lossUsd || 0}).` },
      frequency: { score: frequency, weight: 0.08, evidence: 'Estimated typical recurring cadence.' },
      workaround_friction: { score: workaroundFriction, weight: 0.15, evidence: workaround || 'Manual ad-hoc interventions.' },
      paying_intent: { score: payingIntent, weight: 0.20, evidence: payingIntent >= 5 ? 'Explicit monetary cost or stated willingness to spend.' : 'No evidence of existing budget or spend.' },
      cross_source_recurrence: { score: crossRecurrence, weight: 0.07, evidence: 'Cross-channel signal benchmark.' },
      competitive_gap: { score: competitiveGap, weight: 0.10, evidence: 'Unaddressed niche or overpriced incumbent tools.' },
      feasibility_solo_buildability: { score: soloFeasibility, weight: 0.10, evidence: 'Single fullstack dev can build wedge MVP in 1-2 weeks.' },
      distribution_accessibility: { score: distribution, weight: 0.15, evidence: 'Accessible developer/operator communities.' }
    };

    const calculatedScore = Object.values(dimensions).reduce((acc, d) => acc + d.score * d.weight, 0);
    const totalScore = Math.round(calculatedScore * 10 * 10) / 10;

    const newCard = {
      painCard: {
        id: `pain-${today}-${slug}`,
        created_at: new Date().toISOString(),
        headline,
        target_audience: {
          role: role || 'Target User',
          domain: domain || 'General Tech',
          experience_or_scale: 'Active operator'
        },
        scenario: scenario || 'Everyday operational workflow',
        friction,
        current_workaround: {
          method: workaround || 'Manual hacks',
          tools_used: ['Spreadsheets', 'Manual review'],
          drawbacks: 'Time consuming and error-prone'
        },
        cost_or_loss: {
          summary: `${lossHours || 0} hours lost, $${lossUsd || 0}/month financial impact`,
          time_lost_hours_per_month: Number(lossHours) || 0,
          financial_loss_usd_per_month: Number(lossUsd) || 0,
          emotional_toll: painIntensity >= 7 ? 'acute_anxiety_or_rage' : 'regular_frustration'
        },
        sentiment_intensity: painIntensity >= 7 ? 'high' : 'moderate',
        paying_intent_clues: {
          has_explicit_buying_statement: payingIntent >= 6,
          existing_spend_on_workaround: Boolean(lossUsd > 0),
          stated_budget_range: lossUsd > 0 ? `$${Math.round(lossUsd * 0.2)}-$${Math.round(lossUsd * 0.5)}/mo` : '$0',
          evidence_snippets: [quote || headline]
        },
        source_url: source || 'https://demandradar.pages.dev',
        channel: 'custom_entry',
        raw_quote: quote || friction,
        confidence: 0.90,
        tags: ['custom-tested', 'demand-radar']
      },
      opportunityScore: {
        id: `opp-${today}-${slug}`,
        cluster_id: `cluster-${slug}`,
        title: `Automated Solution for ${headline.slice(0, 45)}`,
        one_liner: `A targeted software tool to resolve ${headline.slice(0, 50)}.`,
        evaluated_at: new Date().toISOString(),
        evaluator: 'scoring-engine',
        dimensions,
        total_weighted_score: totalScore,
        hard_kill_filters: {
          pain_intensity_below_6: painIntensity < 6,
          paying_intent_below_5: payingIntent < 5,
          unsolvable_for_solo_builder: soloFeasibility < 4,
          zero_distribution_channel: distribution < 4,
          is_killed: isKilled,
          kill_reason: killReason
        },
        recommendation: isKilled ? 'kill_immediately' : totalScore >= 75 ? 'pursue_immediately' : 'moderate_niche_utility',
        recommended_wedge_mvp: isKilled ? 'Do not build.' : `Targeted 10-day MVP tackling ${headline.slice(0, 40)}.`,
        target_interview_profile: `${role || 'Operators'} facing this exact friction.`,
        next_action: isKilled ? 'Discard this angle.' : 'Conduct 5 Mom Test interviews to verify current spend.'
      }
    };

    return new Response(JSON.stringify({ success: true, card: newCard }), {
      headers: {
        'Content-Type': 'application/json',
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
