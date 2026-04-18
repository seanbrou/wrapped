import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { colors } from '../lib/theme';

interface Props {
  labels: string[];
  values: number[];
  unit?: string;
  title?: string;
}

export function ComparisonCard({ labels, values, unit, title }: Props) {
  const maxVal = Math.max(...values);
  const bars = labels.map((label, i) => ({
    label,
    value: values[i],
    width: (values[i] / maxVal) * 100,
  }));

  return (
    <View style={styles.container}>
      {title && <Text style={styles.title}>{title}</Text>}
      <View style={styles.bars}>
        {bars.map((bar, i) => (
          <ComparisonBar key={i} label={bar.label} width={bar.width} value={bar.value} unit={unit || ''} index={i} />
        ))}
      </View>
    </View>
  );
}

function ComparisonBar({ label, width, value, unit, index }: {
  label: string; width: number; value: number; unit: string; index: number;
}) {
  const animW = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(index * 200),
      Animated.parallel([
        Animated.timing(animW, { toValue: width, duration: 1000, useNativeDriver: false }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const isFirst = index === 0;

  return (
    <Animated.View style={[styles.barRow, { opacity: opacityAnim }]}>
      <Text style={styles.barLabel}>{label}</Text>
      <View style={styles.barTrack}>
        <Animated.View style={[styles.barFill, {
          width: animW.interpolate({
            inputRange: [0, 100],
            outputRange: ['0%', '100%'],
          }) as any,
          backgroundColor: isFirst ? colors.secondary : colors.accentPurple,
        }]} />
      </View>
      <Text style={styles.barValue}>{value.toLocaleString()} {unit}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 32,
    textAlign: 'center',
  },
  bars: {
    gap: 20,
  },
  barRow: {
    gap: 8,
  },
  barLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  barTrack: {
    height: 12,
    backgroundColor: colors.surface,
    borderRadius: 6,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 6,
  },
  barValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 4,
  },
});
