import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';

interface Props {
  colors?: readonly [string, string];
  style?: object;
}

export function GradientText({ children, colors: gradientColors, style }: any) {
  return (
    <View style={[styles.container, style]}>
      <Svg height="100%" width="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="textGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={(gradientColors || ['#6C5CE7', '#00D4FF'])[0]} />
            <Stop offset="100%" stopColor={(gradientColors || ['#6C5CE7', '#00D4FF'])[1]} />
          </LinearGradient>
        </Defs>
      </Svg>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
});
