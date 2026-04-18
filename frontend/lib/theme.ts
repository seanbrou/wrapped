export const colors = {
  background: '#0A0A0F',
  surface: '#13131A',
  surfaceElevated: '#1A1A24',
  border: '#1E1E2E',
  primary: '#FFFFFF',
  secondary: '#8A8A9A',
  muted: '#4A4A5A',
  gradientStart: '#6C5CE7',
  gradientEnd: '#00D4FF',
  accentPurple: '#7B5CE7',
  accentCyan: '#00D4FF',
  spotify: '#1DB954',
  success: '#00C48C',
  danger: '#FF4757',
};

export const gradients = {
  purple: ['#7B5CE7', '#B45CE7'] as [string, string],
  cyan: ['#00D4FF', '#0099CC'] as [string, string],
  gold: ['#FFD700', '#FF8C00'] as [string, string],
  spotify: ['#1DB954', '#1ED760'] as [string, string],
  health: ['#FF6B6B', '#FF8E53'] as [string, string],
  strava: ['#FC4C02', '#FF8C00'] as [string, string],
  goodreads: ['#663399', '#9966CC'] as [string, string],
  steam: ['#1B2838', '#2A475E'] as [string, string],
};

export function getServiceGradient(serviceId: string): [string, string] {
  const map: Record<string, [string, string]> = {
    spotify: gradients.spotify,
    apple_health: gradients.health,
    strava: gradients.strava,
    goodreads: gradients.goodreads,
    steam: gradients.steam,
  };
  return gradients.purple;
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 8,
  md: 16,
  lg: 24,
  full: 9999,
};

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}
