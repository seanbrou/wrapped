import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Easing,
  Dimensions,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { colors, type, space, radii, motion } from '../../lib/theme';
import Confetti from '../../components/Confetti';

const { width: W, height: H } = Dimensions.get('window');

export default function End() {
  const router = useRouter();

  const mark = useRef(new Animated.Value(0)).current;
  const year = useRef(new Animated.Value(0)).current;
  const yearScale = useRef(new Animated.Value(1.15)).current;
  const tag = useRef(new Animated.Value(0)).current;
  const actions = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(200),
      Animated.timing(mark, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(year, {
          toValue: 1,
          duration: 900,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(yearScale, { toValue: 1, ...motion.springSoft, useNativeDriver: true }),
      ]),
      Animated.timing(tag, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(actions, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  async function share() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await Share.share({
        message: 'My 2026, wrapped. → wrapped.app',
      });
    } catch {}
  }

  function restart() {
    Haptics.selectionAsync();
    router.replace('/(tabs)/dashboard');
  }

  function makeAnother() {
    Haptics.selectionAsync();
    router.replace('/wizard');
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <Confetti mode="burst" count={40} seed={42} />
      <View style={styles.body}>
        <Animated.View
          style={[
            styles.markRow,
            {
              opacity: mark,
              transform: [{
                translateY: mark.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }),
              }],
            },
          ]}
        >
          <Text style={styles.mark}>wrapped.</Text>
          <Text style={styles.markMeta}>a year, in review</Text>
        </Animated.View>

        <View style={styles.yearWrap}>
          <Animated.Text
            style={[
              styles.year,
              {
                opacity: year,
                transform: [{ scale: yearScale }],
              },
            ]}
          >
            2026
          </Animated.Text>
        </View>

        <Animated.View
          style={{
            opacity: tag,
            transform: [{
              translateY: tag.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }),
            }],
          }}
        >
          <Text style={styles.tagTitle}>That's a wrap.</Text>
          <Text style={styles.tag}>
            Thanks for watching. Come back next year, or make a new recap anytime.
          </Text>
        </Animated.View>
      </View>

      <Animated.View style={[styles.actions, { opacity: actions }]}>
        <Pressable
          onPress={share}
          style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
        >
          <Text style={styles.primaryText}>Share</Text>
        </Pressable>
        <Pressable
          onPress={makeAnother}
          style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
        >
          <Text style={styles.secondaryText}>Make another</Text>
        </Pressable>
        <Pressable onPress={restart} hitSlop={10} style={styles.homeLink}>
          <Text style={styles.homeLinkText}>Back to home</Text>
        </Pressable>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: space.lg,
  },
  body: {
    flex: 1,
    paddingTop: space.md,
  },
  markRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingTop: space.md,
  },
  mark: {
    ...type.title,
    color: colors.primary,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  markMeta: {
    ...type.eyebrow,
    color: colors.tertiary,
  },
  yearWrap: {
    flex: 1,
    justifyContent: 'center',
    marginVertical: space.xl,
  },
  year: {
    ...type.numeral,
    color: colors.primary,
    fontSize: 240,
    lineHeight: 268,
    letterSpacing: -14,
    marginLeft: -8,
    paddingTop: 10,
  },
  tagTitle: {
    ...type.display,
    color: colors.primary,
    marginBottom: space.sm,
  },
  tag: {
    ...type.body,
    color: colors.secondary,
    maxWidth: 360,
    marginBottom: space.xl,
  },
  actions: {
    paddingBottom: space.md,
    gap: space.sm,
  },
  primary: {
    height: 56,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    ...type.bodyMedium,
    color: colors.inverse,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  secondary: {
    height: 56,
    borderRadius: radii.pill,
    backgroundColor: 'transparent',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairlineStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    ...type.bodyMedium,
    color: colors.primary,
    letterSpacing: -0.1,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  homeLink: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  homeLinkText: {
    ...type.caption,
    color: colors.tertiary,
  },
});
