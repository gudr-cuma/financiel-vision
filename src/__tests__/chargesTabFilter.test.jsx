import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ChargesTab from '../components/charges/ChargesTab';

const fakeFec = {
  exerciceMonths: [{ month: 1, year: 2025, label: 'Janvier 2025', shortLabel: 'Janv.' }],
  entries: [
    { compteNum: '601000', compteLib: 'Achats', debit: 1000, credit: 0, journalCode: 'ACH', ecritureDate: new Date('2025-01-15') },
    { compteNum: '641000', compteLib: 'Salaires', debit: 2000, credit: 0, journalCode: 'OD', ecritureDate: new Date('2025-01-20') },
  ],
};

vi.mock('../store/useStore', () => ({
  default: (selector) => selector({ parsedFec: fakeFec }),
}));

describe('ChargesTab — filtre des comptes', () => {
  it('affiche le bloc de filtre et la répartition des charges', () => {
    render(<ChargesTab />);
    expect(screen.getByText('Comptes de charges')).toBeInTheDocument();
    expect(screen.getByText('Répartition des charges')).toBeInTheDocument();
  });

  it('affiche le message d\'invite quand aucun compte n\'est sélectionné', () => {
    render(<ChargesTab />);
    fireEvent.click(screen.getByText('Tout désélectionner'));
    expect(screen.getByText(/Sélectionnez au moins un compte/)).toBeInTheDocument();
    expect(screen.queryByText('Répartition des charges')).not.toBeInTheDocument();
  });
});
