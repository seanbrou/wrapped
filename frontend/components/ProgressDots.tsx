import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radii, spacing } from '../lib/theme';

interface Props {
  total: number;
  current: number;
}

export function ProgressDots({ total, current }: Props) {
  // Use segmented progress bar (like Instagram Stories)
  return (
    <View style={styles.container}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={styles.segment}>
          <View style={styles.segmentTrack}>
            {i < current ? (
              // Completed
              <View style={[styles.segmentFill, styles.segmentComplete]} />
            ) : i === current ? (
              // Active — gradient fill
              <LinearGradient
                colors={[colors.accentPurple, colors.accentFuchsia]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.segmentFill}
              />
            ) : null}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: spacing.md,
  },
  segment: {
    flex: 1,
    height: 3,
  },
  segmentTrack: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  segmentFill: {
    flex: 1,
    borderRadius: 2,
  },
  segmentComplete: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
});