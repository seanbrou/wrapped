import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { authRoutes } from './routes/auth.js';
import { wrappedRoutes } from './routes/wrapped.js';
import 'dotenv/config';

const fastify = Fastify({
  logger: { level: 'info' },
});

await fastify.register(cors, {
  origin: ['http://localhost:8081', 'exp://localhost:8081', 'http://localhost:3000'],
  credentials: true,
});

await fastify.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
});

// Health check
fastify.get('/health', async () => ({ status: 'ok', ts: new Date().toISOString() }));

// Register routes
await fastify.register(authRoutes, { prefix: '/api' });
await fastify.register(wrappedRoutes, { prefix: '/api' });

const PORT = parseInt(process.env.PORT || '3000');
const HOST = process.env.HOST || '0.0.0.0';

try {
  await fastify.listen({ port: PORT, host: HOST });
  console.log(`[wrapped] Server running at http://${HOST}:${PORT}`);
  console.log(`[wrapped] Endpoints:`);
  console.log(`  GET  /health`);
  console.log(`  GET  /api/services`);
  console.log(`  GET  /api/auth/:service/authorize`);
  console.log(`  GET  /api/auth/:service/callback`);
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
