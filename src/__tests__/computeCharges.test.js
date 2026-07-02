import { describe, it, expect } from 'vitest';
import { getChargeAccountsByCategory } from '../engine/computeCharges';

const parsedFec = {
  exerciceMonths: [{ month: 1, year: 2025, label: 'Janvier 2025', shortLabel: 'Janv.' }],
  entries: [
    { compteNum: '601000', compteLib: 'Achats semences', debit: 1000, credit: 0, journalCode: 'ACH', ecritureDate: new Date('2025-01-15') },
    { compteNum: '603000', compteLib: 'Variation stocks', debit: 500, credit: 0, journalCode: 'ACH', ecritureDate: new Date('2025-01-15') },
    { compteNum: '641000', compteLib: 'Salaires', debit: 2000, credit: 0, journalCode: 'OD', ecritureDate: new Date('2025-01-20') },
    { compteNum: '621000', compteLib: 'Personnel exterieur', debit: 300, credit: 0, journalCode: 'OD', ecritureDate: new Date('2025-01-20') },
    { compteNum: '706000', compteLib: 'Ventes', debit: 0, credit: 5000, journalCode: 'VT', ecritureDate: new Date('2025-01-10') },
    { compteNum: '601000', compteLib: 'Achats semences', debit: 200, credit: 0, journalCode: 'ANC', ecritureDate: new Date('2025-01-25') },
  ],
};

describe('getChargeAccountsByCategory', () => {
  it('groupe les comptes de charges par catégorie PCG, ANC exclu', () => {
    const groups = getChargeAccountsByCategory(parsedFec);
    const ids = groups.map((g) => g.id);
    expect(ids).toEqual(['personnel', 'achats']);
  });

  it('rattache 621 a Personnel (et non Services ext.) et trie par montant decroissant', () => {
    const groups = getChargeAccountsByCategory(parsedFec);
    const personnel = groups.find((g) => g.id === 'personnel');
    expect(personnel.accounts.map((a) => a.compteNum)).toEqual(['641000', '621000']);
    expect(personnel.accounts[0].montant).toBe(2000);
    expect(personnel.accounts[1].montant).toBe(300);
  });

  it('exclut les ecritures du journal ANC du montant', () => {
    const groups = getChargeAccountsByCategory(parsedFec);
    const achats = groups.find((g) => g.id === 'achats');
    expect(achats.accounts).toHaveLength(1);
    expect(achats.accounts[0].compteNum).toBe('601000');
    expect(achats.accounts[0].montant).toBe(1000);
  });

  it('conserve label et couleur de la categorie', () => {
    const groups = getChargeAccountsByCategory(parsedFec);
    const personnel = groups.find((g) => g.id === 'personnel');
    expect(personnel.label).toBe('Personnel');
    expect(personnel.color).toBe('#FF8200');
  });
});
