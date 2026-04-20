import { requireNativeView } from 'expo';
import * as React from 'react';

import { WrappedHealthKitViewProps } from './WrappedHealthKit.types';

const NativeView: React.ComponentType<WrappedHealthKitViewProps> =
  requireNativeView('WrappedHealthKit');

export default function WrappedHealthKitView(props: WrappedHealthKitViewProps) {
  return <NativeView {...props} />;
}
