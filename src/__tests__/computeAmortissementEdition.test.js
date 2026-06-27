import { describe, it, expect } from 'vitest';
import { compteRacines, compteLabel, modeAmort, round2, buildVncIndex, computeBienRow, computeAmortissementEdition } from '../engine/computeAmortissementEdition';

describe('helpers comptes', () => {
  it('derive les racines immo / amort', () => {
    expect(compteRacines('21450000')).toEqual({ racineImmo: '2145', racineAmort: '28145' });
    expect(compteRacines('21540000')).toEqual({ racineImmo: '2154', racineAmort: '28154' });
    expect(compteRacines('21541000')).toEqual({ racineImmo: '2154', racineAmort: '28154' });
  });
  it('libelle compte : exact, puis racine 4 chiffres, puis fallback numero', () => {
    expect(compteLabel('21541000')).toBe('Matériels agricoles');
    expect(compteLabel('21450000')).toBe('Agencements');
    expect(compteLabel('27000000')).toBe('27000000');
  });
  it('mode : 1 => L, sinon vide', () => {
    expect(modeAmort(1)).toBe('L');
    expect(modeAmort('1')).toBe('L');
    expect(modeAmort(2)).toBe('');
    expect(modeAmort(null)).toBe('');
  });
  it('round2 arrondit au centime', () => {
    expect(round2(886.099999)).toBe(886.1);
    expect(round2(2114.355)).toBe(2114.36);
    expect(round2(-11715.664)).toBe(-11715.66);
    expect(round2(-886.1)).toBe(-886.1);
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
  it("bien acquis dans l'exercice (166) : anterieur 0, dotation = total", () => {
    const i1 = { nBien: 166, valeurEntree: 20000, ecoMethode: 1, ecoDuree: 9, dateAcquisition: new Date(2025, 7, 14) };
    const r = computeBienRow(i1, idx, 2025);
    expect(r).toMatchObject({ anterieur: 0, base: 20000, dotation: 845.68, total: 845.68, vnc: 19154.32 });
  });
  it("bien totalement amorti avant l'exercice (1) : dotation 0, vnc 0", () => {
    const i1 = { nBien: 1, valeurEntree: 792.73, ecoMethode: 1, ecoDuree: 5 };
    const r = computeBienRow(i1, idx, 2025);
    expect(r).toMatchObject({ anterieur: 792.73, base: 0, dotation: 0, total: 792.73, vnc: 0 });
  });
});

describe("computeAmortissementEdition - comptes & totaux", () => {
  const immobilisations = [
    { nBien: 150, libelle: 'TRACTEUR JD 6R195', compteImmo: '21450000', valeurEntree: 8861, ecoMethode: 1, ecoDuree: 10, axe1: '4', dateAcquisition: new Date(2022, 11, 31), dateCession: null },
    { nBien: 200, libelle: 'ATELIER', compteImmo: '21450000', valeurEntree: 15344.14, ecoMethode: 1, ecoDuree: 12, dateAcquisition: new Date(1990, 0, 1), dateCession: null },
  ];
  const immoLignes = [
    { nBien: 150, dateFinExo: new Date(2024, 11, 31), ecoMtResiduel: 7088.8 },
    { nBien: 150, dateFinExo: new Date(2025, 11, 31), ecoMtResiduel: 6202.7 },
    { nBien: 200, dateFinExo: new Date(2002, 11, 31), ecoMtResiduel: 0 },
  ];
  const synthese = { dateDebutExercice: '01/01/2025', dateFinExercice: '31/12/2025' };
  const ed = computeAmortissementEdition({ immobilisations, immoLignes, synthese });

  it("expose les bornes d'exercice", () => {
    expect(ed.exercice.fin.getFullYear()).toBe(2025);
  });
  it('groupe par compte, trie les biens par nBien', () => {
    expect(ed.comptes).toHaveLength(1);
    expect(ed.comptes[0].compte).toBe('21450000');
    expect(ed.comptes[0].libelle).toBe('Agencements');
    expect(ed.comptes[0].racineAmort).toBe('28145');
    expect(ed.comptes[0].biens.map(b => b.nBien)).toEqual([150, 200]);
  });
  it('calcule les totaux du compte', () => {
    const t = ed.comptes[0].totaux;
    expect(t.cout).toBe(24205.14);
    expect(t.dotation).toBe(886.1);
    expect(t.total).toBe(18002.44);
    expect(t.vnc).toBe(6202.7);
    expect(t.soldeImmo).toBe(24205.14);
    expect(t.soldeNet).toBe(6202.7);
    expect(t.acquisitionsExercice).toBe(0);
    expect(t.acquisitionsAnterieures).toBe(24205.14);
  });
  it('calcule le total general tous comptes', () => {
    expect(ed.totalGeneral.cout).toBe(24205.14);
    expect(ed.totalGeneral.vnc).toBe(6202.7);
  });
});

describe("computeAmortissementEdition - cessions", () => {
  const immobilisations = [
    { nBien: 135, libelle: 'TRACTEUR JD 6215 R', compteImmo: '21541000', valeurEntree: 164000, ecoMethode: 1, ecoDuree: 7, dateAcquisition: new Date(2021, 9, 1), dateCession: new Date(2025, 3, 25), mtCession: 110000 },
  ];
  const immoLignes = [
    { nBien: 135, dateFinExo: new Date(2024, 11, 31), ecoMtResiduel: 125469.88 },
    { nBien: 135, dateFinExo: new Date(2025, 11, 31), ecoMtResiduel: 121715.66 },
  ];
  const synthese = { dateDebutExercice: '01/01/2025', dateFinExercice: '31/12/2025' };
  const ed = computeAmortissementEdition({ immobilisations, immoLignes, synthese });

  it('le bien cede sort de la liste amortissements', () => {
    expect(ed.comptes).toHaveLength(0);
  });
  it('le bien cede figure dans les cessions avec sa moins-value', () => {
    expect(ed.cessions).toHaveLength(1);
    const b = ed.cessions[0].biens[0];
    expect(b.nBien).toBe(135);
    expect(b.prixCession).toBe(110000);
    expect(b.vnc).toBe(121715.66);
    expect(b.plusMoinsValue).toBe(-11715.66);
    expect(b.derogatoire).toBe(0);
    expect(b.fiscalTotal).toBe(b.total);
  });
});
