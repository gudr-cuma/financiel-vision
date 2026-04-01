import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { parseFecSync } from '../engine/parseFec';
import { extractSiren, detectExerciceStart, buildExerciceMonths } from '../engine/exerciceUtils';
import { computeTreasury } from '../engine/computeTreasury';

const FEC_PATH = resolve(__dirname, '../../data/381304559DONNEESCOMPTABLES20241231.csv');
const FILE_NAME = '381304559DONNEESCOMPTABLES20241231.csv';

function buildParsedFec() {
  const buf = readFileSync(FEC_PATH);
  const raw = parseFecSync(
    buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
    FILE_NAME
  );
  const { closingDate } = extractSiren(FILE_NAME);
  const exerciceStart = detectExerciceStart(raw.entries, closingDate);
  const exerciceMonths = buildExerciceMonths(exerciceStart, closingDate);
  return { ...raw, exerciceEnd: closingDate, exerciceStart, exerciceMonths };
}

let parsedFec;
let treasury;

beforeAll(() => {
  parsedFec = buildParsedFec();
  treasury = computeTreasury(parsedFec);
});

describe('computeTreasury — structure', () => {
  it('produit une courbe quotidienne non vide', () => {
    expect(treasury.dailyCurve.length).toBeGreaterThan(300);
  });

  it('produit 366 ou 365 points (exercice 2024 = année bissextile)', () => {
    // 2024 est une année bissextile
    expect(treasury.dailyCurve.length).toBe(366);
  });

  it('chaque point a une date, un solde et une moyenne mobile', () => {
    const day = treasury.dailyCurve[0];
    expect(day.date).toBeInstanceOf(Date);
    expect(typeof day.solde).toBe('number');
    expect(typeof day.moyenneMobile).toBe('number');
  });
});

describe('computeTreasury — soldes', () => {
  it('le solde final est un nombre fini', () => {
    expect(isFinite(treasury.soldeActuel)).toBe(true);
  });

  it('solde minimum ≤ solde actuel', () => {
    expect(treasury.soldeMini).toBeLessThanOrEqual(treasury.soldeActuel);
  });

  it('solde maximum ≥ solde actuel', () => {
    expect(treasury.soldeMaxi).toBeGreaterThanOrEqual(treasury.soldeActuel);
  });

  it('total entrées > 0 (des encaissements ont eu lieu)', () => {
    expect(treasury.totalEntrees).toBeGreaterThan(0);
  });

  it('total sorties > 0 (des décaissements ont eu lieu)', () => {
    expect(treasury.totalSorties).toBeGreaterThan(0);
  });
});

describe('computeTreasury — Top 10', () => {
  it('top 10 encaissements triés par montant décroissant', () => {
    const top = treasury.top10Entrees;
    expect(top.length).toBeGreaterThan(0);
    for (let i = 1; i < top.length; i++) {
      expect(top[i - 1].montant).toBeGreaterThanOrEqual(top[i].montant);
    }
  });

  it('top 10 décaissements triés par montant décroissant', () => {
    const top = treasury.top10Sorties;
    expect(top.length).toBeGreaterThan(0);
    for (let i = 1; i < top.length; i++) {
      expect(top[i - 1].montant).toBeGreaterThanOrEqual(top[i].montant);
    }
  });

  it('maximum 10 éléments dans chaque top', () => {
    expect(treasury.top10Entrees.length).toBeLessThanOrEqual(10);
    expect(treasury.top10Sorties.length).toBeLessThanOrEqual(10);
  });
});

describe('computeTreasury — filterByPeriod', () => {
  it('filtre "annee" retourne toute la courbe', () => {
    const full = treasury.filterByPeriod(treasury.dailyCurve, 'annee');
    expect(full.length).toBe(treasury.dailyCurve.length);
  });

  it('filtre "t1" retourne moins de points que "annee"', () => {
    const t1 = treasury.filterByPeriod(treasury.dailyCurve, 't1');
    expect(t1.length).toBeLessThan(treasury.dailyCurve.length);
    expect(t1.length).toBeGreaterThan(0);
  });

  it('filtre "s1" ≈ filtre "t1" + filtre "t2"', () => {
    const s1 = treasury.filterByPeriod(treasury.dailyCurve, 's1');
    const t1 = treasury.filterByPeriod(treasury.dailyCurve, 't1');
    const t2 = treasury.filterByPeriod(treasury.dailyCurve, 't2');
    expect(s1.length).toBe(t1.length + t2.length);
  });
});
