// ═══════════════════════════════════════════════════════════════
// LiquidGlass — native liquid glass on iOS when available, else a
// high-blur translucent stack that actually reads as glass (minimal
// milky overlays so backdrop shows through).
// ═══════════════════════════════════════════════════════════════

import React from 'react';
import { StyleSheet, View, ViewStyle, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { radii, shadows } from '../lib/theme';

let GlassView: React.ComponentType<any> | null = null;
let glassApiAvailable = false;
try {
  const glass = require('expo-glass-effect');
  GlassView = glass.GlassView;
  glassApiAvailable =
    typeof glass.isGlassEffectAPIAvailable === 'function' &&
    glass.isGlassEffectAPIAvailable();
} catch {
  GlassView = null;
}

export type GlassTint = 'light' | 'warm' | 'tinted' | 'dark';
export type GlassEffect = 'frost' | 'liquid';

interface Props {
  children?: React.ReactNode;
  style?: ViewStyle;
  radius?: number;
  intensity?: number;
  tint?: GlassTint;
  color?: string;
  rim?: boolean;
  highlight?: boolean;
  effect?: GlassEffect;
  elevated?: boolean;
}

const BLUR_TINT: Record<GlassTint, 'light' | 'extraLight' | 'dark' | 'default'> = {
  light:  'extraLight',
  warm:   'extraLight',
  tinted: 'extraLight',
  dark:   'dark',
};

/** Parse hex #RRGGBB to tint for GlassView */
function hexToRgba(hex: string, a: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return `rgba(255,253,248,${a})`;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${a})`;
}

export default function LiquidGlass({
  children,
  style,
  radius = radii.xl,
  intensity = 55,
  tint = 'light',
  color,
  rim = true,
  highlight = true,
  effect = 'liquid',
  elevated = false,
}: Props) {
  const isLiquid = effect === 'liquid';
  const blurIntensity = Math.min(100, intensity + (isLiquid ? 25 : 0));

  const useNative =
    Platform.OS === 'ios' &&
    GlassView != null &&
    glassApiAvailable &&
    isLiquid;

  const tintForGlass = (() => {
    if (color) {
      if (color.startsWith('rgba') || color.startsWith('rgb')) return color;
      if (color.startsWith('#') && color.length >= 7) return hexToRgba(color.slice(0, 7), 0.3);
    }
    return tint === 'warm'
      ? 'rgba(255, 232, 210, 0.34)'
      : 'rgba(255, 252, 246, 0.4)';
  })();

  if (useNative && GlassView) {
    const GV = GlassView;
    return (
      <View
        style={[
          styles.wrap,
          { borderRadius: radius },
          elevated && shadows.lift,
          style,
        ]}
      >
        <GV
          style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden' }]}
          glassEffectStyle="regular"
          tintColor={tintForGlass}
          colorScheme="light"
        />
        {rim && (
          <>
            <View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFill,
                {
                  borderRadius: radius,
                  borderWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.55)',
                },
              ]}
            />
            <View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFill,
                {
                  borderRadius: radius,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: 'rgba(20, 16, 10, 0.08)',
                  margin: -1,
                },
              ]}
            />
          </>
        )}
        {highlight && (
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(255,255,255,0.35)', 'rgba(255,255,255,0)', 'transparent']}
            locations={[0, 0.2, 1]}
            style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
          />
        )}
        <View style={styles.content}>{children}</View>
      </View>
    );
  }

  // ─── Fallback: real blur + very light overlays (blur must dominate) ───
  const baseFill = color
    ? color
    : isLiquid
      ? {
          light:  'rgba(255, 255, 255, 0.07)',
          warm:   'rgba(255, 238, 220, 0.08)',
          tinted: 'rgba(255, 248, 240, 0.06)',
          dark:   'rgba(12, 10, 8, 0.18)',
        }[tint]
      : {
          light:  'rgba(255, 252, 248, 0.28)',
          warm:   'rgba(255, 236, 214, 0.26)',
          tinted: 'rgba(255, 247, 232, 0.16)',
          dark:   'rgba(18, 14, 8, 0.26)',
        }[tint];

  const rimColor = tint === 'dark'
    ? 'rgba(255, 247, 232, 0.25)'
    : 'rgba(255, 255, 255, 0.65)';
  const outerRim = 'rgba(20, 16, 10, 0.09)';

  return (
    <View
      style={[
        styles.wrap,
        { borderRadius: radius },
        elevated && shadows.lift,
        style,
      ]}
    >
      <BlurView
        tint={BLUR_TINT[tint]}
        intensity={blurIntensity}
        experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
        style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden' }]}
      />

      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: baseFill, borderRadius: radius },
        ]}
      />

      {isLiquid && (
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0)', 'transparent']}
          locations={[0, 0.35, 0.65]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0.85 }}
          style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
        />
      )}

      {highlight && isLiquid && (
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(255,255,255,0.28)', 'rgba(255,255,255,0.04)', 'transparent']}
          locations={[0, 0.18, 0.5]}
          style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
        />
      )}

      {!isLiquid && highlight && (
        <LinearGradient
          pointerEvents="none"
          colors={[
            tint === 'dark' ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.45)',
            'rgba(255,255,255,0.06)',
            'transparent',
          ]}
          locations={[0, 0.4, 1]}
          style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
        />
      )}

      {isLiquid && rim && (
        <View
          pointerEvents="none"
          style={[
            styles.topGloss,
            {
              borderTopLeftRadius: radius,
              borderTopRightRadius: radius,
            },
          ]}
        />
      )}

      {rim && (
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: radius,
              borderWidth: 1,
              borderColor: rimColor,
            },
          ]}
        />
      )}

      {rim && (
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: radius,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: outerRim,
              margin: -StyleSheet.hairlineWidth,
            },
          ]}
        />
      )}

      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  content: {
    position: 'relative',
    zIndex: 1,
  },
  topGloss: {
    position: 'absolute',
    top: 0,
    left: '8%',
    right: '8%',
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
  },
});
