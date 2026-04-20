import crypto from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import {
  aggregatedStats,
  connectedServices,
  dataDeletion,
  wrappedSessions,
} from '../db/index.js';
import { getServiceAdapter } from '../plugins/index.js';
import { decryptToken, encryptToken } from '../services/anonymizer.js';
import { selectCards } from '../services/cardSelector.js';
import { generateAIInsights } from '../services/insightGenerator.js';
import { requireAuth } from '../services/requestAuth.js';
import type { ServiceId, ServiceStats } from '../types/index.js';

function resolveRange(input: {
  period?: string;
  periodStart?: string;
  periodEnd?: string;
}) {
  const end = input.periodEnd ? new Date(input.periodEnd) : new Date();
  let start: Date;

  if (input.periodStart) {
    start = new Date(input.periodStart);
  } else {
    start = new Date(end);
    if (input.period === '6months') {
      start.setMonth(start.getMonth() - 6);
    } else if (input.period === 'all') {
      start.setFullYear(start.getFullYear() - 5);
    } else {
      start.setFullYear(start.getFullYear() - 1);
    }
  }

  return {
    start,
    end,
    startIso: start.toISOString().slice(0, 10),
    endIso: end.toISOString().slice(0, 10),
  };
}

function periodLabel(startIso: string, endIso: string) {
  return `${startIso} to ${endIso}`;
}

async function loadStats(input: {
  userId: string;
  serviceIds: ServiceId[];
  periodStart: string;
  periodEnd: string;
  localAggregates: Array<{ service: ServiceId; periodStart: string; periodEnd: string; data: Record<string, unknown> }>;
}) {
  const stats: ServiceStats[] = [];
  const localMap = new Map(input.localAggregates.map((aggregate) => [aggregate.service, aggregate]));

  for (const serviceId of input.serviceIds) {
    const localAggregate = localMap.get(serviceId);
    if (localAggregate) {
        stats.push({
          service: serviceId,
          period: { start: localAggregate.periodStart, end: localAggregate.periodEnd },
          aggregates: localAggregate.data as unknown as ServiceStats['aggregates'],
        });
      continue;
    }

    const exact = await aggregatedStats.getForPeriod(
      input.userId,
      serviceId,
      input.periodStart,
      input.periodEnd,
    );
    if (exact) {
        stats.push({
          service: serviceId,
          period: { start: exact.periodStart, end: exact.periodEnd },
          aggregates: exact.data as unknown as ServiceStats['aggregates'],
        });
      continue;
    }

    const latest = await aggregatedStats.getLatest(input.userId, serviceId);
    if (latest) {
        stats.push({
          service: serviceId,
          period: { start: latest.periodStart, end: latest.periodEnd },
          aggregates: latest.data as unknown as ServiceStats['aggregates'],
        });
      continue;
    }

    const connection = await connectedServices.get(input.userId, serviceId);
    const adapter = getServiceAdapter(serviceId);
    if (!connection || !adapter?.sync) continue;

    let accessToken = connection.accessTokenEncrypted ? decryptToken(connection.accessTokenEncrypted) : null;
    let refreshToken = connection.refreshTokenEncrypted ? decryptToken(connection.refreshTokenEncrypted) : null;

    if (
      adapter.refresh &&
      refreshToken &&
      connection.expiresAt &&
      connection.expiresAt <= Date.now() + 60_000
    ) {
      const refreshed = await adapter.refresh(refreshToken, connection.metadata);
      accessToken = refreshed.accessToken;
      refreshToken = refreshed.refreshToken ?? refreshToken;
      await connectedServices.upsert({
        userId: input.userId,
        service: serviceId,
        externalAccountId: refreshed.externalAccountId ?? connection.externalAccountId,
        accessTokenEncrypted: accessToken ? encryptToken(accessToken) : null,
        refreshTokenEncrypted: refreshToken ? encryptToken(refreshToken) : null,
        tokenType: refreshed.tokenType ?? connection.tokenType,
        scope: refreshed.scope ?? connection.scope,
        expiresAt: refreshed.expiresAt ?? connection.expiresAt,
        metadata: refreshed.metadata ?? connection.metadata,
      });
    }

    const synced = await adapter.sync({
      accessToken,
      refreshToken,
      externalAccountId: connection.externalAccountId,
      connectionMetadata: connection.metadata,
      periodStart: new Date(input.periodStart),
      periodEnd: new Date(input.periodEnd),
    });

    await aggregatedStats.upsert({
      userId: input.userId,
      service: serviceId,
      periodStart: synced.period.start,
      periodEnd: synced.period.end,
      data: synced.aggregates,
    });

    stats.push(synced);
  }

  return stats;
}

export async function wrappedRoutes(fastify: FastifyInstance) {
  fastify.post<{
    Body: {
      serviceIds: ServiceId[];
      period?: string;
      periodStart?: string;
      periodEnd?: string;
      templateId?: string;
      templateName?: string;
      accentKey?: string;
      localAggregates?: Array<{
        service: ServiceId;
        periodStart: string;
        periodEnd: string;
        data: Record<string, unknown>;
      }>;
    }
  }>('/wrapped/generate', async (request, reply) => {
    const auth = await requireAuth(request, reply);
    if (!auth) return;

    const serviceIds = [...new Set(request.body?.serviceIds ?? [])] as ServiceId[];
    if (serviceIds.length === 0) {
      return reply.status(400).send({ error: 'At least one service is required' });
    }

    const range = resolveRange(request.body ?? {});

    try {
      const stats = await loadStats({
        userId: auth.userId,
        serviceIds,
        periodStart: range.startIso,
        periodEnd: range.endIso,
        localAggregates: request.body?.localAggregates ?? [],
      });

      if (stats.length === 0) {
        return reply.status(400).send({ error: 'No synced data found for the selected services' });
      }

      const copyByService = await generateAIInsights(stats, periodLabel(range.startIso, range.endIso));
      const cards = selectCards(stats, copyByService, 15);
      const sessionId = crypto.randomUUID();
      const session = await wrappedSessions.create({
        id: sessionId,
        userId: auth.userId,
        services: serviceIds,
        periodStart: range.startIso,
        periodEnd: range.endIso,
        cards,
        insights: Object.values(copyByService)
          .map((value) => value?.insightHeadline)
          .filter((value): value is string => Boolean(value)),
        templateId: request.body?.templateId ?? null,
        templateName: request.body?.templateName ?? null,
        accentKey: request.body?.accentKey ?? null,
      });

      return {
        data: {
          sessionId: session.id,
          services: session.services,
          cards: session.cards,
          createdAt: session.createdAt,
        },
      };
    } catch (error) {
      console.error('[wrapped] generation failed', error);
      return reply.status(500).send({ error: 'Failed to generate wrapped session' });
    }
  });

  fastify.get<{ Params: { id: string } }>('/wrapped/:id', async (request, reply) => {
    const auth = await requireAuth(request, reply);
    if (!auth) return;

    const session = await wrappedSessions.get(request.params.id);
    if (!session || session.userId !== auth.userId) {
      return reply.status(404).send({ error: 'Wrapped session not found' });
    }

    return {
      data: {
        sessionId: session.id,
        services: session.services,
        cards: session.cards,
        createdAt: session.createdAt,
      },
    };
  });

  fastify.post<{ Params: { id: string } }>('/wrapped/:id/share', async (request, reply) => {
    const auth = await requireAuth(request, reply);
    if (!auth) return;

    const session = await wrappedSessions.get(request.params.id);
    if (!session || session.userId !== auth.userId) {
      return reply.status(404).send({ error: 'Wrapped session not found' });
    }

    const shareCard = session.cards.find((card) => card.type === 'share');
    return {
      data: {
        sessionId: session.id,
        shareCard: shareCard?.data ?? null,
        summary: {
          services: session.services,
          periodStart: session.periodStart,
          periodEnd: session.periodEnd,
          cardCount: session.cards.length,
        },
      },
    };
  });

  fastify.delete('/me', async (request, reply) => {
    const auth = await requireAuth(request, reply);
    if (!auth) return;

    await dataDeletion.deleteAllForUser(auth.userId);
    return { data: { deleted: true } };
  });

  fastify.get('/me/export', async (request, reply) => {
    const auth = await requireAuth(request, reply);
    if (!auth) return;

    const sessions = await wrappedSessions.listForUser(auth.userId, 50);
    const services = (await connectedServices.list(auth.userId)).map((service) => ({
      service: service.service,
      connectedAt: service.connectedAt,
      lastSyncedAt: service.lastSyncedAt,
      externalAccountId: service.externalAccountId,
    }));

    return {
      data: {
        userId: auth.userId,
        exportedAt: new Date().toISOString(),
        connectedServices: services,
        wrappedSessions: sessions.map((session) => ({
          id: session.id,
          services: session.services,
          createdAt: session.createdAt,
          cardCount: session.cards.length,
          periodStart: session.periodStart,
          periodEnd: session.periodEnd,
        })),
      },
    };
  });
}
