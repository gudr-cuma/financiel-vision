import { describe, it, expect } from 'vitest';
import { compteRacines, compteLabel, modeAmort, round2 } from '../engine/computeAmortissementEdition';

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
