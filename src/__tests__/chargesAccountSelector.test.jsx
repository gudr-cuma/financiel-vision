import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ChargesAccountSelector from '../components/charges/ChargesAccountSelector';

const groups = [
  { id: 'personnel', label: 'Personnel', color: '#FF8200', accounts: [
    { compteNum: '641000', compteLib: 'Salaires', montant: 2000 },
    { compteNum: '621000', compteLib: 'Personnel ext.', montant: 300 },
  ] },
  { id: 'achats', label: 'Achats', color: '#93C90E', accounts: [
    { compteNum: '601000', compteLib: 'Achats semences', montant: 1000 },
  ] },
];
const allNums = ['641000', '621000', '601000'];

describe('ChargesAccountSelector', () => {
  it('affiche les groupes repliés par défaut (comptes masqués)', () => {
    render(<ChargesAccountSelector groups={groups} selectedAccounts={allNums} onChange={() => {}} />);
    expect(screen.getByText('Personnel')).toBeInTheDocument();
    expect(screen.queryByText('641000')).not.toBeInTheDocument();
  });

  it('déplie un groupe au clic sur son en-tête', () => {
    render(<ChargesAccountSelector groups={groups} selectedAccounts={allNums} onChange={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /Personnel/ }));
    expect(screen.getByText('641000')).toBeInTheDocument();
  });

  it('met la case du groupe en état partiel quand une partie seulement est sélectionnée', () => {
    render(<ChargesAccountSelector groups={groups} selectedAccounts={['641000']} onChange={() => {}} />);
    expect(screen.getByLabelText('Sélectionner tout Personnel')).toBePartiallyChecked();
  });

  it('« Tout désélectionner » appelle onChange avec une liste vide', () => {
    const onChange = vi.fn();
    render(<ChargesAccountSelector groups={groups} selectedAccounts={allNums} onChange={onChange} />);
    fireEvent.click(screen.getByText('Tout désélectionner'));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('décocher la case d\'un groupe retire ses comptes de la sélection', () => {
    const onChange = vi.fn();
    render(<ChargesAccountSelector groups={groups} selectedAccounts={allNums} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('Sélectionner tout Personnel'));
    expect(onChange).toHaveBeenCalledWith(['601000']);
  });
});
