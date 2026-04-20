import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { getSessionSnapshot, saveSessionSnapshot } from './localStore';
import { getApiBaseUrl } from './runtime';

const KEYS = {
  installId: 'wrapped.installId',
  accessToken: 'wrapped.accessToken',
  refreshToken: 'wrapped.refreshToken',
  userId: 'wrapped.userId',
  accessTokenExpiresAt: 'wrapped.accessTokenExpiresAt',
  refreshTokenExpiresAt: 'wrapped.refreshTokenExpiresAt',
} as const;

export type SessionState = {
  installId: string;
  userId: string;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
  refreshTokenExpiresAt: string;
};

let sessionPromise: Promise<SessionState> | null = null;

async function getInstallId() {
  let installId = await SecureStore.getItemAsync(KEYS.installId);
  if (!installId) {
    installId = Crypto.randomUUID();
    await SecureStore.setItemAsync(KEYS.installId, installId);
  }
  return installId;
}

async function readSession(): Promise<SessionState | null> {
  const installId = await getInstallId();
  const [accessToken, refreshToken, userId, accessTokenExpiresAt, refreshTokenExpiresAt] = await Promise.all([
    SecureStore.getItemAsync(KEYS.accessToken),
    SecureStore.getItemAsync(KEYS.refreshToken),
    SecureStore.getItemAsync(KEYS.userId),
    SecureStore.getItemAsync(KEYS.accessTokenExpiresAt),
    SecureStore.getItemAsync(KEYS.refreshTokenExpiresAt),
  ]);

  if (accessToken && refreshToken && userId && accessTokenExpiresAt && refreshTokenExpiresAt) {
    return {
      installId,
      userId,
      accessToken,
      refreshToken,
      accessTokenExpiresAt,
      refreshTokenExpiresAt,
    };
  }

  const snapshot = await getSessionSnapshot(installId);
  if (!snapshot) return null;
  return null;
}

async function persistSession(session: SessionState) {
  await Promise.all([
    SecureStore.setItemAsync(KEYS.installId, session.installId),
    SecureStore.setItemAsync(KEYS.userId, session.userId),
    SecureStore.setItemAsync(KEYS.accessToken, session.accessToken),
    SecureStore.setItemAsync(KEYS.refreshToken, session.refreshToken),
    SecureStore.setItemAsync(KEYS.accessTokenExpiresAt, session.accessTokenExpiresAt),
    SecureStore.setItemAsync(KEYS.refreshTokenExpiresAt, session.refreshTokenExpiresAt),
    saveSessionSnapshot({
      installId: session.installId,
      userId: session.userId,
      accessTokenExpiresAt: session.accessTokenExpiresAt,
      refreshTokenExpiresAt: session.refreshTokenExpiresAt,
    }),
  ]);
}

function isExpired(isoDate: string, skewMs = 30_000) {
  return Date.parse(isoDate) <= Date.now() + skewMs;
}

async function bootstrap() {
  const installId = await getInstallId();
  const response = await fetch(`${getApiBaseUrl()}/api/session/bootstrap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      installId,
      platform: Platform.OS,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to bootstrap session');
  }

  const payload = (await response.json()) as {
    data: {
      userId: string;
      installId: string;
      accessToken: string;
      refreshToken: string;
      accessTokenExpiresAt: string;
      refreshTokenExpiresAt: string;
    };
  };

  const session: SessionState = payload.data;
  await persistSession(session);
  return session;
}

async function refresh(current: SessionState) {
  const response = await fetch(`${getApiBaseUrl()}/api/session/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      installId: current.installId,
      refreshToken: current.refreshToken,
    }),
  });

  if (!response.ok) {
    return bootstrap();
  }

  const payload = (await response.json()) as {
    data: SessionState;
  };
  const session = payload.data;
  await persistSession(session);
  return session;
}

export async function ensureSession(forceRefresh = false) {
  if (!sessionPromise || forceRefresh) {
    sessionPromise = (async () => {
      const current = await readSession();
      if (!current) {
        return bootstrap();
      }

      if (forceRefresh || isExpired(current.accessTokenExpiresAt)) {
        if (!isExpired(current.refreshTokenExpiresAt, 0)) {
          return refresh(current);
        }
        return bootstrap();
      }

      return current;
    })();
  }

  try {
    return await sessionPromise;
  } finally {
    sessionPromise = null;
  }
}

export async function clearSession() {
  sessionPromise = null;
  await Promise.all([
    SecureStore.deleteItemAsync(KEYS.accessToken),
    SecureStore.deleteItemAsync(KEYS.refreshToken),
    SecureStore.deleteItemAsync(KEYS.userId),
    SecureStore.deleteItemAsync(KEYS.accessTokenExpiresAt),
    SecureStore.deleteItemAsync(KEYS.refreshTokenExpiresAt),
  ]);
}
