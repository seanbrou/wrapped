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
}

export interface ServiceCopySuggestions {
  heroComparison: string;
  insightHeadline: string;
  insightSupportingData: Array<{ label: string; value: string }>;
  shareHeadline: string;
}

function buildPrompt(context: InsightContext): string {
  const statsSummary = JSON.stringify(context.stats, null, 2);
  const previousStatsSummary = context.previousPeriodStats
    ? `\nPrevious period stats:\n${JSON.stringify(context.previousPeriodStats, null, 2)}`
    : '';

  return `You are a creative, witty copywriter designing personalized "Wrapped"-style recap slides.

Given the following user stats for **${context.service}** during **${context.period}**, write 4 short copy items that will appear on their slideshow cards. Make them punchy, vivid, and slightly irreverent — like Spotify Wrapped but with more personality.

Stats:
${statsSummary}${previousStatsSummary}

Return ONLY a JSON object with these exact keys (no markdown, no commentary):

{
  "heroComparison": "One bold sentence comparing their top item to something relatable or funny. Max 12 words.",
  "insightHeadline": "A snappy headline revealing an interesting pattern. Max 8 words.",
  "insightSupportingData": [
    { "label": "METRIC 1", "value": "Short value" },
    { "label": "METRIC 2", "value": "Short value" }
  ],
  "shareHeadline": "A boast-worthy, shareable line they'd want to post. Max 10 words."
}`;
}

async function callGeminiDirect(prompt: string): Promise<string> {
  const apiKey = getGeminiApiKey();
  const model = getGeminiModel();
  const url = `${GEMINI_BASE_URL}/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.85,
        maxOutputTokens: 512,
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
    const { gateway } = await import('ai');
    const { generateText } = await import('ai');
    const response = await generateText({
      model: gateway('google/gemini-2.5-flash-lite-preview'),
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

function defaultCopyForService(service: string): ServiceCopySuggestions {
  const defaults: Record<string, ServiceCopySuggestions> = {
    spotify: {
      heroComparison: 'Your top artist outplayed the rest by miles.',
      insightHeadline: 'You found your sound this year.',
      insightSupportingData: [{ label: 'TOP GENRE', value: 'Dominated 40%+' }],
      shareHeadline: 'This is what my year actually sounded like.',
    },
    apple_health: {
      heroComparison: 'You walked enough to cross a small country.',
      insightHeadline: 'Your health game stayed strong.',
      insightSupportingData: [{ label: 'DAILY AVG', value: 'Above goal' }],
      shareHeadline: 'My body did some work this year.',
    },
    strava: {
      heroComparison: 'Your pace improved like a software update.',
      insightHeadline: 'Consistency built your fitness.',
      insightSupportingData: [{ label: 'TIMING', value: 'Weekday mornings' }],
      shareHeadline: 'I basically lived in my running shoes.',
    },
    fitbit: {
      heroComparison: 'Your step count could lap the equator.',
      insightHeadline: 'Sleep and steps held steady.',
      insightSupportingData: [{ label: 'TREND', value: 'Up across quarter' }],
      shareHeadline: 'My wrist never lies.',
    },
    lastfm: {
      heroComparison: 'Your scrobbles stacked higher than a vinyl tower.',
      insightHeadline: 'Your music taste deepened.',
      insightSupportingData: [{ label: 'TOP ARTIST', value: 'Huge chunk of plays' }],
      shareHeadline: 'This is what obsession sounds like.',
    },
    steam: {
      heroComparison: 'Your playtime could finish a degree.',
      insightHeadline: 'One game ruled your library.',
      insightSupportingData: [{ label: 'TOP GAME', value: 'Most hours by far' }],
      shareHeadline: 'I have no regrets. Only achievements.',
    },
    github: {
      heroComparison: 'Your commit graph looked like a skyline.',
      insightHeadline: 'You shipped more than most.',
      insightSupportingData: [{ label: 'TIMING', value: 'Before lunch' }],
      shareHeadline: 'I build things. Here is the proof.',
    },
    notion: {
      heroComparison: 'Your pages could fill a short novel.',
      insightHeadline: 'You organized your brain beautifully.',
      insightSupportingData: [{ label: 'TOP DB', value: 'Drove most pages' }],
      shareHeadline: 'My second brain is thriving.',
    },
    trakt: {
      heroComparison: 'Your watchlist is longer than a CVS receipt.',
      insightHeadline: 'You binged with intention this year.',
      insightSupportingData: [{ label: 'TOP SHOW', value: 'Dominated screen time' }],
      shareHeadline: 'I watched *all* of it.',
    },
    reddit: {
      heroComparison: 'Your karma could power a small village.',
      insightHeadline: 'You found your tribes.',
      insightSupportingData: [{ label: 'TOP SUB', value: 'Most karma earned' }],
      shareHeadline: 'The internet knows my name.',
    },
    rescuetime: {
      heroComparison: 'Your productive hours could launch a startup.',
      insightHeadline: 'You spent time with purpose.',
      insightSupportingData: [{ label: 'PRODUCTIVE', value: 'Edged out distracting' }],
      shareHeadline: 'My screen time has a mission.',
    },
    todoist: {
      heroComparison: 'You completed more tasks than a project manager.',
      insightHeadline: 'You got things done.',
      insightSupportingData: [{ label: 'TREND', value: 'Up all year' }],
      shareHeadline: 'Checked off. Every. Single. One.',
    },
  };

  return (
    defaults[service] ?? {
      heroComparison: 'Your numbers tell a great story.',
      insightHeadline: 'Patterns emerged this period.',
      insightSupportingData: [{ label: 'TOP', value: 'Stood out from rest' }],
      shareHeadline: 'This is what my data looks like.',
    }
  );
}

export async function generateAIInsights(context: InsightContext): Promise<ServiceCopySuggestions> {
  const prompt = buildPrompt(context);

  // 1) Try direct Gemini API first
  if (hasGeminiCredentials()) {
    try {
      const raw = await callGeminiDirect(prompt);
      const parsed = parseJsonSafely<ServiceCopySuggestions>(raw);
      if (parsed) return parsed;
    } catch (error) {
      console.warn(`Direct Gemini failed for ${context.service}:`, error instanceof Error ? error.message : error);
    }
  }

  // 2) Fallback to AI Gateway (if configured)
  try {
    const gatewayText = await tryGateway(prompt);
    if (gatewayText) {
      const parsed = parseJsonSafely<ServiceCopySuggestions>(gatewayText);
      if (parsed) return parsed;
    }
  } catch {
    // Gateway not configured or failed
  }

  // 3) Final fallback: pre-written defaults per service
  return defaultCopyForService(context.service);
}
