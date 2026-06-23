/**
 * Règles de calcul du module Suivi Budgétaire.
 * Fonctions pures, sans dépendance React — voir §8 du cadrage.
 */

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
 * Résout le montant prévu d'un poste pour un scénario/période donnés :
 * - une ligne explicite (saisie ou surcharge) a toujours priorité
 * - à défaut, pour bas/haut, dérive médian × coefficient du scénario
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

  return montantScenario(ligneMedian.montantPrevu, scenario.coefficient);
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
 * Trie des postes par code croissant (les postes sans code passent en fin de liste),
 * puis par libellé en cas d'égalité/absence de code.
 */
export function sortPostesByCode(postes) {
  return [...postes].sort((a, b) => {
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
