import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BudgetTab from '../components/budget/BudgetTab';

const addPoste = vi.fn();
const updatePoste = vi.fn();
const removePoste = vi.fn();
const setLigneBudget = vi.fn();
const updateScenario = vi.fn();
const changerStatutBudget = vi.fn(() => ({ ok: true }));

const budget = {
  id: 'bud_1', nom: 'Animation réseau', type: 'fonctionnement', exercice: 2026,
  dateDebut: '2026-01-01', dateFin: '2026-12-31', statut: 'brouillon', historique: [],
  scenarios: [{ id: 'sce_median', type: 'median', coefficient: 1 }],
  postes: [], financements: [], engagements: [],
};

vi.mock('../store/useBudgetStore', () => ({
  default: (selector) => selector({
    budgets: [budget], addPoste, updatePoste, removePoste, setLigneBudget, updateScenario, changerStatutBudget,
  }),
}));

vi.mock('../store/useAuthStore', () => ({
  default: (selector) => selector({ currentUser: { id: 'u1', name: 'Jean Dupont', email: 'jean@example.com' } }),
}));

describe('BudgetTab', () => {
  it('affiche le contrôle de statut en variante complète une fois le budget ouvert', () => {
    render(<BudgetTab />);
    fireEvent.click(screen.getByText('Animation réseau'));
    expect(screen.getByText('Soumettre')).toBeInTheDocument();
  });
});
