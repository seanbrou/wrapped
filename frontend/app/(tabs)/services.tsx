import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
  RefreshControl,
  ActivityIndicator,
  Easing,
  Dimensions,
  Image,
} from 'react-native';
import Svg, { Circle as SvgCircle } from 'react-native-svg';
import Reanimated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  cancelAnimation,
  Easing as ReanimatedEasing,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  colors, type, space, radii, motion,
  SERVICE_CONFIGS, AUTH_LABEL, type ServiceConfig,
} from '../../lib/theme';
import { api } from '../../lib/api';
import LiquidGlass from '../../components/LiquidGlass';
import Confetti from '../../components/Confetti';

const { height: SVC_H } = Dimensions.get('window');
const SVC_BOTTOM_OFF = Math.round(SVC_H * 0.40);
const SVC_BOTTOM_H = Math.round(SVC_H * 0.60);

// Editorial list-style Connect screen. No card grid. Apple-grade
// hairline rows with wordmark initials, one-line tagline, and a
// single right-aligned action.
function ProviderLogo({ uri, color, mark }: { uri: string; color: string; mark: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <View style={[styles.logoFallback, { borderColor: color }]}>
        <Text style={[styles.logoFallbackText, { color }]}>{mark}</Text>
      </View>
    );
  }
  return (
    <View style={styles.logoWrap}>
      <Image
        source={{ uri }}
        style={styles.logoImage}
        resizeMode="cover"
        onError={() => setFailed(true)}
      />
    </View>
  );
}

/** Space reserved for tab bar + FAB (see app/(tabs)/_layout.tsx). */
const TAB_BAR_OFFSET = 92;
const DOCK_AUTO_HIDE_MS = 6000;

/** Ring geometry around Build button (SVG uses useNativeDriver: false). */
const BUILD_RING = 64;
const RING_R = 26;
const RING_C = 2 * Math.PI * RING_R;
const RING_CX = BUILD_RING / 2;
const RING_CY = BUILD_RING / 2;

/** Reanimated + RNSVG: RN Animated often fails to drive strokeDashoffset on Circle */
const ReanimatedCircle = Reanimated.createAnimatedComponent(SvgCircle);

export default function ServicesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [connected, setConnected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  /** Toast dock: only after user adds a provider, auto-hides after DOCK_AUTO_HIDE_MS */
  const [dockVisible, setDockVisible] = useState(false);

  const headerFade = useRef(new Animated.Value(0)).current;
  const rowFades = useRef(SERVICE_CONFIGS.map(() => new Animated.Value(0))).current;
  const dockY = useRef(new Animated.Value(140)).current;
  /** 1 = full ring (time remaining), animates to 0 over DOCK_AUTO_HIDE_MS */
  const ringProgress = useSharedValue(1);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** False after dock hides or before first slide-in this session — so re-adding springs again */
  const dockSlideInDoneRef = useRef(false);

  const countdownRingProps = useAnimatedProps(() => ({
    strokeDashoffset: RING_C * (1 - ringProgress.value),
  }));

  const clearDockTimers = useCallback(() => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
    cancelAnimation(ringProgress);
    ringProgress.value = 1;
  }, [ringProgress]);

  const hideDockAnimated = useCallback(() => {
    clearDockTimers();
    dockSlideInDoneRef.current = false;
    Animated.timing(dockY, {
      toValue: 140,
      duration: 320,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setDockVisible(false);
    });
  }, [clearDockTimers, dockY]);

  const showDockWithTimer = useCallback(() => {
    clearDockTimers();

    const needsSlideIn = !dockSlideInDoneRef.current;
    if (needsSlideIn) {
      dockSlideInDoneRef.current = true;
      dockY.setValue(140);
      setDockVisible(true);
      Animated.spring(dockY, {
        toValue: 0,
        ...motion.springFirm,
        useNativeDriver: true,
      }).start();
    }

    ringProgress.value = 1;
    ringProgress.value = withTiming(0, {
      duration: DOCK_AUTO_HIDE_MS,
      easing: ReanimatedEasing.linear,
    });

    dismissTimerRef.current = setTimeout(() => {
      hideDockAnimated();
    }, DOCK_AUTO_HIDE_MS);
  }, [clearDockTimers, dockY, hideDockAnimated, ringProgress]);

  useEffect(() => {
    Animated.sequence([
      Animated.timing(headerFade, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.stagger(60, rowFades.map(f =>
        Animated.timing(f, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        })
      )),
    ]).start();

    api.listServices()
      .then(data => {
        setConnected(new Set(data.filter(s => s.isConnected).map(s => s.id)));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (connected.size === 0) {
      clearDockTimers();
      dockSlideInDoneRef.current = false;
      dockY.setValue(140);
      setDockVisible(false);
    }
  }, [connected.size, clearDockTimers, dockY]);

  useEffect(() => () => clearDockTimers(), [clearDockTimers]);

  async function toggle(svc: ServiceConfig) {
    Haptics.selectionAsync();
    const wasLinked = connected.has(svc.id);
    setBusy(svc.id);
    try {
      if (wasLinked) {
        await api.revokeService(svc.id);
      } else {
        await api.connectService(svc.id);
      }

      const data = await api.listServices();
      setConnected(new Set(data.filter(s => s.isConnected).map(s => s.id)));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (!wasLinked) {
        showDockWithTimer();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : `Could not ${wasLinked ? 'remove' : 'connect'} ${svc.name}.`;
      Alert.alert(wasLinked ? 'Connection not removed' : 'Connection failed', message);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setBusy(null);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    try {
      const data = await api.listServices();
      setConnected(new Set(data.filter(s => s.isConnected).map(s => s.id)));
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Confetti mode="drift" count={16} bandHeight={320} seed={53} />
      <Confetti
        mode="drift"
        count={48}
        seed={61}
        bandOffset={SVC_BOTTOM_OFF}
        bandHeight={SVC_BOTTOM_H}
        style={{ opacity: 0.82 }}
      />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* ─── Editorial header ─── */}
        <Animated.View
          style={[
            styles.header,
            {
              opacity: headerFade,
              transform: [{
                translateY: headerFade.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }),
              }],
            },
          ]}
        >
          <Text style={styles.eyebrow}>Accounts</Text>
          <Text style={styles.headline}>
            Your linked{'\n'}apps.
          </Text>
          <Text style={styles.sub}>
            Tap Add to link a provider, then use the + button to build a recap.
          </Text>
        </Animated.View>

        {/* ─── Section label ─── */}
        <Text style={styles.sectionLabel}>Connections</Text>

        {/* ─── List: glass rows, editorial typography (no busy chips) ─── */}
        <View style={styles.list}>
          {SERVICE_CONFIGS.map((svc, i) => {
            const isConnected = connected.has(svc.id);
            const isBusy = busy === svc.id;
            return (
              <Animated.View
                key={svc.id}
                style={{
                  opacity: rowFades[i],
                  transform: [{
                    translateY: rowFades[i].interpolate({ inputRange: [0, 1], outputRange: [12, 0] }),
                  }],
                }}
              >
                <LiquidGlass
                  style={styles.rowGlass}
                  effect="liquid"
                  intensity={82}
                  tint="light"
                  radius={radii.xxl}
                  elevated={false}
                  color="rgba(255, 252, 247, 0.42)"
                >
                  <Pressable
                    onPress={() => !isBusy && toggle(svc)}
                    style={({ pressed }) => [
                      styles.rowInner,
                      pressed && styles.rowPressed,
                    ]}
                  >
                    <View style={styles.logoShell}>
                      <ProviderLogo uri={svc.logoUri} color={svc.color} mark={svc.mark} />
                    </View>
                    <View style={styles.rowBody}>
                      <Text style={styles.rowTitle} numberOfLines={1}>{svc.name}</Text>
                      <Text style={styles.rowTag} numberOfLines={1}>{svc.tagline}</Text>
                      <Text style={styles.rowMeta} numberOfLines={1}>
                        {AUTH_LABEL[svc.authKind]}
                      </Text>
                    </View>
                    <View style={styles.rowAction}>
                      {isBusy ? (
                        <ActivityIndicator color={colors.primary} size="small" />
                      ) : isConnected ? (
                        <View style={styles.linkedMark}>
                          <View style={styles.linkedDot} />
                          <Text style={styles.linkedLabel}>Added</Text>
                        </View>
                      ) : (
                        <View style={styles.addCapsule}>
                          <Text style={styles.addCapsuleText}>Add</Text>
                        </View>
                      )}
                    </View>
                  </Pressable>
                </LiquidGlass>
              </Animated.View>
            );
          })}
        </View>

        {/* ─── Privacy footnote ─── */}
        <View style={styles.footnote}>
          <Text style={styles.footnoteText}>
            We only store summary stats needed for your recap — not your full listening history or health files.
          </Text>
        </View>

        <View style={{ height: loading ? 20 : 120 }} />
      </ScrollView>

      {/* ─── Toast: appears when you add a provider; auto-hides after 6s (ring = countdown) ─── */}
      {connected.size > 0 && dockVisible && (
      <Animated.View
        style={[
          styles.dockShell,
          {
            bottom: Math.max(insets.bottom, 8) + TAB_BAR_OFFSET,
            transform: [{ translateY: dockY }],
          },
        ]}
        pointerEvents="auto"
      >
        <LiquidGlass
          style={styles.dockGlass}
          effect="liquid"
          elevated
          intensity={92}
          tint="light"
          radius={radii.xl}
        >
          <View style={styles.dockInner}>
            <View style={styles.dockBadge}>
              <Text style={styles.dockBadgeText}>{connected.size}</Text>
            </View>
            <View style={styles.dockCopy}>
              <Text style={styles.dockTitle}>Ready for your recap</Text>
              <Text style={styles.dockSubtitle}>
                {connected.size} account{connected.size === 1 ? '' : 's'} connected
              </Text>
            </View>
            <View style={styles.buildWrap}>
              {/* Button first so the ring SVG paints on top (otherwise the ink pill covers the arc) */}
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  clearDockTimers();
                  router.push('/wizard');
                  hideDockAnimated();
                }}
                style={({ pressed }) => [styles.dockCta, pressed && styles.dockCtaPressed]}
              >
                <Text style={styles.dockCtaText}>Build</Text>
              </Pressable>
              <Svg
                width={BUILD_RING}
                height={BUILD_RING}
                style={styles.buildRingSvg}
                pointerEvents="none"
              >
                <SvgCircle
                  cx={RING_CX}
                  cy={RING_CY}
                  r={RING_R}
                  stroke="rgba(255, 255, 255, 0.35)"
                  strokeWidth={3}
                  fill="none"
                  transform={`rotate(-90, ${RING_CX}, ${RING_CY})`}
                />
                <ReanimatedCircle
                  cx={RING_CX}
                  cy={RING_CY}
                  r={RING_R}
                  stroke="#FFFFFF"
                  strokeWidth={3}
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={RING_C}
                  animatedProps={countdownRingProps}
                  transform={`rotate(-90, ${RING_CX}, ${RING_CY})`}
                />
              </Svg>
            </View>
          </View>
        </LiquidGlass>
      </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    paddingHorizontal: space.lg,
    paddingTop: space.xl,
    paddingBottom: space.xl,
  },

  // ─── Header ──────────────────────────────────────────────
  header: {
    marginBottom: space.xl,
  },
  eyebrow: {
    ...type.eyebrow,
    color: colors.tertiary,
    marginBottom: space.md,
  },
  headline: {
    ...type.displayXL,
    color: colors.primary,
    marginBottom: space.md,
  },
  sub: {
    ...type.body,
    color: colors.secondary,
    maxWidth: 340,
  },

  // ─── Section ─────────────────────────────────────────────
  sectionLabel: {
    ...type.eyebrow,
    color: colors.tertiary,
    marginBottom: space.md,
    letterSpacing: 2,
  },

  // ─── List — glass surface rows, restrained chrome ─────────
  list: {
    marginBottom: space.xl,
    gap: 10,
  },
  rowGlass: {
    overflow: 'hidden',
  },
  rowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 14,
  },
  rowPressed: {
    opacity: 0.92,
  },
  logoShell: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(20, 16, 10, 0.06)',
  },
  logoWrap: {
    width: 36,
    height: 36,
    borderRadius: 9,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  logoFallback: {
    width: 36,
    height: 36,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  logoFallbackText: {
    fontSize: 13,
    fontWeight: '800',
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    gap: 3,
  },
  rowTitle: {
    ...type.titleSmall,
    color: colors.primary,
    fontWeight: '600',
    letterSpacing: -0.35,
  },
  rowTag: {
    ...type.bodySmall,
    color: colors.secondary,
    opacity: 0.92,
    letterSpacing: -0.1,
  },
  rowMeta: {
    ...type.mono,
    fontSize: 10,
    color: colors.muted,
    letterSpacing: 0.15,
    marginTop: 5,
  },
  rowAction: {
    minWidth: 76,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  addCapsule: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(20, 16, 10, 0.14)',
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  addCapsuleText: {
    ...type.bodySmallMedium,
    color: colors.primary,
    fontWeight: '600',
    letterSpacing: -0.15,
  },
  linkedMark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  linkedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  linkedLabel: {
    ...type.caption,
    fontSize: 12,
    fontWeight: '600',
    color: colors.success,
    letterSpacing: -0.1,
  },

  // ─── Footnote ────────────────────────────────────────────
  footnote: {
    paddingHorizontal: space.xs,
  },
  footnoteText: {
    ...type.caption,
    color: colors.tertiary,
    lineHeight: 18,
  },

  // ─── Dock (floating panel above tab bar) ─────────────────
  dockShell: {
    position: 'absolute',
    left: space.md,
    right: space.md,
  },
  dockGlass: {
    overflow: 'visible',
  },
  dockInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: 12,
    paddingLeft: 12,
    paddingRight: 10,
  },
  dockBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dockBadgeText: {
    ...type.titleSmall,
    color: colors.inverse,
    fontWeight: '800',
  },
  dockCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  dockTitle: {
    ...type.bodySmallMedium,
    color: colors.primary,
    letterSpacing: -0.2,
  },
  dockSubtitle: {
    ...type.caption,
    color: colors.tertiary,
    lineHeight: 16,
  },
  buildWrap: {
    position: 'relative',
    width: BUILD_RING,
    height: BUILD_RING,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buildRingSvg: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
  },
  dockCta: {
    zIndex: 0,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: radii.pill,
    minWidth: 52,
    alignItems: 'center',
  },
  dockCtaPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.97 }],
  },
  dockCtaText: {
    ...type.bodySmallMedium,
    color: colors.inverse,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
