// src/domain/multiCuma/columns.js
import { formatAmountFull, formatPercent } from '../../engine/formatUtils';

/**
 * Colonnes affichées dans l'onglet Données (dans l'ordre). Les colonnes
 * purement techniques du fichier source sont volontairement omises.
 * format: 'text' | 'int' | 'amount' | 'percent'
 * frozen: colonne figée à gauche (nom).
 */
export const DATA_COLUMNS = [
  { key: 'nom', label: 'CUMA', format: 'text', frozen: true },
  { key: 'classe', label: 'Classe', format: 'text' },
  { key: 'dpt', label: 'Dpt', format: 'text' },
  { key: 'region', label: 'Région', format: 'text' },
  { key: 'categorie', label: 'Tranche CA', format: 'text' },
  { key: 'nbAdherents', label: 'Adhérents', format: 'int' },
  { key: 'ca', label: 'CA', format: 'amount' },
  { key: 'caCorrige', label: 'CA corrigé', format: 'amount' },
  { key: 'ebe', label: 'EBE', format: 'amount' },
  { key: 'resultatCourant', label: 'Rés. courant', format: 'amount' },
  { key: 'resultatExceptionnel', label: 'Rés. except.', format: 'amount' },
  { key: 'resultatNet', label: 'Rés. net', format: 'amount' },
  { key: 'pctEntretienCA', label: '% Entretien/CA', format: 'percent' },
  { key: 'entretienReparation', label: 'Entretien', format: 'amount' },
  { key: 'pctAmortCA', label: '% Amort./CA', format: 'percent' },
  { key: 'amortissement', label: 'Amortissement', format: 'amount' },
  { key: 'pctChSalarialesCA', label: '% Ch. sal./CA', format: 'percent' },
  { key: 'chargesSalariales', label: 'Ch. salariales', format: 'amount' },
  { key: 'carburant', label: 'Carburant', format: 'amount' },
  { key: 'pctFraisFinancierCA', label: '% Frais fin./CA', format: 'percent' },
  { key: 'fraisFinancier', label: 'Frais fin.', format: 'amount' },
  { key: 'fondRoulement', label: 'Fonds roulement', format: 'amount' },
  { key: 'fondRoulementCA', label: 'FDR/CA', format: 'percent' },
  { key: 'pctCreancesCA', label: '% Créances/CA', format: 'percent' },
  { key: 'creances', label: 'Créances', format: 'amount' },
  { key: 'capitalSocCA', label: 'Cap. soc./CA', format: 'percent' },
  { key: 'capitalSocial', label: 'Capital social', format: 'amount' },
  { key: 'pctCSValBruteMateriel', label: '% CS/VBM', format: 'percent' },
  { key: 'valeurBruteMateriels', label: 'Val. brute matériels', format: 'amount' },
  { key: 'pctCapPropresPassif', label: '% Cap. propres/Passif', format: 'percent' },
  { key: 'capitauxPropres', label: 'Capitaux propres', format: 'amount' },
  { key: 'passif', label: 'Passif', format: 'amount' },
  { key: 'pctTauxEndettement', label: "% Taux d'endett.", format: 'percent' },
  { key: 'endettementLMT', label: 'Endettement LMT', format: 'amount' },
  { key: 'caf', label: 'CAF', format: 'amount' },
];

/**
 * Formate une valeur pour l'affichage selon le type de colonne/métrique.
 * Les ratios sont stockés en fraction → multipliés par 100 pour l'affichage.
 * @param {any} value
 * @param {'text'|'int'|'amount'|'percent'} format
 * @returns {string}
 */
export function formatCell(value, format) {
  if (format === 'text') return value == null || value === '' ? '—' : String(value);
  if (value == null || value === '' || !Number.isFinite(Number(value))) {
    return format === 'percent' ? '— %' : '—';
  }
  const n = Number(value);
  if (format === 'int') return new Intl.NumberFormat('fr-FR').format(Math.round(n));
  if (format === 'percent') return formatPercent(n * 100, 1);
  return formatAmountFull(n); // 'amount'
}
