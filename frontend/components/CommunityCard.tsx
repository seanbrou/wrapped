import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { colors, type, space, motion, serviceById, type StoryAccent } from '../lib/theme';

interface Props {
  percentile: number;
  metric: string;
  value: string;
  service: string;
  accent: StoryAccent;
}

// "Top 5%" poster. The rank number carries the whole page.
export function CommunityCard({ percentile, metric, value, service, accent }: Props) {
  const svc = serviceById[service];
  const countUp = useRef(new Animated.Value(percentile)).current;
  const numFade = useRef(new Animated.Value(0)).current;
  const numScale = useRef(new Animated.Value(0.85)).current;
  const [display, setDisplay] = React.useState(100);

  useEffect(() => {
    // Count down from 100 to the user's percentile
    countUp.setValue(100);
    const id = countUp.addListener(({ value: v }) => setDisplay(Math.round(v)));

    Animated.sequence([
      Animated.delay(150),
      Animated.parallel([
        Animated.timing(numFade, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(numScale, { toValue: 1, ...motion.springSoft, useNativeDriver: true }),
        Animated.timing(countUp, {
          toValue: percentile,
          duration: 1400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
      ]),
    ]).start();

    return () => countUp.removeListener(id);
  }, [percentile]);

  return (
    <View style={styles.root}>
      <View style={styles.top}>
        <Text style={[styles.eyebrow, { color: accent.fg }]}>
          {svc?.name ?? service} · {metric}
        </Text>
      </View>

      <View style={styles.center}>
        <Text style={[styles.prefix, { color: accent.fg }]}>Top</Text>
        <Animated.Text
          style={[
            styles.percent,
            {
              color: accent.fg,
              opacity: numFade,
              transform: [{ scale: numScale }],
            },
          ]}
        >
          {display}
          <Text style={[styles.percentSign, { color: accent.fg }]}>%</Text>
        </Animated.Text>
        <Text style={[styles.tag, { color: accent.fg }]}>
          of listeners worldwide
        </Text>
      </View>

      <View style={styles.footer}>
        <View style={[styles.rule, { backgroundColor: accent.fg }]} />
        <View style={styles.valueRow}>
          <Text style={[styles.valueLabel, { color: accent.fg }]}>you</Text>
          <Text style={[styles.valueValue, { color: accent.fg }]}>{value}</Text>
        </View>
      </View>
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
    opacity: 0.7,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
  },
  prefix: {
    ...type.displaySmall,
    opacity: 0.72,
    marginBottom: -space.sm,
  },
  percent: {
    fontSize: 240,
    lineHeight: 268,
    fontWeight: '800',
    letterSpacing: -14,
    marginLeft: -8,
    includeFontPadding: false,
    paddingTop: 10,
  },
  percentSign: {
    fontSize: 110,
    fontWeight: '700',
    letterSpacing: -6,
    includeFontPadding: false,
  },
  tag: {
    ...type.bodyMedium,
    opacity: 0.78,
    marginTop: space.lg,
  },
  footer: {
    gap: space.md,
  },
  rule: {
    height: 2,
    width: 40,
    borderRadius: 1,
    opacity: 0.7,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  valueLabel: {
    ...type.eyebrow,
    opacity: 0.65,
  },
  valueValue: {
    ...type.title,
    fontWeight: '700',
  },
});
