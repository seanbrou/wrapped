import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { colors, typography, spacing, radii, motion, serviceColors } from '../lib/theme';

const { width: W } = Dimensions.get('window');

interface Props {
  headline: string;
  supportingData: { label: string; value: string }[];
  service: string;
}

export function InsightCard({ headline, supportingData, service }: Props) {
  const svc = serviceColors[service] || { primary: colors.accentFuchsia, bg: 'rgba(224,64,251,0.1)' };

  const headlineOpacity = useRef(new Animated.Value(0)).current;
  const headlineScale = useRef(new Animated.Value(0.9)).current;
  const chipAnims = useRef(supportingData.map(() => new Animated.Value(0))).current;
  const quoteOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(200),
      Animated.timing(quoteOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(headlineOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(headlineScale, { toValue: 1, ...motion.springGentle, useNativeDriver: true }),
      ]),
      Animated.delay(300),
      Animated.stagger(150, chipAnims.map(a =>
        Animated.spring(a, { toValue: 1, ...motion.spring, useNativeDriver: true })
      )),
    ]).start();
  }, []);

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

        {/* Quote mark */}
        <Animated.Text style={[styles.quoteMark, { opacity: quoteOpacity, color: svc.primary }]}>
          "
        </Animated.Text>

        {/* Headline */}
        <Animated.Text
          style={[
            styles.headline,
            {
              opacity: headlineOpacity,
              transform: [{ scale: headlineScale }],
            },
          ]}
        >
          {headline}
        </Animated.Text>

        <Animated.Text style={[styles.quoteMarkEnd, { opacity: quoteOpacity, color: svc.primary }]}>
          "
        </Animated.Text>

        {/* Supporting data chips */}
        <View style={styles.chips}>
          {supportingData.map((chip, i) => (
            <Animated.View
              key={i}
              style={[
                styles.chip,
                {
                  opacity: chipAnims[i],
                  transform: [
                    { translateY: chipAnims[i].interpolate({ inputRange: [0, 1], outputRange: [15, 0] }) },
                  ],
                },
              ]}
            >
              <Text style={styles.chipValue}>{chip.value}</Text>
              <Text style={styles.chipLabel}>{chip.label}</Text>
            </Animated.View>
          ))}
        </View>
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
    width: W * 1.4,
    height: W * 1.4,
    borderRadius: W,
    opacity: 0.04,
    top: -W * 0.5,
    left: -W * 0.2,
  },
  content: {
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
  },
  serviceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radii.full,
    gap: 6,
    marginBottom: spacing.xxl,
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
  quoteMark: {
    fontSize: 56,
    fontWeight: '800',
    lineHeight: 60,
    marginBottom: -10,
    opacity: 0.5,
  },
  headline: {
    ...typography.h1,
    fontSize: 26,
    lineHeight: 36,
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 0,
  },
  quoteMarkEnd: {
    fontSize: 56,
    fontWeight: '800',
    lineHeight: 60,
    marginTop: -10,
    opacity: 0.5,
    marginBottom: spacing.xxl,
  },
  chips: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  chip: {
    backgroundColor: colors.glassFill2,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.glassStroke,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    minWidth: 100,
  },
  chipValue: {
    ...typography.monoLarge,
    fontSize: 28,
    lineHeight: 32,
    color: colors.primary,
    marginBottom: 4,
  },
  chipLabel: {
    ...typography.overline,
    fontSize: 9,
    color: colors.tertiary,
  },
});