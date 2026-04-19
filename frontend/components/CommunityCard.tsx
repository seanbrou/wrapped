import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { colors, typography, spacing, radii } from '../lib/theme';

interface Props {
  percentile: number;
  metric: string;
  value: string;
  service: string;
}

const SIZE = 180;
const STROKE = 10;
const R = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * R;

export function CommunityCard({ percentile, metric, value, service }: Props) {
  const percentDisplay = Math.min(100, percentile);
  const strokeDash = CIRCUMFERENCE * (1 - percentile / 100);

  const ringAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(ringAnim, { toValue: 1, damping: 12, stiffness: 60, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, damping: 10, stiffness: 80, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.serviceBadge}>
        <Text style={styles.serviceText}>{service.replace('_', ' ')}</Text>
      </View>

      {/* Ring */}
      <Animated.View style={[styles.ringWrap, { transform: [{ scale: scaleAnim }] }]}>
        <Svg width={SIZE} height={SIZE}>
          <Defs>
            <LinearGradient id="pg" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#7C4DFF" />
              <Stop offset="50%" stopColor="#E040FB" />
              <Stop offset="100%" stopColor="#00F5FF" />
            </LinearGradient>
          </Defs>
          {/* Background circle */}
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            stroke={colors.surface}
            strokeWidth={STROKE}
            fill="none"
          />
          {/* Progress circle */}
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            stroke="url(#pg)"
            strokeWidth={STROKE}
            fill="none"
            strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
            strokeDashoffset={strokeDash as any}
            strokeLinecap="round"
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          />
        </Svg>
        <View style={styles.ringInnerText}>
          <Text style={styles.percentNum}>Top {percentDisplay}%</Text>
          <Text style={styles.percentLabel}>worldwide</Text>
        </View>
      </Animated.View>

      {/* Metric and value */}
      <Animated.View style={{ opacity: fadeAnim, alignItems: 'center' }}>
        <Text style={styles.metric}>{metric}</Text>
        <Text style={styles.value}>{value}</Text>
      </Animated.View>
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
  ringWrap: {
    width: SIZE,
    height: SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  ringInnerText: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  percentNum: {
    ...typography.h1,
    fontSize: 28,
    color: colors.primary,
  },
  percentLabel: {
    ...typography.caption,
    color: colors.secondary,
    marginTop: 2,
  },
  metric: {
    ...typography.captionUppercase,
    color: colors.accentCyan,
    letterSpacing: 2,
    marginBottom: spacing.xs,
  },
  value: {
    ...typography.h3,
    color: colors.primary,
    fontWeight: '700',
  },
});