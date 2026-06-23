/**
 * Drill-down poste budgétaire → comptes → écritures.
 * Variante générique de engine/drillDown.js, paramétrée par poste budgétaire
 * (comptesMappes/nature) plutôt que par un id SIG fixe.
 */

function netSolde(debit, credit, nature) {
  return nature === 'produit' ? credit - debit : debit - credit;
}

function accountMatchesPoste(compteNum, comptesMappes) {
  return comptesMappes.some(range => compteNum.startsWith(range));
}

/**
 * @param {{ nature: string, comptesMappes: string[] }} poste
 * @param {Array} entries
 * @returns {Array<{ compteNum, compteLib, nbEcritures, totalDebit, totalCredit, solde }>}
 */
export function getAccountsForPoste(poste, entries) {
  if (!poste.comptesMappes || poste.comptesMappes.length === 0) return [];

  const byAccount = {};
  for (const entry of entries) {
    if (entry.journalCode === 'ANC') continue;
    if (!accountMatchesPoste(entry.compteNum, poste.comptesMappes)) continue;

    if (!byAccount[entry.compteNum]) {
      byAccount[entry.compteNum] = {
        compteNum: entry.compteNum,
        compteLib: entry.compteLib,
        nbEcritures: 0,
        totalDebit: 0,
        totalCredit: 0,
      };
    }
    byAccount[entry.compteNum].nbEcritures++;
    byAccount[entry.compteNum].totalDebit += entry.debit;
    byAccount[entry.compteNum].totalCredit += entry.credit;
  }

  return Object.values(byAccount)
    .map(acc => ({
      ...acc,
      totalDebit: Math.round(acc.totalDebit * 100) / 100,
      totalCredit: Math.round(acc.totalCredit * 100) / 100,
      solde: Math.round(netSolde(acc.totalDebit, acc.totalCredit, poste.nature) * 100) / 100,
    }))
    .sort((a, b) => Math.abs(b.solde) - Math.abs(a.solde));
}

/**
 * @param {string} compteNum
 * @param {{ nature: string }} poste
 * @param {Array} entries
 * @returns {Array<{ ecritureDate, ecritureLib, pieceRef, journalCode, debit, credit, soldeCumule }>}
 */
export function getEntriesForAccount(compteNum, poste, entries) {
  const filtered = entries
    .filter(e => e.journalCode !== 'ANC' && e.compteNum === compteNum)
    .sort((a, b) => a.ecritureDate - b.ecritureDate);

  let running = 0;
  return filtered.map(e => {
    running += netSolde(e.debit, e.credit, poste.nature);
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
