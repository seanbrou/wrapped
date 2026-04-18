import axios from 'axios';
import type { ServicePlugin, Tokens, ServiceStats } from '../types/index.js';

// ── Spotify Plugin ──────────────────────────────────────────────────────────
export const spotifyPlugin: ServicePlugin = {
  id: 'spotify',
  name: 'Spotify',
  logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/84/Spotify_icon.svg',
  scopes: ['user-read-private', 'user-top-read', 'user-read-recently-played'].join(' '),
  authorizeUrl: 'https://accounts.spotify.com/authorize',
  tokenUrl: 'https://accounts.spotify.com/api/token',

  getAuthorizeUrl(state: string) {
    const params = new URLSearchParams({
      client_id: process.env.SPOTIFY_CLIENT_ID || 'SPOTIFY_CLIENT_ID',
      response_type: 'code',
      redirect_uri: 'http://localhost:3000/auth/spotify/callback',
      scope: this.scopes,
      state,
    });
    return `${this.authorizeUrl}?${params}`;
  },

  async exchangeCode(code: string): Promise<Tokens> {
    const clientId = process.env.SPOTIFY_CLIENT_ID || 'SPOTIFY_CLIENT_ID';
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET || 'SPOTIFY_CLIENT_SECRET';
    const resp = await axios.post(this.tokenUrl, new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: 'http://localhost:3000/auth/spotify/callback',
    }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      auth: { username: clientId, password: clientSecret },
    });
    return {
      access_token: resp.data.access_token,
      refresh_token: resp.data.refresh_token,
      expires_at: Date.now() + resp.data.expires_in * 1000,
    };
  },

  async refreshToken(refreshToken: string): Promise<Tokens> {
    const clientId = process.env.SPOTIFY_CLIENT_ID || 'SPOTIFY_CLIENT_ID';
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET || 'SPOTIFY_CLIENT_SECRET';
    const resp = await axios.post(this.tokenUrl, new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      auth: { username: clientId, password: clientSecret },
    });
    return {
      access_token: resp.data.access_token,
      refresh_token: resp.data.refresh_token || refreshToken,
      expires_at: Date.now() + resp.data.expires_in * 1000,
    };
  },

  async fetchUserData(accessToken: string, periodStart: Date, periodEnd: Date) {
    const headers = { Authorization: `Bearer ${accessToken}` };

    const [topArtists, topTracks] = await Promise.all([
      axios.get('https://api.spotify.com/v1/me/top/artists?time_range=long_term&limit=20', { headers }),
      axios.get('https://api.spotify.com/v1/me/top/tracks?time_range=long_term&limit=20', { headers }),
    ]);

    // Calculate total play counts from recently played
    const recentlyPlayed = await axios.get('https://api.spotify.com/v1/me/player/recently-played?limit=50', { headers });

    const trackPlays = new Map<string, number>();
    for (const item of recentlyPlayed.data.items || []) {
      trackPlays.set(item.track.id, (trackPlays.get(item.track.id) || 0) + 1);
    }

    return {
      topArtists: topArtists.data.items?.map((a: Record<string, unknown>) => ({
        name: (a as Record<string, unknown>).name,
        genres: (a as Record<string, unknown>).genres,
      })) || [],
      topTracks: topTracks.data.items?.map((t: Record<string, unknown>) => ({
        name: (t as Record<string, unknown>).name,
        artist: ((t as Record<string, unknown>).artists as Array<Record<string, unknown>>)?.[0]?.name,
        playCount: trackPlays.get(t.id as string) || 0,
      })) || [],
    };
  },

  mapToStats(raw: Record<string, unknown>): ServiceStats {
    const topArtists = (raw.topArtists as Array<{ name: string; genres: string[] }>) || [];
    const topTracks = (raw.topTracks as Array<{ name: string; artist: string; playCount: number }>) || [];

    const allGenres = topArtists.flatMap(a => a.genres || []);
    const genreCounts = allGenres.reduce((acc: Record<string, number>, g: string) => {
      acc[g] = (acc[g] || 0) + 1;
      return acc;
    }, {});
    const topGenre = Object.entries(genreCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown';

    return {
      service: 'spotify',
      period: { start: '', end: '' },
      aggregates: {
        top_items: [
          { category: 'artists', items: topArtists.slice(0, 5).map(a => ({ name: a.name, count: 0 })) },
          { category: 'tracks', items: topTracks.slice(0, 5).map(t => ({ name: `${t.name} — ${t.artist}`, count: t.playCount })) },
        ],
        totals: {
          topArtistsCount: topArtists.length,
          topTracksCount: topTracks.length,
        },
        streaks: {},
        comparisons: [],
      },
    };
  },
};

// ── Strava Plugin ───────────────────────────────────────────────────────────
export const stravaPlugin: ServicePlugin = {
  id: 'strava',
  name: 'Strava',
  logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/45/Strava_logo.svg',
  scopes: ['activity:read_all', 'profile:read_all'].join(' '),
  authorizeUrl: 'https://www.strava.com/oauth/authorize',
  tokenUrl: 'https://www.strava.com/oauth/token',

  getAuthorizeUrl(state: string) {
    const params = new URLSearchParams({
      client_id: process.env.STRAVA_CLIENT_ID || 'STRAVA_CLIENT_ID',
      redirect_uri: 'http://localhost:3000/auth/strava/callback',
      response_type: 'code',
      scope: this.scopes,
      state,
    });
    return `${this.authorizeUrl}?${params}`;
  },

  async exchangeCode(code: string): Promise<Tokens> {
    const resp = await axios.post(this.tokenUrl, {
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
    });
    return {
      access_token: resp.data.access_token,
      refresh_token: resp.data.refresh_token,
      expires_at: resp.data.expires_at * 1000,
    };
  },

  async refreshToken(refreshToken: string): Promise<Tokens> {
    const resp = await axios.post(this.tokenUrl, {
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });
    return {
      access_token: resp.data.access_token,
      refresh_token: resp.data.refresh_token,
      expires_at: resp.data.expires_at * 1000,
    };
  },

  async fetchUserData(accessToken: string, periodStart: Date, periodEnd: Date) {
    const after = Math.floor(periodStart.getTime() / 1000);
    const headers = { Authorization: `Bearer ${accessToken}` };
    const resp = await axios.get(
      `https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=200`,
      { headers }
    );
    return { activities: resp.data || [] };
  },

  mapToStats(raw: Record<string, unknown>): ServiceStats {
    const activities = raw.activities as Array<{
      type: string;
      distance: number;
      elapsed_time: number;
      start_date: string;
    }> || [];

    const totalDistanceKm = activities.reduce((sum, a) => sum + (a.distance || 0) / 1000, 0);
    const activityTypes = activities.reduce((acc: Record<string, number>, a) => {
      acc[a.type] = (acc[a.type] || 0) + 1;
      return acc;
    }, {});
    const topSport = Object.entries(activityTypes).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Running';

    const monthlyDistance: Record<string, number> = {};
    for (const a of activities) {
      const month = a.start_date?.substring(0, 7);
      if (month) monthlyDistance[month] = (monthlyDistance[month] || 0) + a.distance / 1000;
    }

    return {
      service: 'strava',
      period: { start: '', end: '' },
      aggregates: {
        top_items: [{ category: 'activities', items: [] }],
        totals: {
          totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
          activityCount: activities.length,
        },
        streaks: { topSport },
        comparisons: [],
      },
    };
  },
};

// ── Goodreads Plugin ───────────────────────────────────────────────────────
export const goodreadsPlugin: ServicePlugin = {
  id: 'goodreads',
  name: 'Goodreads',
  logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/82/Goodreads_logo.svg',
  scopes: 'read_reviews',
  authorizeUrl: 'https://www.goodreads.com/oauth/authorize',
  tokenUrl: 'https://www.goodreads.com/oauth/access_token',

  getAuthorizeUrl(state: string) {
    const params = new URLSearchParams({
      oauth_token: process.env.GOODREADS_TOKEN || '',
      oauth_callback: 'http://localhost:3000/auth/goodreads/callback',
      state,
    });
    return `${this.authorizeUrl}?${params}`;
  },

  async exchangeCode(code: string): Promise<Tokens> {
    // Goodreads uses OAuth 1.0a — simplified for demo
    return { access_token: code };
  },

  async refreshToken(): Promise<Tokens> {
    return { access_token: '' };
  },

  async fetchUserData() {
    // Goodreads OAuth 1 is complex — mock data for now
    return { booksRead: 47, pagesRead: 12834 };
  },

  mapToStats(raw: Record<string, unknown>): ServiceStats {
    return {
      service: 'goodreads',
      period: { start: '', end: '' },
      aggregates: {
        top_items: [],
        totals: {
          booksRead: raw.booksRead || 0,
          pagesRead: raw.pagesRead || 0,
        },
        streaks: {},
        comparisons: [],
      },
    };
  },
};

// ── Steam Plugin ────────────────────────────────────────────────────────────
export const steamPlugin: ServicePlugin = {
  id: 'steam',
  name: 'Steam',
  logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/83/Steam_icon_logo.svg',
  scopes: 'read_profile',
  authorizeUrl: 'https://steamcommunity.com/openid/login',
  tokenUrl: '',

  getAuthorizeUrl(state: string) {
    const params = new URLSearchParams();
    params.set('openid.ns', 'http://specs.openid.net/auth/2.8');
    params.set('openid.mode', 'checkid_setup');
    params.set('openid.return_to', 'http://localhost:3000/auth/steam/callback');
    params.set('openid.realm', 'http://localhost:3000');
    params.set('openid.identity', 'http://specs.openid.net/auth/2.8/identifier_select');
    params.set('openid.claimed_id', 'http://specs.openid.net/auth/2.8/identifier_select');
    params.set('state', state);
    return `${this.authorizeUrl}?${params}`;
  },

  async exchangeCode(): Promise<Tokens> {
    return { access_token: 'steam-demo' };
  },

  async refreshToken(): Promise<Tokens> {
    return { access_token: '' };
  },

  async fetchUserData() {
    // Steam Web API mock
    return { gamesPlayed: 12, totalHours: 1347, topGames: ['Baldur\'s Gate 3', 'Elden Ring', 'Cyberpunk 2077'] };
  },

  mapToStats(raw: Record<string, unknown>): ServiceStats {
    return {
      service: 'steam',
      period: { start: '', end: '' },
      aggregates: {
        top_items: [{
          category: 'games',
          items: ((raw.topGames as string[]) || []).map(g => ({ name: g, count: 0 })),
        }],
        totals: {
          gamesPlayed: raw.gamesPlayed || 0,
          totalHours: raw.totalHours || 0,
        },
        streaks: {},
        comparisons: [],
      },
    };
  },
};

// ── Apple Health Plugin (mock) ──────────────────────────────────────────────
export const appleHealthPlugin: ServicePlugin = {
  id: 'apple_health',
  name: 'Apple Health',
  logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/3c/Apple_Health_Logo.png',
  scopes: 'healthkit',
  authorizeUrl: 'https://apple.com',
  tokenUrl: '',

  getAuthorizeUrl(state: string) {
    return `https://apple.com/healthkit?state=${state}`;
  },

  async exchangeCode(): Promise<Tokens> {
    return { access_token: 'apple-health-demo' };
  },

  async refreshToken(): Promise<Tokens> {
    return { access_token: '' };
  },

  async fetchUserData() {
    // HealthKit requires native app + special entitlements — mock for demo
    return { totalSteps: 3847291, workouts: 187, calories: 89234, activeMinutes: 14230, sleepHours: 2450 };
  },

  mapToStats(raw: Record<string, unknown>): ServiceStats {
    return {
      service: 'apple_health',
      period: { start: '', end: '' },
      aggregates: {
        top_items: [],
        totals: {
          totalSteps: raw.totalSteps || 0,
          workouts: raw.workouts || 0,
          calories: raw.calories || 0,
          activeMinutes: raw.activeMinutes || 0,
          sleepHours: raw.sleepHours || 0,
        },
        streaks: {},
        comparisons: [],
      },
    };
  },
};
