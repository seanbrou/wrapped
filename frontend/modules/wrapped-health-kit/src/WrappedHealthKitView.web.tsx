import * as React from 'react';

import { WrappedHealthKitViewProps } from './WrappedHealthKit.types';

export default function WrappedHealthKitView(props: WrappedHealthKitViewProps) {
  const url = props.url ?? 'about:blank';

  return (
    <div>
      <iframe
        style={{ flex: 1 }}
        src={url}
        onLoad={() => props.onLoad?.({ nativeEvent: { url } })}
      />
    </div>
  );
}
