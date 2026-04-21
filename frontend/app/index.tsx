import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Pressable,
  Easing,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, type, space, radii, motion } from '../lib/theme';
import Confetti from '../components/Confetti';

const { width: W, height: H } = Dimensions.get('window');

const ONBOARDING_KEY = '@wrapped_onboarding_complete';

// Three plain steps: what it is → what you do → privacy. No jargon.
const CHAPTERS = [
  {
    number: '01',
    eyebrow: 'What is Wrapped?',
    line: 'Your year,\none screen at a time.',
    detail: 'We turn stats from apps you already use into a swipeable story — like a year in review.',
  },
  {
    number: '02',
    eyebrow: 'How it works',
    line: 'Link apps.\nHit the + button.',
    detail: 'Connect accounts on the Accounts tab, then tap the + in the bar to pick a template and generate a recap.',
  },
  {
    number: '03',
    eyebrow: 'Privacy',
    line: 'We only keep\nsummaries.',
    detail: 'Raw data from services is not stored on our servers. You can disconnect anytime.',
  },
];

export default function Entry() {
  const router = useRouter();
  const [phase, setPhase] = useState<'checking' | 'splash' | 'onboard'>('checking');
  const [step, setStep] = useState(0);

  // Splash: wordmark fades up, a thin rule draws across the width.
  const markOpacity = useRef(new Animated.Value(0)).current;
  const markY = useRef(new Animated.Value(24)).current;
  const ruleWidth = useRef(new Animated.Value(0)).current;
  const yearOpacity = useRef(new Animated.Value(0)).current;

  // Onboarding chapter transitions
  const chapterOpacity = useRef(new Animated.Value(0)).current;
  const chapterY = useRef(new Animated.Value(30)).current;
  const numberScale = useRef(new Animated.Value(1.1)).current;

  // Check onboarding status on mount
  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then((value) => {
      if (value === 'true') {
        // User has already seen onboarding — skip straight to dashboard
        router.replace('/(tabs)/dashboard');
      } else {
        setPhase('splash');
      }
    });
  }, []);

  useEffect(() => {
    if (phase !== 'splash') return;
    Animated.sequence([
      Animated.delay(180),
      Animated.parallel([
        Animated.timing(markOpacity, {
          toValue: 1,
          duration: 700,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(markY, { toValue: 0, ...motion.springSoft, useNativeDriver: true }),
      ]),
      Animated.timing(ruleWidth, {
        toValue: 1,
        duration: 700,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(yearOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.delay(900),
    ]).start(() => {
      setPhase('onboard');
    });
  }, [phase]);

  useEffect(() => {
    if (phase !== 'onboard') return;
    chapterOpacity.setValue(0);
    chapterY.setValue(30);
    numberScale.setValue(1.08);
    Animated.parallel([
      Animated.timing(chapterOpacity, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(chapterY, { toValue: 0, ...motion.springSoft, useNativeDriver: true }),
      Animated.spring(numberScale, { toValue: 1, ...motion.springSoft, useNativeDriver: true }),
    ]).start();
  }, [phase, step]);

  async function finishOnboarding() {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    Haptics.selectionAsync();
    router.replace('/(tabs)/dashboard');
  }

  function advance() {
    Haptics.selectionAsync();
    if (step >= CHAPTERS.length - 1) {
      finishOnboarding();
      return;
    }
    Animated.parallel([
      Animated.timing(chapterOpacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(chapterY, {
        toValue: -24,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => setStep(s => s + 1));
  }

  function skip() {
    finishOnboarding();
  }

  if (phase === 'checking') {
    return (
      <View style={styles.screen}>
        <SafeAreaView style={styles.splashSafe} edges={['top', 'bottom']}>
          <View style={styles.splashCenter}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (phase === 'splash') {
    return (
      <View style={styles.screen}>
        <Confetti mode="drift" count={42} bandHeight={H} seed={11} />
        <SafeAreaView style={styles.splashSafe} edges={['top', 'bottom']}>
          <View style={styles.splashTop}>
            <Animated.Text style={[styles.year, { opacity: yearOpacity }]}>
              2026
            </Animated.Text>
          </View>

          <View style={styles.splashCenter}>
            <Animated.Text
              style={[
                styles.wordmark,
                {
                  opacity: markOpacity,
                  transform: [{ translateY: markY }],
                },
              ]}
            >
              wrapped.
            </Animated.Text>
          </View>

          <View style={styles.splashBottom}>
            <Animated.View
              style={[
                styles.rule,
                {
                  width: ruleWidth.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
            <Animated.Text style={[styles.splashTag, { opacity: yearOpacity }]}>
              A year, in review.
            </Animated.Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const chapter = CHAPTERS[step];
  const isLast = step === CHAPTERS.length - 1;

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.onboardSafe} edges={['top', 'bottom']}>
        {/* Top bar: chapter counter + skip */}
        <View style={styles.topBar}>
          <Text style={styles.topBarLabel}>
            {String(step + 1).padStart(2, '0')} / {String(CHAPTERS.length).padStart(2, '0')}
          </Text>
          {!isLast && (
            <Pressable onPress={skip} hitSlop={12}>
              <Text style={styles.topBarAction}>Skip</Text>
            </Pressable>
          )}
        </View>

        {/* Chapter body */}
        <View style={styles.chapterBody}>
          <Animated.View
            style={{
              opacity: chapterOpacity,
              transform: [{ translateY: chapterY }],
            }}
          >
            <Animated.Text
              style={[styles.chapterNumber, { transform: [{ scale: numberScale }] }]}
            >
              {chapter.number}
            </Animated.Text>
            <Text style={styles.chapterEyebrow}>{chapter.eyebrow}</Text>
            <Text style={styles.chapterLine}>{chapter.line}</Text>
            <Text style={styles.chapterDetail}>{chapter.detail}</Text>
          </Animated.View>
        </View>

        {/* Bottom: progress rule + CTA */}
        <View style={styles.onboardFooter}>
          <View style={styles.progressTrack}>
            {CHAPTERS.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.progressSegment,
                  i <= step && styles.progressSegmentActive,
                ]}
              />
            ))}
          </View>

          <Pressable
            onPress={advance}
            style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
          >
            <Text style={styles.ctaText}>
              {isLast ? 'Get started' : 'Continue'}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // ─── Splash ──────────────────────────────────────────────
  splashSafe: {
    flex: 1,
    paddingHorizontal: space.lg,
  },
  splashTop: {
    paddingTop: space.lg,
  },
  year: {
    ...type.eyebrow,
    color: colors.tertiary,
  },
  splashCenter: {
    flex: 1,
    justifyContent: 'center',
  },
  wordmark: {
    ...type.displayXL,
    color: colors.primary,
    fontSize: 84,
    lineHeight: 96,
    letterSpacing: -4,
    paddingTop: 4,
  },
  splashBottom: {
    paddingBottom: space.lg,
    gap: space.md,
  },
  rule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.primary,
  },
  splashTag: {
    ...type.bodySmall,
    color: colors.secondary,
  },

  // ─── Onboarding ──────────────────────────────────────────
  onboardSafe: {
    flex: 1,
    paddingHorizontal: space.lg,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: space.lg,
    paddingBottom: space.md,
  },
  topBarLabel: {
    ...type.eyebrow,
    color: colors.tertiary,
  },
  topBarAction: {
    ...type.bodySmallMedium,
    color: colors.secondary,
  },

  chapterBody: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: space.huge,
  },
  chapterNumber: {
    ...type.numeral,
    color: colors.primary,
    fontSize: 200,
    lineHeight: 224,
    letterSpacing: -12,
    marginLeft: -6,
    marginBottom: space.lg,
    paddingTop: 8,
  },
  chapterEyebrow: {
    ...type.eyebrow,
    color: colors.primary,
    marginBottom: space.md,
  },
  chapterLine: {
    ...type.displayXL,
    color: colors.primary,
    marginBottom: space.lg,
  },
  chapterDetail: {
    ...type.body,
    color: colors.secondary,
    maxWidth: 340,
  },

  onboardFooter: {
    paddingBottom: space.md,
    gap: space.lg,
  },
  progressTrack: {
    flexDirection: 'row',
    gap: 6,
  },
  progressSegment: {
    flex: 1,
    height: 2,
    backgroundColor: colors.hairline,
    borderRadius: 1,
  },
  progressSegmentActive: {
    backgroundColor: colors.primary,
  },
  cta: {
    height: 56,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  ctaText: {
    ...type.bodyMedium,
    color: colors.inverse,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
});
