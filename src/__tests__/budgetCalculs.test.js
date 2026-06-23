import { describe, it, expect } from 'vitest';
import {
  ecart,
  ecartPct,
  tauxConso,
  resteAEngager,
  montantSubvention,
  montantScenario,
  repartitionCharges,
  controleEquilibre,
  repartirMontantAnnuel,
  resolveMontantPrevu,
  totalBudgetePoste,
  sortPostesByCode,
  groupKeyForCode,
} from '../domain/budget/calculs';

describe('ecart', () => {
  it('renvoie realise - budgete', () => {
    expect(ecart(1200, 1000)).toBe(200);
  });

  it('est négatif quand le réalisé est inférieur au budgété', () => {
    expect(ecart(800, 1000)).toBe(-200);
  });
});

describe('ecartPct', () => {
  it('renvoie l\'écart en pourcentage du budgété', () => {
    expect(ecartPct(200, 1000)).toBe(0.2);
  });

  it('renvoie 0 quand le budgété est 0 (évite la division par zéro)', () => {
    expect(ecartPct(200, 0)).toBe(0);
  });
});

describe('tauxConso', () => {
  it('renvoie (realise + engage) / budgete', () => {
    expect(tauxConso(600, 200, 1000)).toBe(0.8);
  });

  it('renvoie 0 quand le budgété est 0', () => {
    expect(tauxConso(600, 200, 0)).toBe(0);
  });
});

describe('resteAEngager', () => {
  it('renvoie budgete - engage - realise', () => {
    expect(resteAEngager(1000, 200, 600)).toBe(200);
  });
});

describe('montantSubvention', () => {
  it('applique le taux d\'intervention sur le minimum(assiette, dépenses réalisées)', () => {
    expect(montantSubvention(62500, 50000, 0.4)).toBe(20000);
  });

  it('plafonne les dépenses éligibles à l\'assiette éligible', () => {
    expect(montantSubvention(62500, 80000, 0.4)).toBe(25000);
  });
});

describe('montantScenario', () => {
  it('applique le coefficient au montant médian', () => {
    expect(montantScenario(1000, 1.1)).toBe(1100);
  });
});

describe('repartitionCharges', () => {
  it('applique la clé de répartition du projet à la charge de structure', () => {
    const cle = { projetA: 0.6, projetB: 0.4 };
    expect(repartitionCharges(10000, cle, 'projetA')).toBe(6000);
  });

  it('renvoie 0 si le projet n\'a pas de clé définie', () => {
    const cle = { projetA: 0.6 };
    expect(repartitionCharges(10000, cle, 'projetInconnu')).toBe(0);
  });
});

describe('controleEquilibre', () => {
  it('signale équilibré quand recettes == dépenses (à 0,01€ près)', () => {
    const financements = [{ montant: 600 }, { montant: 400 }];
    const lignesBudget = [{ montantPrevu: 1000 }];
    expect(controleEquilibre(financements, lignesBudget)).toEqual({ equilibre: true, ecart: 0 });
  });

  it('signale déséquilibré et renvoie l\'écart sinon', () => {
    const financements = [{ montant: 600 }, { montant: 300 }];
    const lignesBudget = [{ montantPrevu: 1000 }];
    expect(controleEquilibre(financements, lignesBudget)).toEqual({ equilibre: false, ecart: -100 });
  });
});

describe('repartirMontantAnnuel', () => {
  it('répartit également quand la division est exacte', () => {
    expect(repartirMontantAnnuel(1200, 12)).toEqual(Array(12).fill(100));
  });

  it('absorbe le reliquat d\'arrondi sur le dernier mois, la somme reste exacte', () => {
    const result = repartirMontantAnnuel(1000, 3);
    expect(result).toHaveLength(3);
    expect(result[0]).toBe(333.33);
    expect(result[1]).toBe(333.33);
    expect(result[2]).toBe(333.34);
    expect(result.reduce((a, b) => a + b, 0)).toBe(1000);
  });

  it('renvoie un tableau vide si nbMois est 0', () => {
    expect(repartirMontantAnnuel(1000, 0)).toEqual([]);
  });
});

const scenarios = [
  { id: 'sce_bas', type: 'bas', coefficient: 0.9 },
  { id: 'sce_median', type: 'median', coefficient: 1 },
  { id: 'sce_haut', type: 'haut', coefficient: 1.1 },
];

describe('resolveMontantPrevu', () => {
  it('renvoie la valeur explicite quand une ligne existe pour ce scénario/période', () => {
    const poste = { lignes: [{ scenarioId: 'sce_bas', periode: '2026-01', montantPrevu: 500 }] };
    expect(resolveMontantPrevu(poste, scenarios, 'sce_bas', '2026-01')).toBe(500);
  });

  it('calcule médian × coefficient quand aucune ligne explicite n\'existe pour bas/haut', () => {
    const poste = { lignes: [{ scenarioId: 'sce_median', periode: '2026-01', montantPrevu: 1000 }] };
    expect(resolveMontantPrevu(poste, scenarios, 'sce_bas', '2026-01')).toBe(900);
    expect(resolveMontantPrevu(poste, scenarios, 'sce_haut', '2026-01')).toBe(1100);
  });

  it('renvoie 0 pour le médian sans ligne explicite (pas de calcul automatique sur le médian)', () => {
    const poste = { lignes: [] };
    expect(resolveMontantPrevu(poste, scenarios, 'sce_median', '2026-01')).toBe(0);
  });

  it('renvoie 0 pour bas/haut quand le médian n\'a pas de valeur pour cette période', () => {
    const poste = { lignes: [] };
    expect(resolveMontantPrevu(poste, scenarios, 'sce_bas', '2026-01')).toBe(0);
  });
});

describe('totalBudgetePoste', () => {
  it('additionne le médian × coefficient sur toutes les périodes connues du poste', () => {
    const poste = {
      lignes: [
        { scenarioId: 'sce_median', periode: '2026-01', montantPrevu: 1000 },
        { scenarioId: 'sce_median', periode: '2026-02', montantPrevu: 2000 },
      ],
    };
    expect(totalBudgetePoste(poste, scenarios, 'sce_haut')).toBe(3300);
  });

  it('tient compte d\'une surcharge explicite sur une période donnée', () => {
    const poste = {
      lignes: [
        { scenarioId: 'sce_median', periode: '2026-01', montantPrevu: 1000 },
        { scenarioId: 'sce_haut', periode: '2026-01', montantPrevu: 1500 },
      ],
    };
    expect(totalBudgetePoste(poste, scenarios, 'sce_haut')).toBe(1500);
  });
});

describe('sortPostesByCode', () => {
  it('trie les postes par code croissant', () => {
    const postes = [
      { id: 'p3', code: 'ACH002', libelle: 'Engrais' },
      { id: 'p1', code: 'ACH001', libelle: 'Semences' },
      { id: 'p2', code: 'POS001', libelle: 'Loyer' },
    ];
    expect(sortPostesByCode(postes).map(p => p.id)).toEqual(['p1', 'p3', 'p2']);
  });

  it('place les postes sans code en fin de liste', () => {
    const postes = [
      { id: 'p1', code: '', libelle: 'Sans code' },
      { id: 'p2', code: 'ACH001', libelle: 'Avec code' },
    ];
    expect(sortPostesByCode(postes).map(p => p.id)).toEqual(['p2', 'p1']);
  });

  it('trie par libellé en cas d\'égalité ou d\'absence de code', () => {
    const postes = [
      { id: 'p1', code: '', libelle: 'Zinc' },
      { id: 'p2', code: '', libelle: 'Achat' },
    ];
    expect(sortPostesByCode(postes).map(p => p.id)).toEqual(['p2', 'p1']);
  });

  it('ne mute pas le tableau d\'origine', () => {
    const postes = [{ id: 'p1', code: 'B' }, { id: 'p2', code: 'A' }];
    const sorted = sortPostesByCode(postes);
    expect(sorted).not.toBe(postes);
    expect(postes.map(p => p.id)).toEqual(['p1', 'p2']);
  });
});

describe('groupKeyForCode', () => {
  it('renvoie les 3 premiers caractères du code en majuscules', () => {
    expect(groupKeyForCode('ach001')).toBe('ACH');
    expect(groupKeyForCode('POS001')).toBe('POS');
  });

  it('renvoie AUTRE quand le code est absent ou trop court', () => {
    expect(groupKeyForCode('')).toBe('AUTRE');
    expect(groupKeyForCode(undefined)).toBe('AUTRE');
    expect(groupKeyForCode('AB')).toBe('AUTRE');
  });
});
