// src/__tests__/multiCumaTranches.test.js
import { describe, it, expect } from 'vitest';
import { categorieFromCA, TRANCHE_ORDER } from '../domain/multiCuma/tranches';

describe('categorieFromCA', () => {
  it('classe selon les bornes (borne basse incluse)', () => {
    expect(categorieFromCA(0)).toBe('< 10 000€');
    expect(categorieFromCA(9999)).toBe('< 10 000€');
    expect(categorieFromCA(10000)).toBe('10 à 50 000€');
    expect(categorieFromCA(49999)).toBe('10 à 50 000€');
    expect(categorieFromCA(50000)).toBe('50 à 80 000€');
    expect(categorieFromCA(79999)).toBe('50 à 80 000€');
    expect(categorieFromCA(80000)).toBe('80 à 130 000€');
    expect(categorieFromCA(129999)).toBe('80 à 130 000€');
    expect(categorieFromCA(130000)).toBe('> 130 000€');
    expect(categorieFromCA(500000)).toBe('> 130 000€');
  });

  it('traite les valeurs non numériques comme 0', () => {
    expect(categorieFromCA(null)).toBe('< 10 000€');
    expect(categorieFromCA('abc')).toBe('< 10 000€');
  });

  it('expose les 5 tranches dans l’ordre croissant', () => {
    expect(TRANCHE_ORDER).toEqual([
      '< 10 000€', '10 à 50 000€', '50 à 80 000€', '80 à 130 000€', '> 130 000€',
    ]);
  });
});
