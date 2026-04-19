import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography, spacing, radii, motion, serviceColors } from '../lib/theme';

const { width: W } = Dimensions.get('window');

interface Props {
  title: string;
  labels: string[];
  values: number[];
  unit: string;
  service: string;
}

export function ComparisonCard({ title, labels, values, unit, service }: Props) {
  const svc = serviceColors[service] || { primary: colors.accentFuchsia, gradient: [colors.accentPurple, colors.accentFuchsia] as const, bg: 'rgba(224,64,251,0.1)' };

  const titleOpacity = useRef(new Animated.Value(0)).current;
  const barAnims = useRef(values.map(() => new Animated.Value(0))).current;

  const max = Math.max(...values);

  useEffect(() => {
    Animated.sequence([
      Animated.delay(200),
      Animated.timing(titleOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.stagger(200, barAnims.map(a =>
        Animated.spring(a, { toValue: 1, damping: 14, stiffness: 80, useNativeDriver: false })
      )),
    ]).start();
  }, []);

  const barColors: Array<readonly [string, string]> = [
    [svc.gradient[0], svc.gradient[1]] as const,
    [colors.borderLight, colors.border] as const,
    [colors.tertiary, colors.muted] as const,
  ];

  return (
    <View style={styles.container}>
      <View style={[styles.bgGlow, { backgroundColor: svc.primary }]} />

      <View style={styles.content}>
        {/* Service badge */}
        <View style={[styles.serviceBadge, { backgroundColor: svc.bg }]}>
          <View style={[styles.serviceDot, { backgroundColor: svc.primary }]} />
          <Text style={[styles.serviceLabel, { color: svc.primary }]}>
            {service.replace('_', ' ').toUpperCase()}
          </Text>
        </View>

        <Animated.Text style={[styles.title, { opacity: titleOpacity }]}>
          {title}
        </Animated.Text>

        {/* Bars */}
        <View style={styles.bars}>
          {values.map((v, i) => {
            const pct = v / max;
            return (
              <View key={i} style={styles.barRow}>
                <View style={styles.barLabelRow}>
                  <Text style={[styles.barLabel, i === 0 && styles.barLabelHighlight]}>
                    {labels[i]}
                  </Text>
                  <Text style={[styles.barValue, i === 0 && styles.barValueHighlight]}>
                    {v} {unit}
                  </Text>
                </View>
                <View style={styles.barTrack}>
                  <Animated.View
                    style={[
                      styles.barFill,
                      {
                        width: barAnims[i].interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0%', `${pct * 100}%`],
                        }),
                      },
                    ]}
                  >
                    <LinearGradient
                      colors={barColors[i] || barColors[2]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[StyleSheet.absoluteFill, { borderRadius: 6 }]}
                    />
                  </Animated.View>
                </View>
              </View>
            );
          })}
        </View>

        {/* Change indicator */}
        {values.length >= 2 && (
          <View style={styles.changeCard}>
            <Text style={styles.changeEmoji}>{values[0] > values[1] ? '📈' : '📉'}</Text>
            <Text style={styles.changeText}>
              {values[0] > values[1]
                ? `+${Math.round(((values[0] - values[1]) / values[1]) * 100)}% from last year`
                : `${Math.round(((values[0] - values[1]) / values[1]) * 100)}% from last year`}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  bgGlow: {
    position: 'absolute',
    width: W * 1.3,
    height: W * 1.3,
    borderRadius: W,
    opacity: 0.04,
    bottom: -W * 0.4,
    right: -W * 0.3,
  },
  content: {
    paddingHorizontal: spacing.xl,
  },
  serviceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radii.full,
    gap: 6,
    marginBottom: spacing.lg,
  },
  serviceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  serviceLabel: {
    ...typography.overline,
    fontSize: 10,
  },
  title: {
    ...typography.h1,
    color: colors.primary,
    marginBottom: spacing.xl,
  },
  bars: {
    gap: spacing.lg,
    marginBottom: spacing.xl,
  },
  barRow: {
    gap: spacing.sm,
  },
  barLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  barLabel: {
    ...typography.smallMedium,
    color: colors.secondary,
  },
  barLabelHighlight: {
    color: colors.primary,
    fontWeight: '600',
  },
  barValue: {
    ...typography.mono,
    fontSize: 14,
    color: colors.tertiary,
  },
  barValueHighlight: {
    color: colors.primary,
  },
  barTrack: {
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.glassFill2,
    overflow: 'hidden',
  },
  barFill: {
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
  },
  changeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.glassFill2,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.glassStroke,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  changeEmoji: {
    fontSize: 20,
  },
  changeText: {
    ...typography.smallMedium,
    color: colors.secondary,
  },
});