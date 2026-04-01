/**
 * Moteur de calcul de la structure des charges (E-08).
 *
 * 7 catégories PCG CUMA — ANC exclu.
 * Inclut les données mensuelles par catégorie.
 */

export const CHARGE_CATEGORIES = [
  {
    id: 'personnel',
    label: 'Personnel',
    ranges: ['64', '621'],
    excludeRanges: [],
    color: '#FF8200',
  },
  {
    id: 'services_ext',
    label: 'Services ext.',
    ranges: ['61', '62'],
    excludeRanges: ['621'],
    color: '#31B700',
  },
  {
    id: 'dotations',
    label: 'Dotations',
    ranges: ['68'],
    excludeRanges: [],
    color: '#00965E',
  },
  {
    id: 'achats',
    label: 'Achats',
    ranges: ['60'],
    excludeRanges: ['603'],
    color: '#93C90E',
  },
  {
    id: 'financieres',
    label: 'Financières',
    ranges: ['66'],
    excludeRanges: [],
    color: '#B1DCE2',
  },
  {
    id: 'impots_taxes',
    label: 'Impôts & taxes',
    ranges: ['63'],
    excludeRanges: [],
    color: '#E53935',
  },
  {
    id: 'autres_charges',
    label: 'Autres charges',
    ranges: ['65'],
    excludeRanges: [],
    color: '#718096',
  },
];

function accountMatchesCategory(compteNum, cat) {
  const matches = cat.ranges.some(r => compteNum.startsWith(r));
  if (!matches) return false;
  if (cat.excludeRanges?.length) {
    return !cat.excludeRanges.some(ex => compteNum.startsWith(ex));
  }
  return true;
}

/**
 * Calcule la répartition des charges par catégorie.
 *
 * @param {import('./types').ParsedFEC} parsedFec
 * @returns {ChargesData}
 */
export function computeCharges(parsedFec) {
  const { entries, exerciceMonths } = parsedFec;

  // Accumulateurs annuels par catégorie
  const annual = Object.fromEntries(
    CHARGE_CATEGORIES.map(c => [c.id, 0])
  );

  // Accumulateurs mensuels : { "YYYY-MM": { catId: montant } }
  const byMonth = {};
  for (const { month, year } of exerciceMonths) {
    const key = `${year}-${String(month).padStart(2, '0')}`;
    byMonth[key] = Object.fromEntries(CHARGE_CATEGORIES.map(c => [c.id, 0]));
  }

  for (const entry of entries) {
    if (entry.journalCode === 'ANC') continue;

    for (const cat of CHARGE_CATEGORIES) {
      if (!accountMatchesCategory(entry.compteNum, cat)) continue;

      const net = entry.debit - entry.credit;
      annual[cat.id] += net;

      const y = entry.ecritureDate.getFullYear();
      const m = entry.ecritureDate.getMonth() + 1;
      const key = `${y}-${String(m).padStart(2, '0')}`;
      if (byMonth[key]) {
        byMonth[key][cat.id] += net;
      }
    }
  }

  const totalCharges = Object.values(annual).reduce((s, v) => s + v, 0);

  const categories = CHARGE_CATEGORIES.map(cat => ({
    id: cat.id,
    label: cat.label,
    color: cat.color,
    montant: Math.round(annual[cat.id] * 100) / 100,
    percent: totalCharges > 0 ? (annual[cat.id] / totalCharges) * 100 : 0,
  })).filter(c => c.montant > 0); // masquer les catégories à zéro

  // Données mensuelles par catégorie (pour ChargesMonthlyChart)
  const monthly = exerciceMonths.map(({ month, year, label, shortLabel }) => {
    const key = `${year}-${String(month).padStart(2, '0')}`;
    const acc = byMonth[key] ?? {};
    const row = { month, year, label, shortLabel };
    for (const cat of CHARGE_CATEGORIES) {
      row[cat.id] = Math.round((acc[cat.id] ?? 0) * 100) / 100;
    }
    return row;
  });

  return {
    categories,
    totalCharges: Math.round(totalCharges * 100) / 100,
    monthly,
  };
}
