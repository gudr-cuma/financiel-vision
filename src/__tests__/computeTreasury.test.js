import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { parseFecSync } from '../engine/parseFec';
import { extractSiren, detectExerciceStart, buildExerciceMonths } from '../engine/exerciceUtils';
import { computeTreasury, getTreasuryEntries, aggregateTreasuryByGranularity } from '../engine/computeTreasury';

const FEC_PATH = resolve(__dirname, '../../data/381304559DONNEESCOMPTABLES20241231.csv');
const FILE_NAME = '381304559DONNEESCOMPTABLES20241231.csv';

function buildParsedFec() {
  const buf = readFileSync(FEC_PATH);
  const raw = parseFecSync(
    buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
    FILE_NAME
  );
  const { closingDate } = extractSiren(FILE_NAME);
  const exerciceStart = detectExerciceStart(raw.entries, closingDate);
  const exerciceMonths = buildExerciceMonths(exerciceStart, closingDate);
  return { ...raw, exerciceEnd: closingDate, exerciceStart, exerciceMonths };
}

let parsedFec;
let treasury;

beforeAll(() => {
  parsedFec = buildParsedFec();
  treasury = computeTreasury(parsedFec);
});

describe('computeTreasury — structure', () => {
  it('produit une courbe quotidienne non vide', () => {
    expect(treasury.dailyCurve.length).toBeGreaterThan(300);
  });

  it('produit 366 ou 365 points (exercice 2024 = année bissextile)', () => {
    // 2024 est une année bissextile
    expect(treasury.dailyCurve.length).toBe(366);
  });

  it('chaque point a une date, un solde et une moyenne mobile', () => {
    const day = treasury.dailyCurve[0];
    expect(day.date).toBeInstanceOf(Date);
    expect(typeof day.solde).toBe('number');
    expect(typeof day.moyenneMobile).toBe('number');
  });
});

describe('computeTreasury — soldes', () => {
  it('le solde final est un nombre fini', () => {
    expect(isFinite(treasury.soldeActuel)).toBe(true);
  });

  it('solde minimum ≤ solde actuel', () => {
    expect(treasury.soldeMini).toBeLessThanOrEqual(treasury.soldeActuel);
  });

  it('solde maximum ≥ solde actuel', () => {
    expect(treasury.soldeMaxi).toBeGreaterThanOrEqual(treasury.soldeActuel);
  });

  it('total entrées > 0 (des encaissements ont eu lieu)', () => {
    expect(treasury.totalEntrees).toBeGreaterThan(0);
  });

  it('total sorties > 0 (des décaissements ont eu lieu)', () => {
    expect(treasury.totalSorties).toBeGreaterThan(0);
  });
});

describe('computeTreasury — Top 10', () => {
  it('top 10 encaissements triés par montant décroissant', () => {
    const top = treasury.top10Entrees;
    expect(top.length).toBeGreaterThan(0);
    for (let i = 1; i < top.length; i++) {
      expect(top[i - 1].montant).toBeGreaterThanOrEqual(top[i].montant);
    }
  });

  it('top 10 décaissements triés par montant décroissant', () => {
    const top = treasury.top10Sorties;
    expect(top.length).toBeGreaterThan(0);
    for (let i = 1; i < top.length; i++) {
      expect(top[i - 1].montant).toBeGreaterThanOrEqual(top[i].montant);
    }
  });

  it('maximum 10 éléments dans chaque top', () => {
    expect(treasury.top10Entrees.length).toBeLessThanOrEqual(10);
    expect(treasury.top10Sorties.length).toBeLessThanOrEqual(10);
  });
});

describe('computeTreasury — filterByPeriod', () => {
  it('filtre "annee" retourne toute la courbe', () => {
    const full = treasury.filterByPeriod(treasury.dailyCurve, 'annee');
    expect(full.length).toBe(treasury.dailyCurve.length);
  });

  it('filtre "t1" retourne moins de points que "annee"', () => {
    const t1 = treasury.filterByPeriod(treasury.dailyCurve, 't1');
    expect(t1.length).toBeLessThan(treasury.dailyCurve.length);
    expect(t1.length).toBeGreaterThan(0);
  });

  it('filtre "s1" ≈ filtre "t1" + filtre "t2"', () => {
    const s1 = treasury.filterByPeriod(treasury.dailyCurve, 's1');
    const t1 = treasury.filterByPeriod(treasury.dailyCurve, 't1');
    const t2 = treasury.filterByPeriod(treasury.dailyCurve, 't2');
    expect(s1.length).toBe(t1.length + t2.length);
  });
});

describe('aggregateTreasuryByGranularity', () => {
  it.each(['semaine', 'mois', 'trimestre', 'semestre'])(
    'granularité "%s" : la somme des entrées/sorties agrégées = somme quotidienne',
    (granularity) => {
      const totalEntreesQuotidien = treasury.dailyCurve.reduce((s, d) => s + d.entrees, 0);
      const totalSortiesQuotidien = treasury.dailyCurve.reduce((s, d) => s + d.sorties, 0);
      const buckets = aggregateTreasuryByGranularity(treasury.dailyCurve, granularity);
      expect(buckets.length).toBeGreaterThan(0);

      const sumEntrees = buckets.reduce((s, b) => s + b.entrees, 0);
      const sumSorties = buckets.reduce((s, b) => s + b.sorties, 0);
      expect(sumEntrees).toBeCloseTo(totalEntreesQuotidien, 1);
      expect(sumSorties).toBeCloseTo(totalSortiesQuotidien, 1);
    }
  );

  it('granularité "semaine" : le solde de chaque bucket = solde du dernier jour inclus', () => {
    const buckets = aggregateTreasuryByGranularity(treasury.dailyCurve, 'semaine');
    const chunkSize = 7;
    buckets.forEach((bucket, i) => {
      const lastDayIdx = Math.min((i + 1) * chunkSize, treasury.dailyCurve.length) - 1;
      expect(bucket.solde).toBeCloseTo(treasury.dailyCurve[lastDayIdx].solde, 2);
    });
  });

  it('granularité "mois" produit au plus 12 buckets pour un exercice annuel', () => {
    const buckets = aggregateTreasuryByGranularity(treasury.dailyCurve, 'mois');
    expect(buckets.length).toBeLessThanOrEqual(12);
  });

  it('granularité "trimestre" produit au plus 4 buckets', () => {
    const buckets = aggregateTreasuryByGranularity(treasury.dailyCurve, 'trimestre');
    expect(buckets.length).toBeLessThanOrEqual(4);
  });

  it('granularité "semestre" produit au plus 2 buckets', () => {
    const buckets = aggregateTreasuryByGranularity(treasury.dailyCurve, 'semestre');
    expect(buckets.length).toBeLessThanOrEqual(2);
  });

  it('courbe vide → tableau vide', () => {
    expect(aggregateTreasuryByGranularity([], 'mois')).toEqual([]);
  });
});

describe('getTreasuryEntries', () => {
  it('exclut les écritures ANC du résultat', () => {
    const result = getTreasuryEntries(parsedFec, ['53000000']);
    expect(result.every((e) => e.journalCode !== 'ANC')).toBe(true);
  });

  it('un compte sans mouvement (uniquement ANC) ne produit aucune écriture', () => {
    // 51400000 n'a que 2 écritures ANC dans le FEC de démo, aucun mouvement
    const result = getTreasuryEntries(parsedFec, ['51400000']);
    expect(result).toEqual([]);
  });

  it('le solde cumulé d\'un compte est amorcé par son solde ANC, puis incrémenté par ses mouvements', () => {
    // 53000000 : ANC 29,49 ; puis débit 200 (RETRAIT) ; puis crédit 30,93 (TIMBRES)
    const result = getTreasuryEntries(parsedFec, ['53000000']);
    expect(result.length).toBe(2);
    expect(result[0].soldeCumule).toBeCloseTo(229.49, 2);
    expect(result[1].soldeCumule).toBeCloseTo(198.56, 2);
  });

  it('aucun compte sélectionné ne produit aucune écriture', () => {
    expect(getTreasuryEntries(parsedFec, [])).toEqual([]);
  });

  it('le solde cumulé d\'un compte n\'est jamais mélangé avec celui d\'un autre compte', () => {
    const combined = getTreasuryEntries(parsedFec, ['51211000', '53000000']);
    const isolated53 = getTreasuryEntries(parsedFec, ['53000000']);

    const combined53 = combined
      .filter((e) => e.compteNum === '53000000')
      .sort((a, b) => a.ecritureDate - b.ecritureDate);

    expect(combined53.map((e) => e.soldeCumule)).toEqual(isolated53.map((e) => e.soldeCumule));
  });
});

describe('computeTreasury — entries pré-filtrées (sélection de comptes)', () => {
  it('restreindre les entries à un seul compte donne un soldeActuel cohérent avec getTreasuryEntries', () => {
    const filteredEntries = parsedFec.entries.filter((e) => e.compteNum === '53000000');
    const treasury53 = computeTreasury({ ...parsedFec, entries: filteredEntries });

    const treasuryEntries53 = getTreasuryEntries(parsedFec, ['53000000']);
    const lastSolde = treasuryEntries53[treasuryEntries53.length - 1].soldeCumule;

    expect(treasury53.soldeActuel).toBeCloseTo(lastSolde, 2);
  });
});

describe('computeTreasury — passage heure d\'été/hiver (régression)', () => {
  // Le FEC de démo contient des mouvements de trésorerie datés entre fin mars
  // et fin octobre (période CEST en France). Une boucle journalière qui avance
  // de 86 400 000 ms au lieu d'un jour calendaire perdrait ces écritures.
  const DEMO_FEC_PATH = resolve(__dirname, '../../public/demo/demo_fec.csv');

  function buildDemoParsedFec() {
    const buf = readFileSync(DEMO_FEC_PATH);
    const raw = parseFecSync(
      buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
      'DEMOFEC20241231.csv'
    );
    const closingDate = new Date(2024, 11, 31);
    const exerciceStart = detectExerciceStart(raw.entries, closingDate);
    const exerciceMonths = buildExerciceMonths(exerciceStart, closingDate);
    return { ...raw, exerciceEnd: closingDate, exerciceStart, exerciceMonths };
  }

  it('soldeActuel inclut les mouvements datés en heure d\'été (avril à octobre)', () => {
    const demoFec = buildDemoParsedFec();
    // 51212000 (Livret) a des mouvements en février, mars, avril, mai et juillet 2024
    const filteredEntries = demoFec.entries.filter((e) => e.compteNum === '51212000');
    const treasury = computeTreasury({ ...demoFec, entries: filteredEntries });

    const treasuryEntries = getTreasuryEntries(demoFec, ['51212000']);
    const trueFinalSolde = treasuryEntries[treasuryEntries.length - 1].soldeCumule;

    expect(treasury.soldeActuel).toBeCloseTo(trueFinalSolde, 2);
  });

  it('le nombre de points de la courbe couvre bien toute l\'année 2024 (366 jours, bissextile)', () => {
    const demoFec = buildDemoParsedFec();
    const treasury = computeTreasury(demoFec);
    expect(treasury.dailyCurve.length).toBe(366);
  });
});
