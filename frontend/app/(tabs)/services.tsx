import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Animated,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { colors, typography, spacing, radii, shadows, serviceColors } from '../../lib/theme';
import { api, ServiceInfo } from '../../lib/api';
import { SERVICE_DETAILS } from '../../lib/mockData';
import { LoadingRing } from '../../components/LoadingRing';

const SERVICES: (typeof SERVICE_DETAILS[number] & { gradient: readonly [string, string] })[] = [
  { id: 'spotify', name: 'Spotify', emoji: '🎧', description: 'Music, podcasts, listening history', color: '#1DB954', gradient: ['#1DB954', '#1ED760'] as const },
  { id: 'apple_health', name: 'Apple Health', emoji: '❤️', description: 'Steps, workouts, sleep data', color: '#A8A8A8', gradient: ['#FF6B6B', '#FF8E8E'] as const },
  { id: 'strava', name: 'Strava', emoji: '🏃', description: 'Runs, rides, activity stats', color: '#FC4C02', gradient: ['#FC4C02', '#FF6B35'] as const },
  { id: 'goodreads', name: 'Goodreads', emoji: '📚', description: 'Books read, pages, genres', color: '#C8B882', gradient: ['#C8B882', '#F4F1EA'] as const },
  { id: 'steam', name: 'Steam', emoji: '🎮', description: 'Games played, hours, achievements', color: '#66C0F4', gradient: ['#1B2838', '#66C0F4'] as const },
];

export default function ServicesScreen() {
  const router = useRouter();
  const [connected, setConnected] = useState<Set<string>>(new Set());
  const [connecting, setConnecting] = useState<string | null>(null);
  const [services, setServices] = useState<ServiceInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const cardAnims = React.useRef<Animated.Value[]>(SERVICES.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.stagger(80, cardAnims.map(anim =>
      Animated.spring(anim, { toValue: 1, damping: 12, stiffness: 80, useNativeDriver: true })
    )).start();
  }, []);

  useEffect(() => {
    api.listServices()
      .then(data => {
        setServices(data);
        setConnected(new Set(data.filter(s => s.isConnected).map(s => s.id)));
      })
      .catch(() => {
        setServices(SERVICES.map(s => ({
          id: s.id, name: s.name, logoUrl: '', isConnected: false, lastSyncedAt: '',
        })));
      })
      .finally(() => setLoading(false));
  }, []);

  async function onRefresh() {
    setRefreshing(true);
    try {
      const data = await api.listServices();
      setServices(data);
      setConnected(new Set(data.filter(s => s.isConnected).map(s => s.id)));
    } finally {
      setRefreshing(false);
    }
  }

  async function handleConnect(id: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setConnecting(id);
    try {
      await api.connectService(id);
      setConnected(prev => new Set([...prev, id]));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // Demo: toggle state anyway
      setConnected(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setConnecting(null);
  }

  const connectedCount = connected.size;

  if (loading) return <LoadingRing />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accentFuchsia} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Connect</Text>
          <Text style={styles.subtitle}>Link your accounts to build your Wrapped</Text>
        </View>

        {/* Service Grid */}
        <View style={styles.grid}>
          {SERVICES.map((svc, i) => {
            const isConnected = connected.has(svc.id);
            const isConnecting = connecting === svc.id;
            return (
              <Animated.View
                key={svc.id}
                style={[
                  styles.cardWrapper,
                  {
                    opacity: cardAnims[i],
                    transform: [
                      { scale: cardAnims[i].interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) },
                      { translateY: cardAnims[i].interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) },
                    ],
                  },
                ]}
              >
                <View style={[styles.card, isConnected && styles.cardConnected]}>
                  {/* Accent stripe */}
                  <View style={[styles.accentStripe, { backgroundColor: svc.color }]} />

                  {/* Emoji */}
                  <Text style={styles.cardEmoji}>{svc.emoji}</Text>

                  {/* Name */}
                  <Text style={styles.cardName}>{svc.name}</Text>

                  {/* Description */}
                  <Text style={styles.cardDesc}>{svc.description}</Text>

                  {/* Connect button */}
                  <TouchableOpacity
                    style={[
                      styles.connectBtn,
                      isConnected && styles.connectBtnConnected,
                    ]}
                    onPress={() => handleConnect(svc.id)}
                    disabled={isConnecting}
                    activeOpacity={0.7}
                  >
                    {isConnecting ? (
                      <View style={styles.connectingDot} />
                    ) : isConnected ? (
                      <Text style={styles.connectBtnTextConnected}>✓ Connected</Text>
                    ) : (
                      <Text style={styles.connectBtnText}>Connect</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </Animated.View>
            );
          })}
        </View>
      </ScrollView>

      {/* Bottom banner */}
      {connectedCount > 0 && (
        <View style={styles.banner}>
          <Text style={styles.bannerEmoji}>⚡</Text>
          <Text style={styles.bannerText}>
            {connectedCount} of {SERVICES.length} services connected
          </Text>
          <Pressable onPress={() => router.push('/(tabs)/dashboard')}>
            <Text style={styles.bannerAction}>Build Wrapped →</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const CARD_WIDTH = '47%';

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
    paddingBottom: 100,
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.h1,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.secondary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  cardWrapper: {
    width: CARD_WIDTH,
  },
  card: {
    backgroundColor: colors.glassFill,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.glassStroke,
    padding: spacing.lg,
    paddingTop: spacing.md + 4,
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  cardConnected: {
    borderColor: 'rgba(0, 230, 118, 0.2)',
    backgroundColor: 'rgba(0, 230, 118, 0.03)',
  },
  accentStripe: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
  },
  cardEmoji: {
    fontSize: 36,
    marginBottom: spacing.sm,
  },
  cardName: {
    ...typography.h3,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  cardDesc: {
    ...typography.caption,
    color: colors.secondary,
    textAlign: 'center',
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  connectBtn: {
    backgroundColor: 'rgba(224, 64, 251, 0.12)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: 'rgba(224, 64, 251, 0.3)',
  },
  connectBtnConnected: {
    backgroundColor: 'rgba(0, 230, 118, 0.1)',
    borderColor: 'rgba(0, 230, 118, 0.3)',
  },
  connectBtnText: {
    ...typography.caption,
    color: colors.accentFuchsia,
    fontWeight: '700',
    letterSpacing: 1,
  },
  connectBtnTextConnected: {
    ...typography.caption,
    color: colors.success,
    fontWeight: '700',
    letterSpacing: 1,
  },
  connectingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accentFuchsia,
  },
  banner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  bannerEmoji: {
    fontSize: 16,
  },
  bannerText: {
    ...typography.caption,
    color: colors.secondary,
    flex: 1,
  },
  bannerAction: {
    ...typography.caption,
    color: colors.accentFuchsia,
    fontWeight: '700',
  },
});