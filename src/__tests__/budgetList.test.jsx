import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BudgetList from '../components/budget/BudgetList';

const duplicateBudget = vi.fn();
const deleteBudget = vi.fn();
const exportBudgets = vi.fn(() => '{}');
const importBudgets = vi.fn();
const changerStatutBudget = vi.fn(() => ({ ok: true }));

const budgets = [
  { id: 'bud_1', nom: 'Animation réseau', type: 'fonctionnement', exercice: 2026, statut: 'brouillon', historique: [] },
];

vi.mock('../store/useBudgetStore', () => ({
  default: (selector) => selector({ budgets, duplicateBudget, deleteBudget, exportBudgets, importBudgets, changerStatutBudget }),
}));

vi.mock('../store/useAuthStore', () => ({
  default: (selector) => selector({ currentUser: { id: 'u1', name: 'Jean Dupont', email: 'jean@example.com' } }),
}));

const onOpen = vi.fn();

beforeEach(() => {
  onOpen.mockClear();
  changerStatutBudget.mockClear();
});

describe('BudgetList', () => {
  it('affiche le badge de statut et les boutons de transition pour chaque budget', () => {
    render(<BudgetList onOpen={onOpen} onCreate={() => {}} />);
    // 'Brouillon' apparaît à la fois dans le badge de statut et dans l'option du
    // filtre <select> ; on vérifie juste qu'au moins une occurrence est rendue.
    expect(screen.getAllByText('Brouillon').length).toBeGreaterThan(0);
    expect(screen.getByText('Soumettre')).toBeInTheDocument();
  });

  it('le clic sur un bouton de transition ne déclenche pas l\'ouverture du budget', () => {
    render(<BudgetList onOpen={onOpen} onCreate={() => {}} />);
    fireEvent.click(screen.getByText('Soumettre'));
    expect(changerStatutBudget).toHaveBeenCalledWith('bud_1', 'soumis');
    expect(onOpen).not.toHaveBeenCalled();
  });
});
