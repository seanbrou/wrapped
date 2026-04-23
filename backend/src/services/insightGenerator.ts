import { appConfig } from './config.js';

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

function getGeminiModel() {
  return process.env.GEMINI_MODEL ?? 'gemini-2.5-flash-preview-05-20';
}

function getGeminiApiKey() {
  return process.env.GEMINI_API_KEY ?? '';
}

function hasGeminiCredentials() {
  return Boolean(getGeminiApiKey());
}

export interface InsightContext {
  title: string;
  service: string;
  stats: Record<string, any>;
  period: string;
  previousPeriodStats?: Record<string, any> | null;
  theme?: string;
  allServices?: Array<{ service: string; stats: Record<string, any> }>;
}

export interface ServiceCopySuggestions {
  heroComparison: string;
  insightHeadline: string;
  insightSupportingData: Array<{ label: string; value: string }>;
  shareHeadline: string;
  funFact: string;
  streakHighlight: string;
  trendObservation: string;
  superlative: string;
}

export interface CrossServiceInsight {
  headline: string;
  description: string;
  servicesInvolved: string[];
  cardType: 'cross_service';
}

/* ─── Smart stat extraction ─────────────────────────────────────────── */

function extractTopStats(service: string, stats: Record<string, any>): string[] {
  const agg = stats.aggregates ?? stats;
  const totals = agg.totals ?? {};
  const streaks = agg.streaks ?? {};
  const topItems = agg.top_items ?? [];
  const comparisons = agg.comparisons ?? [];
  const charts = agg.charts ?? [];

  const lines: string[] = [];

  // Extract meaningful totals
  const totalKeys = Object.keys(totals);
  const priorityTotals = [
    'totalHours', 'totalSteps', 'totalDistanceKm', 'totalKarma',
    'tasksCompleted', 'moviesWatched', 'episodesWatched', 'gamesPlayed',
    'starsEarned', 'followers', 'pageCount', 'databaseCount',
    'activityCount', 'workoutCount', 'caloriesBurned', 'activeMinutes',
    'postsSubmitted', 'commentsMade', 'productiveHours', 'distractingHours',
    'tracksTracked', 'recentPlaysSample', 'recentTrackSample', 'recentCompleted',
  ];

  for (const key of priorityTotals) {
    if (totals[key] !== undefined && totals[key] !== null && totals[key] !== 0) {
      lines.push(`${formatKey(key)}: ${formatValue(totals[key])}`);
    }
  }

  // Top items by category
  for (const group of topItems) {
    const items = group.items ?? [];
    if (items.length > 0) {
      const top3 = items.slice(0, 3).map((i: any) => `${i.name} (${formatValue(i.count)})`).join(', ');
      lines.push(`Top ${group.category}: ${top3}`);
    }
  }

  // Streaks
  const streakKeys = Object.keys(streaks);
  for (const key of streakKeys) {
    if (streaks[key] !== undefined && streaks[key] !== null && streaks[key] !== 0 && streaks[key] !== '') {
      lines.push(`${formatKey(key)}: ${formatValue(streaks[key])}`);
    }
  }

  // Comparisons
  if (comparisons.length > 0) {
    const comp = comparisons[0];
    lines.push(`Comparison — ${comp.label}: ${formatValue(comp.current)} now vs ${formatValue(comp.previous)} before`);
  }

  // Chart titles
  if (charts.length > 0) {
    lines.push(`Chart available: ${charts[0].title}`);
  }

  return lines.slice(0, 12);
}

function formatKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .replace(/Km/g, 'km')
    .replace(/Hr/g, 'hr')
    .trim();
}

function formatValue(val: any): string {
  if (typeof val === 'number') {
    if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
    if (val >= 1_000) return `${(val / 1_000).toFixed(1)}K`;
    if (Number.isInteger(val)) return String(val);
    return val.toFixed(1);
  }
  return String(val);
}

/* ─── Prompt builders ───────────────────────────────────────────────── */

function buildServicePrompt(context: InsightContext): string {
  const statsLines = extractTopStats(context.service, context.stats);
  const statsBlock = statsLines.length > 0 ? statsLines.join('\n') : 'Limited data available.';

  const otherServices = context.allServices
    ?.filter((s) => s.service !== context.service)
    .map((s) => s.service)
    .join(', ') ?? 'none';

  return `You are a savagely witty, insight-obsessed data storyteller writing "Wrapped"-style recap copy. Your job is to turn dry stats into genuinely surprising, personality-rich revelations that make someone go "holy shit, that's me."

SERVICE: ${context.service}
PERIOD: ${context.period}
OTHER CONNECTED SERVICES: ${otherServices}

KEY STATS (use these exact numbers):
${statsBlock}

RULES FOR GREAT COPY:
- NEVER write generic garbage like "You had a great year" or "Keep it up"
- ALWAYS use specific numbers and names from the stats above
- Find the ONE weird pattern or extreme stat and lead with it
- Comparisons should be vivid and unexpected (not "like a marathon" — be more creative)
- Tone: confident, slightly irreverent, like a friend who actually pays attention
- If there are multiple services, hint at how they might connect (e.g., music + fitness)

Return ONLY a JSON object with these exact keys (no markdown, no commentary):

{
  "heroComparison": "One bold, specific comparison using actual numbers. Max 14 words. Example: 'Your 847km logged is basically Lisbon to Barcelona. On foot.' NOT 'You walked a lot this year.'",
  "insightHeadline": "A surprising pattern the data reveals. Max 10 words. Example: ' Tuesdays were your power days — 40% of all output' NOT 'You stayed active this year.'",
  "insightSupportingData": [
    { "label": "METRIC 1", "value": "Actual number + unit" },
    { "label": "METRIC 2", "value": "Actual number + unit" },
    { "label": "METRIC 3", "value": "Actual number + unit" }
  ],
  "shareHeadline": "A boast-worthy, specific line they'd screenshot. Max 12 words. Example: 'I ran 847km while vibing to 4,200 minutes of Phoebe Bridgers' NOT 'Check out my year in review.'",
  "funFact": "One absurd or delightful micro-insight. Max 14 words. Example: 'Your longest streak was 23 days — mostly while procrastinating on Reddit'",
  "streakHighlight": "Call out the most impressive streak or consistency pattern. Max 12 words. Example: '47 straight days over 10K steps — including Christmas'",
  "trendObservation": "What direction things went and what that means. Max 14 words. Example: 'Productivity climbed 34% after you quit Twitter in March'",
  "superlative": "The single most extreme or defining stat. Max 12 words. Example: 'Your top artist accounted for 23% of ALL listening'"
}`;
}

function buildCrossServicePrompt(allServices: Array<{ service: string; stats: Record<string, any> }>): string | null {
  if (allServices.length < 2) return null;

  const serviceSummaries = allServices.map((s) => {
    const lines = extractTopStats(s.service, s.stats);
    return `## ${s.service}\n${lines.slice(0, 6).join('\n')}`;
  }).join('\n\n');

  return `You are a connection-obsessed data detective. Given stats from multiple services, find ONE genuinely surprising cross-service insight that nobody would notice without combining the data.

CONNECTED SERVICES:
${serviceSummaries}

RULES:
- Find a real connection between at least 2 services using their actual stats
- The insight should feel like a revelation, not a coincidence
- Be specific with numbers
- If no strong connection exists, create a playful "what if" observation

Return ONLY a JSON object:

{
  "headline": "Max 10 words. Example: 'You ran 300km exclusively to Phoebe Bridgers'",
  "description": "Max 20 words explaining the connection with specific numbers",
  "servicesInvolved": ["service1", "service2"]
}`;
}

/* ─── LLM callers ───────────────────────────────────────────────────── */

async function callGeminiDirect(prompt: string, maxTokens = 2048): Promise<string> {
  const apiKey = getGeminiApiKey();
  const model = getGeminiModel();
  const url = `${GEMINI_BASE_URL}/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.72,
        maxOutputTokens: maxTokens,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'Unknown error');
    throw new Error(`Gemini API error ${response.status}: ${errorBody}`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
      finishReason?: string;
    }>;
    error?: { message?: string };
  };

  if (data.error) {
    throw new Error(`Gemini API error: ${data.error.message ?? 'Unknown'}`);
  }

  const candidate = data.candidates?.[0];
  if (!candidate || candidate.finishReason === 'SAFETY') {
    throw new Error('Gemini response blocked or empty');
  }

  const text = candidate.content?.parts?.[0]?.text ?? '';
  if (!text) {
    throw new Error('Gemini returned empty text');
  }

  return text;
}
async function tryGateway(prompt: string): Promise<string | null> {
  try {
    const { generateText } = await import('ai');
    const response = await generateText({
      model: (await import('ai')).gateway('google/gemini-2.5-flash-lite-preview'),
      prompt,
    });
    return response.text;
  } catch {
    return null;
  }
}

function parseJsonSafely<T>(raw: string): T | null {
  try {
    const cleaned = raw.replace(/^```json\s*|\s*```$/g, '').trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}

/* ─── Smart defaults that interpolate real data ─────────────────────── */

function smartDefaultForService(service: string, stats: Record<string, any>): ServiceCopySuggestions {
  const agg = stats.aggregates ?? stats;
  const totals = agg.totals ?? {};
  const streaks = agg.streaks ?? {};
  const topItems = agg.top_items ?? [];

  const getTop = (category: string) =>
    topItems.find((g: any) => g.category === category)?.items?.[0]?.name ?? 'Unknown';

  const getTopCount = (category: string) =>
    topItems.find((g: any) => g.category === category)?.items?.[0]?.count ?? 0;

  const fmt = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
  };

  const defaults: Record<string, ServiceCopySuggestions> = {
    spotify: {
      heroComparison: `You streamed enough to circle the moon ${fmt(Math.round((totals.totalHours ?? 0) / 5840))} times.`,
      insightHeadline: `${getTop('artists')} owned ${fmt(getTopCount('artists'))} plays of your year.`,
      insightSupportingData: [
        { label: 'TOP ARTIST', value: getTop('artists').toUpperCase() },
        { label: 'TOP GENRE', value: getTop('genres').toUpperCase() },
        { label: 'HOURS', value: `${fmt(totals.totalHours ?? 0)}H` },
      ],
      shareHeadline: `My year sounded like ${getTop('artists')} on repeat.`,
      funFact: `Your top genre accounted for ${fmt(Math.round((getTopCount('genres') / (totals.recentPlaysSample ?? 100)) * 100))}% of sampled plays.`,
      streakHighlight: `${fmt(totals.recentPlaysSample ?? 0)} tracks sampled — and the taste stayed consistent.`,
      trendObservation: `Listening clustered around ${getTop('genres')} with surprising loyalty.`,
      superlative: `${getTop('artists')} dominated ${fmt(Math.round((getTopCount('artists') / (totals.recentPlaysSample ?? 100)) * 100))}% of your plays.`,
    },
    apple_health: {
      heroComparison: `${fmt(totals.totalSteps ?? 0)} steps — that's roughly ${fmt(Math.round((totals.totalSteps ?? 0) / 2000))} marathons.`,
      insightHeadline: `${fmt(totals.tenKStepDays ?? 0)} days you crushed 10,000 steps.`,
      insightSupportingData: [
        { label: 'TOTAL STEPS', value: fmt(totals.totalSteps ?? 0) },
        { label: 'WORKOUTS', value: fmt(totals.workoutCount ?? 0) },
        { label: 'ACTIVE DAYS', value: fmt(totals.activeDays ?? 0) },
      ],
      shareHeadline: `I moved ${fmt(totals.totalSteps ?? 0)} times this year. Literally.`,
      funFact: `Best day: ${fmt(totals.bestDaySteps ?? 0)} steps — probably chasing something.`,
      streakHighlight: `${fmt(streaks.longestExerciseStreak ?? 0)}-day exercise streak kept the momentum alive.`,
      trendObservation: `HealthKit captured ${fmt(totals.activeDays ?? 0)} active days of raw data.`,
      superlative: `${fmt(Math.round(totals.workoutHours ?? 0))} hours of pure sweat equity logged.`,
    },
    strava: {
      heroComparison: `${fmt(Math.round(totals.totalDistanceKm ?? 0))}km — you could have crossed ${totals.totalDistanceKm > 8000 ? 'Asia' : totals.totalDistanceKm > 4000 ? 'the US' : 'Spain'}.`,
      insightHeadline: `${getTop('sports')} dominated across ${fmt(totals.activityCount ?? 0)} activities.`,
      insightSupportingData: [
        { label: 'DISTANCE', value: `${fmt(Math.round(totals.totalDistanceKm ?? 0))} KM` },
        { label: 'MOVING HRS', value: `${fmt(Math.round(totals.totalMovingHours ?? 0))}H` },
        { label: 'ACTIVITIES', value: fmt(totals.activityCount ?? 0) },
      ],
      shareHeadline: `${fmt(Math.round(totals.totalDistanceKm ?? 0))}km logged. One sport at a time.`,
      funFact: `Your pace improved like software shipping on deadline — steadily.`,
      streakHighlight: `${totals.activityCount ?? 0} activities — consistency beats intensity.`,
      trendObservation: `${getTop('sports')} wasn't just exercise, it was identity.`,
      superlative: `${fmt(Math.round(totals.totalMovingHours ?? 0))} hours in motion — that's dedication.`,
    },
    fitbit: {
      heroComparison: `${fmt(totals.totalSteps ?? 0)} steps could lap the equator ${fmt(Math.round((totals.totalSteps ?? 0) / 40_075_000))} times.`,
      insightHeadline: `${fmt(totals.activeMinutes ?? 0)} active minutes kept the year humming.`,
      insightSupportingData: [
        { label: 'STEPS', value: fmt(totals.totalSteps ?? 0) },
        { label: 'CALORIES', value: fmt(totals.caloriesBurned ?? 0) },
        { label: 'ACTIVE MIN', value: fmt(totals.activeMinutes ?? 0) },
      ],
      shareHeadline: `My wrist never lies — ${fmt(totals.totalSteps ?? 0)} steps.`,
      funFact: `Best day: ${fmt(totals.bestDaySteps ?? 0)} steps. Sleep quality: also tracked.`,
      streakHighlight: `Sleep and steps held steady all year long.`,
      trendObservation: `Data shows clear upward momentum across all metrics.`,
      superlative: `${fmt(totals.caloriesBurned ?? 0)} calories torched. Respect.`,
    },
    lastfm: {
      heroComparison: `${fmt(totals.tracksTracked ?? 0)} scrobbles — your music taste is a full-time job.`,
      insightHeadline: `${getTop('artists')} owned your ears this year.`,
      insightSupportingData: [
        { label: 'TOP ARTIST', value: getTop('artists').toUpperCase() },
        { label: 'TRACKS', value: fmt(totals.tracksTracked ?? 0) },
        { label: 'SAMPLED', value: fmt(totals.recentTrackSample ?? 0) },
      ],
      shareHeadline: `${fmt(totals.tracksTracked ?? 0)} scrobbles. One obsession.`,
      funFact: `Your top artist outplayed the next by ${fmt(Math.round((getTopCount('artists') / Math.max(1, getTopCount('artists') / 3)) * 100) - 100)}%.`,
      streakHighlight: `Scrobble streak stayed unbroken through holidays and hangovers.`,
      trendObservation: `Listening habits crystallized around ${getTop('artists')} and never let up.`,
      superlative: `${getTop('artists')} = ${fmt(Math.round((getTopCount('artists') / Math.max(1, totals.recentTrackSample ?? 100)) * 100))}% of sampled plays.`,
    },
    steam: {
      heroComparison: `${fmt(totals.totalHours ?? 0)} hours played — that's ${fmt(Math.round((totals.totalHours ?? 0) / 8760 * 100))}% of an entire year.`,
      insightHeadline: `${getTop('games')} consumed ${fmt(Math.round((getTopCount('games') / Math.max(1, totals.totalHours ?? 1)) * 100))}% of your playtime.`,
      insightSupportingData: [
        { label: 'TOTAL HRS', value: `${fmt(totals.totalHours ?? 0)}H` },
        { label: 'GAMES', value: fmt(totals.gamesPlayed ?? 0) },
        { label: 'TOP GAME', value: getTop('games').toUpperCase() },
      ],
      shareHeadline: `${fmt(totals.totalHours ?? 0)} hours. Zero regrets.`,
      funFact: `${getTop('games')} wasn't just a game — it was a lifestyle.`,
      streakHighlight: `${fmt(totals.gamesPlayed ?? 0)} games touched. One clear favorite.`,
      trendObservation: `Playtime concentrated heavily in ${getTop('games')} — loyalty or addiction?`,
      superlative: `${fmt(totals.totalHours ?? 0)} hours = ${fmt(Math.round((totals.totalHours ?? 0) / 24))} full days of gaming.`,
    },
    github: {
      heroComparison: `${fmt(totals.starsEarned ?? 0)} stars earned — your code speaks louder than your tweets.`,
      insightHeadline: `${getTop('languages')} was your weapon of choice across ${fmt(totals.repositories ?? 0)} repos.`,
      insightSupportingData: [
        { label: 'STARS', value: fmt(totals.starsEarned ?? 0) },
        { label: 'FOLLOWERS', value: fmt(totals.followers ?? 0) },
        { label: 'TOP REPO', value: getTop('repos').toUpperCase() },
      ],
      shareHeadline: `Shipped ${fmt(totals.commits ?? totals.starsEarned ?? 0)} times. Here is the proof.`,
      funFact: `${getTop('languages')} dominated while other languages watched from the bench.`,
      streakHighlight: `Commit graph looked like a skyline — consistent and ambitious.`,
      trendObservation: `Open source activity trended upward with ${getTop('repos')} leading.`,
      superlative: `${fmt(totals.starsEarned ?? 0)} stars — not bad for "just coding."`,
    },
    notion: {
      heroComparison: `${fmt(totals.pageCount ?? 0)} pages — your second brain is getting crowded.`,
      insightHeadline: `${getTop('pages')} was the page that kept pulling you back.`,
      insightSupportingData: [
        { label: 'PAGES', value: fmt(totals.pageCount ?? 0) },
        { label: 'DATABASES', value: fmt(totals.databaseCount ?? 0) },
        { label: 'WORKSPACE', value: (streaks.workspaceName ?? 'NOTION').toUpperCase() },
      ],
      shareHeadline: `Organized ${fmt(totals.pageCount ?? 0)} pages of chaos into clarity.`,
      funFact: `${fmt(totals.databaseCount ?? 0)} databases keeping your life sort-of together.`,
      streakHighlight: `Pages piled up steadily — your brain needed the expansion.`,
      trendObservation: `Workspace rhythm centered on ${getTop('pages')} and ${fmt(totals.databaseCount ?? 0)} databases.`,
      superlative: `${fmt(totals.pageCount ?? 0)} pages indexed — that's novel-length organization.`,
    },
    trakt: {
      heroComparison: `${fmt(totals.totalHours ?? 0)} hours watched — you could have learned ${fmt(Math.round((totals.totalHours ?? 0) / 1000))} new skills.`,
      insightHeadline: `${getTop('shows')} was your screen-time soulmate.`,
      insightSupportingData: [
        { label: 'HOURS', value: `${fmt(totals.totalHours ?? 0)}H` },
        { label: 'MOVIES', value: fmt(totals.moviesWatched ?? 0) },
        { label: 'EPISODES', value: fmt(totals.episodesWatched ?? 0) },
      ],
      shareHeadline: `Watched ${fmt(totals.totalHours ?? 0)} hours. No regrets.`,
      funFact: `${getTop('shows')} plus ${getTop('movies')} = your entire personality.`,
      streakHighlight: `Binge streaks were real — ${fmt(totals.episodesWatched ?? 0)} episodes don't watch themselves.`,
      trendObservation: `Viewing clustered around ${getTop('shows')} with ${totals.moviesWatched ?? 0} movies on the side.`,
      superlative: `${fmt(totals.totalHours ?? 0)} hours = ${fmt(Math.round((totals.totalHours ?? 0) / 24))} full days of content.`,
    },
    reddit: {
      heroComparison: `${fmt(totals.totalKarma ?? 0)} karma — the internet knows your name.`,
      insightHeadline: `r/${getTop('subreddits')} was your digital home base.`,
      insightSupportingData: [
        { label: 'KARMA', value: fmt(totals.totalKarma ?? 0) },
        { label: 'POSTS', value: fmt(totals.postsSubmitted ?? 0) },
        { label: 'COMMENTS', value: fmt(totals.commentsMade ?? 0) },
      ],
      shareHeadline: `${fmt(totals.totalKarma ?? 0)} karma. The lurker is dead.`,
      funFact: `r/${getTop('subreddits')} earned more of your time than most real relationships.`,
      streakHighlight: `${fmt(totals.commentsMade ?? 0)} comments — you didn't just lurk, you participated.`,
      trendObservation: `Karma flow concentrated in r/${getTop('subreddits')} with serious engagement.`,
      superlative: `${fmt(totals.totalKarma ?? 0)} karma places you firmly above casual browser status.`,
    },
    rescuetime: {
      heroComparison: `${fmt(totals.productiveHours ?? 0)} productive hours vs ${fmt(totals.distractingHours ?? 0)} distracting — the battle was real.`,
      insightHeadline: `Productivity pulse averaged ${totals.avgProductivityPulse ?? 0} — ${totals.avgProductivityPulse > 70 ? 'crushing it' : 'room to grow'}.`,
      insightSupportingData: [
        { label: 'PRODUCTIVE', value: `${fmt(totals.productiveHours ?? 0)}H` },
        { label: 'DISTRACTING', value: `${fmt(totals.distractingHours ?? 0)}H` },
        { label: 'PULSE', value: String(totals.avgProductivityPulse ?? 0) },
      ],
      shareHeadline: `${fmt(totals.productiveHours ?? 0)} focused hours. The mission continues.`,
      funFact: `Top category: ${getTop('categories')} — apparently that's where your attention lives.`,
      streakHighlight: `Productive hours edged out distracting ones — barely, but it counts.`,
      trendObservation: `Screen time had purpose: ${fmt(totals.productiveHours ?? 0)}h productive vs ${fmt(totals.distractingHours ?? 0)}h distracting.`,
      superlative: `${fmt(totals.totalHours ?? 0)} total hours tracked — every minute accounted for.`,
    },
    todoist: {
      heroComparison: `${fmt(totals.tasksCompleted ?? 0)} tasks checked off — a project manager's dream.`,
      insightHeadline: `${getTop('projects')} was your productivity engine at ${totals.dailyAverage ?? 0} tasks per day.`,
      insightSupportingData: [
        { label: 'COMPLETED', value: fmt(totals.tasksCompleted ?? 0) },
        { label: 'RECENT', value: fmt(totals.recentCompleted ?? 0) },
        { label: 'DAILY AVG', value: String(totals.dailyAverage ?? 0) },
      ],
      shareHeadline: `Checked off ${fmt(totals.tasksCompleted ?? 0)} tasks. Every. Single. One.`,
      funFact: `${totals.dailyAverage ?? 0} tasks per day — consistency is a superpower.`,
      streakHighlight: `${fmt(totals.recentCompleted ?? 0)} tasks knocked out recently alone.`,
      trendObservation: `Completion style: ${streaks.completionStyle ?? 'building habits'} — and it's working.`,
      superlative: `${fmt(totals.tasksCompleted ?? 0)} tasks completed. The to-do list fears you.`,
    },
  };

  const specific = defaults[service];
  if (specific) return specific;

  const genericTotals = Object.entries(totals).slice(0, 3);
  return {
    heroComparison: `Your numbers tell a compelling story this period.`,
    insightHeadline: `Patterns emerged across ${genericTotals.length} key metrics.`,
    insightSupportingData: genericTotals.map(([k, v]) => ({ label: formatKey(k).toUpperCase(), value: formatValue(v) })),
    shareHeadline: `This is what my ${service} data actually looks like.`,
    funFact: `One stat stood out from all the rest.`,
    streakHighlight: `Consistency paid off over the tracked period.`,
    trendObservation: `Clear directional trends visible in the data.`,
    superlative: `The top metric defined your entire period.`,
  };
}

/* ─── Public API ────────────────────────────────────────────────────── */

export async function generateAIInsights(context: InsightContext): Promise<ServiceCopySuggestions> {
  const prompt = buildServicePrompt(context);

  if (hasGeminiCredentials()) {
    try {
      const raw = await callGeminiDirect(prompt, 2048);
      const parsed = parseJsonSafely<ServiceCopySuggestions>(raw);
      if (parsed && parsed.heroComparison && parsed.insightHeadline) {
        // Fill in any missing fields from smart defaults
        const defaults = smartDefaultForService(context.service, context.stats);
        return {
          heroComparison: parsed.heroComparison || defaults.heroComparison,
          insightHeadline: parsed.insightHeadline || defaults.insightHeadline,
          insightSupportingData: parsed.insightSupportingData?.length ? parsed.insightSupportingData : defaults.insightSupportingData,
          shareHeadline: parsed.shareHeadline || defaults.shareHeadline,
          funFact: parsed.funFact || defaults.funFact,
          streakHighlight: parsed.streakHighlight || defaults.streakHighlight,
          trendObservation: parsed.trendObservation || defaults.trendObservation,
          superlative: parsed.superlative || defaults.superlative,
        };
      }
    } catch (error) {
      console.warn(`Direct Gemini failed for ${context.service}:`, error instanceof Error ? error.message : error);
    }
  }

  try {
    const gatewayText = await tryGateway(prompt);
    if (gatewayText) {
      const parsed = parseJsonSafely<ServiceCopySuggestions>(gatewayText);
      if (parsed && parsed.heroComparison && parsed.insightHeadline) {
        const defaults = smartDefaultForService(context.service, context.stats);
        return {
          heroComparison: parsed.heroComparison || defaults.heroComparison,
          insightHeadline: parsed.insightHeadline || defaults.insightHeadline,
          insightSupportingData: parsed.insightSupportingData?.length ? parsed.insightSupportingData : defaults.insightSupportingData,
          shareHeadline: parsed.shareHeadline || defaults.shareHeadline,
          funFact: parsed.funFact || defaults.funFact,
          streakHighlight: parsed.streakHighlight || defaults.streakHighlight,
          trendObservation: parsed.trendObservation || defaults.trendObservation,
          superlative: parsed.superlative || defaults.superlative,
        };
      }
    }
  } catch {
    // Gateway not configured or failed
  }

  return smartDefaultForService(context.service, context.stats);
}

export async function generateCrossServiceInsights(
  allServices: Array<{ service: string; stats: Record<string, any> }>,
): Promise<CrossServiceInsight[]> {
  const prompt = buildCrossServicePrompt(allServices);
  if (!prompt) return [];

  const parse = (raw: string): CrossServiceInsight | null => {
    const parsed = parseJsonSafely<{ headline: string; description: string; servicesInvolved: string[] }>(raw);
    if (!parsed?.headline) return null;
    return {
      headline: parsed.headline,
      description: parsed.description,
      servicesInvolved: parsed.servicesInvolved ?? allServices.map((s) => s.service),
      cardType: 'cross_service',
    };
  };

  if (hasGeminiCredentials()) {
    try {
      const raw = await callGeminiDirect(prompt, 1024);
      const parsed = parse(raw);
      if (parsed) return [parsed];
    } catch (error) {
      console.warn('Cross-service Gemini failed:', error instanceof Error ? error.message : error);
    }
  }

  try {
    const gatewayText = await tryGateway(prompt);
    if (gatewayText) {
      const parsed = parse(gatewayText);
      if (parsed) return [parsed];
    }
  } catch {
    // Gateway failed
  }

  return [];
}
