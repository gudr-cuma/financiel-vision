/**
 * Règles de calcul du module Suivi Budgétaire.
 * Fonctions pures, sans dépendance React — voir §8 du cadrage.
 */

import { differenceInCalendarDays } from 'date-fns';

export const NATURE_ORDER = ['charge', 'produit', 'invest'];
// Libellé au singulier, pour qualifier un poste individuel (ex. "Charge · 601, 602").
export const NATURE_LABELS = { charge: 'Charge', produit: 'Produit', invest: 'Investissement' };
// Libellé au pluriel, pour les en-têtes de regroupement (ex. "Charges", "Produits").
export const NATURE_GROUP_LABELS = { charge: 'Charges', produit: 'Produits', invest: 'Investissements' };

export function ecart(realise, budgete) {
  return realise - budgete;
}

export function ecartPct(ecartValue, budgete) {
  if (budgete === 0) return 0;
  return ecartValue / budgete;
}

export function tauxConso(realise, engage, budgete) {
  if (budgete === 0) return 0;
  return (realise + engage) / budgete;
}

export function resteAEngager(budgete, engage, realise) {
  return budgete - engage - realise;
}

export function montantSubvention(assietteEligible, depensesEligiblesRealisees, tauxIntervention) {
  return Math.min(assietteEligible, depensesEligiblesRealisees) * tauxIntervention;
}

export function montantScenario(montantMedian, coefficient) {
  return montantMedian * coefficient;
}

export function repartitionCharges(chargeStructure, cleRepartition, projet) {
  const part = cleRepartition[projet] ?? 0;
  return chargeStructure * part;
}

export function controleEquilibre(financements, lignesBudget) {
  const totalRecettes = financements.reduce((sum, f) => sum + f.montant, 0);
  const totalDepenses = lignesBudget.reduce((sum, l) => sum + l.montantPrevu, 0);
  const ecartValue = Math.round((totalRecettes - totalDepenses) * 100) / 100;
  return { equilibre: Math.abs(ecartValue) <= 0.01, ecart: ecartValue };
}

/**
 * Répartit un montant annuel sur nbMois, en absorbant le reliquat d'arrondi
 * sur le dernier mois pour que la somme reste exactement égale au montant annuel.
 */
export function repartirMontantAnnuel(montantAnnuel, nbMois) {
  if (nbMois <= 0) return [];
  const base = Math.round((montantAnnuel / nbMois) * 100) / 100;
  const montants = Array(nbMois - 1).fill(base);
  const dernier = Math.round((montantAnnuel - base * (nbMois - 1)) * 100) / 100;
  return [...montants, dernier];
}

/**
 * Résout le coefficient à appliquer pour un poste sur un scénario donné :
 * une surcharge propre au poste (`poste.scenarioCoefficients[scenario.id]`) prime,
 * sinon le coefficient global du scénario s'applique (héritage dynamique : si le
 * coefficient global change, les postes sans surcharge suivent automatiquement).
 */
export function resolveCoefficient(poste, scenario) {
  return poste.scenarioCoefficients?.[scenario.id] ?? scenario.coefficient;
}

/**
 * Résout le montant prévu d'un poste pour un scénario/période donnés :
 * - une ligne explicite (saisie ou surcharge) a toujours priorité
 * - à défaut, pour bas/haut, dérive médian × coefficient du scénario (ou de sa
 *   surcharge par poste, voir resolveCoefficient)
 * - le médian sans ligne explicite vaut 0 (pas de calcul automatique sur le médian)
 */
export function resolveMontantPrevu(poste, scenarios, scenarioId, periode) {
  const explicite = (poste.lignes ?? []).find(l => l.scenarioId === scenarioId && l.periode === periode);
  if (explicite) return explicite.montantPrevu;

  const scenario = scenarios.find(s => s.id === scenarioId);
  if (!scenario || scenario.type === 'median') return 0;

  const median = scenarios.find(s => s.type === 'median');
  const ligneMedian = (poste.lignes ?? []).find(l => l.scenarioId === median?.id && l.periode === periode);
  if (!ligneMedian) return 0;

  return montantScenario(ligneMedian.montantPrevu, resolveCoefficient(poste, scenario));
}

/**
 * Total budgété d'un poste pour un scénario, sur toutes les périodes connues
 * (toute période apparaissant dans une ligne, quel que soit son scénario).
 */
export function totalBudgetePoste(poste, scenarios, scenarioId) {
  const periodes = [...new Set((poste.lignes ?? []).map(l => l.periode))];
  return periodes.reduce((sum, periode) => sum + resolveMontantPrevu(poste, scenarios, scenarioId, periode), 0);
}

/**
 * Index de tri d'une nature de poste (charge < produit < invest). Une nature
 * absente ou inconnue est placée après les natures connues, mais reste stable
 * entre elle (n'introduit pas de tri supplémentaire par nature dans ce cas).
 */
function natureSortIndex(nature) {
  const idx = NATURE_ORDER.indexOf(nature);
  return idx === -1 ? NATURE_ORDER.length : idx;
}

/**
 * Trie des postes : d'abord par nature (charges, puis produits, puis
 * investissements), puis par code croissant à l'intérieur de chaque nature
 * (les postes sans code passent en fin de leur groupe de nature), puis par
 * libellé en cas d'égalité/absence de code.
 */
export function sortPostesByCode(postes) {
  return [...postes].sort((a, b) => {
    const natureDiff = natureSortIndex(a.nature) - natureSortIndex(b.nature);
    if (natureDiff !== 0) return natureDiff;

    const codeA = a.code?.trim() || '';
    const codeB = b.code?.trim() || '';
    if (!codeA && codeB) return 1;
    if (codeA && !codeB) return -1;
    if (codeA !== codeB) return codeA.localeCompare(codeB);
    return (a.libelle ?? '').localeCompare(b.libelle ?? '');
  });
}

/**
 * Clé de regroupement d'un poste à partir des 3 premiers caractères de son code
 * (ex. 'ACH001' -> 'ACH'). Renvoie 'AUTRE' si le poste n'a pas de code exploitable.
 */
export function groupKeyForCode(code) {
  const trimmed = code?.trim().toUpperCase() || '';
  return trimmed.length >= 3 ? trimmed.slice(0, 3) : 'AUTRE';
}

/**
 * Additionne un ensemble de champs numériques sur une liste de lignes
 * (factorise les agrégations dupliquées entre TableauEcarts et SuiviEcartScenario).
 */
export function sumRows(rows, fields) {
  const totals = {};
  for (const field of fields) {
    totals[field] = rows.reduce((sum, r) => sum + (r[field] ?? 0), 0);
  }
  return totals;
}

/**
 * Regroupe des lignes (chacune portant un `row.poste`) à deux niveaux :
 * nature (charge/produit/invest, dans cet ordre) puis préfixe de code
 * (voir groupKeyForCode). Les lignes sont supposées déjà triées par
 * sortPostesByCode. Ne renvoie que les groupes de nature non vides.
 */
export function groupRowsByNatureAndCode(rows) {
  const byNature = new Map();
  for (const row of rows) {
    const nature = row.poste.nature;
    if (!byNature.has(nature)) byNature.set(nature, []);
    byNature.get(nature).push(row);
  }

  const orderedNatures = [...byNature.keys()].sort(
    (a, b) => natureSortIndex(a) - natureSortIndex(b)
  );

  return orderedNatures.map(nature => {
    const natureRows = byNature.get(nature);
    const byCode = new Map();
    for (const row of natureRows) {
      const key = groupKeyForCode(row.poste.code);
      if (!byCode.has(key)) byCode.set(key, []);
      byCode.get(key).push(row);
    }
    return {
      nature,
      label: NATURE_GROUP_LABELS[nature] ?? (nature || 'Autre'),
      rows: natureRows,
      codeGroups: [...byCode.entries()].map(([key, codeRows]) => ({ key, rows: codeRows })),
    };
  });
}

/**
 * Ratio de prorata temporis d'un budget à une date donnée :
 * 0 avant le début de l'exercice, 1 après la fin, sinon le ratio de jours
 * écoulés (inclus) sur la durée totale de l'exercice (inclus).
 */
export function prorataRatio(dateDebut, dateFin, today = new Date()) {
  const totalDays = differenceInCalendarDays(dateFin, dateDebut) + 1;
  if (totalDays <= 0) return 1;

  const elapsedDays = differenceInCalendarDays(today, dateDebut) + 1;
  if (elapsedDays <= 0) return 0;
  if (elapsedDays >= totalDays) return 1;

  return elapsedDays / totalDays;
}
