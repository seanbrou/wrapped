import crypto from 'node:crypto';
import { aggregatedStats, connectedServices, dataDeletion, wrappedSessions, } from '../db/index.js';
import { getServiceAdapter } from '../plugins/index.js';
import { selectCards } from '../services/cardSelector.js';
import { generateAIInsights, generateCrossServiceInsights } from '../services/insightGenerator.js';
import { requireAuth } from '../services/requestAuth.js';
function resolveRange(input) {
    const end = input.periodEnd ? new Date(input.periodEnd) : new Date();
    let start;
    if (input.periodStart) {
        start = new Date(input.periodStart);
    }
    else {
        start = new Date(end);
        if (input.period === '6months') {
            start.setMonth(start.getMonth() - 6);
        }
        else if (input.period === 'all') {
            start.setFullYear(start.getFullYear() - 5);
        }
        else {
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
function periodLabel(startIso, endIso) {
    return `${startIso} to ${endIso}`;
}
async function loadStats(input) {
    const stats = [];
    const localMap = new Map(input.localAggregates.map((aggregate) => [aggregate.service, aggregate]));
    for (const serviceId of input.serviceIds) {
        const localAggregate = localMap.get(serviceId);
        if (localAggregate) {
            stats.push({
                service: serviceId,
                period: { start: localAggregate.periodStart, end: localAggregate.periodEnd },
                aggregates: localAggregate.data,
            });
            continue;
        }
        const exact = await aggregatedStats.getForPeriod(input.userId, serviceId, input.periodStart, input.periodEnd);
        if (exact) {
            stats.push({
                service: serviceId,
                period: { start: exact.periodStart, end: exact.periodEnd },
                aggregates: exact.data,
            });
            continue;
        }
        const latest = await aggregatedStats.getLatest(input.userId, serviceId);
        if (latest) {
            stats.push({
                service: serviceId,
                period: { start: latest.periodStart, end: latest.periodEnd },
                aggregates: latest.data,
            });
            continue;
        }
        const connection = await connectedServices.get(input.userId, serviceId);
        const adapter = getServiceAdapter(serviceId);
        if (!connection || !adapter?.sync)
            continue;
    }
    return stats;
}
export async function wrappedRoutes(fastify) {
    fastify.post('/wrapped/generate', async (request, reply) => {
        const auth = await requireAuth(request, reply);
        if (!auth)
            return;
        const serviceIds = [...new Set(request.body?.serviceIds ?? [])];
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
            const allServicesForContext = stats.map((s) => ({ service: s.service, stats: s.aggregates }));
            const copyByService = {};
            for (const stat of stats) {
                const copy = await generateAIInsights({
                    title: `${stat.service} recap`,
                    service: stat.service,
                    stats: stat.aggregates,
                    period: periodLabel(range.startIso, range.endIso),
                    allServices: allServicesForContext,
                });
                copyByService[stat.service] = copy;
            }
            const crossServiceInsights = await generateCrossServiceInsights(allServicesForContext);
            const cards = selectCards(stats, copyByService, crossServiceInsights, 25);
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
                    .filter((value) => Boolean(value)),
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
        }
        catch (error) {
            console.error('[wrapped] generation failed', error);
            return reply.status(500).send({ error: 'Failed to generate wrapped session' });
        }
    });
    fastify.get('/wrapped/:id', async (request, reply) => {
        const auth = await requireAuth(request, reply);
        if (!auth)
            return;
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
    fastify.post('/wrapped/:id/share', async (request, reply) => {
        const auth = await requireAuth(request, reply);
        if (!auth)
            return;
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
        if (!auth)
            return;
        await dataDeletion.deleteAllForUser(auth.userId);
        return { data: { deleted: true } };
    });
    fastify.get('/me/export', async (request, reply) => {
        const auth = await requireAuth(request, reply);
        if (!auth)
            return;
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
