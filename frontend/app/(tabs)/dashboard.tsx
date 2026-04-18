import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { colors } from '../../lib/theme';
import { api, ServiceInfo } from '../../lib/api';
import { MOCK_WRAPPED, SERVICE_DETAILS, PERIODS } from '../../lib/mockData';
import { LoadingRing } from '../../components/LoadingRing';

export default function DashboardScreen() {
  const router = useRouter();
  const [services, setServices] = useState<ServiceInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedServices, setSelectedServices] = useState<string[]>(['spotify', 'apple_health', 'strava', 'goodreads', 'steam']);
  const [period, setPeriod] = useState('year');
  const [generating, setGenerating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  React.useEffect(() => {
    api.listServices()
      .then(data => {
        setServices(data);
        setSelectedServices(data.filter((s: ServiceInfo) => s.isConnected).map((s: ServiceInfo) => s.id));
      })
      .catch(() => {
        setServices(
          SERVICE_DETAILS.map(s => ({
            id: s.id,
            name: s.name,
            logoUrl: '',
            isConnected: true,
            lastSyncedAt: new Date().toISOString(),
          }))
        );
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
    setGenerating(true);
    try {
      const result = await api.generateWrapped(selectedServices);
      router.push(`/wrapped/${result.sessionId}`);
    } catch {
      // Use mock data for demo
      router.push(`/wrapped/${MOCK_WRAPPED.id}`);
    }
  }

  const connectedServices = services.filter(s => s.isConnected);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>My Wrapped</Text>
        <Text style={styles.subtitle}>Select services and generate your recap</Text>
      </View>

      {loading ? (
        <LoadingRing />
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accentPurple} />}
        >
          {/* Connected Services */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Services</Text>
            {connectedServices.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No services connected yet.</Text>
                <TouchableOpacity onPress={() => router.replace('/(tabs)/services')}>
                  <Text style={styles.linkText}>Go connect some →</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.serviceGrid}>
                {services.map(s => {
                  if (!s.isConnected) return null;
                  const detail = SERVICE_DETAILS.find(d => d.id === s.id);
                  return (
                    <TouchableOpacity
                      key={s.id}
                      style={[
                        styles.servicePill,
                        selectedServices.includes(s.id) && styles.servicePillActive,
                      ]}
                      onPress={() => toggleService(s.id)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.serviceDot, { backgroundColor: detail?.color || colors.accentPurple }]} />
                      <Text style={[styles.servicePillText, selectedServices.includes(s.id) && styles.servicePillTextActive]}>
                        {s.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          {/* Period Selector */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Time Period</Text>
            <View style={styles.periodRow}>
              {PERIODS.map(p => (
                <TouchableOpacity
                  key={p.value}
                  style={[styles.periodBtn, period === p.value && styles.periodBtnActive]}
                  onPress={() => setPeriod(p.value)}
                >
                  <Text style={[styles.periodBtnText, period === p.value && styles.periodBtnTextActive]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Preview card count */}
          {selectedServices.length > 0 && (
            <View style={styles.previewCard}>
              <Text style={styles.previewText}>
                ✨ Your recap will have ~{selectedServices.length * 3} cards
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Generate Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.generateBtn, selectedServices.length === 0 && styles.generateBtnDisabled]}
          onPress={handleGenerate}
          disabled={selectedServices.length === 0 || generating}
          activeOpacity={0.8}
        >
          <Text style={styles.generateBtnText}>
            {generating ? 'Generating...' : 'Generate My Wrapped'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.primary,
  },
  subtitle: {
    fontSize: 15,
    color: colors.secondary,
    marginTop: 4,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    gap: 24,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  serviceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  servicePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  servicePillActive: {
    backgroundColor: colors.accentPurple + '25',
    borderColor: colors.accentPurple,
  },
  serviceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  servicePillText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.secondary,
  },
  servicePillTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  periodRow: {
    flexDirection: 'row',
    gap: 8,
  },
  periodBtn: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  periodBtnActive: {
    backgroundColor: colors.accentPurple + '20',
    borderColor: colors.accentPurple,
  },
  periodBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.secondary,
  },
  periodBtnTextActive: {
    color: colors.accentPurple,
  },
  previewCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  previewText: {
    fontSize: 14,
    color: colors.secondary,
  },
  emptyState: {
    alignItems: 'center',
    padding: 24,
    gap: 8,
  },
  emptyText: {
    fontSize: 15,
    color: colors.secondary,
  },
  linkText: {
    fontSize: 15,
    color: colors.accentPurple,
    fontWeight: '600',
  },
  footer: {
    padding: 20,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  generateBtn: {
    backgroundColor: colors.accentPurple,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  generateBtnDisabled: {
    backgroundColor: colors.muted,
  },
  generateBtnText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#fff',
  },
});
