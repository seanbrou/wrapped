import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Dimensions } from 'react-native';
import Svg, { Path, Line } from 'react-native-svg';
import { colors, type, space, motion, serviceById, type StoryAccent } from '../lib/theme';

const AnimatedPath = Animated.createAnimatedComponent(Path);

const { width: W } = Dimensions.get('window');

interface Props {
  title: string;
  chartType: 'area' | 'bar';
  data: number[];
  labels: string[];
  service: string;
  accent: StoryAccent;
}

export function ChartCard({ title, chartType, data, labels, service, accent }: Props) {
  const svc = serviceById[service];
  const header = useRef(new Animated.Value(0)).current;
  const chart = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(header, {
        toValue: 1,
        duration: 450,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(chart, {
        toValue: 1,
        duration: 1100,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start();
  }, []);

  const chartW = W - space.lg * 2;
  const chartH = 260;
  const max = Math.max(...data);
  const min = 0;

  if (chartType === 'bar') {
    const total = data.length;
    const gap = 8;
    const barW = (chartW - gap * (total - 1)) / total;
    return (
      <View style={styles.root}>
        <Animated.View
          style={[
            styles.header,
            {
              opacity: header,
              transform: [{ translateY: header.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
            },
          ]}
        >
          <Text style={[styles.eyebrow, { color: accent.fg }]}>
            {svc?.name ?? service}
          </Text>
          <Text style={[styles.title, { color: accent.fg }]}>{title}</Text>
        </Animated.View>

        <View style={[styles.chartBox, { height: chartH }]}>
          {data.map((v, i) => {
            const h = (v / max) * chartH;
            return (
              <Animated.View
                key={i}
                style={[
                  styles.bar,
                  {
                    width: barW,
                    height: chart.interpolate({ inputRange: [0, 1], outputRange: [0, h] }),
                    backgroundColor: accent.fg,
                    opacity: 0.9,
                  },
                ]}
              />
            );
          })}
        </View>
        <View style={[styles.labelsRow, { width: chartW }]}>
          {labels.map((l, i) => (
            <Text
              key={i}
              style={[styles.barLabel, { color: accent.fg, width: barW + gap }]}
              numberOfLines={1}
            >
              {l}
            </Text>
          ))}
        </View>
        <View style={styles.footer}>
          <Text style={[styles.footerStat, { color: accent.fg }]}>
            {max}
            <Text style={[styles.footerUnit, { color: accent.fg }]}>  peak</Text>
          </Text>
        </View>
      </View>
    );
  }

  // Area / line chart
  const padX = 2;
  const padY = 20;
  const innerW = chartW - padX * 2;
  const innerH = chartH - padY * 2;
  const points = data.map((v, i) => ({
    x: padX + (i / (data.length - 1)) * innerW,
    y: padY + (1 - (v - min) / (max - min)) * innerH,
  }));
  // Smooth curve via catmull-rom-ish cubic bezier
  function smoothPath() {
    if (points.length < 2) return '';
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i - 1] ?? points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] ?? p2;
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return d;
  }
  const linePath = smoothPath();
  const lineLength = innerW * 1.6;

  return (
    <View style={styles.root}>
      <Animated.View
        style={[
          styles.header,
          {
            opacity: header,
            transform: [{ translateY: header.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
          },
        ]}
      >
        <Text style={[styles.eyebrow, { color: accent.fg }]}>
          {svc?.name ?? service}
        </Text>
        <Text style={[styles.title, { color: accent.fg }]}>{title}</Text>
      </Animated.View>

      <View style={[styles.chartBoxLine, { width: chartW, height: chartH }]}>
        <Svg width={chartW} height={chartH}>
          <Line
            x1={0} x2={chartW} y1={chartH - padY} y2={chartH - padY}
            stroke={accent.fg} strokeWidth={0.5} opacity={0.25}
          />
          <AnimatedPath
            d={linePath}
            stroke={accent.fg}
            strokeWidth={3}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={lineLength}
            strokeDashoffset={chart.interpolate({
              inputRange: [0, 1],
              outputRange: [lineLength, 0],
            })}
          />
        </Svg>
      </View>

      <View style={[styles.labelsRow, { width: chartW }]}>
        {labels.map((l, i) => (
          <Text
            key={i}
            style={[styles.lineLabel, { color: accent.fg }]}
          >
            {l}
          </Text>
        ))}
      </View>

      <View style={styles.footer}>
        <Text style={[styles.footerStat, { color: accent.fg }]}>
          {max}
          <Text style={[styles.footerUnit, { color: accent.fg }]}>  peak</Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: space.lg,
    paddingTop: 110,
    paddingBottom: 80,
  },
  header: {
    marginBottom: space.xl,
  },
  eyebrow: {
    ...type.eyebrow,
    opacity: 0.7,
    marginBottom: space.sm,
  },
  title: {
    ...type.displaySmall,
  },
  chartBox: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginTop: space.xl,
  },
  chartBoxLine: {
    marginTop: space.xl,
  },
  bar: {
    borderRadius: 4,
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: space.md,
  },
  barLabel: {
    ...type.caption,
    opacity: 0.65,
    textAlign: 'center',
    fontSize: 10,
  },
  lineLabel: {
    ...type.caption,
    opacity: 0.55,
    fontSize: 10,
  },
  footer: {
    marginTop: 'auto',
    gap: space.sm,
  },
  footerStat: {
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: -2,
  },
  footerUnit: {
    ...type.eyebrow,
    fontSize: 11,
    fontWeight: '600',
    opacity: 0.65,
  },
});
