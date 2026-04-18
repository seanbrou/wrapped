import type { ServiceStats } from '../types/index.js';

// ── Insight Templates (fallback when no AI API key) ────────────────────────
const insightTemplates: Record<string, string[]> = {
  spotify: [
    "Your ears logged serious miles this year — that's {minutes} minutes of pure audio immersion.",
    "You discovered {newArtists} new artists. Keep exploring, the rabbit hole goes deep.",
    "{genre} was your soundtrack. Unsurprising, honestly.",
  ],
  apple_health: [
    "{steps} steps? Your shoes deserve a thank-you note.",
    "{workouts} workouts in the books. Consistency is the real flex.",
    "You burned {calories} calories. That's enough energy to power a small car for a day.",
  ],
  strava: [
    "{km} kilometers. Your legs have earned a vacation.",
    "{count} activities recorded. You're not just moving — you're committed.",
    "Your favorite? {sport}. Obviously.",
  ],
  goodreads: [
    "{books} books read. Your TBR pile is probably still taller than you.",
    "{pages} pages flipped. That's some serious page-turning power.",
    "Your reading habits are putting publishers' kids through college.",
  ],
  steam: [
    "{hours} hours of gaming. Sleep? Never heard of her.",
    "{games} games played. Decision fatigue is real.",
    "Your top game kept you up past bedtime. Classic.",
  ],
};

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toString();
}

export function generateTemplateInsights(stats: ServiceStats[]): string[] {
  const insights: string[] = [];

  for (const stat of stats) {
    const templates = insightTemplates[stat.service];
    if (!templates) continue;

    const totals = stat.aggregates.totals;

    let text = pickRandom(templates);
    text = text.replace('{minutes}', formatNumber(totals.totalMinutes || 0));
    text = text.replace('{steps}', formatNumber(totals.totalSteps || 0));
    text = text.replace('{workouts}', formatNumber(totals.workouts || 0));
    text = text.replace('{calories}', formatNumber(totals.calories || 0));
    text = text.replace('{km}', formatNumber(totals.totalDistanceKm || 0));
    text = text.replace('{count}', formatNumber(totals.activityCount || 0));
    text = text.replace('{sport}', (stat.aggregates.streaks.topSport as string) || 'running');
    text = text.replace('{books}', formatNumber(totals.booksRead || 0));
    text = text.replace('{pages}', formatNumber(totals.pagesRead || 0));
    text = text.replace('{hours}', formatNumber(totals.totalHours || 0));
    text = text.replace('{games}', formatNumber(totals.gamesPlayed || 0));
    text = text.replace('{genre}', 'Hip-hop/R&B');
    text = text.replace('{newArtists}', '27');

    insights.push(text);
  }

  return insights.slice(0, 6);
}

// ── OpenAI Integration ───────────────────────────────────────────────────────
export async function generateAIInsights(
  stats: ServiceStats[],
  periodLabel: string
): Promise<string[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return generateTemplateInsights(stats);
  }

  try {
    const { OpenAI } = await import('openai');
    const client = new OpenAI({ apiKey });

    const statsSummary = stats.map(s => {
      const totals = Object.entries(s.aggregates.totals)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');
      const topItems = s.aggregates.top_items
        .map(cat => `top ${cat.category}: ${cat.items.slice(0, 3).map(i => i.name).join(', ')}`)
        .join('; ');
      return `[${s.service}] totals: {${totals}}${topItems ? `; ${topItems}` : ''}`;
    }).join('\n');

    const response = await client.responses.create({
      model: 'gpt-4o',
      input: `You are a witty, cool friend who creates clever year-in-review insights.
Given these stats for a user during ${periodLabel}:
${statsSummary}

Generate exactly 5 short, punchy insight sentences (max 20 words each). Be playful and specific.
Return ONLY a valid JSON array of strings, nothing else. Example: ["insight one","insight two"]`,
      temperature: 0.9,
      max_tokens: 500,
    });

    const text = response.output_text.trim();
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed) && parsed.every(i => typeof i === 'string')) {
      return parsed;
    }
    throw new Error('Invalid AI response format');
  } catch (err) {
    console.error('[insights] OpenAI error, falling back to templates:', err);
    return generateTemplateInsights(stats);
  }
}
