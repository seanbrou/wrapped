export type HealthKitAuthorizationResult = {
  granted: boolean;
  available: boolean;
  readTypes: string[];
};

export type WrappedHealthKitViewProps = {
  url?: string;
  onLoad?: (event: { nativeEvent: { url: string } }) => void;
  style?: unknown;
};

export type HealthKitAggregate = {
  top_items: Array<{
    category: string;
    items: Array<{ name: string; count: number }>;
  }>;
  totals: Record<string, number>;
  streaks: Record<string, string | number>;
  comparisons: Array<{
    label: string;
    current: number;
    previous: number;
    unit?: string;
  }>;
  charts: Array<{
    title: string;
    chartType: 'area' | 'bar';
    data: number[];
    labels: string[];
    unit?: string;
  }>;
  meta: Record<string, string | number | boolean>;
};
