import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { colors } from '../lib/theme';

interface Props {
  total: number;
  current: number;
}

export function ProgressDots({ total, current }: Props) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, [current]);

  return (
    <View style={styles.container}>
      {Array.from({ length: total }).map((_, i) => {
        const isCurrent = i === current;
        const isDone = i < current;

        if (isCurrent) {
          return (
            <Animated.View
              key={i}
              style={[
                styles.dot,
                styles.dotCurrent,
                {
                  transform: [{ scaleX: pulseAnim }],
                  shadowOpacity: pulseAnim.interpolate({ inputRange: [1, 1.3], outputRange: [0.6, 0.9] }),
                },
              ]}
            />
          );
        }

        return (
          <View
            key={i}
            style={[
              styles.dot,
              isDone ? styles.dotDone : styles.dotFuture,
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
  },
  dot: {
    height: 4,
    borderRadius: 2,
  },
  dotCurrent: {
    width: 20,
    backgroundColor: colors.accentCyan,
    shadowColor: colors.accentCyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  dotDone: {
    width: 8,
    backgroundColor: colors.accentFuchsia,
  },
  dotFuture: {
    width: 4,
    backgroundColor: colors.borderLight,
  },
});