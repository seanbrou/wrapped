import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { colors, typography, spacing, radii } from '../lib/theme';

interface Props {
  headline: string;
  supportingData?: { label: string; value: string }[];
  service: string;
}

export function InsightCard({ headline, supportingData, service }: Props) {
  const headlineOpacity = useRef(new Animated.Value(0)).current;
  const headlineY = useRef(new Animated.Value(30)).current;
  const chipAnims = useRef((supportingData || []).map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(headlineY, { toValue: 0, damping: 12, stiffness: 60, useNativeDriver: true }),
      Animated.timing(headlineOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();

    Animated.stagger(150, chipAnims.map(anim =>
      Animated.spring(anim, { toValue: 1, damping: 10, stiffness: 80, useNativeDriver: true })
    )).start();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.serviceBadge}>
        <Text style={styles.serviceText}>{service.replace('_', ' ')}</Text>
      </View>

      <Animated.View style={[styles.headlineArea, { opacity: headlineOpacity, transform: [{ translateY: headlineY }] }]}>
        <Text style={styles.headline}>"{headline}"</Text>
      </Animated.View>

      {supportingData && supportingData.length > 0 && (
        <View style={styles.chips}>
          {supportingData.map((d, i) => (
            <Animated.View
              key={i}
              style={[
                styles.chip,
                {
                  opacity: chipAnims[i],
                  transform: [{ scale: chipAnims[i].interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }],
                },
              ]}
            >
              <Text style={styles.chipLabel}>{d.label}</Text>
              <Text style={styles.chipValue}>{d.value}</Text>
            </Animated.View>
          ))}
        </View>
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
  headlineArea: {
    marginBottom: spacing.xl,
  },
  headline: {
    ...typography.h2,
    color: colors.accentFuchsia,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 34,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    backgroundColor: colors.glassFill,
    borderWidth: 1,
    borderColor: colors.glassStroke,
    alignItems: 'center',
  },
  chipLabel: {
    ...typography.captionUppercase,
    color: colors.tertiary,
    fontSize: 9,
  },
  chipValue: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
    marginTop: 2,
  },
});