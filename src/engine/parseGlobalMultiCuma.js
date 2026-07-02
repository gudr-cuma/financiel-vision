// src/engine/parseGlobalMultiCuma.js
import * as XLSX from 'xlsx';
import { categorieFromCA } from '../domain/multiCuma/tranches';

/**
 * Correspondance clé interne → { header exact (trim), index de repli }.
 * L'ordre n'a pas d'importance. `resolveColumns` cherche d'abord l'en-tête
 * exact ; à défaut il utilise l'index fixe (robustesse inter-versions).
 */
export const GLOBAL_FIELD_MAP = [
  { key: 'classe', header: 'classe', index: 0 },
  { key: 'dpt', header: 'Dpt', index: 1 },
  { key: 'region', header: 'Region', index: 2 },
  { key: 'interR', header: 'InterR', index: 3 },
  { key: 'nom', header: '118 CUMA', index: 4 },
  { key: 'nbAdherents', header: "Nombre d'adhérents", index: 5 },
  { key: 'nbCuma', header: 'Nombre de cuma', index: 6 },
  { key: 'ca', header: 'CA', index: 7 },
  { key: 'caCorrige', header: 'CA  corrigé', index: 8 },
  { key: 'ebe', header: 'E.B.E.', index: 9 },
  { key: 'resultatCourant', header: 'Résultat courant', index: 10 },
  { key: 'resultatExceptionnel', header: 'Résultat exceptionnel', index: 11 },
  { key: 'resultatNet', header: 'Résultat net', index: 12 },
  { key: 'pctEntretienCA', header: '% Entretien / CA', index: 13 },
  { key: 'entretienReparation', header: 'Entretien réparation', index: 14 },
  { key: 'pctAmortCA', header: '% Amortis./ CA', index: 15 },
  { key: 'amortissement', header: 'Amortissement', index: 16 },
  { key: 'pctTxVetuste', header: '% Tx Vétusté', index: 17 },
  { key: 'pctChSalarialesCA', header: '% Ch. salariales/ CA', index: 18 },
  { key: 'chargesSalariales', header: 'Charges salariales', index: 19 },
  { key: 'carburant', header: 'Carburant', index: 20 },
  { key: 'pctFraisFinancierCA', header: 'Frais Financier / CA', index: 21 },
  { key: 'fraisFinancier', header: 'Frais financier', index: 22 },
  { key: 'fdgCA', header: 'FDG/CA', index: 23 },
  { key: 'fdrCorrigeCA', header: 'Fdr corrigé / CA', index: 24 },
  { key: 'fdrCorrige', header: 'Fdr corrigé', index: 25 },
  { key: 'pctCreancesCA', header: '% Créances / CA', index: 26 },
  { key: 'creances', header: 'Créances', index: 27 },
  { key: 'capitalSocCA', header: 'Capital soc / CA', index: 29 },
  { key: 'capitalSocial', header: 'Capital Social', index: 30 },
  { key: 'pctCSValBruteMateriel', header: '% CS / Val. Brute Matériel', index: 31 },
  { key: 'valeurBruteMateriels', header: 'Valeur brute des matériels', index: 32 },
  { key: 'pctCSCapPropres', header: '% CS / Cap. propres', index: 33 },
  { key: 'capitauxPropres', header: 'Capitaux propres', index: 34 },
  { key: 'pctCapPropresPassif', header: '% Cap Propres/ Passif', index: 35 },
  { key: 'passif', header: 'Passif', index: 36 },
  { key: 'pctTauxEndettement', header: "% Taux d'endettement", index: 37 },
  { key: 'endettementLMT', header: 'Endettement LMT', index: 38 },
  { key: 'caf', header: "Capacité d'auto-financement", index: 39 },
  { key: 'fondRoulementCA', header: 'Fond roulement / CA', index: 51 },
  { key: 'fondRoulement', header: 'Fond de roulement', index: 52 },
];

const EXCLUDED_NAMES = ['total', 'moyenne', '1er quartile', '3ème quartile', '3eme quartile'];

function isExcludedName(name) {
  if (name == null) return true;
  const t = String(name).trim().toLowerCase();
  if (t === '') return true;
  if (t.startsWith('nb cuma')) return true;
  return EXCLUDED_NAMES.includes(t);
}

function resolveColumns(headerRow) {
  const trimmed = (headerRow || []).map((h) => (h == null ? '' : String(h).trim()));
  const resolved = {};
  for (const { key, header, index } of GLOBAL_FIELD_MAP) {
    let idx = trimmed.findIndex((h) => h === header);
    if (idx === -1) idx = index;
    resolved[key] = idx;
  }
  return resolved;
}

/**
 * Parse un classeur benchmark multi-CUMA (onglet `global`) déjà lu en
 * ArrayBuffer.
 * @param {ArrayBuffer} arrayBuffer
 * @returns {{ importedAt: string, rows: object[] }}
 */
export function parseGlobalMultiCumaBuffer(arrayBuffer) {
  const wb = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
  if (!wb.SheetNames.includes('global')) {
    throw new Error('Feuille "global" introuvable dans le fichier Excel.');
  }
  const matrix = XLSX.utils.sheet_to_json(wb.Sheets['global'], {
    header: 1, defval: null, blankrows: false,
  });
  if (matrix.length < 2) throw new Error('La feuille "global" est vide.');

  const cols = resolveColumns(matrix[0]);
  const rows = [];
  for (let i = 1; i < matrix.length; i++) {
    const raw = matrix[i];
    const nom = raw[cols.nom];
    if (isExcludedName(nom)) continue;
    const row = {};
    for (const key of Object.keys(cols)) {
      row[key] = raw[cols[key]] ?? null;
    }
    row.nom = String(nom).trim();
    row.categorie = categorieFromCA(Number(row.ca) || 0);
    rows.push(row);
  }
  return { importedAt: new Date().toISOString(), rows };
}

/**
 * Parse le fichier Excel benchmark déposé par l'utilisateur.
 * @param {File} file
 * @returns {Promise<{ importedAt: string, rows: object[], fileName: string }>}
 */
export async function parseGlobalMultiCuma(file) {
  const arrayBuffer = await file.arrayBuffer();
  const data = parseGlobalMultiCumaBuffer(arrayBuffer);
  return { ...data, fileName: file.name };
}
