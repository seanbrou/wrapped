import Constants from 'expo-constants';

type ExpoExtra = {
  apiBaseUrl?: string;
};

export function getApiBaseUrl() {
  const extra = (Constants.expoConfig?.extra ?? {}) as ExpoExtra;
  return process.env.EXPO_PUBLIC_API_BASE_URL ?? extra.apiBaseUrl ?? 'http://localhost:3000';
}
