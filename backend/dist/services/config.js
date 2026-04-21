import 'dotenv/config';
function isProductionLike() {
    return process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
}
export const appConfig = {
    isProductionLike: isProductionLike(),
    appSecret: process.env.APP_SECRET?.trim() || null,
    publicApiBaseUrl: process.env.PUBLIC_API_BASE_URL?.trim().replace(/\/+$/, '') || null,
    allowedRedirectUris: (process.env.ALLOWED_REDIRECT_URIS || 'wrapped://connected')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
    maxConcurrentSyncs: Math.max(1, Number.parseInt(process.env.MAX_CONCURRENT_SYNCS || '10', 10) || 10),
    syncWorkerPollMs: Math.max(250, Number.parseInt(process.env.SYNC_WORKER_POLL_MS || '1000', 10) || 1000),
    syncLeaseMs: Math.max(60_000, Number.parseInt(process.env.SYNC_LEASE_MS || '300000', 10) || 300_000),
    syncRetryBaseMs: Math.max(1_000, Number.parseInt(process.env.SYNC_RETRY_BASE_MS || '60000', 10) || 60_000),
};
export const syncServicePolicies = {
    spotify: { minIntervalMs: 2_000, maxConcurrency: 1 },
    strava: { minIntervalMs: 3_000, maxConcurrency: 1 },
    fitbit: { minIntervalMs: 4_000, maxConcurrency: 1 },
    lastfm: { minIntervalMs: 2_000, maxConcurrency: 1 },
    steam: { minIntervalMs: 2_000, maxConcurrency: 1 },
    apple_health: { minIntervalMs: 500, maxConcurrency: 1 },
};
export function requireConfiguredSecret() {
    if (!appConfig.appSecret) {
        throw new Error('APP_SECRET must be configured');
    }
    if (appConfig.isProductionLike && appConfig.appSecret === 'wrapped-dev-secret-change-in-prod') {
        throw new Error('APP_SECRET must not use the development default in production');
    }
    return appConfig.appSecret;
}
export function requirePublicApiBaseUrl() {
    if (!appConfig.publicApiBaseUrl) {
        throw new Error('PUBLIC_API_BASE_URL must be configured');
    }
    return appConfig.publicApiBaseUrl;
}
export function validateRedirectUri(redirectUri) {
    let parsed;
    try {
        parsed = new URL(redirectUri);
    }
    catch {
        return false;
    }
    return appConfig.allowedRedirectUris.some((allowed) => {
        if (allowed.endsWith('*')) {
            return redirectUri.startsWith(allowed.slice(0, -1));
        }
        try {
            const allowedUrl = new URL(allowed);
            return allowedUrl.protocol === parsed.protocol && allowedUrl.host === parsed.host && allowedUrl.pathname === parsed.pathname;
        }
        catch {
            return redirectUri === allowed;
        }
    });
}
