import { describe, it, expect } from 'vitest';
import {
  validateMontantPositif,
  validatePeriode,
  validateDatesBudget,
  validateFinancement,
  validatePlanFinancement,
} from '../domain/budget/regles';

describe('validateMontantPositif', () => {
  it('accepte un montant positif ou nul', () => {
    expect(validateMontantPositif(0)).toBe(true);
    expect(validateMontantPositif(1500)).toBe(true);
  });

  it('rejette un montant négatif', () => {
    expect(validateMontantPositif(-1)).toBe(false);
  });

  it('rejette une valeur non numérique', () => {
    expect(validateMontantPositif(NaN)).toBe(false);
    expect(validateMontantPositif('1000')).toBe(false);
  });
});

describe('validatePeriode', () => {
  it('accepte le format AAAA-MM', () => {
    expect(validatePeriode('2026-01')).toBe(true);
    expect(validatePeriode('2026-12')).toBe(true);
  });

  it('rejette un mois invalide', () => {
    expect(validatePeriode('2026-13')).toBe(false);
    expect(validatePeriode('2026-00')).toBe(false);
  });

  it('rejette un format incorrect', () => {
    expect(validatePeriode('janvier 2026')).toBe(false);
    expect(validatePeriode('2026/01')).toBe(false);
  });
});

describe('validateDatesBudget', () => {
  it('accepte une date de fin après la date de début', () => {
    expect(validateDatesBudget('2026-01-01', '2026-12-31')).toBe(true);
  });

  it('rejette une date de fin avant ou égale à la date de début', () => {
    expect(validateDatesBudget('2026-01-01', '2025-12-31')).toBe(false);
    expect(validateDatesBudget('2026-01-01', '2026-01-01')).toBe(false);
  });
});

describe('validateFinancement', () => {
  it('renvoie un tableau vide quand le financement est valide', () => {
    const f = { financeur: 'Région', montant: 25000, tauxIntervention: 0.4, assietteEligible: 62500 };
    expect(validateFinancement(f)).toEqual([]);
  });

  it('signale un taux d\'intervention hors de [0,1]', () => {
    const f = { financeur: 'Région', montant: 25000, tauxIntervention: 1.4, assietteEligible: 62500 };
    expect(validateFinancement(f)).toContain('Le taux d\'intervention doit être compris entre 0 et 1.');
  });

  it('signale un montant négatif', () => {
    const f = { financeur: 'Région', montant: -100, tauxIntervention: 0.4, assietteEligible: 62500 };
    expect(validateFinancement(f)).toContain('Le montant doit être positif ou nul.');
  });

  it('signale une assiette éligible négative', () => {
    const f = { financeur: 'Région', montant: 100, tauxIntervention: 0.4, assietteEligible: -10 };
    expect(validateFinancement(f)).toContain('L\'assiette éligible doit être positive ou nulle.');
  });

  it('accepte un financement sans taux ni assiette (ex. cotisation, prestation)', () => {
    const f = { financeur: 'Cotisations adhérents', montant: 12000, typeRecette: 'cotisation' };
    expect(validateFinancement(f)).toEqual([]);
  });
});

describe('validatePlanFinancement', () => {
  it('est valide quand tous les financements sont corrects et le plan est équilibré', () => {
    const financements = [{ financeur: 'Région', montant: 1000, tauxIntervention: 0.4, assietteEligible: 2500 }];
    const lignesBudget = [{ montantPrevu: 1000 }];
    expect(validatePlanFinancement(financements, lignesBudget)).toEqual({ valid: true, errors: [] });
  });

  it('reporte l\'erreur de déséquilibre du plan de financement', () => {
    const financements = [{ financeur: 'Région', montant: 800, tauxIntervention: 0.4, assietteEligible: 2500 }];
    const lignesBudget = [{ montantPrevu: 1000 }];
    const result = validatePlanFinancement(financements, lignesBudget);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Le plan de financement n\'est pas équilibré (écart : -200,00 €).');
  });
});
