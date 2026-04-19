import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
  Easing,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  colors, type, space, radii,
  SERVICE_CONFIGS, serviceById, layout,
} from '../../lib/theme';
import { api, RecapSummary, ServiceInfo } from '../../lib/api';
import { TEMPLATES, Template } from '../../lib/mockData';
import Confetti from '../../components/Confetti';
import LiquidGlass from '../../components/LiquidGlass';

const { width: W, height: SCREEN_H } = Dimensions.get('window');
const BOTTOM_CONFETTI_OFFSET = Math.round(SCREEN_H * 0.40);
const BOTTOM_CONFETTI_HEIGHT = Math.round(SCREEN_H * 0.60);
const TEMPLATE_CARD_W = Math.min(260, W * 0.72);

// Accent lookup for subtle tints
// Slightly richer than theme tints so color reads through liquid-glass sheens
const ACCENT_BG: Record<string, string> = {
  mint: 'rgba(30, 215, 96, 0.22)',
  red: 'rgba(255, 59, 48, 0.18)',
  amber: 'rgba(255, 176, 32, 0.22)',
  sky: 'rgba(10, 132, 255, 0.18)',
  lilac: 'rgba(191, 90, 242, 0.18)',
  coral: 'rgba(255, 107, 91, 0.18)',
};
const ACCENT_FG: Record<string, string> = {
  mint: colors.mint,
  red: colors.red,
  amber: colors.amber,
  sky: colors.sky,
  lilac: colors.lilac,
  coral: colors.coral,
};

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function Home() {
  const router = useRouter();
  const [connected, setConnected] = useState<ServiceInfo[]>([]);
  const [recaps, setRecaps] = useState<RecapSummary[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const hero = useRef(new Animated.Value(0)).current;

  const load = useCallback(async () => {
    const [svcs, rps] = await Promise.all([api.listServices(), api.listRecaps()]);
    setConnected(svcs.filter(s => s.isConnected));
    setRecaps(rps);
  }, []);

  useEffect(() => {
    Animated.timing(hero, {
      toValue: 1,
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [hero]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function onRefresh() {
    setRefreshing(true);
    try { await load(); } finally { setRefreshing(false); }
  }

  function openWizard(template?: Template) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (template) {
      router.push({ pathname: '/wizard', params: { templateId: template.id } });
    } else {
      router.push('/wizard');
    }
  }

  function openSurpriseTemplate() {
    const t = TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)];
    openWizard(t);
  }

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 5)  return 'Up late';
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const hasRecaps = recaps.length > 0;
  const hasConnections = connected.length > 0;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {/* Ambient drifting confetti — hero band, full scroll scatter, extra density in bottom half */}
      <Confetti mode="drift" count={34} bandHeight={360} seed={13} style={styles.confetti} />
      <Confetti mode="drift" count={22} bandHeight={1200} seed={31} style={styles.confettiDeep} />
      <Confetti
        mode="drift"
        count={56}
        seed={89}
        bandOffset={BOTTOM_CONFETTI_OFFSET}
        bandHeight={BOTTOM_CONFETTI_HEIGHT}
        style={styles.confettiBottom}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* ─── Hero ─────────────────────────────────────────────── */}
        <Animated.View
          style={[
            styles.hero,
            {
              opacity: hero,
              transform: [{
                translateY: hero.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }),
              }],
            },
          ]}
        >
          <View style={styles.heroHeader}>
            <View style={styles.heroTopRow}>
              <Text style={styles.wordmark}>wrapped.</Text>
              <View style={styles.yearPill}>
                <Text style={styles.yearPillText}>2026</Text>
              </View>
            </View>
            <Text style={styles.greeting}>{greeting}.</Text>
            <Text style={styles.heroLede}>
              {hasRecaps
                ? 'Your recaps are ready when you are. Tap + to make a new one.'
                : hasConnections
                  ? 'You have everything linked up. Tap the + to spin up your first recap.'
                  : 'Link an account or two, then tap + to generate your first recap.'}
            </Text>
          </View>

          <View style={styles.heroCtaBand}>
            <View style={styles.createStack}>
              <Pressable
                onPress={() => openWizard()}
                style={({ pressed }) => [
                  styles.heroPill,
                  styles.heroPillDark,
                  pressed && styles.heroPillPressed,
                ]}
              >
                <Text style={styles.heroPillTextDark} numberOfLines={1}>
                  Build a recap
                </Text>
              </Pressable>
              <Pressable
                onPress={openSurpriseTemplate}
                style={({ pressed }) => [
                  styles.heroPill,
                  styles.heroPillMyth,
                  pressed && styles.heroPillPressed,
                ]}
              >
                <LinearGradient
                  pointerEvents="none"
                  colors={['#3A0CA3', '#7B2CBF', '#C77DFF', '#F4A261']}
                  locations={[0, 0.45, 0.8, 1]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFillObject}
                />
                <LinearGradient
                  pointerEvents="none"
                  colors={['rgba(255,255,255,0.35)', 'rgba(255,255,255,0)']}
                  locations={[0, 0.55]}
                  start={{ x: 0.2, y: 0 }}
                  end={{ x: 0.8, y: 1 }}
                  style={StyleSheet.absoluteFillObject}
                />
                <Text style={styles.heroPillTextMyth} numberOfLines={1}>
                  Surprise me
                </Text>
              </Pressable>
            </View>
          </View>
        </Animated.View>

        {/* ─── Templates ────────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionEyebrow}>Templates</Text>
            <Text style={styles.sectionCaption}>Tap to start with one</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.templateCarousel}
            contentContainerStyle={styles.templateRow}
            decelerationRate="fast"
            snapToInterval={TEMPLATE_CARD_W + space.md}
            removeClippedSubviews={false}
          >
            {TEMPLATES.map(t => (
              <TemplateCard key={t.id} template={t} onPress={() => openWizard(t)} />
            ))}
          </ScrollView>
        </View>

        {/* ─── Your recaps ──────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionEyebrow}>Your recaps</Text>
            <Text style={styles.sectionCaption}>
              {hasRecaps ? `${recaps.length} saved` : 'Nothing yet'}
            </Text>
          </View>

          {hasRecaps ? (
            <LiquidGlass
              style={styles.recapList}
              effect="liquid"
              elevated
              intensity={82}
              tint="light"
              radius={radii.lg}
            >
              {recaps.slice(0, 6).map((r, idx) => (
                <RecapRow
                  key={r.id}
                  recap={r}
                  isFirst={idx === 0}
                  onPress={() => router.push(`/wrapped/${r.id}`)}
                />
              ))}
              {recaps.length > 6 && (
                <Text style={styles.recapFooter}>+{recaps.length - 6} more</Text>
              )}
            </LiquidGlass>
          ) : (
            <LiquidGlass
              style={styles.placeholder}
              effect="liquid"
              elevated
              intensity={82}
              tint="light"
              radius={radii.lg}
            >
              <Text style={styles.placeholderTitle}>
                {hasConnections ? 'No recaps yet.' : 'Link something first.'}
              </Text>
              <Text style={styles.placeholderBody}>
                {hasConnections
                  ? 'Generate one from a template or the + button — it will save here.'
                  : 'Head to Accounts, connect at least one app, then come back here.'}
              </Text>
              {!hasConnections && (
                <Pressable
                  onPress={() => router.push('/(tabs)/services')}
                  style={({ pressed }) => [styles.placeholderCta, pressed && styles.cardPressed]}
                >
                  <Text style={styles.placeholderCtaText}>Open Accounts</Text>
                </Pressable>
              )}
            </LiquidGlass>
          )}
        </View>

        {/* ─── At a glance ──────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionEyebrow}>At a glance</Text>
            <Pressable onPress={() => router.push('/(tabs)/services')} hitSlop={12}>
              <Text style={styles.sectionLink}>Manage →</Text>
            </Pressable>
          </View>
          <View style={styles.glanceRow}>
            <LiquidGlass
              style={styles.glanceCard}
              effect="liquid"
              elevated
              intensity={85}
              tint="light"
              radius={radii.lg}
            >
              <Text style={styles.glanceBig}>{connected.length}</Text>
              <Text style={styles.glanceLabel}>of {SERVICE_CONFIGS.length}</Text>
              <Text style={styles.glanceCaption}>Accounts linked</Text>
            </LiquidGlass>
            <LiquidGlass
              style={styles.glanceCard}
              effect="liquid"
              elevated
              intensity={85}
              tint="warm"
              radius={radii.lg}
            >
              <Text style={styles.glanceBig}>{recaps.length}</Text>
              <Text style={styles.glanceLabel}>saved</Text>
              <Text style={styles.glanceCaption}>Recaps on device</Text>
            </LiquidGlass>
          </View>

          {connected.length > 0 && (
            <View style={styles.connectedList}>
              {connected.map(s => {
                const cfg = serviceById[s.id];
                if (!cfg) return null;
                return (
                  <View key={s.id} style={styles.connectedRow}>
                    <View style={[styles.connectedMark, { backgroundColor: cfg.color }]}>
                      <Text style={styles.connectedMarkText}>{cfg.mark}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.connectedName}>{cfg.name}</Text>
                      <Text style={styles.connectedTag}>{cfg.tagline}</Text>
                    </View>
                    <Text style={styles.connectedStatus}>Linked</Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <View style={{ height: 140 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Template card ─────────────────────────────────────────────
function TemplateCard({ template, onPress }: { template: Template; onPress: () => void }) {
  const bg = ACCENT_BG[template.accentKey] ?? 'rgba(255,255,255,0.38)';
  const fg = ACCENT_FG[template.accentKey] ?? colors.primary;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [pressed && styles.cardPressed]}
    >
      <LiquidGlass
        style={styles.templateCard}
        color={bg}
        effect="liquid"
        elevated
        intensity={88}
        tint="light"
        radius={radii.xl}
      >
        <View style={styles.templateTopRow}>
          <Text style={[styles.templateTag, { color: fg }]}>{template.tag.toUpperCase()}</Text>
          <Text style={[styles.templateCards, { color: fg }]}>
            ~{template.approxCards} cards
          </Text>
        </View>
        <View style={{ flex: 1 }} />
        <Text style={styles.templateName}>{template.name}</Text>
        <Text style={styles.templateBlurb}>{template.blurb}</Text>
        <View style={styles.templateFooter}>
          <View style={styles.templateDotsRow}>
            {template.services.slice(0, 5).map(sid => {
              const svc = serviceById[sid];
              if (!svc) return null;
              return <View key={sid} style={[styles.templateDot, { backgroundColor: svc.color }]} />;
            })}
            {template.services.length === 0 && (
              <Text style={styles.templateFooterMuted}>You choose</Text>
            )}
          </View>
          <Text style={[styles.templateGo, { color: fg }]}>Start →</Text>
        </View>
      </LiquidGlass>
    </Pressable>
  );
}

// ─── Recap row ─────────────────────────────────────────────────
function RecapRow({
  recap, onPress, isFirst,
}: { recap: RecapSummary; onPress: () => void; isFirst?: boolean }) {
  const fg = ACCENT_FG[recap.accentKey] ?? colors.primary;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.recapRow,
        isFirst && styles.recapRowFirst,
        pressed && styles.rowPressed,
      ]}
    >
      <View style={[styles.recapSwatch, { backgroundColor: fg }]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.recapTitle}>{recap.templateName}</Text>
        <Text style={styles.recapMeta}>
          {recap.cardCount} cards · {recap.services.length} app{recap.services.length === 1 ? '' : 's'} · {timeAgo(recap.createdAt)}
        </Text>
      </View>
      <Text style={styles.recapGo}>Play →</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: layout.screen,
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    flexGrow: 1,
  },
  confetti: {
    // Limited by bandHeight prop; sits behind scroll content.
  },
  confettiDeep: {
    // Sparse scatter extending down the whole scroll area.
    opacity: 0.7,
  },
  confettiBottom: {
    // Rich layer anchored in the lower ~60% of the viewport (templates, recaps, tab bar zone).
    opacity: 0.88,
  },

  // ─── Hero ────────────────────────────────────────────────────
  hero: {
    flex: 1,
    flexDirection: 'column',
    paddingTop: space.md,
    paddingBottom: space.xl,
    overflow: 'visible',
  },
  heroHeader: {
    flexShrink: 0,
  },
  /** Fills remaining hero height; centers the two CTAs as one block */
  heroCtaBand: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 0,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  wordmark: {
    ...type.title,
    color: colors.primary,
    letterSpacing: -0.4,
  },
  yearPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
  },
  yearPillText: {
    ...type.caption,
    color: colors.inverse,
    fontWeight: '700',
    letterSpacing: 1,
  },
  greeting: {
    ...type.displayXL,
    color: colors.primary,
    marginTop: space.xl,
    fontSize: 56,
    lineHeight: 64,
    letterSpacing: -2,
  },
  heroLede: {
    ...type.body,
    color: colors.secondary,
    marginTop: space.md,
    maxWidth: 360,
  },

  createStack: {
    alignSelf: 'stretch',
    gap: space.sm,
    marginTop: space.lg,
    marginBottom: -space.xl,
  },
  /** Matches wizard/index primary CTA + wrapped/end secondary CTA */
  heroPill: {
    width: '100%',
    height: 56,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroPillDark: {
    backgroundColor: colors.primary,
  },
  /** Mythical-loot vibe: epic purple → fuchsia → amber, subtle gold rim */
  heroPillMyth: {
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(245, 215, 122, 0.75)',
    shadowColor: '#7B2CBF',
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  heroPillPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
  heroPillTextDark: {
    ...type.bodyMedium,
    color: colors.inverse,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  heroPillTextMyth: {
    ...type.bodyMedium,
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 0.2,
    textShadowColor: 'rgba(30, 0, 60, 0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  // ─── Sections ────────────────────────────────────────────────
  section: {
    marginTop: space.xl,
  },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: space.md,
  },
  sectionEyebrow: {
    ...type.eyebrow,
    color: colors.primary,
  },
  sectionCaption: {
    ...type.caption,
    color: colors.tertiary,
  },
  sectionLink: {
    ...type.caption,
    color: colors.primary,
    fontWeight: '600',
  },

  // ─── Templates ───────────────────────────────────────────────
  /** Bleeds to screen edges so cards aren’t clipped inside padded content while scrolling */
  templateCarousel: {
    marginHorizontal: -space.lg,
  },
  templateRow: {
    paddingHorizontal: space.lg,
    gap: space.md,
  },
  templateCard: {
    width: TEMPLATE_CARD_W,
    height: 220,
    padding: space.lg,
    justifyContent: 'space-between',
  },
  templateTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  templateTag: {
    ...type.eyebrow,
    fontSize: 10,
    letterSpacing: 1.8,
  },
  templateCards: {
    ...type.caption,
    opacity: 0.7,
  },
  templateName: {
    ...type.displaySmall,
    color: colors.primary,
    fontSize: 28,
    lineHeight: 34,
  },
  templateBlurb: {
    ...type.bodySmall,
    color: colors.secondary,
    marginTop: 6,
  },
  templateFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space.md,
    paddingTop: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
  },
  templateDotsRow: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  templateDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  templateFooterMuted: {
    ...type.caption,
    color: colors.tertiary,
  },
  templateGo: {
    ...type.bodySmallMedium,
  },

  // ─── Recap list ──────────────────────────────────────────────
  recapList: {
    paddingHorizontal: space.md,
  },
  recapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
  },
  recapRowFirst: {
    borderTopWidth: 0,
  },
  rowPressed: {
    opacity: 0.6,
  },
  recapSwatch: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  recapTitle: {
    ...type.bodyMedium,
    color: colors.primary,
  },
  recapMeta: {
    ...type.caption,
    color: colors.tertiary,
    marginTop: 2,
  },
  recapGo: {
    ...type.bodySmallMedium,
    color: colors.primary,
  },
  recapFooter: {
    ...type.caption,
    color: colors.tertiary,
    textAlign: 'center',
    paddingVertical: space.md,
  },

  // ─── Placeholder ─────────────────────────────────────────────
  placeholder: {
    padding: space.lg,
    gap: space.sm,
  },
  placeholderTitle: {
    ...type.titleSmall,
    color: colors.primary,
  },
  placeholderBody: {
    ...type.bodySmall,
    color: colors.secondary,
  },
  placeholderCta: {
    alignSelf: 'flex-start',
    marginTop: space.sm,
    paddingHorizontal: space.md,
    paddingVertical: 10,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
  },
  placeholderCtaText: {
    ...type.bodySmallMedium,
    color: colors.inverse,
    fontWeight: '600',
  },

  // ─── Glance ──────────────────────────────────────────────────
  glanceRow: {
    flexDirection: 'row',
    gap: space.md,
  },
  glanceCard: {
    flex: 1,
    padding: space.lg,
  },
  glanceBig: {
    ...type.numeralMedium,
    fontSize: 60,
    lineHeight: 68,
    letterSpacing: -2.5,
    color: colors.primary,
  },
  glanceLabel: {
    ...type.caption,
    color: colors.tertiary,
    marginTop: 2,
  },
  glanceCaption: {
    ...type.bodySmall,
    color: colors.secondary,
    marginTop: space.sm,
  },

  connectedList: {
    marginTop: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
  },
  connectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  connectedMark: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectedMarkText: {
    color: colors.inverse,
    fontWeight: '700',
    fontSize: 14,
  },
  connectedName: {
    ...type.bodyMedium,
    color: colors.primary,
  },
  connectedTag: {
    ...type.caption,
    color: colors.tertiary,
    marginTop: 1,
  },
  connectedStatus: {
    ...type.caption,
    color: colors.mint,
    fontWeight: '600',
  },

  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
});
