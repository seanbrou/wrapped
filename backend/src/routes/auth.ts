import type { FastifyInstance } from 'fastify';
import { spotifyPlugin, stravaPlugin, goodreadsPlugin, steamPlugin, appleHealthPlugin } from '../plugins/index.js';
import { connectedServices, users } from '../db/index.js';
import { encryptToken, decryptToken } from '../services/anonymizer.js';

const PLUGINS = {
  spotify: spotifyPlugin,
  strava: stravaPlugin,
  goodreads: goodreadsPlugin,
  steam: steamPlugin,
  apple_health: appleHealthPlugin,
} as const;

type ServiceId = keyof typeof PLUGINS;

// ── Helpers ──────────────────────────────────────────────────────────────────

function mobileRedirectUrl(service: string, success = true, error?: string): string {
  const params = new URLSearchParams({ service });
  if (success) params.set('status', 'connected');
  if (error) params.set('error', error);
  // Custom URI scheme for expo-web-browser — the app registers wrapped://
  return `wrapped://connected?${params}`;
}

function htmlRedirect(url: string, service: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Wrapped — Connecting ${service}...</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #0A0A0F;
      color: #fff;
      font-family: -apple-system, system-ui, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      flex-direction: column;
      gap: 16px;
    }
    .logo { font-size: 32px; font-weight: 800; background: linear-gradient(135deg, #6C5CE7, #00D4FF); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .status { color: #8A8A9A; font-size: 14px; }
    .spinner { width: 32px; height: 32px; border: 3px solid #1E1E2E; border-top-color: #6C5CE7; border-radius: 50%; animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="logo">Wrapped</div>
  <div class="spinner"></div>
  <div class="status">Connecting to ${service}...</div>
  <script>
    // Try native app redirect first, fall back to close
    window.location.replace(${JSON.stringify(url)});
    // Fallback after 500ms if native app didn't handle it (e.g., desktop browsers)
    setTimeout(function() {
      // Some browsers block top-level redirect to custom schemes.
      // Show a manual close message.
      document.querySelector('.status').textContent = 'Connection complete! You can close this tab.';
      document.querySelector('.spinner').style.display = 'none';
    }, 1500);
  </script>
</body>
</html>`;
}

// ── Routes ───────────────────────────────────────────────────────────────────

export async function authRoutes(fastify: FastifyInstance) {

  // GET /api/services — list all services with connection status
  fastify.get('/services', async (request) => {
    const userId = (request.headers['x-user-id'] as string) || 'demo-user';
    const services = await Promise.all(
      Object.entries(PLUGINS).map(async ([id, plugin]) => {
        const connected = connectedServices.get(userId, id);
        return {
          id,
          name: plugin.name,
          logoUrl: plugin.logoUrl,
          isConnected: !!connected,
          lastSyncedAt: connected?.last_synced_at || null,
        };
      })
    );
    return { data: services };
  });

  // GET /api/auth/:service/authorize — start OAuth flow
  fastify.get<{ Params: { service: string } }>('/auth/:service/authorize', async (request, reply) => {
    const { service } = request.params;
    const plugin = PLUGINS[service as ServiceId];

    if (!plugin) {
      return reply.status(404).send({ error: `Unknown service: ${service}` });
    }

    const state = Math.random().toString(36).substring(2, 18);
    const url = plugin.getAuthorizeUrl(state);

    return {
      data: {
        url,
        state,
        redirectUrl: mobileRedirectUrl(service, true),
      },
    };
  });

  // GET /api/auth/:service/callback — OAuth callback (handles both code & token)
  // Supports: ?code=... (standard) or ?access_token=... (implicit/expo) or ?error=...
  fastify.get<{ Params: { service: string } }>('/auth/:service/callback', async (request, reply) => {
    const { service } = request.params;
    const query = request.query as Record<string, string | undefined>;
    const { code, access_token: accessToken, error, state } = query;

    const plugin = PLUGINS[service as ServiceId];
    if (!plugin) {
      return reply.status(404).send({ error: `Unknown service: ${service}` });
    }

    // OAuth error from provider
    if (error) {
      console.error(`[auth] ${service} OAuth error:`, error);
      const html = htmlRedirect(mobileRedirectUrl(service, false, error), service);
      return reply.type('text/html').send(html);
    }

    try {
      let tokens: { access_token: string; refresh_token?: string; expires_at?: number };

      if (accessToken) {
        // Implicit flow (some providers, Expo Web Browser)
        tokens = { access_token: accessToken };
      } else if (code) {
        // Standard authorization code flow
        tokens = await plugin.exchangeCode(code);
      } else {
        return reply.status(400).send({ error: 'Missing authorization code or token' });
      }

      const userId = 'demo-user'; // In production, derive from state + session cookie
      users.getOrCreate(userId);

      const id = crypto.randomUUID();
      const encryptedAccess = encryptToken(tokens.access_token);
      const encryptedRefresh = tokens.refresh_token ? encryptToken(tokens.refresh_token) : null;

      connectedServices.upsert(
        id,
        userId,
        plugin.id,
        encryptedAccess,
        encryptedRefresh,
        tokens.expires_at || null
      );

      console.log(`[auth] ${service} connected for user ${userId}`);

      // Return HTML that redirects to the mobile app
      const redirectUrl = mobileRedirectUrl(service, true);
      const html = htmlRedirect(redirectUrl, service);
      return reply.type('text/html').send(html);
    } catch (err) {
      console.error(`[auth] ${service} callback error:`, err);
      const html = htmlRedirect(mobileRedirectUrl(service, false, 'oauth_failed'), service);
      return reply.type('text/html').send(html);
    }
  });

  // DELETE /api/services/:service — revoke connection
  fastify.delete<{ Params: { service: string } }>('/services/:service', async (request, reply) => {
    const { service } = request.params;
    const userId = (request.headers['x-user-id'] as string) || 'demo-user';

    connectedServices.revoke(userId, service);
    console.log(`[auth] ${service} revoked for user ${userId}`);

    return { data: { revoked: true, service } };
  });

  // POST /api/services/:service/sync — fetch and store anonymized data
  fastify.post<{ Params: { service: string } }>('/services/:service/sync', async (request, reply) => {
    const { service } = request.params;
    const userId = (request.headers['x-user-id'] as string) || 'demo-user';
    const plugin = PLUGINS[service as ServiceId];

    if (!plugin) {
      return reply.status(404).send({ error: `Unknown service: ${service}` });
    }

    const connected = connectedServices.get(userId, service);
    if (!connected) {
      return reply.status(400).send({ error: 'Service not connected' });
    }

    try {
      const accessToken = decryptToken(connected.access_token_encrypted);
      const now = new Date();
      const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

      console.log(`[sync] Fetching ${service} data for user ${userId}...`);
      const rawData = await plugin.fetchUserData(accessToken, yearAgo, now);
      const stats = plugin.mapToStats(rawData);
      stats.period = {
        start: yearAgo.toISOString().split('T')[0],
        end: now.toISOString().split('T')[0],
      };

      const { aggregatedStats } = await import('../db/index.js');
      aggregatedStats.upsert(
        crypto.randomUUID(),
        userId,
        service,
        stats.period.start,
        stats.period.end,
        stats.aggregates
      );

      console.log(`[sync] ${service} synced successfully for user ${userId}`);
      return { data: { synced: true, stats } };
    } catch (err) {
      console.error(`[sync] ${service} error:`, err);
      return reply.status(500).send({ error: 'Sync failed — token may be expired' });
    }
  });

  // POST /api/auth/token/refresh — refresh an expired token
  fastify.post<{ Params: { service: string } }>('/auth/:service/refresh', async (request, reply) => {
    const { service } = request.params;
    const userId = (request.headers['x-user-id'] as string) || 'demo-user';
    const plugin = PLUGINS[service as ServiceId];

    if (!plugin) {
      return reply.status(404).send({ error: `Unknown service: ${service}` });
    }

    const connected = connectedServices.get(userId, service);
    if (!connected?.refresh_token_encrypted) {
      return reply.status(400).send({ error: 'No refresh token available' });
    }

    try {
      const refreshToken = decryptToken(connected.refresh_token_encrypted);
      const tokens = await plugin.refreshToken(refreshToken);

      const encryptedAccess = encryptToken(tokens.access_token);
      const encryptedRefresh = tokens.refresh_token ? encryptToken(tokens.refresh_token) : null;

      connectedServices.upsert(
        connected.id,
        userId,
        service,
        encryptedAccess,
        encryptedRefresh,
        tokens.expires_at || null
      );

      return { data: { refreshed: true } };
    } catch (err) {
      console.error(`[refresh] ${service} error:`, err);
      return reply.status(401).send({ error: 'Refresh failed — please reconnect' });
    }
  });
}
