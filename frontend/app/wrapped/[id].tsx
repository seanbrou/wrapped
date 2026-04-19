import React, { useEffect, useRef, useState } from 'react';
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
import { MOCK_WRAPPED } from '../../lib/mockData';
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
  useLocalSearchParams<{ id: string }>();
  const cards = MOCK_WRAPPED.cards;

  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);

  // Segment progress (width of the current bar segment)
  const seg = useRef(new Animated.Value(0)).current;
  const segAnim = useRef<Animated.CompositeAnimation | null>(null);

  // Card cross-fade
  const bgFade = useRef(new Animated.Value(1)).current;
  const fgFade = useRef(new Animated.Value(1)).current;
  const fgY = useRef(new Animated.Value(0)).current;

  // Entrance
  const entry = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(entry, {
      toValue: 1,
      duration: 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  // Drive the segment progress for the active card.
  useEffect(() => {
    startSegment();
    return () => segAnim.current?.stop();
  }, [i, paused]);

  function startSegment() {
    segAnim.current?.stop();
    if (paused) return;
    // Resume from current value rather than snapping back.
    // @ts-ignore — private API exists across RN versions
    const current: number = (seg as any)._value ?? 0;
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

  function transitionTo(nextIndex: number, dir: 1 | -1) {
    if (nextIndex < 0) return;
    if (nextIndex >= cards.length) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push('/wrapped/end');
      return;
    }
    Haptics.selectionAsync();
    segAnim.current?.stop();

    Animated.parallel([
      Animated.timing(fgFade, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(fgY, { toValue: dir * -16, duration: 180, useNativeDriver: true }),
      Animated.timing(bgFade, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => {
      seg.setValue(0);
      setI(nextIndex);
      fgY.setValue(dir * 16);
      Animated.parallel([
        Animated.timing(bgFade, { toValue: 1, duration: 260, useNativeDriver: true }),
        Animated.timing(fgFade, {
          toValue: 1,
          duration: 320,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(fgY, { toValue: 0, ...motion.springSoft, useNativeDriver: true }),
      ]).start();
    });
  }

  function next() { transitionTo(i + 1, 1); }
  function prev() { transitionTo(i - 1, -1); }

  // Press-and-hold pauses. Short tap advances/rewinds based on side.
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function onPressIn(side: 'left' | 'right') {
    pressTimer.current = setTimeout(() => {
      setPaused(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, 180);
    // stash side on ref via closure
    (onPressIn as any)._side = side;
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

  // Vertical swipe: up → next, down → dismiss
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
  const Card = CARDS[card.type] ?? HeroStatCard;
  const accent = accentFor(i);

  return (
    <Animated.View
      style={[styles.screen, { opacity: entry }]}
      {...pan.panHandlers}
    >
      {/* Background wash (cross-fades between cards) */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: accent.bg, opacity: bgFade },
        ]}
      />

      {/* Card content */}
      <Animated.View
        style={[
          styles.stage,
          {
            opacity: fgFade,
            transform: [{ translateY: fgY }],
          },
        ]}
      >
        <Card
          {...card.data}
          service={card.service}
          accent={accent}
          storyIndex={i}
          total={cards.length}
        />
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

      {/* Chrome — explicit insets so bars + close sit below Dynamic Island / status bar */}
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
            <View key={idx} style={[styles.segTrack, { backgroundColor: accent.fg + '33' }]}>
              {idx < i && (
                <View style={[styles.segFill, { width: '100%', backgroundColor: accent.fg }]} />
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

        {/* Bottom: progress + how to navigate */}
        <View style={styles.bottomBar}>
          <View style={styles.bottomLeft}>
            <Text style={[styles.bottomLabel, { color: accent.fg, opacity: 0.75 }]}>
              {String(i + 1).padStart(2, '0')} / {String(cards.length).padStart(2, '0')}
            </Text>
            {paused && (
              <Text style={[styles.pausedLabel, { color: accent.fg }]}>Paused</Text>
            )}
          </View>
          <Text style={[styles.hint, { color: accent.fg }]}>
            Tap sides · Hold to pause · Swipe up next
          </Text>
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
  taps: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    zIndex: 5,
  },
  tapLeft: { flex: 1 },
  tapRight: { flex: 2 },

  // ─── Chrome ──────────────────────────────────────────────
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
    height: 2.5,
    borderRadius: 2,
    overflow: 'hidden',
  },
  segFill: {
    height: 2.5,
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
    gap: space.sm,
  },
  bottomLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  bottomLabel: {
    ...type.eyebrow,
    fontSize: 10,
    letterSpacing: 2.8,
  },
  pausedLabel: {
    ...type.eyebrow,
    fontSize: 10,
    letterSpacing: 2,
    opacity: 0.85,
  },
  hint: {
    ...type.caption,
    fontSize: 11,
    lineHeight: 15,
    opacity: 0.55,
    letterSpacing: 0,
  },
});
