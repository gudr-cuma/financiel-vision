import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { realiseFromFec } from '../domain/budget/realiseFromFec';
import { buildExerciceMonths } from '../engine/exerciceUtils';
import { parseFecSync } from '../engine/parseFec';
import { extractSiren, detectExerciceStart } from '../engine/exerciceUtils';

function makeParsedFec(entries) {
  return {
    entries,
    exerciceMonths: buildExerciceMonths(new Date(2024, 0, 1), new Date(2024, 1, 1)),
  };
}

describe('realiseFromFec — agrégation mensuelle', () => {
  it('renvoie un montant par mois de l\'exercice, dans l\'ordre chronologique', () => {
    const parsedFec = makeParsedFec([
      { compteNum: '60611000', debit: 200, credit: 0, ecritureDate: new Date(2024, 0, 5), journalCode: 'AC' },
      { compteNum: '60611000', debit: 0, credit: 50, ecritureDate: new Date(2024, 0, 10), journalCode: 'AC' },
      { compteNum: '60611000', debit: 300, credit: 0, ecritureDate: new Date(2024, 1, 1), journalCode: 'AC' },
    ]);
    const poste = { nature: 'charge', comptesMappes: ['606'] };

    const result = realiseFromFec(parsedFec, poste);

    expect(result).toEqual([
      { periode: '2024-01', montant: 150 },
      { periode: '2024-02', montant: 300 },
    ]);
  });

  it('exclut les écritures du journal ANC', () => {
    const parsedFec = makeParsedFec([
      { compteNum: '60611000', debit: 1000, credit: 0, ecritureDate: new Date(2024, 0, 1), journalCode: 'ANC' },
      { compteNum: '60611000', debit: 200, credit: 0, ecritureDate: new Date(2024, 0, 5), journalCode: 'AC' },
    ]);
    const poste = { nature: 'charge', comptesMappes: ['606'] };

    const result = realiseFromFec(parsedFec, poste);

    expect(result.find(r => r.periode === '2024-01').montant).toBe(200);
  });

  it('ignore les comptes qui ne correspondent à aucune entrée de comptesMappes', () => {
    const parsedFec = makeParsedFec([
      { compteNum: '70600000', debit: 0, credit: 500, ecritureDate: new Date(2024, 0, 5), journalCode: 'VE' },
    ]);
    const poste = { nature: 'charge', comptesMappes: ['606'] };

    const result = realiseFromFec(parsedFec, poste);

    expect(result.every(r => r.montant === 0)).toBe(true);
  });

  it('calcule un produit en crédit - débit', () => {
    const parsedFec = makeParsedFec([
      { compteNum: '70600000', debit: 20, credit: 500, ecritureDate: new Date(2024, 0, 5), journalCode: 'VE' },
    ]);
    const poste = { nature: 'produit', comptesMappes: ['706'] };

    const result = realiseFromFec(parsedFec, poste);

    expect(result.find(r => r.periode === '2024-01').montant).toBe(480);
  });

  it('renvoie un tableau vide quand le poste n\'a pas de compte mappé', () => {
    const parsedFec = makeParsedFec([
      { compteNum: '60611000', debit: 200, credit: 0, ecritureDate: new Date(2024, 0, 5), journalCode: 'AC' },
    ]);
    const poste = { nature: 'charge', comptesMappes: [] };

    expect(realiseFromFec(parsedFec, poste)).toEqual([]);
  });

  it('renvoie un tableau vide quand aucun FEC n\'est chargé', () => {
    const poste = { nature: 'charge', comptesMappes: ['606'] };
    expect(realiseFromFec(null, poste)).toEqual([]);
  });
});

describe('realiseFromFec — intégration avec le FEC d\'exemple', () => {
  const FEC_PATH = resolve(__dirname, '../../data/381304559DONNEESCOMPTABLES20241231.csv');
  const FILE_NAME = '381304559DONNEESCOMPTABLES20241231.csv';
  let parsedFec;

  beforeAll(() => {
    const buf = readFileSync(FEC_PATH);
    const raw = parseFecSync(
      buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
      FILE_NAME
    );
    const { closingDate } = extractSiren(FILE_NAME);
    const exerciceStart = detectExerciceStart(raw.entries, closingDate);
    const exerciceMonths = buildExerciceMonths(exerciceStart, closingDate);
    parsedFec = { ...raw, exerciceMonths };
  });

  it('le total annuel calculé correspond à la somme manuelle filtrée sur le même compte', () => {
    const poste = { nature: 'charge', comptesMappes: ['606'] };
    const result = realiseFromFec(parsedFec, poste);

    const expectedTotal = parsedFec.entries
      .filter(e => e.journalCode !== 'ANC' && e.compteNum.startsWith('606'))
      .reduce((sum, e) => sum + (e.debit - e.credit), 0);

    const actualTotal = result.reduce((sum, r) => sum + r.montant, 0);
    expect(Math.round(actualTotal)).toBe(Math.round(expectedTotal));
  });

  it('produit une entrée pour chaque mois de l\'exercice', () => {
    const poste = { nature: 'charge', comptesMappes: ['606'] };
    const result = realiseFromFec(parsedFec, poste);
    expect(result).toHaveLength(parsedFec.exerciceMonths.length);
  });
});
