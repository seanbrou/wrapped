import type { FastifyReply, FastifyRequest } from 'fastify';
import { verifyAccessToken } from './session.js';
import type { AuthenticatedContext } from '../types/index.js';

export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<AuthenticatedContext | null> {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    await reply.status(401).send({ error: 'Missing bearer token' });
    return null;
  }

  const token = authHeader.slice('Bearer '.length).trim();
  const auth = await verifyAccessToken(token);
  if (!auth) {
    await reply.status(401).send({ error: 'Invalid or expired session' });
    return null;
  }

  return auth;
}
