export interface Tokens {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  token_type?: string;
}

export interface TopItem {
  name: string;
  count: number;
  extra?: Record<string, string | number>;
}

export interface ServiceStats {
  service: string;
  period: { start: string; end: string };
  aggregates: {
    top_items: { category: string; items: TopItem[] }[];
    totals: Record<string, number>;
    streaks: Record<string, number>;
    comparisons: { label: string; current: number; previous: number }[];
  };
}

export interface ServicePlugin {
  id: string;
  name: string;
  logoUrl: string;
  scopes: string[];
  authorizeUrl: string;
  tokenUrl: string;
  getAuthorizeUrl(state: string): string;
  exchangeCode(code: string, codeVerifier?: string): Promise<Tokens>;
  refreshToken(refreshToken: string): Promise<Tokens>;
  fetchUserData(accessToken: string, periodStart: Date, periodEnd: Date): Promise<Record<string, unknown>>;
  mapToStats(raw: Record<string, unknown>): ServiceStats;
}

export interface WrappedCard {
  id: string;
  type: 'hero_stat' | 'top_list' | 'insight' | 'chart' | 'comparison' | 'community' | 'share';
  service: string;
  title: string;
  data: Record<string, unknown>;
}

export interface WrappedSession {
  id: string;
  userId: string;
  services: string[];
  periodStart: string;
  periodEnd: string;
  cards: WrappedCard[];
  insights: string[];
  createdAt: string;
}
