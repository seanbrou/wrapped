export interface ServiceInfo {
  id: string;
  name: string;
  logoUrl: string;
  isConnected: boolean;
  lastSyncedAt?: string | null;
  color?: string;
  connectionKind?: string | null;
  isAvailable?: boolean;
  localOnly?: boolean;
  disabledReason?: string | null;
}

export type SyncJobStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface SyncJobRecord {
  id: string;
  userId: string;
  service: string;
  status: SyncJobStatus;
  periodStart: string;
  periodEnd: string;
  attempts: number;
  maxAttempts: number;
  nextAttemptAt: string;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  stats: {
    service: string;
    period: { start: string; end: string };
    aggregates: Record<string, unknown>;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export type CardType =
  | 'hero_stat'
  | 'top_list'
  | 'insight'
  | 'chart'
  | 'community'
  | 'comparison'
  | 'share';

export interface WrappedCard {
  id?: string;
  type: CardType | string;
  service: string;
  data: Record<string, unknown>;
}

export interface WrappedData {
  sessionId: string;
  year?: number;
  services?: string[];
  cards: WrappedCard[];
  createdAt?: string;
}

export interface RecapSummary {
  id: string;
  templateId: string;
  templateName: string;
  services: string[];
  period: string;
  cardCount: number;
  createdAt: string;
  accentKey: string;
}
