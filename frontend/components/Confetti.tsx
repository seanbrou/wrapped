// ═══════════════════════════════════════════════════════════════
// Confetti — drifting ambient decoration or a celebratory burst.
//
// Drift region: use bandHeight + optional bandOffset to place confetti
// in a vertical strip (e.g. bottom half: bandOffset ≈ 0.42 * screen H).
// ═══════════════════════════════════════════════════════════════

import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View, ViewStyle } from 'react-native';
import { CONFETTI_COLORS } from '../lib/theme';

type Shape = 'rect' | 'circle' | 'bar' | 'triangle';

interface Piece {
  id: number;
  left: number;
  top: number;
  delay: number;
  size: number;
  color: string;
  shape: Shape;
  rotate: number;
  drift: number;
}

interface Props {
  mode?: 'drift' | 'burst';
  count?: number;
  seed?: number;
  style?: ViewStyle;
  /** Height of the vertical region pieces spawn in */
  bandHeight?: number;
  /** Distance from top of screen where the band starts (default 0) */
  bandOffset?: number;
}

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

function mulberry(seed: number) {
  let t = seed;
  return () => {
    t = (t + 0x6D2B79F5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export default function Confetti({
  mode = 'drift',
  count = 22,
  seed = 7,
  style,
  bandHeight,
  bandOffset = 0,
}: Props) {
  const pieces = useMemo<Piece[]>(() => {
    const rand = mulberry(seed);
    const shapes: Shape[] = [
      'bar', 'bar', 'bar', 'circle', 'circle', 'rect', 'triangle',
    ];
    const regionH = bandHeight ?? (mode === 'drift' ? 420 : SCREEN_H);
    const offset = bandOffset;
    return Array.from({ length: count }).map((_, i) => ({
      id: i,
      left: rand() * SCREEN_W,
      top: offset + rand() * regionH,
      delay: rand() * 2200,
      size: 4 + rand() * 10,
      color: CONFETTI_COLORS[Math.floor(rand() * CONFETTI_COLORS.length)],
      shape: shapes[Math.floor(rand() * shapes.length)],
      rotate: rand() * 360,
      drift: (rand() - 0.5) * 42,
    }));
  }, [count, seed, mode, bandHeight, bandOffset]);

  return (
    <View pointerEvents="none" style={[styles.layer, style]}>
      {pieces.map(p => (
        <Piece key={p.id} piece={p} mode={mode} />
      ))}
    </View>
  );
}

function Piece({ piece, mode }: { piece: Piece; mode: 'drift' | 'burst' }) {
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let loop: Animated.CompositeAnimation;
    if (mode === 'drift') {
      loop = Animated.loop(
        Animated.sequence([
          Animated.delay(piece.delay),
          Animated.timing(t, {
            toValue: 1,
            duration: 4200 + (piece.id * 113) % 1800,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(t, {
            toValue: 0,
            duration: 4200 + (piece.id * 173) % 1800,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      );
    } else {
      t.setValue(0);
      loop = Animated.timing(t, {
        toValue: 1,
        delay: piece.delay,
        duration: 2600 + (piece.id * 59) % 1400,
        easing: Easing.bezier(0.22, 0.61, 0.36, 1),
        useNativeDriver: true,
      });
    }
    loop.start();
    return () => loop.stop();
  }, [mode, piece, t]);

  const translateY = t.interpolate({
    inputRange: [0, 1],
    outputRange: mode === 'drift' ? [0, -22] : [-30, SCREEN_H + 50],
  });
  const translateX = t.interpolate({
    inputRange: [0, 1],
    outputRange: [0, piece.drift],
  });
  const rotate = t.interpolate({
    inputRange: [0, 1],
    outputRange: [`${piece.rotate}deg`, `${piece.rotate + (mode === 'burst' ? 540 : 140)}deg`],
  });
  const opacity = mode === 'drift'
    ? t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.45, 0.9, 0.45] })
    : t.interpolate({ inputRange: [0, 0.05, 0.85, 1], outputRange: [0, 1, 1, 0] });

  let shapeStyle: ViewStyle;
  if (piece.shape === 'circle') {
    shapeStyle = {
      width: piece.size, height: piece.size,
      borderRadius: piece.size / 2, backgroundColor: piece.color,
    };
  } else if (piece.shape === 'bar') {
    shapeStyle = {
      width: piece.size * 1.8, height: 3,
      borderRadius: 2, backgroundColor: piece.color,
    };
  } else if (piece.shape === 'triangle') {
    shapeStyle = {
      width: 0, height: 0,
      borderLeftWidth: piece.size / 2,
      borderRightWidth: piece.size / 2,
      borderBottomWidth: piece.size,
      borderLeftColor: 'transparent',
      borderRightColor: 'transparent',
      borderBottomColor: piece.color,
      backgroundColor: 'transparent',
    } as ViewStyle;
  } else {
    shapeStyle = {
      width: piece.size, height: piece.size * 0.7,
      borderRadius: 2, backgroundColor: piece.color,
    };
  }

  return (
    <Animated.View
      style={[
        styles.piece,
        { left: piece.left, top: piece.top, opacity,
          transform: [{ translateX }, { translateY }, { rotate }] },
        shapeStyle,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    overflow: 'hidden',
  },
  piece: {
    position: 'absolute',
  },
});
