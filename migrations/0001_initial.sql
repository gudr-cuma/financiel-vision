-- Clario Vision — Schéma initial
-- À exécuter dans le dashboard Cloudflare → D1 → financiel-vision-db → Console

CREATE TABLE IF NOT EXISTS users (
  id                    TEXT PRIMARY KEY,
  email                 TEXT UNIQUE NOT NULL,
  name                  TEXT NOT NULL,
  role                  TEXT NOT NULL DEFAULT 'user',  -- 'admin' | 'user'
  is_active             INTEGER NOT NULL DEFAULT 1,
  password_hash         TEXT NOT NULL,  -- "pbkdf2:sha256:310000:<salt_b64>:<hash_b64>"
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT NOT NULL DEFAULT (datetime('now')),
  last_login            TEXT,
  failed_login_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until          TEXT  -- ISO datetime, NULL si non verrouillé
);

CREATE TABLE IF NOT EXISTS sessions (
  id          TEXT PRIMARY KEY,  -- UUID v4 = token opaque envoyé au client via cookie
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at  TEXT NOT NULL,
  last_seen   TEXT NOT NULL DEFAULT (datetime('now')),
  ip_address  TEXT,
  user_agent  TEXT,
  is_revoked  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS permissions (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  section     TEXT NOT NULL,  -- 'analyseur'|'dashboard'|'dossier'|'bilanCR'|'editions'|'export'|'analyse'
  can_access  INTEGER NOT NULL DEFAULT 1,
  UNIQUE(user_id, section)
);

CREATE INDEX IF NOT EXISTS idx_sessions_user    ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_permissions_user ON permissions(user_id);

CREATE TRIGGER IF NOT EXISTS users_updated_at
AFTER UPDATE ON users FOR EACH ROW
BEGIN
  UPDATE users SET updated_at = datetime('now') WHERE id = NEW.id;
END;
