import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { colors } from '../lib/theme';

const { width, height } = Dimensions.get('window');

const ONBOARD_STEPS = [
  {
    title: 'Connect Your Apps',
    body: 'Spotify, Strava, Health, Goodreads, Steam — your year, unified.',
    emoji: '🔗',
  },
  {
    title: 'Beautiful Stories',
    body: 'Swipe through a cinematic recap with your top stats, lists, and insights.',
    emoji: '✨',
  },
  {
    title: 'Privacy First',
    body: 'Your data stays yours. We store only aggregates, never raw data.',
    emoji: '🔒',
  },
];

export default function IndexPage() {
  const router = useRouter();
  const slideAnim = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const [step, setStep] = React.useState(0);
  const [showOnboard, setShowOnboard] = React.useState(false);

  useEffect(() => {
    // Logo entrance
    Animated.sequence([
      Animated.delay(300),
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
    ]).start();

    // After logo, show onboarding
    const timer = setTimeout(() => setShowOnboard(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  function nextStep() {
    if (step < ONBOARD_STEPS.length - 1) {
      Animated.spring(slideAnim, { toValue: -(step + 1) * width, friction: 8, tension: 60, useNativeDriver: true }).start();
      setStep(s => s + 1);
    } else {
      router.replace('/(tabs)/services');
    }
  }

  const s = ONBOARD_STEPS[step];

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      {/* Logo */}
      <Animated.View style={[styles.logoArea, {
        opacity: logoOpacity,
        transform: [{ scale: logoScale }],
      }]}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoText}>W</Text>
        </View>
        <Text style={styles.logoName}>Wrapped</Text>
      </Animated.View>

      {showOnboard && (
        <>
          {/* Onboarding slides */}
          <View style={styles.slideContainer}>
            {ONBOARD_STEPS.map((st, i) => (
              <Animated.View
                key={i}
                style={[styles.slide, {
                  transform: [{
                    translateX: Animated.subtract(
                      slideAnim,
                      new Animated.Value(i * width)
                    ),
                  }],
                  position: 'absolute',
                  width,
                  left: 0,
                }]}
              >
                <Text style={styles.emoji}>{st.emoji}</Text>
                <Text style={styles.slideTitle}>{st.title}</Text>
                <Text style={styles.slideBody}>{st.body}</Text>
              </Animated.View>
            ))}
          </View>

          {/* Progress dots */}
          <View style={styles.dots}>
            {ONBOARD_STEPS.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i === step && styles.dotActive]}
              />
            ))}
          </View>

          {/* CTA */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.ctaBtn} onPress={nextStep} activeOpacity={0.8}>
              <Text style={styles.ctaText}>
                {step < ONBOARD_STEPS.length - 1 ? 'Next' : "Let's Go"}
              </Text>
            </TouchableOpacity>
            {step < ONBOARD_STEPS.length - 1 && (
              <TouchableOpacity onPress={() => router.replace('/(tabs)/services')}>
                <Text style={styles.skipText}>Skip</Text>
              </TouchableOpacity>
            )}
          </View>
        </>
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
  },
  logoArea: {
    alignItems: 'center',
    marginBottom: 60,
  },
  logoBadge: {
    width: 80,
    height: 80,
    borderRadius: 22,
    backgroundColor: colors.accentPurple,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  logoText: {
    fontSize: 40,
    fontWeight: '900',
    color: '#fff',
  },
  logoName: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.primary,
  },
  slideContainer: {
    flex: 1,
    width,
    overflow: 'hidden',
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emoji: {
    fontSize: 72,
    marginBottom: 24,
  },
  slideTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 12,
  },
  slideBody: {
    fontSize: 16,
    color: colors.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 32,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.accentPurple,
    width: 24,
  },
  footer: {
    alignItems: 'center',
    gap: 16,
    paddingBottom: 48,
  },
  ctaBtn: {
    backgroundColor: colors.accentPurple,
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 30,
  },
  ctaText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  skipText: {
    fontSize: 14,
    color: colors.secondary,
  },
});
