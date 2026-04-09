-- Migration 0004 : Ajout du droit d'import de fichiers réels
-- Exécuter dans la D1 Console (1 instruction)

ALTER TABLE users ADD COLUMN can_upload_file INTEGER NOT NULL DEFAULT 0;
