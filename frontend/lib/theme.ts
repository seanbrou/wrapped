// ═══════════════════════════════════════════════════════════════
// Wrapped — Light Editorial + Playful Design System
// Warm paper canvas, ink primary, saturated rotating accents for
// the story cards. Composition-first, celebratory but restrained.
// ═══════════════════════════════════════════════════════════════

import { StyleSheet, Platform } from 'react-native';

// ─── Color ───────────────────────────────────────────────────
export const colors = {
  // Canvas — warm paper, not flat white
  background:     '#F5F0E6',  // ivory / paper
  backgroundAlt:  '#EFE8DA',  // slightly darker for bands
  surface:        '#FFFFFF',  // card
  surfaceRaised:  '#FFFFFF',
  surfaceTint:    '#FBF6EB',  // tinted panel
  hairline:       'rgba(20, 16, 10, 0.08)',
  hairlineStrong: 'rgba(20, 16, 10, 0.16)',

  // Ink
  ink:            '#141008',
  primary:        '#141008',
  secondary:      'rgba(20, 16, 10, 0.66)',
  tertiary:       'rgba(20, 16, 10, 0.46)',
  muted:          'rgba(20, 16, 10, 0.26)',

  // Text on ink pill / inverse surface
  inverse:        '#FFF7E8',

  // Accents — a vivid, Wrapped-style rainbow. Used sparsely on
  // light surfaces; used edge-to-edge as story card washes.
  red:            '#FF3B30',
  amber:          '#FFB020',
  mint:           '#1ED760',
  sky:            '#0A84FF',
  lilac:          '#BF5AF2',
  coral:          '#FF6B5B',
  cream:          '#F5E6D3',

  // Tinted accent backgrounds for light surfaces
  redTint:        'rgba(255, 59, 48, 0.12)',
  amberTint:      'rgba(255, 176, 32, 0.14)',
  mintTint:       'rgba(30, 215, 96, 0.14)',
  skyTint:        'rgba(10, 132, 255, 0.12)',
  lilacTint:      'rgba(191, 90, 242, 0.12)',

  // Service marks
  spotify:        '#1ED760',
  appleHealth:    '#FA2D48',
  strava:         '#FC4C02',
  goodreads:      '#A67C2E',
  steam:          '#2E6FBE',
  fitbit:         '#00B0B9',
  youtube:        '#FF0000',
  lastfm:         '#D51007',
  github:         '#24292F',
  notion:         '#111111',

  // State
  success:        '#17A34A',
  danger:         '#D0331F',

  // Overlays
  wash:           'rgba(20, 16, 10, 0.32)',
  washHeavy:      'rgba(20, 16, 10, 0.55)',
} as const;

// ─── Per-Story Accent Cycle ──────────────────────────────────
// The story player cycles through these so each card is its own
// editorial spread (not a uniform template).
export const STORY_ACCENTS = [
  { bg: '#FF3B30', fg: '#FFF7E8', name: 'red' },
  { bg: '#1ED760', fg: '#141008', name: 'mint' },
  { bg: '#FFB020', fg: '#141008', name: 'amber' },
  { bg: '#BF5AF2', fg: '#FFF7E8', name: 'lilac' },
  { bg: '#0A84FF', fg: '#FFF7E8', name: 'sky' },
  { bg: '#F5E6D3', fg: '#141008', name: 'cream' },
  { bg: '#FF6B5B', fg: '#141008', name: 'coral' },
] as const;

export type StoryAccent = typeof STORY_ACCENTS[number];

export function accentFor(index: number): StoryAccent {
  return STORY_ACCENTS[index % STORY_ACCENTS.length];
}

// ─── Accent palette for confetti & UI accents (strings) ─────
export const CONFETTI_COLORS = [
  colors.red, colors.amber, colors.mint, colors.sky,
  colors.lilac, colors.coral, colors.primary,
] as const;

// ─── Typography ──────────────────────────────────────────────
const sans = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'System',
});

const mono = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

export const fonts = { sans, mono } as const;

// IMPORTANT: for oversized text, keep lineHeight >= fontSize * 1.1 so
// ascenders don't clip at the top (iOS especially with bold weights).
// includeFontPadding:false removes Android's built-in descender padding.
export const type = {
  numeral: {
    fontFamily: sans,
    fontWeight: '800' as const,
    fontSize: 180,
    lineHeight: 198,
    letterSpacing: -10,
    includeFontPadding: false,
  },
  numeralLarge: {
    fontFamily: sans,
    fontWeight: '800' as const,
    fontSize: 140,
    lineHeight: 154,
    letterSpacing: -7,
    includeFontPadding: false,
  },
  numeralMedium: {
    fontFamily: sans,
    fontWeight: '800' as const,
    fontSize: 96,
    lineHeight: 106,
    letterSpacing: -5,
    includeFontPadding: false,
  },

  displayXL: {
    fontFamily: sans,
    fontWeight: '800' as const,
    fontSize: 64,
    lineHeight: 72,
    letterSpacing: -2.5,
    includeFontPadding: false,
  },
  display: {
    fontFamily: sans,
    fontWeight: '800' as const,
    fontSize: 48,
    lineHeight: 54,
    letterSpacing: -1.6,
    includeFontPadding: false,
  },
  displaySmall: {
    fontFamily: sans,
    fontWeight: '700' as const,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -1,
    includeFontPadding: false,
  },

  title: {
    fontFamily: sans,
    fontWeight: '700' as const,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  titleSmall: {
    fontFamily: sans,
    fontWeight: '600' as const,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.2,
  },

  body: {
    fontFamily: sans,
    fontWeight: '400' as const,
    fontSize: 17,
    lineHeight: 24,
    letterSpacing: -0.1,
  },
  bodyMedium: {
    fontFamily: sans,
    fontWeight: '500' as const,
    fontSize: 17,
    lineHeight: 24,
    letterSpacing: -0.1,
  },
  bodySmall: {
    fontFamily: sans,
    fontWeight: '400' as const,
    fontSize: 15,
    lineHeight: 21,
    letterSpacing: -0.05,
  },
  bodySmallMedium: {
    fontFamily: sans,
    fontWeight: '500' as const,
    fontSize: 15,
    lineHeight: 21,
    letterSpacing: -0.05,
  },

  caption: {
    fontFamily: sans,
    fontWeight: '500' as const,
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: 0,
  },
  eyebrow: {
    fontFamily: sans,
    fontWeight: '600' as const,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 2.4,
    textTransform: 'uppercase' as const,
  },

  mono: {
    fontFamily: mono,
    fontWeight: '500' as const,
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: 0,
  },
} as const;

// ─── Spacing ─────────────────────────────────────────────────
export const space = {
  xxs: 2,
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
  xxxl:64,
  huge:96,
} as const;

// ─── Radii ───────────────────────────────────────────────────
export const radii = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   22,
  xxl:  28,
  pill: 999,
} as const;

// ─── Motion ──────────────────────────────────────────────────
export const motion = {
  springSoft:   { damping: 22, stiffness: 140, mass: 1 },
  springFirm:   { damping: 18, stiffness: 220, mass: 0.8 },
  springPlayful:{ damping: 12, stiffness: 180, mass: 0.6 },
  duration: {
    instant: 120,
    fast:    200,
    base:    300,
    slow:    450,
    cinema:  700,
    reveal:  1100,
  },
} as const;

// ─── Shadows (subtle, warm) ──────────────────────────────────
export const shadows = {
  soft: {
    shadowColor: '#2A1F0D',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  lift: {
    shadowColor: '#2A1F0D',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.12,
    shadowRadius: 32,
    elevation: 10,
  },
  fab: {
    shadowColor: '#141008',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 22,
    elevation: 14,
  },
} as const;

// ─── Services ────────────────────────────────────────────────
/** How the app will authorize (UI labels; real flows wired later). */
export type AuthKind =
  | 'oauth2'
  | 'oauth2_pkce'
  | 'oauth1'
  | 'healthkit'
  | 'openid';

export interface ServiceConfig {
  id: string;
  name: string;
  tagline: string;
  signal: string;
  mark: string;
  color: string;
  accentKey: 'mint' | 'red' | 'amber' | 'sky' | 'lilac' | 'coral';
  /** Remote logo (PNG/SVG via CDN). */
  logoUri: string;
  authKind: AuthKind;
}

export const AUTH_LABEL: Record<AuthKind, string> = {
  oauth2: 'OAuth 2.0',
  oauth2_pkce: 'OAuth 2.0 · PKCE',
  oauth1: 'OAuth 1.0a',
  healthkit: 'HealthKit',
  openid: 'OpenID',
};

export const SERVICE_CONFIGS: ServiceConfig[] = [
  {
    id: 'spotify',
    name: 'Spotify',
    tagline: 'Music and podcasts',
    signal: 'Listening minutes',
    mark: 'S',
    color: colors.spotify,
    accentKey: 'mint',
    // Favicons load reliably on device; swap for bundled assets later if you prefer.
    logoUri: 'https://www.google.com/s2/favicons?domain=spotify.com&sz=256',
    authKind: 'oauth2_pkce',
  },
  {
    id: 'apple_health',
    name: 'Apple Health',
    tagline: 'Movement and sleep',
    signal: 'Daily activity',
    mark: 'H',
    color: colors.appleHealth,
    accentKey: 'red',
    logoUri: 'https://www.google.com/s2/favicons?domain=apple.com&sz=256',
    authKind: 'healthkit',
  },
  {
    id: 'strava',
    name: 'Strava',
    tagline: 'Runs, rides, activities',
    signal: 'Distance covered',
    mark: 'S',
    color: colors.strava,
    accentKey: 'coral',
    logoUri: 'https://www.google.com/s2/favicons?domain=strava.com&sz=256',
    authKind: 'oauth2',
  },
  {
    id: 'goodreads',
    name: 'Goodreads',
    tagline: 'Books and reading',
    signal: 'Pages read',
    mark: 'G',
    color: colors.goodreads,
    accentKey: 'amber',
    logoUri: 'https://www.google.com/s2/favicons?domain=goodreads.com&sz=256',
    authKind: 'oauth1',
  },
  {
    id: 'steam',
    name: 'Steam',
    tagline: 'Games and playtime',
    signal: 'Hours played',
    mark: 'S',
    color: colors.steam,
    accentKey: 'sky',
    logoUri: 'https://www.google.com/s2/favicons?domain=steampowered.com&sz=256',
    authKind: 'openid',
  },
  {
    id: 'github',
    name: 'GitHub',
    tagline: 'Repos, stars, and code habits',
    signal: 'Projects shipped',
    mark: 'G',
    color: colors.github,
    accentKey: 'sky',
    logoUri: 'https://www.google.com/s2/favicons?domain=github.com&sz=256',
    authKind: 'oauth2',
  },
  {
    id: 'notion',
    name: 'Notion',
    tagline: 'Pages, databases, and docs',
    signal: 'Workspace activity',
    mark: 'N',
    color: colors.notion,
    accentKey: 'amber',
    logoUri: 'https://www.google.com/s2/favicons?domain=notion.so&sz=256',
    authKind: 'oauth2',
  },
  {
    id: 'fitbit',
    name: 'Fitbit',
    tagline: 'Steps, sleep, and heart rate',
    signal: 'Daily summaries',
    mark: 'F',
    color: colors.fitbit,
    accentKey: 'mint',
    logoUri: 'https://www.google.com/s2/favicons?domain=fitbit.com&sz=256',
    authKind: 'oauth2_pkce',
  },
  {
    id: 'youtube',
    name: 'YouTube',
    tagline: 'Watch time and habits',
    signal: 'Viewing minutes',
    mark: '▶',
    color: colors.youtube,
    accentKey: 'red',
    logoUri: 'https://www.google.com/s2/favicons?domain=youtube.com&sz=256',
    authKind: 'oauth2',
  },
  {
    id: 'lastfm',
    name: 'Last.fm',
    tagline: 'Scrobbles and top artists',
    signal: 'Play counts',
    mark: 'L',
    color: colors.lastfm,
    accentKey: 'coral',
    logoUri: 'https://www.google.com/s2/favicons?domain=last.fm&sz=256',
    authKind: 'oauth1',
  },
];

export const serviceById: Record<string, ServiceConfig> = Object.fromEntries(
  SERVICE_CONFIGS.map(s => [s.id, s])
) as Record<string, ServiceConfig>;

// ─── Layout helpers ──────────────────────────────────────────
export const layout = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  hairlineTop: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
  },
  hairlineBottom: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
});
