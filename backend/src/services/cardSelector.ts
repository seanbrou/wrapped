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

/* ─── Card builders ───────────────────────────────────────────────────── */

function buildTopList(
  service: ServiceId,
  title: string,
  items: Array<{ name: string; count: number }>,
  formatStat: (count: number) => string = (count) =>
    count > 0 ? `${shortNumber(count)} plays` : 'Top of the year',
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
        stat: formatStat(item.count),
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

function buildFunFact(service: ServiceId, fact: string): WrappedCard {
  return {
    id: cardId(),
    type: 'fun_fact',
    service,
    data: { fact },
  };
}

function buildStreak(service: ServiceId, streak: string, description: string, days?: number): WrappedCard {
  return {
    id: cardId(),
    type: 'streak',
    service,
    data: { streak, description, days },
  };
}

function buildTrend(service: ServiceId, trend: string, direction: 'up' | 'down' | 'flat', context: string): WrappedCard {
  return {
    id: cardId(),
    type: 'trend',
    service,
    data: { trend, direction, context },
  };
}

function buildSuperlative(service: ServiceId, superlative: string, stat: string, value: string): WrappedCard {
  return {
    id: cardId(),
    type: 'superlative',
    service,
    data: { superlative, stat, value },
  };
}

function buildOpener(serviceCount: number, period: string): WrappedCard {
  return {
    id: cardId(),
    type: 'opener',
    service: 'all',
    data: {
      headline: serviceCount === 1 ? 'One service. Infinite data.' : `${serviceCount} services. One story.`,
      subtitle: 'Your year, decoded.',
      serviceCount,
      period,
    },
  };
}

function buildCrossServiceCard(headline: string, description: string, services: string[]): WrappedCard {
  return {
    id: cardId(),
    type: 'cross_service',
    service: 'all',
    data: { headline, description, servicesInvolved: services },
  };
}

/* ─── Service-specific card builders ─────────────────────────────────────────── */

function buildSpotifyCards(stats: ServiceStats, copy?: ServiceCopySuggestions): WrappedCard[] {
  const artists = stats.aggregates.top_items.find((group) => group.category === 'artists')?.items ?? [];
  const tracks = stats.aggregates.top_items.find((group) => group.category === 'tracks')?.items ?? [];
  const genres = stats.aggregates.top_items.find((group) => group.category === 'genres')?.items ?? [];
  const topArtist = artists[0]?.name ?? 'No artist';
  const topGenre = genres[0]?.name ?? 'genre-hopping';
  const sample = stats.aggregates.totals.recentPlaysSample ?? tracks.length;
  const totalHours = stats.aggregates.totals.totalHours ?? 0;

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

  if (copy?.funFact) cards.push(buildFunFact('spotify', copy.funFact));
  if (copy?.streakHighlight) cards.push(buildStreak('spotify', copy.streakHighlight, 'Consistency matters'));
  if (copy?.superlative) cards.push(buildSuperlative('spotify', copy.superlative, 'Top Artist', topArtist));

  const chart = buildChart('spotify', stats);
  if (chart) cards.push(chart);

  cards.push(buildCommunity('spotify', 'artist affinity', `${sample} recent plays sampled`, sample));

  if (copy?.trendObservation) cards.push(buildTrend('spotify', copy.trendObservation, 'up', 'Listening pattern'));

  if (totalHours > 0) {
    cards.push(buildSuperlative('spotify', 'Total listening time', 'Hours', `${shortNumber(totalHours)}H`));
  }

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

  if (copy?.funFact) cards.push(buildFunFact('strava', copy.funFact));
  if (copy?.streakHighlight) cards.push(buildStreak('strava', copy.streakHighlight, 'Keep the chain going'));
  if (copy?.superlative) cards.push(buildSuperlative('strava', copy.superlative, 'Distance', `${shortNumber(Math.round(distanceKm))} km`));

  const chart = buildChart('strava', stats);
  if (chart) cards.push(chart);

  const comparison = buildComparison('strava', stats, 'You vs Average Month');
  if (comparison) cards.push(comparison);

  cards.push(buildCommunity('strava', 'distance', `${shortNumber(Math.round(distanceKm))} km`, distanceKm));

  if (copy?.trendObservation) cards.push(buildTrend('strava', copy.trendObservation, 'up', 'Activity pattern'));

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

  if (copy?.funFact) cards.push(buildFunFact('fitbit', copy.funFact));
  if (copy?.streakHighlight) cards.push(buildStreak('fitbit', copy.streakHighlight, 'Daily consistency'));
  if (copy?.superlative) cards.push(buildSuperlative('fitbit', copy.superlative, 'Total Steps', shortNumber(totalSteps)));

  const chart = buildChart('fitbit', stats);
  if (chart) cards.push(chart);

  const comparison = buildComparison('fitbit', stats, 'You vs Average Month');
  if (comparison) cards.push(comparison);

  cards.push(buildCommunity('fitbit', 'daily movement', `${shortNumber(totalSteps)} steps`, totalSteps));

  if (copy?.trendObservation) cards.push(buildTrend('fitbit', copy.trendObservation, 'up', 'Activity trend'));

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

  if (copy?.funFact) cards.push(buildFunFact('lastfm', copy.funFact));
  if (copy?.streakHighlight) cards.push(buildStreak('lastfm', copy.streakHighlight, 'Listening streak'));
  if (copy?.superlative) cards.push(buildSuperlative('lastfm', copy.superlative, 'Top Artist', topArtist));

  const chart = buildChart('lastfm', stats);
  if (chart) cards.push(chart);

  cards.push(buildCommunity('lastfm', 'scrobble depth', `${sample} recent tracks sampled`, sample));

  if (copy?.trendObservation) cards.push(buildTrend('lastfm', copy.trendObservation, 'up', 'Listening trend'));

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

  if (copy?.funFact) cards.push(buildFunFact('steam', copy.funFact));
  if (copy?.streakHighlight) cards.push(buildStreak('steam', copy.streakHighlight, 'Gaming streak'));
  if (copy?.superlative) cards.push(buildSuperlative('steam', copy.superlative, 'Top Game', topGame));

  const chart = buildChart('steam', stats);
  if (chart) cards.push(chart);

  cards.push(buildCommunity('steam', 'playtime', `${shortNumber(totalHours)} hours`, totalHours));

  if (copy?.trendObservation) cards.push(buildTrend('steam', copy.trendObservation, 'up', 'Gaming trend'));

  return cards;
}

function buildGitHubCards(stats: ServiceStats, copy?: ServiceCopySuggestions): WrappedCard[] {
  const repos = stats.aggregates.top_items.find((group) => group.category === 'repos')?.items ?? [];
  const languages = stats.aggregates.top_items.find((group) => group.category === 'languages')?.items ?? [];
  const topLanguage = String(stats.aggregates.streaks.topLanguage ?? languages[0]?.name ?? 'TypeScript');
  const topRepo = String(stats.aggregates.streaks.topRepo ?? repos[0]?.name ?? 'No featured repo');
  const stars = stats.aggregates.totals.starsEarned ?? 0;
  const followers = stats.aggregates.totals.followers ?? 0;

  const cards: WrappedCard[] = [
    {
      id: cardId(),
      type: 'hero_stat',
      service: 'github',
      data: {
        stat: shortNumber(stars),
        value: 'Stars across your repos',
        comparison: copy?.heroComparison ?? `${topLanguage} kept showing up, with ${topRepo} leading the highlight reel.`,
      },
    },
  ];

  const topRepos = buildTopList(
    'github',
    'Your Top Repos',
    repos,
    (count) => (count > 0 ? `${shortNumber(count)} stars` : 'Featured'),
  );
  if (topRepos) cards.push(topRepos);

  cards.push({
    id: cardId(),
    type: 'insight',
    service: 'github',
    data: {
      headline:
        copy?.insightHeadline ??
        `${topRepo} drew the most attention while ${topLanguage} stayed at the center of your work`,
      supportingData:
        copy?.insightSupportingData ?? [
          { label: 'FOLLOWERS', value: shortNumber(followers) },
          { label: 'TOP LANG', value: topLanguage.toUpperCase() },
        ],
    },
  });

  if (copy?.funFact) cards.push(buildFunFact('github', copy.funFact));
  if (copy?.streakHighlight) cards.push(buildStreak('github', copy.streakHighlight, 'Code streak'));
  if (copy?.superlative) cards.push(buildSuperlative('github', copy.superlative, 'Top Repo', topRepo));

  const chart = buildChart('github', stats);
  if (chart) cards.push(chart);

  const comparison = buildComparison('github', stats, 'Stars vs Forks');
  if (comparison) cards.push(comparison);

  cards.push(buildCommunity('github', 'open-source pull', `${shortNumber(stars)} repo stars`, stars));

  if (copy?.trendObservation) cards.push(buildTrend('github', copy.trendObservation, 'up', 'Contribution trend'));

  return cards;
}

function buildNotionCards(stats: ServiceStats, copy?: ServiceCopySuggestions): WrappedCard[] {
  const pages = stats.aggregates.top_items.find((group) => group.category === 'pages')?.items ?? [];
  const pageCount = stats.aggregates.totals.pageCount ?? 0;
  const databaseCount = stats.aggregates.totals.databaseCount ?? 0;
  const workspaceName = String(stats.aggregates.streaks.workspaceName ?? 'Notion');
  const mostRecentPage = String(stats.aggregates.streaks.mostRecentPage ?? pages[0]?.name ?? 'Untitled');

  const cards: WrappedCard[] = [
    {
      id: cardId(),
      type: 'hero_stat',
      service: 'notion',
      data: {
        stat: shortNumber(pageCount),
        value: 'Shared pages indexed',
        comparison:
          copy?.heroComparison ??
          `${shortNumber(databaseCount)} databases and a steady stream of edits turned ${workspaceName} into recap material.`,
      },
    },
  ];

  const recentPages = buildTopList(
    'notion',
    'Recently Active Pages',
    pages,
    () => 'Edited this range',
  );
  if (recentPages) cards.push(recentPages);

  cards.push({
    id: cardId(),
    type: 'insight',
    service: 'notion',
    data: {
      headline:
        copy?.insightHeadline ??
        `${mostRecentPage} was one of the pages defining your recent workspace rhythm`,
      supportingData:
        copy?.insightSupportingData ?? [
          { label: 'DATABASES', value: shortNumber(databaseCount) },
          { label: 'WORKSPACE', value: workspaceName.toUpperCase() },
        ],
    },
  });

  if (copy?.funFact) cards.push(buildFunFact('notion', copy.funFact));
  if (copy?.streakHighlight) cards.push(buildStreak('notion', copy.streakHighlight, 'Editing streak'));
  if (copy?.superlative) cards.push(buildSuperlative('notion', copy.superlative, 'Workspace', workspaceName));

  const chart = buildChart('notion', stats);
  if (chart) cards.push(chart);

  const comparison = buildComparison('notion', stats, 'Pages vs Databases');
  if (comparison) cards.push(comparison);

  cards.push(buildCommunity('notion', 'workspace sprawl', `${shortNumber(pageCount)} pages`, pageCount));

  if (copy?.trendObservation) cards.push(buildTrend('notion', copy.trendObservation, 'up', 'Organization trend'));

  return cards;
}

function buildAppleHealthCards(stats: ServiceStats, copy?: ServiceCopySuggestions): WrappedCard[] {
  const totalSteps = stats.aggregates.totals.totalSteps ?? 0;
  const activeMinutes =
    stats.aggregates.totals.activeMinutes ??
    stats.aggregates.totals.exerciseMinutes ??
    0;
  const activeDays = stats.aggregates.totals.activeDays ?? 0;
  const tenKStepDays = stats.aggregates.totals.tenKStepDays ?? 0;
  const flightsClimbed = stats.aggregates.totals.flightsClimbed ?? 0;
  const workoutCount = stats.aggregates.totals.workoutCount ?? 0;
  const workoutHours = stats.aggregates.totals.workoutHours ?? 0;
  const restingHeartRate = stats.aggregates.totals.restingHeartRate ?? 0;
  const sleepHours =
    stats.aggregates.totals.sleepHours ??
    ((stats.aggregates.totals.sleepMinutes ?? 0) as number) / 60;
  const topWorkoutType = String(
    stats.aggregates.streaks.topWorkoutType ??
      stats.aggregates.top_items.find((group) => group.category === 'workouts')?.items?.[0]?.name ??
      'Workout',
  );
  const longestExerciseStreak = Number(stats.aggregates.streaks.longestExerciseStreak ?? 0);
  const bestSleepNightHours = Number(stats.aggregates.streaks.bestSleepNightHours ?? sleepHours);
  const workouts = stats.aggregates.top_items.find((group) => group.category === 'workouts')?.items ?? [];

  const cards: WrappedCard[] = [
    {
      id: cardId(),
      type: 'hero_stat',
      service: 'apple_health',
      data: {
        stat: shortNumber(totalSteps),
        value: 'Steps tracked',
        comparison: copy?.heroComparison ?? `${shortNumber(tenKStepDays)} ten-thousand-step days and ${shortNumber(workoutCount)} workouts made this a real movement year.`,
      },
    },
    {
      id: cardId(),
      type: 'insight',
      service: 'apple_health',
      data: {
        headline:
          copy?.insightHeadline ??
          (longestExerciseStreak > 0
            ? `${topWorkoutType} led a ${shortNumber(longestExerciseStreak)}-day streak, with ${shortNumber(Math.round(workoutHours))} workout hours logged`
            : `HealthKit captured ${shortNumber(activeDays)} active days and ${shortNumber(Math.round(sleepHours))} hours of sleep on average`),
        supportingData:
          copy?.insightSupportingData ?? [
            { label: 'ACTIVE DAYS', value: shortNumber(activeDays) },
            { label: 'BEST SLEEP', value: `${bestSleepNightHours.toFixed(1)}H` },
            ...(restingHeartRate > 0
              ? [{ label: 'RESTING HR', value: `${shortNumber(Math.round(restingHeartRate))} BPM` }]
              : [{ label: 'FLIGHTS', value: shortNumber(flightsClimbed) }]),
          ],
      },
    },
  ];

  if (copy?.funFact) cards.push(buildFunFact('apple_health', copy.funFact));
  if (copy?.streakHighlight) cards.push(buildStreak('apple_health', copy.streakHighlight, 'Health streak', longestExerciseStreak || undefined));
  if (copy?.superlative) cards.push(buildSuperlative('apple_health', copy.superlative, 'Top Workout', topWorkoutType));

  const topWorkouts = buildTopList(
    'apple_health',
    'Your Top Workouts',
    workouts,
    (count) => (count > 0 ? `${shortNumber(count)} sessions` : 'Logged'),
  );
  if (topWorkouts) cards.push(topWorkouts);

  const chart = buildChart('apple_health', stats);
  if (chart) cards.push(chart);

  const comparison = buildComparison('apple_health', stats, 'You vs Previous Range');
  if (comparison) cards.push(comparison);

  cards.push(
    buildCommunity(
      'apple_health',
      'daily activity',
      tenKStepDays > 0
        ? `${shortNumber(tenKStepDays)} days over 10K`
        : `${shortNumber(activeMinutes)} active minutes`,
      tenKStepDays > 0 ? tenKStepDays : activeMinutes,
    ),
  );

  if (copy?.trendObservation) cards.push(buildTrend('apple_health', copy.trendObservation, 'up', 'Health trend'));

  return cards;
}

function buildTraktCards(stats: ServiceStats, copy?: ServiceCopySuggestions): WrappedCard[] {
  const movies = stats.aggregates.top_items.find((group) => group.category === 'movies')?.items ?? [];
  const shows = stats.aggregates.top_items.find((group) => group.category === 'shows')?.items ?? [];
  const totalHours = stats.aggregates.totals.totalHours ?? 0;
  const moviesWatched = stats.aggregates.totals.moviesWatched ?? 0;
  const episodesWatched = stats.aggregates.totals.episodesWatched ?? 0;
  const topShow = String(stats.aggregates.streaks.topShow ?? shows[0]?.name ?? 'No show');
  const bingeStyle = String(stats.aggregates.streaks.bingeStyle ?? 'viewer');

  const cards: WrappedCard[] = [
    {
      id: cardId(),
      type: 'hero_stat',
      service: 'trakt',
      data: {
        stat: shortNumber(totalHours),
        value: 'Hours watched',
        comparison: copy?.heroComparison ?? `${topShow} led your watchlist across ${moviesWatched} movies and ${episodesWatched} episodes.`,
      },
    },
  ];

  const topMovies = buildTopList('trakt', 'Your Top Movies', movies);
  if (topMovies) cards.push(topMovies);

  const topShows = buildTopList('trakt', 'Your Top Shows', shows);
  if (topShows) cards.push(topShows);

  cards.push({
    id: cardId(),
    type: 'insight',
    service: 'trakt',
    data: {
      headline: copy?.insightHeadline ?? `Your screen time tells a story — ${bingeStyle} energy all the way`,
      supportingData: copy?.insightSupportingData ?? [
        { label: 'MOVIES', value: String(moviesWatched) },
        { label: 'EPISODES', value: String(episodesWatched) },
      ],
    },
  });

  if (copy?.funFact) cards.push(buildFunFact('trakt', copy.funFact));
  if (copy?.streakHighlight) cards.push(buildStreak('trakt', copy.streakHighlight, 'Binge streak'));
  if (copy?.superlative) cards.push(buildSuperlative('trakt', copy.superlative, 'Top Show', topShow));

  const chart = buildChart('trakt', stats);
  if (chart) cards.push(chart);

  cards.push(buildCommunity('trakt', 'watch time', `${shortNumber(totalHours)} hours`, totalHours));

  if (copy?.trendObservation) cards.push(buildTrend('trakt', copy.trendObservation, 'up', 'Viewing trend'));

  return cards;
}

function buildRedditCards(stats: ServiceStats, copy?: ServiceCopySuggestions): WrappedCard[] {
  const subreddits = stats.aggregates.top_items.find((group) => group.category === 'subreddits')?.items ?? [];
  const totalKarma = stats.aggregates.totals.totalKarma ?? 0;
  const postsSubmitted = stats.aggregates.totals.postsSubmitted ?? 0;
  const commentsMade = stats.aggregates.totals.commentsMade ?? 0;
  const karmaTier = String(stats.aggregates.streaks.karmaTier ?? 'lurker');
  const topSubreddit = String(stats.aggregates.streaks.topSubreddit ?? subreddits[0]?.name ?? 'No data');

  const cards: WrappedCard[] = [
    {
      id: cardId(),
      type: 'hero_stat',
      service: 'reddit',
      data: {
        stat: shortNumber(totalKarma),
        value: 'Karma earned',
        comparison: copy?.heroComparison ?? `${topSubreddit} was your home base with ${postsSubmitted} posts and ${commentsMade} comments.`,
      },
    },
  ];

  const topSubs = buildTopList('reddit', 'Your Top Subreddits', subreddits);
  if (topSubs) cards.push(topSubs);

  cards.push({
    id: cardId(),
    type: 'insight',
    service: 'reddit',
    data: {
      headline: copy?.insightHeadline ?? `You are a certified ${karmaTier} on Reddit`,
      supportingData: copy?.insightSupportingData ?? [
        { label: 'POSTS', value: String(postsSubmitted) },
        { label: 'COMMENTS', value: String(commentsMade) },
      ],
    },
  });

  if (copy?.funFact) cards.push(buildFunFact('reddit', copy.funFact));
  if (copy?.streakHighlight) cards.push(buildStreak('reddit', copy.streakHighlight, 'Engagement streak'));
  if (copy?.superlative) cards.push(buildSuperlative('reddit', copy.superlative, 'Karma', shortNumber(totalKarma)));

  const chart = buildChart('reddit', stats);
  if (chart) cards.push(chart);

  cards.push(buildCommunity('reddit', 'karma power', `${shortNumber(totalKarma)} karma`, totalKarma));

  if (copy?.trendObservation) cards.push(buildTrend('reddit', copy.trendObservation, 'up', 'Engagement trend'));

  return cards;
}

function buildRescueTimeCards(stats: ServiceStats, copy?: ServiceCopySuggestions): WrappedCard[] {
  const activities = stats.aggregates.top_items.find((group) => group.category === 'activities')?.items ?? [];
  const categories = stats.aggregates.top_items.find((group) => group.category === 'categories')?.items ?? [];
  const totalHours = stats.aggregates.totals.totalHours ?? 0;
  const productiveHours = stats.aggregates.totals.productiveHours ?? 0;
  const distractingHours = stats.aggregates.totals.distractingHours ?? 0;
  const avgPulse = stats.aggregates.totals.avgProductivityPulse ?? 0;
  const productivityLabel = String(stats.aggregates.streaks.productivityLabel ?? 'focused');

  const cards: WrappedCard[] = [
    {
      id: cardId(),
      type: 'hero_stat',
      service: 'rescuetime',
      data: {
        stat: shortNumber(totalHours),
        value: 'Hours tracked',
        comparison: copy?.heroComparison ?? `${shortNumber(productiveHours)} productive hours vs ${shortNumber(distractingHours)} distracting — ${productivityLabel} vibes.`,
      },
    },
  ];

  const topCategories = buildTopList('rescuetime', 'Your Top Categories', categories);
  if (topCategories) cards.push(topCategories);

  cards.push({
    id: cardId(),
    type: 'insight',
    service: 'rescuetime',
    data: {
      headline: copy?.insightHeadline ?? `Productivity pulse averaged ${avgPulse} — ${productivityLabel} energy`,
      supportingData: copy?.insightSupportingData ?? [
        { label: 'PRODUCTIVE', value: `${shortNumber(productiveHours)}H` },
        { label: 'DISTRACTING', value: `${shortNumber(distractingHours)}H` },
      ],
    },
  });

  if (copy?.funFact) cards.push(buildFunFact('rescuetime', copy.funFact));
  if (copy?.streakHighlight) cards.push(buildStreak('rescuetime', copy.streakHighlight, 'Focus streak'));
  if (copy?.superlative) cards.push(buildSuperlative('rescuetime', copy.superlative, 'Pulse', String(avgPulse)));

  const chart = buildChart('rescuetime', stats);
  if (chart) cards.push(chart);

  cards.push(buildCommunity('rescuetime', 'productivity', `${avgPulse} pulse`, avgPulse));

  if (copy?.trendObservation) cards.push(buildTrend('rescuetime', copy.trendObservation, productiveHours > distractingHours ? 'up' : 'down', 'Productivity trend'));

  return cards;
}

function buildTodoistCards(stats: ServiceStats, copy?: ServiceCopySuggestions): WrappedCard[] {
  const projects = stats.aggregates.top_items.find((group) => group.category === 'projects')?.items ?? [];
  const tasksCompleted = stats.aggregates.totals.tasksCompleted ?? 0;
  const recentCompleted = stats.aggregates.totals.recentCompleted ?? 0;
  const dailyAverage = stats.aggregates.totals.dailyAverage ?? 0;
  const topProject = String(stats.aggregates.streaks.topProject ?? projects[0]?.name ?? 'No project');
  const completionStyle = String(stats.aggregates.streaks.completionStyle ?? 'building habits');

  const cards: WrappedCard[] = [
    {
      id: cardId(),
      type: 'hero_stat',
      service: 'todoist',
      data: {
        stat: shortNumber(tasksCompleted),
        value: 'Tasks completed',
        comparison: copy?.heroComparison ?? `${topProject} was your productivity engine with ${dailyAverage} tasks per day.`,
      },
    },
  ];

  const topProjects = buildTopList('todoist', 'Your Top Projects', projects);
  if (topProjects) cards.push(topProjects);

  cards.push({
    id: cardId(),
    type: 'insight',
    service: 'todoist',
    data: {
      headline: copy?.insightHeadline ?? `You are a ${completionStyle} — ${shortNumber(recentCompleted)} tasks knocked out recently`,
      supportingData: copy?.insightSupportingData ?? [
        { label: 'RECENT', value: String(recentCompleted) },
        { label: 'DAILY AVG', value: String(dailyAverage) },
      ],
    },
  });

  if (copy?.funFact) cards.push(buildFunFact('todoist', copy.funFact));
  if (copy?.streakHighlight) cards.push(buildStreak('todoist', copy.streakHighlight, 'Completion streak'));
  if (copy?.superlative) cards.push(buildSuperlative('todoist', copy.superlative, 'Tasks', shortNumber(tasksCompleted)));

  const chart = buildChart('todoist', stats);
  if (chart) cards.push(chart);

  cards.push(buildCommunity('todoist', 'task mastery', `${shortNumber(tasksCompleted)} tasks`, tasksCompleted));

  if (copy?.trendObservation) cards.push(buildTrend('todoist', copy.trendObservation, 'up', 'Completion trend'));

  return cards;
}

const builders: Partial<Record<ServiceId, (stats: ServiceStats, copy?: ServiceCopySuggestions) => WrappedCard[]>> = {
  spotify: buildSpotifyCards,
  strava: buildStravaCards,
  fitbit: buildFitbitCards,
  lastfm: buildLastfmCards,
  steam: buildSteamCards,
  github: buildGitHubCards,
  notion: buildNotionCards,
  apple_health: buildAppleHealthCards,
  trakt: buildTraktCards,
  reddit: buildRedditCards,
  rescuetime: buildRescueTimeCards,
  todoist: buildTodoistCards,
};

/* ─── Share summary ────────────────────────────────────────────────────────── */

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
      case 'github':
        return `${shortNumber(serviceStats.aggregates.totals.starsEarned ?? 0)} stars earned`;
      case 'notion':
        return `${shortNumber(serviceStats.aggregates.totals.pageCount ?? 0)} pages indexed`;
      case 'trakt':
        return `${shortNumber(serviceStats.aggregates.totals.totalHours ?? 0)} hours watched`;
      case 'reddit':
        return `${shortNumber(serviceStats.aggregates.totals.totalKarma ?? 0)} karma earned`;
      case 'rescuetime':
        return `${shortNumber(serviceStats.aggregates.totals.totalHours ?? 0)} hours tracked`;
      case 'todoist':
        return `${shortNumber(serviceStats.aggregates.totals.tasksCompleted ?? 0)} tasks done`;
      default:
        return serviceStats.service;
    }
  });

  return fragments.filter(Boolean).join(' · ');
}

/* ─── Main selector with narrative flow ─────────────────────────────────────── */

export function selectCards(
  stats: ServiceStats[],
  copyByService: Partial<Record<ServiceId, ServiceCopySuggestions>> = {},
  crossServiceInsights: Array<{ headline: string; description: string; servicesInvolved: string[] }> = [],
  maxCards = 25,
): WrappedCard[] {
  const cards: WrappedCard[] = [];

  // 1) Opener card
  const periodLabel = stats[0]?.period ? `${stats[0].period.start} to ${stats[0].period.end}` : 'this period';
  cards.push(buildOpener(stats.length, periodLabel));

  // 2) Build all service cards
  const serviceCards: Map<ServiceId, WrappedCard[]> = new Map();
  for (const serviceStats of stats) {
    const builder = builders[serviceStats.service];
    if (!builder) continue;
    const built = builder(serviceStats, copyByService[serviceStats.service]);
    serviceCards.set(serviceStats.service, built);
  }

  // 3) Interleave service cards for narrative flow
  // Take round-robin from each service to mix things up
  const serviceIds = Array.from(serviceCards.keys());
  let round = 0;
  let addedInRound = 1;

  while (addedInRound > 0 && cards.length < maxCards - 2) {
    addedInRound = 0;
    for (const serviceId of serviceIds) {
      const built = serviceCards.get(serviceId)!;
      if (round < built.length) {
        cards.push(built[round]);
        addedInRound++;
        if (cards.length >= maxCards - 2) break;
      }
    }
    round++;
  }

  // 4) Cross-service insight cards (insert before the share card)
  for (const insight of crossServiceInsights.slice(0, 2)) {
    if (cards.length >= maxCards - 1) break;
    cards.push(buildCrossServiceCard(insight.headline, insight.description, insight.servicesInvolved));
  }

  // 5) Share card (always last)
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
