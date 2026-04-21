import { aggregatedStats, connectedServices, syncJobs, syncLogs, syncProviderState } from '../db/index.js';
import { getServiceAdapter } from '../plugins/index.js';
import { decryptToken, encryptToken } from './anonymizer.js';
import { appConfig, syncServicePolicies } from './config.js';
let workerTimer = null;
let activeWorkers = 0;
const workerId = `worker-${process.pid}-${Math.random().toString(36).slice(2, 10)}`;
function policyFor(service) {
    switch (service) {
        case 'spotify':
        case 'strava':
        case 'fitbit':
        case 'lastfm':
        case 'steam':
        case 'apple_health':
            return syncServicePolicies[service];
        default:
            return { minIntervalMs: 2_000, maxConcurrency: 1 };
    }
}
function nextIsoFromMs(msFromNow) {
    return new Date(Date.now() + msFromNow).toISOString();
}
function retryDelayMs(attempt, retryAfterMs) {
    if (retryAfterMs && retryAfterMs > 0) {
        return retryAfterMs;
    }
    return Math.min(15 * 60_000, Math.max(appConfig.syncRetryBaseMs, appConfig.syncRetryBaseMs * attempt));
}
function readRetryAfterMs(error) {
    if (!error || typeof error !== 'object')
        return null;
    const maybeResponse = error.response;
    if (!maybeResponse || maybeResponse.status !== 429) {
        return null;
    }
    const retryAfter = maybeResponse.headers?.['retry-after'];
    const value = Array.isArray(retryAfter) ? retryAfter[0] : retryAfter;
    if (!value)
        return 5 * 60_000;
    const seconds = Number(value);
    if (Number.isFinite(seconds) && seconds > 0) {
        return seconds * 1000;
    }
    const absolute = Date.parse(value);
    if (Number.isFinite(absolute)) {
        return Math.max(0, absolute - Date.now());
    }
    return 5 * 60_000;
}
async function processJob(job) {
    if (!job)
        return;
    try {
        const adapter = getServiceAdapter(job.service);
        if (!adapter?.sync) {
            throw new Error(`Service ${job.service} cannot be synced`);
        }
        const connection = await connectedServices.get(job.userId, job.service);
        if (!connection) {
            throw new Error('Service not connected');
        }
        let accessToken = connection.accessTokenEncrypted ? decryptToken(connection.accessTokenEncrypted) : null;
        let refreshToken = connection.refreshTokenEncrypted ? decryptToken(connection.refreshTokenEncrypted) : null;
        if (adapter.refresh &&
            refreshToken &&
            connection.expiresAt &&
            connection.expiresAt <= Date.now() + 60_000) {
            const refreshed = await adapter.refresh(refreshToken, connection.metadata);
            accessToken = refreshed.accessToken;
            refreshToken = refreshed.refreshToken ?? refreshToken;
            await connectedServices.upsert({
                userId: job.userId,
                service: job.service,
                externalAccountId: refreshed.externalAccountId ?? connection.externalAccountId,
                accessTokenEncrypted: accessToken ? encryptToken(accessToken) : null,
                refreshTokenEncrypted: refreshToken ? encryptToken(refreshToken) : null,
                tokenType: refreshed.tokenType ?? connection.tokenType,
                scope: refreshed.scope ?? connection.scope,
                expiresAt: refreshed.expiresAt ?? connection.expiresAt,
                metadata: refreshed.metadata ?? connection.metadata,
            });
        }
        const stats = await adapter.sync({
            accessToken,
            refreshToken,
            externalAccountId: connection.externalAccountId,
            connectionMetadata: connection.metadata,
            periodStart: new Date(job.periodStart),
            periodEnd: new Date(job.periodEnd),
        });
        await aggregatedStats.upsert({
            userId: job.userId,
            service: job.service,
            periodStart: stats.period.start,
            periodEnd: stats.period.end,
            data: stats.aggregates,
        });
        await connectedServices.markSynced(job.userId, job.service);
        await syncLogs.create({
            userId: job.userId,
            service: job.service,
            status: 'success',
            periodStart: stats.period.start,
            periodEnd: stats.period.end,
        });
        await syncJobs.markCompleted(job.id, stats);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const providerDelayMs = retryDelayMs(job.attempts, readRetryAfterMs(error) ?? undefined);
        const nextAttemptAt = nextIsoFromMs(providerDelayMs);
        await syncLogs.create({
            userId: job.userId,
            service: job.service,
            status: 'error',
            message,
            periodStart: job.periodStart,
            periodEnd: job.periodEnd,
        });
        await syncProviderState.bumpCooldown(job.service, nextAttemptAt);
        await syncJobs.markFailed(job.id, {
            errorMessage: message,
            attempts: job.attempts,
            maxAttempts: job.maxAttempts,
            nextAttemptAt,
        });
    }
}
async function drainQueue() {
    await syncJobs.recoverExpiredLeases();
    while (activeWorkers < appConfig.maxConcurrentSyncs) {
        const job = await syncJobs.claimNextRunnable({
            workerId,
            leaseExpiresAt: nextIsoFromMs(appConfig.syncLeaseMs),
        });
        if (!job)
            return;
        await syncProviderState.bumpCooldown(job.service, nextIsoFromMs(policyFor(job.service).minIntervalMs));
        activeWorkers += 1;
        void processJob(job).finally(() => {
            activeWorkers = Math.max(0, activeWorkers - 1);
            void drainQueue();
        });
    }
}
export function startSyncQueueWorker() {
    if (workerTimer)
        return;
    workerTimer = setInterval(() => {
        void drainQueue();
    }, appConfig.syncWorkerPollMs);
    void drainQueue();
}
export function stopSyncQueueWorker() {
    if (workerTimer) {
        clearInterval(workerTimer);
        workerTimer = null;
    }
}
export async function enqueueSyncJob(input) {
    const job = await syncJobs.create(input);
    void drainQueue();
    return job;
}
