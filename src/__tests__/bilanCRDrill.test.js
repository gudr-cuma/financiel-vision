import { describe, it, expect } from 'vitest';
import {
  buildBilanCRDrill,
  getAccountsForBilan,
  getEntriesForBilanAccount,
} from '../engine/drillDown';

const entries = [
  { compteNum: '2010000', compteLib: 'Frais établissement', debit: 1000, credit: 0, ecritureDate: new Date('2024-01-05'), ecritureLib: 'ecr a', pieceRef: 'P1', journalCode: 'AC' },
  { compteNum: '2801000', compteLib: 'Amort frais établiss.', debit: 0, credit: 200, ecritureDate: new Date('2024-02-05'), ecritureLib: 'ecr b', pieceRef: 'P2', journalCode: 'OD' },
  { compteNum: '7060000', compteLib: 'Prestations', debit: 0, credit: 5000, ecritureDate: new Date('2024-03-05'), ecritureLib: 'ecr c', pieceRef: 'P3', journalCode: 'VT' },
];

describe('buildBilanCRDrill', () => {
  it('actif amortissable : racine + comptes amort/déprec dérivés, solde charge, montant netN', () => {
    const drill = buildBilanCRDrill(
      { type: 'line', code: '201', label: 'Frais établissement', brut: 1000, amort: 200, netN: 800 },
      'actif'
    );
    expect(drill.racine).toBe('201');
    expect(drill.label).toBe('Frais établissement');
    expect(drill.montant).toBe(800);
    expect(drill.ranges).toEqual(['201', '2801', '2901']);
    expect(drill.soldeType).toBe('charge');
  });

  it('actif sans amort : seule la racine', () => {
    const drill = buildBilanCRDrill(
      { type: 'line', code: '271', label: 'Titres', brut: 500, amort: 0, netN: 500 },
      'actif'
    );
    expect(drill.ranges).toEqual(['271']);
  });

  it('résultat produit (classe 7) : solde product, montant totalN', () => {
    const drill = buildBilanCRDrill(
      { type: 'line', code: '706', label: 'Prestations', totalN: 5000 },
      'resultat'
    );
    expect(drill.ranges).toEqual(['706']);
    expect(drill.soldeType).toBe('product');
    expect(drill.montant).toBe(5000);
  });

  it('passif : racine seule, solde charge, montant netN', () => {
    const drill = buildBilanCRDrill(
      { type: 'line', code: '164', label: 'Emprunts', netN: 12000 },
      'passif'
    );
    expect(drill.ranges).toEqual(['164']);
    expect(drill.soldeType).toBe('charge');
    expect(drill.montant).toBe(12000);
  });
});

describe('getAccountsForBilan — option type', () => {
  it('type product : solde = crédit − débit', () => {
    const accounts = getAccountsForBilan(['706'], entries, { type: 'product' });
    expect(accounts).toHaveLength(1);
    expect(accounts[0].compteNum).toBe('7060000');
    expect(accounts[0].solde).toBe(5000);
  });

  it('sans type (défaut) : solde = débit − crédit', () => {
    const accounts = getAccountsForBilan(['201', '2801', '2901'], entries);
    const brut = accounts.find(a => a.compteNum === '2010000');
    const amort = accounts.find(a => a.compteNum === '2801000');
    expect(brut.solde).toBe(1000);
    expect(amort.solde).toBe(-200);
  });
});

describe('getEntriesForBilanAccount — option type', () => {
  it('type product : solde running = crédit − débit', () => {
    const rows = getEntriesForBilanAccount('7060000', entries, 'product');
    expect(rows[0].soldeCumule).toBe(5000);
  });

  it('défaut : solde running = débit − crédit', () => {
    const rows = getEntriesForBilanAccount('2010000', entries);
    expect(rows[0].soldeCumule).toBe(1000);
  });
});
