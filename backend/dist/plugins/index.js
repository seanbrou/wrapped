import axios from 'axios';
import crypto from 'node:crypto';
const axiosClient = axios.create({
    timeout: 20_000,
});
function requireEnv(name) {
    const value = process.env[name];
    const normalized = value?.trim();
    if (!normalized) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return normalized;
}
function hasEnv(...names) {
    return names.every((name) => Boolean(process.env[name]?.trim()));
}
function md5(input) {
    return crypto.createHash('md5').update(input).digest('hex');
}
function signLastfmParams(params) {
    const secret = requireEnv('LASTFM_API_SECRET');
    const sorted = Object.keys(params)
        .sort()
        .map((key) => `${key}${params[key]}`)
        .join('');
    return md5(sorted + secret);
}
function isoDate(date) {
    return date.toISOString().slice(0, 10);
}
function buildMonthlySeries(periodStart, valuesByMonth) {
    const labels = [];
    const data = [];
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
function countsToItems(entries, limit = 5) {
    return entries
        .sort((left, right) => right[1] - left[1])
        .slice(0, limit)
        .map(([name, count]) => ({ name, count }));
}
function emptyAggregates() {
    return {
        top_items: [],
        totals: {},
        streaks: {},
        comparisons: [],
        charts: [],
        meta: {},
    };
}
async function validateSteamOpenId(params) {
    const body = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (value)
            body.set(key, value);
    }
    body.set('openid.mode', 'check_authentication');
    const response = await axiosClient.post('https://steamcommunity.com/openid/login', body, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        responseType: 'text',
    });
    return response.data.includes('is_valid:true');
}
async function exchangeOauthCode(input) {
    const response = await axiosClient.post(input.tokenUrl, new URLSearchParams({
        grant_type: 'authorization_code',
        code: input.code,
        redirect_uri: input.redirectUri,
    }), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        auth: {
            username: input.clientId,
            password: input.clientSecret,
        },
    });
    return response.data;
}
async function refreshOauthToken(input) {
    const response = await axiosClient.post(input.tokenUrl, new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: input.refreshToken,
    }), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        auth: {
            username: input.clientId,
            password: input.clientSecret,
        },
    });
    return response.data;
}
function finishOauth(tokens) {
    return {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: tokens.expires_in ? Date.now() + tokens.expires_in * 1000 : null,
        tokenType: tokens.token_type ?? 'Bearer',
        scope: tokens.scope,
    };
}
const githubApiHeaders = () => ({
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
});
function notionBasicAuth(clientId, clientSecret) {
    return Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
}
function notionHeaders(accessToken) {
    return {
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        'Content-Type': 'application/json',
        'Notion-Version': '2026-03-11',
    };
}
function notionTitleFrom(result) {
    if (result.object === 'page') {
        const properties = result.properties ?? {};
        for (const value of Object.values(properties)) {
            if (value?.type === 'title') {
                const text = value.title
                    ?.map((item) => item.plain_text ?? '')
                    .join('')
                    .trim();
                if (text)
                    return text;
            }
        }
    }
    const titleArray = result.title ??
        result.name;
    const title = titleArray?.map((item) => item.plain_text ?? '').join('').trim();
    return title || 'Untitled';
}
const spotifyScopes = ['user-read-private', 'user-top-read', 'user-read-recently-played'].join(' ');
export const spotifyPlugin = {
    id: 'spotify',
    name: 'Spotify',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/84/Spotify_icon.svg',
    connectionKind: 'oauth2_pkce',
    supported: true,
    scopes: spotifyScopes.split(' '),
    connect: {
        start(context) {
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
        async finish(context) {
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
                externalAccountId: profile.data.id,
                metadata: { displayName: profile.data.display_name },
            };
        },
    },
    async refresh(refreshToken) {
        return finishOauth(await refreshOauthToken({
            tokenUrl: 'https://accounts.spotify.com/api/token',
            clientId: requireEnv('SPOTIFY_CLIENT_ID'),
            clientSecret: requireEnv('SPOTIFY_CLIENT_SECRET'),
            refreshToken,
        }));
    },
    async sync(context) {
        if (!context.accessToken)
            throw new Error('Spotify access token missing');
        const headers = { Authorization: `Bearer ${context.accessToken}` };
        // Fetch top artists, top tracks, recent plays, AND audio features
        const [topArtistsResponse, topTracksResponse, recentResponse] = await Promise.all([
            axiosClient.get('https://api.spotify.com/v1/me/top/artists?time_range=long_term&limit=20', { headers }),
            axiosClient.get('https://api.spotify.com/v1/me/top/tracks?time_range=long_term&limit=20', { headers }),
            axiosClient.get('https://api.spotify.com/v1/me/player/recently-played?limit=50', { headers }),
        ]);
        const topArtists = topArtistsResponse.data.items ?? [];
        const topTracks = topTracksResponse.data.items ?? [];
        const recentItems = recentResponse.data.items ?? [];
        // Calculate estimated listening minutes from recent plays
        let estimatedMinutes = 0;
        const hourBuckets = { morning: 0, afternoon: 0, evening: 0, night: 0 };
        const recentTrackCounts = new Map();
        for (const item of recentItems) {
            const duration = item.track?.duration_ms ?? 180000;
            estimatedMinutes += duration / 60000;
            const playedAt = new Date(item.played_at);
            const hour = playedAt.getHours();
            if (hour >= 6 && hour < 12)
                hourBuckets.morning += 1;
            else if (hour >= 12 && hour < 18)
                hourBuckets.afternoon += 1;
            else if (hour >= 18 && hour < 22)
                hourBuckets.evening += 1;
            else
                hourBuckets.night += 1;
            const name = item.track?.name;
            const artist = item.track?.artists?.[0]?.name;
            if (!name)
                continue;
            const key = artist ? `${name} - ${artist}` : name;
            recentTrackCounts.set(key, (recentTrackCounts.get(key) ?? 0) + 1);
        }
        // Estimate total yearly minutes by scaling recent sample
        const estimatedYearlyMinutes = Math.round(estimatedMinutes * 73); // ~50 recent plays ≈ small sample of ~3650 yearly
        // Genre analysis
        const genreCounts = new Map();
        for (const artist of topArtists) {
            for (const genre of artist.genres ?? []) {
                genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + 1);
            }
        }
        const topGenreEntries = [...genreCounts.entries()].sort((left, right) => right[1] - left[1]);
        // Time-of-day dominant period
        const timeEntries = Object.entries(hourBuckets).sort((a, b) => b[1] - a[1]);
        const dominantTime = timeEntries[0]?.[0] ?? 'evening';
        // Audio features for top tracks (if available)
        let avgEnergy = 0;
        let avgDanceability = 0;
        let avgValence = 0;
        const topTrackIds = topTracks.slice(0, 5).map((t) => t.id).filter(Boolean);
        if (topTrackIds.length > 0) {
            try {
                const featuresResponse = await axiosClient.get(`https://api.spotify.com/v1/audio-features?ids=${topTrackIds.join(',')}`, { headers });
                const features = featuresResponse.data.audio_features ?? [];
                const valid = features.filter((f) => f != null);
                if (valid.length > 0) {
                    avgEnergy = valid.reduce((s, f) => s + f.energy, 0) / valid.length;
                    avgDanceability = valid.reduce((s, f) => s + f.danceability, 0) / valid.length;
                    avgValence = valid.reduce((s, f) => s + f.valence, 0) / valid.length;
                }
            }
            catch {
                // Audio features may fail for some tracks; ignore
            }
        }
        // Mood descriptor from valence
        let mood = 'balanced';
        if (avgValence > 0.7)
            mood = 'upbeat';
        else if (avgValence < 0.3)
            mood = 'melancholic';
        else if (avgEnergy > 0.7)
            mood = 'intense';
        else if (avgDanceability > 0.7)
            mood = 'danceable';
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
                    estimatedMinutes: Math.round(estimatedYearlyMinutes),
                    estimatedHours: Math.round(estimatedYearlyMinutes / 60),
                    avgEnergy: Math.round(avgEnergy * 100),
                    avgDanceability: Math.round(avgDanceability * 100),
                    avgValence: Math.round(avgValence * 100),
                },
                streaks: {
                    topGenre: topGenreEntries[0]?.[0] ?? 'genre-hopping',
                    topArtist: topArtists[0]?.name ?? 'No top artist yet',
                    topTrack: topTracks[0]?.name ?? 'No top track yet',
                    dominantTime,
                    mood,
                },
                comparisons: [
                    {
                        label: 'Previous sample',
                        current: Math.round(estimatedYearlyMinutes),
                        previous: Math.round(estimatedYearlyMinutes * 0.85),
                        unit: 'minutes',
                    },
                ],
                charts: [
                    {
                        title: 'Top Genres',
                        chartType: 'bar',
                        data: topGenreEntries.slice(0, 5).map((entry) => entry[1]),
                        labels: topGenreEntries.slice(0, 5).map((entry) => entry[0].slice(0, 1).toUpperCase()),
                    },
                    {
                        title: 'Listening by Time',
                        chartType: 'bar',
                        data: [hourBuckets.morning, hourBuckets.afternoon, hourBuckets.evening, hourBuckets.night],
                        labels: ['M', 'A', 'E', 'N'],
                    },
                ],
                meta: {
                    sampleBased: true,
                    topRecentTrack: [...recentTrackCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '',
                },
            },
        };
    },
};
export const stravaPlugin = {
    id: 'strava',
    name: 'Strava',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/45/Strava_logo.svg',
    connectionKind: 'oauth2',
    supported: true,
    scopes: ['activity:read_all', 'profile:read_all'],
    connect: {
        start(context) {
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
        async finish(context) {
            const code = context.params.code;
            if (!code)
                throw new Error('Strava callback missing code');
            const response = await axiosClient.post('https://www.strava.com/oauth/token', {
                client_id: requireEnv('STRAVA_CLIENT_ID'),
                client_secret: requireEnv('STRAVA_CLIENT_SECRET'),
                code,
                grant_type: 'authorization_code',
            });
            return {
                accessToken: response.data.access_token,
                refreshToken: response.data.refresh_token,
                expiresAt: response.data.expires_at * 1000,
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
            accessToken: response.data.access_token,
            refreshToken: response.data.refresh_token,
            expiresAt: response.data.expires_at * 1000,
            tokenType: 'Bearer',
        };
    },
    async sync(context) {
        if (!context.accessToken)
            throw new Error('Strava access token missing');
        const after = Math.floor(context.periodStart.getTime() / 1000);
        const before = Math.floor(context.periodEnd.getTime() / 1000);
        const headers = { Authorization: `Bearer ${context.accessToken}` };
        const activities = [];
        for (let page = 1; page <= 3; page += 1) {
            const response = await axiosClient.get('https://www.strava.com/api/v3/athlete/activities', {
                headers,
                params: { after, before, per_page: 200, page },
            });
            const batch = response.data;
            activities.push(...batch);
            if (batch.length < 200)
                break;
        }
        const bySport = new Map();
        const byMonth = new Map();
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
export const fitbitPlugin = {
    id: 'fitbit',
    name: 'Fitbit',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/e0/Fitbit_logo16.svg',
    connectionKind: 'oauth2_pkce',
    supported: true,
    scopes: ['activity', 'heartrate', 'profile', 'sleep'],
    connect: {
        start(context) {
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
        async finish(context) {
            const code = context.params.code;
            if (!code)
                throw new Error('Fitbit callback missing code');
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
                externalAccountId: profile.data.user?.encodedId,
                metadata: {
                    displayName: profile.data.user?.displayName,
                },
            };
        },
    },
    async refresh(refreshToken) {
        return finishOauth(await refreshOauthToken({
            tokenUrl: 'https://api.fitbit.com/oauth2/token',
            clientId: requireEnv('FITBIT_CLIENT_ID'),
            clientSecret: requireEnv('FITBIT_CLIENT_SECRET'),
            refreshToken,
        }));
    },
    async sync(context) {
        if (!context.accessToken)
            throw new Error('Fitbit access token missing');
        const headers = { Authorization: `Bearer ${context.accessToken}` };
        const start = isoDate(context.periodStart);
        const end = isoDate(context.periodEnd);
        const [stepsResponse, caloriesResponse, activeResponse] = await Promise.all([
            axiosClient.get(`https://api.fitbit.com/1/user/-/activities/steps/date/${start}/${end}.json`, { headers }),
            axiosClient.get(`https://api.fitbit.com/1/user/-/activities/calories/date/${start}/${end}.json`, { headers }),
            axiosClient.get(`https://api.fitbit.com/1/user/-/activities/minutesVeryActive/date/${start}/${end}.json`, { headers }),
        ]);
        const stepsSeries = stepsResponse.data['activities-steps'] ?? [];
        const caloriesSeries = caloriesResponse.data['activities-calories'] ?? [];
        const activeSeries = activeResponse.data['activities-minutesVeryActive'] ?? [];
        const stepsTotal = stepsSeries.reduce((sum, entry) => sum + Number(entry.value || 0), 0);
        const caloriesTotal = caloriesSeries.reduce((sum, entry) => sum + Number(entry.value || 0), 0);
        const activeTotal = activeSeries.reduce((sum, entry) => sum + Number(entry.value || 0), 0);
        const byMonth = new Map();
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
export const lastfmPlugin = {
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
            const token = response.data.token;
            return {
                url: `https://www.last.fm/api/auth/?api_key=${encodeURIComponent(requireEnv('LASTFM_API_KEY'))}&token=${encodeURIComponent(token)}`,
                lookupKey: token,
            };
        },
        async finish(context) {
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
                accessToken: response.data.session?.key,
                externalAccountId: response.data.session?.name,
                metadata: {
                    subscriber: response.data.session?.subscriber,
                },
            };
        },
    },
    async sync(context) {
        const username = context.externalAccountId;
        if (!username)
            throw new Error('Last.fm username missing');
        const apiKey = requireEnv('LASTFM_API_KEY');
        const params = { user: username, api_key: apiKey, format: 'json' };
        const [artistsResponse, tracksResponse, albumsResponse, infoResponse, recentResponse] = await Promise.all([
            axiosClient.get('https://ws.audioscrobbler.com/2.0/', { params: { ...params, method: 'user.gettopartists', period: '12month', limit: 20 } }),
            axiosClient.get('https://ws.audioscrobbler.com/2.0/', { params: { ...params, method: 'user.gettoptracks', period: '12month', limit: 20 } }),
            axiosClient.get('https://ws.audioscrobbler.com/2.0/', { params: { ...params, method: 'user.gettopalbums', period: '12month', limit: 10 } }),
            axiosClient.get('https://ws.audioscrobbler.com/2.0/', { params: { ...params, method: 'user.getinfo' } }),
            axiosClient.get('https://ws.audioscrobbler.com/2.0/', { params: { ...params, method: 'user.getrecenttracks', limit: 50 } }),
        ]);
        const artists = artistsResponse.data.topartists?.artist?.map((artist) => ({
            name: artist.name,
            count: Number(artist.playcount || 0),
        })) ?? [];
        const tracks = tracksResponse.data.toptracks?.track?.map((track) => ({
            name: `${track.name} - ${track.artist?.name ?? 'Unknown Artist'}`,
            count: Number(track.playcount || 0),
        })) ?? [];
        const albums = albumsResponse.data.topalbums?.album?.map((album) => ({
            name: album.name,
            count: Number(album.playcount || 0),
        })) ?? [];
        const recentTrackSample = recentResponse.data.recenttracks?.track?.length ?? 0;
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
export const steamPlugin = {
    id: 'steam',
    name: 'Steam',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/83/Steam_icon_logo.svg',
    connectionKind: 'openid',
    supported: true,
    connect: {
        start(context) {
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
        async finish(context) {
            const valid = await validateSteamOpenId(context.params);
            if (!valid)
                throw new Error('Steam OpenID validation failed');
            const claimedId = context.params['openid.claimed_id'];
            const steamId = claimedId?.split('/').pop();
            if (!steamId)
                throw new Error('Steam claimed id missing');
            return {
                accessToken: steamId,
                externalAccountId: steamId,
            };
        },
    },
    async sync(context) {
        const steamId = context.externalAccountId || context.accessToken;
        if (!steamId)
            throw new Error('Steam account id missing');
        const response = await axiosClient.get('https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/', {
            params: {
                key: requireEnv('STEAM_WEB_API_KEY'),
                steamid: steamId,
                include_appinfo: true,
                include_played_free_games: true,
            },
        });
        const games = response.data.response?.games?.map((game) => ({
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
export const githubPlugin = {
    id: 'github',
    name: 'GitHub',
    logoUrl: 'https://github.githubassets.com/favicons/favicon.svg',
    connectionKind: 'oauth2',
    supported: hasEnv('GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET'),
    disabledReason: hasEnv('GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET')
        ? undefined
        : 'Configure GitHub OAuth credentials to enable this integration.',
    scopes: ['read:user', 'user:email', 'read:org'],
    connect: {
        start(context) {
            const params = new URLSearchParams({
                client_id: requireEnv('GITHUB_CLIENT_ID'),
                redirect_uri: context.callbackBaseUrl,
                scope: 'read:user user:email read:org',
                state: context.requestId,
                allow_signup: 'false',
            });
            return {
                url: `https://github.com/login/oauth/authorize?${params.toString()}`,
            };
        },
        async finish(context) {
            const code = context.params.code;
            if (!code)
                throw new Error('GitHub callback missing code');
            const response = await axiosClient.post('https://github.com/login/oauth/access_token', new URLSearchParams({
                client_id: requireEnv('GITHUB_CLIENT_ID'),
                client_secret: requireEnv('GITHUB_CLIENT_SECRET'),
                code,
                redirect_uri: context.callbackBaseUrl,
                state: context.lookupKey,
            }), {
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            });
            const accessToken = response.data.access_token;
            if (!accessToken) {
                throw new Error('GitHub token exchange failed');
            }
            const profile = await axiosClient.get('https://api.github.com/user', {
                headers: {
                    ...githubApiHeaders(),
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            return {
                accessToken,
                tokenType: 'Bearer',
                externalAccountId: String(profile.data.id),
                metadata: {
                    login: profile.data.login,
                    name: profile.data.name,
                },
            };
        },
    },
    async sync(context) {
        if (!context.accessToken)
            throw new Error('GitHub access token missing');
        const headers = {
            ...githubApiHeaders(),
            Authorization: `Bearer ${context.accessToken}`,
        };
        const profile = await axiosClient.get('https://api.github.com/user', { headers });
        const repos = [];
        for (let page = 1; page <= 3; page += 1) {
            const response = await axiosClient.get('https://api.github.com/user/repos', {
                headers,
                params: {
                    affiliation: 'owner',
                    sort: 'updated',
                    per_page: 100,
                    page,
                },
            });
            const batch = response.data;
            repos.push(...batch);
            if (batch.length < 100)
                break;
        }
        const languageCounts = new Map();
        for (const repo of repos) {
            if (!repo.language)
                continue;
            languageCounts.set(repo.language, (languageCounts.get(repo.language) ?? 0) + 1);
        }
        const topLanguages = [...languageCounts.entries()].sort((left, right) => right[1] - left[1]);
        const starredRepos = [...repos]
            .sort((left, right) => right.stargazers_count - left.stargazers_count)
            .slice(0, 5)
            .map((repo) => ({
            name: repo.name,
            count: repo.stargazers_count,
        }));
        const totalStars = repos.reduce((sum, repo) => sum + repo.stargazers_count, 0);
        const totalForks = repos.reduce((sum, repo) => sum + repo.forks_count, 0);
        return {
            service: 'github',
            period: { start: isoDate(context.periodStart), end: isoDate(context.periodEnd) },
            aggregates: {
                top_items: [
                    { category: 'repos', items: starredRepos },
                    { category: 'languages', items: countsToItems(topLanguages, 5) },
                ],
                totals: {
                    repoCount: repos.length,
                    publicRepos: Number(profile.data.public_repos ?? repos.length),
                    followers: Number(profile.data.followers ?? 0),
                    following: Number(profile.data.following ?? 0),
                    starsEarned: totalStars,
                    forksEarned: totalForks,
                    totalRepoSizeKb: repos.reduce((sum, repo) => sum + (repo.size ?? 0), 0),
                },
                streaks: {
                    topLanguage: topLanguages[0]?.[0] ?? 'TypeScript',
                    topRepo: starredRepos[0]?.name ?? 'No featured repo yet',
                },
                comparisons: [
                    {
                        label: 'Forks',
                        current: totalStars,
                        previous: totalForks,
                        unit: 'signals',
                    },
                ],
                charts: [
                    {
                        title: 'Top Languages',
                        chartType: 'bar',
                        data: topLanguages.slice(0, 5).map((entry) => entry[1]),
                        labels: topLanguages.slice(0, 5).map((entry) => entry[0].slice(0, 1).toUpperCase()),
                    },
                ],
                meta: {
                    login: String(profile.data.login ?? ''),
                },
            },
        };
    },
};
export const notionPlugin = {
    id: 'notion',
    name: 'Notion',
    logoUrl: 'https://www.notion.so/images/favicon.ico',
    connectionKind: 'oauth2',
    supported: hasEnv('NOTION_CLIENT_ID', 'NOTION_CLIENT_SECRET'),
    disabledReason: hasEnv('NOTION_CLIENT_ID', 'NOTION_CLIENT_SECRET')
        ? undefined
        : 'Configure Notion OAuth credentials to enable this integration.',
    connect: {
        start(context) {
            const params = new URLSearchParams({
                owner: 'user',
                client_id: requireEnv('NOTION_CLIENT_ID'),
                redirect_uri: context.callbackBaseUrl,
                response_type: 'code',
                state: context.requestId,
            });
            return {
                url: `https://api.notion.com/v1/oauth/authorize?${params.toString()}`,
            };
        },
        async finish(context) {
            const code = context.params.code;
            if (!code)
                throw new Error('Notion callback missing code');
            const clientId = requireEnv('NOTION_CLIENT_ID');
            const clientSecret = requireEnv('NOTION_CLIENT_SECRET');
            const response = await axiosClient.post('https://api.notion.com/v1/oauth/token', {
                grant_type: 'authorization_code',
                code,
                redirect_uri: context.callbackBaseUrl,
            }, {
                headers: {
                    Accept: 'application/json',
                    Authorization: `Basic ${notionBasicAuth(clientId, clientSecret)}`,
                    ...notionHeaders(),
                },
            });
            return {
                accessToken: response.data.access_token,
                refreshToken: response.data.refresh_token,
                externalAccountId: response.data.bot_id,
                metadata: {
                    workspaceId: response.data.workspace_id,
                    workspaceName: response.data.workspace_name,
                    ownerType: response.data.owner?.type,
                },
            };
        },
    },
    async refresh(refreshToken) {
        const clientId = requireEnv('NOTION_CLIENT_ID');
        const clientSecret = requireEnv('NOTION_CLIENT_SECRET');
        const response = await axiosClient.post('https://api.notion.com/v1/oauth/token', {
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
        }, {
            headers: {
                Accept: 'application/json',
                Authorization: `Basic ${notionBasicAuth(clientId, clientSecret)}`,
                ...notionHeaders(),
            },
        });
        return {
            accessToken: response.data.access_token,
            refreshToken: response.data.refresh_token,
            tokenType: 'Bearer',
        };
    },
    async sync(context) {
        if (!context.accessToken)
            throw new Error('Notion access token missing');
        const headers = notionHeaders(context.accessToken);
        const results = [];
        let cursor;
        for (let page = 0; page < 3; page += 1) {
            const response = await axiosClient.post('https://api.notion.com/v1/search', {
                sort: { direction: 'descending', timestamp: 'last_edited_time' },
                page_size: 100,
                ...(cursor ? { start_cursor: cursor } : {}),
            }, { headers });
            const batch = response.data.results ?? [];
            results.push(...batch);
            if (!response.data.has_more || !response.data.next_cursor)
                break;
            cursor = response.data.next_cursor;
        }
        const pages = results.filter((result) => result.object === 'page');
        const databases = results.filter((result) => result.object === 'database' || result.object === 'data_source');
        const byMonth = new Map();
        for (const result of results) {
            const editedAt = result.last_edited_time;
            if (!editedAt)
                continue;
            const date = new Date(editedAt);
            const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
            byMonth.set(key, (byMonth.get(key) ?? 0) + 1);
        }
        const monthly = buildMonthlySeries(context.periodStart, byMonth);
        const recentPages = pages.slice(0, 5).map((page) => ({
            name: notionTitleFrom(page),
            count: 1,
        }));
        const recentDatabases = databases.slice(0, 5).map((database) => ({
            name: notionTitleFrom(database),
            count: 1,
        }));
        return {
            service: 'notion',
            period: { start: isoDate(context.periodStart), end: isoDate(context.periodEnd) },
            aggregates: {
                top_items: [
                    { category: 'pages', items: recentPages },
                    { category: 'databases', items: recentDatabases },
                ],
                totals: {
                    pageCount: pages.length,
                    databaseCount: databases.length,
                    totalItems: results.length,
                },
                streaks: {
                    mostRecentPage: recentPages[0]?.name ?? 'No shared pages yet',
                    workspaceName: String(context.connectionMetadata?.workspaceName ?? 'Notion'),
                },
                comparisons: [
                    {
                        label: 'Databases',
                        current: pages.length,
                        previous: databases.length,
                        unit: 'items',
                    },
                ],
                charts: [
                    {
                        title: 'Recent Workspace Activity',
                        chartType: 'area',
                        data: monthly.data,
                        labels: monthly.labels,
                        unit: 'items',
                    },
                ],
                meta: {
                    workspaceName: String(context.connectionMetadata?.workspaceName ?? ''),
                    sampleBased: true,
                },
            },
        };
    },
};
export const appleHealthPlugin = {
    id: 'apple_health',
    name: 'Apple Health',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/3c/Apple_Health_Logo.png',
    connectionKind: 'device',
    supported: true,
    localOnly: true,
};
export const goodreadsPlugin = {
    id: 'goodreads',
    name: 'Goodreads',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/82/Goodreads_logo.svg',
    connectionKind: 'unsupported',
    supported: false,
    deferred: true,
    disabledReason: 'Goodreads public API access is deprecated for new production integrations.',
};
export const youtubePlugin = {
    id: 'youtube',
    name: 'YouTube',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/b8/YouTube_Logo_2017.svg',
    connectionKind: 'unsupported',
    supported: false,
    deferred: true,
    disabledReason: 'Consumer watch-history recaps are not available from the official YouTube API.',
};
export const appleMusicPlugin = {
    id: 'apple_music',
    name: 'Apple Music',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/5f/Apple_Music_icon.svg',
    connectionKind: 'unsupported',
    supported: false,
    deferred: true,
    disabledReason: 'Apple Music requires MusicKit developer tokens and is not yet available.',
};
// ═══════════════════════════════════════════════════════════════
// Trakt.tv — Movies & TV watch history
// ═══════════════════════════════════════════════════════════════
export const traktPlugin = {
    id: 'trakt',
    name: 'Trakt',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Trakt_tv_logo.svg',
    connectionKind: 'oauth2',
    supported: true,
    scopes: ['public'],
    connect: {
        start(context) {
            const params = new URLSearchParams({
                client_id: requireEnv('TRAKT_CLIENT_ID'),
                response_type: 'code',
                redirect_uri: context.callbackBaseUrl,
                state: context.requestId,
            });
            return {
                url: `https://trakt.tv/oauth/authorize?${params.toString()}`,
            };
        },
        async finish(context) {
            const code = context.params.code;
            if (!code)
                throw new Error('Trakt callback missing code');
            const response = await axiosClient.post('https://api.trakt.tv/oauth/token', {
                client_id: requireEnv('TRAKT_CLIENT_ID'),
                client_secret: requireEnv('TRAKT_CLIENT_SECRET'),
                redirect_uri: context.callbackBaseUrl,
                grant_type: 'authorization_code',
                code,
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'trakt-api-version': '2',
                    'trakt-api-key': requireEnv('TRAKT_CLIENT_ID'),
                },
            });
            return {
                accessToken: response.data.access_token,
                refreshToken: response.data.refresh_token,
                expiresAt: Date.now() + response.data.expires_in * 1000,
                tokenType: 'Bearer',
            };
        },
    },
    async refresh(refreshToken) {
        const response = await axiosClient.post('https://api.trakt.tv/oauth/token', {
            client_id: requireEnv('TRAKT_CLIENT_ID'),
            client_secret: requireEnv('TRAKT_CLIENT_SECRET'),
            redirect_uri: 'http://localhost',
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
        }, {
            headers: {
                'Content-Type': 'application/json',
                'trakt-api-version': '2',
                'trakt-api-key': requireEnv('TRAKT_CLIENT_ID'),
            },
        });
        return {
            accessToken: response.data.access_token,
            refreshToken: response.data.refresh_token,
            expiresAt: Date.now() + response.data.expires_in * 1000,
            tokenType: 'Bearer',
        };
    },
    async sync(context) {
        if (!context.accessToken)
            throw new Error('Trakt access token missing');
        const headers = {
            Authorization: `Bearer ${context.accessToken}`,
            'trakt-api-version': '2',
            'trakt-api-key': requireEnv('TRAKT_CLIENT_ID'),
        };
        const [historyResponse, statsResponse] = await Promise.all([
            axiosClient.get('https://api.trakt.tv/sync/history', {
                headers,
                params: { limit: 200, page: 1 },
            }),
            axiosClient.get('https://api.trakt.tv/users/me/stats', { headers }),
        ]);
        const history = historyResponse.data;
        const stats = statsResponse.data;
        const moviesWatched = new Map();
        const showsWatched = new Map();
        const byMonth = new Map();
        for (const item of history) {
            const watchedAt = new Date(item.watched_at);
            const key = `${watchedAt.getUTCFullYear()}-${String(watchedAt.getUTCMonth() + 1).padStart(2, '0')}`;
            byMonth.set(key, (byMonth.get(key) ?? 0) + 1);
            if (item.type === 'movie' && item.movie) {
                const name = `${item.movie.title} (${item.movie.year})`;
                moviesWatched.set(name, (moviesWatched.get(name) ?? 0) + 1);
            }
            else if (item.type === 'episode' && item.show) {
                showsWatched.set(item.show.title, (showsWatched.get(item.show.title) ?? 0) + 1);
            }
        }
        const topMovies = countsToItems([...moviesWatched.entries()], 5);
        const topShows = countsToItems([...showsWatched.entries()], 5);
        const monthly = buildMonthlySeries(context.periodStart, byMonth);
        const totalMinutes = (stats.movies?.minutes ?? 0) + (stats.episodes?.minutes ?? 0);
        const totalHours = Math.round(totalMinutes / 60);
        return {
            service: 'trakt',
            period: { start: isoDate(context.periodStart), end: isoDate(context.periodEnd) },
            aggregates: {
                top_items: [
                    { category: 'movies', items: topMovies },
                    { category: 'shows', items: topShows },
                ],
                totals: {
                    moviesWatched: stats.movies?.watched ?? moviesWatched.size,
                    episodesWatched: stats.episodes?.watched ?? 0,
                    showsWatched: stats.shows?.watched ?? showsWatched.size,
                    totalMinutes,
                    totalHours,
                },
                streaks: {
                    topMovie: topMovies[0]?.name ?? 'No movie data',
                    topShow: topShows[0]?.name ?? 'No show data',
                    bingeStyle: totalHours > 200 ? 'marathoner' : totalHours > 50 ? 'steady viewer' : 'casual watcher',
                },
                comparisons: [
                    {
                        label: 'Movies vs Episodes',
                        current: stats.movies?.watched ?? moviesWatched.size,
                        previous: stats.episodes?.watched ?? 0,
                        unit: 'watched',
                    },
                ],
                charts: [
                    {
                        title: 'Monthly Watch Activity',
                        chartType: 'area',
                        data: monthly.data,
                        labels: monthly.labels,
                        unit: 'items',
                    },
                ],
                meta: {
                    totalMinutes,
                },
            },
        };
    },
};
// ═══════════════════════════════════════════════════════════════
// Reddit — Karma, subreddits, activity
// ═══════════════════════════════════════════════════════════════
export const redditPlugin = {
    id: 'reddit',
    name: 'Reddit',
    logoUrl: 'https://www.redditstatic.com/desktop2x/img/favicon/favicon-32x32.png',
    connectionKind: 'oauth2',
    supported: true,
    scopes: ['identity', 'history', 'read'],
    connect: {
        start(context) {
            const params = new URLSearchParams({
                client_id: requireEnv('REDDIT_CLIENT_ID'),
                response_type: 'code',
                state: context.requestId,
                redirect_uri: context.callbackBaseUrl,
                duration: 'permanent',
                scope: 'identity history read',
            });
            return {
                url: `https://www.reddit.com/api/v1/authorize?${params.toString()}`,
            };
        },
        async finish(context) {
            const code = context.params.code;
            if (!code)
                throw new Error('Reddit callback missing code');
            const response = await axiosClient.post('https://www.reddit.com/api/v1/access_token', new URLSearchParams({
                grant_type: 'authorization_code',
                code,
                redirect_uri: context.callbackBaseUrl,
            }), {
                auth: {
                    username: requireEnv('REDDIT_CLIENT_ID'),
                    password: requireEnv('REDDIT_CLIENT_SECRET'),
                },
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            });
            const accessToken = response.data.access_token;
            const refreshToken = response.data.refresh_token;
            const profile = await axiosClient.get('https://oauth.reddit.com/api/v1/me', {
                headers: { Authorization: `Bearer ${accessToken}`, 'User-Agent': 'Wrapped/1.0' },
            });
            return {
                accessToken,
                refreshToken,
                tokenType: 'Bearer',
                externalAccountId: profile.data.id,
                metadata: {
                    username: profile.data.name,
                    karma: (profile.data.link_karma ?? 0) + (profile.data.comment_karma ?? 0),
                },
            };
        },
    },
    async refresh(refreshToken) {
        const response = await axiosClient.post('https://www.reddit.com/api/v1/access_token', new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
        }), {
            auth: {
                username: requireEnv('REDDIT_CLIENT_ID'),
                password: requireEnv('REDDIT_CLIENT_SECRET'),
            },
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
        return {
            accessToken: response.data.access_token,
            refreshToken: response.data.refresh_token,
            tokenType: 'Bearer',
        };
    },
    async sync(context) {
        if (!context.accessToken)
            throw new Error('Reddit access token missing');
        const headers = { Authorization: `Bearer ${context.accessToken}`, 'User-Agent': 'Wrapped/1.0' };
        const [karmaResponse, overviewResponse, subsResponse] = await Promise.all([
            axiosClient.get('https://oauth.reddit.com/api/v1/me/karma', { headers }),
            axiosClient.get('https://oauth.reddit.com/user/me/overview?limit=50', { headers }),
            axiosClient.get('https://oauth.reddit.com/subreddits/mine/subscriber?limit=100', { headers }),
        ]);
        const karmaBreakdown = karmaResponse.data.data ?? [];
        const overview = overviewResponse.data.data?.children ?? [];
        const subreddits = subsResponse.data.data?.children ?? [];
        const subredditKarma = new Map();
        for (const item of karmaBreakdown) {
            subredditKarma.set(item.sr, (item.comment_karma ?? 0) + (item.link_karma ?? 0));
        }
        const topSubreddits = countsToItems([...subredditKarma.entries()], 5);
        const totalKarma = karmaBreakdown.reduce((s, k) => s + (k.comment_karma ?? 0) + (k.link_karma ?? 0), 0);
        const totalPosts = overview.filter((o) => o.data.title).length;
        const totalComments = overview.filter((o) => !o.data.title).length;
        const subCount = subreddits.length;
        const byMonth = new Map();
        for (const child of overview) {
            // Reddit overview doesn't include date easily; skip monthly for now
        }
        return {
            service: 'reddit',
            period: { start: isoDate(context.periodStart), end: isoDate(context.periodEnd) },
            aggregates: {
                top_items: [{ category: 'subreddits', items: topSubreddits }],
                totals: {
                    totalKarma,
                    postsSubmitted: totalPosts,
                    commentsMade: totalComments,
                    subredditsJoined: subCount,
                },
                streaks: {
                    topSubreddit: topSubreddits[0]?.name ?? 'No data yet',
                    karmaTier: totalKarma > 100000 ? 'legend' : totalKarma > 10000 ? 'veteran' : totalKarma > 1000 ? 'regular' : 'lurker',
                },
                comparisons: [
                    {
                        label: 'Posts vs Comments',
                        current: totalPosts,
                        previous: totalComments,
                        unit: 'contributions',
                    },
                ],
                charts: [
                    {
                        title: 'Top Subreddits by Karma',
                        chartType: 'bar',
                        data: topSubreddits.slice(0, 5).map((s) => s.count),
                        labels: topSubreddits.slice(0, 5).map((s) => s.name.slice(0, 2).toUpperCase()),
                    },
                ],
                meta: {
                    username: String(context.connectionMetadata?.username ?? ''),
                },
            },
        };
    },
};
// ═══════════════════════════════════════════════════════════════
// RescueTime — Productivity & screen time
// ═══════════════════════════════════════════════════════════════
export const rescueTimePlugin = {
    id: 'rescuetime',
    name: 'RescueTime',
    logoUrl: 'https://www.rescuetime.com/assets/images/favicon.ico',
    connectionKind: 'oauth2',
    supported: true,
    scopes: ['time_data'],
    connect: {
        start(context) {
            const params = new URLSearchParams({
                client_id: requireEnv('RESCUETIME_CLIENT_ID'),
                response_type: 'code',
                redirect_uri: context.callbackBaseUrl,
                scope: 'time_data',
                state: context.requestId,
            });
            return {
                url: `https://www.rescuetime.com/oauth/authorize?${params.toString()}`,
            };
        },
        async finish(context) {
            const code = context.params.code;
            if (!code)
                throw new Error('RescueTime callback missing code');
            const response = await axiosClient.post('https://www.rescuetime.com/oauth/token', new URLSearchParams({
                grant_type: 'authorization_code',
                code,
                client_id: requireEnv('RESCUETIME_CLIENT_ID'),
                client_secret: requireEnv('RESCUETIME_CLIENT_SECRET'),
                redirect_uri: context.callbackBaseUrl,
            }));
            return {
                accessToken: response.data.access_token,
                refreshToken: response.data.refresh_token,
                expiresAt: response.data.expires_in ? Date.now() + response.data.expires_in * 1000 : null,
                tokenType: 'Bearer',
            };
        },
    },
    async sync(context) {
        if (!context.accessToken)
            throw new Error('RescueTime access token missing');
        const start = isoDate(context.periodStart);
        const end = isoDate(context.periodEnd);
        const [dataResponse, summaryResponse] = await Promise.all([
            axiosClient.get('https://www.rescuetime.com/api/oauth/data', {
                params: {
                    access_token: context.accessToken,
                    perspective: 'rank',
                    restrict_kind: 'activity',
                    restrict_begin: start,
                    restrict_end: end,
                    format: 'json',
                },
            }),
            axiosClient.get('https://www.rescuetime.com/api/oauth/daily_summary_feed', {
                params: { access_token: context.accessToken },
            }),
        ]);
        const rows = dataResponse.data.rows ?? [];
        const activities = rows.map((row) => ({
            timeSpentSeconds: row[1],
            name: row[3],
            category: row[4],
            productivity: row[5],
        }));
        const byCategory = new Map();
        const byActivity = new Map();
        let totalSeconds = 0;
        let productiveSeconds = 0;
        let distractingSeconds = 0;
        for (const act of activities) {
            totalSeconds += act.timeSpentSeconds;
            byCategory.set(act.category, (byCategory.get(act.category) ?? 0) + act.timeSpentSeconds);
            byActivity.set(act.name, (byActivity.get(act.name) ?? 0) + act.timeSpentSeconds);
            if (act.productivity > 0)
                productiveSeconds += act.timeSpentSeconds;
            if (act.productivity < 0)
                distractingSeconds += act.timeSpentSeconds;
        }
        const topCategories = countsToItems([...byCategory.entries()].map(([name, count]) => [name, Math.round(count / 60)]), 5);
        const topActivities = countsToItems([...byActivity.entries()].map(([name, count]) => [name, Math.round(count / 60)]), 5);
        const totalHours = Math.round(totalSeconds / 3600);
        const productiveHours = Math.round(productiveSeconds / 3600);
        const distractingHours = Math.round(distractingSeconds / 3600);
        const summaries = summaryResponse.data ?? [];
        const avgPulse = summaries.length
            ? Math.round(summaries.reduce((s, d) => s + d.productivity_pulse, 0) / summaries.length)
            : 0;
        return {
            service: 'rescuetime',
            period: { start, end },
            aggregates: {
                top_items: [
                    { category: 'activities', items: topActivities },
                    { category: 'categories', items: topCategories },
                ],
                totals: {
                    totalHours,
                    productiveHours,
                    distractingHours,
                    avgProductivityPulse: avgPulse,
                },
                streaks: {
                    topActivity: topActivities[0]?.name ?? 'No data',
                    topCategory: topCategories[0]?.name ?? 'No data',
                    productivityLabel: avgPulse > 75 ? 'productivity master' : avgPulse > 50 ? 'focused' : 'work in progress',
                },
                comparisons: [
                    {
                        label: 'Productive vs Distracting',
                        current: productiveHours,
                        previous: distractingHours,
                        unit: 'hours',
                    },
                ],
                charts: [
                    {
                        title: 'Top Categories',
                        chartType: 'bar',
                        data: topCategories.slice(0, 5).map((c) => c.count),
                        labels: topCategories.slice(0, 5).map((c) => c.name.slice(0, 2).toUpperCase()),
                    },
                ],
                meta: {
                    sampleBased: true,
                },
            },
        };
    },
};
// ═══════════════════════════════════════════════════════════════
// Todoist — Task completion & productivity
// ═══════════════════════════════════════════════════════════════
export const todoistPlugin = {
    id: 'todoist',
    name: 'Todoist',
    logoUrl: 'https://todoist.com/favicon.ico',
    connectionKind: 'oauth2',
    supported: true,
    scopes: ['data:read'],
    connect: {
        start(context) {
            const params = new URLSearchParams({
                client_id: requireEnv('TODOIST_CLIENT_ID'),
                scope: 'data:read',
                state: context.requestId,
            });
            return {
                url: `https://todoist.com/oauth/authorize?${params.toString()}`,
            };
        },
        async finish(context) {
            const code = context.params.code;
            if (!code)
                throw new Error('Todoist callback missing code');
            const response = await axiosClient.post('https://todoist.com/oauth/access_token', {
                client_id: requireEnv('TODOIST_CLIENT_ID'),
                client_secret: requireEnv('TODOIST_CLIENT_SECRET'),
                code,
                redirect_uri: context.callbackBaseUrl,
            }, { headers: { 'Content-Type': 'application/json' } });
            const accessToken = response.data.access_token;
            const profile = await axiosClient.get('https://api.todoist.com/sync/v9/sync', {
                params: {
                    token: accessToken,
                    sync_token: '*',
                    resource_types: '["user"]',
                },
            });
            const user = profile.data.user;
            return {
                accessToken,
                tokenType: 'Bearer',
                externalAccountId: String(user?.id ?? ''),
                metadata: {
                    fullName: user?.full_name,
                    email: user?.email,
                },
            };
        },
    },
    async sync(context) {
        if (!context.accessToken)
            throw new Error('Todoist access token missing');
        const token = context.accessToken;
        // Get productivity stats (today + this week)
        const statsResponse = await axiosClient.get('https://api.todoist.com/sync/v9/productivity_stats', {
            params: { token },
        });
        const stats = statsResponse.data;
        // Get completed items with history
        const completedResponse = await axiosClient.get('https://api.todoist.com/sync/v9/completed/get_all', {
            params: {
                token,
                limit: 200,
                since: context.periodStart.toISOString(),
            },
        });
        const items = completedResponse.data.items ?? [];
        const byProject = new Map();
        const byMonth = new Map();
        for (const item of items) {
            byProject.set(item.project_id, (byProject.get(item.project_id) ?? 0) + 1);
            const date = new Date(item.completed_date);
            const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
            byMonth.set(key, (byMonth.get(key) ?? 0) + 1);
        }
        // Get project names
        const projectsResponse = await axiosClient.get('https://api.todoist.com/sync/v9/sync', {
            params: {
                token,
                sync_token: '*',
                resource_types: '["projects"]',
            },
        });
        const projects = projectsResponse.data.projects ?? [];
        const projectMap = new Map(projects.map((p) => [String(p.id), p.name]));
        const topProjects = countsToItems([...byProject.entries()].map(([id, count]) => [projectMap.get(id) ?? 'Unknown', count]), 5);
        const monthly = buildMonthlySeries(context.periodStart, byMonth);
        const totalCompleted = stats.completed_count ?? items.length;
        const dailyAvg = items.length > 0 ? Math.round((items.length / Math.max(1, monthly.data.length)) * 10) / 10 : 0;
        return {
            service: 'todoist',
            period: { start: isoDate(context.periodStart), end: isoDate(context.periodEnd) },
            aggregates: {
                top_items: [{ category: 'projects', items: topProjects }],
                totals: {
                    tasksCompleted: totalCompleted,
                    recentCompleted: items.length,
                    dailyAverage: dailyAvg,
                },
                streaks: {
                    topProject: topProjects[0]?.name ?? 'No project data',
                    completionStyle: totalCompleted > 1000 ? 'task machine' : totalCompleted > 500 ? 'high achiever' : 'building habits',
                },
                comparisons: [
                    {
                        label: 'Recent vs All-time',
                        current: items.length,
                        previous: Math.max(0, totalCompleted - items.length),
                        unit: 'tasks',
                    },
                ],
                charts: [
                    {
                        title: 'Monthly Completions',
                        chartType: 'area',
                        data: monthly.data,
                        labels: monthly.labels,
                        unit: 'tasks',
                    },
                ],
                meta: {
                    sampleBased: true,
                },
            },
        };
    },
};
export const serviceAdapters = {
    spotify: spotifyPlugin,
    apple_health: appleHealthPlugin,
    strava: stravaPlugin,
    fitbit: fitbitPlugin,
    lastfm: lastfmPlugin,
    steam: steamPlugin,
    github: githubPlugin,
    notion: notionPlugin,
    trakt: traktPlugin,
    reddit: redditPlugin,
    rescuetime: rescueTimePlugin,
    todoist: todoistPlugin,
    goodreads: goodreadsPlugin,
    youtube: youtubePlugin,
    apple_music: appleMusicPlugin,
};
export const supportedServiceIds = Object.values(serviceAdapters)
    .filter((service) => service.supported)
    .map((service) => service.id);
export function getServiceAdapter(serviceId) {
    return serviceAdapters[serviceId] ?? null;
}
