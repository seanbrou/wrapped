import { registerWebModule, NativeModule } from 'expo';

import type { HealthKitAggregate, HealthKitAuthorizationResult } from './WrappedHealthKit.types';

type WrappedHealthKitModuleEvents = Record<string, never>;

class WrappedHealthKitModule extends NativeModule<WrappedHealthKitModuleEvents> {
  isAvailable() {
    return false;
  }

  async requestAuthorization(): Promise<HealthKitAuthorizationResult> {
    return {
      granted: false,
      available: false,
      readTypes: [],
    };
  }

  async syncSummary(): Promise<HealthKitAggregate> {
    throw new Error('Apple Health is only available on iOS devices.');
  }

  async revoke(): Promise<void> {}
}

export default registerWebModule(WrappedHealthKitModule, 'WrappedHealthKit');
