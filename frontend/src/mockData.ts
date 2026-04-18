export interface Service {
  id: string;
  name: string;
  logo: string;
  connected: boolean;
  lastSynced?: string;
}

export interface TopItem {
  rank: number;
  name: string;
  value: string;
  imageUrl?: string;
}

export interface ChartDataPoint {
  label: string;
  value: number;
}

export interface WrappedCard {
  id: string;
  type: 'hero' | 'topList' | 'insight' | 'chart' | 'comparison' | 'community' | 'share';
  service: string;
  title?: string;
  stat?: string;
  subtitle?: string;
  items?: TopItem[];
  chartData?: ChartDataPoint[];
  percentile?: number;
  comparison?: { current: number; previous: number; label: string };
}

export interface WrappedData {
  id: string;
  userId: string;
  year: number;
  services: string[];
  cards: WrappedCard[];
  createdAt: string;
}

export const MOCK_SERVICES: Service[] = [
  { id: 'spotify', name: 'Spotify', logo: 'https://upload.wikimedia.org/wikipedia/commons/1/19/Spotify_logo_without_text.svg', connected: true, lastSynced: '2026-04-15' },
  { id: 'apple_health', name: 'Apple Health', logo: 'https://upload.wikimedia.org/wikipedia/commons/3/3c/Apple_Health_logo.svg', connected: true, lastSynced: '2026-04-18' },
  { id: 'strava', name: 'Strava', logo: 'https://upload.wikimedia.org/wikipedia/commons/4/42/Strava_logo.svg', connected: false },
  { id: 'goodreads', name: 'Goodreads', logo: 'https://upload.wikimedia.org/wikipedia/commons/b/b3/Goodreads_logo.svg', connected: false },
  { id: 'steam', name: 'Steam', logo: 'https://upload.wikimedia.org/wikipedia/commons/8/83/Steam_icon_logo.svg', connected: false },
];

export const MOCK_WRAPPED: WrappedData = {
  id: 'wrapped-2025',
  userId: 'user-123',
  year: 2025,
  services: ['spotify', 'apple_health'],
  cards: [
    {
      id: 'card-1',
      type: 'hero',
      service: 'spotify',
      title: 'Total Minutes Listened',
      stat: '42,847',
      subtitle: 'More than 29 days of music!',
    },
    {
      id: 'card-2',
      type: 'topList',
      service: 'spotify',
      title: 'Top Artists',
      items: [
        { rank: 1, name: 'Kendrick Lamar', value: '2,847 min' },
        { rank: 2, name: 'Tyler, The Creator', value: '2,156 min' },
        { rank: 3, name: 'Frank Ocean', value: '1,923 min' },
        { rank: 4, name: 'Playboi Carti', value: '1,847 min' },
        { rank: 5, name: 'JPEGMAFIA', value: '1,654 min' },
      ],
    },
    {
      id: 'card-3',
      type: 'insight',
      service: 'spotify',
      title: "You're in your music era",
      subtitle: 'Kendrick on repeat — you really went deep this year.',
    },
    {
      id: 'card-4',
      type: 'chart',
      service: 'spotify',
      title: 'Monthly Listening',
      chartData: [
        { label: 'Jan', value: 3200 },
        { label: 'Feb', value: 2800 },
        { label: 'Mar', value: 3500 },
        { label: 'Apr', value: 3100 },
        { label: 'May', value: 2900 },
        { label: 'Jun', value: 3800 },
        { label: 'Jul', value: 4200 },
        { label: 'Aug', value: 3900 },
        { label: 'Sep', value: 3600 },
        { label: 'Oct', value: 3400 },
        { label: 'Nov', value: 3100 },
        { label: 'Dec', value: 3547 },
      ],
    },
    {
      id: 'card-5',
      type: 'comparison',
      service: 'spotify',
      title: 'vs Last Year',
      comparison: { current: 42847, previous: 35120, label: 'Minutes Listened' },
    },
    {
      id: 'card-6',
      type: 'community',
      service: 'spotify',
      title: 'You vs Listeners',
      percentile: 8,
      subtitle: 'Top 8% of listeners worldwide',
    },
    {
      id: 'card-7',
      type: 'hero',
      service: 'apple_health',
      title: 'Total Steps',
      stat: '4,287,593',
      subtitle: 'That\'s 2,053 miles!',
    },
    {
      id: 'card-8',
      type: 'topList',
      service: 'apple_health',
      title: 'Top Workouts',
      items: [
        { rank: 1, name: 'Running', value: '87 sessions' },
        { rank: 2, name: 'Cycling', value: '65 sessions' },
        { rank: 3, name: 'HIIT', value: '42 sessions' },
        { rank: 4, name: 'Walking', value: '38 sessions' },
        { rank: 5, name: 'Yoga', value: '24 sessions' },
      ],
    },
    {
      id: 'card-9',
      type: 'insight',
      service: 'apple_health',
      title: 'Fitness Machine',
      subtitle: '247 workouts — you did not skip leg day.',
    },
    {
      id: 'card-10',
      type: 'chart',
      service: 'apple_health',
      title: 'Activity Trend',
      chartData: [
        { label: 'Jan', value: 180 },
        { label: 'Feb', value: 195 },
        { label: 'Mar', value: 210 },
        { label: 'Apr', value: 225 },
        { label: 'May', value: 240 },
        { label: 'Jun', value: 255 },
        { label: 'Jul', value: 270 },
        { label: 'Aug', value: 265 },
        { label: 'Sep', value: 280 },
        { label: 'Oct', value: 295 },
        { label: 'Nov', value: 287 },
        { label: 'Dec', value: 247 },
      ],
    },
    {
      id: 'card-11',
      type: 'comparison',
      service: 'apple_health',
      title: 'vs Last Year',
      comparison: { current: 247, previous: 198, label: 'Workouts' },
    },
    {
      id: 'card-12',
      type: 'community',
      service: 'apple_health',
      title: 'You vs Users',
      percentile: 5,
      subtitle: 'Top 5% most active users',
    },
  ],
  createdAt: '2026-04-18T12:00:00Z',
};