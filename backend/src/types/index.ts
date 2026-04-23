export type SupportedServiceId =
  | 'spotify'
  | 'apple_health'
  | 'strava'
  | 'fitbit'
  | 'lastfm'
  | 'steam'
  | 'github'
  | 'notion'
  | 'trakt'
  | 'reddit'
  | 'rescuetime'
  | 'todoist';

export type DeferredServiceId = 'goodreads' | 'youtube' | 'apple_music';

export type ServiceId = SupportedServiceId | DeferredServiceId;

export type ConnectionKind =
  | 'oauth2'
  | 'oauth2_pkce'
  | 'oauth1'
  | 'openid'
  | 'device'
  | 'unsupported';

export type CardType =
  | 'hero_stat'
  | 'top_list'
  | 'insight'
  | 'chart'
  | 'community'
  | 'comparison'
  | 'share'
  | 'fun_fact'
  | 'streak'
  | 'trend'
  | 'superlative'
  | 'cross_service'
  | 'opener';

export interface Tokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number | null;
  tokenType?: string;
  scope?: string;
  externalAccountId?: string;
  metadata?: Record<string, unknown>;
}

export interface TopItem {
  name: string;
  count: number;
  extra?: Record<string, string | number>;
}

export interface ServiceChart {
  title: string;
  chartType: 'area' | 'bar';
  data: number[];
  labels: string[];
  unit?: string;
}

export interface ServiceComparison {
  label: string;
  current: number;
  previous: number;
  unit?: string;
}

export interface ServiceAggregateSet {
  top_items: { category: string; items: TopItem[] }[];
  totals: Record<string, number>;
  streaks: Record<string, string | number>;
  comparisons: ServiceComparison[];
  charts?: ServiceChart[];
  meta?: Record<string, string | number | boolean>;
}

export interface ServiceStats {
  service: ServiceId;
  period: { start: string; end: string };
  aggregates: ServiceAggregateSet;
}

export interface WrappedHeroStatData {
  stat: string;
  value: string;
  unit?: string;
  comparison: string;
}

export interface WrappedTopListData {
  title: string;
  items: Array<{ rank: number; name: string; stat: string }>;
}

export interface WrappedInsightData {
  headline: string;
  supportingData: Array<{ label: string; value: string }>;
}

export interface WrappedChartData {
  title: string;
  chartType: 'area' | 'bar';
  data: number[];
  labels: string[];
}

export interface WrappedCommunityData {
  percentile: number;
  metric: string;
  value: string;
}

export interface WrappedComparisonData {
  title: string;
  labels: string[];
  values: number[];
  unit: string;
}

export interface WrappedShareData {
  stat: string;
  headline: string;
}

export interface WrappedFunFactData {
  fact: string;
  icon?: string;
}

export interface WrappedStreakData {
  streak: string;
  description: string;
  days?: number;
}

export interface WrappedTrendData {
  trend: string;
  direction: 'up' | 'down' | 'flat';
  context: string;
}

export interface WrappedSuperlativeData {
  superlative: string;
  stat: string;
  value: string;
}

export interface WrappedCrossServiceData {
  headline: string;
  description: string;
  servicesInvolved: string[];
}

export interface WrappedOpenerData {
  headline: string;
  subtitle: string;
  serviceCount: number;
  period: string;
}

export type WrappedCardData =
  | WrappedHeroStatData
  | WrappedTopListData
  | WrappedInsightData
  | WrappedChartData
  | WrappedCommunityData
  | WrappedComparisonData
  | WrappedShareData
  | WrappedFunFactData
  | WrappedStreakData
  | WrappedTrendData
  | WrappedSuperlativeData
  | WrappedCrossServiceData
  | WrappedOpenerData;

export interface WrappedCard {
  id: string;
  type: CardType;
  service: ServiceId | 'all';
  data: WrappedCardData;
}

export interface WrappedSession {
  id: string;
  userId: string;
  services: ServiceId[];
  periodStart: string;
  periodEnd: string;
  cards: WrappedCard[];
  insights: string[];
  createdAt: string;
  templateId?: string | null;
  templateName?: string | null;
  accentKey?: string | null;
}

export interface AuthenticatedContext {
  userId: string;
  installId: string;
}

export interface ServiceConnectionRecord {
  id: string;
  userId: string;
  service: ServiceId;
  externalAccountId: string | null;
  accessTokenEncrypted: string | null;
  refreshTokenEncrypted: string | null;
  tokenType: string | null;
  scope: string | null;
  connectedAt: string;
  lastSyncedAt: string | null;
  expiresAt: number | null;
  metadata: Record<string, unknown>;
  deletedAt: string | null;
}

export type SyncJobStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface SyncJobRecord {
  id: string;
  userId: string;
  service: ServiceId;
  status: SyncJobStatus;
  periodStart: string;
  periodEnd: string;
  attempts: number;
  maxAttempts: number;
  nextAttemptAt: string;
  leaseExpiresAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  stats: ServiceStats | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConnectStartContext {
  requestId: string;
  redirectUri: string;
  callbackBaseUrl: string;
}

export interface ConnectFinishContext {
  lookupKey: string;
  redirectUri: string;
  callbackBaseUrl: string;
  params: Record<string, string | undefined>;
  metadata?: Record<string, unknown>;
}

export interface SyncContext {
  accessToken: string | null;
  refreshToken?: string | null;
  externalAccountId?: string | null;
  connectionMetadata?: Record<string, unknown>;
  periodStart: Date;
  periodEnd: Date;
}

export interface ConnectStartResult {
  url: string;
  lookupKey?: string;
  metadata?: Record<string, unknown>;
}

export interface ServiceDescriptor {
  id: ServiceId;
  name: string;
  logoUrl: string;
  connectionKind: ConnectionKind;
  supported: boolean;
  localOnly?: boolean;
  deferred?: boolean;
  disabledReason?: string;
}

export interface ServiceAdapter extends ServiceDescriptor {
  scopes?: string[];
  connect?: {
    start(context: ConnectStartContext): Promise<ConnectStartResult> | ConnectStartResult;
    finish(context: ConnectFinishContext): Promise<Tokens>;
  };
  refresh?(refreshToken: string, metadata?: Record<string, unknown>): Promise<Tokens>;
  sync?(context: SyncContext): Promise<ServiceStats>;
  buildCards?(stats: ServiceStats, copy?: ServiceCopySuggestions): WrappedCard[];
}

export interface ServiceCopySuggestions {
  heroComparison?: string;
  insightHeadline?: string;
  insightSupportingData?: Array<{ label: string; value: string }>;
  shareHeadline?: string;
  funFact?: string;
  streakHighlight?: string;
  trendObservation?: string;
  superlative?: string;
}
