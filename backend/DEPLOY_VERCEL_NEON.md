# Vercel + Neon Deployment

This backend is already linked to the Vercel project:

- Project: `sean-broughtons-projects/wrapped-backend`
- Project ID: `prj_6uRLuyDI4rstjbO1BJI7YRmKuZ2o`

## Why this stack

- `Vercel` handles bursty API traffic cost-effectively with Fastify support and Fluid Compute.
- `Neon` gives managed Postgres with autoscaling, pooling, and scale-to-zero behavior that matches Vercel well.
- The backend keeps Apple Health processing on-device; only service connectivity and normalized aggregates hit the server.

## Current repo state

- Fastify backend is ready for Vercel deployment from this directory.
- Postgres support is enabled through `DATABASE_URL`.
- SQLite remains as a local fallback when `DATABASE_URL` is missing.
- `vercel.json` caps `src/index.ts` to a `30s` max duration to keep runaway sync calls from inflating cost.

## Remaining setup

### 1. Install Neon on the Vercel project

Run from `backend/`:

```powershell
npx vercel integration add neon --scope sean-broughtons-projects
```

The CLI currently stops for two dashboard-level confirmations:

- link the Neon resource to `wrapped-backend`
- accept the Neon Marketplace terms

If the CLI prompts to open the dashboard, accept it there and finish the install.

### 2. Add production environment variables

Run from `backend/` after Neon is installed:

```powershell
npx vercel env add DATABASE_URL production
npx vercel env add APP_SECRET production
npx vercel env add ALLOWED_ORIGINS production
npx vercel env add SPOTIFY_CLIENT_ID production
npx vercel env add SPOTIFY_CLIENT_SECRET production
npx vercel env add STRAVA_CLIENT_ID production
npx vercel env add STRAVA_CLIENT_SECRET production
npx vercel env add FITBIT_CLIENT_ID production
npx vercel env add FITBIT_CLIENT_SECRET production
npx vercel env add LASTFM_API_KEY production
npx vercel env add LASTFM_API_SECRET production
npx vercel env add STEAM_WEB_API_KEY production
npx vercel env add AI_GATEWAY_API_KEY production
```

Recommended values:

- `DATABASE_URL`: Neon pooled connection string
- `APP_SECRET`: long random secret, at least 32 bytes
- `ALLOWED_ORIGINS`: comma-separated app origins, for example:

```text
https://wrapped.app,https://app.wrapped.app
```

### 3. Deploy

```powershell
npx vercel --prod --scope sean-broughtons-projects
```

### 4. Point the Expo app at the deployed API

Set the production API base URL in the frontend environment:

```text
EXPO_PUBLIC_API_BASE_URL=https://<your-backend-domain>
```

Then update OAuth callback URLs to use the production backend domain:

- `https://<your-backend-domain>/api/oauth/spotify/callback`
- `https://<your-backend-domain>/api/oauth/strava/callback`
- `https://<your-backend-domain>/api/oauth/fitbit/callback`
- `https://<your-backend-domain>/api/oauth/lastfm/callback`
- `https://<your-backend-domain>/api/oauth/steam/callback`

## Cost guidance

- Keep `maxDuration` modest unless a provider proves it needs longer.
- Keep AI generation limited to copy only, as already implemented.
- Use Neon pooled connections rather than direct connections for production traffic.
- Do not sync every provider on app open; sync on connect, explicit refresh, and wrapped generation when stale.
- If traffic grows, upgrade Neon before increasing Vercel function duration.

## Useful commands

```powershell
npx vercel project inspect wrapped-backend --scope sean-broughtons-projects
npx vercel env ls --scope sean-broughtons-projects
npx vercel logs --since 1h --scope sean-broughtons-projects
```
