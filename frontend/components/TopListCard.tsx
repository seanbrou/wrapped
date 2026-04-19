import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { colors, typography, spacing, radii, motion, serviceColors } from '../lib/theme';

const { width: W } = Dimensions.get('window');

interface ListItem {
  rank: number;
  name: string;
  stat: string;
  emoji: string;
}

interface Props {
  title: string;
  items: ListItem[];
  service: string;
}

export function TopListCard({ title, items, service }: Props) {
  const svc = serviceColors[service] || { primary: colors.accentFuchsia, bg: 'rgba(224,64,251,0.1)' };

  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleY = useRef(new Animated.Value(15)).current;
  const itemAnims = useRef(items.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(150),
      Animated.parallel([
        Animated.timing(titleOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.spring(titleY, { toValue: 0, ...motion.springGentle, useNativeDriver: true }),
      ]),
      Animated.stagger(120, itemAnims.map(a =>
        Animated.spring(a, { toValue: 1, ...motion.spring, useNativeDriver: true })
      )),
    ]).start();
  }, []);

  const rankColors = ['#FFD700', '#C0C0C0', '#CD7F32', colors.secondary, colors.tertiary];

  return (
    <View style={styles.container}>
      {/* Background glow */}
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
        <Animated.Text
          style={[
            styles.title,
            { opacity: titleOpacity, transform: [{ translateY: titleY }] },
          ]}
        >
          {title}
        </Animated.Text>

        {/* List */}
        <View style={styles.list}>
          {items.map((item, i) => (
            <Animated.View
              key={i}
              style={[
                styles.row,
                {
                  opacity: itemAnims[i],
                  transform: [
                    { translateX: itemAnims[i].interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) },
                    { scale: itemAnims[i].interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) },
                  ],
                },
              ]}
            >
              {/* Rank */}
              <View style={[styles.rankBadge, i === 0 && styles.rankBadgeFirst]}>
                <Text style={[styles.rankText, { color: rankColors[i] || colors.secondary }]}>
                  {item.rank}
                </Text>
              </View>

              {/* Emoji */}
              <Text style={styles.itemEmoji}>{item.emoji}</Text>

              {/* Name + stat */}
              <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.itemStat}>{item.stat}</Text>
              </View>
            </Animated.View>
          ))}
        </View>
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
    width: W * 1.2,
    height: W * 1.2,
    borderRadius: W,
    opacity: 0.05,
    bottom: -W * 0.3,
    left: -W * 0.3,
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
  list: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.glassFill,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.glassStroke,
    padding: spacing.md,
    gap: spacing.md,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.glassFill2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadgeFirst: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  rankText: {
    ...typography.bodySemibold,
    fontSize: 15,
  },
  itemEmoji: {
    fontSize: 22,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    ...typography.bodySemibold,
    color: colors.primary,
    marginBottom: 2,
  },
  itemStat: {
    ...typography.caption,
    color: colors.tertiary,
  },
});