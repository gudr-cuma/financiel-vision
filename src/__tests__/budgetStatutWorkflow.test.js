import { describe, it, expect, beforeEach } from 'vitest';
import useBudgetStore from '../store/useBudgetStore';
import useAuthStore from '../store/useAuthStore';

beforeEach(() => {
  useAuthStore.setState({ currentUser: { id: 'u1', name: 'Jean Dupont', email: 'jean@example.com' } });
});

function createTestBudget() {
  return useBudgetStore.getState().createBudget({
    nom: 'Test', type: 'fonctionnement', exercice: 2026,
    dateDebut: '2026-01-01', dateFin: '2026-12-31',
  });
}

describe('changerStatutBudget', () => {
  it('fait évoluer le statut et journalise la transition', () => {
    const budget = createTestBudget();
    const result = useBudgetStore.getState().changerStatutBudget(budget.id, 'soumis', 'Prêt');
    expect(result).toEqual({ ok: true });

    const updated = useBudgetStore.getState().budgets.find(b => b.id === budget.id);
    expect(updated.statut).toBe('soumis');
    expect(updated.historique).toHaveLength(1);
    expect(updated.historique[0]).toMatchObject({
      de: 'brouillon',
      vers: 'soumis',
      commentaire: 'Prêt',
      auteur: { id: 'u1', nom: 'Jean Dupont', email: 'jean@example.com' },
    });
    expect(updated.historique[0].date).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('refuse une transition non autorisée par le graphe d\'états', () => {
    const budget = createTestBudget();
    const result = useBudgetStore.getState().changerStatutBudget(budget.id, 'cloture');
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/non autorisée/);

    const updated = useBudgetStore.getState().budgets.find(b => b.id === budget.id);
    expect(updated.statut).toBe('brouillon');
    expect(updated.historique).toHaveLength(0);
  });

  it('refuse la transition si aucun utilisateur n\'est connecté', () => {
    useAuthStore.setState({ currentUser: null });
    const budget = createTestBudget();
    const result = useBudgetStore.getState().changerStatutBudget(budget.id, 'soumis');
    expect(result.ok).toBe(false);

    const updated = useBudgetStore.getState().budgets.find(b => b.id === budget.id);
    expect(updated.statut).toBe('brouillon');
  });

  it('accumule plusieurs transitions dans l\'ordre', () => {
    const budget = createTestBudget();
    useBudgetStore.getState().changerStatutBudget(budget.id, 'soumis');
    useBudgetStore.getState().changerStatutBudget(budget.id, 'valide');
    useBudgetStore.getState().changerStatutBudget(budget.id, 'cloture');

    const updated = useBudgetStore.getState().budgets.find(b => b.id === budget.id);
    expect(updated.statut).toBe('cloture');
    expect(updated.historique.map(h => `${h.de}>${h.vers}`)).toEqual([
      'brouillon>soumis', 'soumis>valide', 'valide>cloture',
    ]);
  });
});
