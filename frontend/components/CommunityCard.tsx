import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { colors } from '../lib/theme';

interface Props {
  percentile: number; // e.g. 5 = top 5%
  metric: string;
  value: string;
}

const SIZE = 180;
const STROKE = 14;
const R = (SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * R;

export function CommunityCard({ percentile, metric, value }: Props) {
  const progressAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;

  const percentDisplay = percentile;
  const circumference = CIRC;
  const strokeDash = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, circumference * (1 - percentDisplay / 100)],
  });

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(progressAnim, { toValue: 1, duration: 1800, useNativeDriver: false }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.circleWrap, {
        opacity: opacityAnim,
        transform: [{ scale: scaleAnim }],
      }]}>
        <Svg width={SIZE} height={SIZE}>
          <Defs>
            <LinearGradient id="pg" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#6C5CE7" />
              <Stop offset="100%" stopColor="#00D4FF" />
            </LinearGradient>
          </Defs>
          {/* Background circle */}
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            stroke={colors.border}
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
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDash as any}
            strokeLinecap="round"
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          />
        </Svg>
        <View style={styles.innerText}>
          <Text style={styles.percentNum}>Top {percentDisplay}%</Text>
          <Text style={styles.percentLabel}>worldwide</Text>
        </View>
      </Animated.View>
      <Text style={styles.metric}>{metric}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  circleWrap: {
    width: SIZE,
    height: SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerText: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  percentNum: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.primary,
  },
  percentLabel: {
    fontSize: 12,
    color: colors.secondary,
    marginTop: 2,
  },
  metric: {
    fontSize: 16,
    color: colors.accentCyan,
    marginTop: 20,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  value: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 4,
  },
});
