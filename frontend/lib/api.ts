import AsyncStorage from '@react-native-async-storage/async-storage';
import { MOCK_WRAPPED } from './mockData';

export interface ServiceInfo {
  id: string;
  name: string;
  logoUrl: string;
  isConnected: boolean;
  lastSyncedAt?: string | null;
  color?: string;
}

export type CardType = 'hero_stat' | 'top_list' | 'insight' | 'chart' | 'community' | 'comparison' | 'share';

export interface WrappedCard {
  type: CardType | string;
  service: string;
  data: Record<string, any>;
}

export interface WrappedData {
  sessionId: string;
  year?: number;
  services?: string[];
  cards: WrappedCard[];
  createdAt?: string;
}

// Lightweight recap summary used for home history list
export interface RecapSummary {
  id: string;
  templateId: string;
  templateName: string;
  services: string[];
  period: string;
  cardCount: number;
  createdAt: string;  // ISO
  accentKey: string;
}

const STORAGE_KEYS = {
  services: '@wrapped_services',
  recaps:   '@wrapped_recaps',
} as const;

class WrappedAPI {
  private useMock = true;

  async listServices(): Promise<ServiceInfo[]> {
    if (this.useMock) {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.services);
      return stored ? JSON.parse(stored) : [];
    }
    const res = await fetch('http://localhost:3000/api/services', {
      headers: { 'x-user-id': 'demo-user' },
    });
    return res.json();
  }

  async setConnected(serviceIds: string[]): Promise<void> {
    if (!this.useMock) return;
    const records: ServiceInfo[] = serviceIds.map(id => ({
      id,
      name: id.replace('_', ' '),
      logoUrl: '',
      isConnected: true,
      lastSyncedAt: new Date().toISOString(),
    }));
    await AsyncStorage.setItem(STORAGE_KEYS.services, JSON.stringify(records));
  }

  async connectService(serviceId: string): Promise<ServiceInfo> {
    if (this.useMock) {
      const list = await this.listServices();
      const filtered = list.filter(s => s.id !== serviceId);
      const record: ServiceInfo = {
        id: serviceId,
        name: serviceId.replace('_', ' '),
        logoUrl: '',
        isConnected: true,
        lastSyncedAt: new Date().toISOString(),
      };
      await AsyncStorage.setItem(
        STORAGE_KEYS.services,
        JSON.stringify([...filtered, record]),
      );
      return record;
    }
    const res = await fetch(`http://localhost:3000/api/auth/${serviceId}/url`);
    return res.json();
  }

  async revokeService(serviceId: string): Promise<void> {
    if (this.useMock) {
      const list = await this.listServices();
      const filtered = list.filter(s => s.id !== serviceId);
      await AsyncStorage.setItem(STORAGE_KEYS.services, JSON.stringify(filtered));
      return;
    }
    await fetch(`http://localhost:3000/api/auth/${serviceId}/revoke`, {
      method: 'DELETE',
      headers: { 'x-user-id': 'demo-user' },
    });
  }

  async getWrapped(id: string): Promise<WrappedData> {
    if (this.useMock) {
      return {
        sessionId: id,
        cards: MOCK_WRAPPED.cards,
      };
    }
    const res = await fetch(`http://localhost:3000/api/wrapped/${id}`);
    if (!res.ok) throw new Error('Failed to fetch wrapped');
    return res.json();
  }

  async generateWrapped(
    serviceIds: string[],
    opts: { templateId?: string; templateName?: string; period?: string; accentKey?: string } = {},
  ): Promise<WrappedData> {
    if (this.useMock) {
      await new Promise(r => setTimeout(r, 1800));
      const id = 'recap-' + Date.now();
      const payload: WrappedData = {
        sessionId: id,
        year: new Date().getFullYear(),
        services: serviceIds,
        cards: MOCK_WRAPPED.cards,
        createdAt: new Date().toISOString(),
      };
      await this.saveRecap({
        id,
        templateId: opts.templateId ?? 'custom',
        templateName: opts.templateName ?? 'Custom mix',
        services: serviceIds,
        period: opts.period ?? 'year',
        cardCount: payload.cards.length,
        createdAt: payload.createdAt!,
        accentKey: opts.accentKey ?? 'lilac',
      });
      return payload;
    }
    const res = await fetch('http://localhost:3000/api/wrapped/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'demo-user',
      },
      body: JSON.stringify({ services: serviceIds, ...opts }),
    });
    if (!res.ok) throw new Error('Generation failed');
    return res.json();
  }

  async listRecaps(): Promise<RecapSummary[]> {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.recaps);
    if (!raw) return [];
    const parsed: RecapSummary[] = JSON.parse(raw);
    // Newest first
    return parsed.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  private async saveRecap(recap: RecapSummary): Promise<void> {
    const existing = await this.listRecaps();
    const next = [recap, ...existing].slice(0, 20);  // keep last 20
    await AsyncStorage.setItem(STORAGE_KEYS.recaps, JSON.stringify(next));
  }

  async deleteRecap(id: string): Promise<void> {
    const existing = await this.listRecaps();
    const next = existing.filter(r => r.id !== id);
    await AsyncStorage.setItem(STORAGE_KEYS.recaps, JSON.stringify(next));
  }

  async syncService(serviceId: string): Promise<void> {
    if (this.useMock) {
      await new Promise(r => setTimeout(r, 1500));
      return;
    }
    await fetch(`http://localhost:3000/api/services/${serviceId}/sync`, {
      method: 'POST',
      headers: { 'x-user-id': 'demo-user' },
    });
  }

  async deleteAllData(): Promise<void> {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.services,
      STORAGE_KEYS.recaps,
      '@wrapped_user_prefs',
    ]);
  }
}

export const api = new WrappedAPI();
