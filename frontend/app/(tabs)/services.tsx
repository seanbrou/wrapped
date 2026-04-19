import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Animated,
  Pressable,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  colors, typography, spacing, radii, shadows, motion, glass,
  SERVICE_CONFIGS, serviceColors, type ServiceConfig,
} from '../../lib/theme';
import { api, ServiceInfo } from '../../lib/api';

const { width: W } = Dimensions.get('window');
const CARD_GAP = 14;
const CARD_W = (W - spacing.md * 2 - CARD_GAP) / 2;

export default function ServicesScreen() {
  const router = useRouter();
  const [connected, setConnected] = useState<Set<string>>(new Set());
  const [connecting, setConnecting] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Staggered entrance anims
  const cardAnims = useRef(SERVICE_CONFIGS.map(() => new Animated.Value(0))).current;
  const headerAnim = useRef(new Animated.Value(0)).current;
  const bannerAnim = useRef(new Animated.Value(0)).current;

  // Connecting pulse animation
  const pulseAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    // Header entrance
    Animated.spring(headerAnim, { toValue: 1, ...motion.springGentle, useNativeDriver: true }).start();

    // Staggered card entrance
    Animated.stagger(
      100,
      cardAnims.map(anim =>
        Animated.spring(anim, { toValue: 1, ...motion.spring, useNativeDriver: true })
      )
    ).start();

    // Load services
    api.listServices()
      .then(data => {
        setConnected(new Set(data.filter(s => s.isConnected).map(s => s.id)));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Banner entrance when services are connected
  useEffect(() => {
    if (connected.size > 0) {
      Animated.spring(bannerAnim, { toValue: 1, ...motion.spring, useNativeDriver: true }).start();
    }
  }, [connected.size]);

  async function onRefresh() {
    setRefreshing(true);
    try {
      const data = await api.listServices();
      setConnected(new Set(data.filter(s => s.isConnected).map(s => s.id)));
    } finally {
      setRefreshing(false);
    }
  }

  async function handleConnect(id: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setConnecting(id);

    // Simulate OAuth flow
    await new Promise(r => setTimeout(r, 1200));

    setConnected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setConnecting(null);
  }

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
        {/* ─── Header ─── */}
        <Animated.View
          style={[
            styles.header,
            {
              opacity: headerAnim,
              transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
            },
          ]}
        >
          <Text style={styles.headerOverline}>CONNECT YOUR SERVICES</Text>
          <Text style={styles.headerTitle}>Link Your{'\n'}Apps</Text>
          <Text style={styles.headerSubtitle}>
            Connect accounts to build your personalized Wrapped story experience.
          </Text>
        </Animated.View>

        {/* ─── Service Grid ─── */}
        <View style={styles.grid}>
          {SERVICE_CONFIGS.map((svc, i) => {
            const isConnected = connected.has(svc.id);
            const isConnecting = connecting === svc.id;

            return (
              <Animated.View
                key={svc.id}
                style={[
                  styles.cardOuter,
                  {
                    opacity: cardAnims[i],
                    transform: [
                      {
                        scale: cardAnims[i].interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.85, 1],
                        }),
                      },
                      {
                        translateY: cardAnims[i].interpolate({
                          inputRange: [0, 1],
                          outputRange: [30, 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <View style={[styles.card, isConnected && styles.cardConnected]}>
                  {/* Top accent line */}
                  <LinearGradient
                    colors={[svc.gradient[0], svc.gradient[1]]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.accentLine}
                  />

                  {/* Emoji badge */}
                  <View style={[styles.emojiBadge, { backgroundColor: svc.iconBg }]}>
                    <Text style={styles.emojiText}>{svc.emoji}</Text>
                  </View>

                  {/* Name */}
                  <Text style={styles.cardName}>{svc.name}</Text>

                  {/* Description */}
                  <Text style={styles.cardDesc}>{svc.description}</Text>

                  {/* Connect Button */}
                  <TouchableOpacity
                    style={[
                      styles.connectBtn,
                      isConnected && styles.connectBtnActive,
                    ]}
                    onPress={() => handleConnect(svc.id)}
                    disabled={isConnecting}
                    activeOpacity={0.7}
                  >
                    {isConnecting ? (
                      <Animated.View
                        style={[
                          styles.connectingIndicator,
                          {
                            opacity: pulseAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0.4, 1],
                            }),
                            backgroundColor: svc.color,
                          },
                        ]}
                      />
                    ) : isConnected ? (
                      <View style={styles.connectedRow}>
                        <Text style={[styles.connectBtnTextActive, { color: svc.color }]}>✓</Text>
                        <Text style={[styles.connectBtnTextActive, { color: svc.color }]}>Linked</Text>
                      </View>
                    ) : (
                      <Text style={styles.connectBtnText}>Connect</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </Animated.View>
            );
          })}
        </View>

        {/* Bottom spacer for banner */}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* ─── Bottom Banner ─── */}
      {connected.size > 0 && (
        <Animated.View
          style={[
            styles.banner,
            {
              opacity: bannerAnim,
              transform: [
                {
                  translateY: bannerAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [60, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.bannerContent}>
            <View style={styles.bannerLeft}>
              <View style={styles.bannerBadge}>
                <Text style={styles.bannerBadgeText}>{connected.size}</Text>
              </View>
              <Text style={styles.bannerText}>
                {connected.size === SERVICE_CONFIGS.length ? 'All services linked!' : `of ${SERVICE_CONFIGS.length} linked`}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.bannerCta}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/(tabs)/dashboard');
              }}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[colors.accentPurple, colors.accentFuchsia]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.bannerCtaGradient}
              >
                <Text style={styles.bannerCtaText}>Build →</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>
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

  // ─── Header ─────────────────────
  header: {
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.xs,
  },
  headerOverline: {
    ...typography.overline,
    color: colors.accentFuchsia,
    marginBottom: spacing.sm,
  },
  headerTitle: {
    ...typography.display,
    fontSize: 44,
    lineHeight: 48,
    color: colors.primary,
    marginBottom: spacing.sm,
    letterSpacing: -1.5,
  },
  headerSubtitle: {
    ...typography.body,
    color: colors.secondary,
    lineHeight: 24,
    maxWidth: 300,
  },

  // ─── Grid ─────────────────────
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
  },
  cardOuter: {
    width: CARD_W,
  },
  card: {
    backgroundColor: colors.glassFill,
    borderRadius: radii.xxl,
    borderWidth: 1,
    borderColor: colors.glassStroke,
    padding: spacing.md,
    paddingTop: spacing.md + 6,
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
    minHeight: 195,
  },
  cardConnected: {
    borderColor: 'rgba(0, 230, 118, 0.15)',
    backgroundColor: 'rgba(0, 230, 118, 0.02)',
  },
  accentLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  emojiBadge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  emojiText: {
    fontSize: 24,
  },
  cardName: {
    ...typography.bodySemibold,
    color: colors.primary,
    marginBottom: 4,
  },
  cardDesc: {
    ...typography.caption,
    color: colors.tertiary,
    textAlign: 'center',
    marginBottom: spacing.md,
    lineHeight: 16,
  },
  connectBtn: {
    backgroundColor: 'rgba(108, 92, 231, 0.1)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: 'rgba(108, 92, 231, 0.25)',
    minWidth: 90,
    alignItems: 'center',
  },
  connectBtnActive: {
    backgroundColor: 'rgba(0, 230, 118, 0.08)',
    borderColor: 'rgba(0, 230, 118, 0.2)',
  },
  connectBtnText: {
    ...typography.captionBold,
    color: colors.accentPurple,
    letterSpacing: 0.5,
  },
  connectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  connectBtnTextActive: {
    ...typography.captionBold,
    letterSpacing: 0.5,
  },
  connectingIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },

  // ─── Banner ─────────────────────
  banner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.md,
    paddingBottom: 34,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  bannerBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(108, 92, 231, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerBadgeText: {
    ...typography.bodySemibold,
    color: colors.accentPurple,
    fontSize: 15,
  },
  bannerText: {
    ...typography.smallMedium,
    color: colors.secondary,
  },
  bannerCta: {
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  bannerCtaGradient: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: radii.full,
  },
  bannerCtaText: {
    ...typography.captionBold,
    color: '#fff',
    letterSpacing: 0.5,
  },
});