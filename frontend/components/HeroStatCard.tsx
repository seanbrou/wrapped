import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Dimensions } from 'react-native';
import { colors, type, space, motion, serviceById, type StoryAccent } from '../lib/theme';

const { width: W } = Dimensions.get('window');

interface Props {
  stat: string;
  value: string;
  unit?: string;
  comparison: string;
  service: string;
  accent: StoryAccent;
}

// Full-bleed poster. The numeral is the composition.
export function HeroStatCard({ stat, value, comparison, service, accent }: Props) {
  const svc = serviceById[service];
  const numeralFade = useRef(new Animated.Value(0)).current;
  const numeralY = useRef(new Animated.Value(24)).current;
  const captionFade = useRef(new Animated.Value(0)).current;
  const footerFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(120),
      Animated.parallel([
        Animated.timing(numeralFade, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(numeralY, { toValue: 0, ...motion.springSoft, useNativeDriver: true }),
      ]),
      Animated.timing(captionFade, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.delay(200),
      Animated.timing(footerFade, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const statLength = stat.length;
  const scale = statLength > 5 ? 0.7 : statLength > 4 ? 0.85 : 1;

  return (
    <View style={styles.root}>
      <View style={styles.top}>
        <Text style={[styles.eyebrow, { color: accent.fg }]}>
          {svc?.name ?? service} · {svc?.signal ?? 'metric'}
        </Text>
      </View>

      <View style={styles.center}>
        <Animated.Text
          style={[
            styles.numeral,
            {
              color: accent.fg,
              fontSize: 220 * scale,
              lineHeight: 240 * scale,
              letterSpacing: -14 * scale,
              opacity: numeralFade,
              transform: [{ translateY: numeralY }],
            },
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {stat}
        </Animated.Text>

        <Animated.Text
          style={[styles.caption, { color: accent.fg, opacity: captionFade }]}
        >
          {value}
        </Animated.Text>
      </View>

      <Animated.View style={[styles.bottom, { opacity: footerFade }]}>
        <View style={[styles.rule, { backgroundColor: accent.fg }]} />
        <Text style={[styles.comparison, { color: accent.fg }]}>
          {comparison.replace(/[🔥📖🎸🎤🌀🎵🌊🏃🚀🎮☀️🏛️✨⚡🔒❤️]/gu, '').trim()}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: space.lg,
    paddingTop: 110,
    paddingBottom: 80,
  },
  top: {
    marginBottom: space.lg,
  },
  eyebrow: {
    ...type.eyebrow,
    opacity: 0.75,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
  },
  numeral: {
    fontWeight: '800',
    marginLeft: -6,
    includeFontPadding: false,
    paddingTop: 8,
  },
  caption: {
    ...type.displaySmall,
    marginTop: space.md,
    opacity: 0.82,
  },
  bottom: {
    gap: space.md,
  },
  rule: {
    width: 40,
    height: 2,
    borderRadius: 1,
    opacity: 0.7,
  },
  comparison: {
    ...type.bodyMedium,
    maxWidth: W - space.lg * 2 - 40,
    opacity: 0.78,
  },
});
