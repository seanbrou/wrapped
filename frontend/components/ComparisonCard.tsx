import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Dimensions } from 'react-native';
import { colors, type, space, motion, serviceById, type StoryAccent } from '../lib/theme';

const { width: W } = Dimensions.get('window');

interface Props {
  title: string;
  labels: string[];
  values: number[];
  unit: string;
  service: string;
  accent: StoryAccent;
}

// Horizontal bars — editorial infographic style. First row is emphasized.
export function ComparisonCard({ title, labels, values, unit, service, accent }: Props) {
  const svc = serviceById[service];
  const header = useRef(new Animated.Value(0)).current;
  const bars = useRef(values.map(() => new Animated.Value(0))).current;
  const max = Math.max(...values);

  useEffect(() => {
    Animated.sequence([
      Animated.timing(header, {
        toValue: 1,
        duration: 450,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.stagger(180, bars.map(b =>
        Animated.spring(b, { toValue: 1, ...motion.springSoft, useNativeDriver: false })
      )),
    ]).start();
  }, []);

  const chartW = W - space.lg * 2;
  const delta = values[0] - (values[1] ?? 0);
  const deltaPct = values[1] ? Math.round((delta / values[1]) * 100) : 0;

  return (
    <View style={styles.root}>
      <Animated.View
        style={[
          styles.header,
          {
            opacity: header,
            transform: [{ translateY: header.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
          },
        ]}
      >
        <Text style={[styles.eyebrow, { color: accent.fg }]}>
          {svc?.name ?? service}
        </Text>
        <Text style={[styles.title, { color: accent.fg }]}>{title}</Text>
      </Animated.View>

      <View style={styles.bars}>
        {values.map((v, i) => {
          const width = bars[i].interpolate({
            inputRange: [0, 1],
            outputRange: ['0%', `${(v / max) * 100}%`],
          });
          const emphasized = i === 0;
          return (
            <View key={i} style={styles.barGroup}>
              <View style={styles.barHeader}>
                <Text
                  style={[
                    styles.label,
                    { color: accent.fg, opacity: emphasized ? 1 : 0.55 },
                  ]}
                >
                  {labels[i]}
                </Text>
                <Text
                  style={[
                    styles.value,
                    { color: accent.fg, opacity: emphasized ? 1 : 0.65 },
                  ]}
                >
                  {v}
                  <Text style={styles.unit}> {unit}</Text>
                </Text>
              </View>
              <View style={[styles.track, { backgroundColor: accent.fg + '22' }]}>
                <Animated.View
                  style={[
                    styles.fill,
                    {
                      width,
                      backgroundColor: accent.fg,
                      opacity: emphasized ? 1 : 0.4,
                    },
                  ]}
                />
              </View>
            </View>
          );
        })}
      </View>

      {values.length >= 2 && (
        <View style={styles.footer}>
          <View style={[styles.rule, { backgroundColor: accent.fg, opacity: 0.6 }]} />
          <View style={styles.deltaRow}>
            <Text style={[styles.deltaLabel, { color: accent.fg }]}>
              vs. last year
            </Text>
            <Text style={[styles.deltaValue, { color: accent.fg }]}>
              {delta >= 0 ? '+' : ''}{delta} {unit}  ·  {deltaPct >= 0 ? '+' : ''}{deltaPct}%
            </Text>
          </View>
        </View>
      )}
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
  header: {
    marginBottom: space.xl,
  },
  eyebrow: {
    ...type.eyebrow,
    opacity: 0.7,
    marginBottom: space.sm,
  },
  title: {
    ...type.display,
  },
  bars: {
    flex: 1,
    justifyContent: 'center',
    gap: space.xl,
  },
  barGroup: {
    gap: space.sm,
  },
  barHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  label: {
    ...type.eyebrow,
  },
  value: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  unit: {
    ...type.bodySmall,
    fontWeight: '500',
    opacity: 0.7,
  },
  track: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: 6,
    borderRadius: 3,
  },
  footer: {
    gap: space.md,
  },
  rule: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
  },
  deltaRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  deltaLabel: {
    ...type.eyebrow,
    opacity: 0.65,
  },
  deltaValue: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
});
