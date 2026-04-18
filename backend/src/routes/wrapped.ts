import type { FastifyInstance } from 'fastify';
import db, { aggregatedStats, wrappedSessions, connectedServices } from '../db/index.js';
import { generateAIInsights } from '../services/insightGenerator.js';
import { selectCards } from '../services/cardSelector.js';
import type { ServiceStats } from '../types/index.js';

const MOCK_STATS: ServiceStats[] = [
  {
    service: 'spotify',
    period: { start: '2024-01-01', end: '2025-12-31' },
    aggregates: {
      top_items: [
        { category: 'artists', items: [
          { name: 'The Weeknd', count: 342 },
          { name: 'Kendrick Lamar', count: 287 },
          { name: 'Drake', count: 256 },
          { name: 'Frank Ocean', count: 198 },
          { name: 'Tyler, the Creator', count: 174 },
        ]},
        { category: 'tracks', items: [
          { name: 'Starboy — The Weeknd', count: 87 },
          { name: 'HUMBLE. — Kendrick Lamar', count: 76 },
          { name: 'One Dance — Drake', count: 65 },
        ]},
      ],
      totals: { topArtistsCount: 20, topTracksCount: 20, totalMinutes: 12430 },
      streaks: {},
      comparisons: [],
    },
  },
  {
    service: 'apple_health',
    period: { start: '2024-01-01', end: '2025-12-31' },
    aggregates: {
      top_items: [],
      totals: { totalSteps: 3847291, workouts: 187, calories: 89234, activeMinutes: 14230, sleepHours: 2450 },
      streaks: {},
      comparisons: [],
    },
  },
  {
    service: 'strava',
    period: { start: '2024-01-01', end: '2025-12-31' },
    aggregates: {
      top_items: [{ category: 'activities', items: [] }],
      totals: { totalDistanceKm: 1247, activityCount: 94 },
      streaks: { topSport: 'Running' },
      comparisons: [],
    },
  },
  {
    service: 'goodreads',
    period: { start: '2024-01-01', end: '2025-12-31' },
    aggregates: {
      top_items: [],
      totals: { booksRead: 47, pagesRead: 12834 },
      streaks: {},
      comparisons: [],
    },
  },
  {
    service: 'steam',
    period: { start: '2024-01-01', end: '2025-12-31' },
    aggregates: {
      top_items: [{ category: 'games', items: [
        { name: "Baldur's Gate 3", count: 0 },
        { name: 'Elden Ring', count: 0 },
        { name: 'Cyberpunk 2077', count: 0 },
      ]}],
      totals: { gamesPlayed: 12, totalHours: 1347 },
      streaks: {},
      comparisons: [],
    },
  },
];

async function buildWrapped(
  userId: string,
  serviceIds: string[],
  periodStart: string,
  periodEnd: string
): Promise<{ sessionId: string; cards: object[]; insights: string[]; services: string[] }> {
  const stats: ServiceStats[] = [];

  // Try loading real data from DB
  for (const service of serviceIds) {
    const stored = aggregatedStats.get(userId, service, periodStart, periodEnd);
    if (stored) {
      stats.push({
        service,
        period: { start: periodStart, end: periodEnd },
        aggregates: stored.data as ServiceStats['aggregates'],
      });
    }
  }

  // Fall back to rich mock data so the app is always demonstrable
  if (stats.length === 0) {
    for (const mock of MOCK_STATS) {
      if (serviceIds.includes(mock.service)) {
        stats.push({ ...mock, period: { start: periodStart, end: periodEnd } });
      }
    }
    // Add any extra services the user selected
    const extraServices = serviceIds.filter(s => !MOCK_STATS.find(m => m.service === s));
    for (const id of extraServices) {
      stats.push({
        service: id,
        period: { start: periodStart, end: periodEnd },
        aggregates: { top_items: [], totals: {}, streaks: {}, comparisons: [] },
      });
    }
  }

  const periodLabel = `${periodStart} → ${periodEnd}`;
  console.log(`[wrapped] Generating wrapped for user=${userId} services=${serviceIds.join(',')} period=${periodLabel}`);

  const [insights, cards] = await Promise.all([
    generateAIInsights(stats, periodLabel),
    Promise.resolve(selectCards(stats, 15)),
  ]);

  const sessionId = crypto.randomUUID();
  wrappedSessions.create(sessionId, userId, serviceIds, periodStart, periodEnd, cards, insights);

  return { sessionId, cards, insights, services: serviceIds };
}

export async function wrappedRoutes(fastify: FastifyInstance) {

  // POST /api/wrapped/generate
  fastify.post<{
    Body: { serviceIds: string[]; periodStart?: string; periodEnd?: string }
  }>('/wrapped/generate', async (request, reply) => {
    const userId = (request.headers['x-user-id'] as string) || 'demo-user';
    const { serviceIds = [], periodStart, periodEnd } = request.body;

    if (serviceIds.length === 0) {
      return reply.status(400).send({ error: 'At least one service is required' });
    }

    const end = periodEnd || new Date().toISOString().split('T')[0];
    const yearStart = new Date();
    yearStart.setFullYear(yearStart.getFullYear() - 1);
    const start = periodStart || yearStart.toISOString().split('T')[0];

    try {
      const result = await buildWrapped(userId, serviceIds, start, end);
      return { data: result };
    } catch (err) {
      console.error('[wrapped] generate error:', err);
      return reply.status(500).send({ error: 'Failed to generate wrapped' });
    }
  });

  // GET /api/wrapped/:id
  fastify.get<{ Params: { id: string } }>('/wrapped/:id', async (request, reply) => {
    const session = wrappedSessions.get(request.params.id);
    if (!session) {
      return reply.status(404).send({ error: 'Wrapped not found' });
    }
    return { data: session };
  });

  // POST /api/wrapped/:id/share — generate shareable assets for a wrapped session
  fastify.post<{ Params: { id: string } }>('/wrapped/:id/share', async (request, reply) => {
    const session = wrappedSessions.get(request.params.id);
    if (!session) {
      return reply.status(404).send({ error: 'Wrapped not found' });
    }

    // Find the share card (always last)
    const shareCards = (session.cards as object[]).filter(
      (c: object) => (c as Record<string, unknown>).type === 'share'
    );

    // Build shareable metadata for each card type that supports sharing
    const shareableCards = (session.cards as object[]).map((card: object) => {
      const c = card as Record<string, unknown>;
      let shareText = '';
      let imageData: string | null = null;

      switch (c.type) {
        case 'hero_stat': {
          const d = c.data as Record<string, unknown>;
          shareText = `My Wrapped: ${d.value} ${d.unit} ${d.comparison || ''}`.trim();
          break;
        }
        case 'top_list': {
          const items = (c.data as Record<string, unknown>).items as Array<Record<string, unknown>>;
          const top3 = items.slice(0, 3).map((i, idx) => `#${idx + 1} ${i.name}`).join(' · ');
          shareText = `My top ${(c.data as Record<string, unknown>).category}: ${top3}`;
          break;
        }
        case 'insight':
          shareText = (c.data as Record<string, unknown>).text as string;
          break;
        default:
          shareText = `My ${new Date().getFullYear()} Wrapped`;
      }

      return {
        cardId: c.id,
        cardType: c.type,
        service: c.service,
        shareText,
        // In production, this would be a pre-generated image URL from a canvas/OG service
        // For now, we return the text that the client renders into a share card
        imageUrl: null,
      };
    });

    // Generate a summary share card
    const summary = {
      totalCards: session.cards.length,
      services: session.services,
      periodStart: session.periodStart,
      periodEnd: session.periodEnd,
      shareUrl: `wrapped://view/${session.id}`,
    };

    return {
      data: {
        sessionId: session.id,
        shareableCards,
        shareCards,
        summary,
        // Pre-generated share card images (in production: upload to CDN and return URLs)
        // For MVP: client renders share cards natively
      },
    };
  });

  // DELETE /api/me — GDPR full deletion
  fastify.delete('/me', async (request, reply) => {
    const userId = (request.headers['x-user-id'] as string) || 'demo-user';
    db.prepare(`DELETE FROM connected_services WHERE user_id = ?`).run(userId);
    db.prepare(`DELETE FROM aggregated_stats WHERE user_id = ?`).run(userId);
    db.prepare(`DELETE FROM wrapped_sessions WHERE user_id = ?`).run(userId);
    db.prepare(`DELETE FROM saved_wrappeds WHERE user_id = ?`).run(userId);
    console.log(`[gdpr] All data deleted for user ${userId}`);
    return { data: { deleted: true } };
  });

  // GET /api/me/export — download all user data
  fastify.get('/me/export', async (request, reply) => {
    const userId = (request.headers['x-user-id'] as string) || 'demo-user';
    const services = connectedServices.list(userId);
    const stats = db.prepare(`SELECT * FROM aggregated_stats WHERE user_id = ?`).all(userId);
    return {
      data: {
        userId,
        exportedAt: new Date().toISOString(),
        connectedServices: services.map((s: Record<string, unknown>) => ({
          service: s.service,
          connectedAt: s.connected_at,
        })),
        stats,
      },
    };
  });
}
