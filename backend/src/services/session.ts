import 'dotenv/config';

import crypto from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import { refreshSessions } from '../db/index.js';
import { requireConfiguredSecret } from './config.js';
import type { AuthenticatedContext } from '../types/index.js';

const ACCESS_TTL_SECONDS = 60 * 15;
const REFRESH_TTL_DAYS = 90;
const secret = new TextEncoder().encode(requireConfiguredSecret());

type AccessTokenClaims = {
  sub: string;
  installId: string;
  scope: 'access';
};

export async function signAccessToken(userId: string, installId: string) {
  const expiresAt = Math.floor(Date.now() / 1000) + ACCESS_TTL_SECONDS;
  const token = await new SignJWT({
    installId,
    scope: 'access',
  } satisfies Omit<AccessTokenClaims, 'sub'>)
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(secret);

  return {
    token,
    expiresAt: new Date(expiresAt * 1000).toISOString(),
  };
}

export async function verifyAccessToken(token: string): Promise<AuthenticatedContext | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    if (payload.scope !== 'access' || typeof payload.sub !== 'string' || typeof payload.installId !== 'string') {
      return null;
    }

    return {
      userId: payload.sub,
      installId: payload.installId,
    };
  } catch {
    return null;
  }
}

function hashRefreshToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function issueRefreshToken(userId: string, installId: string) {
  const token = crypto.randomBytes(48).toString('base64url');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TTL_DAYS);

  await refreshSessions.rotate(userId, installId, hashRefreshToken(token), expiresAt.toISOString());

  return {
    token,
    expiresAt: expiresAt.toISOString(),
  };
}

export function verifyRefreshToken(rawRefreshToken: string) {
  return refreshSessions.findActiveByHash(hashRefreshToken(rawRefreshToken));
}
