import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { colors, gradients } from '../lib/theme';
import { formatNumber } from '../lib/theme';

interface TopItem {
  name: string;
  count: number;
  rank?: number;
}

interface Props {
  items: TopItem[];
  title?: string;
}

function TopItemRow({ item, index }: { item: TopItem; index: number }) {
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(index * 120),
      Animated.parallel([
        Animated.timing(opacityAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(translateX, { toValue: 0, friction: 8, tension: 60, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const isTop3 = index < 3;

  return (
    <Animated.View style={[styles.row, {
      opacity: opacityAnim,
      transform: [{ translateX }],
    }]}>
      <View style={[styles.rankBadge, isTop3 && styles.rankBadgeTop]}>
        <Text style={[styles.rankText, isTop3 && styles.rankTextTop]}>{index + 1}</Text>
      </View>
      <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
      {item.count > 0 && (
        <Text style={styles.itemCount}>{formatNumber(item.count)}</Text>
      )}
    </Animated.View>
  );
}

export function TopListCard({ items, title }: Props) {
  return (
    <View style={styles.container}>
      {title && <Text style={styles.title}>{title}</Text>}
      <View style={styles.list}>
        {items.map((item, i) => (
          <TopItemRow key={i} item={item} index={i} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 24,
  },
  list: {
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  rankBadgeTop: {
    backgroundColor: colors.accentPurple + '30',
    borderWidth: 1,
    borderColor: colors.accentPurple,
  },
  rankText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.secondary,
  },
  rankTextTop: {
    color: colors.accentPurple,
  },
  itemName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  itemCount: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.secondary,
  },
});
