/**
 * computeControles.js — contrôles de cohérence entre modules et comptes comptables.
 * Fonctions pures, aucune dépendance React.
 */
import { computeBalance } from './computeLivres';
import { getCapitalRestantDu } from './empruntsUtils';

const TOLERANCE_ECART = 0.01; // € — arrondi flottant, pas un vrai écart
const MESSAGE_NEUTRAL_AUCUNE_DONNEE = 'Aucune écriture trouvée sur les comptes concernés par ce contrôle.';

function sommeComptesRacine(balanceRows, prefix) {
  return balanceRows
    .filter((r) => r.rowType === 'compte' && r.compteNum.startsWith(prefix))
    .reduce((sum, r) => sum + (r.solde_credit - r.solde_debit), 0);
}

const CONTROLES_DEFINITIONS = [
  {
    id: 'capitalSocial_apports',
    categoryId: 'capitalSocial', categoryLabel: 'Capital social', categoryIcon: '🪙',
    label: 'Capital social = Apports adhérents',
    valueALabel: 'Cpt 10121000 (solde créditeur)',
    valueBLabel: 'Cpt 45620000 (solde débiteur)',
    compute: ({ balanceParCompte }) => ({
      valueA: balanceParCompte.get('10121000')?.solde_credit ?? 0,
      valueB: balanceParCompte.get('45620000')?.solde_debit ?? 0,
    }),
  },
  {
    id: 'emprunts_capitalRestantDu',
    categoryId: 'emprunts', categoryLabel: 'Emprunts', categoryIcon: '🏦',
    label: 'Capital restant dû = Soldes cptes 164',
    valueALabel: 'Widget Emprunts',
    valueBLabel: 'Cptes racine 164',
    requiresExportMulti: true,
    neutralMessage: "Chargez l'Export Multi (onglet Emprunts) pour activer ce contrôle",
    compute: ({ balanceRows, exploitationData }) => ({
      valueA: getCapitalRestantDu(exploitationData.emprunts, exploitationData.lignesEmprunt),
      valueB: sommeComptesRacine(balanceRows, '164'),
    }),
  },
  {
    id: 'comptable_equilibreBalance',
    categoryId: 'comptable', categoryLabel: 'Comptable', categoryIcon: '📐',
    label: 'Total débits balance = Total crédits',
    valueALabel: 'Total mvt débit',
    valueBLabel: 'Total mvt crédit',
    compute: ({ balanceRows }) => ({
      valueA: balanceRows.filter((r) => r.rowType === 'compte').reduce((s, r) => s + r.mvt_debit, 0),
      valueB: balanceRows.filter((r) => r.rowType === 'compte').reduce((s, r) => s + r.mvt_credit, 0),
    }),
  },
];

/**
 * @param {object|null} parsedFec
 * @param {object|null} exploitationData
 * @returns {Array<object>} liste des contrôles calculés (vide si pas de FEC)
 */
export function computeControles(parsedFec, exploitationData) {
  if (!parsedFec) return [];

  const balanceRows = computeBalance(parsedFec);
  const balanceParCompte = new Map(
    balanceRows.filter((r) => r.rowType === 'compte').map((r) => [r.compteNum, r])
  );

  return CONTROLES_DEFINITIONS.map((def) => {
    if (def.requiresExportMulti && !exploitationData) {
      return { ...def, status: 'neutral' };
    }

    const { valueA, valueB } = def.compute({ balanceRows, balanceParCompte, exploitationData });

    // Comptes attendus totalement absents du FEC (aucune écriture des deux côtés) :
    // un 0 == 0 ne veut rien dire ici, on le distingue d'un vrai équilibre constaté.
    if (valueA === 0 && valueB === 0) {
      return { ...def, valueA, valueB, ecart: 0, status: 'neutral', neutralMessage: MESSAGE_NEUTRAL_AUCUNE_DONNEE };
    }

    const ecart = Math.abs(valueA - valueB);
    return { ...def, valueA, valueB, ecart, status: ecart <= TOLERANCE_ECART ? 'ok' : 'ko' };
  });
}
