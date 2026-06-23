import { describe, it, expect, beforeEach } from 'vitest';
import { getAll, save, remove, exportJson, importJson, reset } from '../data/budgetRepository';

const sampleBudget = (id = 'bud_1') => ({
  id,
  nom: 'Animation réseau 2026',
  type: 'projet',
  exercice: 2026,
  statut: 'brouillon',
  version: 1,
  postes: [],
  scenarios: [],
  financements: [],
  engagements: [],
});

beforeEach(() => {
  reset();
});

describe('save / getAll', () => {
  it('ajoute un nouveau budget', () => {
    save(sampleBudget());
    expect(getAll()).toHaveLength(1);
  });

  it('met à jour un budget existant au lieu d\'en créer un doublon', () => {
    save(sampleBudget('bud_1'));
    save({ ...sampleBudget('bud_1'), nom: 'Nom modifié' });
    const all = getAll();
    expect(all).toHaveLength(1);
    expect(all[0].nom).toBe('Nom modifié');
  });
});

describe('remove', () => {
  it('supprime un budget par id', () => {
    save(sampleBudget('bud_1'));
    save(sampleBudget('bud_2'));
    remove('bud_1');
    expect(getAll().map(b => b.id)).toEqual(['bud_2']);
  });
});

describe('exportJson / importJson', () => {
  it('exporte puis réimporte un budget sans perte', () => {
    save(sampleBudget('bud_1'));
    const json = exportJson();

    reset();
    expect(getAll()).toHaveLength(0);

    importJson(json);
    expect(getAll()).toHaveLength(1);
    expect(getAll()[0].id).toBe('bud_1');
  });

  it('rejette un JSON dont la racine "budgets" n\'est pas un tableau', () => {
    expect(() => importJson(JSON.stringify({ budgets: 'pas un tableau' })))
      .toThrow('Format de fichier invalide');
  });
});
