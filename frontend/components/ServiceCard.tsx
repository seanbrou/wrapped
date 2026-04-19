import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, typography, spacing, radii } from '../lib/theme';
import { ServiceInfo } from '../lib/api';

interface Props {
  service: ServiceInfo;
  onConnect: () => void;
  detail?: {
    emoji: string;
    description: string;
    color: string;
    gradient: readonly [string, string];
  };
}

export function ServiceCard({ service, onConnect, detail }: Props) {
  const [scale] = useState(new Animated.Value(1));
  const isConnected = service.isConnected;

  function handlePress() {
    Haptics.selectionAsync();
    Animated.sequence([
      Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
    ]).start();
    onConnect();
  }

  const accentColor = detail?.color || colors.accentFuchsia;
  const emoji = detail?.emoji || '📦';
  const description = detail?.description || '';

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={[styles.card, isConnected && styles.cardConnected]}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        {/* Accent stripe */}
        <View style={[styles.accentStripe, { backgroundColor: accentColor }]} />

        <View style={styles.content}>
          <Text style={styles.emoji}>{emoji}</Text>
          <View style={styles.info}>
            <Text style={styles.name}>{service.name}</Text>
            {description ? <Text style={styles.desc}>{description}</Text> : null}
          </View>
          <View style={[styles.statusBadge, isConnected && styles.statusBadgeConnected]}>
            <Text style={[styles.statusText, isConnected && styles.statusTextConnected]}>
              {isConnected ? '✓' : '+'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.glassFill,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.glassStroke,
    overflow: 'hidden',
  },
  cardConnected: {
    borderColor: 'rgba(0, 230, 118, 0.2)',
  },
  accentStripe: {
    height: 3,
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  emoji: {
    fontSize: 28,
  },
  info: {
    flex: 1,
  },
  name: {
    ...typography.bodyMedium,
    color: colors.primary,
  },
  desc: {
    ...typography.caption,
    color: colors.secondary,
    marginTop: 2,
  },
  statusBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadgeConnected: {
    backgroundColor: 'rgba(0, 230, 118, 0.15)',
    borderColor: colors.success,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.tertiary,
  },
  statusTextConnected: {
    color: colors.success,
  },
});