import crypto from 'node:crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { connectedServices, oauthRequests, syncJobs, users } from '../db/index.js';
import { getServiceAdapter, serviceAdapters } from '../plugins/index.js';
import { encryptToken } from '../services/anonymizer.js';
import { appConfig, requirePublicApiBaseUrl, validateRedirectUri } from '../services/config.js';
import { requireAuth } from '../services/requestAuth.js';
import { issueRefreshToken, signAccessToken, verifyRefreshToken } from '../services/session.js';
import { enqueueSyncJob } from '../services/syncQueue.js';
import type { ServiceId } from '../types/index.js';

const publicApiBaseUrl = requirePublicApiBaseUrl();

function callbackBaseUrlFor(service: string) {
  return `${publicApiBaseUrl}/api/oauth/${service}/callback`;
}

function appendParams(url: string, params: Record<string, string>) {
  const target = new URL(url);
  for (const [key, value] of Object.entries(params)) {
    target.searchParams.set(key, value);
  }
  return target.toString();
}

function htmlRedirect(url: string, message: string) {
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

function sendRedirect(reply: FastifyReply, url: string, message: string) {
  const protocol = new URL(url).protocol;
  if (protocol !== 'http:' && protocol !== 'https:') {
    return reply.redirect(url);
  }

  return reply.type('text/html').send(htmlRedirect(url, message));
}

function defaultAppRedirect(service: string, error?: string) {
  const target = new URL('wrapped://connected');
  target.searchParams.set('service', service);
  target.searchParams.set('status', error ? 'error' : 'connected');
  if (error) target.searchParams.set('error', error);
  return target.toString();
}

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post<{
    Body: { installId: string; platform?: string | null }
  }>('/session/bootstrap', async (request, reply) => {
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

  fastify.post<{
    Body: { installId: string; refreshToken: string }
  }>('/session/refresh', async (request, reply) => {
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
    if (!auth) return;

    const connected = new Map(
      (await connectedServices.list(auth.userId)).map((service) => [service.service, service]),
    );

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

  fastify.post<{
    Params: { service: string };
    Body: { redirectUri?: string }
  }>('/services/:service/connect/start', async (request, reply) => {
    const auth = await requireAuth(request, reply);
    if (!auth) return;

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

  fastify.get<{ Params: { service: string } }>('/oauth/:service/callback', async (request, reply) => {
    const adapter = getServiceAdapter(request.params.service);
    if (!adapter?.connect) {
      return reply.status(404).send({ error: `Unknown service: ${request.params.service}` });
    }

    const query = request.query as Record<string, string | undefined>;
    const lookupKey = query.state || query.token;
    const oauthRequest = lookupKey
      ? await oauthRequests.findByLookup(adapter.id, lookupKey)
      : null;

    if (query.error) {
      const redirectUri = oauthRequest?.redirectUri ?? defaultAppRedirect(adapter.id, query.error);
      if (oauthRequest) await oauthRequests.delete(oauthRequest.id);
      return sendRedirect(
        reply,
        appendParams(redirectUri, {
          service: adapter.id,
          status: 'error',
          error: query.error,
        }),
        'Connection canceled.',
      );
    }

    if (!oauthRequest) {
      return sendRedirect(reply, defaultAppRedirect(adapter.id, 'expired_state'), 'Connection expired.');
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

      return sendRedirect(reply, redirectUri, 'Connection complete.');
    } catch (error) {
      await oauthRequests.delete(oauthRequest.id);
      const redirectUri = appendParams(oauthRequest.redirectUri, {
        service: adapter.id,
        status: 'error',
        error: 'oauth_failed',
      });
      return sendRedirect(reply, redirectUri, 'Connection failed.');
    }
  });

  fastify.delete<{ Params: { service: string } }>('/services/:service', async (request, reply) => {
    const auth = await requireAuth(request, reply);
    if (!auth) return;

    const adapter = getServiceAdapter(request.params.service);
    if (!adapter) {
      return reply.status(404).send({ error: `Unknown service: ${request.params.service}` });
    }

    await connectedServices.revoke(auth.userId, adapter.id);
    return { data: { revoked: true, service: adapter.id } };
  });

  fastify.post<{
    Params: { service: string };
    Body: { periodStart?: string; periodEnd?: string }
  }>('/services/:service/sync', async (request, reply) => {
    const auth = await requireAuth(request, reply);
    if (!auth) return;

    const adapter = getServiceAdapter(request.params.service);
    if (!adapter?.sync) {
      return reply.status(409).send({ error: 'This service cannot be synced from the backend.' });
    }

    const connection = await connectedServices.get(auth.userId, adapter.id);
    if (!connection) {
      return reply.status(400).send({ error: 'Service not connected' });
    }

    const periodEnd = request.body?.periodEnd ? new Date(request.body.periodEnd) : new Date();
    const periodStart = request.body?.periodStart
      ? new Date(request.body.periodStart)
      : new Date(periodEnd.getFullYear() - 1, periodEnd.getMonth(), periodEnd.getDate());

    const job = await enqueueSyncJob({
      userId: auth.userId,
      service: adapter.id,
      periodStart: periodStart.toISOString().slice(0, 10),
      periodEnd: periodEnd.toISOString().slice(0, 10),
    });

    return {
      data: {
        queued: true,
        job,
      },
    };
  });

  fastify.get<{ Params: { jobId: string } }>('/sync-jobs/:jobId', async (request, reply) => {
    const auth = await requireAuth(request, reply);
    if (!auth) return;

    const job = await syncJobs.getForUser(request.params.jobId, auth.userId);
    if (!job) {
      return reply.status(404).send({ error: 'Sync job not found' });
    }

    return { data: job };
  });

  fastify.get('/sync-jobs', async (request, reply) => {
    const auth = await requireAuth(request, reply);
    if (!auth) return;

    const jobs = await syncJobs.listForUser(auth.userId, 20);
    return { data: jobs };
  });
}
