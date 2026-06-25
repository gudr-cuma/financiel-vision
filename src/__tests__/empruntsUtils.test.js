import { describe, it, expect } from 'vitest';
import { getCapitalRestantDu, countEmpruntsEnCours, decodePeriode, computeCrd5Ans } from '../engine/empruntsUtils';

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

describe('decodePeriode', () => {
  it('décode les codes connus', () => {
    expect(decodePeriode('A')).toBe('Annuel');
    expect(decodePeriode('M')).toBe('Mensuel');
    expect(decodePeriode('T')).toBe('Trimestriel');
    expect(decodePeriode('S')).toBe('Semestriel');
  });

  it('renvoie le code brut si inconnu', () => {
    expect(decodePeriode('X')).toBe('X');
  });

  it('renvoie "—" si absent', () => {
    expect(decodePeriode(null)).toBe('—');
    expect(decodePeriode(undefined)).toBe('—');
    expect(decodePeriode('')).toBe('—');
  });
});

describe('computeCrd5Ans', () => {
  const emprunt = { nEmprunt: '100', montant: 10000 };

  it("cumule le capital remboursé et les intérêts réglés jusqu'à la date incluse", () => {
    const lignes = [
      { nEmprunt: '100', dateReelle: new Date(2024, 0, 1), mtCapitalReel: 1000, mtInteretReel: 100 },
      { nEmprunt: '100', dateReelle: new Date(2025, 0, 1), mtCapitalReel: 1100, mtInteretReel: 90 },
      { nEmprunt: '100', dateReelle: new Date(2026, 0, 1), mtCapitalReel: 1200, mtInteretReel: 80 },
    ];
    const [result] = computeCrd5Ans([emprunt], lignes, new Date(2025, 0, 1));
    expect(result.capitalRembourseCumule).toBe(2100); // lignes 2024 + 2025, borne incluse
    expect(result.interetsReglesCumule).toBe(190);
    expect(result.capitalRestantDu).toBe(10000 - 2100);
  });

  it('utilise le montant Prévisionnel quand le Réel est absent (ligne future)', () => {
    const lignes = [
      { nEmprunt: '100', datePrevue: new Date(2026, 0, 1), mtCapitalPrev: 1200, mtInteretPrev: 80 },
    ];
    const [result] = computeCrd5Ans([emprunt], lignes, new Date(2025, 0, 1));
    expect(result.capitalMoins1An).toBe(1200);
  });

  it('place une échéance exactement à dateFin + 1 an dans la tranche "< 1 an" (borne incluse)', () => {
    const dateFin = new Date(2025, 0, 1);
    const lignes = [
      { nEmprunt: '100', datePrevue: new Date(2026, 0, 1), mtCapitalPrev: 500 },
    ];
    const [result] = computeCrd5Ans([emprunt], lignes, dateFin);
    expect(result.capitalMoins1An).toBe(500);
    expect(result.capitalEntre1Et5Ans).toBe(0);
  });

  it('place une échéance juste après dateFin + 1 an dans la tranche "1 à 5 ans"', () => {
    const dateFin = new Date(2025, 0, 1);
    const lignes = [
      { nEmprunt: '100', datePrevue: new Date(2026, 0, 2), mtCapitalPrev: 500 },
    ];
    const [result] = computeCrd5Ans([emprunt], lignes, dateFin);
    expect(result.capitalMoins1An).toBe(0);
    expect(result.capitalEntre1Et5Ans).toBe(500);
  });

  it('place une échéance exactement à dateFin + 5 ans dans la tranche "1 à 5 ans" (borne incluse)', () => {
    const dateFin = new Date(2025, 0, 1);
    const lignes = [
      { nEmprunt: '100', datePrevue: new Date(2030, 0, 1), mtCapitalPrev: 300 },
    ];
    const [result] = computeCrd5Ans([emprunt], lignes, dateFin);
    expect(result.capitalEntre1Et5Ans).toBe(300);
    expect(result.capitalPlusDe5Ans).toBe(0);
  });

  it('place une échéance juste après dateFin + 5 ans dans la tranche "> 5 ans"', () => {
    const dateFin = new Date(2025, 0, 1);
    const lignes = [
      { nEmprunt: '100', datePrevue: new Date(2030, 0, 2), mtCapitalPrev: 300 },
    ];
    const [result] = computeCrd5Ans([emprunt], lignes, dateFin);
    expect(result.capitalEntre1Et5Ans).toBe(0);
    expect(result.capitalPlusDe5Ans).toBe(300);
  });

  it('renvoie des champs calculés à 0 et capitalRestantDu = montant pour un emprunt sans ligne', () => {
    const [result] = computeCrd5Ans([emprunt], [], new Date(2025, 0, 1));
    expect(result.capitalRembourseCumule).toBe(0);
    expect(result.interetsReglesCumule).toBe(0);
    expect(result.capitalRestantDu).toBe(10000);
    expect(result.capitalMoins1An).toBe(0);
    expect(result.capitalEntre1Et5Ans).toBe(0);
    expect(result.capitalPlusDe5Ans).toBe(0);
  });

  it('ne mélange pas les lignes de deux emprunts différents', () => {
    const emprunts = [{ nEmprunt: '100', montant: 10000 }, { nEmprunt: '200', montant: 5000 }];
    const lignes = [
      { nEmprunt: '100', dateReelle: new Date(2024, 0, 1), mtCapitalReel: 1000 },
      { nEmprunt: '200', dateReelle: new Date(2024, 0, 1), mtCapitalReel: 2000 },
    ];
    const [r100, r200] = computeCrd5Ans(emprunts, lignes, new Date(2025, 0, 1));
    expect(r100.capitalRembourseCumule).toBe(1000);
    expect(r200.capitalRembourseCumule).toBe(2000);
  });
});
