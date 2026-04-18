import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { colors, formatNumber } from '../lib/theme';

interface Props {
  value: number | string;
  unit: string;
  comparison?: string;
  label?: string;
  emoji?: string;
}

export function HeroStatCard({ value, unit, comparison, label, emoji }: Props) {
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 100, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  const displayValue = typeof value === 'number' ? formatNumber(value) : value;

  return (
    <View style={styles.container}>
      {emoji && <Text style={styles.emoji}>{emoji}</Text>}
      <Animated.View style={[styles.valueContainer, {
        opacity: opacityAnim,
        transform: [{ scale: scaleAnim }],
      }]}>
        <Text style={styles.value}>{displayValue}</Text>
        <Text style={styles.unit}>{unit}</Text>
      </Animated.View>
      {comparison && (
        <Animated.Text style={[styles.comparison, { opacity: opacityAnim }]}>
          {comparison}
        </Animated.Text>
      )}
      {label && !emoji && (
        <Text style={styles.label}>{label}</Text>
      )}
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
  emoji: {
    fontSize: 64,
    marginBottom: 8,
  },
  valueContainer: {
    alignItems: 'center',
  },
  value: {
    fontSize: 72,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: -2,
  },
  unit: {
    fontSize: 22,
    fontWeight: '500',
    color: colors.secondary,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  comparison: {
    fontSize: 16,
    color: colors.accentCyan,
    marginTop: 16,
    fontWeight: '500',
  },
  label: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.primary,
    marginTop: 8,
  },
});
