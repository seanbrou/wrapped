import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { colors } from '../../lib/theme';
import { MOCK_WRAPPED } from '../../lib/mockData';

export default function EndScreen() {
  const router = useRouter();

  async function handleShareAll() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await Share.share({
        message: `My ${new Date().getFullYear()} Wrapped is ready! ✨ Check out my top stats across ${MOCK_WRAPPED.services.length} apps. Made with Wrapped.`,
      });
    } catch { /* ignore */ }
  }

  function handleTryAgain() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.replace('/(tabs)/dashboard');
  }

  const totalCards = MOCK_WRAPPED.cards.length;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>W</Text>
          </View>
          <Text style={styles.title}>Your Year is In</Text>
          <Text style={styles.subtitle}>Here's everything you accomplished this year</Text>
        </View>

        {/* Stats summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryStat}>
              <Text style={styles.summaryNum}>{MOCK_WRAPPED.services.length}</Text>
              <Text style={styles.summaryLabel}>Services</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryStat}>
              <Text style={styles.summaryNum}>{totalCards}</Text>
              <Text style={styles.summaryLabel}>Cards</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryStat}>
              <Text style={styles.summaryNum}>{new Date().getFullYear()}</Text>
              <Text style={styles.summaryLabel}>Year</Text>
            </View>
          </View>
        </View>

        {/* Insights */}
        <View style={styles.insightsSection}>
          <Text style={styles.sectionTitle}>Your Highlights</Text>
          {MOCK_WRAPPED.insights.map((insight, i) => (
            <View key={i} style={styles.insightRow}>
              <View style={styles.insightBullet} />
              <Text style={styles.insightText}>{insight}</Text>
            </View>
          ))}
        </View>

        {/* Services covered */}
        <View style={styles.servicesSection}>
          <Text style={styles.sectionTitle}>Services Included</Text>
          <View style={styles.servicesRow}>
            {MOCK_WRAPPED.services.map(s => (
              <View key={s} style={styles.serviceBadge}>
                <Text style={styles.serviceBadgeText}>
                  {s.replace('_', ' ')}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.shareAllBtn} onPress={handleShareAll} activeOpacity={0.8}>
          <Text style={styles.shareAllBtnText}>Share Wrapped</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tryAgainBtn} onPress={handleTryAgain}>
          <Text style={styles.tryAgainBtnText}>Create Another</Text>
        </TouchableOpacity>
      </View>

      {/* Privacy note */}
      <View style={styles.privacyNote}>
        <Text style={styles.privacyNoteText}>
          🔒 Your data has been deleted from our servers. You control your info.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 16,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: colors.accentPurple,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.primary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: colors.secondary,
    textAlign: 'center',
    marginTop: 8,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 32,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryStat: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  },
  summaryNum: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.primary,
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.secondary,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  insightsSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  insightBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accentPurple,
    marginTop: 6,
    flexShrink: 0,
  },
  insightText: {
    fontSize: 15,
    color: colors.primary,
    lineHeight: 22,
    flex: 1,
  },
  servicesSection: {
    marginBottom: 32,
  },
  servicesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  serviceBadge: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  serviceBadgeText: {
    fontSize: 13,
    color: colors.secondary,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  actions: {
    padding: 20,
    gap: 12,
  },
  shareAllBtn: {
    backgroundColor: colors.accentPurple,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
  },
  shareAllBtnText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#fff',
  },
  tryAgainBtn: {
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  tryAgainBtnText: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.secondary,
  },
  privacyNote: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    alignItems: 'center',
  },
  privacyNoteText: {
    fontSize: 12,
    color: colors.muted,
    textAlign: 'center',
  },
});
