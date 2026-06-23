/**
 * Validations métier du module Suivi Budgétaire.
 * Fonctions pures, sans dépendance React.
 */

import { controleEquilibre } from './calculs';

export function validateMontantPositif(montant) {
  return typeof montant === 'number' && Number.isFinite(montant) && montant >= 0;
}

const PERIODE_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export function validatePeriode(periode) {
  return PERIODE_RE.test(periode);
}

export function validateDatesBudget(dateDebut, dateFin) {
  return new Date(dateFin).getTime() > new Date(dateDebut).getTime();
}

export function validateFinancement(financement) {
  const errors = [];
  const { tauxIntervention, montant, assietteEligible } = financement;

  if (tauxIntervention !== undefined && (tauxIntervention < 0 || tauxIntervention > 1)) {
    errors.push('Le taux d\'intervention doit être compris entre 0 et 1.');
  }
  if (!validateMontantPositif(montant)) {
    errors.push('Le montant doit être positif ou nul.');
  }
  if (assietteEligible !== undefined && !validateMontantPositif(assietteEligible)) {
    errors.push('L\'assiette éligible doit être positive ou nulle.');
  }

  return errors;
}

function formatEuro(amount) {
  return amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

export function validatePlanFinancement(financements, lignesBudget) {
  const errors = financements.flatMap(validateFinancement);

  const { equilibre, ecart } = controleEquilibre(financements, lignesBudget);
  if (!equilibre) {
    errors.push(`Le plan de financement n'est pas équilibré (écart : ${formatEuro(ecart)}).`);
  }

  return { valid: errors.length === 0, errors };
}
