/**
 * Moteur de calcul des Soldes Intermédiaires de Gestion (SIG)
 * selon le Plan Comptable des Coopératives Agricoles (PCG CUMA).
 *
 * Produit en une seule passe :
 *   - Les totaux annuels par poste SIG
 *   - Les données mensuelles (MonthlyData[]) dans l'ordre de l'exercice
 *
 * Règles critiques :
 *   - Écritures ANC (à-nouveau) EXCLUES du SIG
 *   - Produits (classe 7) : montant = Σ(crédit) − Σ(débit)
 *   - Charges (classe 6) : montant = Σ(débit) − Σ(crédit)
 */

// ---------------------------------------------------------------------------
// Mapping SIG PCG CUMA
// ---------------------------------------------------------------------------

export const SIG_MAPPING = [
  {
    id: 'chiffre_affaires',
    label: 'Chiffre d\'affaires',
    prefix: null,
    isTotal: false,
    accounts: [
      { range: '701' }, { range: '702' }, { range: '703' },
      { range: '704' }, { range: '705' }, { range: '706' },
      { range: '707' }, { range: '708' },
      // 709* exclus (rabais, remises)
    ],
    type: 'product',
  },
  {
    id: 'production_stockee',
    label: 'Prod. stockée / déstockage',
    prefix: '+',
    isTotal: false,
    accounts: [{ range: '713' }],
    type: 'product',
  },
  {
    id: 'subventions_exploitation',
    label: 'Subventions d\'exploitation',
    prefix: '+',
    isTotal: false,
    accounts: [{ range: '74' }],
    type: 'product',
  },
  {
    id: 'achats_consommes',
    label: 'Achats consommés nets',
    prefix: '−',
    isTotal: false,
    accounts: [
      { range: '601' }, { range: '602' }, { range: '603' },
      { range: '604' }, { range: '605' }, { range: '606' },
      { range: '607' },
    ],
    type: 'charge',
  },
  {
    id: 'marge_brute',
    label: 'Marge brute',
    prefix: '=',
    isTotal: true,
    computed: ['chiffre_affaires', '+production_stockee', '+subventions_exploitation', '-achats_consommes'],
  },
  {
    id: 'services_exterieurs',
    label: 'Services extérieurs',
    prefix: '−',
    isTotal: false,
    accounts: [{ range: '61' }, { range: '62' }],
    excludeRanges: ['621'],
    type: 'charge',
  },
  {
    id: 'valeur_ajoutee',
    label: 'Valeur Ajoutée',
    prefix: '=',
    isTotal: true,
    computed: ['marge_brute', '-services_exterieurs'],
  },
  {
    id: 'charges_personnel',
    label: 'Charges de personnel',
    prefix: '−',
    isTotal: false,
    accounts: [{ range: '64' }, { range: '621' }],
    type: 'charge',
  },
  {
    id: 'impots_taxes',
    label: 'Impôts & taxes (exploit.)',
    prefix: '−',
    isTotal: false,
    accounts: [{ range: '63' }],
    type: 'charge',
  },
  {
    id: 'ebe',
    label: 'EBE (Excédent Brut d\'Exploitation)',
    prefix: '=',
    isTotal: true,
    computed: ['valeur_ajoutee', '-charges_personnel', '-impots_taxes'],
  },
  {
    id: 'dotations',
    label: 'Dotations amortissements',
    prefix: '−',
    isTotal: false,
    accounts: [{ range: '681' }, { range: '686' }],
    type: 'charge',
  },
  {
    id: 'reprises',
    label: 'Reprises',
    prefix: '+',
    isTotal: false,
    accounts: [{ range: '781' }, { range: '786' }],
    type: 'product',
  },
  {
    id: 'autres_produits_gestion',
    label: 'Autres produits gestion',
    prefix: '+',
    isTotal: false,
    accounts: [{ range: '75' }],
    type: 'product',
  },
  {
    id: 'autres_charges_gestion',
    label: 'Autres charges gestion',
    prefix: '−',
    isTotal: false,
    accounts: [{ range: '65' }],
    type: 'charge',
  },
  {
    id: 'resultat_exploitation',
    label: 'Résultat d\'Exploitation',
    prefix: '=',
    isTotal: true,
    computed: ['ebe', '-dotations', '+reprises', '+autres_produits_gestion', '-autres_charges_gestion'],
  },
  {
    id: 'produits_financiers',
    label: 'Produits financiers',
    prefix: '+',
    isTotal: false,
    accounts: [{ range: '76' }],
    type: 'product',
  },
  {
    id: 'charges_financieres',
    label: 'Charges financières',
    prefix: '−',
    isTotal: false,
    accounts: [{ range: '66' }],
    type: 'charge',
  },
  {
    id: 'resultat_financier',
    label: 'Résultat financier',
    prefix: '=',
    isTotal: true,
    computed: ['+produits_financiers', '-charges_financieres'],
  },
  {
    id: 'resultat_courant',
    label: 'Résultat courant avant IS',
    prefix: '=',
    isTotal: true,
    computed: ['resultat_exploitation', '+resultat_financier'],
  },
  {
    id: 'produits_exceptionnels',
    label: 'Produits exceptionnels',
    prefix: '+',
    isTotal: false,
    accounts: [{ range: '77' }],
    type: 'product',
  },
  {
    id: 'charges_exceptionnelles',
    label: 'Charges exceptionnelles',
    prefix: '−',
    isTotal: false,
    accounts: [{ range: '67' }],
    type: 'charge',
  },
  {
    id: 'resultat_exceptionnel',
    label: 'Résultat exceptionnel',
    prefix: '=',
    isTotal: true,
    computed: ['+produits_exceptionnels', '-charges_exceptionnelles'],
  },
  {
    id: 'is_participation',
    label: 'IS & participation',
    prefix: '−',
    isTotal: false,
    accounts: [{ range: '69' }],
    type: 'charge',
  },
  {
    id: 'resultat_net',
    label: 'RÉSULTAT NET',
    prefix: '=',
    isTotal: true,
    computed: ['resultat_courant', '+resultat_exceptionnel', '-is_participation'],
  },
];

// Index pour accès rapide par id
const SIG_BY_ID = Object.fromEntries(SIG_MAPPING.map(p => [p.id, p]));

// ---------------------------------------------------------------------------
// Helpers d'affectation de compte
// ---------------------------------------------------------------------------

function accountMatchesPoste(compteNum, poste) {
  if (poste.isTotal) return false;
  const matchesRange = poste.accounts.some(a => compteNum.startsWith(a.range));
  if (!matchesRange) return false;
  if (poste.excludeRanges) {
    return !poste.excludeRanges.some(ex => compteNum.startsWith(ex));
  }
  return true;
}

// ---------------------------------------------------------------------------
// Calcul des totaux computed (cascade SIG)
// ---------------------------------------------------------------------------

function computeTotals(rawAmounts) {
  const amounts = { ...rawAmounts };

  for (const poste of SIG_MAPPING) {
    if (!poste.isTotal) continue;

    let total = 0;
    for (const term of poste.computed) {
      let sign = 1;
      let id = term;
      if (term.startsWith('+')) { sign = 1; id = term.slice(1); }
      else if (term.startsWith('-')) { sign = -1; id = term.slice(1); }
      total += sign * (amounts[id] ?? 0);
    }
    amounts[poste.id] = total;
  }

  return amounts;
}

// ---------------------------------------------------------------------------
// Calcul principal
// ---------------------------------------------------------------------------

/**
 * Calcule le SIG annuel et les données mensuelles en une seule passe.
 *
 * @param {import('./types').ParsedFEC} parsedFec
 * @returns {{ lines: SIGLine[], monthly: MonthlyData[], caTotal: number }}
 */
export function computeSig(parsedFec) {
  const { entries, exerciceMonths } = parsedFec;

  // Accumulateurs annuels : { postoId: { debit, credit } }
  const annual = {};
  // Accumulateurs mensuels : { "YYYY-MM": { postoId: { debit, credit } } }
  const byMonth = {};

  // Initialiser les accumulateurs pour les postes non-totaux
  for (const poste of SIG_MAPPING) {
    if (!poste.isTotal) {
      annual[poste.id] = { debit: 0, credit: 0 };
    }
  }

  // Initialiser les mois de l'exercice
  for (const { month, year } of exerciceMonths) {
    const key = `${year}-${String(month).padStart(2, '0')}`;
    byMonth[key] = {};
    for (const poste of SIG_MAPPING) {
      if (!poste.isTotal) {
        byMonth[key][poste.id] = { debit: 0, credit: 0 };
      }
    }
  }

  // Passe unique sur les écritures
  for (const entry of entries) {
    // Exclure les ANC du SIG
    if (entry.journalCode === 'ANC') continue;

    const { compteNum, debit, credit, ecritureDate } = entry;

    // Clé mensuelle
    const y = ecritureDate.getFullYear();
    const m = ecritureDate.getMonth() + 1;
    const monthKey = `${y}-${String(m).padStart(2, '0')}`;

    // Affecter à chaque poste correspondant
    for (const poste of SIG_MAPPING) {
      if (!accountMatchesPoste(compteNum, poste)) continue;

      annual[poste.id].debit += debit;
      annual[poste.id].credit += credit;

      if (byMonth[monthKey]) {
        byMonth[monthKey][poste.id].debit += debit;
        byMonth[monthKey][poste.id].credit += credit;
      }
    }
  }

  // Convertir en montants nets (produits : crédit−débit, charges : débit−crédit)
  function toAmount(poste, acc) {
    const { debit, credit } = acc[poste.id] ?? { debit: 0, credit: 0 };
    return poste.type === 'product' ? credit - debit : debit - credit;
  }

  // Montants annuels bruts (avant cascade)
  const rawAnnual = {};
  for (const poste of SIG_MAPPING) {
    if (!poste.isTotal) rawAnnual[poste.id] = toAmount(poste, annual);
  }
  const annualAmounts = computeTotals(rawAnnual);

  const caTotal = annualAmounts['chiffre_affaires'] ?? 0;

  // Construire les lignes SIG finales
  const lines = SIG_MAPPING.map(poste => ({
    id: poste.id,
    label: poste.label,
    prefix: poste.prefix,
    isTotal: poste.isTotal,
    amount: Math.round(annualAmounts[poste.id] ?? 0),
    percentCa: caTotal !== 0 ? ((annualAmounts[poste.id] ?? 0) / caTotal) * 100 : 0,
    accountRanges: poste.accounts?.map(a => `${a.range}*`) ?? [],
  }));

  // Construire les données mensuelles dans l'ordre de l'exercice
  const monthly = exerciceMonths.map(({ month, year, label, shortLabel }) => {
    const key = `${year}-${String(month).padStart(2, '0')}`;
    const acc = byMonth[key] ?? {};

    const rawMonth = {};
    for (const poste of SIG_MAPPING) {
      if (!poste.isTotal) {
        const { debit = 0, credit = 0 } = acc[poste.id] ?? {};
        rawMonth[poste.id] = poste.type === 'product' ? credit - debit : debit - credit;
      }
    }
    const mAmounts = computeTotals(rawMonth);

    const mCa = mAmounts['chiffre_affaires'] ?? 0;
    const mEbe = mAmounts['ebe'] ?? 0;
    const mMb = mAmounts['marge_brute'] ?? 0;
    const mRex = mAmounts['resultat_exploitation'] ?? 0;
    const mNet = mAmounts['resultat_net'] ?? 0;
    const mPersonnel = mAmounts['charges_personnel'] ?? 0;

    return {
      month,
      year,
      label,
      shortLabel,
      ca: Math.round(mCa),
      margeBrute: Math.round(mMb),
      valeurAjoutee: Math.round(mAmounts['valeur_ajoutee'] ?? 0),
      ebe: Math.round(mEbe),
      rex: Math.round(mRex),
      resultatNet: Math.round(mNet),
      chargesPersonnel: Math.round(mPersonnel),
      percentMarge: mCa !== 0 ? (mMb / mCa) * 100 : 0,
      percentEbeCa: mCa !== 0 ? (mEbe / mCa) * 100 : 0,
      percentRexCa: mCa !== 0 ? (mRex / mCa) * 100 : 0,
      ratioCaMasseSalariale: mPersonnel !== 0 ? mCa / mPersonnel : 0,
    };
  });

  return { lines, monthly, caTotal: Math.round(caTotal) };
}
