import { generateText, gateway } from 'ai';
import type {
  ServiceCopySuggestions,
  ServiceId,
  ServiceStats,
} from '../types/index.js';

let modelAvailabilityPromise: Promise<Set<string> | null> | null = null;

function buildTemplateCopy(stats: ServiceStats[]): Partial<Record<ServiceId, ServiceCopySuggestions>> {
  const copy: Partial<Record<ServiceId, ServiceCopySuggestions>> = {};

  for (const stat of stats) {
    switch (stat.service) {
      case 'spotify':
        copy.spotify = {
          heroComparison: `${stat.aggregates.streaks.topGenre ?? 'Your taste'} kept showing up across every favorite.`,
          insightHeadline: `${stat.aggregates.streaks.topArtist ?? 'Your top artist'} was impossible to shake this year`,
          shareHeadline: `My ${new Date().getFullYear()} music Wrapped.`,
        };
        break;
      case 'strava':
        copy.strava = {
          heroComparison: `${stat.aggregates.streaks.topSport ?? 'Running'} carried the year.`,
          insightHeadline: `${stat.aggregates.totals.activityCount ?? 0} activities added up into a very real routine`,
          shareHeadline: `My ${new Date().getFullYear()} movement Wrapped.`,
        };
        break;
      case 'fitbit':
        copy.fitbit = {
          heroComparison: `${stat.aggregates.totals.activeMinutes ?? 0} active minutes kept things moving.`,
          insightHeadline: `Your daily habits stacked up more than the occasional big day ever could`,
          shareHeadline: `My ${new Date().getFullYear()} Fitbit Wrapped.`,
        };
        break;
      case 'lastfm':
        copy.lastfm = {
          heroComparison: `${stat.aggregates.streaks.topArtist ?? 'One artist'} stayed at the top all year.`,
          insightHeadline: `Your scrobbles kept circling back to the same core favorites`,
          shareHeadline: `My ${new Date().getFullYear()} scrobble Wrapped.`,
        };
        break;
      case 'steam':
        copy.steam = {
          heroComparison: `${stat.aggregates.streaks.topGame ?? 'One game'} clearly won the year.`,
          insightHeadline: `You always had one more run, one more quest, or one more match in you`,
          shareHeadline: `My ${new Date().getFullYear()} gaming Wrapped.`,
        };
        break;
      default:
        break;
    }
  }

  return copy;
}

function summarizeStats(stats: ServiceStats[]) {
  return stats
    .map((stat) => {
      const totals = Object.entries(stat.aggregates.totals)
        .map(([key, value]) => `${key}=${value}`)
        .join(', ');
      const streaks = Object.entries(stat.aggregates.streaks)
        .map(([key, value]) => `${key}=${value}`)
        .join(', ');
      const topItems = stat.aggregates.top_items
        .map((group) => `${group.category}: ${group.items.slice(0, 3).map((item) => item.name).join(' | ')}`)
        .join('; ');

      return `${stat.service}
totals: ${totals || 'none'}
streaks: ${streaks || 'none'}
tops: ${topItems || 'none'}`;
    })
    .join('\n\n');
}

export async function warmAiGateway(logger: Pick<Console, 'info' | 'warn'> = console) {
  if (modelAvailabilityPromise) return modelAvailabilityPromise;

  modelAvailabilityPromise = (async () => {
    const hasGatewayAuth = Boolean(process.env.VERCEL_OIDC_TOKEN || process.env.AI_GATEWAY_API_KEY);
    if (!hasGatewayAuth) {
      logger.warn('[ai] AI Gateway credentials are not configured; using deterministic copy templates');
      return null;
    }

    try {
      const metadata = await gateway.getAvailableModels();
      const models =
        ((metadata as { models?: Array<{ id: string }> }).models ??
          (metadata as unknown as Array<{ id: string }>)) || [];
      const ids = new Set<string>(models.map((model) => model.id));
      logger.info(`[ai] AI Gateway reachable with ${ids.size} models available`);
      return ids;
    } catch (error) {
      logger.warn(`[ai] AI Gateway health check failed; falling back to deterministic copy templates: ${String(error)}`);
      return null;
    }
  })();

  return modelAvailabilityPromise;
}

export async function generateAIInsights(
  stats: ServiceStats[],
  periodLabel: string,
): Promise<Partial<Record<ServiceId, ServiceCopySuggestions>>> {
  const llmEligible = stats.filter((stat) => stat.service !== 'apple_health');
  if (llmEligible.length === 0) return {};

  const availableModels = await warmAiGateway();
  if (!availableModels?.has('google/gemini-3.1-flash-lite-preview')) {
    return buildTemplateCopy(llmEligible);
  }

  const prompt = `You write tight, stylish copy for a Spotify Wrapped-style mobile story experience.
Create JSON with one object per service id. Each service should include:
- heroComparison: one sentence, max 18 words
- insightHeadline: one sentence fragment, max 18 words, no ending punctuation
- shareHeadline: one short headline, max 8 words

Rules:
- Preserve the actual metrics; do not invent unsupported numbers.
- Be vivid, not cringe.
- Do not mention privacy or data processing.
- Never mention HealthKit or Apple Health.
- Output only valid JSON.

Period: ${periodLabel}

Stats:
${summarizeStats(llmEligible)}
`;

  try {
    const result = await generateText({
      model: gateway('google/gemini-3.1-flash-lite-preview'),
      prompt,
      temperature: 0.8,
      providerOptions: {
        gateway: {
          models: ['google/gemini-3-flash'],
          tags: ['feature:wrapped', 'mode:copy'],
        },
      },
    });

    const parsed = JSON.parse(result.text) as Partial<Record<ServiceId, ServiceCopySuggestions>>;
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('AI response was not a JSON object');
    }
    return { ...buildTemplateCopy(llmEligible), ...parsed };
  } catch (error) {
    console.warn('[ai] Copy generation failed; using deterministic copy templates', error);
    return buildTemplateCopy(llmEligible);
  }
}
