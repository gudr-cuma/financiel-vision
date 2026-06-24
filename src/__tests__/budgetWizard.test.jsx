import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BudgetWizard from '../components/budget/BudgetWizard';

const createBudget = vi.fn(() => ({ id: 'bud_new' }));
const duplicateBudget = vi.fn(() => ({ id: 'bud_copy' }));
const updateBudget = vi.fn();

vi.mock('../store/useBudgetStore', () => ({
  default: (selector) => selector({ createBudget, duplicateBudget, updateBudget, budgets: [] }),
}));

beforeEach(() => {
  createBudget.mockClear();
  duplicateBudget.mockClear();
  updateBudget.mockClear();
});

function fillRequiredFields() {
  fireEvent.change(screen.getByPlaceholderText('Ex. Animation réseau 2026'), { target: { value: 'Mon budget' } });
}

describe('BudgetWizard — périodicité', () => {
  it('propose un sélecteur de périodicité avec "Mensuel" sélectionné par défaut', () => {
    render(<BudgetWizard onClose={() => {}} onCreated={() => {}} />);
    expect(screen.getByLabelText('Périodicité de saisie').value).toBe('mensuel');
  });

  it('transmet la périodicité choisie à createBudget', async () => {
    render(<BudgetWizard onClose={() => {}} onCreated={() => {}} />);
    fillRequiredFields();
    fireEvent.change(screen.getByLabelText('Périodicité de saisie'), { target: { value: 'trimestriel' } });
    fireEvent.click(screen.getByText('Créer le budget'));

    await vi.waitFor(() => expect(createBudget).toHaveBeenCalled());
    expect(createBudget).toHaveBeenCalledWith(expect.objectContaining({ periodicite: 'trimestriel' }));
  });
});
