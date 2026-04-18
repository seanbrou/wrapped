import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  PanResponder,
  StatusBar,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { colors } from '../../lib/theme';
import { api, WrappedCard } from '../../lib/api';
import { MOCK_WRAPPED } from '../../lib/mockData';
import { ProgressDots } from '../../components/ProgressDots';
import { HeroStatCard } from '../../components/HeroStatCard';
import { TopListCard } from '../../components/TopListCard';
import { InsightCard } from '../../components/InsightCard';
import { ChartCard } from '../../components/ChartCard';
import { CommunityCard } from '../../components/CommunityCard';
import { ComparisonCard } from '../../components/ComparisonCard';
import { ShareCard } from '../../components/ShareCard';
import { LoadingRing } from '../../components/LoadingRing';

const { height: SCREEN_H } = Dimensions.get('window');
const CARD_H = SCREEN_H;
const SWIPE_THRESHOLD = 80;

export default function WrappedPlayer() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [cards, setCards] = useState<WrappedCard[]>([]);
  const [insights, setInsights] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const translateY = useRef(new Animated.Value(0)).current;
  const autoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isVerticalDrag = useRef(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.getWrapped(id || 'mock-2025');
        setCards(data.cards);
        setInsights(data.insights);
      } catch {
        // Fall back to mock
        setCards(MOCK_WRAPPED.cards);
        setInsights(MOCK_WRAPPED.insights);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const goToCard = useCallback((index: number) => {
    if (index < 0 || index >= cards.length) {
      if (index >= cards.length) {
        router.replace('/wrapped/end');
      }
      return;
    }
    setCurrentIndex(index);
    Haptics.selectionAsync();
  }, [cards.length, router]);

  const resetAutoTimer = useCallback(() => {
    if (autoTimer.current) clearTimeout(autoTimer.current);
    if (!paused && cards.length > 0) {
      autoTimer.current = setTimeout(() => {
        goToCard(currentIndex + 1);
      }, 5000);
    }
  }, [paused, cards.length, currentIndex, goToCard]);

  useEffect(() => {
    resetAutoTimer();
    return () => {
      if (autoTimer.current) clearTimeout(autoTimer.current);
    };
  }, [currentIndex, paused]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => {
        isVerticalDrag.current = Math.abs(g.dy) > Math.abs(g.dx);
        return Math.abs(g.dy) > 10;
      },
      onPanResponderMove: (_, g) => {
        if (isVerticalDrag.current) {
          translateY.setValue(g.dy);
        }
      },
      onPanResponderRelease: (_, g) => {
        if (isVerticalDrag.current) {
          if (g.dy < -SWIPE_THRESHOLD) {
            // Swipe up → next card
            Animated.spring(translateY, {
              toValue: -CARD_H,
              friction: 8,
              tension: 60,
              useNativeDriver: true,
            }).start(() => {
              translateY.setValue(0);
              goToCard(currentIndex + 1);
            });
          } else if (g.dy > SWIPE_THRESHOLD && currentIndex > 0) {
            // Swipe down → prev card
            Animated.spring(translateY, {
              toValue: CARD_H,
              friction: 8,
              tension: 60,
              useNativeDriver: true,
            }).start(() => {
              translateY.setValue(0);
              goToCard(currentIndex - 1);
            });
          } else {
            Animated.spring(translateY, {
              toValue: 0,
              friction: 8,
              tension: 60,
              useNativeDriver: true,
            }).start();
          }
        }
      },
    })
  ).current;

  function handleLongPress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPaused(p => !p);
  }

  function handleTapLeft() {
    // Scrub effect - nothing for now, just log
  }

  function handleTapRight() {
    goToCard(currentIndex + 1);
  }

  function handleSkip() {
    router.replace('/wrapped/end');
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingRing />
        <Text style={styles.loadingText}>Creating your story...</Text>
      </View>
    );
  }

  if (cards.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>No cards to show</Text>
      </View>
    );
  }

  const card = cards[currentIndex];

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {/* Progress dots */}
      <View style={styles.progressWrap}>
        <ProgressDots total={cards.length} current={currentIndex} />
      </View>

      {/* Card content */}
      <Animated.View
        style={[
          styles.cardContainer,
          { transform: [{ translateY }] },
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableWithoutFeedback onLongPress={handleLongPress}>
          <View style={styles.cardInner}>
            <CardRenderer card={card} />
          </View>
        </TouchableWithoutFeedback>
      </Animated.View>

      {/* Paused overlay */}
      {paused && (
        <View style={styles.pausedOverlay}>
          <Text style={styles.pausedText}>Paused</Text>
          <TouchableOpacity onPress={handleLongPress}>
            <Text style={styles.tapToResume}>Tap to resume</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Bottom controls */}
      <View style={styles.bottomControls}>
        <TouchableOpacity onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
        <Text style={styles.counter}>{currentIndex + 1} / {cards.length}</Text>
        <TouchableOpacity onPress={handleTapRight}>
          <Text style={styles.skipText}>Next</Text>
        </TouchableOpacity>
      </View>

      {/* Swipe hint */}
      {currentIndex === 0 && (
        <View style={styles.swipeHint}>
          <Text style={styles.swipeHintText}>↑ Swipe up to start</Text>
        </View>
      )}
    </View>
  );
}

function CardRenderer({ card }: { card: WrappedCard }) {
  const d = card.data as Record<string, unknown>;

  switch (card.type) {
    case 'hero_stat':
      return (
        <HeroStatCard
          value={d.value as number | string}
          unit={d.unit as string}
          comparison={d.comparison as string | undefined}
          label={d.label as string | undefined}
          emoji={d.emoji as string | undefined}
        />
      );
    case 'top_list':
      return (
        <TopListCard
          title={card.title ?? ''}
          items={(d.items as Array<{ name: string; count: number }>).map((item, i) => ({
            ...item,
            rank: i + 1,
          }))}
        />
      );
    case 'insight':
      return (
        <InsightCard
          title={card.title ?? ''}
          text={d.text as string}
          chips={d.chips as string[] | undefined}
        />
      );
    case 'chart':
      return (
        <ChartCard
          title={card.title ?? ''}
          chartType={d.chartType as 'area' | 'bar' | 'donut'}
          data={d.data as number[]}
          labels={d.labels as string[]}
          unit={d.unit as string}
        />
      );
    case 'community':
      return (
        <CommunityCard
          percentile={d.percentile as number}
          metric={d.metric as string}
          value={d.value as string}
        />
      );
    case 'comparison':
      return (
        <ComparisonCard
          title={card.title ?? ''}
          labels={d.labels as string[]}
          values={d.values as number[]}
          unit={d.unit as string}
        />
      );
    case 'share':
      return (
        <ShareCard
          stat={d.stat as string}
          service={d.service as string}
        />
      );
    default:
      return (
        <View style={styles.defaultCard}>
          <Text style={styles.defaultCardText}>{card.title}</Text>
        </View>
      );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.secondary,
    fontSize: 15,
    marginTop: 16,
  },
  progressWrap: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  cardContainer: {
    height: CARD_H,
  },
  cardInner: {
    flex: 1,
    backgroundColor: colors.background,
  },
  defaultCard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultCardText: {
    color: colors.primary,
    fontSize: 24,
    fontWeight: '700',
  },
  pausedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,10,15,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  pausedText: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 12,
  },
  tapToResume: {
    fontSize: 16,
    color: colors.secondary,
  },
  bottomControls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  skipText: {
    fontSize: 15,
    color: colors.secondary,
    fontWeight: '500',
  },
  counter: {
    fontSize: 13,
    color: colors.muted,
    fontWeight: '500',
  },
  swipeHint: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  swipeHintText: {
    fontSize: 13,
    color: colors.muted,
  },
});
