import { Platform } from 'react-native';
import WrappedHealthKit from '../modules/wrapped-health-kit';

function ensureBridge() {
  if (Platform.OS !== 'ios') {
    throw new Error('Apple Health is only available on iOS');
  }
  if (!WrappedHealthKit?.isAvailable || !WrappedHealthKit?.requestAuthorization || !WrappedHealthKit?.syncSummary) {
    throw new Error('Apple Health native bridge is not available in this build');
  }
  if (!WrappedHealthKit.isAvailable()) {
    throw new Error('HealthKit is unavailable on this device');
  }
  return WrappedHealthKit;
}

export async function connectAppleHealth() {
  const healthKit = ensureBridge();
  const result = await healthKit.requestAuthorization();
  if (!result.granted) {
    throw new Error('Apple Health permission was not granted');
  }
  return {
    connected: true,
    lastSyncedAt: new Date().toISOString(),
  };
}

export async function syncAppleHealth(periodStart: string, periodEnd: string) {
  const healthKit = ensureBridge();
  return healthKit.syncSummary(periodStart, periodEnd);
}

export async function revokeAppleHealth() {
  if (!WrappedHealthKit?.revoke) return;
  await WrappedHealthKit.revoke();
}
