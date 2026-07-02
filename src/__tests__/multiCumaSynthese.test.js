// src/__tests__/multiCumaSynthese.test.js
import { describe, it, expect } from 'vitest';
import { computeSyntheseTable, TABLE1_METRICS } from '../domain/multiCuma/synthese';

// 3 CUMA : 2 dans la tranche < 10 000€, 1 dans 50 à 80 000€
const rows = [
  { categorie: '< 10 000€', ca: 4000, carburant: 100, pctEntretienCA: 0.40, entretienReparation: 1600 },
  { categorie: '< 10 000€', ca: 6000, carburant: 300, pctEntretienCA: 0.20, entretienReparation: 1200 },
  { categorie: '50 à 80 000€', ca: 60000, carburant: 2000, pctEntretienCA: 0.30, entretienReparation: 18000 },
];

// index des colonnes dans TABLE1_METRICS
const iCA = TABLE1_METRICS.findIndex((m) => m.label === 'CA');
const iCarb = TABLE1_METRICS.findIndex((m) => m.label === 'Carburant');
const iEntr = TABLE1_METRICS.findIndex((m) => m.label === '% Entretien / CA');
const iNb = TABLE1_METRICS.findIndex((m) => m.type === 'count');
const iPart = TABLE1_METRICS.findIndex((m) => m.type === 'share');

describe('computeSyntheseTable', () => {
  it('produit une ligne par tranche + une ligne Total', () => {
    const { trancheRows, totalRow } = computeSyntheseTable(rows, TABLE1_METRICS);
    expect(trancheRows).toHaveLength(5); // les 5 tranches, même vides
    expect(trancheRows[0].categorie).toBe('< 10 000€');
    expect(totalRow.categorie).toBe('Total');
    expect(totalRow.count).toBe(3);
  });

  it('mode moyenne : moyenne simple des valeurs et des ratios', () => {
    const { trancheRows } = computeSyntheseTable(rows, TABLE1_METRICS, { mode: 'mean' });
    const t = trancheRows[0]; // < 10 000€
    expect(t.count).toBe(2);
    expect(t.cells[iCA]).toBe(5000);      // (4000+6000)/2
    expect(t.cells[iCarb]).toBe(200);     // (100+300)/2
    expect(t.cells[iEntr]).toBeCloseTo(0.30); // (0.40+0.20)/2
  });

  it('mode pondéré : ratio = somme(num)/somme(denom)', () => {
    const { trancheRows } = computeSyntheseTable(rows, TABLE1_METRICS, { mode: 'weighted' });
    const t = trancheRows[0];
    // (1600+1200)/(4000+6000) = 0.28
    expect(t.cells[iEntr]).toBeCloseTo(0.28);
    // les valeurs absolues restent en moyenne
    expect(t.cells[iCA]).toBe(5000);
  });

  it('compte et répartition (somme des parts = 100%)', () => {
    const { trancheRows, totalRow } = computeSyntheseTable(rows, TABLE1_METRICS);
    expect(trancheRows[0].cells[iNb]).toBe(2);
    expect(trancheRows[0].cells[iPart]).toBeCloseTo(2 / 3);
    const somme = trancheRows.reduce((s, r) => s + (r.cells[iPart] || 0), 0);
    expect(somme).toBeCloseTo(1);
    expect(totalRow.cells[iPart]).toBeCloseTo(1);
  });
});
