import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Text as SvgText, Rect } from 'react-native-svg';
import { colors, typography } from '../lib/theme';

interface Props {
  colors?: readonly [string, string];
  style?: object;
  children?: React.ReactNode;
  fontSize?: number;
  fontWeight?: string;
}

// GradientText using SVG mask approach for React Native
export function GradientText({ children, colors: gradientColors, style, fontSize, fontWeight }: any) {
  const startColor = gradientColors?.[0] || '#7C4DFF';
  const endColor = gradientColors?.[1] || '#00F5FF';

  // If children is a string, render as SVG text with gradient fill
  if (typeof children === 'string') {
    const size = fontSize || 24;
    const width = children.length * size * 0.6 + 20;
    const height = size * 1.4;
    const id = `grad_${children.slice(0, 8).replace(/\s/g, '')}`;

    return (
      <View style={[styles.container, style]}>
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id={id} x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor={startColor} />
              <Stop offset="100%" stopColor={endColor} />
            </LinearGradient>
          </Defs>
          <SvgText
            x={width / 2}
            y={height / 2}
            textAnchor="middle"
            alignmentBaseline="central"
            fontSize={size}
            fontWeight={fontWeight || '800'}
            fill={`url(#${id})`}
          >
            {children}
          </SvgText>
        </Svg>
      </View>
    );
  }

  // Fallback for non-string children
  return <View style={[styles.container, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
  },
});