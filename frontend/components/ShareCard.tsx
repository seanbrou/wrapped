import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share } from 'react-native';
import { colors, typography, spacing, radii } from '../lib/theme';

interface Props {
  stat: string;
  service: string;
}

export function ShareCard({ stat, service }: Props) {
  async function handleShare() {
    try {
      await Share.share({
        message: `My ${new Date().getFullYear()} Wrapped: ${stat}. Made with Wrapped ✨`,
      });
    } catch (e) { /* ignore */ }
  }

  const serviceLabel = service.replace('_', ' ');

  return (
    <View style={styles.container}>
      {/* Logo */}
      <View style={styles.logoRow}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoText}>W</Text>
        </View>
        <Text style={styles.madeWith}>Made with Wrapped</Text>
      </View>

      {/* Year */}
      <Text style={styles.yearText}>{new Date().getFullYear()}</Text>

      {/* Stat */}
      <Text style={styles.statText}>{stat}</Text>

      {/* Service */}
      <Text style={styles.serviceText}>{serviceLabel}</Text>

      {/* Share button */}
      <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.8}>
        <Text style={styles.shareBtnText}>Share</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.background,
  },
  logoRow: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoBadge: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.accentFuchsia,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
    shadowColor: colors.accentFuchsia,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -1,
  },
  madeWith: {
    ...typography.captionUppercase,
    color: colors.tertiary,
    letterSpacing: 3,
  },
  yearText: {
    ...typography.displayLarge,
    fontSize: 80,
    lineHeight: 84,
    color: colors.primary,
    letterSpacing: -3,
  },
  statText: {
    ...typography.h2,
    color: colors.accentCyan,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  serviceText: {
    ...typography.caption,
    color: colors.secondary,
    textTransform: 'capitalize',
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  shareBtn: {
    backgroundColor: colors.accentFuchsia,
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: radii.full,
    shadowColor: colors.accentFuchsia,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  shareBtnText: {
    ...typography.bodyMedium,
    color: '#fff',
    fontWeight: '700',
  },
});