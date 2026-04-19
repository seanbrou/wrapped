// ═══════════════════════════════════════════════════════════════
// Wrapped — Cinematic Dark Luxury Design System v2
// Deep black canvas, vivid neon gradients, glass surfaces,
// spring-physics motion, premium typography
// ═══════════════════════════════════════════════════════════════

import { StyleSheet, Platform } from 'react-native';

// ─── Color Palette ───────────────────────────────────────────
export const colors = {
  // Foundations
  background:     '#06060C',
  surface:        '#0D0D18',
  surfaceElevated:'#12121F',
  surfaceHover:   '#181828',
  border:         '#1A1A2E',
  borderLight:    '#252540',
  borderFocus:    '#3A3A5C',

  // Text hierarchy
  primary:        '#FFFFFF',
  secondary:      '#7E7E96',
  tertiary:       '#4D4D66',
  muted:          '#33334D',

  // Accent system — Purple → Fuchsia → Cyan
  accentPurple:   '#6C5CE7',
  accentFuchsia:  '#E040FB',
  accentCyan:     '#00E5FF',
  accentPink:     '#FF2D78',
  accentGold:     '#FFD700',
  accentOrange:   '#FF6B35',

  // Semantic
  success:        '#00E676',
  successMuted:   'rgba(0, 230, 118, 0.12)',
  danger:         '#FF4057',
  dangerMuted:    'rgba(255, 64, 87, 0.12)',
  warning:        '#FFAB40',

  // Service brand colors
  spotify:        '#1DB954',
  appleHealth:    '#FF375F',
  strava:         '#FC4C02',
  goodreads:      '#5C4033',
  steam:          '#66C0F4',

  // Glass
  glassFill:      'rgba(255, 255, 255, 0.03)',
  glassStroke:    'rgba(255, 255, 255, 0.06)',
  glassHighlight: 'rgba(255, 255, 255, 0.09)',
  glassFill2:     'rgba(255, 255, 255, 0.05)',

  // Overlay
  overlay:        'rgba(6, 6, 12, 0.85)',
  overlayLight:   'rgba(6, 6, 12, 0.5)',
} as const;

// ─── Gradient Definitions ─────────────────────────────────────
export const gradients = {
  primary:      ['#6C5CE7', '#E040FB', '#00E5FF'] as const,
  warm:         ['#6C5CE7', '#E040FB'] as const,
  cool:         ['#00E5FF', '#6C5CE7'] as const,
  fuchsiaCyan:  ['#E040FB', '#00E5FF'] as const,
  fire:         ['#FF2D78', '#FF6B35', '#FFD700'] as const,
  gold:         ['#FFD700', '#FF6B35'] as const,
  spotify:      ['#1DB954', '#1ED760'] as const,
  health:       ['#FF375F', '#FF6B8A'] as const,
  strava:       ['#FC4C02', '#FF6B35'] as const,
  goodreads:    ['#8B6914', '#C8A84E'] as const,
  steam:        ['#1B2838', '#66C0F4'] as const,
  ambient:      ['#0D0D18', '#12121F', '#0A0A14'] as const,
  dark:         ['#06060C', '#0D0D18'] as const,
} as const;

// ─── Typography ────────────────────────────────────────────────
const fontFamily = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'System',
});

const monoFamily = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

export const typography = {
  displayHero: {
    fontFamily,
    fontWeight: '900' as const,
    fontSize: 80,
    lineHeight: 84,
    letterSpacing: -3,
  },
  display: {
    fontFamily,
    fontWeight: '900' as const,
    fontSize: 56,
    lineHeight: 60,
    letterSpacing: -2,
  },
  displaySmall: {
    fontFamily,
    fontWeight: '800' as const,
    fontSize: 44,
    lineHeight: 48,
    letterSpacing: -1.5,
  },
  h1: {
    fontFamily,
    fontWeight: '800' as const,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.5,
  },
  h2: {
    fontFamily,
    fontWeight: '700' as const,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.3,
  },
  h3: {
    fontFamily,
    fontWeight: '700' as const,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: 0,
  },
  body: {
    fontFamily,
    fontWeight: '400' as const,
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0.1,
  },
  bodyMedium: {
    fontFamily,
    fontWeight: '500' as const,
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0.1,
  },
  bodySemibold: {
    fontFamily,
    fontWeight: '600' as const,
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0,
  },
  small: {
    fontFamily,
    fontWeight: '400' as const,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.1,
  },
  smallMedium: {
    fontFamily,
    fontWeight: '500' as const,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.1,
  },
  caption: {
    fontFamily,
    fontWeight: '500' as const,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.5,
  },
  captionBold: {
    fontFamily,
    fontWeight: '700' as const,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.5,
  },
  overline: {
    fontFamily,
    fontWeight: '700' as const,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 2.5,
    textTransform: 'uppercase' as const,
  },
  mono: {
    fontFamily: monoFamily,
    fontWeight: '700' as const,
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: 0,
  },
  monoLarge: {
    fontFamily: monoFamily,
    fontWeight: '800' as const,
    fontSize: 48,
    lineHeight: 52,
    letterSpacing: -1,
  },
  monoHero: {
    fontFamily: monoFamily,
    fontWeight: '900' as const,
    fontSize: 72,
    lineHeight: 76,
    letterSpacing: -2,
  },
} as const;

// ─── Spacing ───────────────────────────────────────────────────
export const spacing = {
  xxs:  2,
  xs:   4,
  sm:   8,
  md:   16,
  lg:   24,
  xl:   32,
  xxl:  48,
  xxxl: 64,
  huge: 80,
} as const;

// ─── Border Radius ────────────────────────────────────────────
export const radii = {
  xs:   6,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  xxl:  24,
  xxxl: 32,
  full: 999,
} as const;

// ─── Animation Config ───────────────────────────────────────
export const motion = {
  spring: {
    damping: 15,
    stiffness: 120,
    mass: 0.8,
  },
  springBouncy: {
    damping: 10,
    stiffness: 140,
    mass: 0.6,
  },
  springGentle: {
    damping: 22,
    stiffness: 60,
    mass: 1,
  },
  springSnappy: {
    damping: 18,
    stiffness: 200,
    mass: 0.5,
  },
  duration: {
    instant:  80,
    fast:     150,
    normal:   300,
    slow:     500,
    entrance: 600,
    dramatic: 1000,
    story:    1500,
  },
} as const;

// ─── Shadows ─────────────────────────────────────────────────
export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  elevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 28,
    elevation: 16,
  },
  glowPurple: {
    shadowColor: colors.accentPurple,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 12,
  },
  glowFuchsia: {
    shadowColor: colors.accentFuchsia,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 10,
  },
  glowCyan: {
    shadowColor: colors.accentCyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 18,
    elevation: 10,
  },
  subtle: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
} as const;

// ─── Glass Styles ─────────────────────────────────────────────
export const glass = StyleSheet.create({
  surface: {
    backgroundColor: colors.glassFill,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.glassStroke,
  },
  surfaceElevated: {
    backgroundColor: colors.glassFill2,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.glassHighlight,
  },
  card: {
    backgroundColor: colors.glassFill,
    borderRadius: radii.xxl,
    borderWidth: 1,
    borderColor: colors.glassStroke,
    overflow: 'hidden' as const,
  },
});

// ─── Service Config ──────────────────────────────────────────
export interface ServiceConfig {
  id: string;
  name: string;
  emoji: string;
  description: string;
  color: string;
  gradient: readonly [string, string];
  iconBg: string;
}

export const SERVICE_CONFIGS: ServiceConfig[] = [
  {
    id: 'spotify',
    name: 'Spotify',
    emoji: '🎧',
    description: 'Music · Podcasts · Listening',
    color: colors.spotify,
    gradient: gradients.spotify,
    iconBg: 'rgba(29, 185, 84, 0.12)',
  },
  {
    id: 'apple_health',
    name: 'Apple Health',
    emoji: '❤️',
    description: 'Steps · Workouts · Sleep',
    color: colors.appleHealth,
    gradient: gradients.health,
    iconBg: 'rgba(255, 55, 95, 0.12)',
  },
  {
    id: 'strava',
    name: 'Strava',
    emoji: '🏃',
    description: 'Runs · Rides · Activities',
    color: colors.strava,
    gradient: gradients.strava,
    iconBg: 'rgba(252, 76, 2, 0.12)',
  },
  {
    id: 'goodreads',
    name: 'Goodreads',
    emoji: '📚',
    description: 'Books · Pages · Genres',
    color: '#C8A84E',
    gradient: gradients.goodreads,
    iconBg: 'rgba(200, 168, 78, 0.12)',
  },
  {
    id: 'steam',
    name: 'Steam',
    emoji: '🎮',
    description: 'Games · Hours · Achievements',
    color: colors.steam,
    gradient: gradients.steam,
    iconBg: 'rgba(102, 192, 244, 0.12)',
  },
];

// ─── Service Color Map (quick lookup) ────────────────────────
export const serviceColors: Record<string, { primary: string; gradient: readonly [string, string]; bg: string }> = {};
SERVICE_CONFIGS.forEach(s => {
  serviceColors[s.id] = { primary: s.color, gradient: s.gradient, bg: s.iconBg };
});