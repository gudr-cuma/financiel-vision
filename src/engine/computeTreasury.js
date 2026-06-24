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

  // Avance jour calendaire par jour calendaire (et non +86400000ms) : un
  // incrément en millisecondes désynchronise le pointeur du calendrier local
  // aux passages heure d'été/hiver (jour de 23h ou 25h), faisant manquer ou
  // dupliquer les clés de `mouvementsParJour` sur plusieurs mois.
  for (
    let cursor = new Date(startTs);
    cursor.getTime() <= endTs;
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1)
  ) {
    const ts = cursor.getTime();
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

/**
 * Liste des écritures de trésorerie (hors ANC) pour les comptes sélectionnés,
 * avec solde cumulé calculé indépendamment par compte (amorcé par le solde
 * d'ouverture ANC de ce compte). Sert à afficher le détail des écritures qui
 * alimentent la courbe de trésorerie.
 *
 * @param {import('./types').ParsedFEC} parsedFec
 * @param {string[]} compteNums - Comptes à inclure (ex. ['51211000', '53100000'])
 * @returns {Array<{ecritureDate: Date, journalCode: string, journalLib: string,
 *   compteNum: string, compteLib: string, ecritureLib: string, pieceRef: string,
 *   debit: number, credit: number, soldeCumule: number}>}
 */
export function getTreasuryEntries(parsedFec, compteNums) {
  const selected = new Set(compteNums);
  const { entries } = parsedFec;

  const ouvertureParCompte = new Map();
  const mouvementsParCompte = new Map();

  for (const entry of entries) {
    if (!selected.has(entry.compteNum)) continue;

    if (entry.journalCode === 'ANC') {
      const prev = ouvertureParCompte.get(entry.compteNum) ?? 0;
      ouvertureParCompte.set(entry.compteNum, prev + entry.debit - entry.credit);
      continue;
    }

    if (!mouvementsParCompte.has(entry.compteNum)) {
      mouvementsParCompte.set(entry.compteNum, []);
    }
    mouvementsParCompte.get(entry.compteNum).push(entry);
  }

  const result = [];
  for (const [compteNum, mouvements] of mouvementsParCompte) {
    mouvements.sort((a, b) => a.ecritureDate - b.ecritureDate);
    let running = ouvertureParCompte.get(compteNum) ?? 0;
    for (const entry of mouvements) {
      running += entry.debit - entry.credit;
      result.push({
        ecritureDate: entry.ecritureDate,
        journalCode: entry.journalCode,
        journalLib: entry.journalLib,
        compteNum: entry.compteNum,
        compteLib: entry.compteLib,
        ecritureLib: entry.ecritureLib,
        pieceRef: entry.pieceRef,
        debit: entry.debit,
        credit: entry.credit,
        soldeCumule: Math.round(running * 100) / 100,
      });
    }
  }

  return result;
}

const MONTHS_FR_SHORT = [
  'Janv', 'Févr', 'Mars', 'Avr', 'Mai', 'Juin',
  'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc',
];

function sumBucket(days) {
  const last = days[days.length - 1];
  return {
    entrees: Math.round(days.reduce((s, d) => s + d.entrees, 0) * 100) / 100,
    sorties: Math.round(days.reduce((s, d) => s + d.sorties, 0) * 100) / 100,
    solde: last.solde,
    startDate: days[0].date,
    endDate: last.date,
  };
}

function chunkArray(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// Regroupe la courbe quotidienne par mois calendaire, en conservant l'ordre
// chronologique de l'exercice (gère naturellement les exercices décalés).
function bucketByMonth(dailyCurve) {
  const buckets = [];
  let current = null;
  let currentKey = null;
  for (const day of dailyCurve) {
    const key = `${day.date.getFullYear()}-${day.date.getMonth()}`;
    if (key !== currentKey) {
      if (current) buckets.push(current);
      current = [];
      currentKey = key;
    }
    current.push(day);
  }
  if (current && current.length) buckets.push(current);
  return buckets;
}

/**
 * Agrège la courbe quotidienne de trésorerie par semaine, mois, trimestre ou
 * semestre, pour l'affichage en histogramme (encaissements/décaissements +
 * solde de clôture de la période).
 *
 * @param {Array} dailyCurve - `treasuryData.dailyCurve` (ordonné chronologiquement)
 * @param {'semaine'|'mois'|'trimestre'|'semestre'} granularity
 * @returns {Array<{label: string, entrees: number, sorties: number, solde: number,
 *   startDate: Date, endDate: Date}>}
 */
export function aggregateTreasuryByGranularity(dailyCurve, granularity) {
  if (!dailyCurve || dailyCurve.length === 0) return [];

  if (granularity === 'semaine') {
    return chunkArray(dailyCurve, 7).map((days, i) => ({
      label: `S${i + 1}`,
      ...sumBucket(days),
    }));
  }

  const monthGroups = bucketByMonth(dailyCurve);

  if (granularity === 'mois') {
    return monthGroups.map((days) => {
      const d0 = days[0].date;
      return {
        label: `${MONTHS_FR_SHORT[d0.getMonth()]} ${String(d0.getFullYear()).slice(2)}`,
        ...sumBucket(days),
      };
    });
  }

  if (granularity === 'trimestre') {
    return chunkArray(monthGroups, 3).map((group, i) => ({
      label: `T${i + 1}`,
      ...sumBucket(group.flat()),
    }));
  }

  if (granularity === 'semestre') {
    return chunkArray(monthGroups, 6).map((group, i) => ({
      label: `Semestre ${i + 1}`,
      ...sumBucket(group.flat()),
    }));
  }

  return [];
}
