import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography, spacing, radii, shadows, motion, serviceColors } from '../lib/theme';

const { width: W, height: H } = Dimensions.get('window');

interface Props {
  stat: string;
  value: string;
  unit: string;
  comparison: string;
  service: string;
}

export function HeroStatCard({ stat, value, unit, comparison, service }: Props) {
  const svc = serviceColors[service] || { primary: colors.accentFuchsia, gradient: [colors.accentPurple, colors.accentFuchsia] as const, bg: 'rgba(224,64,251,0.1)' };

  const statScale = useRef(new Animated.Value(0)).current;
  const statOpacity = useRef(new Animated.Value(0)).current;
  const labelOpacity = useRef(new Animated.Value(0)).current;
  const labelY = useRef(new Animated.Value(15)).current;
  const compOpacity = useRef(new Animated.Value(0)).current;
  const compY = useRef(new Animated.Value(10)).current;
  const glowPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(200),
      Animated.parallel([
        Animated.spring(statScale, { toValue: 1, ...motion.springBouncy, useNativeDriver: true }),
        Animated.timing(statOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(labelOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.spring(labelY, { toValue: 0, ...motion.springGentle, useNativeDriver: true }),
      ]),
      Animated.delay(200),
      Animated.parallel([
        Animated.timing(compOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(compY, { toValue: 0, ...motion.springGentle, useNativeDriver: true }),
      ]),
    ]).start();

    // Glow pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, { toValue: 1, duration: 2500, useNativeDriver: true }),
        Animated.timing(glowPulse, { toValue: 0, duration: 2500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.container}>
      {/* Background glow */}
      <Animated.View
        style={[
          styles.bgGlow,
          {
            backgroundColor: svc.primary,
            opacity: glowPulse.interpolate({ inputRange: [0, 1], outputRange: [0.04, 0.1] }),
          },
        ]}
      />

      <View style={styles.content}>
        {/* Service label */}
        <View style={[styles.serviceBadge, { backgroundColor: svc.bg }]}>
          <View style={[styles.serviceDot, { backgroundColor: svc.primary }]} />
          <Text style={[styles.serviceLabel, { color: svc.primary }]}>
            {service.replace('_', ' ').toUpperCase()}
          </Text>
        </View>

        {/* Big stat */}
        <Animated.Text
          style={[
            styles.stat,
            {
              opacity: statOpacity,
              transform: [{ scale: statScale }],
            },
          ]}
        >
          {stat}
        </Animated.Text>

        {/* Label */}
        <Animated.Text
          style={[
            styles.label,
            {
              opacity: labelOpacity,
              transform: [{ translateY: labelY }],
            },
          ]}
        >
          {value}
        </Animated.Text>

        {/* Comparison */}
        <Animated.View
          style={[
            styles.compContainer,
            {
              opacity: compOpacity,
              transform: [{ translateY: compY }],
            },
          ]}
        >
          <View style={[styles.compCard, { borderColor: svc.primary + '20' }]}>
            <Text style={styles.compText}>{comparison}</Text>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  bgGlow: {
    position: 'absolute',
    width: W * 1.5,
    height: W * 1.5,
    borderRadius: W,
    top: -W * 0.3,
    right: -W * 0.4,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
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
  stat: {
    ...typography.monoHero,
    color: colors.primary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  label: {
    ...typography.h2,
    color: colors.secondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  compContainer: {
    width: '100%',
  },
  compCard: {
    backgroundColor: colors.glassFill2,
    borderRadius: radii.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  compText: {
    ...typography.bodyMedium,
    color: colors.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },
});