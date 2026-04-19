import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  colors, typography, spacing, radii, shadows, motion, glass,
  SERVICE_CONFIGS, serviceColors,
} from '../../lib/theme';
import { api, ServiceInfo } from '../../lib/api';
import { MOCK_WRAPPED, PERIODS } from '../../lib/mockData';

const { width: W } = Dimensions.get('window');

export default function DashboardScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [connectedIds, setConnectedIds] = useState<string[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [period, setPeriod] = useState('year');
  const [generating, setGenerating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Animations
  const headerAnim = useRef(new Animated.Value(0)).current;
  const sectionAnims = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;
  const btnScale = useRef(new Animated.Value(1)).current;
  const btnGlow = useRef(new Animated.Value(0)).current;
  const genProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Header entrance
    Animated.spring(headerAnim, { toValue: 1, ...motion.springGentle, useNativeDriver: true }).start();

    // Stagger sections
    Animated.stagger(150, sectionAnims.map(a =>
      Animated.spring(a, { toValue: 1, ...motion.spring, useNativeDriver: true })
    )).start();

    // Button glow pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(btnGlow, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(btnGlow, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start();

    // Load services
    api.listServices()
      .then(data => {
        const ids = data.filter((s: ServiceInfo) => s.isConnected).map((s: ServiceInfo) => s.id);
        setConnectedIds(ids);
        setSelectedServices(ids);
      })
      .catch(() => {
        // Default: all services connected for demo
        const ids = SERVICE_CONFIGS.map(s => s.id);
        setConnectedIds(ids);
        setSelectedServices(ids);
      })
      .finally(() => setLoading(false));
  }, []);

  async function onRefresh() {
    setRefreshing(true);
    try {
      const data = await api.listServices();
      const ids = data.filter((s: ServiceInfo) => s.isConnected).map((s: ServiceInfo) => s.id);
      setConnectedIds(ids);
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
      Animated.spring(btnScale, { toValue: 0.93, damping: 8, stiffness: 200, useNativeDriver: true }),
      Animated.spring(btnScale, { toValue: 1, damping: 10, stiffness: 150, useNativeDriver: true }),
    ]).start();

    setGenerating(true);

    // Progress animation
    genProgress.setValue(0);
    Animated.timing(genProgress, { toValue: 1, duration: 2500, useNativeDriver: false }).start();

    try {
      const result = await api.generateWrapped(selectedServices);
      router.push(`/wrapped/${result.sessionId}`);
    } catch {
      router.push(`/wrapped/${MOCK_WRAPPED.id}`);
    }
  }

  const connectedServiceConfigs = SERVICE_CONFIGS.filter(s => connectedIds.includes(s.id));
  const disabled = selectedServices.length === 0 || generating;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accentFuchsia}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Hero Header ─── */}
        <Animated.View
          style={[
            styles.hero,
            {
              opacity: headerAnim,
              transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }],
            },
          ]}
        >
          <Text style={styles.heroOverline}>YOUR YEAR IN REVIEW</Text>
          <Text style={styles.heroTitle}>My{'\n'}Wrapped</Text>
          <View style={styles.heroAccent}>
            <LinearGradient
              colors={[colors.accentPurple, colors.accentFuchsia, colors.accentCyan]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.heroAccentLine}
            />
          </View>
          <Text style={styles.heroSubtitle}>Select your services and unwrap your year.</Text>
        </Animated.View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingEmoji}>✨</Text>
            <Text style={styles.loadingText}>Loading your services...</Text>
          </View>
        ) : connectedIds.length === 0 ? (
          /* ─── Empty State ─── */
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🔗</Text>
            <Text style={styles.emptyTitle}>No services linked yet</Text>
            <Text style={styles.emptySubtitle}>Connect at least one service to generate your Wrapped.</Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => router.push('/(tabs)/services')}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[colors.accentPurple, colors.accentFuchsia]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.emptyBtnGradient}
              >
                <Text style={styles.emptyBtnText}>Connect Services</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* ─── Service Selector ─── */}
            <Animated.View
              style={[
                styles.section,
                {
                  opacity: sectionAnims[0],
                  transform: [{ translateY: sectionAnims[0].interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
                },
              ]}
            >
              <Text style={styles.sectionLabel}>INCLUDE IN WRAPPED</Text>
              <View style={styles.pillRow}>
                {connectedServiceConfigs.map(svc => {
                  const isSelected = selectedServices.includes(svc.id);
                  return (
                    <TouchableOpacity
                      key={svc.id}
                      style={[styles.pill, isSelected && [styles.pillSelected, { borderColor: svc.color + '40' }]]}
                      onPress={() => toggleService(svc.id)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.pillDot, { backgroundColor: isSelected ? svc.color : colors.tertiary }]} />
                      <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>{svc.name}</Text>
                      {isSelected && <Text style={[styles.pillCheck, { color: svc.color }]}>✓</Text>}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Animated.View>

            {/* ─── Period Selector ─── */}
            <Animated.View
              style={[
                styles.section,
                {
                  opacity: sectionAnims[1],
                  transform: [{ translateY: sectionAnims[1].interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
                },
              ]}
            >
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
            </Animated.View>

            {/* ─── Preview Card ─── */}
            {selectedServices.length > 0 && (
              <Animated.View
                style={[
                  styles.section,
                  {
                    opacity: sectionAnims[2],
                    transform: [{ translateY: sectionAnims[2].interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
                  },
                ]}
              >
                <View style={styles.previewCard}>
                  <View style={styles.previewTop}>
                    <Text style={styles.previewEmoji}>🎁</Text>
                    <View style={styles.previewTextContainer}>
                      <Text style={styles.previewTitle}>Your Wrapped Preview</Text>
                      <Text style={styles.previewSubtitle}>
                        ~{selectedServices.length * 3} story cards from {selectedServices.length} service{selectedServices.length > 1 ? 's' : ''}
                      </Text>
                    </View>
                  </View>

                  {/* Service emoji chips */}
                  <View style={styles.previewChips}>
                    {selectedServices.map(id => {
                      const svc = SERVICE_CONFIGS.find(s => s.id === id);
                      if (!svc) return null;
                      return (
                        <View key={id} style={[styles.previewChip, { backgroundColor: svc.iconBg }]}>
                          <Text style={styles.previewChipEmoji}>{svc.emoji}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              </Animated.View>
            )}
          </>
        )}
      </ScrollView>

      {/* ─── Generate Button ─── */}
      {!loading && connectedIds.length > 0 && (
        <View style={styles.footer}>
          {generating && (
            <View style={styles.genProgressBar}>
              <Animated.View
                style={[
                  styles.genProgressFill,
                  {
                    width: genProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
          )}

          <Animated.View style={{ transform: [{ scale: btnScale }] }}>
            <TouchableOpacity
              style={[styles.generateBtn, disabled && styles.generateBtnDisabled]}
              onPress={handleGenerate}
              disabled={disabled}
              activeOpacity={0.9}
            >
              {!disabled && (
                <Animated.View
                  style={[
                    StyleSheet.absoluteFill,
                    {
                      opacity: btnGlow.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.6, 1],
                      }),
                    },
                  ]}
                >
                  <LinearGradient
                    colors={[colors.accentPurple, colors.accentFuchsia]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFill}
                  />
                </Animated.View>
              )}
              <Text style={styles.generateBtnText}>
                {generating ? 'Creating your story…' : '✨ Unwrap Your Year'}
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
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: 140,
  },

  // ─── Hero ─────────────────────
  hero: {
    marginBottom: spacing.xxl,
    paddingHorizontal: spacing.xs,
  },
  heroOverline: {
    ...typography.overline,
    color: colors.accentPurple,
    marginBottom: spacing.sm,
  },
  heroTitle: {
    ...typography.display,
    fontSize: 52,
    lineHeight: 56,
    color: colors.primary,
    letterSpacing: -2,
    marginBottom: spacing.md,
  },
  heroAccent: {
    marginBottom: spacing.md,
  },
  heroAccentLine: {
    width: 56,
    height: 4,
    borderRadius: 2,
  },
  heroSubtitle: {
    ...typography.body,
    color: colors.secondary,
    lineHeight: 24,
  },

  // ─── Sections ─────────────────────
  section: {
    marginBottom: spacing.xl,
  },
  sectionLabel: {
    ...typography.overline,
    color: colors.tertiary,
    marginBottom: spacing.md,
    paddingLeft: spacing.xs,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.full,
    backgroundColor: colors.glassFill,
    borderWidth: 1,
    borderColor: colors.glassStroke,
    gap: 8,
  },
  pillSelected: {
    backgroundColor: 'rgba(108, 92, 231, 0.06)',
  },
  pillDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pillText: {
    ...typography.smallMedium,
    color: colors.secondary,
  },
  pillTextSelected: {
    color: colors.primary,
  },
  pillCheck: {
    fontSize: 12,
    fontWeight: '700',
  },

  // ─── Period ─────────────────────
  periodRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  periodBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: radii.full,
    backgroundColor: colors.glassFill,
    borderWidth: 1,
    borderColor: colors.glassStroke,
  },
  periodBtnActive: {
    backgroundColor: 'rgba(108, 92, 231, 0.12)',
    borderColor: colors.accentPurple,
  },
  periodBtnText: {
    ...typography.smallMedium,
    color: colors.secondary,
  },
  periodBtnTextActive: {
    color: colors.accentPurple,
    fontWeight: '700',
  },

  // ─── Preview Card ─────────────────────
  previewCard: {
    backgroundColor: colors.glassFill2,
    borderRadius: radii.xxl,
    borderWidth: 1,
    borderColor: colors.glassStroke,
    padding: spacing.lg,
    gap: spacing.md,
  },
  previewTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  previewEmoji: {
    fontSize: 32,
  },
  previewTextContainer: {
    flex: 1,
  },
  previewTitle: {
    ...typography.bodySemibold,
    color: colors.primary,
    marginBottom: 2,
  },
  previewSubtitle: {
    ...typography.small,
    color: colors.secondary,
  },
  previewChips: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  previewChip: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewChipEmoji: {
    fontSize: 16,
  },

  // ─── Empty State ─────────────────────
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  emptyEmoji: {
    fontSize: 56,
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    ...typography.h2,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.secondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 24,
  },
  emptyBtn: {
    borderRadius: radii.full,
    overflow: 'hidden',
    ...shadows.glowPurple,
  },
  emptyBtnGradient: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: radii.full,
  },
  emptyBtnText: {
    ...typography.bodySemibold,
    color: '#fff',
  },

  // ─── Loading ─────────────────────
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  loadingEmoji: {
    fontSize: 40,
    marginBottom: spacing.md,
  },
  loadingText: {
    ...typography.body,
    color: colors.secondary,
  },

  // ─── Footer / Generate ─────────────────────
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.md,
    paddingBottom: 38,
    paddingTop: spacing.md,
    backgroundColor: colors.background,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  genProgressBar: {
    height: 3,
    backgroundColor: colors.border,
    borderRadius: 2,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  genProgressFill: {
    height: 3,
    backgroundColor: colors.accentFuchsia,
    borderRadius: 2,
  },
  generateBtn: {
    borderRadius: radii.full,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...shadows.glowFuchsia,
  },
  generateBtnDisabled: {
    backgroundColor: colors.surface,
    ...shadows.subtle,
  },
  generateBtnText: {
    ...typography.bodySemibold,
    color: '#fff',
    fontSize: 17,
    letterSpacing: 0.3,
  },
});