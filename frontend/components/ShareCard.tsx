import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, TouchableOpacity, Share } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colors, typography, spacing, radii, shadows, motion } from '../lib/theme';

const { width: W } = Dimensions.get('window');

interface Props {
  stat: string;
  headline?: string;
  service: string;
}

export function ShareCard({ stat, headline, service }: Props) {
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentScale = useRef(new Animated.Value(0.9)).current;
  const btnOpacity = useRef(new Animated.Value(0)).current;
  const glowPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(300),
      Animated.parallel([
        Animated.timing(contentOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(contentScale, { toValue: 1, ...motion.springGentle, useNativeDriver: true }),
      ]),
      Animated.timing(btnOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, { toValue: 1, duration: 3000, useNativeDriver: true }),
        Animated.timing(glowPulse, { toValue: 0, duration: 3000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  async function handleShare() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await Share.share({
        message: `${headline || 'My 2026, Wrapped.'}\n\n${stat}\n\nMade with Wrapped ✨`,
      });
    } catch {}
  }

  return (
    <View style={styles.container}>
      {/* Multi-color gradient background */}
      <LinearGradient
        colors={[colors.accentPurple, colors.accentFuchsia, colors.accentCyan]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientBg}
      />

      {/* Dark overlay for readability */}
      <View style={styles.overlay} />

      {/* Glow */}
      <Animated.View
        style={[
          styles.glow,
          {
            opacity: glowPulse.interpolate({ inputRange: [0, 1], outputRange: [0.08, 0.2] }),
          },
        ]}
      />

      <View style={styles.content}>
        {/* Logo */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: contentOpacity,
              transform: [{ scale: contentScale }],
            },
          ]}
        >
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>W</Text>
          </View>
        </Animated.View>

        {/* Headline */}
        <Animated.Text
          style={[
            styles.headline,
            {
              opacity: contentOpacity,
              transform: [{ scale: contentScale }],
            },
          ]}
        >
          {headline || 'My 2026, Wrapped.'}
        </Animated.Text>

        {/* Stat summary */}
        <Animated.Text
          style={[
            styles.stat,
            {
              opacity: contentOpacity,
              transform: [{ scale: contentScale }],
            },
          ]}
        >
          {stat}
        </Animated.Text>

        {/* Share button */}
        <Animated.View style={{ opacity: btnOpacity }}>
          <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.85}>
            <Text style={styles.shareBtnText}>Share Your Wrapped</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Watermark */}
        <Animated.Text style={[styles.watermark, { opacity: contentOpacity }]}>
          Made with Wrapped ✨
        </Animated.Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  gradientBg: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.15,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background,
    opacity: 0.7,
  },
  glow: {
    position: 'absolute',
    width: W * 1.5,
    height: W * 1.5,
    borderRadius: W,
    backgroundColor: colors.accentFuchsia,
    top: -W * 0.3,
    left: -W * 0.25,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  logoContainer: {
    marginBottom: spacing.xl,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.accentFuchsia,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.glowFuchsia,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -2,
  },
  headline: {
    ...typography.display,
    fontSize: 36,
    lineHeight: 42,
    color: colors.primary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    letterSpacing: -1,
  },
  stat: {
    ...typography.body,
    color: colors.secondary,
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: spacing.xxl,
    maxWidth: 300,
  },
  shareBtn: {
    backgroundColor: '#fff',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: radii.full,
    marginBottom: spacing.xl,
  },
  shareBtnText: {
    ...typography.bodySemibold,
    color: colors.background,
    letterSpacing: 0.3,
  },
  watermark: {
    ...typography.caption,
    color: colors.tertiary,
    letterSpacing: 1,
  },
});