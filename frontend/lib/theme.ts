export const colors = {
  background: '#0A0A0F',
  surface: '#13131A',
  surfaceElevated: '#1A1A24',
  border: '#1E1E2E',
  primary: '#FFFFFF',
  secondary: '#8A8A9A',
  muted: '#4A4A5A',
  accentPurple: '#6C5CE7',
  accentCyan: '#00D4FF',
  spotify: '#1DB954',
  strava: '#FC4C02',
  danger: '#FF4757',
  success: '#1DB954',
};

export const gradients = {
  accent: ['#6C5CE7', '#00D4FF'] as const,
  spotify: ['#1DB954', '#169C46'] as const,
  strava: ['#FC4C02', '#D44000'] as const,
  health: ['#FC3C44', '#D4303B'] as const,
  steam: ['#1B2838', '#0F1923'] as const,
  goodreads: ['#663311', '#4A2409'] as const,
};

export const fonts = {
  regular: 'System',
  mono: 'System',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export function getServiceGradient(service: string): readonly [string, string] {
  switch (service) {
    case 'spotify': return gradients.spotify;
    case 'strava': return gradients.strava;
    case 'apple_health': return gradients.health;
    case 'steam': return gradients.steam;
    case 'goodreads': return gradients.goodreads;
    default: return gradients.accent;
  }
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString();
}
