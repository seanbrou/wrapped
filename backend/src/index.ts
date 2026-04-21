import 'dotenv/config';

import Fastify from 'fastify';
import { fileURLToPath } from 'node:url';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { authRoutes } from './routes/auth.js';
import { wrappedRoutes } from './routes/wrapped.js';
import { databaseInfo } from './db/index.js';
import { appConfig, requirePublicApiBaseUrl } from './services/config.js';
import { warmAiGateway } from './services/insightGenerator.js';
import { startSyncQueueWorker, stopSyncQueueWorker } from './services/syncQueue.js';

const fastify = Fastify({
  logger: { level: 'info' },
});

const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:8081,exp://localhost:8081,http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

await fastify.register(cors, {
  origin: allowedOrigins,
  credentials: true,
});

await fastify.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
});

function legalPage(title: string, body: string) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      :root {
        color-scheme: light;
      }
      body {
        margin: 0;
        font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif;
        background: #f5f0e6;
        color: #111827;
      }
      main {
        max-width: 760px;
        margin: 0 auto;
        padding: 48px 24px 72px;
      }
      h1 {
        font-size: 40px;
        line-height: 1.1;
        margin: 0 0 20px;
      }
      p, li {
        font-size: 16px;
        line-height: 1.7;
      }
      ul {
        padding-left: 20px;
      }
      .eyebrow {
        display: inline-block;
        margin-bottom: 12px;
        padding: 6px 10px;
        border-radius: 999px;
        background: rgba(17, 24, 39, 0.08);
        font-size: 12px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      a {
        color: inherit;
      }
    </style>
  </head>
  <body>
    <main>
      <span class="eyebrow">Wrapped</span>
      ${body}
    </main>
  </body>
</html>`;
}

fastify.get('/', async () => ({
  name: 'Wrapped backend',
  status: 'ok',
  endpoints: ['/api/health', '/privacy', '/support', '/terms'],
}));

async function sendPrivacyPage(reply: { type: (value: string) => { send: (body: string) => unknown } }) {
  return reply.type('text/html').send(
    legalPage(
      'Wrapped Privacy Policy',
      `
      <h1>Privacy Policy</h1>
      <p>Wrapped generates recap experiences from data the user explicitly connects or grants access to.</p>
      <ul>
        <li>A silent per-install account identifier and session tokens are used to secure backend requests.</li>
        <li>Recap history and generated card payloads are stored locally on the device first.</li>
        <li>Apple Health summaries are generated on-device and are not sent to third-party LLM providers.</li>
        <li>Supported third-party service tokens and normalized aggregates may be stored on the backend so connections can refresh and sync again later.</li>
        <li>Users can revoke service access, delete local recap history, and request deletion of backend data tied to the install account.</li>
      </ul>
      <p>Privacy requests can be sent through the support page linked below.</p>
      <p><a href="/api/support">Open support</a></p>
    `,
    ),
  );
}

fastify.get('/privacy', async (_request, reply) => {
  return sendPrivacyPage(reply);
});

fastify.get('/api/privacy', async (_request, reply) => {
  return sendPrivacyPage(reply);
});

async function sendTermsPage(reply: { type: (value: string) => { send: (body: string) => unknown } }) {
  reply.type('text/html').send(
    legalPage(
      'Wrapped Terms of Service',
      `
      <h1>Terms of Service</h1>
      <p>Wrapped is provided as a recap and data-summary service for the accounts and data sources a user explicitly connects.</p>
      <ul>
        <li>Users are responsible for complying with the terms of any third-party service they connect.</li>
        <li>Wrapped may suspend or remove integrations that become unsupported or non-compliant.</li>
        <li>Users must not attempt to misuse, overload, reverse engineer, or otherwise interfere with the service.</li>
        <li>Generated recap content is provided as-is and may depend on the availability and accuracy of third-party APIs.</li>
      </ul>
      <p>Questions about these terms can be sent through the support page.</p>
      <p><a href="/api/support">Open support</a></p>
    `,
    ),
  );
}

fastify.get('/terms', async (_request, reply) => {
  return sendTermsPage(reply);
});

fastify.get('/api/terms', async (_request, reply) => {
  return sendTermsPage(reply);
});

async function sendSupportPage(reply: { type: (value: string) => { send: (body: string) => unknown } }) {
  reply.type('text/html').send(
    legalPage(
      'Wrapped Support',
      `
      <h1>Support</h1>
      <p>For support, privacy requests, or account-data deletion requests related to Wrapped, contact:</p>
      <p><strong>Email:</strong> review@wrapped.app</p>
      <p>This inbox should be replaced with the production support address before App Store submission.</p>
      <p>Useful links:</p>
      <ul>
        <li><a href="/api/privacy">Privacy Policy</a></li>
        <li><a href="/api/terms">Terms of Service</a></li>
        <li><a href="/api/health">Backend Health Check</a></li>
      </ul>
    `,
    ),
  );
}

fastify.get('/support', async (_request, reply) => {
  return sendSupportPage(reply);
});

fastify.get('/api/support', async (_request, reply) => {
  return sendSupportPage(reply);
});

// Health check
fastify.get('/health', async () => ({ status: 'ok', ts: new Date().toISOString() }));
fastify.get('/api/health', async () => ({ status: 'ok', ts: new Date().toISOString() }));

// Register routes
await fastify.register(authRoutes, { prefix: '/api' });
await fastify.register(wrappedRoutes, { prefix: '/api' });

const PORT = parseInt(process.env.PORT || '3000');
const HOST = process.env.HOST || '0.0.0.0';

requirePublicApiBaseUrl();

export default fastify;

const entrypoint = process.argv[1] ? fileURLToPath(import.meta.url) === process.argv[1] : false;

if (entrypoint) {
  try {
    await warmAiGateway(console);
    startSyncQueueWorker();
    await fastify.listen({ port: PORT, host: HOST });
    console.log(`[wrapped] Server running at http://${HOST}:${PORT}`);
    console.log(`[wrapped] Database: ${databaseInfo.kind} (${databaseInfo.connectionLabel})`);
    console.log(`[wrapped] Public API base URL: ${appConfig.publicApiBaseUrl}`);
    console.log(`[wrapped] Endpoints:`);
    console.log(`  GET  /health`);
    console.log(`  POST /api/session/bootstrap`);
    console.log(`  POST /api/session/refresh`);
    console.log(`  GET  /api/services`);
    console.log(`  POST /api/services/:service/connect/start`);
    console.log(`  GET  /api/oauth/:service/callback`);
    console.log(`  DELETE /api/services/:service`);
    console.log(`  POST /api/services/:service/sync`);
    console.log(`  POST /api/wrapped/generate`);
    console.log(`  GET  /api/wrapped/:id`);
    console.log(`  DELETE /api/me`);
    console.log(`  GET  /api/me/export`);
  } catch (err) {
    console.error('[wrapped] Server failed to start:', err);
    process.exit(1);
  }
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    stopSyncQueueWorker();
  });
}
