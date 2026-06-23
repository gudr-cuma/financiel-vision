/**
 * Calcule le Réalisé d'un poste budgétaire à partir du FEC actif.
 *
 * Réutilise les conventions de engine/computeSig.js :
 *   - écritures du journal ANC exclues
 *   - compteNum "commence par" une entrée de comptesMappes
 *   - produits : crédit − débit ; charges/invest : débit − crédit
 */

function accountMatchesPoste(compteNum, comptesMappes) {
  return comptesMappes.some(range => compteNum.startsWith(range));
}

/**
 * @param {import('../../engine/types').ParsedFEC|null} parsedFec
 * @param {{ nature: 'charge'|'produit'|'invest', comptesMappes: string[] }} poste
 * @returns {Array<{ periode: string, montant: number }>}
 */
export function realiseFromFec(parsedFec, poste) {
  if (!parsedFec || !poste.comptesMappes || poste.comptesMappes.length === 0) {
    return [];
  }

  const { entries, exerciceMonths } = parsedFec;

  const byMonth = {};
  for (const { month, year } of exerciceMonths) {
    byMonth[`${year}-${String(month).padStart(2, '0')}`] = { debit: 0, credit: 0 };
  }

  for (const entry of entries) {
    if (entry.journalCode === 'ANC') continue;
    if (!accountMatchesPoste(entry.compteNum, poste.comptesMappes)) continue;

    const y = entry.ecritureDate.getFullYear();
    const m = entry.ecritureDate.getMonth() + 1;
    const key = `${y}-${String(m).padStart(2, '0')}`;
    if (!byMonth[key]) continue;

    byMonth[key].debit += entry.debit;
    byMonth[key].credit += entry.credit;
  }

  return exerciceMonths.map(({ month, year }) => {
    const key = `${year}-${String(month).padStart(2, '0')}`;
    const { debit, credit } = byMonth[key];
    const montant = poste.nature === 'produit' ? credit - debit : debit - credit;
    return { periode: key, montant };
  });
}
