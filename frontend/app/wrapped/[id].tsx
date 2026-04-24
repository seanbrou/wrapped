import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Pressable,
  Animated,
  Easing,
  PanResponder,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { colors, type, space, motion, accentFor } from '../../lib/theme';
import { api } from '../../lib/api';
import {
  HeroStatCard,
  TopListCard,
  InsightCard,
  ChartCard,
  CommunityCard,
  ComparisonCard,
  ShareCard,
} from '../../components';

const { width: W, height: H } = Dimensions.get('window');
const SEGMENT_MS = 6500;
const SWIPE = 50;

const CARDS: Record<string, React.ComponentType<any>> = {
  hero_stat: HeroStatCard,
  top_list: TopListCard,
  insight: InsightCard,
  chart: ChartCard,
  community: CommunityCard,
  comparison: ComparisonCard,
  share: ShareCard,
};

export default function Player() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string }>();
  const [cards, setCards] = useState<Array<{ type: string; service: string; data: Record<string, unknown> }>>([]);
  const captureTargetRef = useRef<any>(null);

  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);

  // Segment progress
  const seg = useRef(new Animated.Value(0)).current;
  const segAnim = useRef<Animated.CompositeAnimation | null>(null);

  // Card transitions — slide + scale + fade
  const cardTranslateX = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(1)).current;
  const cardOpacity = useRef(new Animated.Value(1)).current;
  const cardRotate = useRef(new Animated.Value(0)).current;

  // Background gradient animation
  const bgHueShift = useRef(new Animated.Value(0)).current;
  const bgPulse = useRef(new Animated.Value(1)).current;

  // Pause overlay
  const pauseScale = useRef(new Animated.Value(0)).current;
  const pauseOpacity = useRef(new Animated.Value(0)).current;
  const pausePulse = useRef(new Animated.Value(1)).current;

  // Entrance
  const entry = useRef(new Animated.Value(0)).current;

  // Dot seeker
  const [dotsLayout, setDotsLayout] = useState({ width: 0, x: 0 });

  useEffect(() => {
    Animated.timing(entry, {
      toValue: 1,
      duration: 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  // Background ambient animation
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bgHueShift, {
          toValue: 1,
          duration: 8000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(bgHueShift, {
          toValue: 0,
          duration: 8000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(bgPulse, {
          toValue: 1.03,
          duration: 4000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(bgPulse, {
          toValue: 1,
          duration: 4000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    if (typeof params.id !== 'string') return;
    if (params.id === 'demo') {
      // Demo mode: use mock data directly without backend
      const { MOCK_WRAPPED } = require('../../lib/mockData');
      setCards(MOCK_WRAPPED.cards);
      return;
    }
    api.getWrapped(params.id)
      .then((session) => {
        setCards(session.cards);
      })
      .catch(() => {
        router.back();
      });
  }, [params.id, router]);

  useEffect(() => {
    if (cards.length === 0) return;
    startSegment();
    return () => segAnim.current?.stop();
  }, [i, paused]);

  // Pause overlay animation
  useEffect(() => {
    if (paused) {
      Animated.parallel([
        Animated.spring(pauseScale, { toValue: 1, friction: 6, tension: 120, useNativeDriver: true }),
        Animated.timing(pauseOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();

      // Start pulsing
      Animated.loop(
        Animated.sequence([
          Animated.timing(pausePulse, { toValue: 1.15, duration: 800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(pausePulse, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      ).start();
    } else {
      Animated.parallel([
        Animated.timing(pauseScale, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(pauseOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
      pausePulse.setValue(1);
    }
  }, [paused]);

  function startSegment() {
    segAnim.current?.stop();
    if (paused) return;
    const current: number = (seg as any).__getValue?.() ?? (seg as any)._value ?? 0;
    const remaining = Math.max(0, SEGMENT_MS * (1 - current));
    segAnim.current = Animated.timing(seg, {
      toValue: 1,
      duration: remaining,
      easing: Easing.linear,
      useNativeDriver: false,
    });
    segAnim.current.start(({ finished }) => {
      if (finished) next();
    });
  }

  const transitionTo = useCallback((nextIndex: number, dir: 1 | -1) => {
    if (nextIndex < 0) return;
    if (nextIndex >= cards.length) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (typeof params.id === 'string') {
        router.push({ pathname: '/wrapped/end', params: { id: params.id } });
      } else {
        router.push('/wrapped/end');
      }
      return;
    }
    Haptics.selectionAsync();
    segAnim.current?.stop();

    // Exit current card
    Animated.parallel([
      Animated.timing(cardOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(cardTranslateX, { toValue: dir * -W * 0.3, duration: 280, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      Animated.timing(cardScale, { toValue: 0.92, duration: 280, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      Animated.timing(cardRotate, { toValue: dir * -2, duration: 280, useNativeDriver: true }),
    ]).start(() => {
      seg.setValue(0);
      setI(nextIndex);

      // Reset and enter new card
      cardTranslateX.setValue(dir * W * 0.3);
      cardScale.setValue(0.92);
      cardRotate.setValue(dir * 2);

      Animated.parallel([
        Animated.timing(cardOpacity, { toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.spring(cardTranslateX, { toValue: 0, friction: 8, tension: 80, useNativeDriver: true }),
        Animated.spring(cardScale, { toValue: 1, friction: 8, tension: 80, useNativeDriver: true }),
        Animated.spring(cardRotate, { toValue: 0, friction: 8, tension: 80, useNativeDriver: true }),
      ]).start();
    });
  }, [cards.length, params.id, router, seg, cardOpacity, cardTranslateX, cardScale, cardRotate]);

  function next() { transitionTo(i + 1, 1); }
  function prev() { transitionTo(i - 1, -1); }

  function jumpTo(index: number) {
    if (index === i || index < 0 || index >= cards.length) return;
    const dir = index > i ? 1 : -1;
    transitionTo(index, dir);
  }

  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function onPressIn(side: 'left' | 'right') {
    pressTimer.current = setTimeout(() => {
      setPaused(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, 180);
  }
  function onPressOut(side: 'left' | 'right') {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    if (paused) {
      setPaused(false);
      return;
    }
    if (side === 'right') next();
    else prev();
  }

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 16,
      onPanResponderRelease: (_, g) => {
        if (g.dy < -SWIPE) next();
        else if (g.dy > SWIPE * 2) router.back();
        else if (g.dy > SWIPE) prev();
      },
    })
  ).current;

  const card = cards[i];
  if (!card) {
    return <View style={styles.screen} />;
  }

  const Card = CARDS[card.type] ?? HeroStatCard;
  const accent = accentFor(i);

  // Compute gradient colors based on accent
  const gradientColors = [
    accent.bg,
    accent.bg,
    accent.fg + '08',
  ];

  return (
    <Animated.View
      ref={captureTargetRef}
      style={[styles.screen, { opacity: entry }]}
      {...pan.panHandlers}
    >
      {/* Animated background with subtle gradient shift */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: accent.bg,
            opacity: 1,
            transform: [{ scale: bgPulse }],
          },
        ]}
      />
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          styles.gradientOverlay,
          {
            backgroundColor: accent.fg,
            opacity: bgHueShift.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0, 0.04, 0],
            }),
          },
        ]}
      />

      {/* Card content */}
      <Animated.View
        style={[
          styles.stage,
          {
            opacity: cardOpacity,
            transform: [
              { translateX: cardTranslateX },
              { scale: cardScale },
              { rotate: cardRotate.interpolate({ inputRange: [-10, 10], outputRange: ['-10deg', '10deg'] }) },
            ],
          },
        ]}
      >
        <Card
          {...card.data}
          service={card.service}
          accent={accent}
          storyIndex={i}
          total={cards.length}
          onShare={card.type === 'share' && typeof params.id === 'string'
            ? () => api.shareWrapped(params.id as string, captureTargetRef)
            : undefined}
        />
      </Animated.View>

      {/* Pause overlay */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.pauseOverlay,
          {
            opacity: pauseOpacity,
            transform: [{ scale: pauseScale }, { scale: pausePulse }],
          },
        ]}
      >
        <View style={[styles.pauseCircle, { borderColor: accent.fg }]}>
          <View style={[styles.pauseBar, { backgroundColor: accent.fg }]} />
          <View style={[styles.pauseBar, { backgroundColor: accent.fg }]} />
        </View>
      </Animated.View>

      {/* Tap zones */}
      <View style={styles.taps} pointerEvents="box-none">
        <Pressable
          style={styles.tapLeft}
          onPressIn={() => onPressIn('left')}
          onPressOut={() => onPressOut('left')}
        />
        <Pressable
          style={styles.tapRight}
          onPressIn={() => onPressIn('right')}
          onPressOut={() => onPressOut('right')}
        />
      </View>

      {/* Chrome */}
      <View
        pointerEvents="box-none"
        style={[
          styles.chrome,
          {
            paddingTop: insets.top + 4,
            paddingBottom: Math.max(insets.bottom, space.sm),
          },
        ]}
      >
        {/* Progress bars */}
        <View style={styles.progressRow}>
          {cards.map((_, idx) => (
            <View key={idx} style={[styles.segTrack, { backgroundColor: accent.fg + '25' }]}>
              {idx < i && (
                <Animated.View style={[styles.segFill, { width: '100%', backgroundColor: accent.fg }]} />
              )}
              {idx === i && (
                <Animated.View
                  style={[
                    styles.segFill,
                    {
                      backgroundColor: accent.fg,
                      width: seg.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%'],
                      }),
                      shadowColor: accent.fg,
                      shadowOffset: { width: 0, height: 0 },
                      shadowRadius: 4,
                      shadowOpacity: 0.4,
                    },
                  ]}
                />
              )}
            </View>
          ))}
        </View>

        {/* Top bar */}
        <View style={styles.topBar}>
          <Text style={[styles.wordmark, { color: accent.fg }]}>wrapped.</Text>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              router.back();
            }}
            hitSlop={16}
            style={styles.closeBtn}
          >
            <View style={[styles.closeLine1, { backgroundColor: accent.fg }]} />
            <View style={[styles.closeLine2, { backgroundColor: accent.fg }]} />
          </Pressable>
        </View>

        <View style={{ flex: 1 }} />

        {/* Bottom: dot seeker + progress + how to navigate */}
        <View style={styles.bottomBar}>
          {/* Dot seeker */}
          <View
            style={styles.dotsRow}
            onLayout={(e) => {
              const { width, x } = e.nativeEvent.layout;
              setDotsLayout({ width, x });
            }}
          >
            {cards.map((_, idx) => (
              <Pressable
                key={idx}
                onPress={() => jumpTo(idx)}
                hitSlop={8}
                style={styles.dotHitArea}
              >
                <View
                  style={[
                    styles.dot,
                    {
                      backgroundColor: accent.fg,
                      opacity: idx === i ? 1 : idx < i ? 0.6 : 0.25,
                      transform: [{ scale: idx === i ? 1.4 : 1 }],
                    },
                  ]}
                />
              </Pressable>
            ))}
          </View>

          <View style={styles.bottomMeta}>
            <View style={styles.bottomLeft}>
              <Text style={[styles.bottomLabel, { color: accent.fg, opacity: 0.75 }]}>
                {String(i + 1).padStart(2, '0')} / {String(cards.length).padStart(2, '0')}
              </Text>
              {paused && (
                <View style={styles.pausedBadge}>
                  <Text style={[styles.pausedLabel, { color: accent.bg }]}>PAUSED</Text>
                </View>
              )}
            </View>
            <Text style={[styles.hint, { color: accent.fg }]}>
              Tap sides · Hold to pause · Swipe up next
            </Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  stage: {
    ...StyleSheet.absoluteFillObject,
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  taps: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    zIndex: 5,
  },
  tapLeft: { flex: 1 },
  tapRight: { flex: 2 },

  // Pause overlay
  pauseOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 15,
    backgroundColor: '#00000033',
  },
  pauseCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  pauseBar: {
    width: 5,
    height: 24,
    borderRadius: 2,
  },

  // Chrome
  chrome: {
    ...StyleSheet.absoluteFillObject,
    paddingHorizontal: space.md,
    zIndex: 20,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 4,
  },
  segTrack: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
  },
  segFill: {
    height: 3,
    borderRadius: 2,
  },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: space.sm,
    paddingHorizontal: space.sm,
  },
  wordmark: {
    ...type.bodyMedium,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeLine1: {
    position: 'absolute',
    width: 18,
    height: 1.5,
    transform: [{ rotate: '45deg' }],
  },
  closeLine2: {
    position: 'absolute',
    width: 18,
    height: 1.5,
    transform: [{ rotate: '-45deg' }],
  },

  bottomBar: {
    paddingHorizontal: space.sm,
    paddingBottom: space.sm,
    gap: space.md,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  dotHitArea: {
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  bottomMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bottomLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  bottomLabel: {
    ...type.eyebrow,
    fontSize: 10,
    letterSpacing: 2.8,
  },
  pausedBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pausedLabel: {
    ...type.eyebrow,
    fontSize: 9,
    letterSpacing: 1.5,
    fontWeight: '700',
  },
  hint: {
    ...type.caption,
    fontSize: 11,
    lineHeight: 15,
    opacity: 0.55,
    letterSpacing: 0,
  },
});
