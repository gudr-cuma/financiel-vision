import { describe, it, expect } from 'vitest';
import {
  extractSiren,
  detectExerciceStart,
  buildExerciceMonths,
  getMonthLabel,
  getExerciceLabel,
} from '../engine/exerciceUtils';

describe('extractSiren', () => {
  it('extrait le SIREN et la date de clôture depuis un nom de fichier conforme', () => {
    const result = extractSiren('381304559DONNEESCOMPTABLES20241231.csv');
    expect(result.siren).toBe('381304559');
    expect(result.closingDate).toBeInstanceOf(Date);
    expect(result.closingDate.getFullYear()).toBe(2024);
    expect(result.closingDate.getMonth()).toBe(11); // décembre = index 11
    expect(result.closingDate.getDate()).toBe(31);
  });

  it('retourne null pour un nom de fichier non conforme', () => {
    const result = extractSiren('export_comptable.csv');
    expect(result.siren).toBeNull();
    expect(result.closingDate).toBeNull();
  });

  it("supporte l'extension .txt", () => {
    const result = extractSiren('123456789DONNEESCOMPTABLES20231231.txt');
    expect(result.siren).toBe('123456789');
  });
});

describe('detectExerciceStart', () => {
  it('retourne la date min des écritures ANC', () => {
    const entries = [
      { journalCode: 'ANC', ecritureDate: new Date(2024, 0, 1) },
      { journalCode: 'ANC', ecritureDate: new Date(2024, 0, 1) },
      { journalCode: 'VE',  ecritureDate: new Date(2024, 2, 15) },
    ];
    const closing = new Date(2024, 11, 31);
    const start = detectExerciceStart(entries, closing);
    expect(start.getFullYear()).toBe(2024);
    expect(start.getMonth()).toBe(0);
    expect(start.getDate()).toBe(1);
  });

  it('utilise le fallback (closingDate − 12 mois + 1 jour) si pas d\'ANC', () => {
    const entries = [{ journalCode: 'VE', ecritureDate: new Date(2024, 3, 1) }];
    const closing = new Date(2024, 11, 31);
    const start = detectExerciceStart(entries, closing);
    expect(start.getFullYear()).toBe(2024);
    expect(start.getMonth()).toBe(0);
    expect(start.getDate()).toBe(1);
  });
});

describe('buildExerciceMonths', () => {
  it('construit les 12 mois pour un exercice Jan–Déc', () => {
    const months = buildExerciceMonths(new Date(2024, 0, 1), new Date(2024, 11, 31));
    expect(months).toHaveLength(12);
    expect(months[0].month).toBe(1);
    expect(months[0].year).toBe(2024);
    expect(months[11].month).toBe(12);
    expect(months[11].year).toBe(2024);
  });

  it('construit les 12 mois dans l\'ordre pour un exercice décalé Avr–Mars', () => {
    const months = buildExerciceMonths(new Date(2024, 3, 1), new Date(2025, 2, 31));
    expect(months).toHaveLength(12);
    expect(months[0].month).toBe(4);   // Avril
    expect(months[0].year).toBe(2024);
    expect(months[8].month).toBe(12);  // Décembre
    expect(months[8].year).toBe(2024);
    expect(months[9].month).toBe(1);   // Janvier
    expect(months[9].year).toBe(2025);
    expect(months[11].month).toBe(3);  // Mars
    expect(months[11].year).toBe(2025);
  });

  it('retourne un tableau vide si les dates sont nulles', () => {
    expect(buildExerciceMonths(null, null)).toHaveLength(0);
  });
});

describe('getMonthLabel', () => {
  it('retourne "Janvier" pour le mois 1', () => {
    expect(getMonthLabel(1)).toBe('Janvier');
  });

  it('retourne "Décembre" pour le mois 12', () => {
    expect(getMonthLabel(12)).toBe('Décembre');
  });

  it('retourne "Avril" pour le mois 4', () => {
    expect(getMonthLabel(4)).toBe('Avril');
  });
});

describe('getExerciceLabel', () => {
  it('retourne "Exercice 2024" pour un exercice calé Jan–Déc', () => {
    const label = getExerciceLabel(new Date(2024, 0, 1), new Date(2024, 11, 31));
    expect(label).toBe('Exercice 2024');
  });

  it('retourne le label avec deux années pour un exercice décalé', () => {
    const label = getExerciceLabel(new Date(2024, 3, 1), new Date(2025, 2, 31));
    expect(label).toBe('Exercice avril 2024 — mars 2025');
  });
});
