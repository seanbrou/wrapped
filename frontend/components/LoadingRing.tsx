import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing } from '../lib/theme';

const { width: W } = Dimensions.get('window');
const RING_SIZE = 64;

export function LoadingRing() {
  const rotation = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotation, { toValue: 1, duration: 1500, useNativeDriver: true })
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      {/* Glow */}
      <Animated.View
        style={[
          styles.glow,
          {
            opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.35] }),
          },
        ]}
      />

      {/* Spinning ring */}
      <Animated.View style={[styles.ring, { transform: [{ rotate: spin }] }]}>
        <LinearGradient
          colors={[colors.accentPurple, colors.accentFuchsia, colors.accentCyan, 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.ringGradient}
        >
          <View style={styles.ringInner} />
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  glow: {
    position: 'absolute',
    width: RING_SIZE * 2.5,
    height: RING_SIZE * 2.5,
    borderRadius: RING_SIZE * 1.5,
    backgroundColor: colors.accentFuchsia,
  },
  ring: {
    width: RING_SIZE,
    height: RING_SIZE,
  },
  ringGradient: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringInner: {
    width: RING_SIZE - 8,
    height: RING_SIZE - 8,
    borderRadius: (RING_SIZE - 8) / 2,
    backgroundColor: colors.background,
  },
});