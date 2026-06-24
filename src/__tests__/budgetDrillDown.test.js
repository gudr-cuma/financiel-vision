import { describe, it, expect } from 'vitest';
import { getAccountsForPoste, getEntriesForAccount } from '../domain/budget/drillDown';

const entries = [
  { compteNum: '60611000', compteLib: 'Carburants', debit: 200, credit: 0, ecritureDate: new Date(2024, 0, 10), ecritureLib: 'Facture essence', pieceRef: 'F1', journalCode: 'AC' },
  { compteNum: '60611000', compteLib: 'Carburants', debit: 0, credit: 50, ecritureDate: new Date(2024, 0, 5), ecritureLib: 'Avoir', pieceRef: 'F2', journalCode: 'AC' },
  { compteNum: '60622000', compteLib: 'Fournitures', debit: 80, credit: 0, ecritureDate: new Date(2024, 0, 8), ecritureLib: 'Achat', pieceRef: 'F3', journalCode: 'AC' },
  { compteNum: '60611000', compteLib: 'Carburants', debit: 1000, credit: 0, ecritureDate: new Date(2024, 0, 1), ecritureLib: 'A nouveau', pieceRef: 'F0', journalCode: 'ANC' },
];

describe('getAccountsForPoste', () => {
  it('agrège par compte les écritures correspondant aux comptesMappes du poste, hors ANC', () => {
    const poste = { nature: 'charge', comptesMappes: ['606'] };
    const result = getAccountsForPoste(poste, entries);

    expect(result).toHaveLength(2);
    const carburants = result.find(a => a.compteNum === '60611000');
    expect(carburants.nbEcritures).toBe(2);
    expect(carburants.solde).toBe(150);
  });

  it('trie par solde absolu décroissant', () => {
    const poste = { nature: 'charge', comptesMappes: ['606'] };
    const result = getAccountsForPoste(poste, entries);
    expect(result[0].compteNum).toBe('60611000');
  });
});

describe('getEntriesForAccount', () => {
  it('renvoie les écritures triées par date avec un solde cumulé, hors ANC', () => {
    const poste = { nature: 'charge' };
    const result = getEntriesForAccount('60611000', poste, entries);

    expect(result).toHaveLength(2);
    expect(result[0].soldeCumule).toBe(-50);
    expect(result[1].soldeCumule).toBe(150);
  });
});
