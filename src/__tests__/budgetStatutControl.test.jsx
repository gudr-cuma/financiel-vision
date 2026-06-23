import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StatutControl } from '../components/budget/StatutControl';

const changerStatutBudget = vi.fn();
let mockCurrentUser = { id: 'u1', name: 'Jean Dupont', email: 'jean@example.com' };

vi.mock('../store/useBudgetStore', () => ({
  default: (selector) => selector({ changerStatutBudget }),
}));

vi.mock('../store/useAuthStore', () => ({
  default: (selector) => selector({ currentUser: mockCurrentUser }),
}));

function makeBudget(overrides = {}) {
  return { id: 'bud_1', statut: 'brouillon', historique: [], ...overrides };
}

beforeEach(() => {
  changerStatutBudget.mockClear();
  changerStatutBudget.mockReturnValue({ ok: true });
  mockCurrentUser = { id: 'u1', name: 'Jean Dupont', email: 'jean@example.com' };
});

describe('StatutControl — variant compact', () => {
  it('affiche un bouton par transition autorisée et déclenche l\'action au clic', () => {
    render(<StatutControl budget={makeBudget({ statut: 'brouillon' })} variant="compact" />);
    fireEvent.click(screen.getByText('Soumettre'));
    expect(changerStatutBudget).toHaveBeenCalledWith('bud_1', 'soumis');
  });

  it('désactive les boutons quand aucun utilisateur n\'est connecté', () => {
    mockCurrentUser = null;
    render(<StatutControl budget={makeBudget({ statut: 'brouillon' })} variant="compact" />);
    const btn = screen.getByText('Soumettre');
    expect(btn).toBeDisabled();
    fireEvent.click(btn);
    expect(changerStatutBudget).not.toHaveBeenCalled();
  });

  it('affiche les trois transitions possibles depuis "valide"', () => {
    render(<StatutControl budget={makeBudget({ statut: 'valide' })} variant="compact" />);
    expect(screen.getByText('Clôturer')).toBeInTheDocument();
    expect(screen.getByText('Marquer à réviser')).toBeInTheDocument();
    expect(screen.getByText('↩ Renvoyer en soumission')).toBeInTheDocument();
  });
});

describe('StatutControl — variant full', () => {
  it('ouvre un formulaire de commentaire avant de confirmer la transition', () => {
    render(<StatutControl budget={makeBudget({ statut: 'brouillon' })} variant="full" />);
    fireEvent.click(screen.getByText('Soumettre'));
    expect(changerStatutBudget).not.toHaveBeenCalled();
    fireEvent.change(screen.getByPlaceholderText('Commentaire (optionnel)'), { target: { value: 'Prêt pour relecture' } });
    fireEvent.click(screen.getByText('Confirmer'));
    expect(changerStatutBudget).toHaveBeenCalledWith('bud_1', 'soumis', 'Prêt pour relecture');
  });

  it('affiche un message d\'erreur si la transition est refusée par le store', () => {
    changerStatutBudget.mockReturnValue({ ok: false, error: 'Transition non autorisée.' });
    render(<StatutControl budget={makeBudget({ statut: 'brouillon' })} variant="full" />);
    fireEvent.click(screen.getByText('Soumettre'));
    fireEvent.click(screen.getByText('Confirmer'));
    expect(screen.getByText('Transition non autorisée.')).toBeInTheDocument();
  });

  it('affiche l\'historique des transitions au clic sur le lien', () => {
    const historique = [
      { id: 'hist_1', de: 'brouillon', vers: 'soumis', date: '2026-06-20T10:00:00.000Z', auteur: { nom: 'Jean Dupont' }, commentaire: '' },
    ];
    render(<StatutControl budget={makeBudget({ statut: 'soumis', historique })} variant="full" />);
    fireEvent.click(screen.getByText('Historique'));
    expect(screen.getByText(/Brouillon → Soumis/)).toBeInTheDocument();
    expect(screen.getByText(/Jean Dupont/)).toBeInTheDocument();
  });
});
