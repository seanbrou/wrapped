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

export interface WrappedCard {
  id: string;
  type: 'hero_stat' | 'top_list' | 'insight' | 'chart' | 'community' | 'comparison' | 'share';
  service: string;
  title?: string;
  data: Record<string, unknown>;
}

export interface WrappedData {
  sessionId: string;
  year: number;
  services: string[];
  cards: WrappedCard[];
  insights: string[];
  createdAt: string;
}

class WrappedAPI {
  private useMock = true;

  async listServices(): Promise<ServiceInfo[]> {
    if (this.useMock) {
      const stored = await AsyncStorage.getItem('@wrapped_services');
      return stored ? JSON.parse(stored) : [];
    }
    const res = await fetch('http://localhost:3000/api/services', {
      headers: { 'x-user-id': 'demo-user' },
    });
    return res.json();
  }

  async connectService(serviceId: string): Promise<ServiceInfo> {
    if (this.useMock) {
      return {
        id: serviceId,
        name: serviceId.replace('_', ' '),
        logoUrl: '',
        isConnected: true,
        lastSyncedAt: new Date().toISOString(),
      };
    }
    const res = await fetch(`http://localhost:3000/api/auth/${serviceId}/url`);
    return res.json();
  }

  async revokeService(serviceId: string): Promise<void> {
    if (this.useMock) {
      const stored = await AsyncStorage.getItem('@wrapped_services');
      if (stored) {
        const services: ServiceInfo[] = JSON.parse(stored);
        const updated = services.map(s =>
          s.id === serviceId ? { ...s, isConnected: false } : s
        );
        await AsyncStorage.setItem('@wrapped_services', JSON.stringify(updated));
      }
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
        ...MOCK_WRAPPED,
        sessionId: id,
        insights: MOCK_WRAPPED.insights,
      };
    }
    const res = await fetch(`http://localhost:3000/api/wrapped/${id}`);
    if (!res.ok) throw new Error('Failed to fetch wrapped');
    return res.json();
  }

  async generateWrapped(serviceIds: string[]): Promise<WrappedData> {
    if (this.useMock) {
      await new Promise(r => setTimeout(r, 2000));
      return {
        sessionId: 'mock-' + Date.now(),
        year: new Date().getFullYear(),
        services: serviceIds,
        cards: MOCK_WRAPPED.cards,
        insights: MOCK_WRAPPED.insights,
        createdAt: new Date().toISOString(),
      };
    }
    const res = await fetch('http://localhost:3000/api/wrapped/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'demo-user',
      },
      body: JSON.stringify({ services: serviceIds }),
    });
    if (!res.ok) throw new Error('Generation failed');
    return res.json();
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
      '@wrapped_services',
      '@wrapped_data',
      '@wrapped_user_prefs',
    ]);
  }
}

export const api = new WrappedAPI();
