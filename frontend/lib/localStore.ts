import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import * as SQLite from 'expo-sqlite';
import type { RecapSummary, ServiceInfo, WrappedCard, WrappedData } from './types';

const DB_NAME = 'wrapped-local.db';
const DB_KEY_NAME = 'wrapped.localDbKey';

type SessionSnapshot = {
  installId: string;
  userId: string;
  accessTokenExpiresAt: string;
  refreshTokenExpiresAt: string;
};

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

function escapeSqlString(value: string) {
  return value.replace(/'/g, "''");
}

async function getDatabaseKey() {
  let key = await SecureStore.getItemAsync(DB_KEY_NAME);
  if (!key) {
    key = Crypto.randomUUID();
    await SecureStore.setItemAsync(DB_KEY_NAME, key);
  }
  return key;
}

async function createSchema(db: SQLite.SQLiteDatabase) {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS install_session (
      install_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      access_token_expires_at TEXT NOT NULL,
      refresh_token_expires_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS service_connection_cache (
      service_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      logo_url TEXT,
      is_connected INTEGER NOT NULL DEFAULT 0,
      last_synced_at TEXT,
      connection_kind TEXT,
      is_available INTEGER NOT NULL DEFAULT 1,
      local_only INTEGER NOT NULL DEFAULT 0,
      disabled_reason TEXT,
      payload_json TEXT NOT NULL DEFAULT '{}',
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS service_aggregate (
      id TEXT PRIMARY KEY,
      service_id TEXT NOT NULL,
      period_start TEXT NOT NULL,
      period_end TEXT NOT NULL,
      data_json TEXT NOT NULL,
      synced_at TEXT NOT NULL,
      UNIQUE(service_id, period_start, period_end)
    );

    CREATE TABLE IF NOT EXISTS wrapped_session (
      id TEXT PRIMARY KEY,
      template_id TEXT,
      template_name TEXT NOT NULL,
      services_json TEXT NOT NULL,
      period TEXT NOT NULL,
      accent_key TEXT NOT NULL,
      created_at TEXT NOT NULL,
      year INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS wrapped_card (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      card_index INTEGER NOT NULL,
      type TEXT NOT NULL,
      service TEXT NOT NULL,
      data_json TEXT NOT NULL,
      FOREIGN KEY(session_id) REFERENCES wrapped_session(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS share_asset (
      id TEXT PRIMARY KEY,
      wrapped_session_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      uri TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(wrapped_session_id) REFERENCES wrapped_session(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sync_log (
      id TEXT PRIMARY KEY,
      service_id TEXT NOT NULL,
      status TEXT NOT NULL,
      message TEXT,
      created_at TEXT NOT NULL
    );
  `);
}

export async function getDatabase() {
  if (!databasePromise) {
    databasePromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      const key = await getDatabaseKey();
      try {
        await db.execAsync(`PRAGMA key = '${escapeSqlString(key)}';`);
      } catch {
        // SQLCipher isn't available in web previews; keep the DB usable there.
      }
      await createSchema(db);
      return db;
    })();
  }

  return databasePromise;
}

export async function saveSessionSnapshot(snapshot: SessionSnapshot) {
  const db = await getDatabase();
  await db.runAsync(
    `
      INSERT INTO install_session (
        install_id,
        user_id,
        access_token_expires_at,
        refresh_token_expires_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(install_id) DO UPDATE SET
        user_id = excluded.user_id,
        access_token_expires_at = excluded.access_token_expires_at,
        refresh_token_expires_at = excluded.refresh_token_expires_at,
        updated_at = excluded.updated_at
    `,
    snapshot.installId,
    snapshot.userId,
    snapshot.accessTokenExpiresAt,
    snapshot.refreshTokenExpiresAt,
    new Date().toISOString(),
  );
}

export async function getSessionSnapshot(installId: string) {
  const db = await getDatabase();
  return db.getFirstAsync<SessionSnapshot>(
    `
      SELECT
        install_id as installId,
        user_id as userId,
        access_token_expires_at as accessTokenExpiresAt,
        refresh_token_expires_at as refreshTokenExpiresAt
      FROM install_session
      WHERE install_id = ?
      LIMIT 1
    `,
    installId,
  );
}

export async function clearSessionSnapshot() {
  const db = await getDatabase();
  await db.execAsync('DELETE FROM install_session;');
}

export async function upsertServices(services: ServiceInfo[]) {
  const db = await getDatabase();
  const now = new Date().toISOString();

  for (const service of services) {
    await db.runAsync(
      `
        INSERT INTO service_connection_cache (
          service_id,
          name,
          logo_url,
          is_connected,
          last_synced_at,
          connection_kind,
          is_available,
          local_only,
          disabled_reason,
          payload_json,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(service_id) DO UPDATE SET
          name = excluded.name,
          logo_url = excluded.logo_url,
          is_connected = excluded.is_connected,
          last_synced_at = excluded.last_synced_at,
          connection_kind = excluded.connection_kind,
          is_available = excluded.is_available,
          local_only = excluded.local_only,
          disabled_reason = excluded.disabled_reason,
          payload_json = excluded.payload_json,
          updated_at = excluded.updated_at
      `,
      service.id,
      service.name,
      service.logoUrl,
      service.isConnected ? 1 : 0,
      service.lastSyncedAt ?? null,
      service.connectionKind ?? null,
      service.isAvailable === false ? 0 : 1,
      service.localOnly ? 1 : 0,
      service.disabledReason ?? null,
      JSON.stringify(service),
      now,
    );
  }
}

export async function listCachedServices() {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    payload_json: string;
  }>('SELECT payload_json FROM service_connection_cache ORDER BY updated_at DESC');
  return rows.map((row) => JSON.parse(row.payload_json) as ServiceInfo);
}

export async function saveAggregate(input: {
  serviceId: string;
  periodStart: string;
  periodEnd: string;
  data: Record<string, unknown>;
}) {
  const db = await getDatabase();
  await db.runAsync(
    `
      INSERT INTO service_aggregate (
        id,
        service_id,
        period_start,
        period_end,
        data_json,
        synced_at
      )
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(service_id, period_start, period_end) DO UPDATE SET
        data_json = excluded.data_json,
        synced_at = excluded.synced_at
    `,
      Crypto.randomUUID(),
    input.serviceId,
    input.periodStart,
    input.periodEnd,
    JSON.stringify(input.data),
    new Date().toISOString(),
  );
}

export async function getAggregate(serviceId: string, periodStart: string, periodEnd: string) {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ data_json: string }>(
    `
      SELECT data_json
      FROM service_aggregate
      WHERE service_id = ? AND period_start = ? AND period_end = ?
      LIMIT 1
    `,
    serviceId,
    periodStart,
    periodEnd,
  );
  return row ? (JSON.parse(row.data_json) as Record<string, unknown>) : null;
}

export async function listLatestAggregates(serviceIds: string[]) {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    service_id: string;
    period_start: string;
    period_end: string;
    data_json: string;
  }>(
    `
      SELECT sa.service_id, sa.period_start, sa.period_end, sa.data_json
      FROM service_aggregate sa
      INNER JOIN (
        SELECT service_id, MAX(synced_at) as latest_synced_at
        FROM service_aggregate
        WHERE service_id IN (${serviceIds.map(() => '?').join(', ') || "''"})
        GROUP BY service_id
      ) latest
      ON latest.service_id = sa.service_id
      WHERE sa.service_id IN (${serviceIds.map(() => '?').join(', ') || "''"})
    `,
    ...serviceIds,
    ...serviceIds,
  );

  return rows.map((row) => ({
    service: row.service_id,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    data: JSON.parse(row.data_json) as Record<string, unknown>,
  }));
}

export async function saveWrappedSession(input: {
  session: WrappedData;
  templateId?: string;
  templateName: string;
  period: string;
  accentKey: string;
}) {
  const db = await getDatabase();
  const createdAt = input.session.createdAt ?? new Date().toISOString();
  const year = input.session.year ?? new Date(createdAt).getFullYear();

  await db.runAsync(
    `
      INSERT INTO wrapped_session (
        id,
        template_id,
        template_name,
        services_json,
        period,
        accent_key,
        created_at,
        year
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        template_id = excluded.template_id,
        template_name = excluded.template_name,
        services_json = excluded.services_json,
        period = excluded.period,
        accent_key = excluded.accent_key,
        created_at = excluded.created_at,
        year = excluded.year
    `,
    input.session.sessionId,
    input.templateId ?? null,
    input.templateName,
    JSON.stringify(input.session.services ?? []),
    input.period,
    input.accentKey,
    createdAt,
    year,
  );

  await db.runAsync('DELETE FROM wrapped_card WHERE session_id = ?', input.session.sessionId);

  for (let index = 0; index < input.session.cards.length; index += 1) {
    const card = input.session.cards[index];
    await db.runAsync(
      `
        INSERT INTO wrapped_card (
          id,
          session_id,
          card_index,
          type,
          service,
          data_json
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      card.id ?? Crypto.randomUUID(),
      input.session.sessionId,
      index,
      card.type,
      card.service,
      JSON.stringify(card.data),
    );
  }
}

export async function getWrappedSession(sessionId: string): Promise<WrappedData | null> {
  const db = await getDatabase();
  const session = await db.getFirstAsync<{
    id: string;
    services_json: string;
    created_at: string;
    year: number;
  }>(
    `
      SELECT id, services_json, created_at, year
      FROM wrapped_session
      WHERE id = ?
      LIMIT 1
    `,
    sessionId,
  );

  if (!session) return null;

  const cards = await db.getAllAsync<{
    id: string;
    type: WrappedCard['type'];
    service: string;
    data_json: string;
  }>(
    `
      SELECT id, type, service, data_json
      FROM wrapped_card
      WHERE session_id = ?
      ORDER BY card_index ASC
    `,
    sessionId,
  );

  return {
    sessionId: session.id,
    year: session.year,
    services: JSON.parse(session.services_json) as string[],
    cards: cards.map((card) => ({
      id: card.id,
      type: card.type,
      service: card.service,
      data: JSON.parse(card.data_json),
    })),
    createdAt: session.created_at,
  };
}

export async function listRecapSummaries(): Promise<RecapSummary[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<
    Pick<RecapSummary, 'id' | 'templateId' | 'templateName' | 'period' | 'accentKey' | 'createdAt'> & {
      servicesJson: string;
      year: number;
    }
  >(
    `
      SELECT
        id,
        COALESCE(template_id, 'custom') as templateId,
        template_name as templateName,
        services_json as servicesJson,
        period,
        accent_key as accentKey,
        created_at as createdAt,
        year
      FROM wrapped_session
      ORDER BY created_at DESC
      LIMIT 20
    `,
  );

  return rows.map((row) => ({
    id: row.id,
    templateId: row.templateId,
    templateName: row.templateName,
    services: JSON.parse(row.servicesJson) as string[],
    period: row.period,
    cardCount: 0,
    createdAt: row.createdAt,
    accentKey: row.accentKey,
  }));
}

export async function updateRecapCardCounts() {
  const db = await getDatabase();
  const counts = await db.getAllAsync<{ session_id: string; count: number }>(
    `
      SELECT session_id, COUNT(*) as count
      FROM wrapped_card
      GROUP BY session_id
    `,
  );
  return new Map(counts.map((row) => [row.session_id, row.count]));
}

export async function deleteRecap(sessionId: string) {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM wrapped_session WHERE id = ?', sessionId);
}

export async function saveShareAsset(input: {
  wrappedSessionId: string;
  kind: string;
  uri: string;
}) {
  const db = await getDatabase();
  await db.runAsync(
    `
      INSERT INTO share_asset (id, wrapped_session_id, kind, uri, created_at)
      VALUES (?, ?, ?, ?, ?)
    `,
    Crypto.randomUUID(),
    input.wrappedSessionId,
    input.kind,
    input.uri,
    new Date().toISOString(),
  );
}

export async function saveSyncLog(serviceId: string, status: string, message?: string) {
  const db = await getDatabase();
  await db.runAsync(
    `
      INSERT INTO sync_log (id, service_id, status, message, created_at)
      VALUES (?, ?, ?, ?, ?)
    `,
    Crypto.randomUUID(),
    serviceId,
    status,
    message ?? null,
    new Date().toISOString(),
  );
}

export async function deleteAllLocalData() {
  const db = await getDatabase();
  await db.execAsync(`
    DELETE FROM wrapped_card;
    DELETE FROM wrapped_session;
    DELETE FROM share_asset;
    DELETE FROM service_aggregate;
    DELETE FROM service_connection_cache;
    DELETE FROM sync_log;
    DELETE FROM install_session;
  `);
}
