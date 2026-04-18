import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import Svg, { Path, Line, Text as SvgText, Rect, Defs, LinearGradient, Stop } from 'react-native-svg';
import { colors } from '../lib/theme';

interface Props {
  chartType: 'area' | 'bar' | 'donut';
  data: number[];
  labels: string[];
  unit: string;
  title?: string;
}

const W = Dimensions.get('window').width - 48;
const H = 200;
const PAD = { top: 20, right: 16, bottom: 36, left: 16 };

export function ChartCard({ chartType, data, labels, unit, title }: Props) {
  const animProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animProgress, {
      toValue: 1,
      duration: 1200,
      useNativeDriver: false,
    }).start();
  }, []);

  const maxVal = Math.max(...data, 1);
  const minVal = Math.min(...data);
  const range = maxVal - minVal || 1;
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const innerW = chartW / Math.max(data.length - 1, 1);

  // Build SVG path for area chart
  const points = data.map((v, i) => ({
    x: PAD.left + i * innerW,
    y: PAD.top + chartH - ((v - minVal) / range) * chartH,
  }));

  const areaPath = [
    `M ${points[0].x} ${PAD.top + chartH}`,
    ...points.map(p => `L ${p.x} ${p.y}`),
    `L ${points[points.length - 1].x} ${PAD.top + chartH}`,
    'Z',
  ].join(' ');

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  const animatedOpacity = animProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <View style={styles.container}>
      {title && <Text style={styles.title}>{title}</Text>}
      <Svg width={W} height={H}>
        <Defs>
          <LinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#6C5CE7" stopOpacity="0.4" />
            <Stop offset="100%" stopColor="#6C5CE7" stopOpacity="0.02" />
          </LinearGradient>
          <LinearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#6C5CE7" />
            <Stop offset="100%" stopColor="#00D4FF" />
          </LinearGradient>
        </Defs>

        {chartType === 'area' && (
          <>
            <Path d={areaPath} fill="url(#areaGrad)" />
            <Path
              d={linePath}
              stroke="#6C5CE7"
              strokeWidth={2.5}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        )}

        {chartType === 'bar' && data.map((v, i) => {
          const barH = ((v - minVal) / range) * chartH * 0.8;
          const x = PAD.left + i * innerW + innerW * 0.15;
          const barW = innerW * 0.7;
          const y = PAD.top + chartH - barH;
          return (
            <Rect
              key={i}
              x={x}
              y={y}
              width={barW}
              height={barH}
              rx={4}
              fill="url(#barGrad)"
              opacity={0.8 + 0.2 * (i / data.length)}
            />
          );
        })}

        {/* X-axis labels */}
        {labels.map((label, i) => (
          <SvgText
            key={i}
            x={PAD.left + i * innerW}
            y={H - 8}
            fontSize={10}
            fill={colors.secondary}
            textAnchor="middle"
          >
            {label}
          </SvgText>
        ))}
      </Svg>
      <Text style={styles.unit}>{unit}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 16,
    textAlign: 'center',
  },
  unit: {
    fontSize: 12,
    color: colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 8,
  },
});
