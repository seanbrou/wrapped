import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { colors, gradients, typography, spacing, radii, motion, shadows } from '../lib/theme';

const { width: W, height: H } = Dimensions.get('window');

const ONBOARD_SLIDES = [
  {
    title: 'Connect\nAnything',
    body: 'Spotify, Strava, Apple Health, Goodreads, Steam — your entire year, unified.',
    emoji: '⚡',
    accentColor: colors.accentPurple,
  },
  {
    title: 'Cinematic\nStories',
    body: 'Swipe through a beautiful recap with your top stats, lists, and AI-powered insights.',
    emoji: '✨',
    accentColor: colors.accentFuchsia,
  },
  {
    title: 'Privacy\nFirst',
    body: 'We store only aggregated stats. Your raw data is never saved. Period.',
    emoji: '🔒',
    accentColor: colors.accentCyan,
  },
];

export default function SplashOnboarding() {
  const router = useRouter();
  const [phase, setPhase] = useState<'splash' | 'onboard'>('splash');
  const [step, setStep] = useState(0);

  // Splash animations
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineY = useRef(new Animated.Value(20)).current;

  // Onboarding animations
  const slideOpacity = useRef(new Animated.Value(0)).current;
  const slideY = useRef(new Animated.Value(40)).current;
  const emojiScale = useRef(new Animated.Value(0)).current;
  const ctaOpacity = useRef(new Animated.Value(0)).current;
  const ctaY = useRef(new Animated.Value(30)).current;

  // Background orb animations
  const orb1 = useRef(new Animated.Value(0)).current;
  const orb2 = useRef(new Animated.Value(0)).current;
  const orb3 = useRef(new Animated.Value(0)).current;

  // Splash entrance
  useEffect(() => {
    // Floating orbs
    const loopOrb = (anim: Animated.Value, dur: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: 1, duration: dur, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: dur, useNativeDriver: true }),
        ])
      ).start();
    };
    loopOrb(orb1, 4000);
    loopOrb(orb2, 5500);
    loopOrb(orb3, 7000);

    // Logo entrance sequence
    Animated.sequence([
      Animated.delay(300),
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, ...motion.springBouncy, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(logoRotate, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
      Animated.delay(200),
      Animated.parallel([
        Animated.timing(taglineOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(taglineY, { toValue: 0, ...motion.springGentle, useNativeDriver: true }),
      ]),
      Animated.delay(800),
    ]).start(() => {
      setPhase('onboard');
    });
  }, []);

  // Onboarding slide entrance
  useEffect(() => {
    if (phase !== 'onboard') return;

    slideOpacity.setValue(0);
    slideY.setValue(40);
    emojiScale.setValue(0);
    ctaOpacity.setValue(0);
    ctaY.setValue(30);

    Animated.sequence([
      Animated.parallel([
        Animated.timing(slideOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(slideY, { toValue: 0, ...motion.spring, useNativeDriver: true }),
      ]),
      Animated.spring(emojiScale, { toValue: 1, ...motion.springBouncy, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(ctaOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(ctaY, { toValue: 0, ...motion.springGentle, useNativeDriver: true }),
      ]),
    ]).start();
  }, [phase, step]);

  const animateOut = useCallback((cb: () => void) => {
    Animated.parallel([
      Animated.timing(slideOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(slideY, { toValue: -30, duration: 200, useNativeDriver: true }),
      Animated.timing(emojiScale, { toValue: 0.5, duration: 150, useNativeDriver: true }),
    ]).start(cb);
  }, []);

  function goNext() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step >= ONBOARD_SLIDES.length - 1) {
      router.replace('/(tabs)/services');
      return;
    }
    animateOut(() => setStep(s => s + 1));
  }

  function skip() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.replace('/(tabs)/services');
  }

  const slide = ONBOARD_SLIDES[step];
  const logoSpin = logoRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['-15deg', '0deg'],
  });

  return (
    <View style={styles.container}>
      {/* Background gradient orbs */}
      <Animated.View
        style={[
          styles.orb,
          styles.orb1,
          {
            opacity: orb1.interpolate({ inputRange: [0, 1], outputRange: [0.08, 0.18] }),
            transform: [{ translateY: orb1.interpolate({ inputRange: [0, 1], outputRange: [0, -50] }) }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.orb,
          styles.orb2,
          {
            opacity: orb2.interpolate({ inputRange: [0, 1], outputRange: [0.05, 0.12] }),
            transform: [{ translateX: orb2.interpolate({ inputRange: [0, 1], outputRange: [0, 30] }) }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.orb,
          styles.orb3,
          {
            opacity: orb3.interpolate({ inputRange: [0, 1], outputRange: [0.04, 0.1] }),
            transform: [{ translateY: orb3.interpolate({ inputRange: [0, 1], outputRange: [0, 40] }) }],
          },
        ]}
      />

      {phase === 'splash' ? (
        /* ═══ SPLASH ═══ */
        <View style={styles.splashCenter}>
          <Animated.View
            style={[
              styles.logoBadge,
              {
                opacity: logoOpacity,
                transform: [
                  { scale: logoScale },
                  { rotate: logoSpin },
                ],
              },
            ]}
          >
            <LinearGradient
              colors={[colors.accentPurple, colors.accentFuchsia]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logoBadgeGradient}
            >
              <Text style={styles.logoLetter}>W</Text>
            </LinearGradient>
          </Animated.View>

          <Animated.View style={{ opacity: taglineOpacity, transform: [{ translateY: taglineY }] }}>
            <Text style={styles.logoTitle}>Wrapped</Text>
            <Text style={styles.logoSubtitle}>Your year, unwrapped.</Text>
          </Animated.View>
        </View>
      ) : (
        /* ═══ ONBOARDING ═══ */
        <View style={styles.onboardContainer}>
          {/* Top: mini logo */}
          <View style={styles.onboardHeader}>
            <View style={styles.miniLogoBadge}>
              <LinearGradient
                colors={[colors.accentPurple, colors.accentFuchsia]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.miniLogoGradient}
              >
                <Text style={styles.miniLogoText}>W</Text>
              </LinearGradient>
            </View>
          </View>

          {/* Center: slide content */}
          <View style={styles.slideCenter}>
            <Animated.Text
              style={[
                styles.slideEmoji,
                {
                  transform: [{ scale: emojiScale }],
                },
              ]}
            >
              {slide.emoji}
            </Animated.Text>

            <Animated.View
              style={{
                opacity: slideOpacity,
                transform: [{ translateY: slideY }],
              }}
            >
              <Text style={styles.slideTitle}>{slide.title}</Text>
              <Text style={styles.slideBody}>{slide.body}</Text>
            </Animated.View>
          </View>

          {/* Progress dots */}
          <View style={styles.dotsRow}>
            {ONBOARD_SLIDES.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i === step && [styles.dotActive, { backgroundColor: slide.accentColor }],
                  i < step && styles.dotDone,
                ]}
              />
            ))}
          </View>

          {/* Bottom CTA */}
          <Animated.View
            style={[
              styles.onboardFooter,
              { opacity: ctaOpacity, transform: [{ translateY: ctaY }] },
            ]}
          >
            <TouchableOpacity
              style={styles.ctaButton}
              onPress={goNext}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[colors.accentPurple, colors.accentFuchsia]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.ctaGradient}
              >
                <Text style={styles.ctaText}>
                  {step < ONBOARD_SLIDES.length - 1 ? 'Continue' : "Let's Go"}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {step < ONBOARD_SLIDES.length - 1 && (
              <Pressable onPress={skip} hitSlop={16} style={styles.skipBtn}>
                <Text style={styles.skipText}>Skip</Text>
              </Pressable>
            )}
          </Animated.View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },

  // ─── Background Orbs ─────────────────────────────
  orb: {
    position: 'absolute',
    borderRadius: 999,
  },
  orb1: {
    width: W * 1.2,
    height: W * 1.2,
    backgroundColor: colors.accentPurple,
    top: -W * 0.4,
    left: -W * 0.3,
  },
  orb2: {
    width: W * 0.8,
    height: W * 0.8,
    backgroundColor: colors.accentFuchsia,
    bottom: -W * 0.2,
    right: -W * 0.3,
  },
  orb3: {
    width: W * 0.5,
    height: W * 0.5,
    backgroundColor: colors.accentCyan,
    top: H * 0.4,
    left: -W * 0.15,
  },

  // ─── Splash ─────────────────────────────────────
  splashCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBadge: {
    width: 100,
    height: 100,
    borderRadius: 28,
    marginBottom: 24,
    ...shadows.glowPurple,
  },
  logoBadgeGradient: {
    width: 100,
    height: 100,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoLetter: {
    fontSize: 52,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -3,
  },
  logoTitle: {
    ...typography.h1,
    fontSize: 36,
    color: colors.primary,
    textAlign: 'center',
    letterSpacing: -1,
    marginBottom: 6,
  },
  logoSubtitle: {
    ...typography.body,
    color: colors.secondary,
    textAlign: 'center',
    letterSpacing: 0.5,
  },

  // ─── Onboarding ─────────────────────────────────
  onboardContainer: {
    flex: 1,
    paddingTop: 70,
    paddingBottom: 50,
  },
  onboardHeader: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  miniLogoBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    ...shadows.glowPurple,
  },
  miniLogoGradient: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniLogoText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -1,
  },

  slideCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  slideEmoji: {
    fontSize: 72,
    marginBottom: 28,
  },
  slideTitle: {
    ...typography.display,
    fontSize: 42,
    lineHeight: 46,
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: -1.5,
  },
  slideBody: {
    ...typography.body,
    color: colors.secondary,
    textAlign: 'center',
    lineHeight: 26,
    maxWidth: 300,
    letterSpacing: 0.2,
  },

  // ─── Dots ─────────────────────────────────────
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginBottom: 32,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.borderLight,
  },
  dotActive: {
    width: 28,
    borderRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
  },
  dotDone: {
    backgroundColor: colors.accentCyan,
    opacity: 0.6,
  },

  // ─── Footer ─────────────────────────────────────
  onboardFooter: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    gap: 16,
  },
  ctaButton: {
    width: '100%',
    borderRadius: radii.full,
    overflow: 'hidden',
    ...shadows.glowFuchsia,
  },
  ctaGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
  },
  ctaText: {
    ...typography.bodySemibold,
    color: '#fff',
    fontSize: 17,
    letterSpacing: 0.5,
  },
  skipBtn: {
    paddingVertical: 8,
  },
  skipText: {
    ...typography.caption,
    color: colors.tertiary,
    letterSpacing: 1,
  },
});