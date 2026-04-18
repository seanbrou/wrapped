const API_BASE = 'http://localhost:3000/api';
const USER_ID = 'demo-user';

async function request<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': USER_ID,
      ...opts?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error: string }).error || 'Request failed');
  }
  return res.json() as Promise<T>;
}

export interface ServiceInfo {
  id: string;
  name: string;
  logoUrl: string;
  isConnected: boolean;
  lastSyncedAt: string | null;
}

export interface WrappedCard {
  id: string;
  type: 'hero_stat' | 'top_list' | 'insight' | 'chart' | 'comparison' | 'community' | 'share';
  service: string;
  title: string;
  data: Record<string, unknown>;
}

export interface WrappedSession {
  id: string;
  services: string[];
  periodStart: string;
  periodEnd: string;
  cards: WrappedCard[];
  insights: string[];
  createdAt: string;
}

export const api = {
  listServices: () =>
    request<{ data: ServiceInfo[] }>('/services').then(r => r.data),

  getAuthorizeUrl: (service: string) =>
    request<{ data: { url: string; state: string; redirectUrl: string } }>(
      `/auth/${service}/authorize`
    ).then(r => r.data),

  connectCallback: (service: string) =>
    request<{ data: { connected: boolean; redirect: string } }>(
      `/auth/${service}/callback`
    ).then(r => r.data),

  syncService: (service: string) =>
    request<{ data: { synced: boolean } }>(`/services/${service}/sync`, {
      method: 'POST',
    }).then(r => r.data),

  revokeService: (service: string) =>
    request<{ data: { revoked: boolean } }>(`/services/${service}`, {
      method: 'DELETE',
    }).then(r => r.data),

  generateWrapped: (serviceIds: string[], periodStart?: string, periodEnd?: string) =>
    request<{ data: { sessionId: string; cards: WrappedCard[]; insights: string[] } }>(
      '/wrapped/generate',
      {
        method: 'POST',
        body: JSON.stringify({ serviceIds, periodStart, periodEnd }),
      }
    ).then(r => r.data),

  getWrapped: (id: string) =>
    request<{ data: WrappedSession }>(`/wrapped/${id}`).then(r => r.data),

  shareWrapped: (id: string) =>
    request<{ data: unknown }>(`/wrapped/${id}/share`, { method: 'POST' }).then(
      r => r.data
    ),
};
