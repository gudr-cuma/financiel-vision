/**
 * Moteur de calcul de la trésorerie.
 *
 * Comptes de trésorerie : 51* (banques) + 53* (caisse)
 * ANC inclus — nécessaire pour le solde d'ouverture.
 *
 * Débit sur 51* = entrée d'argent (encaissement)
 * Crédit sur 51* = sortie d'argent (décaissement)
 */

/**
 * Calcule toutes les données trésorerie depuis le FEC parsé.
 *
 * @param {import('./types').ParsedFEC} parsedFec
 * @returns {TreasuryData}
 */
export function computeTreasury(parsedFec) {
  const { entries, exerciceStart, exerciceEnd, exerciceMonths } = parsedFec;

  const isTresorerie = compteNum =>
    compteNum.startsWith('51') || compteNum.startsWith('53');

  // Solde d'ouverture = écritures ANC sur comptes de trésorerie
  let soldeOuverture = 0;
  for (const entry of entries) {
    if (entry.journalCode === 'ANC' && isTresorerie(entry.compteNum)) {
      soldeOuverture += entry.debit - entry.credit;
    }
  }

  // Regrouper les mouvements hors-ANC par date (timestamp)
  const mouvementsParJour = new Map(); // timestamp → { entrees, sorties, details }

  for (const entry of entries) {
    if (entry.journalCode === 'ANC') continue;
    if (!isTresorerie(entry.compteNum)) continue;

    const ts = new Date(
      entry.ecritureDate.getFullYear(),
      entry.ecritureDate.getMonth(),
      entry.ecritureDate.getDate()
    ).getTime();

    if (!mouvementsParJour.has(ts)) {
      mouvementsParJour.set(ts, { entrees: 0, sorties: 0, details: [] });
    }
    const jour = mouvementsParJour.get(ts);
    jour.entrees += entry.debit;
    jour.sorties += entry.credit;
    jour.details.push({
      ecritureLib: entry.ecritureLib,
      pieceRef: entry.pieceRef,
      journalCode: entry.journalCode,
      compteNum: entry.compteNum,
      debit: entry.debit,
      credit: entry.credit,
    });
  }

  // Construire la courbe quotidienne sur toute la plage de l'exercice
  const startTs = new Date(
    exerciceStart.getFullYear(), exerciceStart.getMonth(), exerciceStart.getDate()
  ).getTime();
  const endTs = new Date(
    exerciceEnd.getFullYear(), exerciceEnd.getMonth(), exerciceEnd.getDate()
  ).getTime();

  const dailyCurve = [];
  let solde = soldeOuverture;
  let soldeMin = soldeOuverture;
  let soldeMax = soldeOuverture;
  let totalEntrees = 0;
  let totalSorties = 0;

  for (let ts = startTs; ts <= endTs; ts += 86400000) {
    const jour = mouvementsParJour.get(ts);
    const entrees = jour?.entrees ?? 0;
    const sorties = jour?.sorties ?? 0;
    solde += entrees - sorties;
    totalEntrees += entrees;
    totalSorties += sorties;

    if (solde < soldeMin) soldeMin = solde;
    if (solde > soldeMax) soldeMax = solde;

    dailyCurve.push({
      date: new Date(ts),
      solde: Math.round(solde * 100) / 100,
      entrees: Math.round(entrees * 100) / 100,
      sorties: Math.round(sorties * 100) / 100,
      nbMovements: jour?.details?.length ?? 0,
      lastDetail: jour?.details?.[jour.details.length - 1] ?? null,
    });
  }

  const soldeActuel = solde;

  // Moyenne mobile 7 jours
  const withMovingAvg = dailyCurve.map((day, i) => {
    const window = dailyCurve.slice(Math.max(0, i - 6), i + 1);
    const avg = window.reduce((s, d) => s + d.solde, 0) / window.length;
    return { ...day, moyenneMobile: Math.round(avg * 100) / 100 };
  });

  // Top 10 encaissements (plus gros débits individuels sur 51*/53*, hors ANC)
  const allEntrees = [];
  const allSorties = [];
  for (const entry of entries) {
    if (entry.journalCode === 'ANC') continue;
    if (!isTresorerie(entry.compteNum)) continue;
    if (entry.debit > 0) {
      allEntrees.push({
        date: entry.ecritureDate,
        ecritureLib: entry.ecritureLib,
        pieceRef: entry.pieceRef,
        montant: entry.debit,
        compteNum: entry.compteNum,
      });
    }
    if (entry.credit > 0) {
      allSorties.push({
        date: entry.ecritureDate,
        ecritureLib: entry.ecritureLib,
        pieceRef: entry.pieceRef,
        montant: entry.credit,
        compteNum: entry.compteNum,
      });
    }
  }

  const top10Entrees = allEntrees
    .sort((a, b) => b.montant - a.montant)
    .slice(0, 10);

  const top10Sorties = allSorties
    .sort((a, b) => b.montant - a.montant)
    .slice(0, 10);

  // Helpers de filtrage par période (relatif à l'exercice)
  function filterByPeriod(curve, period) {
    if (period === 'annee') return curve;
    const n = exerciceMonths.length; // 12
    if (period === 't1') return filterByMonthRange(curve, 0, 2);
    if (period === 't2') return filterByMonthRange(curve, 3, 5);
    if (period === 's1') return filterByMonthRange(curve, 0, 5);
    if (period === 's2') return filterByMonthRange(curve, 6, 11);
    return curve;
  }

  function filterByMonthRange(curve, startIdx, endIdx) {
    const startMonth = exerciceMonths[startIdx];
    const endMonth = exerciceMonths[endIdx];
    if (!startMonth || !endMonth) return curve;
    const from = new Date(startMonth.year, startMonth.month - 1, 1).getTime();
    const toDate = new Date(endMonth.year, endMonth.month, 0); // dernier jour du mois
    const to = toDate.getTime();
    return curve.filter(d => d.date.getTime() >= from && d.date.getTime() <= to);
  }

  return {
    soldeActuel: Math.round(soldeActuel * 100) / 100,
    soldeMini: Math.round(soldeMin * 100) / 100,
    soldeMaxi: Math.round(soldeMax * 100) / 100,
    totalEntrees: Math.round(totalEntrees * 100) / 100,
    totalSorties: Math.round(totalSorties * 100) / 100,
    soldeMoyen: dailyCurve.length > 0
      ? Math.round((dailyCurve.reduce((s, d) => s + d.solde, 0) / dailyCurve.length) * 100) / 100
      : 0,
    dailyCurve: withMovingAvg,
    top10Entrees,
    top10Sorties,
    filterByPeriod,
  };
}
