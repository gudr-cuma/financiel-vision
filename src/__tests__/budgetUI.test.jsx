import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import BudgetGrid from '../components/budget/BudgetGrid';
import TableauEcarts from '../components/budget/TableauEcarts';
import SuiviEcartScenario from '../components/budget/SuiviEcartScenario';

const addPoste = vi.fn();
const updatePoste = vi.fn();
const removePoste = vi.fn();
const setLigneBudget = vi.fn();

vi.mock('../store/useBudgetStore', () => ({
  default: (selector) => selector({ addPoste, updatePoste, removePoste, setLigneBudget }),
}));

vi.mock('../store/useStore', () => ({
  default: (selector) => selector({ parsedFec: null }),
}));

const scenarios = [
  { id: 'sce_bas', type: 'bas', coefficient: 0.9 },
  { id: 'sce_median', type: 'median', coefficient: 1 },
  { id: 'sce_haut', type: 'haut', coefficient: 1.1 },
];

function makeBudget(postes) {
  return {
    id: 'bud_1',
    dateDebut: '2026-01-01',
    dateFin: '2026-01-31',
    scenarios,
    engagements: [],
    postes,
  };
}

const posteAch2 = { id: 'p2', code: 'ACH002', libelle: 'Engrais', nature: 'charge', comptesMappes: ['602'], lignes: [{ scenarioId: 'sce_median', periode: '2026-01', montantPrevu: 2000 }] };
const posteAch1 = { id: 'p1', code: 'ACH001', libelle: 'Semences', nature: 'charge', comptesMappes: ['601'], lignes: [{ scenarioId: 'sce_median', periode: '2026-01', montantPrevu: 1000 }] };
const posteSansCode = { id: 'p3', code: '', libelle: 'Divers', nature: 'charge', comptesMappes: [], lignes: [] };

beforeEach(() => {
  addPoste.mockClear(); updatePoste.mockClear(); removePoste.mockClear(); setLigneBudget.mockClear();
});

describe('BudgetGrid', () => {
  it('affiche une colonne Code et trie les postes par code', () => {
    render(<BudgetGrid budget={makeBudget([posteAch2, posteAch1, posteSansCode])} activeScenarioId="sce_median" />);
    expect(screen.getByText('Code')).toBeInTheDocument();
    const rows = screen.getAllByRole('row').slice(1); // skip header
    expect(within(rows[0]).getByText('ACH001')).toBeInTheDocument();
    expect(within(rows[1]).getByText('ACH002')).toBeInTheDocument();
  });

  it('permet de saisir un code pour un nouveau poste', () => {
    render(<BudgetGrid budget={makeBudget([])} activeScenarioId="sce_median" />);
    fireEvent.change(screen.getByPlaceholderText('Code (ex. ACH001)'), { target: { value: 'POS001' } });
    fireEvent.change(screen.getByPlaceholderText('Libellé du poste'), { target: { value: 'Salaires' } });
    fireEvent.click(screen.getByText('+ Ajouter poste'));
    expect(addPoste).toHaveBeenCalledWith('bud_1', expect.objectContaining({ code: 'POS001', libelle: 'Salaires' }));
  });

  it('passe en mode édition au clic sur le crayon et sauvegarde via updatePoste', () => {
    render(<BudgetGrid budget={makeBudget([posteAch1])} activeScenarioId="sce_median" />);
    fireEvent.click(screen.getByTitle('Modifier le poste'));
    const libelleInput = screen.getByDisplayValue('Semences');
    fireEvent.change(libelleInput, { target: { value: 'Semences bio' } });
    fireEvent.click(screen.getByTitle('Valider'));
    expect(updatePoste).toHaveBeenCalledWith('bud_1', 'p1', expect.objectContaining({ libelle: 'Semences bio', code: 'ACH001' }));
  });
});

describe('TableauEcarts', () => {
  it('trie par code et propose le regroupement postes', () => {
    render(<TableauEcarts budget={makeBudget([posteAch2, posteAch1])} activeScenarioId="sce_median" />);
    const rows = screen.getAllByRole('row').slice(1);
    expect(within(rows[0]).getByText(/ACH001/)).toBeInTheDocument();
    expect(within(rows[1]).getByText(/ACH002/)).toBeInTheDocument();

    fireEvent.click(screen.getByText('Regroupement postes'));
    expect(screen.getByText(/ACH$/)).toBeInTheDocument(); // ligne de groupe "ACH"
  });
});

describe('SuiviEcartScenario', () => {
  it('affiche les colonnes scénario bas/haut avec leurs fonds pastel', () => {
    render(<SuiviEcartScenario budget={makeBudget([posteAch1])} activeScenarioId="sce_median" />);
    const budgBas = screen.getByText('Budg. bas');
    const budgHaut = screen.getByText('Budg. haut');
    expect(budgBas).toBeInTheDocument();
    expect(budgHaut).toBeInTheDocument();
    expect(budgBas.style.background).toBe('rgb(255, 243, 224)'); // #FFF3E0
    expect(budgHaut.style.background).toBe('rgb(177, 220, 226)'); // #B1DCE2
  });
});
