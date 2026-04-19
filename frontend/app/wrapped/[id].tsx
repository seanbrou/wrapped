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
import { colors, typography, spacing, radii, animation } from '../../lib/theme';
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
import { ProgressDots } from '../../components/ProgressDots';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const SWIPE_THRESHOLD = 50;
const AUTO_ADVANCE_MS = 7000;

// Map card type to component
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
  const [cardHeight, setCardHeight] = useState(SCREEN_H);

  // Animation values
  const cardOpacity = useRef(new Animated.Value(1)).current;
  const cardScale = useRef(new Animated.Value(1)).current;
  const cardTranslateY = useRef(new Animated.Value(0)).current;
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const interactionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cards = MOCK_WRAPPED.cards; // Always use mock for now

  // Reset auto-advance on interaction
  function resetAutoAdvance() {
    if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    autoAdvanceTimer.current = setTimeout(() => {
      advanceCard(1);
    }, AUTO_ADVANCE_MS);
  }

  // Animate card transition
  function advanceCard(direction: 1 | -1) {
    const nextIndex = currentCard + direction;
    if (nextIndex < 0 || nextIndex >= cards.length) {
      if (nextIndex >= cards.length) {
        // Go to end screen
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.push('/wrapped/end');
        return;
      }
      return;
    }

    Haptics.selectionAsync();

    // Out animation
    Animated.parallel([
      Animated.timing(cardOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(cardScale, { toValue: 0.95, duration: 200, useNativeDriver: true }),
      Animated.timing(cardTranslateY, {
        toValue: direction > 0 ? -40 : 40,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrentCard(nextIndex);
      // Reset for in animation
      cardOpacity.setValue(0);
      cardScale.setValue(0.95);
      cardTranslateY.setValue(direction > 0 ? 40 : -40);

      Animated.parallel([
        Animated.spring(cardOpacity, { toValue: 1, damping: 15, stiffness: 80, useNativeDriver: true }),
        Animated.spring(cardScale, { toValue: 1, damping: 12, stiffness: 90, useNativeDriver: true }),
        Animated.spring(cardTranslateY, { toValue: 0, damping: 15, stiffness: 80, useNativeDriver: true }),
      ]).start();
    });

    resetAutoAdvance();
  }

  // Pan responder for vertical swipe
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 15,
      onPanResponderEnd: (_, gs) => {
        if (gs.dy < -SWIPE_THRESHOLD) advanceCard(1);
        else if (gs.dy > SWIPE_THRESHOLD) advanceCard(-1);
      },
    })
  ).current;

  // Tap left/right to advance
  function handleTap(side: 'left' | 'right') {
    if (side === 'right') advanceCard(1);
    else advanceCard(-1);
  }

  // Start auto-advance timer
  useEffect(() => {
    resetAutoAdvance();
    return () => { if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current); };
  }, [currentCard]);

  const card = cards[currentCard];
  const CardComponent = CARD_COMPONENTS[card?.type] || HeroStatCard;

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      {/* Progress dots */}
      <View style={styles.dotsContainer}>
        <ProgressDots total={cards.length} current={currentCard} />
      </View>

      {/* Tap zones */}
      <View style={styles.tapContainer}>
        <TouchableWithoutFeedback onPress={() => handleTap('left')} style={styles.tapLeft}>
          <View style={styles.tapLeft} />
        </TouchableWithoutFeedback>
        <TouchableWithoutFeedback onPress={() => handleTap('right')} style={styles.tapRight}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  dotsContainer: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    zIndex: 10,
    alignItems: 'center',
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
    flex: 1,
  },
  cardContainer: {
    flex: 1,
  },
  counter: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  counterText: {
    ...typography.caption,
    color: colors.tertiary,
    letterSpacing: 2,
  },
});