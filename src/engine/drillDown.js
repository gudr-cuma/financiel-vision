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
  const { excludeRanges = [], groupByAux = false } = options;
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
      solde: Math.round((acc.totalDebit - acc.totalCredit) * 100) / 100,
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
export function getEntriesForBilanAccount(compteNum, entries) {
  const filtered = entries
    .filter(e => e.compteNum === compteNum)
    .sort((a, b) => a.ecritureDate - b.ecritureDate);

  let running = 0;
  return filtered.map(e => {
    running += e.debit - e.credit;
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
