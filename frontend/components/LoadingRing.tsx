import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

export function LoadingRing({ size = 48 }: { size?: number }) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#6C5CE7" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
});
