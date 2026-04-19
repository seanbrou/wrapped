import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableWithoutFeedback,
  PanResponder,
  Animated,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { colors, typography, spacing, radii, motion } from '../../lib/theme';
import { MOCK_WRAPPED } from '../../lib/mockData';
import {
  HeroStatCard,
  TopListCard,
  InsightCard,
  ChartCard,
  CommunityCard,
  ComparisonCard,
  ShareCard,
  ProgressDots,
} from '../../components';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const SWIPE_THRESHOLD = 50;
const AUTO_ADVANCE_MS = 7000;

const CARD_COMPONENTS: Record<string, React.ComponentType<any>> = {
  hero_stat: HeroStatCard,
  top_list: TopListCard,
  insight: InsightCard,
  chart: ChartCard,
  community: CommunityCard,
  comparison: ComparisonCard,
  share: ShareCard,
};

export default function WrappedPlayer() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [currentCard, setCurrentCard] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Animation values
  const cardOpacity = useRef(new Animated.Value(1)).current;
  const cardScale = useRef(new Animated.Value(1)).current;
  const cardTranslateY = useRef(new Animated.Value(0)).current;
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Entrance animation
  const entranceOpacity = useRef(new Animated.Value(0)).current;
  const entranceScale = useRef(new Animated.Value(0.95)).current;

  const cards = MOCK_WRAPPED.cards;

  useEffect(() => {
    // Initial entrance
    Animated.parallel([
      Animated.timing(entranceOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(entranceScale, { toValue: 1, ...motion.springGentle, useNativeDriver: true }),
    ]).start();
  }, []);

  function resetAutoAdvance() {
    if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    autoAdvanceTimer.current = setTimeout(() => {
      advanceCard(1);
    }, AUTO_ADVANCE_MS);
  }

  function advanceCard(direction: 1 | -1) {
    if (isTransitioning) return;

    const nextIndex = currentCard + direction;
    if (nextIndex < 0) return;
    if (nextIndex >= cards.length) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push('/wrapped/end');
      return;
    }

    setIsTransitioning(true);
    Haptics.selectionAsync();

    // Exit animation
    Animated.parallel([
      Animated.timing(cardOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(cardScale, { toValue: 0.92, duration: 180, useNativeDriver: true }),
      Animated.timing(cardTranslateY, {
        toValue: direction > 0 ? -50 : 50,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrentCard(nextIndex);

      // Reset positions
      cardOpacity.setValue(0);
      cardScale.setValue(0.95);
      cardTranslateY.setValue(direction > 0 ? 50 : -50);

      // Enter animation
      Animated.parallel([
        Animated.spring(cardOpacity, { toValue: 1, damping: 18, stiffness: 100, useNativeDriver: true }),
        Animated.spring(cardScale, { toValue: 1, ...motion.spring, useNativeDriver: true }),
        Animated.spring(cardTranslateY, { toValue: 0, ...motion.spring, useNativeDriver: true }),
      ]).start(() => {
        setIsTransitioning(false);
      });
    });

    resetAutoAdvance();
  }

  // Swipe handler
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 20,
      onPanResponderEnd: (_, gs) => {
        if (gs.dy < -SWIPE_THRESHOLD) advanceCard(1);
        else if (gs.dy > SWIPE_THRESHOLD) advanceCard(-1);
      },
    })
  ).current;

  function handleTap(side: 'left' | 'right') {
    if (side === 'right') advanceCard(1);
    else advanceCard(-1);
  }

  useEffect(() => {
    resetAutoAdvance();
    return () => {
      if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    };
  }, [currentCard]);

  const card = cards[currentCard];
  const CardComponent = CARD_COMPONENTS[card?.type] || HeroStatCard;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: entranceOpacity,
          transform: [{ scale: entranceScale }],
        },
      ]}
      {...panResponder.panHandlers}
    >
      {/* Progress bar (Instagram Stories style) */}
      <View style={styles.progressContainer}>
        <ProgressDots total={cards.length} current={currentCard} />
      </View>

      {/* Tap zones */}
      <View style={styles.tapContainer}>
        <TouchableWithoutFeedback onPress={() => handleTap('left')}>
          <View style={styles.tapLeft} />
        </TouchableWithoutFeedback>
        <TouchableWithoutFeedback onPress={() => handleTap('right')}>
          <View style={styles.tapRight} />
        </TouchableWithoutFeedback>
      </View>

      {/* Card */}
      <Animated.View
        style={[
          styles.cardContainer,
          {
            opacity: cardOpacity,
            transform: [
              { scale: cardScale },
              { translateY: cardTranslateY },
            ],
          },
        ]}
      >
        <CardComponent {...card.data} service={card.service} />
      </Animated.View>

      {/* Card counter */}
      <View style={styles.counter}>
        <Text style={styles.counterText}>
          {currentCard + 1} / {cards.length}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  progressContainer: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  tapContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    zIndex: 5,
  },
  tapLeft: {
    flex: 1,
  },
  tapRight: {
    flex: 2,
  },
  cardContainer: {
    flex: 1,
  },
  counter: {
    position: 'absolute',
    bottom: 44,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  counterText: {
    ...typography.caption,
    color: colors.muted,
    letterSpacing: 3,
  },
});