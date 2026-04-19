import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { colors, typography, spacing, radii } from '../lib/theme';

interface Props {
  labels: string[];
  values: number[];
  unit?: string;
  title?: string;
}

const BAR_COLORS = ['#7C4DFF', '#E040FB', '#00F5FF', '#FFD700', '#00E676'];

export function ComparisonCard({ labels, values, unit, title }: Props) {
  const maxVal = Math.max(...values);
  const barAnims = useRef(labels.map(() => new Animated.Value(0))).current;
  const fadeAnims = useRef(labels.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.stagger(200, barAnims.map((bar, i) =>
      Animated.parallel([
        Animated.spring(bar, { toValue: 1, damping: 12, stiffness: 60, useNativeDriver: false }),
        Animated.timing(fadeAnims[i], { toValue: 1, duration: 400, useNativeDriver: true }),
      ])
    )).start();
  }, []);

  return (
    <View style={styles.container}>
      {title && <Text style={styles.title}>{title}</Text>}

      <View style={styles.bars}>
        {labels.map((label, i) => {
          const pct = maxVal > 0 ? (values[i] / maxVal) * 100 : 0;
          return (
            <Animated.View key={i} style={[styles.barRow, { opacity: fadeAnims[i] }]}>
              <Text style={styles.barLabel}>{label}</Text>
              <View style={styles.barTrack}>
                <Animated.View style={[
                  styles.barFill,
                  {
                    backgroundColor: BAR_COLORS[i % BAR_COLORS.length],
                    width: barAnims[i].interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', `${pct}%`],
                    }) as any,
                  },
                ]} />
              </View>
              <Text style={styles.barValue}>{values[i].toLocaleString()}{unit ? ` ${unit}` : ''}</Text>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.background,
  },
  title: {
    ...typography.h2,
    color: colors.primary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  bars: {
    gap: spacing.lg,
  },
  barRow: {
    gap: spacing.xs,
  },
  barLabel: {
    ...typography.captionUppercase,
    color: colors.secondary,
    letterSpacing: 1,
  },
  barTrack: {
    height: 14,
    backgroundColor: colors.surface,
    borderRadius: 7,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 7,
  },
  barValue: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
    marginTop: 2,
  },
});