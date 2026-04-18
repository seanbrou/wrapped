import AsyncStorage from '@react-native-async-storage/async-storage';
import { MOCK_SERVICES, MOCK_WRAPPED, Service, WrappedData } from './mockData';

const STORAGE_KEYS = {
  SERVICES: '@wrapped_services',
  WRAPPED: '@wrapped_data',
  USER_PREFS: '@wrapped_user_prefs',
};

class WrappedAPI {
  private useMock = true;

  async getServices(): Promise<Service[]> {
    if (this.useMock) {
      return MOCK_SERVICES;
    }
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.SERVICES);
      return data ? JSON.parse(data) : MOCK_SERVICES;
    } catch {
      return MOCK_SERVICES;
    }
  }

  async connectService(serviceId: string): Promise<Service> {
    if (this.useMock) {
      const service = MOCK_SERVICES.find(s => s.id === serviceId);
      if (!service) throw new Error('Service not found');
      return { ...service, connected: true, lastSynced: new Date().toISOString().split('T')[0] };
    }
    throw new Error('Not implemented');
  }

  async revokeService(serviceId: string): Promise<void> {
    if (this.useMock) {
      return;
    }
    throw new Error('Not implemented');
  }

  async getWrapped(userId: string, year: number): Promise<WrappedData | null> {
    if (this.useMock) {
      return MOCK_WRAPPED;
    }
    try {
      const data = await AsyncStorage.getItem(`${STORAGE_KEYS.WRAPPED}_${userId}_${year}`);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  async generateWrapped(userId: string, services: string[], year: number): Promise<WrappedData> {
    if (this.useMock) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      return {
        ...MOCK_WRAPPED,
        year,
        services,
        createdAt: new Date().toISOString(),
      };
    }
    throw new Error('Not implemented');
  }

  async shareWrapped(wrapped: WrappedData, platform: 'stories' | 'pdf'): Promise<void> {
    if (this.useMock) {
      console.log('Sharing to:', platform);
      return;
    }
    throw new Error('Not implemented');
  }

  async saveUserPreference(key: string, value: any): Promise<void> {
    try {
      const prefs = await this.getUserPreferences();
      prefs[key] = value;
      await AsyncStorage.setItem(STORAGE_KEYS.USER_PREFS, JSON.stringify(prefs));
    } catch (error) {
      console.error('Failed to save preference:', error);
    }
  }

  async getUserPreferences(): Promise<Record<string, any>> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.USER_PREFS);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  }

  async deleteAllData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.SERVICES,
        STORAGE_KEYS.WRAPPED,
        STORAGE_KEYS.USER_PREFS,
      ]);
    } catch (error) {
      console.error('Failed to delete data:', error);
    }
  }
}

export const api = new WrappedAPI();