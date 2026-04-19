import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, gradients, typography, spacing, radii, animation } from '../lib/theme';

const { width, height } = Dimensions.get('window');

const ONBOARD_STEPS = [
  {
    title: 'Connect Your Apps',
    body: 'Spotify, Strava, Health, Goodreads, Steam — your year, unified.',
    emoji: '🔗',
    gradient: ['#7C4DFF', '#E040FB'] as const,
  },
  {
    title: 'Beautiful Stories',
    body: 'Swipe through a cinematic recap with your top stats, lists, and insights.',
    emoji: '✨',
    gradient: ['#E040FB', '#00F5FF'] as const,
  },
  {
    title: 'Privacy First',
    body: 'Your data stays yours. We store only aggregates, never raw data.',
    emoji: '🔒',
    gradient: ['#00F5FF', '#7C4DFF'] as const,
  },
];

export default function IndexPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [showOnboard, setShowOnboard] = useState(false);

  // Animation refs
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const slideX = useRef(new Animated.Value(0)).current;
  const stepOpacity = useRef(new Animated.Value(1)).current;
  const emojiBounce = useRef(new Animated.Value(0)).current;
  const ctaScale = useRef(new Animated.Value(0)).current;
  const bgGlow = useRef(new Animated.Value(0)).current;
  const particle1Y = useRef(new Animated.Value(0)).current;
  const particle2Y = useRef(new Animated.Value(0)).current;

  // Logo entrance
  useEffect(() => {
    Animated.sequence([
      Animated.delay(200),
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          damping: 8,
          stiffness: 100,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Glow pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(bgGlow, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(bgGlow, { toValue: 0.3, duration: 2000, useNativeDriver: true }),
      ])
    ).start();

    // Floating particles
    Animated.loop(
      Animated.sequence([
        Animated.timing(particle1Y, { toValue: 1, duration: 6000, useNativeDriver: true }),
        Animated.timing(particle1Y, { toValue: 0, duration: 6000, useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(particle2Y, { toValue: 1, duration: 8000, useNativeDriver: true }),
        Animated.timing(particle2Y, { toValue: 0, duration: 8000, useNativeDriver: true }),
      ])
    ).start();

    // Show onboarding after logo
    const timer = setTimeout(() => setShowOnboard(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  // Animate step transitions
  useEffect(() => {
    if (!showOnboard) return;
    // Animate in CTA button
    Animated.spring(ctaScale, {
      toValue: 1,
      damping: 10,
      stiffness: 80,
      useNativeDriver: true,
    }).start();
  }, [showOnboard]);

  function goNext() {
    if (step >= ONBOARD_STEPS.length - 1) {
      router.replace('/(tabs)/services');
      return;
    }
    // Fade out current
    Animated.parallel([
      Animated.timing(stepOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(emojiBounce, { toValue: 0, duration: 100, useNativeDriver: true }),
    ]).start(() => {
      setStep(s => s + 1);
      emojiBounce.setValue(0);
      stepOpacity.setValue(1);
      Animated.spring(emojiBounce, {
        toValue: 1,
        damping: 8,
        stiffness: 120,
        useNativeDriver: true,
      }).start();
    });
  }

  function skip() {
    router.replace('/(tabs)/services');
  }

  const currentStep = ONBOARD_STEPS[step];

  return (
    <View style={styles.container}>
      {/* Background glow effect */}
      <Animated.View
        style={[
          styles.bgGlow,
          {
            opacity: bgGlow.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.35] }),
          },
        ]}
      />

      {/* Floating particles */}
      <Animated.View
        style={[
          styles.particle,
          {
            left: width * 0.2,
            top: height * 0.15,
            opacity: 0.12,
            transform: [{ translateY: particle1Y.interpolate({ inputRange: [0, 1], outputRange: [0, -60] }) }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.particle,
          {
            right: width * 0.15,
            top: height * 0.6,
            opacity: 0.08,
            transform: [{ translateY: particle2Y.interpolate({ inputRange: [0, 1], outputRange: [0, -40] }) }],
          },
        ]}
      />

      {/* Logo */}
      <Animated.View
        style={[
          styles.logoArea,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        <View style={styles.logoBadge}>
          <Text style={styles.logoText}>W</Text>
        </View>
        <Text style={styles.logoName}>Wrapped</Text>
        <Text style={styles.logoTagline}>Your year, unwrapped</Text>
      </Animated.View>

      {/* Onboarding */}
      {showOnboard && (
        <Animated.View style={[styles.onboardArea, { opacity: stepOpacity }]}>
          {/* Step content */}
          <View style={styles.stepContent}>
            <Animated.Text
              style={[
                styles.stepEmoji,
                {
                  transform: [
                    {
                      scale: emojiBounce.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.6, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              {currentStep.emoji}
            </Animated.Text>
            <Text style={styles.stepTitle}>{currentStep.title}</Text>
            <Text style={styles.stepBody}>{currentStep.body}</Text>
          </View>

          {/* Progress dots */}
          <View style={styles.dots}>
            {ONBOARD_STEPS.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i === step && styles.dotActive,
                  i < step && styles.dotDone,
                ]}
              />
            ))}
          </View>

          {/* CTA */}
          <Animated.View style={[styles.footer, { transform: [{ scale: ctaScale }] }]}>
            <TouchableOpacity
              style={styles.ctaBtn}
              onPress={goNext}
              activeOpacity={0.8}
            >
              <Text style={styles.ctaText}>
                {step < ONBOARD_STEPS.length - 1 ? 'Continue' : "Let's Go"}
              </Text>
            </TouchableOpacity>
            {step < ONBOARD_STEPS.length - 1 && (
              <Pressable onPress={skip} hitSlop={12}>
                <Text style={styles.skipText}>Skip</Text>
              </Pressable>
            )}
          </Animated.View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  bgGlow: {
    position: 'absolute',
    width: width * 1.5,
    height: width * 1.5,
    borderRadius: width,
    backgroundColor: colors.accentFuchsia,
    top: -width * 0.6,
    left: -width * 0.25,
  },
  particle: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accentCyan,
  },
  logoArea: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoBadge: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: colors.accentFuchsia,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: colors.accentFuchsia,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
  },
  logoText: {
    fontSize: 44,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -2,
  },
  logoName: {
    ...typography.h1,
    color: colors.primary,
    letterSpacing: -1,
  },
  logoTagline: {
    ...typography.caption,
    color: colors.secondary,
    marginTop: 4,
  },
  onboardArea: {
    flex: 1,
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: spacing.xl,
  },
  stepContent: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  stepEmoji: {
    fontSize: 64,
    marginBottom: 24,
  },
  stepTitle: {
    ...typography.h2,
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  stepBody: {
    ...typography.body,
    color: colors.secondary,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 280,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.borderLight,
  },
  dotActive: {
    backgroundColor: colors.accentFuchsia,
    width: 24,
    shadowColor: colors.accentFuchsia,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
  },
  dotDone: {
    backgroundColor: colors.accentCyan,
  },
  footer: {
    alignItems: 'center',
    gap: 16,
    paddingBottom: 48,
  },
  ctaBtn: {
    backgroundColor: colors.accentFuchsia,
    paddingHorizontal: 56,
    paddingVertical: 18,
    borderRadius: radii.full,
    shadowColor: colors.accentFuchsia,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  ctaText: {
    ...typography.bodyMedium,
    color: '#fff',
    letterSpacing: 0.5,
  },
  skipText: {
    ...typography.caption,
    color: colors.tertiary,
  },
});