import { describe, it, expect } from 'vitest';
import { compteRacines, compteLabel, modeAmort, round2, buildVncIndex, computeBienRow } from '../engine/computeAmortissementEdition';

describe('helpers comptes', () => {
  it('dérive les racines immo / amort', () => {
    expect(compteRacines('21450000')).toEqual({ racineImmo: '2145', racineAmort: '28145' });
    expect(compteRacines('21540000')).toEqual({ racineImmo: '2154', racineAmort: '28154' });
    expect(compteRacines('21541000')).toEqual({ racineImmo: '2154', racineAmort: '28154' });
  });
  it('libelle compte : exact, puis racine 4 chiffres, puis fallback numéro', () => {
    expect(compteLabel('21541000')).toBe('Matériels agricoles');
    expect(compteLabel('21450000')).toBe('Agencements');
    expect(compteLabel('27000000')).toBe('27000000');
  });
  it('mode : 1 → L, sinon vide', () => {
    expect(modeAmort(1)).toBe('L');
    expect(modeAmort('1')).toBe('L');
    expect(modeAmort(2)).toBe('');
    expect(modeAmort(null)).toBe('');
  });
  it('round2 arrondit au centime', () => {
    expect(round2(886.099999)).toBe(886.1);
    expect(round2(2114.355)).toBe(2114.36);
  });
});

const i2 = [
  { nBien: 150, dateFinExo: new Date(2023, 11, 31), ecoMtResiduel: 7974.9 },
  { nBien: 150, dateFinExo: new Date(2024, 11, 31), ecoMtResiduel: 7088.8 },
  { nBien: 150, dateFinExo: new Date(2025, 11, 31), ecoMtResiduel: 6202.7 },
  { nBien: 104, dateFinExo: new Date(2024, 11, 31), ecoMtResiduel: 3523.94 },
  { nBien: 104, dateFinExo: new Date(2025, 11, 31), ecoMtResiduel: 2114.36 },
  { nBien: 166, dateFinExo: new Date(2025, 11, 31), ecoMtResiduel: 19154.32 },
  { nBien: 1, dateFinExo: new Date(2022, 11, 31), ecoMtResiduel: 0 },
];

describe('computeBienRow (exercice 2025)', () => {
  const idx = buildVncIndex(i2);
  it('bien amorti en cours (150)', () => {
    const i1 = { nBien: 150, libelle: 'TRACTEUR JD 6R195', valeurEntree: 8861, ecoMethode: 1, ecoDuree: 10, axe1: '4' };
    const r = computeBienRow(i1, idx, 2025);
    expect(r).toMatchObject({ cout: 8861, base: 7088.8, anterieur: 1772.2, dotation: 886.1, total: 2658.3, vnc: 6202.7, mode: 'L' });
  });
  it('bien 104 (HOUE)', () => {
    const i1 = { nBien: 104, valeurEntree: 17303.44, ecoMethode: 1, ecoDuree: 7 };
    const r = computeBienRow(i1, idx, 2025);
    expect(r).toMatchObject({ anterieur: 13779.5, base: 3523.94, dotation: 1409.58, total: 15189.08, vnc: 2114.36 });
  });
  it('bien acquis dans l’exercice (166) : antérieur 0, dotation = total', () => {
    const i1 = { nBien: 166, valeurEntree: 20000, ecoMethode: 1, ecoDuree: 9, dateAcquisition: new Date(2025, 7, 14) };
    const r = computeBienRow(i1, idx, 2025);
    expect(r).toMatchObject({ anterieur: 0, base: 20000, dotation: 845.68, total: 845.68, vnc: 19154.32 });
  });
  it('bien totalement amorti avant l’exercice (1) : dotation 0, vnc 0', () => {
    const i1 = { nBien: 1, valeurEntree: 792.73, ecoMethode: 1, ecoDuree: 5 };
    const r = computeBienRow(i1, idx, 2025);
    expect(r).toMatchObject({ anterieur: 792.73, base: 0, dotation: 0, total: 792.73, vnc: 0 });
  });
});
