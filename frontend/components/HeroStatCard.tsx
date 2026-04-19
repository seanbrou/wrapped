import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { colors, typography, spacing, radii } from '../lib/theme';

interface Props {
  stat: string;
  value: string;
  unit?: string;
  service: string;
  comparison?: string;
}

const { height: SCREEN_H } = Dimensions.get('window');

export function HeroStatCard({ stat, value, unit, service, comparison }: Props) {
  const numAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(numAnim, { toValue: 1, damping: 10, stiffness: 60, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      {/* Service badge */}
      <View style={styles.serviceBadge}>
        <Text style={styles.serviceText}>{service.replace('_', ' ')}</Text>
      </View>

      {/* Main stat */}
      <Animated.View style={[styles.statArea, { transform: [{ scale: numAnim }] }]}>
        <Text style={styles.statValue}>{stat}</Text>
        {unit && <Text style={styles.statUnit}>{unit}</Text>}
      </Animated.View>

      {/* Value label */}
      <Animated.View style={{ opacity: fadeAnim }}>
        <Text style={styles.value}>{value}</Text>
      </Animated.View>

      {/* Comparison pill */}
      {comparison && (
        <Animated.View style={{ opacity: fadeAnim }}>
          <View style={styles.comparisonPill}>
            <Text style={styles.comparisonText}>{comparison}</Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.background,
  },
  serviceBadge: {
    position: 'absolute',
    top: 100,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    backgroundColor: colors.glassFill,
    borderWidth: 1,
    borderColor: colors.glassStroke,
  },
  serviceText: {
    ...typography.captionUppercase,
    color: colors.secondary,
    letterSpacing: 2,
  },
  statArea: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  statValue: {
    ...typography.displayLarge,
    fontSize: 80,
    lineHeight: 84,
    color: colors.primary,
    letterSpacing: -3,
  },
  statUnit: {
    ...typography.h3,
    color: colors.accentCyan,
    marginTop: spacing.xs,
  },
  value: {
    ...typography.body,
    color: colors.secondary,
    textAlign: 'center',
    maxWidth: 280,
  },
  comparisonPill: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    backgroundColor: colors.glassFill,
    borderWidth: 1,
    borderColor: colors.accentFuchsia + '40',
  },
  comparisonText: {
    ...typography.caption,
    color: colors.accentFuchsia,
  },
});