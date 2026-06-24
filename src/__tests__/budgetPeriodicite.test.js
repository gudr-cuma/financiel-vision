import { describe, it, expect, beforeEach } from 'vitest';
import useBudgetStore from '../store/useBudgetStore';
import useAuthStore from '../store/useAuthStore';

beforeEach(() => {
  useAuthStore.setState({ currentUser: { id: 'u1', name: 'Jean Dupont', email: 'jean@example.com' } });
});

describe('createBudget — périodicité', () => {
  it('vaut "mensuel" par défaut quand non précisée', () => {
    const budget = useBudgetStore.getState().createBudget({
      nom: 'Test', type: 'fonctionnement', exercice: 2026,
      dateDebut: '2026-01-01', dateFin: '2026-12-31',
    });
    expect(budget.periodicite).toBe('mensuel');
  });

  it('stocke la périodicité fournie à la création', () => {
    const budget = useBudgetStore.getState().createBudget({
      nom: 'Test', type: 'fonctionnement', exercice: 2026,
      dateDebut: '2026-01-01', dateFin: '2026-12-31',
      periodicite: 'trimestriel',
    });
    expect(budget.periodicite).toBe('trimestriel');
  });

  it('duplicateBudget copie la périodicité du budget source', () => {
    const source = useBudgetStore.getState().createBudget({
      nom: 'Source', type: 'fonctionnement', exercice: 2026,
      dateDebut: '2026-01-01', dateFin: '2026-12-31',
      periodicite: 'semestriel',
    });
    const copy = useBudgetStore.getState().duplicateBudget(source.id);
    expect(copy.periodicite).toBe('semestriel');
  });
});
