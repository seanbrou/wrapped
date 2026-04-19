import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import Svg, { Path, Defs, LinearGradient as SvgGradient, Stop, Rect, Line } from 'react-native-svg';
import { colors, typography, spacing, radii, motion, serviceColors } from '../lib/theme';

const { width: W, height: H } = Dimensions.get('window');
const AnimatedPath = Animated.createAnimatedComponent(Path);

const CHART_W = W - spacing.xl * 2;
const CHART_H = 180;
const CHART_PAD = 4;

interface Props {
  title: string;
  chartType: 'area' | 'bar';
  data: number[];
  labels: string[];
  service: string;
}

function buildAreaPath(data: number[], w: number, h: number): string {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const stepX = w / (data.length - 1);

  const points = data.map((v, i) => ({
    x: i * stepX,
    y: h - ((v - min) / range) * (h - CHART_PAD * 2) - CHART_PAD,
  }));

  // Smooth curve
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpx = (prev.x + curr.x) / 2;
    d += ` C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`;
  }

  // Close path for fill
  const fillPath = d + ` L ${points[points.length - 1].x} ${h} L ${points[0].x} ${h} Z`;
  return fillPath;
}

function buildLinePath(data: number[], w: number, h: number): string {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const stepX = w / (data.length - 1);

  const points = data.map((v, i) => ({
    x: i * stepX,
    y: h - ((v - min) / range) * (h - CHART_PAD * 2) - CHART_PAD,
  }));

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpx = (prev.x + curr.x) / 2;
    d += ` C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`;
  }
  return d;
}

export function ChartCard({ title, chartType, data, labels, service }: Props) {
  const svc = serviceColors[service] || { primary: colors.accentFuchsia, gradient: [colors.accentPurple, colors.accentFuchsia] as const, bg: 'rgba(224,64,251,0.1)' };

  const titleOpacity = useRef(new Animated.Value(0)).current;
  const chartOpacity = useRef(new Animated.Value(0)).current;
  const chartScale = useRef(new Animated.Value(0.95)).current;
  const barAnims = useRef(data.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(150),
      Animated.timing(titleOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(chartOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(chartScale, { toValue: 1, ...motion.springGentle, useNativeDriver: true }),
      ]),
      ...(chartType === 'bar'
        ? [Animated.stagger(80, barAnims.map(a =>
            Animated.spring(a, { toValue: 1, ...motion.spring, useNativeDriver: false })
          ))]
        : []),
    ]).start();
  }, []);

  const max = Math.max(...data);

  return (
    <View style={styles.container}>
      <View style={[styles.bgGlow, { backgroundColor: svc.primary }]} />

      <View style={styles.content}>
        {/* Service badge */}
        <View style={[styles.serviceBadge, { backgroundColor: svc.bg }]}>
          <View style={[styles.serviceDot, { backgroundColor: svc.primary }]} />
          <Text style={[styles.serviceLabel, { color: svc.primary }]}>
            {service.replace('_', ' ').toUpperCase()}
          </Text>
        </View>

        {/* Title */}
        <Animated.Text style={[styles.title, { opacity: titleOpacity }]}>
          {title}
        </Animated.Text>

        {/* Chart */}
        <Animated.View
          style={[
            styles.chartContainer,
            {
              opacity: chartOpacity,
              transform: [{ scale: chartScale }],
            },
          ]}
        >
          {chartType === 'area' ? (
            <View>
              <Svg width={CHART_W} height={CHART_H}>
                <Defs>
                  <SvgGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor={svc.primary} stopOpacity="0.3" />
                    <Stop offset="1" stopColor={svc.primary} stopOpacity="0.02" />
                  </SvgGradient>
                  <SvgGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                    <Stop offset="0" stopColor={svc.gradient[0]} stopOpacity="1" />
                    <Stop offset="1" stopColor={svc.gradient[1]} stopOpacity="1" />
                  </SvgGradient>
                </Defs>
                {/* Grid lines */}
                {[0.25, 0.5, 0.75].map(pct => (
                  <Line
                    key={pct}
                    x1={0}
                    y1={CHART_H * pct}
                    x2={CHART_W}
                    y2={CHART_H * pct}
                    stroke={colors.border}
                    strokeWidth={0.5}
                    strokeDasharray="4,4"
                  />
                ))}
                {/* Fill */}
                <Path d={buildAreaPath(data, CHART_W, CHART_H)} fill="url(#areaFill)" />
                {/* Line */}
                <Path
                  d={buildLinePath(data, CHART_W, CHART_H)}
                  fill="none"
                  stroke="url(#lineGrad)"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                />
              </Svg>

              {/* Labels */}
              <View style={styles.labelsRow}>
                {labels.map((label, i) => (
                  <Text key={i} style={styles.labelText}>{label}</Text>
                ))}
              </View>
            </View>
          ) : (
            /* Bar chart */
            <View>
              <View style={styles.barContainer}>
                {data.map((v, i) => {
                  const pct = v / max;
                  return (
                    <View key={i} style={styles.barCol}>
                      <View style={styles.barTrack}>
                        <Animated.View
                          style={[
                            styles.barFill,
                            {
                              backgroundColor: svc.primary,
                              height: barAnims[i].interpolate({
                                inputRange: [0, 1],
                                outputRange: ['0%', `${pct * 100}%`],
                              }),
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.barValue}>{v}</Text>
                      <Text style={styles.barLabel} numberOfLines={1}>{labels[i]}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  bgGlow: {
    position: 'absolute',
    width: W * 1.3,
    height: W * 1.3,
    borderRadius: W,
    opacity: 0.04,
    top: -W * 0.4,
    left: -W * 0.2,
  },
  content: {
    paddingHorizontal: spacing.xl,
  },
  serviceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radii.full,
    gap: 6,
    marginBottom: spacing.lg,
  },
  serviceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  serviceLabel: {
    ...typography.overline,
    fontSize: 10,
  },
  title: {
    ...typography.h1,
    color: colors.primary,
    marginBottom: spacing.xl,
  },
  chartContainer: {
    backgroundColor: colors.glassFill,
    borderRadius: radii.xxl,
    borderWidth: 1,
    borderColor: colors.glassStroke,
    padding: spacing.lg,
    overflow: 'hidden',
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingHorizontal: 2,
  },
  labelText: {
    ...typography.caption,
    color: colors.tertiary,
    fontSize: 11,
  },

  // Bar chart
  barContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 160,
    gap: 8,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
  },
  barTrack: {
    width: '100%',
    height: 120,
    borderRadius: radii.sm,
    backgroundColor: colors.glassFill2,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: radii.sm,
    opacity: 0.8,
  },
  barValue: {
    ...typography.captionBold,
    color: colors.secondary,
    marginTop: 6,
  },
  barLabel: {
    ...typography.caption,
    color: colors.tertiary,
    fontSize: 9,
    marginTop: 2,
    textAlign: 'center',
  },
});