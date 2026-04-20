import crypto from 'node:crypto';
import type {
  ServiceCopySuggestions,
  ServiceId,
  ServiceStats,
  WrappedCard,
} from '../types/index.js';

function cardId() {
  return crypto.randomUUID();
}

function shortNumber(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
}

function percentileFromMetric(value: number) {
  const bounded = Math.max(0, Math.min(24, Math.round(Math.log10(Math.max(1, value)) * 6)));
  return Math.max(1, 25 - bounded);
}

function buildTopList(
  service: ServiceId,
  title: string,
  items: Array<{ name: string; count: number }>,
): WrappedCard | null {
  if (!items.length) return null;
  return {
    id: cardId(),
    type: 'top_list',
    service,
    data: {
      title,
      items: items.slice(0, 5).map((item, index) => ({
        rank: index + 1,
        name: item.name,
        stat: item.count > 0 ? `${shortNumber(item.count)} plays` : 'Top of the year',
      })),
    },
  };
}

function buildChart(service: ServiceId, stats: ServiceStats): WrappedCard | null {
  const chart = stats.aggregates.charts?.[0];
  if (!chart || !chart.data.length || !chart.labels.length) return null;

  return {
    id: cardId(),
    type: 'chart',
    service,
    data: {
      title: chart.title,
      chartType: chart.chartType,
      data: chart.data,
      labels: chart.labels,
    },
  };
}

function buildComparison(service: ServiceId, stats: ServiceStats, title: string): WrappedCard | null {
  const comparison = stats.aggregates.comparisons[0];
  if (!comparison) return null;

  return {
    id: cardId(),
    type: 'comparison',
    service,
    data: {
      title,
      labels: ['This Year', comparison.label],
      values: [comparison.current, comparison.previous],
      unit: comparison.unit ?? '',
    },
  };
}

function buildCommunity(service: ServiceId, metric: string, value: string, score: number): WrappedCard {
  return {
    id: cardId(),
    type: 'community',
    service,
    data: {
      percentile: percentileFromMetric(score),
      metric,
      value,
    },
  };
}

function buildSpotifyCards(stats: ServiceStats, copy?: ServiceCopySuggestions): WrappedCard[] {
  const artists = stats.aggregates.top_items.find((group) => group.category === 'artists')?.items ?? [];
  const tracks = stats.aggregates.top_items.find((group) => group.category === 'tracks')?.items ?? [];
  const genres = stats.aggregates.top_items.find((group) => group.category === 'genres')?.items ?? [];
  const topArtist = artists[0]?.name ?? 'No artist';
  const topGenre = genres[0]?.name ?? 'genre-hopping';
  const sample = stats.aggregates.totals.recentPlaysSample ?? tracks.length;

  const cards: WrappedCard[] = [
    {
      id: cardId(),
      type: 'hero_stat',
      service: 'spotify',
      data: {
        stat: topArtist,
        value: 'Your most-played artist',
        comparison: copy?.heroComparison ?? `${topGenre} dominated your top artists this year.`,
      },
    },
  ];

  const topArtists = buildTopList('spotify', 'Your Top Artists', artists);
  if (topArtists) cards.push(topArtists);

  cards.push({
    id: cardId(),
    type: 'insight',
    service: 'spotify',
    data: {
      headline:
        copy?.insightHeadline ??
        `Your favorites kept orbiting around ${topGenre}, with ${topArtist} at the center`,
      supportingData:
        copy?.insightSupportingData ?? [
          { label: 'TOP GENRE', value: topGenre.toUpperCase() },
          { label: 'RECENT SAMPLE', value: String(sample) },
        ],
    },
  });

  const chart = buildChart('spotify', stats);
  if (chart) cards.push(chart);

  cards.push(buildCommunity('spotify', 'artist affinity', `${sample} recent plays sampled`, sample));
  return cards;
}

function buildStravaCards(stats: ServiceStats, copy?: ServiceCopySuggestions): WrappedCard[] {
  const distanceKm = stats.aggregates.totals.totalDistanceKm ?? 0;
  const movingHours = stats.aggregates.totals.totalMovingHours ?? 0;
  const activityCount = stats.aggregates.totals.activityCount ?? 0;
  const topSport = String(stats.aggregates.streaks.topSport ?? 'Running');
  const sports = stats.aggregates.top_items.find((group) => group.category === 'sports')?.items ?? [];

  const cards: WrappedCard[] = [
    {
      id: cardId(),
      type: 'hero_stat',
      service: 'strava',
      data: {
        stat: shortNumber(Math.round(distanceKm)),
        value: 'Kilometers logged',
        comparison: copy?.heroComparison ?? `${topSport} led the way across ${activityCount} activities.`,
      },
    },
  ];

  const topSports = buildTopList('strava', 'Your Top Sports', sports);
  if (topSports) cards.push(topSports);

  cards.push({
    id: cardId(),
    type: 'insight',
    service: 'strava',
    data: {
      headline:
        copy?.insightHeadline ??
        `${shortNumber(Math.round(movingHours))} moving hours turned into a seriously consistent year`,
      supportingData:
        copy?.insightSupportingData ?? [
          { label: 'ACTIVITIES', value: String(activityCount) },
          { label: 'TOP SPORT', value: topSport.toUpperCase() },
        ],
    },
  });

  const chart = buildChart('strava', stats);
  if (chart) cards.push(chart);

  const comparison = buildComparison('strava', stats, 'You vs Average Month');
  if (comparison) cards.push(comparison);

  cards.push(buildCommunity('strava', 'distance', `${shortNumber(Math.round(distanceKm))} km`, distanceKm));
  return cards;
}

function buildFitbitCards(stats: ServiceStats, copy?: ServiceCopySuggestions): WrappedCard[] {
  const totalSteps = stats.aggregates.totals.totalSteps ?? 0;
  const calories = stats.aggregates.totals.caloriesBurned ?? 0;
  const activeMinutes = stats.aggregates.totals.activeMinutes ?? 0;
  const bestDay = stats.aggregates.streaks.bestDaySteps ?? 0;

  const cards: WrappedCard[] = [
    {
      id: cardId(),
      type: 'hero_stat',
      service: 'fitbit',
      data: {
        stat: shortNumber(totalSteps),
        value: 'Steps tracked',
        comparison: copy?.heroComparison ?? `${shortNumber(activeMinutes)} active minutes kept the year moving.`,
      },
    },
    {
      id: cardId(),
      type: 'insight',
      service: 'fitbit',
      data: {
        headline:
          copy?.insightHeadline ??
          `Your best day hit ${shortNumber(Number(bestDay))} steps, and your streak never really let up`,
        supportingData:
          copy?.insightSupportingData ?? [
            { label: 'CALORIES', value: shortNumber(calories) },
            { label: 'ACTIVE MIN', value: shortNumber(activeMinutes) },
          ],
      },
    },
  ];

  const chart = buildChart('fitbit', stats);
  if (chart) cards.push(chart);

  const comparison = buildComparison('fitbit', stats, 'You vs Average Month');
  if (comparison) cards.push(comparison);

  cards.push(buildCommunity('fitbit', 'daily movement', `${shortNumber(totalSteps)} steps`, totalSteps));
  return cards;
}

function buildLastfmCards(stats: ServiceStats, copy?: ServiceCopySuggestions): WrappedCard[] {
  const artists = stats.aggregates.top_items.find((group) => group.category === 'artists')?.items ?? [];
  const tracks = stats.aggregates.top_items.find((group) => group.category === 'tracks')?.items ?? [];
  const topArtist = artists[0]?.name ?? 'No top artist';
  const sample = stats.aggregates.totals.recentTrackSample ?? tracks.length;

  const cards: WrappedCard[] = [
    {
      id: cardId(),
      type: 'hero_stat',
      service: 'lastfm',
      data: {
        stat: topArtist,
        value: 'Your most-scrobbled artist',
        comparison: copy?.heroComparison ?? `${sample} recent tracks showed the same taste all over again.`,
      },
    },
  ];

  const topArtists = buildTopList('lastfm', 'Your Top Artists', artists);
  if (topArtists) cards.push(topArtists);

  cards.push({
    id: cardId(),
    type: 'insight',
    service: 'lastfm',
    data: {
      headline:
        copy?.insightHeadline ??
        `${topArtist} kept coming back because your listening habits clearly know what they like`,
      supportingData:
        copy?.insightSupportingData ?? [
          { label: 'TRACKS', value: String(stats.aggregates.totals.tracksTracked ?? tracks.length) },
          { label: 'RECENT', value: String(sample) },
        ],
    },
  });

  const chart = buildChart('lastfm', stats);
  if (chart) cards.push(chart);

  cards.push(buildCommunity('lastfm', 'scrobble depth', `${sample} recent tracks sampled`, sample));
  return cards;
}

function buildSteamCards(stats: ServiceStats, copy?: ServiceCopySuggestions): WrappedCard[] {
  const games = stats.aggregates.top_items.find((group) => group.category === 'games')?.items ?? [];
  const totalHours = stats.aggregates.totals.totalHours ?? 0;
  const gamesPlayed = stats.aggregates.totals.gamesPlayed ?? 0;
  const topGame = String(stats.aggregates.streaks.topGame ?? games[0]?.name ?? 'No game');

  const cards: WrappedCard[] = [
    {
      id: cardId(),
      type: 'hero_stat',
      service: 'steam',
      data: {
        stat: shortNumber(totalHours),
        value: 'Hours played',
        comparison: copy?.heroComparison ?? `${topGame} led the year across ${gamesPlayed} played games.`,
      },
    },
  ];

  const topGames = buildTopList('steam', 'Your Top Games', games);
  if (topGames) cards.push(topGames);

  cards.push({
    id: cardId(),
    type: 'insight',
    service: 'steam',
    data: {
      headline:
        copy?.insightHeadline ??
        `${topGame} became your go-to world whenever you had free time`,
      supportingData:
        copy?.insightSupportingData ?? [
          { label: 'PLAYED', value: String(gamesPlayed) },
          { label: 'OWNED', value: String(stats.aggregates.totals.gamesOwned ?? games.length) },
        ],
    },
  });

  const chart = buildChart('steam', stats);
  if (chart) cards.push(chart);

  cards.push(buildCommunity('steam', 'playtime', `${shortNumber(totalHours)} hours`, totalHours));
  return cards;
}

function buildAppleHealthCards(stats: ServiceStats): WrappedCard[] {
  const totalSteps = stats.aggregates.totals.totalSteps ?? 0;
  const activeMinutes = stats.aggregates.totals.activeMinutes ?? 0;
  const sleepMinutes = stats.aggregates.totals.sleepMinutes ?? 0;

  const cards: WrappedCard[] = [
    {
      id: cardId(),
      type: 'hero_stat',
      service: 'apple_health',
      data: {
        stat: shortNumber(totalSteps),
        value: 'Steps tracked',
        comparison: `${shortNumber(activeMinutes)} active minutes and ${shortNumber(Math.round(sleepMinutes / 60))} hours of sleep rounded out the year.`,
      },
    },
    {
      id: cardId(),
      type: 'insight',
      service: 'apple_health',
      data: {
        headline: 'Your HealthKit data stayed on-device while still powering this recap',
        supportingData: [
          { label: 'ACTIVE MIN', value: shortNumber(activeMinutes) },
          { label: 'SLEEP HRS', value: shortNumber(Math.round(sleepMinutes / 60)) },
        ],
      },
    },
  ];

  const chart = buildChart('apple_health', stats);
  if (chart) cards.push(chart);

  cards.push(buildCommunity('apple_health', 'daily activity', `${shortNumber(activeMinutes)} minutes`, activeMinutes));
  return cards;
}

const builders: Partial<Record<ServiceId, (stats: ServiceStats, copy?: ServiceCopySuggestions) => WrappedCard[]>> = {
  spotify: buildSpotifyCards,
  strava: buildStravaCards,
  fitbit: buildFitbitCards,
  lastfm: buildLastfmCards,
  steam: buildSteamCards,
  apple_health: buildAppleHealthCards,
};

function buildShareSummary(stats: ServiceStats[]) {
  const fragments = stats.map((serviceStats) => {
    switch (serviceStats.service) {
      case 'spotify':
        return `${serviceStats.aggregates.streaks.topArtist ?? 'your top artist'} on repeat`;
      case 'strava':
        return `${shortNumber(Math.round(serviceStats.aggregates.totals.totalDistanceKm ?? 0))} km logged`;
      case 'fitbit':
      case 'apple_health':
        return `${shortNumber(serviceStats.aggregates.totals.totalSteps ?? 0)} steps`;
      case 'lastfm':
        return `${serviceStats.aggregates.streaks.topArtist ?? 'your top artist'} on top`;
      case 'steam':
        return `${shortNumber(serviceStats.aggregates.totals.totalHours ?? 0)} hours played`;
      default:
        return serviceStats.service;
    }
  });

  return fragments.filter(Boolean).slice(0, 3).join(' · ');
}

export function selectCards(
  stats: ServiceStats[],
  copyByService: Partial<Record<ServiceId, ServiceCopySuggestions>> = {},
  maxCards = 15,
): WrappedCard[] {
  const cards: WrappedCard[] = [];

  for (const serviceStats of stats) {
    const builder = builders[serviceStats.service];
    if (!builder) continue;

    const built = builder(serviceStats, copyByService[serviceStats.service]);
    for (const card of built) {
      if (cards.length >= maxCards - 1) break;
      cards.push(card);
    }
    if (cards.length >= maxCards - 1) break;
  }

  if (stats.length > 0) {
    const shareHeadline =
      copyByService[stats[0].service]?.shareHeadline ??
      `My ${new Date().getFullYear()} Wrapped.`;

    cards.push({
      id: cardId(),
      type: 'share',
      service: 'all',
      data: {
        stat: buildShareSummary(stats),
        headline: shareHeadline,
      },
    });
  }

  return cards.slice(0, maxCards);
}
