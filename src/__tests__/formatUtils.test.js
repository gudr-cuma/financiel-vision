import { describe, it, expect } from 'vitest';
import { parseFrDate } from '../engine/formatUtils';

describe('parseFrDate', () => {
  it('parse une date au format JJ/MM/AAAA', () => {
    const date = parseFrDate('31/12/2025');
    expect(date.getFullYear()).toBe(2025);
    expect(date.getMonth()).toBe(11);
    expect(date.getDate()).toBe(31);
  });

  it('accepte un jour ou un mois sur un seul chiffre', () => {
    const date = parseFrDate('1/3/2025');
    expect(date.getFullYear()).toBe(2025);
    expect(date.getMonth()).toBe(2);
    expect(date.getDate()).toBe(1);
  });

  it('renvoie null pour une chaîne vide ou mal formée', () => {
    expect(parseFrDate('')).toBeNull();
    expect(parseFrDate('2025-12-31')).toBeNull();
    expect(parseFrDate('pas une date')).toBeNull();
  });

  it("renvoie null si la valeur n'est pas une chaîne", () => {
    expect(parseFrDate(null)).toBeNull();
    expect(parseFrDate(undefined)).toBeNull();
  });
});
