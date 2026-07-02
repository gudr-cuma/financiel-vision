/**
 * Module drillDown — extraction des comptes et écritures pour un poste SIG ou bilan.
 *
 * Niveau 1 : getAccountsForPoste → liste des comptes contribuant au poste
 * Niveau 2 : getEntriesForAccount → écritures d'un compte avec solde running
 */

import { SIG_MAPPING } from './computeSig';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function accountMatchesPoste(compteNum, poste) {
  if (poste.isTotal || !poste.accounts) return false;
  const matchesRange = poste.accounts.some(a => compteNum.startsWith(a.range));
  if (!matchesRange) return false;
  if (poste.excludeRanges) {
    return !poste.excludeRanges.some(ex => compteNum.startsWith(ex));
  }
  return true;
}

/**
 * Calcule le solde net d'un compte selon son type.
 * Produits (classe 7 ou comptes de produits) : crédit − débit
 * Charges (classe 6) + par défaut : débit − crédit
 */
function netSolde(debit, credit, type) {
  return type === 'product' ? credit - debit : debit - credit;
}

// ---------------------------------------------------------------------------
// Niveau 1 : comptes contribuant à un poste SIG
// ---------------------------------------------------------------------------

/**
 * Retourne la liste des comptes qui contribuent à un poste SIG,
 * avec leur total débit, crédit, solde net et nombre d'écritures.
 * Les écritures ANC sont exclues (SIG).
 *
 * @param {string} sigId - Identifiant du poste SIG
 * @param {Array} entries - Toutes les écritures parsées
 * @returns {AccountDetail[]}
 */
export function getAccountsForPoste(sigId, entries) {
  const poste = SIG_MAPPING.find(p => p.id === sigId);
  if (!poste || poste.isTotal) return [];

  // Accumuler par compteNum
  const byAccount = {};

  for (const entry of entries) {
    if (entry.journalCode === 'ANC') continue;
    if (!accountMatchesPoste(entry.compteNum, poste)) continue;

    if (!byAccount[entry.compteNum]) {
      byAccount[entry.compteNum] = {
        compteNum: entry.compteNum,
        compteLib: entry.compteLib,
        nbEcritures: 0,
        totalDebit: 0,
        totalCredit: 0,
        solde: 0,
      };
    }

    byAccount[entry.compteNum].nbEcritures++;
    byAccount[entry.compteNum].totalDebit += entry.debit;
    byAccount[entry.compteNum].totalCredit += entry.credit;
  }

  // Calculer le solde net et trier par solde décroissant
  return Object.values(byAccount)
    .map(acc => ({
      ...acc,
      totalDebit: Math.round(acc.totalDebit * 100) / 100,
      totalCredit: Math.round(acc.totalCredit * 100) / 100,
      solde: Math.round(netSolde(acc.totalDebit, acc.totalCredit, poste.type) * 100) / 100,
    }))
    .sort((a, b) => Math.abs(b.solde) - Math.abs(a.solde));
}

// ---------------------------------------------------------------------------
// Niveau 2 : écritures d'un compte avec solde running
// ---------------------------------------------------------------------------

/**
 * Retourne les écritures d'un compte contribuant à un poste SIG,
 * triées par date, avec un solde running cumulé.
 *
 * Règle solde running :
 *   - Charges (classe 6) : cumul de (débit − crédit)
 *   - Produits (classe 7) : cumul de (crédit − débit)
 *
 * @param {string} compteNum - Numéro de compte
 * @param {string} sigId - Identifiant du poste SIG (pour déterminer le type)
 * @param {Array} entries - Toutes les écritures
 * @returns {EntryWithRunning[]}
 */
export function getEntriesForAccount(compteNum, sigId, entries) {
  const poste = SIG_MAPPING.find(p => p.id === sigId);
  const type = poste?.type ?? 'charge';

  const filtered = entries
    .filter(e => e.journalCode !== 'ANC' && e.compteNum === compteNum)
    .sort((a, b) => a.ecritureDate - b.ecritureDate);

  let running = 0;
  return filtered.map(e => {
    running += netSolde(e.debit, e.credit, type);
    return {
      ecritureDate: e.ecritureDate,
      ecritureLib: e.ecritureLib,
      pieceRef: e.pieceRef,
      journalCode: e.journalCode,
      debit: e.debit,
      credit: e.credit,
      soldeCumule: Math.round(running * 100) / 100,
    };
  });
}

// ---------------------------------------------------------------------------
// Niveau 1 bilan : comptes contribuant à un poste bilan
// ---------------------------------------------------------------------------

/**
 * Retourne les comptes contribuant à un poste bilan (usage pour E-10).
 * Pour le poste 453* : grouper par CompAuxNum (adhérent individuel).
 *
 * @param {string[]} ranges - Ex. ['453'] ou ['51', '53']
 * @param {Array} entries - Toutes les écritures (ANC inclus pour le bilan)
 * @param {{ excludeRanges?: string[], groupByAux?: boolean }} options
 * @returns {AccountDetail[]}
 */
export function getAccountsForBilan(ranges, entries, options = {}) {
  const { excludeRanges = [], groupByAux = false, type = 'charge' } = options;
  const byAccount = {};

  for (const entry of entries) {
    const { compteNum } = entry;
    const matches = ranges.some(r => compteNum.startsWith(r));
    if (!matches) continue;
    if (excludeRanges.some(ex => compteNum.startsWith(ex))) continue;

    // Pour 453*, grouper par CompAuxNum si demandé
    const key = groupByAux && entry.compAuxNum ? entry.compAuxNum : compteNum;
    const lib = groupByAux && entry.compAuxLib ? entry.compAuxLib : entry.compteLib;

    if (!byAccount[key]) {
      byAccount[key] = { compteNum: key, compteLib: lib, nbEcritures: 0, totalDebit: 0, totalCredit: 0, solde: 0 };
    }
    byAccount[key].nbEcritures++;
    byAccount[key].totalDebit += entry.debit;
    byAccount[key].totalCredit += entry.credit;
  }

  return Object.values(byAccount)
    .map(acc => ({
      ...acc,
      totalDebit: Math.round(acc.totalDebit * 100) / 100,
      totalCredit: Math.round(acc.totalCredit * 100) / 100,
      solde: Math.round(netSolde(acc.totalDebit, acc.totalCredit, type) * 100) / 100,
    }))
    .sort((a, b) => Math.abs(b.solde) - Math.abs(a.solde));
}

/**
 * Retourne les écritures d'un compte bilan avec solde running (débit − crédit).
 *
 * @param {string} compteNum
 * @param {Array} entries
 * @returns {EntryWithRunning[]}
 */
export function getEntriesForBilanAccount(compteNum, entries, type = 'charge') {
  const filtered = entries
    .filter(e => e.compteNum === compteNum)
    .sort((a, b) => a.ecritureDate - b.ecritureDate);

  let running = 0;
  return filtered.map(e => {
    running += netSolde(e.debit, e.credit, type);
    return {
      ecritureDate: e.ecritureDate,
      ecritureLib: e.ecritureLib,
      pieceRef: e.pieceRef,
      journalCode: e.journalCode,
      debit: e.debit,
      credit: e.credit,
      soldeCumule: Math.round(running * 100) / 100,
    };
  });
}

// ---------------------------------------------------------------------------
// Bilan et CR : résolution d'une ligne (racine affichée) → drill-down
// ---------------------------------------------------------------------------

// Préfixes des comptes d'amortissement / dépréciation par classe d'actif.
const AMORT_PREFIX_BY_CLASS = { '2': ['28', '29'], '3': ['39'], '4': ['49'], '5': ['59'] };

/** Dérive les racines d'amortissement/dépréciation d'une racine d'actif immobilisé ou circulant. */
function deriveAmortRanges(racine) {
  const prefixes = AMORT_PREFIX_BY_CLASS[racine[0]];
  if (!prefixes) return [];
  const rest = racine.slice(1);
  return prefixes.map(p => p + rest);
}

/**
 * Résout une ligne « de détail » de l'onglet Bilan et CR en paramètres de drill-down.
 *
 * Précondition (garantie côté UI par `isDrillableLine`) : `item.code` est une ou
 * plusieurs racines de compte numériques, éventuellement jointes par « + »
 * (ex. "267+268" → racines 267 et 268). Le montant est lu selon la vue :
 * `totalN` pour le compte de résultat, `netN` pour l'actif/passif.
 *
 * @param {object} item - Ligne de détail avec un `code` racine numérique (ou composite).
 * @param {'actif'|'passif'|'resultat'} view - Sous-vue d'origine.
 * @returns {{ racine:string, label:string, montant:number|null, ranges:string[], soldeType:'charge'|'product' }}
 */
export function buildBilanCRDrill(item, view) {
  const racine = String(item.code);
  const roots = racine.split('+').map(r => r.trim()).filter(Boolean);
  const montant = view === 'resultat' ? item.totalN : item.netN;
  const ranges = (view === 'actif' && item.amort)
    ? roots.flatMap(r => [r, ...deriveAmortRanges(r)])
    : roots;
  const soldeType = roots[0]?.startsWith('7') ? 'product' : 'charge';
  return { racine, label: item.label, montant, ranges, soldeType };
}
