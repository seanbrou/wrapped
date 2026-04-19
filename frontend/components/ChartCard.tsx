import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import Svg, { Line, Path, Circle, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { colors, typography, spacing, radii } from '../lib/theme';

interface Props {
  title: string;
  chartType: 'area' | 'bar';
  data: number[];
  labels: string[];
  service: string;
}

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const CHART_W = SCREEN_W - 64;
const CHART_H = 200;

export function ChartCard({ title, chartType, data, labels, service }: Props) {
  const pathAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(pathAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  const maxVal = Math.max(...data);
  const minVal = Math.min(...data);

  return (
    <View style={styles.container}>
      <View style={styles.serviceBadge}>
        <Text style={styles.serviceText}>{service.replace('_', ' ')}</Text>
      </View>

      <Animated.View style={{ opacity: opacityAnim }}>
        <Text style={styles.title}>{title}</Text>
      </Animated.View>

      {chartType === 'area' ? (
        <AreaChart data={data} labels={labels} pathProgress={pathAnim} />
      ) : (
        <BarChart data={data} labels={labels} progress={pathAnim} />
      )}
    </View>
  );
}

function AreaChart({ data, labels, pathProgress }: { data: number[]; labels: string[]; pathProgress: Animated.Value }) {
  const maxVal = Math.max(...data);
  const points = data.map((d, i) => ({
    x: (i / (data.length - 1)) * CHART_W,
    y: CHART_H - (d / maxVal) * (CHART_H - 20) - 10,
  }));

  // Smooth bezier path
  let pathStr = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpx1 = prev.x + (curr.x - prev.x) / 3;
    const cpx2 = prev.x + 2 * (curr.x - prev.x) / 3;
    pathStr += ` C ${cpx1} ${prev.y}, ${cpx2} ${curr.y}, ${curr.x} ${curr.y}`;
  }

  // Fill path (area under curve)
  const fillPath = `${pathStr} L ${points[points.length - 1].x} ${CHART_H} L ${points[0].x} ${CHART_H} Z`;

  return (
    <View style={styles.chartContainer}>
      <Svg width={CHART_W} height={CHART_H}>
        <Defs>
          <LinearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#E040FB" stopOpacity="0.3" />
            <Stop offset="100%" stopColor="#7C4DFF" stopOpacity="0.02" />
          </LinearGradient>
          <LinearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor="#7C4DFF" />
            <Stop offset="50%" stopColor="#E040FB" />
            <Stop offset="100%" stopColor="#00F5FF" />
          </LinearGradient>
        </Defs>
        <Path d={fillPath} fill="url(#areaFill)" />
        <Path d={pathStr} stroke="url(#lineGrad)" strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {/* Data points */}
        {points.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={4} fill={colors.accentFuchsia} stroke={colors.primary} strokeWidth={2} />
        ))}
      </Svg>
      {/* Labels */}
      <View style={styles.labelRow}>
        {labels.map((l, i) => (
          <Text key={i} style={styles.chartLabel}>{l}</Text>
        ))}
      </View>
    </View>
  );
}

function BarChart({ data, labels, progress }: { data: number[]; labels: string[]; progress: Animated.Value }) {
  const maxVal = Math.max(...data);
  const colors_arr = ['#7C4DFF', '#E040FB', '#00F5FF', '#FFD700'];

  return (
    <View style={styles.barContainer}>
      {data.map((d, i) => {
        const barHeight = maxVal > 0 ? (d / maxVal) * 140 : 0;
        return (
          <View key={i} style={styles.barItem}>
            <Text style={styles.barValue}>{d.toLocaleString()}</Text>
            <View style={styles.barTrack}>
              <Animated.View style={[
                styles.barFill,
                {
                  backgroundColor: colors_arr[i % colors_arr.length],
                  height: barHeight,
                },
              ]} />
            </View>
            <Text style={styles.barLabel}>{labels[i]}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.background,
  },
  serviceBadge: {
    position: 'absolute',
    top: 100,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    backgroundColor: colors.glassFill,
    borderWidth: 1,
    borderColor: colors.glassStroke,
  },
  serviceText: {
    ...typography.captionUppercase,
    color: colors.secondary,
    letterSpacing: 2,
  },
  title: {
    ...typography.h3,
    color: colors.primary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  chartContainer: {
    alignItems: 'center',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: CHART_W,
    marginTop: spacing.sm,
  },
  chartLabel: {
    ...typography.caption,
    color: colors.tertiary,
    fontSize: 10,
  },
  barContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    width: '100%',
    paddingHorizontal: spacing.md,
    height: 200,
  },
  barItem: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.xs,
  },
  barValue: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
  },
  barTrack: {
    width: 28,
    height: 140,
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  barFill: {
    width: '100%',
    borderRadius: radii.sm,
  },
  barLabel: {
    ...typography.caption,
    color: colors.secondary,
    fontSize: 10,
  },
});