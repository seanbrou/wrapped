// ═══════════════════════════════════════════════════════════════
// Mock Data — Richer demo data for the redesigned Wrapped app
// ═══════════════════════════════════════════════════════════════

export const SERVICE_DETAILS = [
  { id: 'spotify', name: 'Spotify', emoji: '🎧', description: 'Music, podcasts, listening history', color: '#1DB954', gradient: ['#1DB954', '#1ED760'] as const },
  { id: 'apple_health', name: 'Apple Health', emoji: '❤️', description: 'Steps, workouts, sleep data', color: '#FF6B6B', gradient: ['#FF6B6B', '#FF8E8E'] as const },
  { id: 'strava', name: 'Strava', emoji: '🏃', description: 'Runs, rides, activity stats', color: '#FC4C02', gradient: ['#FC4C02', '#FF6B35'] as const },
  { id: 'goodreads', name: 'Goodreads', emoji: '📚', description: 'Books read, pages, genres', color: '#C8B882', gradient: ['#C8B882', '#F4F1EA'] as const },
  { id: 'steam', name: 'Steam', emoji: '🎮', description: 'Games played, hours, achievements', color: '#66C0F4', gradient: ['#1B2838', '#66C0F4'] as const },
];

export const PERIODS = [
  { label: 'This Year', value: 'year' },
  { label: 'Last 6 Months', value: '6months' },
  { label: 'All Time', value: 'all' },
];

// ═══════════════════════════════════════════════════════════════
// Wrapped session mock
// ═══════════════════════════════════════════════════════════════

export const MOCK_WRAPPED = {
  id: 'demo-session-2026',
  cards: [
    // 1. Hero stat — Spotify minutes
    {
      type: 'hero_stat',
      service: 'spotify',
      data: {
        stat: '32,847',
        value: 'Minutes listened this year',
        unit: 'minutes',
        comparison: "That's 2x more than last year 🔥",
      },
    },
    // 2. Top list — top artists
    {
      type: 'top_list',
      service: 'spotify',
      data: {
        title: 'Your Top Artists',
        items: [
          { rank: 1, name: 'Radiohead', stat: '847 plays', emoji: '🎸' },
          { rank: 2, name: 'Tyler, the Creator', stat: '623 plays', emoji: '🎤' },
          { rank: 3, name: 'Tame Impala', stat: '512 plays', emoji: '🌀' },
          { rank: 4, name: 'King Krule', stat: '401 plays', emoji: '🎵' },
          { rank: 5, name: 'Frank Ocean', stat: '378 plays', emoji: '🌊' },
        ],
      },
    },
    // 3. Community card — Spotify percentile
    {
      type: 'community',
      service: 'spotify',
      data: {
        percentile: 5,
        metric: 'listening time',
        value: '548 hours',
      },
    },
    // 4. Insight card
    {
      type: 'insight',
      service: 'spotify',
      data: {
        headline: 'You listened to more jazz this year than the entire population of New Orleans',
        supportingData: [
          { label: 'JAZZ HOURS', value: '142' },
          { label: 'GENRES', value: '23' },
        ],
      },
    },
    // 5. Chart card — Strava miles
    {
      type: 'chart',
      service: 'strava',
      data: {
        title: 'Monthly Running Distance',
        chartType: 'area',
        data: [12, 18, 24, 31, 28, 42, 35, 48, 40, 36, 22, 15],
        labels: ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'],
      },
    },
    // 6. Hero stat — Strava miles
    {
      type: 'hero_stat',
      service: 'strava',
      data: {
        stat: '351',
        value: 'Miles run this year',
        unit: 'miles',
        comparison: 'You ran a marathon every 3 days 🏃',
      },
    },
    // 7. Comparison — This year vs last
    {
      type: 'comparison',
      service: 'strava',
      data: {
        title: 'You vs. Last Year',
        labels: ['This Year', 'Last Year', 'Average'],
        values: [351, 287, 198],
        unit: 'mi',
      },
    },
    // 8. Hero stat — Goodreads books
    {
      type: 'hero_stat',
      service: 'goodreads',
      data: {
        stat: '47',
        value: 'Books read this year',
        unit: 'books',
        comparison: "That's almost one per week 📖",
      },
    },
    // 9. Top list — top books
    {
      type: 'top_list',
      service: 'goodreads',
      data: {
        title: 'Your Top Books',
        items: [
          { rank: 1, name: 'The Three-Body Problem', stat: '★★★★★', emoji: '📖' },
          { rank: 2, name: 'Project Hail Mary', stat: '★★★★★', emoji: '🚀' },
          { rank: 3, name: 'Tomorrow, and Tomorrow', stat: '★★★★½', emoji: '🎮' },
          { rank: 4, name: 'Klara and the Sun', stat: '★★★★', emoji: '☀️' },
          { rank: 5, name: 'Piranesi', stat: '★★★★', emoji: '🏛️' },
        ],
      },
    },
    // 10. Community — Goodreads percentile
    {
      type: 'community',
      service: 'goodreads',
      data: {
        percentile: 2,
        metric: 'books read',
        value: '47 books',
      },
    },
    // 11. Insight — Steam
    {
      type: 'insight',
      service: 'steam',
      data: {
        headline: 'You spent more time in Elden Ring than most people spend commuting',
        supportingData: [
          { label: 'HOURS', value: '234' },
          { label: 'DEATHS', value: '1,847' },
        ],
      },
    },
    // 12. Chart — Steam hours
    {
      type: 'chart',
      service: 'steam',
      data: {
        title: 'Top Games by Hours',
        chartType: 'bar',
        data: [234, 142, 89, 76, 52],
        labels: ['Elden Ring', 'Baldurs Gate', 'Cyberpunk', 'Hades', 'Celeste'],
      },
    },
    // 13. Hero stat — Apple Health steps
    {
      type: 'hero_stat',
      service: 'apple_health',
      data: {
        stat: '2.4M',
        value: 'Steps taken this year',
        unit: 'steps',
        comparison: "That's walking from NYC to LA 🔥",
      },
    },
    // 14. Community — Apple Health
    {
      type: 'community',
      service: 'apple_health',
      data: {
        percentile: 8,
        metric: 'daily activity',
        value: '87 avg min/day',
      },
    },
    // 15. Share card
    {
      type: 'share',
      service: 'spotify',
      data: {
        stat: '32,847 minutes of music, 351 miles run, 47 books read',
      },
    },
  ],
};