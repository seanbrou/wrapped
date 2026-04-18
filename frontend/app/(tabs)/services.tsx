import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../lib/theme';
import { ServiceCard } from '../../components/ServiceCard';
import { api, ServiceInfo } from '../../lib/api';
import { SERVICE_DETAILS, MOCK_WRAPPED } from '../../lib/mockData';
import { LoadingRing } from '../../components/LoadingRing';

export default function ServicesScreen() {
  const [services, setServices] = useState<ServiceInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  async function loadServices() {
    try {
      const data = await api.listServices();
      setServices(data);
    } catch {
      // Fall back to mock data for demo
      setServices(
        SERVICE_DETAILS.map(s => ({
          id: s.id,
          name: s.name,
          logoUrl: '',
          isConnected: MOCK_WRAPPED.services.includes(s.id),
          lastSyncedAt: MOCK_WRAPPED.services.includes(s.id) ? new Date().toISOString() : null,
        }))
      );
    }
  }

  useEffect(() => {
    loadServices().finally(() => setLoading(false));
  }, []);

  async function onRefresh() {
    setRefreshing(true);
    await loadServices();
    setRefreshing(false);
  }

  async function handleConnect(id: string) {
    setServices(prev =>
      prev.map(s => s.id === id ? { ...s, isConnected: true, lastSyncedAt: new Date().toISOString() } : s)
    );
  }

  async function handleRevoke(id: string) {
    try {
      await api.revokeService(id);
    } catch { /* ignore */ }
    setServices(prev =>
      prev.map(s => s.id === id ? { ...s, isConnected: false, lastSyncedAt: null } : s)
    );
  }

  async function handleSync(id: string) {
    try {
      await api.syncService(id);
    } catch { /* ignore */ }
  }

  const filtered = services.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  const connected = filtered.filter(s => s.isConnected);
  const available = filtered.filter(s => !s.isConnected);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Connect</Text>
        <Text style={styles.subtitle}>Link your accounts to build your Wrapped</Text>
        <View style={styles.searchWrap}>
          <TextInput
            style={styles.search}
            placeholder="Search services..."
            placeholderTextColor={colors.secondary}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {loading ? (
        <LoadingRing />
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accentPurple} />}
        >
          {connected.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Connected</Text>
              {connected.map(s => (
                <ServiceCard
                  key={s.id}
                  service={{ ...s, ...SERVICE_DETAILS.find(d => d.id === s.id) }}
                  onConnect={handleConnect}
                  onRevoke={handleRevoke}
                  onSync={handleSync}
                />
              ))}
            </View>
          )}

          {available.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Available</Text>
              {available.map(s => (
                <ServiceCard
                  key={s.id}
                  service={{ ...s, ...SERVICE_DETAILS.find(d => d.id === s.id) }}
                  onConnect={handleConnect}
                  onRevoke={handleRevoke}
                  onSync={handleSync}
                />
              ))}
            </View>
          )}
        </ScrollView>
      )}

      <View style={styles.privacyNote}>
        <Text style={styles.privacyText}>
          🔒 We store only aggregated stats, never your raw data
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
  searchWrap: {
    marginTop: 16,
  },
  search: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.primary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  privacyNote: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'center',
  },
  privacyText: {
    fontSize: 12,
    color: colors.muted,
  },
});
