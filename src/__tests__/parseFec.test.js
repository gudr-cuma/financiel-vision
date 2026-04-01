import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { parseFecSync } from '../engine/parseFec';

const FEC_PATH = resolve(__dirname, '../../data/381304559DONNEESCOMPTABLES20241231.csv');

function loadFec() {
  const buffer = readFileSync(FEC_PATH);
  return parseFecSync(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength), '381304559DONNEESCOMPTABLES20241231.csv');
}

describe('parseFecSync — FEC d\'exemple réel', () => {
  it('parse 3316 écritures valides', () => {
    const result = loadFec();
    expect(result.entries).toHaveLength(3316);
  });

  it('détecte l\'encodage ISO-8859-15', () => {
    const result = loadFec();
    expect(result.encoding).toBe('iso-8859-15');
  });

  it('détecte le séparateur pipe', () => {
    const result = loadFec();
    expect(result.separator).toBe('|');
  });

  it('la première écriture a le CompteNum 51211000', () => {
    const result = loadFec();
    expect(result.entries[0].compteNum).toBe('51211000');
  });

  it('parse correctement le montant "31004,01" (avec espaces) → 31004.01', () => {
    const result = loadFec();
    expect(result.entries[0].debit).toBeCloseTo(31004.01, 2);
  });

  it('parse les dates au format YYYYMMDD → objet Date', () => {
    const result = loadFec();
    const entry = result.entries[0];
    expect(entry.ecritureDate).toBeInstanceOf(Date);
    expect(entry.ecritureDate.getFullYear()).toBe(2024);
    expect(entry.ecritureDate.getMonth()).toBe(0); // janvier
    expect(entry.ecritureDate.getDate()).toBe(1);
  });

  it('trim les espaces des champs string (EcritureNum)', () => {
    const result = loadFec();
    // EcritureNum "       2758" doit être trimmé en "2758"
    expect(result.entries[0].ecritureNum).toBe('2758');
  });

  it('les champs CompAuxNum vides sont null', () => {
    const result = loadFec();
    // Les 2 premières lignes ont CompAuxNum vide
    expect(result.entries[0].compAuxNum).toBeNull();
  });

  it('a des stats cohérentes', () => {
    const result = loadFec();
    expect(result.stats.totalLines).toBe(3316);
    expect(result.stats.skippedLines).toBe(0);
  });
});

describe('parseFecSync — extractSiren depuis le nom de fichier', () => {
  it('extrait le SIREN 381304559', () => {
    const { extractSiren } = require('../engine/exerciceUtils');
    const { siren } = extractSiren('381304559DONNEESCOMPTABLES20241231.csv');
    expect(siren).toBe('381304559');
  });
});

describe('parseFecSync — validation du header', () => {
  it('lève une erreur si le header FEC est invalide', () => {
    const fakeContent = 'Col1|Col2|Col3\nvaleur1|valeur2|valeur3\n';
    const encoder = new TextEncoder();
    const buffer = encoder.encode(fakeContent).buffer;
    expect(() => parseFecSync(buffer, 'test.csv')).toThrow(/header fec invalide/i);
  });

  it('lève une erreur si le header n\'a pas 18 colonnes', () => {
    const fakeContent = 'JournalCode|JournalLib\nANC|A nouveaux\n';
    const encoder = new TextEncoder();
    const buffer = encoder.encode(fakeContent).buffer;
    expect(() => parseFecSync(buffer, 'test.csv')).toThrow();
  });
});
