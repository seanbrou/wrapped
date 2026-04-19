// ═══════════════════════════════════════════════════════════════
// Wrapped — Cinematic Dark Luxury Design System
// Apple TV+ meets Spotify Wrapped 2024 — deep black, neon gradients,
// glassmorphic surfaces, gift-unwrapping metaphor
// ═══════════════════════════════════════════════════════════════

import { StyleSheet } from 'react-native';

// ─── Color Palette ───────────────────────────────────────────
export const colors = {
  // Foundations
  background:     '#050508',   // Deeper than before — true near-black with violet undertone
  surface:        '#0E0E16',   // Cards, modals — barely lighter
  surfaceLight:   '#151520',   // Hover/elevated state
  border:         '#1C1C2E',   // Subtle dividers
  borderLight:    '#2A2A40',   // Active borders

  // Text hierarchy
  primary:        '#FFFFFF',
  secondary:      '#6B6B80',
  tertiary:       '#4A4A5E',

  // Accent — Neon Fuchsia → Cyan gradient system
  accentFuchsia:  '#E040FB',   // Primary accent — vivid magenta-pink
  accentCyan:     '#00F5FF',   // Secondary accent — electric cyan
  accentPurple:   '#7C4DFF',   // Tertiary — rich violet
  accentGold:     '#FFD700',   // Highlight — for achievements/rankings

  // Semantic
  success:        '#00E676',
  danger:         '#FF4081',
  warning:        '#FFAB40',

  // Gradients (used in SVG declarations)
  gradientStart:  '#7C4DFF',
  gradientMid:    '#E040FB',
  gradientEnd:    '#00F5FF',

  // Service brand colors
  spotify:        '#1DB954',
  apple:          '#A8A8A8',
  strava:         '#FC4C02',
  goodreads:      '#F4F1EA',
  steam:          '#1B2838',

  // Glass effect
  glassFill:      'rgba(255, 255, 255, 0.03)',
  glassStroke:    'rgba(255, 255, 255, 0.06)',
  glassHighlight: 'rgba(255, 255, 255, 0.08)',
} as const;

// ─── Gradient Definitions ─────────────────────────────────────
export const gradients = {
  // Primary — hero gradient used everywhere
  primary:     ['#7C4DFF', '#E040FB', '#00F5FF'] as const,
  // Fuchsia → Cyan (2-stop)
  fuchsiaCyan: ['#E040FB', '#00F5FF'] as const,
  // Violet → Fuchsia (warm)
  warm:        ['#7C4DFF', '#E040FB'] as const,
  // Cyan sparkle (cool)
  cool:        ['#00F5FF', '#7C4DFF'] as const,
  // Gold — for achievements
  gold:        ['#FFD700', '#FF6B00'] as const,
  // Dark ambient (for backgrounds)
  ambient:     ['#0E0E16', '#151525', '#0A0A14'] as const,
} as const;

// ─── Typography ────────────────────────────────────────────────
// Uses system fonts — SF Pro on iOS, Roboto on Android
// expo-font can load custom fonts later; for now we use weight mapping
export const typography = {
  // Display — hero stats, big numbers
  display: {
    fontFamily: 'System',           // SF Pro Display on iOS
    fontWeight: '900' as const,     // Black
    fontSize: 56,
    lineHeight: 64,
    letterSpacing: -1.5,
  },
  displayLarge: {
    fontFamily: 'System',
    fontWeight: '900' as const,
    fontSize: 72,
    lineHeight: 80,
    letterSpacing: -2,
  },
  // Headlines
  h1: {
    fontFamily: 'System',
    fontWeight: '800' as const,     // ExtraBold
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.5,
  },
  h2: {
    fontFamily: 'System',
    fontWeight: '700' as const,     // Bold
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.3,
  },
  h3: {
    fontFamily: 'System',
    fontWeight: '700' as const,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: 0,
  },
  // Body
  body: {
    fontFamily: 'System',
    fontWeight: '400' as const,     // Regular
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: 0,
  },
  bodyMedium: {
    fontFamily: 'System',
    fontWeight: '500' as const,    // Medium
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: 0,
  },
  // Small / Caption
  caption: {
    fontFamily: 'System',
    fontWeight: '500' as const,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.5,
  },
  captionUppercase: {
    fontFamily: 'System',
    fontWeight: '600' as const,    // Semibold
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 2,
  },
  // Mono — for numbers/stats
  mono: {
    fontFamily: 'System',          // Falls back to SF Mono on iOS
    fontWeight: '700' as const,
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: 0,
  },
  monoLarge: {
    fontFamily: 'System',
    fontWeight: '800' as const,
    fontSize: 48,
    lineHeight: 52,
    letterSpacing: -1,
  },
} as const;

// ─── Spacing ───────────────────────────────────────────────────
export const spacing = {
  xs:   4,
  sm:   8,
  md:   16,
  lg:   24,
  xl:   32,
  xxl:  48,
  xxxl: 64,
} as const;

// ─── Border Radius ────────────────────────────────────────────
export const radii = {
  sm:    8,
  md:    12,
  lg:    16,
  xl:    20,
  xxl:   24,
  full:  999,
} as const;

// ─── Animation ─────────────────────────────────────────────────
export const animation = {
  spring: {
    damping: 12,
    stiffness: 100,
    mass: 0.8,
  },
  springBouncy: {
    damping: 10,
    stiffness: 120,
    mass: 0.6,
  },
  springGentle: {
    damping: 20,
    stiffness: 60,
    mass: 1,
  },
  duration: {
    fast:     150,  // ms
    normal:   300,
    slow:     500,
    entrance: 600,
    dramatic: 1000,
  },
} as const;

// ─── Shadows (iOS only) ──────────────────────────────────────
export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  elevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
  },
  glow: {
    shadowColor: colors.accentFuchsia,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
  },
  glowCyan: {
    shadowColor: colors.accentCyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
} as const;

// ─── Glass Effect Helper ──────────────────────────────────────
export const glassStyle = StyleSheet.create({
  surface: {
    backgroundColor: colors.glassFill,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.glassStroke,
  },
  elevated: {
    backgroundColor: colors.glassHighlight,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.glassStroke,
  },
});

// ─── Service Color Map ────────────────────────────────────────
export const serviceColors: Record<string, { primary: string; gradient: readonly [string, string] }> = {
  spotify:       { primary: colors.spotify,  gradient: ['#1DB954', '#1ED760'] as const },
  apple_health: { primary: colors.apple,    gradient: ['#A8A8A8', '#FFFFFF'] as const },
  strava:        { primary: colors.strava,   gradient: ['#FC4C02', '#FF6B35'] as const },
  goodreads:    { primary: colors.goodreads, gradient: ['#C8B882', '#F4F1EA'] as const },
  steam:         { primary: colors.steam,    gradient: ['#1B2838', '#66C0F4'] as const },
};