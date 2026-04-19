import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { colors, type, space, motion, serviceById, type StoryAccent } from '../lib/theme';

interface Datum { label: string; value: string; }
interface Props {
  headline: string;
  supportingData: Datum[];
  service: string;
  accent: StoryAccent;
}

// Editorial pull-quote. Large display copy, hairline-rule stat footer.
export function InsightCard({ headline, supportingData, service, accent }: Props) {
  const svc = serviceById[service];
  const quote = useRef(new Animated.Value(0)).current;
  const quoteY = useRef(new Animated.Value(30)).current;
  const footer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(180),
      Animated.parallel([
        Animated.timing(quote, {
          toValue: 1,
          duration: 700,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(quoteY, { toValue: 0, ...motion.springSoft, useNativeDriver: true }),
      ]),
      Animated.delay(200),
      Animated.timing(footer, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={styles.root}>
      <View style={styles.top}>
        <Text style={[styles.eyebrow, { color: accent.fg }]}>
          {svc?.name ?? service} · insight
        </Text>
      </View>

      <View style={styles.center}>
        <Animated.View
          style={{
            opacity: quote,
            transform: [{ translateY: quoteY }],
          }}
        >
          <Text style={[styles.openQuote, { color: accent.fg }]}>“</Text>
          <Text style={[styles.headline, { color: accent.fg }]}>
            {headline}.
          </Text>
        </Animated.View>
      </View>

      <Animated.View style={[styles.footer, { opacity: footer }]}>
        <View style={[styles.rule, { backgroundColor: accent.fg + '55' }]} />
        <View style={styles.stats}>
          {supportingData.map((d, i) => (
            <View key={i} style={styles.stat}>
              <Text style={[styles.statValue, { color: accent.fg }]}>{d.value}</Text>
              <Text style={[styles.statLabel, { color: accent.fg }]}>{d.label}</Text>
            </View>
          ))}
        </View>
      </Animated.View>
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
  top: {
    marginBottom: space.xl,
  },
  eyebrow: {
    ...type.eyebrow,
    opacity: 0.7,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
  },
  openQuote: {
    fontSize: 140,
    fontWeight: '800',
    lineHeight: 158,
    marginBottom: space.md,
    opacity: 0.85,
    marginLeft: -8,
    includeFontPadding: false,
    paddingTop: 4,
  },
  headline: {
    fontSize: 40,
    lineHeight: 48,
    fontWeight: '700',
    letterSpacing: -1,
    includeFontPadding: false,
  },
  footer: {
    gap: space.lg,
  },
  rule: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
  },
  stats: {
    flexDirection: 'row',
    gap: space.xl,
  },
  stat: {
    gap: 4,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -1,
  },
  statLabel: {
    ...type.eyebrow,
    opacity: 0.65,
  },
});
