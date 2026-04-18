import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Haptics from 'expo-haptics';
import { colors, gradients, getServiceGradient } from '../lib/theme';
import type { ServiceInfo } from '../lib/api';

interface Props {
  service: ServiceInfo & {
    description?: string;
    color?: string;
  };
  onConnect: (id: string) => Promise<void>;
  onRevoke: (id: string) => Promise<void>;
  onSync?: (id: string) => Promise<void>;
}

export function ServiceCard({ service, onConnect, onRevoke, onSync }: Props) {
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const gradColors = getServiceGradient(service.id);

  async function handleConnect() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    try {
      // In production: call api.getAuthorizeUrl and open web browser
      // For demo: simulate a successful connect after a delay
      await new Promise(r => setTimeout(r, 1500));
      await onConnect(service.id);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleSync() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSyncing(true);
    try {
      await onSync?.(service.id);
    } finally {
      setSyncing(false);
    }
  }

  async function handleRevoke() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await onRevoke(service.id);
  }

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={[styles.iconWrap, { borderColor: gradColors[0] + '40' }]}>
          <Text style={styles.iconText}>{service.name.charAt(0)}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{service.name}</Text>
          {service.isConnected ? (
            <Text style={styles.statusConnected}>
              {service.lastSyncedAt
                ? `Synced ${new Date(service.lastSyncedAt).toLocaleDateString()}`
                : 'Connected'}
            </Text>
          ) : (
            <Text style={styles.status}>Not connected</Text>
          )}
        </View>
        <View style={styles.actions}>
          {!service.isConnected ? (
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: gradColors[0] + '30', borderColor: gradColors[0] }]}
              onPress={handleConnect}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={gradColors[0]} />
              ) : (
                <Text style={[styles.btnText, { color: gradColors[0] }]}>Connect</Text>
              )}
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.btnSmall, { backgroundColor: gradColors[0] + '20' }]}
                onPress={handleSync}
                disabled={syncing}
              >
                {syncing ? (
                  <ActivityIndicator size="small" color={gradColors[0]} />
                ) : (
                  <Text style={[styles.btnTextSmall, { color: gradColors[0] }]}>Sync</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnSmall, { backgroundColor: colors.danger + '20' }]}
                onPress={handleRevoke}
              >
                <Text style={[styles.btnTextSmall, { color: colors.danger }]}>Revoke</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  iconText: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primary,
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  status: {
    fontSize: 13,
    color: colors.secondary,
    marginTop: 2,
  },
  statusConnected: {
    fontSize: 13,
    color: colors.success,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  btn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 90,
    alignItems: 'center',
  },
  btnText: {
    fontWeight: '600',
    fontSize: 14,
  },
  btnSmall: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 60,
    alignItems: 'center',
  },
  btnTextSmall: {
    fontWeight: '600',
    fontSize: 12,
  },
});
