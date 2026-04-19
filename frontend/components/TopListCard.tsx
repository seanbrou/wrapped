import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { colors, typography, spacing, radii } from '../lib/theme';

interface Props {
  title: string;
  items: { rank: number; name: string; stat: string; emoji?: string }[];
  service: string;
}

const RANK_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32']; // gold, silver, bronze

export function TopListCard({ title, items, service }: Props) {
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const itemAnims = useRef(items.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.stagger(120, [
      Animated.timing(titleOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ...itemAnims.map(anim =>
        Animated.spring(anim, { toValue: 1, damping: 10, stiffness: 80, useNativeDriver: true })
      ),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.serviceBadge}>
        <Text style={styles.serviceText}>{service.replace('_', ' ')}</Text>
      </View>

      <Animated.View style={{ opacity: titleOpacity }}>
        <Text style={styles.title}>{title}</Text>
      </Animated.View>

      <View style={styles.list}>
        {items.map((item, i) => (
          <Animated.View
            key={i}
            style={[
              styles.itemRow,
              {
                opacity: itemAnims[i],
                transform: [
                  { translateX: itemAnims[i].interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) },
                ],
              },
            ]}
          >
            <View style={[
              styles.rankCircle,
              i < 3 && { backgroundColor: RANK_COLORS[i] + '20', borderColor: RANK_COLORS[i] },
            ]}>
              <Text style={[styles.rankText, i < 3 && { color: RANK_COLORS[i] }]}>{item.rank}</Text>
            </View>
            <View style={styles.itemContent}>
              <Text style={styles.itemName}>{item.emoji ? `${item.emoji} ` : ''}{item.name}</Text>
              <Text style={styles.itemStat}>{item.stat}</Text>
            </View>
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.background,
  },
  serviceBadge: {
    position: 'absolute',
    top: 100,
    alignSelf: 'center',
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
    ...typography.h2,
    color: colors.accentCyan,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  list: {
    gap: spacing.md,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.glassFill,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.glassStroke,
  },
  rankCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    ...typography.caption,
    fontWeight: '800',
    color: colors.secondary,
  },
  itemContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemName: {
    ...typography.bodyMedium,
    color: colors.primary,
    flex: 1,
  },
  itemStat: {
    ...typography.caption,
    color: colors.accentCyan,
    fontWeight: '600',
  },
});