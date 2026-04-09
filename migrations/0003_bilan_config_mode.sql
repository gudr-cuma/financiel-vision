-- Migration 0003 : Remplacement credit_sign par mode de calcul (5 modes comptables)
-- Exécuter ces 5 instructions SÉPARÉMENT dans la D1 Console

-- 1. Ajouter la colonne mode
ALTER TABLE bilan_config ADD COLUMN mode TEXT NOT NULL DEFAULT 'SOLDE';

-- 2. Actif → lignes de comptes = solde débiteur net
UPDATE bilan_config SET mode = 'TOTAL_DEBITEUR' WHERE doc = 'actif' AND type = 'line';

-- 3. Passif → lignes de comptes = solde créditeur net
UPDATE bilan_config SET mode = 'TOTAL_CREDITEUR' WHERE doc = 'passif' AND type = 'line';

-- 4. Résultat → charges (credit_sign = 1) = total flux débit
UPDATE bilan_config SET mode = 'TOTAL_DEBIT' WHERE doc = 'resultat' AND type = 'line' AND credit_sign = 1;

-- 5. Résultat → produits (credit_sign = -1) = total flux crédit
UPDATE bilan_config SET mode = 'TOTAL_CREDIT' WHERE doc = 'resultat' AND type = 'line' AND credit_sign = -1;
