import { describe, it, expect } from 'vitest';
import { getCapitalRestantDu, countEmpruntsEnCours } from '../engine/empruntsUtils';

const emprunts = [
  { nEmprunt: '006', situation: 4 },
  { nEmprunt: '007', situation: 4 },
  { nEmprunt: '008', situation: 2 }, // terminé — ne doit pas compter
];

const lignesEmprunt = [
  { nEmprunt: '006', exercice: '2023', nLigne: 1, mtRestantDuReel: 8000 },
  { nEmprunt: '006', exercice: '2024', nLigne: 1, mtRestantDuReel: 5000 },
  { nEmprunt: '007', exercice: '2024', nLigne: 1, mtRestantDuPrev: 1200 }, // pas de Réel -> repli sur Prév.
  { nEmprunt: '008', exercice: '2024', nLigne: 1, mtRestantDuReel: 999 },
];

describe('countEmpruntsEnCours', () => {
  it('compte uniquement les emprunts en situation 4', () => {
    expect(countEmpruntsEnCours(emprunts)).toBe(2);
  });
});

describe('getCapitalRestantDu', () => {
  it('prend la ligne la plus récente de chaque emprunt en cours, avec repli sur mtRestantDuPrev', () => {
    // 006 -> ligne 2024 (5000), 007 -> ligne 2024 sans Réel -> Prév. (1200), 008 exclu (situation 2)
    expect(getCapitalRestantDu(emprunts, lignesEmprunt)).toBe(5000 + 1200);
  });

  it("renvoie 0 si aucun emprunt n'est dans la situation demandée", () => {
    expect(getCapitalRestantDu(emprunts, lignesEmprunt, 9)).toBe(0);
  });
});
