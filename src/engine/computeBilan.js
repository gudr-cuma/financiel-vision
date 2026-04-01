/**
 * Moteur de calcul du bilan simplifié PCG CUMA.
 *
 * ANC inclus — les soldes d'ouverture font partie du bilan.
 * Règle générale : solde d'un compte = Σ(débit) − Σ(crédit)
 *
 * Spécificité CUMA — Compte 453* :
 *   Solde net global → si débiteur : Actif circulant "Créances adhérents nettes"
 *                     si créditeur : Passif dettes "Dettes adhérents"
 *
 * Régularisations 486x/487x : même logique (par compte, selon signe du solde net).
 */

// ---------------------------------------------------------------------------
// Mapping bilan PCG CUMA
// ---------------------------------------------------------------------------

// Structure de calcul : chaque poste déclare ses ranges de comptes.
// Le solde net (débit − crédit) est calculé, puis classé en actif ou passif
// selon les règles comptables (comptes de passif : solde créditeur normal).

const BILAN_MAPPING = {
  actif: {
    immobilise: {
      label: 'Actif immobilisé',
      postes: [
        {
          id: 'immob_incorporelles',
          label: 'Immob. incorporelles & financières',
          ranges: ['20', '26', '27', '280', '290', '296', '297'],
          sign: 1, // solde débiteur = actif ; 28x/29x ont solde créditeur → soustraction automatique
        },
        {
          id: 'immob_corporelles',
          label: 'Immob. corporelles nettes',
          ranges: ['21', '22', '23', '281', '282', '283', '284', '285', '286', '287', '288'],
          sign: 1, // 281x/282x ont solde créditeur → amortissements soustraits automatiquement
        },
        {
          id: 'immob_financieres',
          label: 'Immob. financières (autres)',
          ranges: ['25', '291', '293', '295'],
          sign: 1,
        },
      ],
    },
    circulant: {
      label: 'Actif circulant',
      postes: [
        {
          id: 'stocks',
          label: 'Stocks & en-cours',
          ranges: ['3'],
          sign: 1,
        },
        {
          id: 'creances_adherents',
          label: 'Créances adhérents nettes',
          ranges: ['45', '495'], // 45x brut + dépréciations 495x (crédit → soustraction auto)
          sign: 1,
          isDynamic: true, // classé selon solde net global
        },
        {
          id: 'creances_exploitation',
          label: 'Créances d\'exploitation',
          ranges: ['409', '41', '491'], // 41x clients + avances fournisseurs + dépréciations 491
          sign: 1,
        },
        {
          id: 'creances_fiscales',
          label: 'Créances fiscales & État',
          ranges: ['44'],
          sign: 1,
          onlyDebiteur: true, // uniquement si solde débiteur
        },
        {
          id: 'autres_creances',
          label: 'Autres créances & comptes courants',
          ranges: ['46', '47'],
          sign: 1,
          onlyDebiteur: true,
        },
        {
          id: 'regularisations_actif',
          label: 'Régularisations actif',
          ranges: ['486', '487'],
          sign: 1,
          onlyDebiteur: true,
        },
        {
          id: 'disponibilites',
          label: 'Disponibilités & VMP',
          ranges: ['50', '51', '53'],
          sign: 1,
        },
      ],
    },
  },
  passif: {
    capitaux_propres: {
      label: 'Capitaux propres',
      postes: [
        {
          id: 'capital_social',
          label: 'Capital social (parts sociales)',
          ranges: ['101', '102', '103', '104'],
          sign: -1, // solde créditeur = passif → on prend −(débit−crédit)
        },
        {
          id: 'reserves_legales',
          label: 'Primes & réserves légales',
          ranges: ['1051'],
          sign: -1,
        },
        {
          id: 'autres_reserves',
          label: 'Autres réserves & report',
          ranges: ['106', '11'],
          sign: -1,
        },
        {
          id: 'resultat_exercice',
          label: 'Résultat de l\'exercice',
          ranges: ['12'],
          sign: -1,
        },
        {
          id: 'subventions_invest',
          label: 'Subventions d\'investissement',
          ranges: ['13'],
          sign: -1,
        },
      ],
    },
    dettes: {
      label: 'Dettes',
      postes: [
        {
          id: 'emprunts',
          label: 'Emprunts & dettes financières',
          ranges: ['16'],
          sign: -1,
        },
        {
          id: 'provisions',
          label: 'Provisions pour risques & charges',
          ranges: ['15'],
          sign: -1,
        },
        {
          id: 'dettes_adherents',
          label: 'Dettes adhérents',
          ranges: ['45'], // 45x global — classé selon solde net
          sign: -1,
          isDynamic: true,
        },
        {
          id: 'dettes_fournisseurs',
          label: 'Dettes fournisseurs',
          ranges: ['40'],
          excludeRanges: ['409'], // 409 = fournisseurs débiteurs → classé en actif
          sign: -1,
        },
        {
          id: 'dettes_sociales',
          label: 'Dettes sociales',
          ranges: ['42', '43'],
          sign: -1,
        },
        {
          id: 'dettes_fiscales',
          label: 'Dettes fiscales',
          ranges: ['44'],
          sign: -1,
          onlyCreancier: true, // uniquement si solde créditeur
        },
        {
          id: 'autres_dettes',
          label: 'Autres dettes',
          ranges: ['46', '47'], // 45x géré dynamiquement ci-dessus
          sign: -1,
          onlyCreancier: true,
        },
        {
          id: 'regularisations_passif',
          label: 'Régularisations passif',
          ranges: ['486', '487'],
          sign: -1,
          onlyCreancier: true,
        },
      ],
    },
  },
};

// ---------------------------------------------------------------------------
// Export lookup id → ranges (pour affichage dans l'UI)
// ---------------------------------------------------------------------------
export const BILAN_RANGES_BY_ID = Object.fromEntries(
  [...Object.values(BILAN_MAPPING.actif), ...Object.values(BILAN_MAPPING.passif)]
    .flatMap(section => section.postes ?? [])
    .map(p => [p.id, {
      ranges: p.ranges.map(r => `${r}*`),
      excludeRanges: (p.excludeRanges ?? []).map(r => `${r}*`),
    }])
);

// ---------------------------------------------------------------------------
// Calcul des soldes par range de comptes
// ---------------------------------------------------------------------------

function buildSoldesParCompte(entries) {
  const soldes = {}; // compteNum → { debit, credit }
  for (const entry of entries) {
    if (!soldes[entry.compteNum]) {
      soldes[entry.compteNum] = { debit: 0, credit: 0 };
    }
    soldes[entry.compteNum].debit += entry.debit;
    soldes[entry.compteNum].credit += entry.credit;
  }
  return soldes;
}

function sumRange(soldesParCompte, ranges, excludeRanges = []) {
  let total = 0;
  for (const [compteNum, { debit, credit }] of Object.entries(soldesParCompte)) {
    if (!ranges.some(r => compteNum.startsWith(r))) continue;
    if (excludeRanges.some(ex => compteNum.startsWith(ex))) continue;
    total += debit - credit;
  }
  return total;
}

// ---------------------------------------------------------------------------
// Calcul principal
// ---------------------------------------------------------------------------

/**
 * @param {import('./types').ParsedFEC} parsedFec
 * @returns {BilanData}
 */
export function computeBilan(parsedFec) {
  const { entries } = parsedFec;
  const soldesParCompte = buildSoldesParCompte(entries);

  // Solde net global 45* (pour classification actif/passif adhérents)
  const solde45Net = sumRange(soldesParCompte, ['45']);
  // Solde positif → débiteur → créances adhérents (actif)
  // Solde négatif → créditeur → dettes adhérents (passif)
  const adherentsEnActif = solde45Net >= 0;

  function calcPoste(poste) {
    // Poste dynamique 453* : classé selon solde net
    if (poste.isDynamic) {
      if (poste.id === 'creances_adherents' && !adherentsEnActif) return 0;
      if (poste.id === 'dettes_adherents' && adherentsEnActif) return 0;
    }

    let rawSolde = sumRange(soldesParCompte, poste.ranges, poste.excludeRanges ?? []);

    // Appliquer le signe (actif = +solde débiteur, passif = −solde débiteur = solde créditeur)
    let montant = rawSolde * poste.sign;

    // Filtres onlyDebiteur / onlyCreancier (ex : comptes 44* qui peuvent être des deux côtés)
    if (poste.onlyDebiteur && montant < 0) montant = 0;
    if (poste.onlyCreancier && montant < 0) montant = 0;

    return Math.round(montant * 100) / 100;
  }

  function calcSection(section) {
    const result = {};
    let sousTotal = 0;
    for (const poste of section.postes) {
      const montant = calcPoste(poste);
      result[poste.id] = { id: poste.id, label: poste.label, montant };
      // Inclure les montants négatifs (ex : amortissements intégrés dans le poste actif)
      sousTotal += montant;
    }
    result._sousTotal = Math.round(sousTotal * 100) / 100;
    result._label = section.label;
    return result;
  }

  const actifImmobilise = calcSection(BILAN_MAPPING.actif.immobilise);
  const actifCirculant = calcSection(BILAN_MAPPING.actif.circulant);
  const capitauxPropres = calcSection(BILAN_MAPPING.passif.capitaux_propres);
  const dettes = calcSection(BILAN_MAPPING.passif.dettes);

  const totalActif = actifImmobilise._sousTotal + actifCirculant._sousTotal;
  const totalPassif = capitauxPropres._sousTotal + dettes._sousTotal;
  const ecartBilan = Math.round((totalActif - totalPassif) * 100) / 100;
  const bilanEquilibre = Math.abs(ecartBilan) < 1; // tolérance 1 €

  // Ratios bilanciels
  const cpMontant = capitauxPropres._sousTotal;
  const dettesMlt = sumRange(soldesParCompte, ['16']) * -1; // solde créditeur → positif
  const dettesMltPositif = Math.max(0, Math.round(dettesMlt * 100) / 100);
  const dettesCt = Math.max(0, dettes._sousTotal - dettesMltPositif);
  const stocks = actifCirculant['stocks']?.montant ?? 0;
  const creances = (actifCirculant['creances_adherents']?.montant ?? 0)
    + (actifCirculant['creances_exploitation']?.montant ?? 0)
    + (actifCirculant['creances_fiscales']?.montant ?? 0)
    + (actifCirculant['autres_creances']?.montant ?? 0);

  const fondsRoulement = (cpMontant + dettesMltPositif) - actifImmobilise._sousTotal;
  const bfr = (stocks + creances) - dettesCt;
  const autonomieFinanciere = totalPassif > 0 ? (cpMontant / totalPassif) * 100 : 0;
  const liquiditeGenerale = dettesCt > 0 ? actifCirculant._sousTotal / dettesCt : null;

  function ratioStatus(value, seuils) {
    if (value === null || !isFinite(value)) return 'neutral';
    if (value >= seuils.vert) return 'green';
    if (value >= seuils.orange) return 'orange';
    return 'red';
  }

  const ratios = {
    fondsRoulement: {
      label: 'Fonds de Roulement',
      value: Math.round(fondsRoulement * 100) / 100,
      unit: 'eur',
      formula: '(Capitaux propres + Dettes MLT) − Actif immobilisé',
      status: fondsRoulement >= 0 ? 'green' : 'red',
    },
    bfr: {
      label: 'Besoin en FR (BFR)',
      value: Math.round(bfr * 100) / 100,
      unit: 'eur',
      formula: '(Stocks + Créances) − Dettes CT',
      status: bfr <= 0 ? 'green' : bfr <= fondsRoulement ? 'orange' : 'red',
    },
    autonomieFinanciere: {
      label: 'Autonomie financière',
      value: Math.round(autonomieFinanciere * 10) / 10,
      unit: 'percent',
      formula: 'Capitaux propres / Total passif × 100',
      status: ratioStatus(autonomieFinanciere, { vert: 50, orange: 30 }),
    },
    liquiditeGenerale: {
      label: 'Liquidité générale',
      value: liquiditeGenerale !== null ? Math.round(liquiditeGenerale * 100) / 100 : null,
      unit: 'ratio',
      formula: 'Actif circulant / Dettes CT',
      status: ratioStatus(liquiditeGenerale, { vert: 1.5, orange: 1 }),
    },
  };

  // Valeur brute des matériels (21x+22x+23x sans amortissements)
  const valeurBruteMateriels = Math.round(
    Math.max(0, sumRange(soldesParCompte, ['21', '22', '23'])) * 100
  ) / 100;

  return {
    actifImmobilise,
    actifCirculant,
    capitauxPropres,
    dettes,
    totalActif: Math.round(totalActif * 100) / 100,
    totalPassif: Math.round(totalPassif * 100) / 100,
    ecartBilan,
    bilanEquilibre,
    adherentsEnActif,
    ratios,
    valeurBruteMateriels,
  };
}
