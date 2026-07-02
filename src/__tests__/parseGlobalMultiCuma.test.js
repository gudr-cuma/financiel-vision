// src/__tests__/parseGlobalMultiCuma.test.js
import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { parseGlobalMultiCumaBuffer } from '../engine/parseGlobalMultiCuma';

// En-têtes réels (extrait), aux positions réelles utiles.
const HEADER = [
  'classe', 'Dpt', 'Region', 'InterR', '118 CUMA', "Nombre d'adhérents",
  'Nombre de cuma', 'CA', 'CA  corrigé', 'E.B.E.', 'Résultat courant',
  'Résultat exceptionnel', 'Résultat net', '% Entretien / CA', 'Entretien réparation',
];

function buildBuffer(dataRows, { sheetName = 'global' } = {}) {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([HEADER, ...dataRows]);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
}

const CUMA_A = ['a', 85, 'PDL', 'O', 'LE MARAIS', 20, 1, 5000, 5000, 0, -100, 0, -100, 0.4, 200];
const CUMA_B = ['b', 27, 'NOR', 'O', 'DE LA FORET', 12, 1, 60000, 60000, 0, 500, 0, 500, 0.25, 15000];

describe('parseGlobalMultiCumaBuffer', () => {
  it('lève si l’onglet global est absent', () => {
    const buf = buildBuffer([CUMA_A], { sheetName: 'autre' });
    expect(() => parseGlobalMultiCumaBuffer(buf)).toThrow(/global/i);
  });

  it('exclut les lignes de synthèse et garde les CUMA', () => {
    const buf = buildBuffer([
      CUMA_A,
      ['', '', '', '', 'Total', '', '', 65000],
      ['', '', '', '', 'Moyenne', '', '', 32500],
      ['', '', '', '', '1er quartile', '', '', 5000],
      ['', '', '', '', '3ème quartile', '', '', 60000],
      ['', '', '', '', 'Nb Cuma concernées', '', '', 2],
      CUMA_B,
      ['', '', '', '', null],
    ]);
    const { rows } = parseGlobalMultiCumaBuffer(buf);
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.nom)).toEqual(['LE MARAIS', 'DE LA FORET']);
  });

  it('mappe les colonnes et calcule la catégorie', () => {
    const buf = buildBuffer([CUMA_A, CUMA_B]);
    const { rows } = parseGlobalMultiCumaBuffer(buf);
    expect(rows[0]).toMatchObject({
      classe: 'a', dpt: 85, region: 'PDL', nom: 'LE MARAIS',
      ca: 5000, resultatCourant: -100, pctEntretienCA: 0.4,
      categorie: '< 10 000€',
    });
    expect(rows[1].categorie).toBe('50 à 80 000€');
  });
});
