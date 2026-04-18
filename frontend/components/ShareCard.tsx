import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share } from 'react-native';
import { colors, gradients } from '../lib/theme';

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
    } catch (e) {
      // ignore
    }
  }

  const serviceLabel = service.replace('_', ' ');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoText}>W</Text>
        </View>
        <Text style={styles.madeWith}>Made with Wrapped</Text>
      </View>
      <Text style={styles.year}>{new Date().getFullYear()}</Text>
      <Text style={styles.stat}>{stat}</Text>
      <Text style={styles.service}>{serviceLabel}</Text>
      <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
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
    padding: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoBadge: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.accentPurple,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
  },
  madeWith: {
    fontSize: 12,
    color: colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  year: {
    fontSize: 80,
    fontWeight: '900',
    color: colors.primary,
    lineHeight: 88,
  },
  stat: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.accentCyan,
    marginTop: 8,
  },
  service: {
    fontSize: 14,
    color: colors.secondary,
    marginTop: 8,
    textTransform: 'capitalize',
  },
  shareBtn: {
    marginTop: 32,
    backgroundColor: colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 30,
  },
  shareBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.background,
  },
});
