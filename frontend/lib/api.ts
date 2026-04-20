import * as AuthSession from 'expo-auth-session';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { SERVICE_CONFIGS } from './theme';
import { connectAppleHealth, revokeAppleHealth, syncAppleHealth } from './appleHealth';
import {
  deleteAllLocalData,
  deleteRecap as deleteLocalRecap,
  getAggregate,
  getWrappedSession,
  listCachedServices,
  listLatestAggregates,
  listRecapSummaries,
  saveAggregate,
  saveSyncLog,
  saveWrappedSession,
  updateRecapCardCounts,
  upsertServices,
} from './localStore';
import { getApiBaseUrl } from './runtime';
import { clearSession, ensureSession } from './session';
import { shareWrappedCapture } from './share';
import type { CardType, RecapSummary, ServiceInfo, WrappedCard, WrappedData } from './types';

WebBrowser.maybeCompleteAuthSession();

export type { CardType, RecapSummary, ServiceInfo, WrappedCard, WrappedData } from './types';

type WrappedGenerationOptions = {
  templateId?: string;
  templateName?: string;
  period?: string;
  accentKey?: string;
};

function resolveRange(period = 'year') {
  const end = new Date();
  const start = new Date(end);

  if (period === '6months') {
    start.setMonth(start.getMonth() - 6);
  } else if (period === 'all') {
    start.setFullYear(start.getFullYear() - 5);
  } else {
    start.setFullYear(start.getFullYear() - 1);
  }

  return {
    periodStart: start.toISOString().slice(0, 10),
    periodEnd: end.toISOString().slice(0, 10),
  };
}

function buildDefaultServiceMap() {
  return new Map<string, ServiceInfo>(
    SERVICE_CONFIGS.map((service) => [
      service.id,
      {
        id: service.id,
        name: service.name,
        logoUrl: service.logoUri,
        isConnected: false,
        color: service.color,
        connectionKind: service.authKind,
        isAvailable: service.id !== 'goodreads' && service.id !== 'youtube',
        localOnly: service.id === 'apple_health',
        disabledReason:
          service.id === 'goodreads'
            ? 'Goodreads public API access is deprecated for new integrations.'
            : service.id === 'youtube'
              ? 'Watch-history recaps are not available from the official YouTube API.'
              : null,
      },
    ]),
  );
}

function sortServices(services: ServiceInfo[]) {
  const order = new Map(SERVICE_CONFIGS.map((service, index) => [service.id, index]));
  return [...services].sort((left, right) => (order.get(left.id) ?? 999) - (order.get(right.id) ?? 999));
}

function mergeServices(...sources: ServiceInfo[][]) {
  const merged = buildDefaultServiceMap();
  for (const source of sources) {
    for (const service of source) {
      const existing = merged.get(service.id);
      merged.set(service.id, {
        ...existing,
        ...service,
        color: existing?.color ?? service.color,
      });
    }
  }
  return sortServices([...merged.values()]);
}

class WrappedAPI {
  private async request<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
    const session = await ensureSession();
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${session.accessToken}`);
    if (!headers.has('Content-Type') && init.body) {
      headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      ...init,
      headers,
    });

    if (response.status === 401 && retry) {
      await ensureSession(true);
      return this.request<T>(path, init, false);
    }

    const payload = (await response.json().catch(() => null)) as { data?: T; error?: string } | null;
    if (!response.ok) {
      throw new Error(payload?.error ?? `Request failed with ${response.status}`);
    }

    return (payload?.data ?? payload) as T;
  }

  async listServices(): Promise<ServiceInfo[]> {
    try {
      const remote = await this.request<ServiceInfo[]>('/api/services');
      const services = mergeServices(remote);
      await upsertServices(services);
      return services;
    } catch {
      const cached = await listCachedServices();
      const services = mergeServices(cached);
      return services;
    }
  }

  async connectService(serviceId: string): Promise<ServiceInfo> {
    if (serviceId === 'apple_health') {
      const result = await connectAppleHealth();
      const services = mergeServices(await listCachedServices(), [
        {
          id: 'apple_health',
          name: 'Apple Health',
          logoUrl: buildDefaultServiceMap().get('apple_health')?.logoUrl ?? '',
          isConnected: result.connected,
          lastSyncedAt: result.lastSyncedAt,
          color: buildDefaultServiceMap().get('apple_health')?.color,
          connectionKind: 'healthkit',
          isAvailable: true,
          localOnly: true,
        },
      ]);
      await upsertServices(services);
      return services.find((service) => service.id === serviceId)!;
    }

    const services = await this.listServices();
    const target = services.find((service) => service.id === serviceId);
    if (!target) throw new Error('Unknown service');
    if (target.isAvailable === false) {
      throw new Error(target.disabledReason ?? 'This service is not available yet');
    }

    const redirectUri = AuthSession.makeRedirectUri({
      scheme: 'wrapped',
      path: 'connected',
    });
    const start = await this.request<{
      url: string;
      redirectUri: string;
      localOnly?: boolean;
    }>(`/api/services/${serviceId}/connect/start`, {
      method: 'POST',
      body: JSON.stringify({ redirectUri }),
    });

    if (start.localOnly) {
      throw new Error('This service is handled on-device');
    }

    const authResult = await WebBrowser.openAuthSessionAsync(start.url, redirectUri);
    if (authResult.type !== 'success' || !authResult.url) {
      throw new Error('Connection was not completed');
    }

    const parsed = Linking.parse(authResult.url);
    if (parsed.queryParams?.error) {
      throw new Error(String(parsed.queryParams.error));
    }

    const refreshedServices = await this.listServices();
    const refreshed = refreshedServices.find((service) => service.id === serviceId);
    if (!refreshed) throw new Error('Connected service not found');
    return refreshed;
  }

  async revokeService(serviceId: string): Promise<void> {
    if (serviceId === 'apple_health') {
      await revokeAppleHealth();
      const services = mergeServices(await listCachedServices(), [
        {
          id: 'apple_health',
          name: 'Apple Health',
          logoUrl: buildDefaultServiceMap().get('apple_health')?.logoUrl ?? '',
          isConnected: false,
          lastSyncedAt: null,
          color: buildDefaultServiceMap().get('apple_health')?.color,
          connectionKind: 'healthkit',
          isAvailable: true,
          localOnly: true,
        },
      ]);
      await upsertServices(services);
      return;
    }

    await this.request(`/api/services/${serviceId}`, { method: 'DELETE' });
    await this.listServices();
  }

  async syncService(serviceId: string): Promise<void> {
    const range = resolveRange('year');

    if (serviceId === 'apple_health') {
      const data = await syncAppleHealth(range.periodStart, range.periodEnd);
      await saveAggregate({
        serviceId,
        periodStart: range.periodStart,
        periodEnd: range.periodEnd,
        data,
      });
      await saveSyncLog(serviceId, 'success');
      const services = mergeServices(await listCachedServices(), [
        {
          id: 'apple_health',
          name: 'Apple Health',
          logoUrl: buildDefaultServiceMap().get('apple_health')?.logoUrl ?? '',
          isConnected: true,
          lastSyncedAt: new Date().toISOString(),
          color: buildDefaultServiceMap().get('apple_health')?.color,
          connectionKind: 'healthkit',
          isAvailable: true,
          localOnly: true,
        },
      ]);
      await upsertServices(services);
      return;
    }

    const result = await this.request<{
      synced: boolean;
      stats: {
        service: string;
        period: { start: string; end: string };
        aggregates: Record<string, unknown>;
      };
    }>(`/api/services/${serviceId}/sync`, {
      method: 'POST',
      body: JSON.stringify(range),
    });

    await saveAggregate({
      serviceId,
      periodStart: result.stats.period.start,
      periodEnd: result.stats.period.end,
      data: result.stats.aggregates,
    });
    await saveSyncLog(serviceId, 'success');
    await this.listServices();
  }

  async getWrapped(id: string): Promise<WrappedData> {
    const cached = await getWrappedSession(id);
    if (cached) return cached;

    const wrapped = await this.request<WrappedData>(`/api/wrapped/${id}`);
    await saveWrappedSession({
      session: wrapped,
      templateId: 'custom',
      templateName: 'Saved recap',
      period: 'year',
      accentKey: 'lilac',
    });
    return wrapped;
  }

  async generateWrapped(
    serviceIds: string[],
    opts: WrappedGenerationOptions = {},
  ): Promise<WrappedData> {
    const services = await this.listServices();
    const selectedServices = services.filter((service) => serviceIds.includes(service.id));
    const localOnlyServiceIds = selectedServices.filter((service) => service.localOnly).map((service) => service.id);
    let localAggregates = localOnlyServiceIds.length
      ? await listLatestAggregates(localOnlyServiceIds)
      : [];

    for (const serviceId of localOnlyServiceIds) {
      if (!localAggregates.find((aggregate) => aggregate.service === serviceId)) {
        await this.syncService(serviceId);
      }
    }

    localAggregates = localOnlyServiceIds.length
      ? await listLatestAggregates(localOnlyServiceIds)
      : [];

    const payload = await this.request<WrappedData>('/api/wrapped/generate', {
      method: 'POST',
      body: JSON.stringify({
        serviceIds,
        period: opts.period ?? 'year',
        templateId: opts.templateId,
        templateName: opts.templateName,
        accentKey: opts.accentKey,
        localAggregates,
      }),
    });

    const wrapped: WrappedData = {
      ...payload,
      year: payload.year ?? new Date().getFullYear(),
      services: payload.services ?? serviceIds,
      createdAt: payload.createdAt ?? new Date().toISOString(),
    };

    await saveWrappedSession({
      session: wrapped,
      templateId: opts.templateId,
      templateName: opts.templateName ?? 'Custom mix',
      period: opts.period ?? 'year',
      accentKey: opts.accentKey ?? 'lilac',
    });

    return wrapped;
  }

  async listRecaps(): Promise<RecapSummary[]> {
    const summaries = await listRecapSummaries();
    const counts = await updateRecapCardCounts();
    return summaries.map((summary) => ({
      ...summary,
      cardCount: counts.get(summary.id) ?? summary.cardCount,
    }));
  }

  async deleteRecap(id: string): Promise<void> {
    await deleteLocalRecap(id);
  }

  async shareWrapped(id: string, target: unknown): Promise<void> {
    const session = await this.getWrapped(id);
    await this.request(`/api/wrapped/${id}/share`, { method: 'POST' }).catch(() => null);
    await shareWrappedCapture(session, target);
  }

  async deleteAllData(): Promise<void> {
    await this.request('/api/me', { method: 'DELETE' }).catch(() => null);
    await deleteAllLocalData();
    await clearSession();
  }

  async getCachedAggregate(serviceId: string, period = 'year') {
    const range = resolveRange(period);
    return getAggregate(serviceId, range.periodStart, range.periodEnd);
  }
}

export const api = new WrappedAPI();
