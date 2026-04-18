import type { WrappedCard } from './api';

export const SERVICE_DETAILS = [
  { id: 'spotify', name: 'Spotify', color: '#1DB954' },
  { id: 'apple_health', name: 'Apple Health', color: '#FF6B6B' },
  { id: 'strava', name: 'Strava', color: '#FC4C02' },
  { id: 'goodreads', name: 'Goodreads', color: '#663399' },
  { id: 'steam', name: 'Steam', color: '#1B2838' },
];

export const PERIODS = [
  { value: 'year', label: 'Year' },
  { value: '6months', label: '6 Months' },
  { value: '3months', label: '3 Months' },
  { value: 'month', label: 'Month' },
];

export const MOCK_INSIGHTS = [
  'Your 2025 vibe: 60% productivity, 30% chaos, 10% chaotic espresso.',
  'Spotify knows you better than your therapist — 47,382 minutes of deep cuts.',
  "You're in the top 5% of readers worldwide. Bibliophile energy.",
  'Your most chaotic month was March — 47 books and 12 all-nighters.',
  'Health stats: 4.2M steps, 247 workouts, 0 excuses.',
  "You outran 94% of Strava users this year. Speed demon energy.",
];

const makeHeroCard = (id: string, title: string, value: string, subtitle: string, service: string) => ({
  id,
  type: 'hero_stat' as const,
  service,
  title,
  data: { value, unit: '', subtitle, emoji: '🎵' },
});

const makeTopListCard = (id: string, title: string, items: { name: string; count: number }[], service: string) => ({
  id,
  type: 'top_list' as const,
  service,
  title,
  data: { items, emoji: '🎵' },
});

const makeInsightCard = (id: string, title: string, text: string) => ({
  id,
  type: 'insight' as const,
  service: 'spotify',
  title,
  data: { text },
});

const makeChartCard = (id: string, title: string, data: number[], labels: string[], service: string) => ({
  id,
  type: 'chart' as const,
  service,
  title,
  data: { chartType: 'area' as const, data, labels, unit: 'min' },
});

const makeCommunityCard = (id: string, percentile: number, metric: string, value: string) => ({
  id,
  type: 'community' as const,
  service: 'spotify',
  title: 'You vs Listeners',
  data: { percentile, metric, value },
});

const makeComparisonCard = (id: string, title: string, labels: string[], values: number[], unit: string) => ({
  id,
  type: 'comparison' as const,
  service: 'spotify',
  title,
  data: { labels, values, unit },
});

export const MOCK_CARDS: WrappedCard[] = [
  makeHeroCard('card-1', 'Total Minutes', '42,847', 'More than 29 days of music!', 'spotify'),
  makeTopListCard('card-2', 'Top Artists', [
    { name: 'Kendrick Lamar', count: 2847 },
    { name: 'Tyler, The Creator', count: 2156 },
    { name: 'Frank Ocean', count: 1923 },
    { name: 'Playboi Carti', count: 1847 },
    { name: 'JPEGMAFIA', count: 1654 },
  ], 'spotify'),
  makeInsightCard('card-3', "You're in your music era", 'Kendrick on repeat — you really went deep this year.'),
  makeChartCard('card-4', 'Monthly Listening', [3200, 2800, 3500, 3100, 2900, 3800, 4200, 3900, 3600, 3400, 3100, 3547],
    ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'], 'spotify'),
  makeCommunityCard('card-5', 8, 'Minutes Listened', 'Top 8% of listeners worldwide'),
  makeComparisonCard('card-6', 'vs Last Year', ['2024', '2025'], [35120, 42847], 'min'),
  makeHeroCard('card-7', 'Total Steps', '4.2M', "That's 2,053 miles!", 'apple_health'),
  makeTopListCard('card-8', 'Top Workouts', [
    { name: 'Running', count: 87 },
    { name: 'Cycling', count: 65 },
    { name: 'HIIT', count: 42 },
    { name: 'Walking', count: 38 },
    { name: 'Yoga', count: 24 },
  ], 'apple_health'),
  makeInsightCard('card-9', 'Fitness Machine', '247 workouts — you did not skip leg day.'),
  makeChartCard('card-10', 'Activity Trend', [180, 195, 210, 225, 240, 255, 270, 265, 280, 295, 287, 247],
    ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'], 'apple_health'),
  makeCommunityCard('card-11', 5, 'Workouts', 'Top 5% most active users'),
  makeComparisonCard('card-12', 'vs Last Year', ['2024', '2025'], [198, 247], 'workouts'),
];

export const MOCK_WRAPPED = {
  id: 'wrapped-2025',
  sessionId: 'mock-session-2025',
  year: 2025,
  services: ['spotify', 'apple_health'],
  cards: MOCK_CARDS,
  insights: MOCK_INSIGHTS,
  createdAt: '2026-04-18T12:00:00Z',
};
