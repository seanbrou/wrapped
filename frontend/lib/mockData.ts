import type { WrappedCard } from './api';

export const MOCK_WRAPPED = {
  id: 'mock-2025',
  services: ['spotify', 'apple_health', 'strava', 'goodreads', 'steam'],
  periodStart: '2024-01-01',
  periodEnd: '2025-12-31',
  cards: [
    {
      id: 'c1',
      type: 'hero_stat',
      service: 'intro',
      title: "Here's Your Year",
      data: { value: 2025, unit: '', label: '2025 Wrapped' },
    },
    {
      id: 'c2',
      type: 'hero_stat',
      service: 'spotify',
      title: '207 Hours',
      data: { value: 207, unit: 'hours streamed', comparison: 'Up 23% from last year', emoji: '🎧' },
    },
    {
      id: 'c3',
      type: 'top_list',
      service: 'spotify',
      title: 'Your Top Artists',
      data: {
        items: [
          { name: 'The Weeknd', count: 342 },
          { name: 'Kendrick Lamar', count: 287 },
          { name: 'Drake', count: 256 },
          { name: 'Frank Ocean', count: 198 },
          { name: 'Tyler, the Creator', count: 174 },
        ],
        category: 'artists',
      },
    },
    {
      id: 'c4',
      type: 'insight',
      service: 'spotify',
      title: 'Your 2025 Vibe',
      data: {
        text: '60% late-night drives, 30% gym grind, 10% existential dread',
        chips: ['#1 genre: hip-hop', '342 plays'],
      },
    },
    {
      id: 'c5',
      type: 'chart',
      service: 'spotify',
      title: 'Your Listening Journey',
      data: {
        chartType: 'area',
        data: [120, 145, 132, 158, 167, 189, 201, 195, 178, 210, 234, 256],
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        unit: 'hours',
      },
    },
    {
      id: 'c6',
      type: 'community',
      service: 'apple_health',
      title: 'How You Stack Up',
      data: { metric: 'steps worldwide', value: '3.8M steps', percentile: 5 },
    },
    {
      id: 'c7',
      type: 'hero_stat',
      service: 'apple_health',
      title: '3.8M',
      data: { value: 3847291, unit: 'steps taken', comparison: '12 miles walked per day', emoji: '👟' },
    },
    {
      id: 'c8',
      type: 'chart',
      service: 'apple_health',
      title: 'Workouts This Year',
      data: {
        chartType: 'bar',
        data: [12, 15, 18, 14, 21, 19, 22, 25, 20, 23, 28, 31],
        labels: ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'],
        unit: 'sessions',
      },
    },
    {
      id: 'c9',
      type: 'hero_stat',
      service: 'strava',
      title: '1,247 km',
      data: { value: 1247, unit: 'total distance', comparison: "That's 21x around Manhattan", emoji: '🏃' },
    },
    {
      id: 'c10',
      type: 'insight',
      service: 'strava',
      title: 'Consistency Check',
      data: {
        text: '94 activities logged. Your Strava grid is lighting up.',
        chips: ['Top sport: Running', '94 total activities'],
      },
    },
    {
      id: 'c11',
      type: 'chart',
      service: 'strava',
      title: 'Distance Each Month',
      data: {
        chartType: 'area',
        data: [42, 55, 38, 67, 89, 102, 95, 88, 74, 98, 115, 124],
        labels: ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'],
        unit: 'km',
      },
    },
    {
      id: 'c12',
      type: 'hero_stat',
      service: 'goodreads',
      title: '47 Books',
      data: { value: 47, unit: 'books read', comparison: '~273 pages each on average', emoji: '📚' },
    },
    {
      id: 'c13',
      type: 'insight',
      service: 'goodreads',
      title: 'Daily Reading',
      data: {
        text: '35 pages a day keeps the brain engaged.',
        chips: ['12,834 total pages'],
      },
    },
    {
      id: 'c14',
      type: 'hero_stat',
      service: 'steam',
      title: '1,347 hrs',
      data: { value: 1347, unit: 'of gaming', comparison: "That's 56 full days in-game", emoji: '🎮' },
    },
    {
      id: 'c15',
      type: 'comparison',
      service: 'spotify',
      title: 'This Year vs Last Year',
      data: { labels: ['Last Year', 'This Year'], values: [9840, 12430], unit: 'minutes' },
    },
    {
      id: 'c16',
      type: 'share',
      service: 'spotify',
      title: 'My 2025 Wrapped',
      data: { stat: '12,430 minutes of music', service: 'spotify' },
    },
  ] as WrappedCard[],
  insights: [
    'You streamed enough music to fill 173 full playlists. Your ears have taste.',
    'Your most-listened month was December. Holiday bangers hit different.',
    'You read 47 books. The library called. It misses you.',
    'You ran 1,247km. That\'s not running. That\'s time traveling.',
  ],
};

export const SERVICE_DETAILS = [
  {
    id: 'spotify',
    name: 'Spotify',
    gradient: '#1DB954',
    description: 'Top artists, tracks, minutes listened',
    color: '#1DB954',
  },
  {
    id: 'apple_health',
    name: 'Apple Health',
    gradient: '#FC3C44',
    description: 'Steps, workouts, calories burned',
    color: '#FC3C44',
  },
  {
    id: 'strava',
    name: 'Strava',
    gradient: '#FC4C02',
    description: 'Runs, rides, distances covered',
    color: '#FC4C02',
  },
  {
    id: 'goodreads',
    name: 'Goodreads',
    gradient: '#663311',
    description: 'Books read, pages flipped',
    color: '#663311',
  },
  {
    id: 'steam',
    name: 'Steam',
    gradient: '#1B2838',
    description: 'Games played, hours clocked',
    color: '#1B2838',
  },
];

export const PERIODS = [
  { label: 'This Year', value: 'year' },
  { label: 'Last 6 Months', value: '6months' },
  { label: 'Last 3 Months', value: '3months' },
  { label: 'Custom', value: 'custom' },
];
