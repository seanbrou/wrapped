import crypto from 'node:crypto';
import { aggregatedStats, connectedServices, oauthRequests, syncLogs, users } from '../db/index.js';
import { getServiceAdapter, serviceAdapters } from '../plugins/index.js';
import { decryptToken, encryptToken } from '../services/anonymizer.js';
import { appConfig, requirePublicApiBaseUrl, validateRedirectUri } from '../services/config.js';
import { requireAuth } from '../services/requestAuth.js';
import { issueRefreshToken, signAccessToken, verifyRefreshToken } from '../services/session.js';
const publicApiBaseUrl = requirePublicApiBaseUrl();
function callbackBaseUrlFor(service) {
    return `${publicApiBaseUrl}/api/oauth/${service}/callback`;
}
let activeSyncs = 0;
const pendingSyncWaiters = [];
async function acquireSyncSlot() {
    if (activeSyncs < appConfig.maxConcurrentSyncs) {
        activeSyncs += 1;
        return;
    }
    await new Promise((resolve) => {
        pendingSyncWaiters.push(() => {
            activeSyncs += 1;
            resolve();
        });
    });
}
function releaseSyncSlot() {
    activeSyncs = Math.max(0, activeSyncs - 1);
    const next = pendingSyncWaiters.shift();
    if (next)
        next();
}
function appendParams(url, params) {
    const target = new URL(url);
    for (const [key, value] of Object.entries(params)) {
        target.searchParams.set(key, value);
    }
    return target.toString();
}
function htmlRedirect(url, message) {
    return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Wrapped</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: #0A0A0F;
        color: white;
        font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif;
      }
      .shell {
        display: grid;
        gap: 14px;
        justify-items: center;
      }
      .spinner {
        width: 32px;
        height: 32px;
        border: 3px solid rgba(255,255,255,0.15);
        border-top-color: white;
        border-radius: 999px;
        animation: spin 1s linear infinite;
      }
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      p { margin: 0; opacity: 0.8; }
    </style>
  </head>
  <body>
    <div class="shell">
      <div class="spinner"></div>
      <p>${message}</p>
    </div>
    <script>
      window.location.replace(${JSON.stringify(url)});
      setTimeout(function () {
        document.querySelector('.spinner').style.display = 'none';
        document.querySelector('p').textContent = 'You can close this tab and return to Wrapped.';
      }, 1500);
    </script>
  </body>
</html>`;
}
function defaultAppRedirect(service, error) {
    const target = new URL('wrapped://connected');
    target.searchParams.set('service', service);
    target.searchParams.set('status', error ? 'error' : 'connected');
    if (error)
        target.searchParams.set('error', error);
    return target.toString();
}
export async function authRoutes(fastify) {
    fastify.post('/session/bootstrap', async (request, reply) => {
        const installId = request.body?.installId?.trim();
        if (!installId) {
            return reply.status(400).send({ error: 'installId is required' });
        }
        const user = await users.getOrCreateByInstall(installId, request.body.platform);
        const access = await signAccessToken(user.id, installId);
        const refresh = await issueRefreshToken(user.id, installId);
        return {
            data: {
                userId: user.id,
                installId,
                accessToken: access.token,
                accessTokenExpiresAt: access.expiresAt,
                refreshToken: refresh.token,
                refreshTokenExpiresAt: refresh.expiresAt,
            },
        };
    });
    fastify.post('/session/refresh', async (request, reply) => {
        const installId = request.body?.installId?.trim();
        const refreshToken = request.body?.refreshToken?.trim();
        if (!installId || !refreshToken) {
            return reply.status(400).send({ error: 'installId and refreshToken are required' });
        }
        const refreshSession = await verifyRefreshToken(refreshToken);
        if (!refreshSession || refreshSession.install_id !== installId) {
            return reply.status(401).send({ error: 'Refresh session expired' });
        }
        const access = await signAccessToken(refreshSession.user_id, installId);
        const refresh = await issueRefreshToken(refreshSession.user_id, installId);
        return {
            data: {
                userId: refreshSession.user_id,
                installId,
                accessToken: access.token,
                accessTokenExpiresAt: access.expiresAt,
                refreshToken: refresh.token,
                refreshTokenExpiresAt: refresh.expiresAt,
            },
        };
    });
    fastify.get('/services', async (request, reply) => {
        const auth = await requireAuth(request, reply);
        if (!auth)
            return;
        const connected = new Map((await connectedServices.list(auth.userId)).map((service) => [service.service, service]));
        const services = Object.values(serviceAdapters).map((service) => {
            const connection = connected.get(service.id);
            return {
                id: service.id,
                name: service.name,
                logoUrl: service.logoUrl,
                isConnected: Boolean(connection),
                lastSyncedAt: connection?.lastSyncedAt ?? null,
                connectionKind: service.connectionKind,
                isAvailable: service.supported,
                localOnly: Boolean(service.localOnly),
                disabledReason: service.disabledReason ?? null,
            };
        });
        return { data: services };
    });
    fastify.post('/services/:service/connect/start', async (request, reply) => {
        const auth = await requireAuth(request, reply);
        if (!auth)
            return;
        const adapter = getServiceAdapter(request.params.service);
        if (!adapter) {
            return reply.status(404).send({ error: `Unknown service: ${request.params.service}` });
        }
        if (adapter.localOnly) {
            return {
                data: {
                    service: adapter.id,
                    localOnly: true,
                },
            };
        }
        if (!adapter.supported || !adapter.connect) {
            return reply.status(409).send({
                error: adapter.disabledReason ?? 'This integration is not available in v1.',
            });
        }
        await oauthRequests.cleanupExpired();
        const requestId = crypto.randomUUID();
        const callbackBaseUrl = callbackBaseUrlFor(adapter.id);
        const redirectUri = request.body?.redirectUri?.trim() || defaultAppRedirect(adapter.id);
        if (!validateRedirectUri(redirectUri)) {
            return reply.status(400).send({ error: 'redirectUri is not allowed' });
        }
        const start = await adapter.connect.start({
            requestId,
            redirectUri,
            callbackBaseUrl,
        });
        const lookupKey = start.lookupKey ?? requestId;
        await oauthRequests.create({
            lookupKey,
            userId: auth.userId,
            installId: auth.installId,
            service: adapter.id,
            redirectUri,
            metadata: start.metadata,
            expiresAtIso: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        });
        return {
            data: {
                service: adapter.id,
                url: start.url,
                redirectUri,
                localOnly: false,
            },
        };
    });
    fastify.get('/oauth/:service/callback', async (request, reply) => {
        const adapter = getServiceAdapter(request.params.service);
        if (!adapter?.connect) {
            return reply.status(404).send({ error: `Unknown service: ${request.params.service}` });
        }
        const query = request.query;
        const lookupKey = query.state || query.token;
        const oauthRequest = lookupKey
            ? await oauthRequests.findByLookup(adapter.id, lookupKey)
            : null;
        if (query.error) {
            const redirectUri = oauthRequest?.redirectUri ?? defaultAppRedirect(adapter.id, query.error);
            if (oauthRequest)
                await oauthRequests.delete(oauthRequest.id);
            return reply.type('text/html').send(htmlRedirect(appendParams(redirectUri, {
                service: adapter.id,
                status: 'error',
                error: query.error,
            }), 'Connection canceled.'));
        }
        if (!oauthRequest) {
            return reply.type('text/html').send(htmlRedirect(defaultAppRedirect(adapter.id, 'expired_state'), 'Connection expired.'));
        }
        try {
            const callbackBaseUrl = callbackBaseUrlFor(adapter.id);
            const tokens = await adapter.connect.finish({
                lookupKey: oauthRequest.lookupKey,
                redirectUri: oauthRequest.redirectUri,
                callbackBaseUrl,
                params: query,
                metadata: oauthRequest.metadata,
            });
            await connectedServices.upsert({
                userId: oauthRequest.userId,
                service: adapter.id,
                externalAccountId: tokens.externalAccountId ?? null,
                accessTokenEncrypted: tokens.accessToken ? encryptToken(tokens.accessToken) : null,
                refreshTokenEncrypted: tokens.refreshToken ? encryptToken(tokens.refreshToken) : null,
                tokenType: tokens.tokenType ?? null,
                scope: tokens.scope ?? null,
                expiresAt: tokens.expiresAt ?? null,
                metadata: tokens.metadata ?? {},
            });
            await oauthRequests.delete(oauthRequest.id);
            const redirectUri = appendParams(oauthRequest.redirectUri, {
                service: adapter.id,
                status: 'connected',
            });
            return reply.type('text/html').send(htmlRedirect(redirectUri, 'Connection complete.'));
        }
        catch (error) {
            await oauthRequests.delete(oauthRequest.id);
            const redirectUri = appendParams(oauthRequest.redirectUri, {
                service: adapter.id,
                status: 'error',
                error: 'oauth_failed',
            });
            return reply.type('text/html').send(htmlRedirect(redirectUri, 'Connection failed.'));
        }
    });
    fastify.delete('/services/:service', async (request, reply) => {
        const auth = await requireAuth(request, reply);
        if (!auth)
            return;
        const adapter = getServiceAdapter(request.params.service);
        if (!adapter) {
            return reply.status(404).send({ error: `Unknown service: ${request.params.service}` });
        }
        await connectedServices.revoke(auth.userId, adapter.id);
        return { data: { revoked: true, service: adapter.id } };
    });
    fastify.post('/services/:service/sync', async (request, reply) => {
        const auth = await requireAuth(request, reply);
        if (!auth)
            return;
        const adapter = getServiceAdapter(request.params.service);
        if (!adapter?.sync) {
            return reply.status(409).send({ error: 'This service cannot be synced from the backend.' });
        }
        const connection = await connectedServices.get(auth.userId, adapter.id);
        if (!connection) {
            return reply.status(400).send({ error: 'Service not connected' });
        }
        let accessToken = connection.accessTokenEncrypted ? decryptToken(connection.accessTokenEncrypted) : null;
        let refreshToken = connection.refreshTokenEncrypted ? decryptToken(connection.refreshTokenEncrypted) : null;
        if (adapter.refresh &&
            refreshToken &&
            connection.expiresAt &&
            connection.expiresAt <= Date.now() + 60_000) {
            const refreshed = await adapter.refresh(refreshToken, connection.metadata);
            accessToken = refreshed.accessToken;
            refreshToken = refreshed.refreshToken ?? refreshToken;
            await connectedServices.upsert({
                userId: auth.userId,
                service: adapter.id,
                externalAccountId: refreshed.externalAccountId ?? connection.externalAccountId,
                accessTokenEncrypted: accessToken ? encryptToken(accessToken) : null,
                refreshTokenEncrypted: refreshToken ? encryptToken(refreshToken) : null,
                tokenType: refreshed.tokenType ?? connection.tokenType,
                scope: refreshed.scope ?? connection.scope,
                expiresAt: refreshed.expiresAt ?? connection.expiresAt,
                metadata: refreshed.metadata ?? connection.metadata,
            });
        }
        const periodEnd = request.body?.periodEnd ? new Date(request.body.periodEnd) : new Date();
        const periodStart = request.body?.periodStart
            ? new Date(request.body.periodStart)
            : new Date(periodEnd.getFullYear() - 1, periodEnd.getMonth(), periodEnd.getDate());
        await acquireSyncSlot();
        try {
            const stats = await adapter.sync({
                accessToken,
                refreshToken,
                externalAccountId: connection.externalAccountId,
                connectionMetadata: connection.metadata,
                periodStart,
                periodEnd,
            });
            await aggregatedStats.upsert({
                userId: auth.userId,
                service: adapter.id,
                periodStart: stats.period.start,
                periodEnd: stats.period.end,
                data: stats.aggregates,
            });
            await connectedServices.markSynced(auth.userId, adapter.id);
            await syncLogs.create({
                userId: auth.userId,
                service: adapter.id,
                status: 'success',
                periodStart: stats.period.start,
                periodEnd: stats.period.end,
            });
            return { data: { synced: true, stats } };
        }
        catch (error) {
            await syncLogs.create({
                userId: auth.userId,
                service: adapter.id,
                status: 'error',
                message: String(error),
            });
            return reply.status(500).send({ error: `Failed to sync ${adapter.name}` });
        }
        finally {
            releaseSyncSlot();
        }
    });
}
