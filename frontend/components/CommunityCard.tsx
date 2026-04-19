import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography, spacing, radii, motion, serviceColors } from '../lib/theme';

const { width: W } = Dimensions.get('window');

interface Props {
  percentile: number;
  metric: string;
  value: string;
  service: string;
}

export function CommunityCard({ percentile, metric, value, service }: Props) {
  const svc = serviceColors[service] || { primary: colors.accentFuchsia, gradient: [colors.accentPurple, colors.accentFuchsia] as const, bg: 'rgba(224,64,251,0.1)' };

  const badgeScale = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textY = useRef(new Animated.Value(20)).current;
  const barWidth = useRef(new Animated.Value(0)).current;
  const glowPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(200),
      Animated.spring(badgeScale, { toValue: 1, damping: 8, stiffness: 100, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(textOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(textY, { toValue: 0, ...motion.springGentle, useNativeDriver: true }),
      ]),
      Animated.timing(barWidth, { toValue: 1, duration: 800, useNativeDriver: false }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(glowPulse, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const pctPosition = (100 - percentile) / 100;

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

        {/* "Top X%" badge */}
        <Animated.View
          style={[
            styles.percentileBadge,
            {
              transform: [{ scale: badgeScale }],
            },
          ]}
        >
          <Animated.View
            style={[
              styles.percentileGlow,
              {
                backgroundColor: svc.primary,
                opacity: glowPulse.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.35] }),
              },
            ]}
          />
          <LinearGradient
            colors={[svc.gradient[0], svc.gradient[1]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.percentileGradient}
          >
            <Text style={styles.percentileText}>Top</Text>
            <Text style={styles.percentileNumber}>{percentile}%</Text>
          </LinearGradient>
        </Animated.View>

        {/* Description */}
        <Animated.View
          style={{
            opacity: textOpacity,
            transform: [{ translateY: textY }],
            alignItems: 'center',
          }}
        >
          <Text style={styles.metricText}>of all users in {metric}</Text>
          <Text style={styles.valueText}>{value}</Text>
        </Animated.View>

        {/* Position bar */}
        <View style={styles.barOuter}>
          <View style={styles.barTrack}>
            <Animated.View
              style={[
                styles.barFill,
                {
                  width: barWidth.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', `${pctPosition * 100}%`],
                  }),
                },
              ]}
            >
              <LinearGradient
                colors={[svc.gradient[0], svc.gradient[1]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
            {/* You indicator */}
            <Animated.View
              style={[
                styles.youIndicator,
                {
                  left: barWidth.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', `${pctPosition * 100}%`],
                  }),
                },
              ]}
            >
              <View style={[styles.youDot, { backgroundColor: svc.primary }]} />
              <Text style={styles.youLabel}>YOU</Text>
            </Animated.View>
          </View>
          <View style={styles.barLabels}>
            <Text style={styles.barLabelText}>0%</Text>
            <Text style={styles.barLabelText}>Average</Text>
            <Text style={styles.barLabelText}>100%</Text>
          </View>
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
    opacity: 0.05,
    top: -W * 0.5,
    right: -W * 0.3,
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
  percentileBadge: {
    width: 140,
    height: 140,
    borderRadius: 40,
    marginBottom: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentileGlow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
  },
  percentileGradient: {
    width: 140,
    height: 140,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentileText: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 2,
    fontSize: 14,
  },
  percentileNumber: {
    fontSize: 48,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -2,
    lineHeight: 52,
  },
  metricText: {
    ...typography.body,
    color: colors.secondary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  valueText: {
    ...typography.h2,
    color: colors.primary,
    marginBottom: spacing.xxl,
  },

  // Bar
  barOuter: {
    width: '100%',
  },
  barTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.glassFill2,
    overflow: 'visible',
  },
  barFill: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  youIndicator: {
    position: 'absolute',
    top: -24,
    marginLeft: -12,
    alignItems: 'center',
  },
  youDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#fff',
  },
  youLabel: {
    ...typography.overline,
    fontSize: 8,
    color: colors.secondary,
    marginTop: 2,
  },
  barLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  barLabelText: {
    ...typography.caption,
    color: colors.tertiary,
    fontSize: 10,
  },
});