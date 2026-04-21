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
import type { CardType, RecapSummary, ServiceInfo, SyncJobRecord, WrappedCard, WrappedData } from './types';

WebBrowser.maybeCompleteAuthSession();

export type { CardType, RecapSummary, ServiceInfo, SyncJobRecord, WrappedCard, WrappedData } from './types';

type WrappedGenerationOptions = {
  templateId?: string;
  templateName?: string;
  period?: string;
  accentKey?: string;
  onSyncProgress?: (progress: {
    stage: 'syncing' | 'generating';
    completed: number;
    total: number;
    serviceId?: string;
  }) => void;
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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeAggregateForWrapped(serviceId: string, data: Record<string, unknown>) {
  if (serviceId !== 'apple_health') {
    return data;
  }

  const totals = { ...(data.totals as Record<string, unknown> | undefined) };
  if (typeof totals.exerciseMinutes === 'number' && typeof totals.activeMinutes !== 'number') {
    totals.activeMinutes = totals.exerciseMinutes;
  }
  if (typeof totals.sleepHours === 'number' && typeof totals.sleepMinutes !== 'number') {
    totals.sleepMinutes = Math.round(totals.sleepHours * 60);
  }
  if (typeof totals.activeEnergyCalories === 'number' && typeof totals.caloriesBurned !== 'number') {
    totals.caloriesBurned = totals.activeEnergyCalories;
  }
  if (typeof totals.distanceKm === 'number' && typeof totals.distanceWalkingRunningKm !== 'number') {
    totals.distanceWalkingRunningKm = totals.distanceKm;
  }

  return {
    ...data,
    totals,
  };
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
    const cached = await listCachedServices();
    const cachedLocalOnly = cached.filter((service) => service.localOnly);

    try {
      const remote = await this.request<ServiceInfo[]>('/api/services');
      const services = mergeServices(remote, cachedLocalOnly);
      await upsertServices(services);
      return services;
    } catch {
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
    const authSessionReturnUri = 'wrapped://';
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

    const authResult = await WebBrowser.openAuthSessionAsync(start.url, authSessionReturnUri);
    if (authResult.type !== 'success' || !authResult.url) {
      throw new Error('Connection was not completed');
    }

    const parsed = Linking.parse(authResult.url);
    const status = typeof parsed.queryParams?.status === 'string' ? parsed.queryParams.status : null;
    if (parsed.queryParams?.error) {
      throw new Error(String(parsed.queryParams.error));
    }
    if (status && status !== 'connected') {
      throw new Error(
        typeof parsed.queryParams?.error === 'string'
          ? parsed.queryParams.error
          : 'Connection was not completed',
      );
    }

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const refreshedServices = await this.listServices();
      const refreshed = refreshedServices.find((service) => service.id === serviceId);
      if (refreshed?.isConnected) {
        return refreshed;
      }
      await sleep(500);
    }

    throw new Error(`Connected ${target.name}, but the app did not confirm the connection.`);
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

  async getSyncJob(jobId: string): Promise<SyncJobRecord> {
    return this.request<SyncJobRecord>(`/api/sync-jobs/${jobId}`);
  }

  async listSyncJobs(): Promise<SyncJobRecord[]> {
    return this.request<SyncJobRecord[]>('/api/sync-jobs');
  }

  private async waitForSyncJob(jobId: string): Promise<SyncJobRecord> {
    const startedAt = Date.now();

    while (Date.now() - startedAt < 180_000) {
      const job = await this.getSyncJob(jobId);
      if (job.status === 'completed') return job;
      if (job.status === 'failed') {
        throw new Error(job.errorMessage ?? 'Sync failed');
      }
      await sleep(1500);
    }

    throw new Error('Sync timed out');
  }

  async syncService(serviceId: string, period = 'year'): Promise<SyncJobRecord | null> {
    const range = resolveRange(period);

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
      return null;
    }

    const result = await this.request<{
      queued: boolean;
      job: SyncJobRecord;
    }>(`/api/services/${serviceId}/sync`, {
      method: 'POST',
      body: JSON.stringify(range),
    });

    const job = await this.waitForSyncJob(result.job.id);
    if (!job.stats) {
      throw new Error('Sync completed without stats');
    }

    await saveAggregate({
      serviceId,
      periodStart: job.stats.period.start,
      periodEnd: job.stats.period.end,
      data: job.stats.aggregates,
    });
    await saveSyncLog(serviceId, 'success');
    await this.listServices();
    return job;
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
    const remoteServiceIds = selectedServices.filter((service) => !service.localOnly).map((service) => service.id);
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

    const normalizedLocalAggregates = localAggregates.map((aggregate) => ({
      ...aggregate,
      data: normalizeAggregateForWrapped(aggregate.service, aggregate.data),
    }));

    if (remoteServiceIds.length > 0) {
      let completed = 0;
      for (const serviceId of remoteServiceIds) {
        opts.onSyncProgress?.({
          stage: 'syncing',
          completed,
          total: remoteServiceIds.length,
          serviceId,
        });
        await this.syncService(serviceId, opts.period ?? 'year');
        completed += 1;
        opts.onSyncProgress?.({
          stage: 'syncing',
          completed,
          total: remoteServiceIds.length,
          serviceId,
        });
      }
    }

    opts.onSyncProgress?.({
      stage: 'generating',
      completed: remoteServiceIds.length,
      total: remoteServiceIds.length,
    });

    const payload = await this.request<WrappedData>('/api/wrapped/generate', {
      method: 'POST',
      body: JSON.stringify({
        serviceIds,
        period: opts.period ?? 'year',
        templateId: opts.templateId,
        templateName: opts.templateName,
        accentKey: opts.accentKey,
        localAggregates: normalizedLocalAggregates,
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
