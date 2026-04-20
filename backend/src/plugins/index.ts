import axios from 'axios';
import crypto from 'node:crypto';
import type {
  ConnectFinishContext,
  ConnectStartContext,
  ServiceAdapter,
  ServiceAggregateSet,
  ServiceId,
  ServiceStats,
  Tokens,
  TopItem,
} from '../types/index.js';

const axiosClient = axios.create({
  timeout: 20_000,
});

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function md5(input: string) {
  return crypto.createHash('md5').update(input).digest('hex');
}

function signLastfmParams(params: Record<string, string>) {
  const secret = requireEnv('LASTFM_API_SECRET');
  const sorted = Object.keys(params)
    .sort()
    .map((key) => `${key}${params[key]}`)
    .join('');
  return md5(sorted + secret);
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildMonthlySeries(periodStart: Date, valuesByMonth: Map<string, number>) {
  const labels: string[] = [];
  const data: number[] = [];
  const cursor = new Date(periodStart);
  cursor.setDate(1);

  for (let index = 0; index < 12; index += 1) {
    const key = `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, '0')}`;
    labels.push(cursor.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }).slice(0, 1));
    data.push(Math.round((valuesByMonth.get(key) ?? 0) * 10) / 10);
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return { labels, data };
}

function countsToItems(entries: Array<[string, number]>, limit = 5): TopItem[] {
  return entries
    .sort((left, right) => right[1] - left[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}

function emptyAggregates(): ServiceAggregateSet {
  return {
    top_items: [],
    totals: {},
    streaks: {},
    comparisons: [],
    charts: [],
    meta: {},
  };
}

async function validateSteamOpenId(params: Record<string, string | undefined>) {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) body.set(key, value);
  }
  body.set('openid.mode', 'check_authentication');

  const response = await axiosClient.post('https://steamcommunity.com/openid/login', body, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    responseType: 'text',
  });

  return response.data.includes('is_valid:true');
}

async function exchangeOauthCode(input: {
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
}) {
  const response = await axiosClient.post(
    input.tokenUrl,
    new URLSearchParams({
      grant_type: 'authorization_code',
      code: input.code,
      redirect_uri: input.redirectUri,
    }),
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      auth: {
        username: input.clientId,
        password: input.clientSecret,
      },
    },
  );

  return response.data as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    token_type?: string;
    scope?: string;
  };
}

async function refreshOauthToken(input: {
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}) {
  const response = await axiosClient.post(
    input.tokenUrl,
    new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: input.refreshToken,
    }),
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      auth: {
        username: input.clientId,
        password: input.clientSecret,
      },
    },
  );

  return response.data as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    token_type?: string;
    scope?: string;
  };
}

function finishOauth(tokens: {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
}): Tokens {
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: tokens.expires_in ? Date.now() + tokens.expires_in * 1000 : null,
    tokenType: tokens.token_type ?? 'Bearer',
    scope: tokens.scope,
  };
}

const spotifyScopes = ['user-read-private', 'user-top-read', 'user-read-recently-played'].join(' ');

export const spotifyPlugin: ServiceAdapter = {
  id: 'spotify',
  name: 'Spotify',
  logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/84/Spotify_icon.svg',
  connectionKind: 'oauth2_pkce',
  supported: true,
  scopes: spotifyScopes.split(' '),
  connect: {
    start(context: ConnectStartContext) {
      const params = new URLSearchParams({
        client_id: requireEnv('SPOTIFY_CLIENT_ID'),
        response_type: 'code',
        redirect_uri: context.callbackBaseUrl,
        scope: spotifyScopes,
        state: context.requestId,
        show_dialog: 'false',
      });

      return {
        url: `https://accounts.spotify.com/authorize?${params.toString()}`,
      };
    },

    async finish(context: ConnectFinishContext) {
      const code = context.params.code;
      if (!code) {
        throw new Error('Spotify callback missing code');
      }

      const tokenData = await exchangeOauthCode({
        tokenUrl: 'https://accounts.spotify.com/api/token',
        clientId: requireEnv('SPOTIFY_CLIENT_ID'),
        clientSecret: requireEnv('SPOTIFY_CLIENT_SECRET'),
        code,
        redirectUri: context.callbackBaseUrl,
      });

      const profile = await axiosClient.get('https://api.spotify.com/v1/me', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });

      return {
        ...finishOauth(tokenData),
        externalAccountId: profile.data.id as string,
        metadata: { displayName: profile.data.display_name as string | undefined },
      };
    },
  },

  async refresh(refreshToken) {
    return finishOauth(
      await refreshOauthToken({
        tokenUrl: 'https://accounts.spotify.com/api/token',
        clientId: requireEnv('SPOTIFY_CLIENT_ID'),
        clientSecret: requireEnv('SPOTIFY_CLIENT_SECRET'),
        refreshToken,
      }),
    );
  },

  async sync(context) {
    if (!context.accessToken) throw new Error('Spotify access token missing');
    const headers = { Authorization: `Bearer ${context.accessToken}` };

    const [topArtistsResponse, topTracksResponse, recentResponse] = await Promise.all([
      axiosClient.get('https://api.spotify.com/v1/me/top/artists?time_range=long_term&limit=20', { headers }),
      axiosClient.get('https://api.spotify.com/v1/me/top/tracks?time_range=long_term&limit=20', { headers }),
      axiosClient.get('https://api.spotify.com/v1/me/player/recently-played?limit=50', { headers }),
    ]);

    const topArtists = (topArtistsResponse.data.items as Array<{ name: string; genres: string[] }>) ?? [];
    const topTracks = (topTracksResponse.data.items as Array<{ name: string; artists: Array<{ name: string }> }>) ?? [];
    const recentItems =
      (recentResponse.data.items as Array<{ track?: { name?: string; artists?: Array<{ name: string }> } }>) ?? [];

    const genreCounts = new Map<string, number>();
    for (const artist of topArtists) {
      for (const genre of artist.genres ?? []) {
        genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + 1);
      }
    }

    const topGenreEntries = [...genreCounts.entries()].sort((left, right) => right[1] - left[1]);
    const recentTrackCounts = new Map<string, number>();
    for (const item of recentItems) {
      const name = item.track?.name;
      const artist = item.track?.artists?.[0]?.name;
      if (!name) continue;
      const key = artist ? `${name} - ${artist}` : name;
      recentTrackCounts.set(key, (recentTrackCounts.get(key) ?? 0) + 1);
    }

    return {
      service: 'spotify',
      period: { start: isoDate(context.periodStart), end: isoDate(context.periodEnd) },
      aggregates: {
        top_items: [
          {
            category: 'artists',
            items: topArtists.slice(0, 5).map((artist, index) => ({
              name: artist.name,
              count: topArtists.length - index,
            })),
          },
          {
            category: 'tracks',
            items: topTracks.slice(0, 5).map((track, index) => ({
              name: `${track.name} - ${track.artists?.[0]?.name ?? 'Unknown Artist'}`,
              count: Math.max(1, topTracks.length - index),
            })),
          },
          {
            category: 'genres',
            items: countsToItems(topGenreEntries, 5),
          },
        ],
        totals: {
          trackedTopArtists: topArtists.length,
          trackedTopTracks: topTracks.length,
          recentPlaysSample: recentItems.length,
        },
        streaks: {
          topGenre: topGenreEntries[0]?.[0] ?? 'genre-hopping',
          topArtist: topArtists[0]?.name ?? 'No top artist yet',
          topTrack: topTracks[0]?.name ?? 'No top track yet',
        },
        comparisons: [],
        charts: [
          {
            title: 'Top Genres',
            chartType: 'bar',
            data: topGenreEntries.slice(0, 5).map((entry) => entry[1]),
            labels: topGenreEntries.slice(0, 5).map((entry) => entry[0].slice(0, 1).toUpperCase()),
          },
        ],
        meta: {
          sampleBased: true,
          topRecentTrack: [...recentTrackCounts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? '',
        },
      },
    };
  },
};

export const stravaPlugin: ServiceAdapter = {
  id: 'strava',
  name: 'Strava',
  logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/45/Strava_logo.svg',
  connectionKind: 'oauth2',
  supported: true,
  scopes: ['activity:read_all', 'profile:read_all'],
  connect: {
    start(context: ConnectStartContext) {
      const params = new URLSearchParams({
        client_id: requireEnv('STRAVA_CLIENT_ID'),
        response_type: 'code',
        redirect_uri: context.callbackBaseUrl,
        approval_prompt: 'auto',
        scope: 'activity:read_all,profile:read_all',
        state: context.requestId,
      });

      return {
        url: `https://www.strava.com/oauth/authorize?${params.toString()}`,
      };
    },

    async finish(context: ConnectFinishContext) {
      const code = context.params.code;
      if (!code) throw new Error('Strava callback missing code');

      const response = await axiosClient.post('https://www.strava.com/oauth/token', {
        client_id: requireEnv('STRAVA_CLIENT_ID'),
        client_secret: requireEnv('STRAVA_CLIENT_SECRET'),
        code,
        grant_type: 'authorization_code',
      });

      return {
        accessToken: response.data.access_token as string,
        refreshToken: response.data.refresh_token as string,
        expiresAt: (response.data.expires_at as number) * 1000,
        tokenType: 'Bearer',
        externalAccountId: String(response.data.athlete?.id ?? ''),
        metadata: {
          athleteName: `${response.data.athlete?.firstname ?? ''} ${response.data.athlete?.lastname ?? ''}`.trim(),
        },
      };
    },
  },

  async refresh(refreshToken) {
    const response = await axiosClient.post('https://www.strava.com/oauth/token', {
      client_id: requireEnv('STRAVA_CLIENT_ID'),
      client_secret: requireEnv('STRAVA_CLIENT_SECRET'),
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });

    return {
      accessToken: response.data.access_token as string,
      refreshToken: response.data.refresh_token as string,
      expiresAt: (response.data.expires_at as number) * 1000,
      tokenType: 'Bearer',
    };
  },

  async sync(context) {
    if (!context.accessToken) throw new Error('Strava access token missing');

    const after = Math.floor(context.periodStart.getTime() / 1000);
    const before = Math.floor(context.periodEnd.getTime() / 1000);
    const headers = { Authorization: `Bearer ${context.accessToken}` };
    const activities: Array<{
      name: string;
      type: string;
      distance: number;
      moving_time: number;
      start_date: string;
    }> = [];

    for (let page = 1; page <= 3; page += 1) {
      const response = await axiosClient.get('https://www.strava.com/api/v3/athlete/activities', {
        headers,
        params: { after, before, per_page: 200, page },
      });

      const batch = response.data as typeof activities;
      activities.push(...batch);
      if (batch.length < 200) break;
    }

    const bySport = new Map<string, number>();
    const byMonth = new Map<string, number>();
    for (const activity of activities) {
      bySport.set(activity.type, (bySport.get(activity.type) ?? 0) + 1);
      const date = new Date(activity.start_date);
      const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
      byMonth.set(key, (byMonth.get(key) ?? 0) + activity.distance / 1000);
    }

    const totalDistanceKm = activities.reduce((sum, activity) => sum + activity.distance / 1000, 0);
    const totalMovingHours = activities.reduce((sum, activity) => sum + activity.moving_time / 3600, 0);
    const monthly = buildMonthlySeries(context.periodStart, byMonth);
    const topSports = countsToItems([...bySport.entries()], 5);

    return {
      service: 'strava',
      period: { start: isoDate(context.periodStart), end: isoDate(context.periodEnd) },
      aggregates: {
        top_items: [{ category: 'sports', items: topSports }],
        totals: {
          totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
          totalMovingHours: Math.round(totalMovingHours * 10) / 10,
          activityCount: activities.length,
        },
        streaks: {
          topSport: topSports[0]?.name ?? 'Running',
        },
        comparisons: [
          {
            label: 'Average month',
            current: Math.round(totalDistanceKm * 10) / 10,
            previous: Math.round((totalDistanceKm / 12) * 10) / 10,
            unit: 'km',
          },
        ],
        charts: [
          {
            title: 'Monthly Distance',
            chartType: 'area',
            data: monthly.data,
            labels: monthly.labels,
            unit: 'km',
          },
        ],
      },
    };
  },
};

export const fitbitPlugin: ServiceAdapter = {
  id: 'fitbit',
  name: 'Fitbit',
  logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/e0/Fitbit_logo16.svg',
  connectionKind: 'oauth2_pkce',
  supported: true,
  scopes: ['activity', 'heartrate', 'profile', 'sleep'],
  connect: {
    start(context: ConnectStartContext) {
      const params = new URLSearchParams({
        client_id: requireEnv('FITBIT_CLIENT_ID'),
        response_type: 'code',
        redirect_uri: context.callbackBaseUrl,
        scope: 'activity heartrate profile sleep',
        state: context.requestId,
      });

      return {
        url: `https://www.fitbit.com/oauth2/authorize?${params.toString()}`,
      };
    },

    async finish(context: ConnectFinishContext) {
      const code = context.params.code;
      if (!code) throw new Error('Fitbit callback missing code');

      const tokenData = await exchangeOauthCode({
        tokenUrl: 'https://api.fitbit.com/oauth2/token',
        clientId: requireEnv('FITBIT_CLIENT_ID'),
        clientSecret: requireEnv('FITBIT_CLIENT_SECRET'),
        code,
        redirectUri: context.callbackBaseUrl,
      });

      const profile = await axiosClient.get('https://api.fitbit.com/1/user/-/profile.json', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });

      return {
        ...finishOauth(tokenData),
        externalAccountId: profile.data.user?.encodedId as string,
        metadata: {
          displayName: profile.data.user?.displayName as string | undefined,
        },
      };
    },
  },

  async refresh(refreshToken) {
    return finishOauth(
      await refreshOauthToken({
        tokenUrl: 'https://api.fitbit.com/oauth2/token',
        clientId: requireEnv('FITBIT_CLIENT_ID'),
        clientSecret: requireEnv('FITBIT_CLIENT_SECRET'),
        refreshToken,
      }),
    );
  },

  async sync(context) {
    if (!context.accessToken) throw new Error('Fitbit access token missing');

    const headers = { Authorization: `Bearer ${context.accessToken}` };
    const start = isoDate(context.periodStart);
    const end = isoDate(context.periodEnd);

    const [stepsResponse, caloriesResponse, activeResponse] = await Promise.all([
      axiosClient.get(`https://api.fitbit.com/1/user/-/activities/steps/date/${start}/${end}.json`, { headers }),
      axiosClient.get(`https://api.fitbit.com/1/user/-/activities/calories/date/${start}/${end}.json`, { headers }),
      axiosClient.get(`https://api.fitbit.com/1/user/-/activities/minutesVeryActive/date/${start}/${end}.json`, { headers }),
    ]);

    const stepsSeries = (stepsResponse.data['activities-steps'] as Array<{ dateTime: string; value: string }>) ?? [];
    const caloriesSeries =
      (caloriesResponse.data['activities-calories'] as Array<{ dateTime: string; value: string }>) ?? [];
    const activeSeries =
      (activeResponse.data['activities-minutesVeryActive'] as Array<{ dateTime: string; value: string }>) ?? [];

    const stepsTotal = stepsSeries.reduce((sum, entry) => sum + Number(entry.value || 0), 0);
    const caloriesTotal = caloriesSeries.reduce((sum, entry) => sum + Number(entry.value || 0), 0);
    const activeTotal = activeSeries.reduce((sum, entry) => sum + Number(entry.value || 0), 0);
    const byMonth = new Map<string, number>();

    for (const entry of stepsSeries) {
      const date = new Date(entry.dateTime);
      const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
      byMonth.set(key, (byMonth.get(key) ?? 0) + Number(entry.value || 0));
    }

    const monthly = buildMonthlySeries(context.periodStart, byMonth);

    return {
      service: 'fitbit',
      period: { start, end },
      aggregates: {
        top_items: [],
        totals: {
          totalSteps: stepsTotal,
          caloriesBurned: caloriesTotal,
          activeMinutes: activeTotal,
        },
        streaks: {
          bestDaySteps: Math.max(...stepsSeries.map((entry) => Number(entry.value || 0)), 0),
        },
        comparisons: [
          {
            label: 'Average month',
            current: stepsTotal,
            previous: Math.round(stepsTotal / 12),
            unit: 'steps',
          },
        ],
        charts: [
          {
            title: 'Monthly Steps',
            chartType: 'area',
            data: monthly.data,
            labels: monthly.labels,
            unit: 'steps',
          },
        ],
      },
    };
  },
};

export const lastfmPlugin: ServiceAdapter = {
  id: 'lastfm',
  name: 'Last.fm',
  logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/d/d4/Lastfm_logo.svg',
  connectionKind: 'oauth1',
  supported: true,
  connect: {
    async start() {
      const params = {
        api_key: requireEnv('LASTFM_API_KEY'),
        method: 'auth.getToken',
      };
      const api_sig = signLastfmParams(params);
      const response = await axiosClient.get('https://ws.audioscrobbler.com/2.0/', {
        params: { ...params, api_sig, format: 'json' },
      });

      const token = response.data.token as string;
      return {
        url: `https://www.last.fm/api/auth/?api_key=${encodeURIComponent(requireEnv('LASTFM_API_KEY'))}&token=${encodeURIComponent(token)}`,
        lookupKey: token,
      };
    },

    async finish(context: ConnectFinishContext) {
      const token = context.lookupKey;
      const params = {
        api_key: requireEnv('LASTFM_API_KEY'),
        method: 'auth.getSession',
        token,
      };

      const response = await axiosClient.get('https://ws.audioscrobbler.com/2.0/', {
        params: {
          ...params,
          api_sig: signLastfmParams(params),
          format: 'json',
        },
      });

      return {
        accessToken: response.data.session?.key as string,
        externalAccountId: response.data.session?.name as string,
        metadata: {
          subscriber: response.data.session?.subscriber as number | undefined,
        },
      };
    },
  },

  async sync(context) {
    const username = context.externalAccountId;
    if (!username) throw new Error('Last.fm username missing');

    const apiKey = requireEnv('LASTFM_API_KEY');
    const params = { user: username, api_key: apiKey, format: 'json' };

    const [artistsResponse, tracksResponse, albumsResponse, infoResponse, recentResponse] = await Promise.all([
      axiosClient.get('https://ws.audioscrobbler.com/2.0/', { params: { ...params, method: 'user.gettopartists', period: '12month', limit: 20 } }),
      axiosClient.get('https://ws.audioscrobbler.com/2.0/', { params: { ...params, method: 'user.gettoptracks', period: '12month', limit: 20 } }),
      axiosClient.get('https://ws.audioscrobbler.com/2.0/', { params: { ...params, method: 'user.gettopalbums', period: '12month', limit: 10 } }),
      axiosClient.get('https://ws.audioscrobbler.com/2.0/', { params: { ...params, method: 'user.getinfo' } }),
      axiosClient.get('https://ws.audioscrobbler.com/2.0/', { params: { ...params, method: 'user.getrecenttracks', limit: 50 } }),
    ]);

    const artists =
      (artistsResponse.data.topartists?.artist as Array<{ name: string; playcount: string }>)?.map((artist) => ({
        name: artist.name,
        count: Number(artist.playcount || 0),
      })) ?? [];
    const tracks =
      (tracksResponse.data.toptracks?.track as Array<{ name: string; artist: { name: string }; playcount: string }>)?.map((track) => ({
        name: `${track.name} - ${track.artist?.name ?? 'Unknown Artist'}`,
        count: Number(track.playcount || 0),
      })) ?? [];
    const albums =
      (albumsResponse.data.topalbums?.album as Array<{ name: string; playcount: string }>)?.map((album) => ({
        name: album.name,
        count: Number(album.playcount || 0),
      })) ?? [];
    const recentTrackSample =
      (recentResponse.data.recenttracks?.track as Array<unknown>)?.length ?? 0;

    return {
      service: 'lastfm',
      period: { start: isoDate(context.periodStart), end: isoDate(context.periodEnd) },
      aggregates: {
        top_items: [
          { category: 'artists', items: artists.slice(0, 5) },
          { category: 'tracks', items: tracks.slice(0, 5) },
          { category: 'albums', items: albums.slice(0, 5) },
        ],
        totals: {
          scrobblesOverall: Number(infoResponse.data.user?.playcount ?? 0),
          artistsTracked: artists.length,
          tracksTracked: tracks.length,
          recentTrackSample,
        },
        streaks: {
          topArtist: artists[0]?.name ?? 'No top artist yet',
          topTrack: tracks[0]?.name ?? 'No top track yet',
        },
        comparisons: [],
        charts: [
          {
            title: 'Top Artists',
            chartType: 'bar',
            data: artists.slice(0, 5).map((item) => item.count),
            labels: artists.slice(0, 5).map((item) => item.name.slice(0, 1).toUpperCase()),
          },
        ],
      },
    };
  },
};

export const steamPlugin: ServiceAdapter = {
  id: 'steam',
  name: 'Steam',
  logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/83/Steam_icon_logo.svg',
  connectionKind: 'openid',
  supported: true,
  connect: {
    start(context: ConnectStartContext) {
      const params = new URLSearchParams({
        'openid.ns': 'http://specs.openid.net/auth/2.0',
        'openid.mode': 'checkid_setup',
        'openid.return_to': `${context.callbackBaseUrl}?state=${encodeURIComponent(context.requestId)}`,
        'openid.realm': new URL(context.callbackBaseUrl).origin,
        'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
        'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select',
      });

      return {
        url: `https://steamcommunity.com/openid/login?${params.toString()}`,
      };
    },

    async finish(context: ConnectFinishContext) {
      const valid = await validateSteamOpenId(context.params);
      if (!valid) throw new Error('Steam OpenID validation failed');

      const claimedId = context.params['openid.claimed_id'];
      const steamId = claimedId?.split('/').pop();
      if (!steamId) throw new Error('Steam claimed id missing');

      return {
        accessToken: steamId,
        externalAccountId: steamId,
      };
    },
  },

  async sync(context) {
    const steamId = context.externalAccountId || context.accessToken;
    if (!steamId) throw new Error('Steam account id missing');

    const response = await axiosClient.get('https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/', {
      params: {
        key: requireEnv('STEAM_WEB_API_KEY'),
        steamid: steamId,
        include_appinfo: true,
        include_played_free_games: true,
      },
    });

    const games =
      (response.data.response?.games as Array<{ name: string; playtime_forever: number }>)?.map((game) => ({
        name: game.name,
        count: Math.round((game.playtime_forever || 0) / 60),
      })) ?? [];
    const sortedGames = games.sort((left, right) => right.count - left.count);
    const totalHours = sortedGames.reduce((sum, game) => sum + game.count, 0);

    return {
      service: 'steam',
      period: { start: isoDate(context.periodStart), end: isoDate(context.periodEnd) },
      aggregates: {
        top_items: [{ category: 'games', items: sortedGames.slice(0, 5) }],
        totals: {
          gamesOwned: games.length,
          gamesPlayed: sortedGames.filter((game) => game.count > 0).length,
          totalHours,
        },
        streaks: {
          topGame: sortedGames[0]?.name ?? 'No game data yet',
        },
        comparisons: [],
        charts: [
          {
            title: 'Top Games by Hours',
            chartType: 'bar',
            data: sortedGames.slice(0, 5).map((game) => game.count),
            labels: sortedGames.slice(0, 5).map((game) => game.name.slice(0, 1).toUpperCase()),
          },
        ],
      },
    };
  },
};

export const appleHealthPlugin: ServiceAdapter = {
  id: 'apple_health',
  name: 'Apple Health',
  logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/3c/Apple_Health_Logo.png',
  connectionKind: 'device',
  supported: true,
  localOnly: true,
};

export const goodreadsPlugin: ServiceAdapter = {
  id: 'goodreads',
  name: 'Goodreads',
  logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/82/Goodreads_logo.svg',
  connectionKind: 'unsupported',
  supported: false,
  deferred: true,
  disabledReason: 'Goodreads public API access is deprecated for new production integrations.',
};

export const youtubePlugin: ServiceAdapter = {
  id: 'youtube',
  name: 'YouTube',
  logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/b8/YouTube_Logo_2017.svg',
  connectionKind: 'unsupported',
  supported: false,
  deferred: true,
  disabledReason: 'Consumer watch-history recaps are not available from the official YouTube API.',
};

export const serviceAdapters: Record<ServiceId, ServiceAdapter> = {
  spotify: spotifyPlugin,
  apple_health: appleHealthPlugin,
  strava: stravaPlugin,
  fitbit: fitbitPlugin,
  lastfm: lastfmPlugin,
  steam: steamPlugin,
  goodreads: goodreadsPlugin,
  youtube: youtubePlugin,
};

export const supportedServiceIds = Object.values(serviceAdapters)
  .filter((service) => service.supported)
  .map((service) => service.id);

export function getServiceAdapter(serviceId: string) {
  return serviceAdapters[serviceId as ServiceId] ?? null;
}
