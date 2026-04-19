import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { colors } from '../lib/theme';

const SIZE = 56;
const STROKE = 4;
const R = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * R;

export function LoadingRing({ size = SIZE }: { size?: number }) {
  const rotation = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in
    Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();

    // Continuous rotation
    Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const scale = size / SIZE;
  const r = (size - STROKE) / 2;
  const circ = 2 * Math.PI * r;

  return (
    <View style={styles.container}>
      <Animated.View style={{ opacity, transform: [{ scale }] }}>
        <Animated.View
          style={{
            transform: [
              {
                rotate: rotation.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '360deg'],
                }),
              },
            ],
          }}
        >
          <Svg width={size} height={size}>
            <Defs>
              <LinearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#7C4DFF" />
                <Stop offset="50%" stopColor="#E040FB" />
                <Stop offset="100%" stopColor="#00F5FF" stopOpacity="0.1" />
              </LinearGradient>
            </Defs>
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              stroke="url(#ringGrad)"
              strokeWidth={STROKE}
              fill="none"
              strokeDasharray={`${circ * 0.75} ${circ * 0.25}`}
              strokeLinecap="round"
            />
          </Svg>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
});