import type { IncomingMessage, ServerResponse } from 'node:http';
import app from './src/index.js';
import { warmAiGateway } from './src/services/insightGenerator.js';

let bootstrapPromise: Promise<void> | null = null;

async function ensureReady() {
  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      await warmAiGateway(console);
      await app.ready();
    })();
  }
  return bootstrapPromise;
}

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  await ensureReady();
  app.server.emit('request', request, response);
}
