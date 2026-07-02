// src/domain/multiCuma/synthese.js
import { TRANCHE_ORDER } from './tranches';

/**
 * Métrique de pivot.
 * type: 'value' (défaut) | 'count' | 'share'
 * value → moyenne(source) ; en mode pondéré avec num/denom → Σnum/Σdenom
 * format: 'amount' | 'percent' | 'int'
 */
export const TABLE1_METRICS = [
  { label: 'CA', type: 'value', source: 'ca', format: 'amount' },
  { label: 'Rés. Courant', type: 'value', source: 'resultatCourant', format: 'amount' },
  { label: 'Rés. Excépt.', type: 'value', source: 'resultatExceptionnel', format: 'amount' },
  { label: 'Rés. Net', type: 'value', source: 'resultatNet', format: 'amount' },
  { label: '% Entretien / CA', type: 'value', source: 'pctEntretienCA', format: 'percent', num: 'entretienReparation', denom: 'ca' },
  { label: '% Amortis. / CA', type: 'value', source: 'pctAmortCA', format: 'percent', num: 'amortissement', denom: 'ca' },
  { label: '% Ch. Salariales / CA', type: 'value', source: 'pctChSalarialesCA', format: 'percent', num: 'chargesSalariales', denom: 'ca' },
  { label: 'Carburant', type: 'value', source: 'carburant', format: 'amount' },
  { label: 'Frais Financier / CA', type: 'value', source: 'pctFraisFinancierCA', format: 'percent', num: 'fraisFinancier', denom: 'ca' },
  { label: 'Nombre dossiers', type: 'count', format: 'int' },
  { label: 'Répartition CUMA par CA', type: 'share', format: 'percent' },
];

export const TABLE2_METRICS = [
  { label: 'Fonds roulement', type: 'value', source: 'fondRoulement', format: 'amount' },
  { label: 'Fonds roulement / CA', type: 'value', source: 'fondRoulementCA', format: 'percent', num: 'fondRoulement', denom: 'ca' },
  { label: '% Cap Propres / Passif', type: 'value', source: 'pctCapPropresPassif', format: 'percent', num: 'capitauxPropres', denom: 'passif' },
  { label: 'CS', type: 'value', source: 'capitalSocial', format: 'amount' },
  { label: 'Capital soc / CA', type: 'value', source: 'capitalSocCA', format: 'percent', num: 'capitalSocial', denom: 'ca' },
  // NOTE spec §7 : dénominateur du taux d'endettement à confirmer (capitauxPropres par défaut).
  { label: "% Taux d'endettement", type: 'value', source: 'pctTauxEndettement', format: 'percent', num: 'endettementLMT', denom: 'capitauxPropres' },
  { label: 'Créances', type: 'value', source: 'creances', format: 'amount' },
  { label: '% Créances / CA', type: 'value', source: 'pctCreancesCA', format: 'percent', num: 'creances', denom: 'ca' },
  { label: '% CS / Val. Brute Matériel', type: 'value', source: 'pctCSValBruteMateriel', format: 'percent', num: 'capitalSocial', denom: 'valeurBruteMateriels' },
];

function mean(rows, key) {
  let sum = 0, n = 0;
  for (const r of rows) {
    const v = Number(r[key]);
    if (Number.isFinite(v)) { sum += v; n++; }
  }
  return n === 0 ? null : sum / n;
}

function sumKey(rows, key) {
  let s = 0;
  for (const r of rows) {
    const v = Number(r[key]);
    if (Number.isFinite(v)) s += v;
  }
  return s;
}

/**
 * Calcule une cellule de métrique sur un sous-ensemble de lignes.
 * @param {object[]} subset
 * @param {object} metric
 * @param {'mean'|'weighted'} mode
 * @param {number} totalCount effectif de l'ensemble filtré (pour 'share')
 * @returns {number|null}
 */
export function computeMetric(subset, metric, mode, totalCount) {
  if (metric.type === 'count') return subset.length;
  if (metric.type === 'share') return totalCount === 0 ? null : subset.length / totalCount;
  if (mode === 'weighted' && metric.num && metric.denom) {
    const d = sumKey(subset, metric.denom);
    return d === 0 ? null : sumKey(subset, metric.num) / d;
  }
  return mean(subset, metric.source);
}

/**
 * Construit un tableau de synthèse : une ligne par tranche (dans l'ordre) +
 * une ligne Total sur l'ensemble filtré.
 * @param {object[]} rows lignes déjà filtrées (région/dpt/classe)
 * @param {object[]} metrics TABLE1_METRICS ou TABLE2_METRICS
 * @param {{mode?: 'mean'|'weighted'}} [options]
 */
export function computeSyntheseTable(rows, metrics, { mode = 'mean' } = {}) {
  const total = rows.length;
  const byTranche = new Map(TRANCHE_ORDER.map((t) => [t, []]));
  for (const r of rows) {
    if (byTranche.has(r.categorie)) byTranche.get(r.categorie).push(r);
  }
  const trancheRows = TRANCHE_ORDER.map((t) => {
    const subset = byTranche.get(t);
    return {
      categorie: t,
      count: subset.length,
      cells: metrics.map((m) => computeMetric(subset, m, mode, total)),
    };
  });
  const totalRow = {
    categorie: 'Total',
    count: total,
    cells: metrics.map((m) => computeMetric(rows, m, mode, total)),
  };
  return { trancheRows, totalRow };
}
