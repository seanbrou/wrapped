// ═══════════════════════════════════════════════════════════════
// Mock data: templates, periods, sample recap cards.
// ═══════════════════════════════════════════════════════════════

export const PERIODS = [
  { label: 'This year', value: 'year' },
  { label: '6 months', value: '6months' },
  { label: 'All time', value: 'all' },
];

export interface Template {
  id: string;
  name: string;
  blurb: string;
  accentKey: 'mint' | 'red' | 'amber' | 'sky' | 'lilac' | 'coral';
  services: string[];
  approxCards: number;
  tag: string;
}

export const TEMPLATES: Template[] = [
  {
    id: 'year',
    name: 'Year in Review',
    blurb: 'Everything you do, in one story.',
    accentKey: 'lilac',
    services: [
      'spotify', 'apple_health', 'strava', 'goodreads', 'steam',
      'fitbit', 'youtube', 'lastfm',
    ],
    approxCards: 15,
    tag: 'Recommended',
  },
  {
    id: 'music',
    name: 'Just Music',
    blurb: 'Top artists, genres and minutes.',
    accentKey: 'mint',
    services: ['spotify'],
    approxCards: 6,
    tag: 'Spotify',
  },
  {
    id: 'fitness',
    name: 'Fitness Pulse',
    blurb: 'Runs, rides and movement, stitched together.',
    accentKey: 'red',
    services: ['apple_health', 'strava', 'fitbit'],
    approxCards: 8,
    tag: 'Health',
  },
  {
    id: 'reader',
    name: "Reader's Cut",
    blurb: 'Books finished, pages devoured.',
    accentKey: 'amber',
    services: ['goodreads'],
    approxCards: 6,
    tag: 'Books',
  },
  {
    id: 'gamer',
    name: 'Gamer Log',
    blurb: 'Hours, games, achievements.',
    accentKey: 'sky',
    services: ['steam'],
    approxCards: 6,
    tag: 'Games',
  },
  {
    id: 'custom',
    name: 'Custom mix',
    blurb: 'Pick your own apps and length.',
    accentKey: 'coral',
    services: [],
    approxCards: 10,
    tag: 'Build yourself',
  },
];

export const MOCK_WRAPPED = {
  id: 'demo-session-2026',
  cards: [
    {
      type: 'hero_stat',
      service: 'spotify',
      data: {
        stat: '32,847',
        value: 'Minutes listened this year',
        unit: 'minutes',
        comparison: "That's 2x more than last year.",
      },
    },
    {
      type: 'top_list',
      service: 'spotify',
      data: {
        title: 'Your Top Artists',
        items: [
          { rank: 1, name: 'Radiohead', stat: '847 plays' },
          { rank: 2, name: 'Tyler, the Creator', stat: '623 plays' },
          { rank: 3, name: 'Tame Impala', stat: '512 plays' },
          { rank: 4, name: 'King Krule', stat: '401 plays' },
          { rank: 5, name: 'Frank Ocean', stat: '378 plays' },
        ],
      },
    },
    {
      type: 'community',
      service: 'spotify',
      data: {
        percentile: 5,
        metric: 'listening time',
        value: '548 hours',
      },
    },
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
    {
      type: 'hero_stat',
      service: 'strava',
      data: {
        stat: '351',
        value: 'Miles run this year',
        unit: 'miles',
        comparison: 'You ran further than NYC to DC.',
      },
    },
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
    {
      type: 'hero_stat',
      service: 'goodreads',
      data: {
        stat: '47',
        value: 'Books read this year',
        unit: 'books',
        comparison: "That's almost one per week.",
      },
    },
    {
      type: 'top_list',
      service: 'goodreads',
      data: {
        title: 'Your Top Books',
        items: [
          { rank: 1, name: 'The Three-Body Problem', stat: 'Five stars' },
          { rank: 2, name: 'Project Hail Mary', stat: 'Five stars' },
          { rank: 3, name: 'Tomorrow, and Tomorrow', stat: 'Four and a half' },
          { rank: 4, name: 'Klara and the Sun', stat: 'Four stars' },
          { rank: 5, name: 'Piranesi', stat: 'Four stars' },
        ],
      },
    },
    {
      type: 'community',
      service: 'goodreads',
      data: {
        percentile: 2,
        metric: 'books read',
        value: '47 books',
      },
    },
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
    {
      type: 'chart',
      service: 'steam',
      data: {
        title: 'Top Games by Hours',
        chartType: 'bar',
        data: [234, 142, 89, 76, 52],
        labels: ['Elden Ring', "Baldur's Gate", 'Cyberpunk', 'Hades', 'Celeste'],
      },
    },
    {
      type: 'hero_stat',
      service: 'apple_health',
      data: {
        stat: '2.4M',
        value: 'Steps taken this year',
        unit: 'steps',
        comparison: "That's walking from NYC to LA.",
      },
    },
    {
      type: 'community',
      service: 'apple_health',
      data: {
        percentile: 8,
        metric: 'daily activity',
        value: '87 avg min/day',
      },
    },
    {
      type: 'share',
      service: 'all',
      data: {
        stat: '32,847 minutes of music · 351 miles run · 47 books read',
        headline: 'My 2026, Wrapped.',
      },
    },
  ],
};
