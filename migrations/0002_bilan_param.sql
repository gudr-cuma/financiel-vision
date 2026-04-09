-- Migration 0002 : Bilan paramétrable
-- Exécuter ces 3 instructions SÉPARÉMENT dans la D1 Console

-- 1. Ajouter can_edit à la table permissions
ALTER TABLE permissions ADD COLUMN can_edit INTEGER NOT NULL DEFAULT 0;

-- 2. Créer la table bilan_config
CREATE TABLE IF NOT EXISTS bilan_config (
  id           TEXT PRIMARY KEY,
  doc          TEXT NOT NULL,
  type         TEXT NOT NULL,
  parent_id    TEXT REFERENCES bilan_config(id) ON DELETE CASCADE,
  position     INTEGER NOT NULL DEFAULT 0,
  label        TEXT NOT NULL,
  code_ranges  TEXT,
  credit_sign  INTEGER NOT NULL DEFAULT 1,
  formula_refs TEXT,
  bold         INTEGER NOT NULL DEFAULT 0,
  updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_by   TEXT REFERENCES users(id) ON DELETE SET NULL
);

-- 3. Index sur bilan_config
CREATE INDEX IF NOT EXISTS idx_bilan_config_doc ON bilan_config(doc, position);
