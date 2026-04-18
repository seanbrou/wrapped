import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new Database(join(__dirname, '../../wrapped.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const schema = readFileSync(join(__dirname, '../db/schema.sql'), 'utf-8');
db.exec(schema);

export default db;

// ── Users ──────────────────────────────────────────────────────────────────
export const users = {
  getOrCreate(id: string) {
    db.prepare(`INSERT OR IGNORE INTO users (id) VALUES (?)`).run(id);
    return db.prepare(`SELECT * FROM users WHERE id = ?`).get(id);
  },
};

// ── Connected Services ─────────────────────────────────────────────────────
export const connectedServices = {
  list(userId: string) {
    return db.prepare(`SELECT * FROM connected_services WHERE user_id = ?`).all(userId);
  },
  get(userId: string, service: string) {
    return db.prepare(`SELECT * FROM connected_services WHERE user_id = ? AND service = ?`).get(userId, service);
  },
  upsert(id: string, userId: string, service: string, encryptedAccess: string, encryptedRefresh: string | null, expiresAt: number | null) {
    db.prepare(`
      INSERT INTO connected_services (id, user_id, service, access_token_encrypted, refresh_token_encrypted, expires_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, service) DO UPDATE SET
        access_token_encrypted = excluded.access_token_encrypted,
        refresh_token_encrypted = excluded.refresh_token_encrypted,
        expires_at = excluded.expires_at,
        last_synced_at = CURRENT_TIMESTAMP
    `).run(id, userId, service, encryptedAccess, encryptedRefresh, expiresAt);
  },
  revoke(userId: string, service: string) {
    db.prepare(`DELETE FROM connected_services WHERE user_id = ? AND service = ?`).run(userId, service);
    db.prepare(`DELETE FROM aggregated_stats WHERE user_id = ? AND service = ?`).run(userId, service);
  },
};

// ── Aggregated Stats ────────────────────────────────────────────────────────
export const aggregatedStats = {
  upsert(id: string, userId: string, service: string, periodStart: string, periodEnd: string, data: object) {
    db.prepare(`
      INSERT INTO aggregated_stats (id, user_id, service, period_start, period_end, data)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, service, period_start, period_end) DO UPDATE SET data = excluded.data
    `).run(id, userId, service, periodStart, periodEnd, JSON.stringify(data));
  },
  get(userId: string, service: string, periodStart: string, periodEnd: string) {
    const row = db.prepare(`SELECT * FROM aggregated_stats WHERE user_id = ? AND service = ? AND period_start = ? AND period_end = ?`).get(userId, service, periodStart, periodEnd) as { data: string } | undefined;
    return row ? { ...row, data: JSON.parse(row.data) } : null;
  },
  getAllForUser(userId: string, periodStart: string, periodEnd: string) {
    const rows = db.prepare(`SELECT * FROM aggregated_stats WHERE user_id = ? AND period_start = ? AND period_end = ?`).all(userId, periodStart, periodEnd) as { data: string; service: string }[];
    return rows.map(r => ({ ...r, data: JSON.parse(r.data) }));
  },
};

// ── Wrapped Sessions ───────────────────────────────────────────────────────
export const wrappedSessions = {
  create(id: string, userId: string, services: string[], periodStart: string, periodEnd: string, cards: object[], insights: string[]) {
    db.prepare(`
      INSERT INTO wrapped_sessions (id, user_id, services, period_start, period_end, cards, insights)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, userId, JSON.stringify(services), periodStart, periodEnd, JSON.stringify(cards), JSON.stringify(insights));
    return { id, userId, services, periodStart, periodEnd, cards, insights };
  },
  get(id: string) {
    const row = db.prepare(`SELECT * FROM wrapped_sessions WHERE id = ?`).get(id) as { cards: string; insights: string; services: string } | undefined;
    if (!row) return null;
    return { ...row, cards: JSON.parse(row.cards), insights: JSON.parse(row.insights), services: JSON.parse(row.services) };
  },
};
