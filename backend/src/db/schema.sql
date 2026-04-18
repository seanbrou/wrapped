CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS connected_services (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  service TEXT NOT NULL,
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT,
  connected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_synced_at DATETIME,
  expires_at DATETIME,
  UNIQUE(user_id, service)
);

CREATE TABLE IF NOT EXISTS aggregated_stats (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  service TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  data TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, service, period_start, period_end)
);

CREATE TABLE IF NOT EXISTS wrapped_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  services TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  cards TEXT NOT NULL,
  insights TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS saved_wrappeds (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  wrapped_session_id TEXT NOT NULL,
  saved_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
