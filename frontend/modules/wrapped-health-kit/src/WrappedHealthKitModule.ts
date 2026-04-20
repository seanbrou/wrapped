import { NativeModule, requireNativeModule } from 'expo';

import type { HealthKitAggregate, HealthKitAuthorizationResult } from './WrappedHealthKit.types';

type WrappedHealthKitModuleEvents = Record<string, never>;

declare class WrappedHealthKitModule extends NativeModule<WrappedHealthKitModuleEvents> {
  isAvailable(): boolean;
  requestAuthorization(): Promise<HealthKitAuthorizationResult>;
  syncSummary(periodStart: string, periodEnd: string): Promise<HealthKitAggregate>;
  revoke(): Promise<void>;
}

export default requireNativeModule<WrappedHealthKitModule>('WrappedHealthKit');
