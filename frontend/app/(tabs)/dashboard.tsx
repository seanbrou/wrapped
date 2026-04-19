import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { colors, typography, spacing, radii, shadows, gradients } from '../../lib/theme';
import { api, ServiceInfo } from '../../lib/api';
import { MOCK_WRAPPED, SERVICE_DETAILS, PERIODS } from '../../lib/mockData';
import { LoadingRing } from '../../components/LoadingRing';

const SERVICES_META: Record<string, { emoji: string; color: string }> = {
  spotify: { emoji: '🎧', color: '#1DB954' },
  apple_health: { emoji: '❤️', color: '#FF6B6B' },
  strava: { emoji: '🏃', color: '#FC4C02' },
  goodreads: { emoji: '📚', color: '#C8B882' },
  steam: { emoji: '🎮', color: '#66C0F4' },
};

export default function DashboardScreen() {
  const router = useRouter();
  const [services, setServices] = useState<ServiceInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedServices, setSelectedServices] = useState<string[]>(['spotify', 'apple_health', 'strava', 'goodreads', 'steam']);
  const [period, setPeriod] = useState('year');
  const [generating, setGenerating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const btnScale = React.useRef(new Animated.Value(1)).current;
  const glowAnim = React.useRef(new Animated.Value(0)).current;
  const shimmerPos = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    // Glow pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.4, duration: 1500, useNativeDriver: true }),
      ])
    ).start();

    // Shimmer
    Animated.loop(
      Animated.timing(shimmerPos, { toValue: 1, duration: 2000, useNativeDriver: true })
    ).start();

    api.listServices()
      .then(data => {
        setServices(data);
        setSelectedServices(data.filter((s: ServiceInfo) => s.isConnected).map((s: ServiceInfo) => s.id));
      })
      .catch(() => {
        setServices(SERVICE_DETAILS.map(s => ({
          id: s.id, name: s.name, logoUrl: '', isConnected: true, lastSyncedAt: new Date().toISOString(),
        })));
      })
      .finally(() => setLoading(false));
  }, []);

  async function onRefresh() {
    setRefreshing(true);
    try {
      const data = await api.listServices();
      setServices(data);
    } finally {
      setRefreshing(false);
    }
  }

  function toggleService(id: string) {
    Haptics.selectionAsync();
    setSelectedServices(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  }

  async function handleGenerate() {
    if (selectedServices.length === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    // Press animation
    Animated.sequence([
      Animated.spring(btnScale, { toValue: 0.95, useNativeDriver: true }),
      Animated.spring(btnScale, { toValue: 1, useNativeDriver: true }),
    ]).start();

    setGenerating(true);
    try {
      const result = await api.generateWrapped(selectedServices);
      router.push(`/wrapped/${result.sessionId}`);
    } catch {
      router.push(`/wrapped/${MOCK_WRAPPED.id}`);
    }
  }

  const connectedServices = services.filter(s => s.isConnected);
  const disabled = selectedServices.length === 0 || generating;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accentFuchsia} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero header */}
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>My Wrapped</Text>
          <View style={styles.heroUnderline} />
          <Text style={styles.heroSubtitle}>Select services and unwrap your year</Text>
        </View>

        {loading ? (
          <LoadingRing />
        ) : (
          <>
            {connectedServices.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>🔗</Text>
                <Text style={styles.emptyText}>No services connected yet</Text>
                <TouchableOpacity onPress={() => router.push('/(tabs)/services')}>
                  <Text style={styles.emptyLink}>Connect services →</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {/* Service pills */}
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>YOUR SERVICES</Text>
                  <View style={styles.pillRow}>
                    {connectedServices.map(s => {
                      const meta = SERVICES_META[s.id] || { emoji: '📦', color: colors.accentFuchsia };
                      const isSelected = selectedServices.includes(s.id);
                      return (
                        <TouchableOpacity
                          key={s.id}
                          style={[
                            styles.pill,
                            isSelected && { ...styles.pillSelected, shadowColor: meta.color },
                          ]}
                          onPress={() => toggleService(s.id)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.pillEmoji}>{meta.emoji}</Text>
                          <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>
                            {s.name}
                          </Text>
                          {isSelected && <Text style={styles.pillCheck}> ✓</Text>}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Period selector */}
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>TIME PERIOD</Text>
                  <View style={styles.periodRow}>
                    {PERIODS.map(p => {
                      const active = period === p.value;
                      return (
                        <TouchableOpacity
                          key={p.value}
                          style={[styles.periodBtn, active && styles.periodBtnActive]}
                          onPress={() => { setPeriod(p.value); Haptics.selectionAsync(); }}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.periodBtnText, active && styles.periodBtnTextActive]}>
                            {p.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Preview estimate */}
                {selectedServices.length > 0 && (
                  <View style={styles.previewCard}>
                    <Text style={styles.previewEmoji}>✨</Text>
                    <Text style={styles.previewText}>
                      ~{selectedServices.length * 3} cards from {selectedServices.length} service{selectedServices.length > 1 ? 's' : ''}
                    </Text>
                  </View>
                )}
              </>
            )}
          </>
        )}
      </ScrollView>

      {/* Generate button — fixed at bottom */}
      {!loading && connectedServices.length > 0 && (
        <View style={styles.footer}>
          <Animated.View style={{ transform: [{ scale: btnScale }] }}>
            <TouchableOpacity
              style={[
                styles.generateBtn,
                disabled && styles.generateBtnDisabled,
              ]}
              onPress={handleGenerate}
              disabled={disabled}
              activeOpacity={0.9}
            >
              <Animated.View style={[StyleSheet.absoluteFill, { opacity: disabled ? 0 : glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.4] }) }]}>
                <View style={styles.generateBtnGlow} />
              </Animated.View>
              <Text style={styles.generateBtnText}>
                {generating ? 'Creating your story...' : 'Unwrap Your Year'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}
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
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: 120,
  },
  hero: {
    marginBottom: spacing.xl,
  },
  heroTitle: {
    ...typography.display,
    color: colors.primary,
    fontSize: 48,
    lineHeight: 52,
  },
  heroUnderline: {
    width: 48,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.accentFuchsia,
    marginTop: spacing.sm,
    shadowColor: colors.accentFuchsia,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
  },
  heroSubtitle: {
    ...typography.body,
    color: colors.secondary,
    marginTop: spacing.sm,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionLabel: {
    ...typography.captionUppercase,
    color: colors.tertiary,
    marginBottom: spacing.md,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.full,
    backgroundColor: colors.glassFill,
    borderWidth: 1,
    borderColor: colors.glassStroke,
    gap: spacing.xs,
  },
  pillSelected: {
    backgroundColor: 'rgba(224, 64, 251, 0.1)',
    borderColor: 'rgba(224, 64, 251, 0.4)',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  pillEmoji: {
    fontSize: 16,
  },
  pillText: {
    ...typography.caption,
    color: colors.secondary,
  },
  pillTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  pillCheck: {
    color: colors.accentFuchsia,
    fontSize: 12,
    fontWeight: '700',
  },
  periodRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  periodBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.full,
    backgroundColor: colors.glassFill,
    borderWidth: 1,
    borderColor: colors.glassStroke,
  },
  periodBtnActive: {
    backgroundColor: 'rgba(224, 64, 251, 0.15)',
    borderColor: colors.accentFuchsia,
  },
  periodBtnText: {
    ...typography.caption,
    color: colors.secondary,
  },
  periodBtnTextActive: {
    color: colors.accentFuchsia,
    fontWeight: '700',
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.glassFill,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.glassStroke,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  previewEmoji: {
    fontSize: 20,
  },
  previewText: {
    ...typography.bodyMedium,
    color: colors.secondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyText: {
    ...typography.body,
    color: colors.secondary,
    marginBottom: spacing.md,
  },
  emptyLink: {
    ...typography.bodyMedium,
    color: colors.accentFuchsia,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    paddingTop: spacing.md,
    backgroundColor: colors.background,
    borderTopColor: colors.border,
    borderTopWidth: 1,
  },
  generateBtn: {
    backgroundColor: colors.accentFuchsia,
    paddingVertical: 18,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: colors.accentFuchsia,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
  },
  generateBtnDisabled: {
    backgroundColor: colors.surface,
    shadowOpacity: 0,
    shadowRadius: 0,
  },
  generateBtnGlow: {
    position: 'absolute',
    top: -20,
    left: -20,
    right: -20,
    bottom: -20,
    borderRadius: 60,
    backgroundColor: colors.accentFuchsia,
  },
  generateBtnText: {
    ...typography.h3,
    color: '#fff',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});