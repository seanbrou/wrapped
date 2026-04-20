import 'dotenv/config';
import crypto from 'node:crypto';
import Database from 'better-sqlite3';
import { Pool } from 'pg';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { appConfig } from '../services/config.js';
const __dirname = dirname(fileURLToPath(import.meta.url));
const databaseUrl = process.env.DATABASE_URL?.trim();
if (appConfig.isProductionLike && !databaseUrl) {
    throw new Error('DATABASE_URL must be configured in production');
}
export const databaseInfo = databaseUrl
    ? { kind: 'postgres', connectionLabel: 'DATABASE_URL' }
    : { kind: 'sqlite', connectionLabel: join(__dirname, '../../wrapped.db') };
const sqliteDb = databaseUrl ? null : new Database(join(__dirname, '../../wrapped.db'));
const pgPool = databaseUrl
    ? new Pool({
        connectionString: databaseUrl,
        ssl: process.env.PGSSL_REQUIRE === 'false' || databaseUrl.includes('sslmode=disable')
            ? undefined
            : { rejectUnauthorized: false },
        max: 10,
    })
    : null;
if (sqliteDb) {
    sqliteDb.pragma('journal_mode = WAL');
    sqliteDb.pragma('foreign_keys = ON');
}
const migrations = [
    {
        version: 1,
        statements: [
            `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
      `,
            `
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        install_id TEXT NOT NULL UNIQUE,
        platform TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMPTZ
      )
      `,
            `
      CREATE TABLE IF NOT EXISTS refresh_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        install_id TEXT NOT NULL,
        refresh_token_hash TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        revoked_at TIMESTAMPTZ,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      )
      `,
            `
      CREATE TABLE IF NOT EXISTS oauth_requests (
        id TEXT PRIMARY KEY,
        lookup_key TEXT NOT NULL UNIQUE,
        user_id TEXT NOT NULL,
        install_id TEXT NOT NULL,
        service TEXT NOT NULL,
        redirect_uri TEXT NOT NULL,
        metadata_json TEXT NOT NULL DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMPTZ NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      )
      `,
            `
      CREATE TABLE IF NOT EXISTS connected_services (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        service TEXT NOT NULL,
        external_account_id TEXT,
        access_token_encrypted TEXT,
        refresh_token_encrypted TEXT,
        token_type TEXT,
        scope TEXT,
        metadata_json TEXT NOT NULL DEFAULT '{}',
        connected_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        last_synced_at TIMESTAMPTZ,
        expires_at BIGINT,
        deleted_at TIMESTAMPTZ,
        UNIQUE(user_id, service),
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      )
      `,
            `
      CREATE TABLE IF NOT EXISTS aggregated_stats (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        service TEXT NOT NULL,
        period_start DATE NOT NULL,
        period_end DATE NOT NULL,
        data_json TEXT NOT NULL,
        synced_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, service, period_start, period_end),
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      )
      `,
            `
      CREATE TABLE IF NOT EXISTS wrapped_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        services_json TEXT NOT NULL,
        period_start DATE NOT NULL,
        period_end DATE NOT NULL,
        cards_json TEXT NOT NULL,
        insights_json TEXT NOT NULL DEFAULT '[]',
        template_id TEXT,
        template_name TEXT,
        accent_key TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      )
      `,
            `
      CREATE TABLE IF NOT EXISTS share_assets (
        id TEXT PRIMARY KEY,
        wrapped_session_id TEXT NOT NULL,
        kind TEXT NOT NULL,
        uri TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(wrapped_session_id) REFERENCES wrapped_sessions(id) ON DELETE CASCADE
      )
      `,
            `
      CREATE TABLE IF NOT EXISTS sync_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        service TEXT NOT NULL,
        status TEXT NOT NULL,
        message TEXT,
        period_start DATE,
        period_end DATE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      )
      `,
        ],
    },
];
function parseJson(value, fallback) {
    if (!value)
        return fallback;
    try {
        return JSON.parse(value);
    }
    catch {
        return fallback;
    }
}
function toPgSql(sql) {
    let index = 0;
    return sql.replace(/\?/g, () => {
        index += 1;
        return `$${index}`;
    });
}
function createPgRunner(client) {
    const target = client ?? pgPool;
    if (!target) {
        throw new Error('Postgres pool is not initialized');
    }
    return {
        async all(sql, params = []) {
            const result = await target.query(toPgSql(sql), params);
            return result.rows;
        },
        async get(sql, params = []) {
            const result = await target.query(toPgSql(sql), params);
            return result.rows[0] ?? null;
        },
        async run(sql, params = []) {
            await target.query(toPgSql(sql), params);
        },
    };
}
function createSqliteRunner(database) {
    return {
        async all(sql, params = []) {
            return database.prepare(sql).all(...params);
        },
        async get(sql, params = []) {
            return database.prepare(sql).get(...params) ?? null;
        },
        async run(sql, params = []) {
            database.prepare(sql).run(...params);
        },
    };
}
const runner = pgPool ? createPgRunner() : createSqliteRunner(sqliteDb);
async function withTransaction(work) {
    if (pgPool) {
        const client = await pgPool.connect();
        const tx = createPgRunner(client);
        try {
            await client.query('BEGIN');
            const result = await work(tx);
            await client.query('COMMIT');
            return result;
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    const tx = createSqliteRunner(sqliteDb);
    sqliteDb.exec('BEGIN');
    try {
        const result = await work(tx);
        sqliteDb.exec('COMMIT');
        return result;
    }
    catch (error) {
        sqliteDb.exec('ROLLBACK');
        throw error;
    }
}
async function applyMigrations() {
    await runner.run(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `);
    const applied = new Set((await runner.all('SELECT version FROM schema_migrations ORDER BY version ASC')).map((row) => row.version));
    for (const migration of migrations) {
        if (applied.has(migration.version))
            continue;
        await withTransaction(async (tx) => {
            for (const statement of migration.statements) {
                await tx.run(statement);
            }
            await tx.run('INSERT INTO schema_migrations (version) VALUES (?)', [migration.version]);
        });
    }
}
await applyMigrations();
function mapConnection(row) {
    return {
        id: row.id,
        userId: row.user_id,
        service: row.service,
        externalAccountId: row.external_account_id,
        accessTokenEncrypted: row.access_token_encrypted,
        refreshTokenEncrypted: row.refresh_token_encrypted,
        tokenType: row.token_type,
        scope: row.scope,
        connectedAt: row.connected_at,
        lastSyncedAt: row.last_synced_at,
        expiresAt: row.expires_at,
        metadata: parseJson(row.metadata_json, {}),
        deletedAt: row.deleted_at,
    };
}
function mapWrappedSession(row) {
    return {
        id: row.id,
        userId: row.user_id,
        services: parseJson(row.services_json, []),
        periodStart: row.period_start,
        periodEnd: row.period_end,
        cards: parseJson(row.cards_json, []),
        insights: parseJson(row.insights_json, []),
        templateId: row.template_id,
        templateName: row.template_name,
        accentKey: row.accent_key,
        createdAt: row.created_at,
    };
}
export const users = {
    async getByInstallId(installId) {
        return await runner.get('SELECT * FROM users WHERE install_id = ? AND deleted_at IS NULL', [installId]);
    },
    async getById(id) {
        return await runner.get('SELECT * FROM users WHERE id = ? AND deleted_at IS NULL', [id]);
    },
    async getOrCreateByInstall(installId, platform) {
        const existing = await this.getByInstallId(installId);
        if (existing)
            return existing;
        const id = crypto.randomUUID();
        await runner.run('INSERT INTO users (id, install_id, platform) VALUES (?, ?, ?)', [
            id,
            installId,
            platform ?? null,
        ]);
        return (await this.getById(id));
    },
    async markDeleted(userId, tx) {
        await (tx ?? runner).run('UPDATE users SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?', [userId]);
    },
};
export const refreshSessions = {
    async rotate(userId, installId, refreshTokenHash, expiresAtIso) {
        await withTransaction(async (tx) => {
            await tx.run(`
        UPDATE refresh_sessions
        SET revoked_at = CURRENT_TIMESTAMP
        WHERE user_id = ? AND install_id = ? AND revoked_at IS NULL
      `, [userId, installId]);
            await tx.run(`
        INSERT INTO refresh_sessions (id, user_id, install_id, refresh_token_hash, expires_at)
        VALUES (?, ?, ?, ?, ?)
      `, [crypto.randomUUID(), userId, installId, refreshTokenHash, expiresAtIso]);
        });
    },
    async findActiveByHash(refreshTokenHash) {
        return await runner.get(`
      SELECT *
      FROM refresh_sessions
      WHERE refresh_token_hash = ?
        AND revoked_at IS NULL
        AND expires_at > CURRENT_TIMESTAMP
      LIMIT 1
    `, [refreshTokenHash]);
    },
    async revokeAllForUser(userId) {
        await runner.run(`
      UPDATE refresh_sessions
      SET revoked_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND revoked_at IS NULL
    `, [userId]);
    },
};
export const oauthRequests = {
    async create(input) {
        const id = crypto.randomUUID();
        await runner.run(`
      INSERT INTO oauth_requests (
        id,
        lookup_key,
        user_id,
        install_id,
        service,
        redirect_uri,
        metadata_json,
        expires_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
            id,
            input.lookupKey,
            input.userId,
            input.installId,
            input.service,
            input.redirectUri,
            JSON.stringify(input.metadata ?? {}),
            input.expiresAtIso,
        ]);
        return { id, ...input };
    },
    async findByLookup(service, lookupKey) {
        const row = await runner.get(`
      SELECT *
      FROM oauth_requests
      WHERE service = ?
        AND lookup_key = ?
        AND expires_at > CURRENT_TIMESTAMP
      LIMIT 1
    `, [service, lookupKey]);
        if (!row)
            return null;
        return {
            id: row.id,
            lookupKey: row.lookup_key,
            userId: row.user_id,
            installId: row.install_id,
            service: row.service,
            redirectUri: row.redirect_uri,
            metadata: parseJson(row.metadata_json, {}),
            expiresAt: row.expires_at,
            createdAt: row.created_at,
        };
    },
    async delete(id) {
        await runner.run('DELETE FROM oauth_requests WHERE id = ?', [id]);
    },
    async cleanupExpired() {
        await runner.run('DELETE FROM oauth_requests WHERE expires_at <= CURRENT_TIMESTAMP');
    },
};
export const connectedServices = {
    async list(userId) {
        const rows = await runner.all(`
        SELECT *
        FROM connected_services
        WHERE user_id = ? AND deleted_at IS NULL
        ORDER BY connected_at ASC
      `, [userId]);
        return rows.map(mapConnection);
    },
    async get(userId, service) {
        const row = await runner.get(`
      SELECT *
      FROM connected_services
      WHERE user_id = ? AND service = ? AND deleted_at IS NULL
      LIMIT 1
    `, [userId, service]);
        return row ? mapConnection(row) : null;
    },
    async upsert(input) {
        const id = crypto.randomUUID();
        await runner.run(`
      INSERT INTO connected_services (
        id,
        user_id,
        service,
        external_account_id,
        access_token_encrypted,
        refresh_token_encrypted,
        token_type,
        scope,
        metadata_json,
        expires_at,
        deleted_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
      ON CONFLICT(user_id, service) DO UPDATE SET
        external_account_id = excluded.external_account_id,
        access_token_encrypted = excluded.access_token_encrypted,
        refresh_token_encrypted = excluded.refresh_token_encrypted,
        token_type = excluded.token_type,
        scope = excluded.scope,
        metadata_json = excluded.metadata_json,
        expires_at = excluded.expires_at,
        connected_at = CURRENT_TIMESTAMP,
        deleted_at = NULL
    `, [
            id,
            input.userId,
            input.service,
            input.externalAccountId ?? null,
            input.accessTokenEncrypted ?? null,
            input.refreshTokenEncrypted ?? null,
            input.tokenType ?? null,
            input.scope ?? null,
            JSON.stringify(input.metadata ?? {}),
            input.expiresAt ?? null,
        ]);
        return this.get(input.userId, input.service);
    },
    async markSynced(userId, service) {
        await runner.run(`
      UPDATE connected_services
      SET last_synced_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND service = ? AND deleted_at IS NULL
    `, [userId, service]);
    },
    async revoke(userId, service) {
        await withTransaction(async (tx) => {
            await tx.run(`
        UPDATE connected_services
        SET deleted_at = CURRENT_TIMESTAMP
        WHERE user_id = ? AND service = ?
      `, [userId, service]);
            await tx.run(`
        DELETE FROM aggregated_stats
        WHERE user_id = ? AND service = ?
      `, [userId, service]);
        });
    },
};
export const aggregatedStats = {
    async upsert(input) {
        await runner.run(`
      INSERT INTO aggregated_stats (
        id,
        user_id,
        service,
        period_start,
        period_end,
        data_json
      )
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, service, period_start, period_end) DO UPDATE SET
        data_json = excluded.data_json,
        synced_at = CURRENT_TIMESTAMP
    `, [
            crypto.randomUUID(),
            input.userId,
            input.service,
            input.periodStart,
            input.periodEnd,
            JSON.stringify(input.data),
        ]);
    },
    async getForPeriod(userId, service, periodStart, periodEnd) {
        const row = await runner.get(`
      SELECT *
      FROM aggregated_stats
      WHERE user_id = ? AND service = ? AND period_start = ? AND period_end = ?
      LIMIT 1
    `, [userId, service, periodStart, periodEnd]);
        if (!row)
            return null;
        return {
            id: row.id,
            userId: row.user_id,
            service: row.service,
            periodStart: row.period_start,
            periodEnd: row.period_end,
            data: parseJson(row.data_json, {}),
            syncedAt: row.synced_at,
            createdAt: row.created_at,
        };
    },
    async getLatest(userId, service) {
        const row = await runner.get(`
      SELECT *
      FROM aggregated_stats
      WHERE user_id = ? AND service = ?
      ORDER BY synced_at DESC, created_at DESC
      LIMIT 1
    `, [userId, service]);
        if (!row)
            return null;
        return {
            id: row.id,
            userId: row.user_id,
            service: row.service,
            periodStart: row.period_start,
            periodEnd: row.period_end,
            data: parseJson(row.data_json, {}),
            syncedAt: row.synced_at,
            createdAt: row.created_at,
        };
    },
};
export const wrappedSessions = {
    async create(input) {
        await runner.run(`
      INSERT INTO wrapped_sessions (
        id,
        user_id,
        services_json,
        period_start,
        period_end,
        cards_json,
        insights_json,
        template_id,
        template_name,
        accent_key
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
            input.id,
            input.userId,
            JSON.stringify(input.services),
            input.periodStart,
            input.periodEnd,
            JSON.stringify(input.cards),
            JSON.stringify(input.insights),
            input.templateId ?? null,
            input.templateName ?? null,
            input.accentKey ?? null,
        ]);
        return (await this.get(input.id));
    },
    async get(id) {
        const row = await runner.get('SELECT * FROM wrapped_sessions WHERE id = ? LIMIT 1', [id]);
        return row ? mapWrappedSession(row) : null;
    },
    async listForUser(userId, limit = 20) {
        const rows = await runner.all(`
        SELECT *
        FROM wrapped_sessions
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      `, [userId, limit]);
        return rows.map(mapWrappedSession);
    },
};
export const shareAssets = {
    async create(input) {
        await runner.run('INSERT INTO share_assets (id, wrapped_session_id, kind, uri) VALUES (?, ?, ?, ?)', [crypto.randomUUID(), input.wrappedSessionId, input.kind, input.uri]);
    },
};
export const syncLogs = {
    async create(input) {
        await runner.run(`
      INSERT INTO sync_logs (id, user_id, service, status, message, period_start, period_end)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
            crypto.randomUUID(),
            input.userId,
            input.service,
            input.status,
            input.message ?? null,
            input.periodStart ?? null,
            input.periodEnd ?? null,
        ]);
    },
};
export const dataDeletion = {
    async deleteAllForUser(userId) {
        await withTransaction(async (tx) => {
            await tx.run('DELETE FROM share_assets WHERE wrapped_session_id IN (SELECT id FROM wrapped_sessions WHERE user_id = ?)', [userId]);
            await tx.run('DELETE FROM wrapped_sessions WHERE user_id = ?', [userId]);
            await tx.run('DELETE FROM aggregated_stats WHERE user_id = ?', [userId]);
            await tx.run('DELETE FROM connected_services WHERE user_id = ?', [userId]);
            await tx.run('DELETE FROM oauth_requests WHERE user_id = ?', [userId]);
            await tx.run('DELETE FROM sync_logs WHERE user_id = ?', [userId]);
            await tx.run('DELETE FROM refresh_sessions WHERE user_id = ?', [userId]);
            await users.markDeleted(userId, tx);
        });
    },
};
