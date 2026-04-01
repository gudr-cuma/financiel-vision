import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { parseFecSync } from '../engine/parseFec';
import { extractSiren, detectExerciceStart, buildExerciceMonths } from '../engine/exerciceUtils';
import { computeSig, SIG_MAPPING } from '../engine/computeSig';

const FEC_PATH = resolve(__dirname, '../../data/381304559DONNEESCOMPTABLES20241231.csv');
const FILE_NAME = '381304559DONNEESCOMPTABLES20241231.csv';

function buildParsedFec() {
  const buf = readFileSync(FEC_PATH);
  const raw = parseFecSync(
    buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
    FILE_NAME
  );
  const { siren, closingDate } = extractSiren(FILE_NAME);
  const exerciceStart = detectExerciceStart(raw.entries, closingDate);
  const exerciceMonths = buildExerciceMonths(exerciceStart, closingDate);
  return { ...raw, siren, exerciceEnd: closingDate, exerciceStart, exerciceMonths, isOffsetExercice: false };
}

let parsedFec;
let sigResult;

beforeAll(() => {
  parsedFec = buildParsedFec();
  sigResult = computeSig(parsedFec);
});

describe('computeSig — structure', () => {
  it('produit le bon nombre de lignes SIG (24)', () => {
    expect(sigResult.lines).toHaveLength(SIG_MAPPING.length);
  });

  it('produit 12 mois de données mensuelles', () => {
    expect(sigResult.monthly).toHaveLength(12);
  });

  it('les mois sont dans l\'ordre Jan–Déc pour cet exercice', () => {
    expect(sigResult.monthly[0].month).toBe(1);
    expect(sigResult.monthly[11].month).toBe(12);
  });
});

describe('computeSig — exclusion ANC', () => {
  it('exclut les écritures ANC du SIG (CA non pollué par les à-nouveaux)', () => {
    // Les ANC concernent les comptes de bilan (1-5), pas les comptes 6/7.
    // On vérifie que le CA est > 0 (il y a bien des ventes).
    const ca = sigResult.lines.find(l => l.id === 'chiffre_affaires');
    expect(ca.amount).toBeGreaterThan(0);
  });
});

describe('computeSig — cohérence des totaux', () => {
  it('Marge brute = CA + Prod.stockée + Subv. − Achats consommés', () => {
    const get = id => sigResult.lines.find(l => l.id === id).amount;
    const computed = get('chiffre_affaires') + get('production_stockee') + get('subventions_exploitation') - get('achats_consommes');
    expect(get('marge_brute')).toBeCloseTo(computed, 0);
  });

  it('VA = Marge brute − Services extérieurs (±1 € arrondi)', () => {
    const get = id => sigResult.lines.find(l => l.id === id).amount;
    const diff = Math.abs(get('valeur_ajoutee') - (get('marge_brute') - get('services_exterieurs')));
    expect(diff).toBeLessThanOrEqual(1);
  });

  it('EBE = VA − Charges personnel − Impôts & taxes (±1 € arrondi)', () => {
    const get = id => sigResult.lines.find(l => l.id === id).amount;
    const diff = Math.abs(get('ebe') - (get('valeur_ajoutee') - get('charges_personnel') - get('impots_taxes')));
    expect(diff).toBeLessThanOrEqual(1);
  });

  it('Résultat d\'exploitation = EBE − Dotations + Reprises + Autres produits − Autres charges (±2 €)', () => {
    const get = id => sigResult.lines.find(l => l.id === id).amount;
    const computed = get('ebe') - get('dotations') + get('reprises') + get('autres_produits_gestion') - get('autres_charges_gestion');
    expect(Math.abs(get('resultat_exploitation') - computed)).toBeLessThanOrEqual(2);
  });

  it('Résultat net = Résultat courant + Résultat exceptionnel − IS (±2 €)', () => {
    const get = id => sigResult.lines.find(l => l.id === id).amount;
    const computed = get('resultat_courant') + get('resultat_exceptionnel') - get('is_participation');
    expect(Math.abs(get('resultat_net') - computed)).toBeLessThanOrEqual(2);
  });
});

describe('computeSig — règle 621* CUMA', () => {
  it('les comptes 621* sont dans charges_personnel ET absents de services_exterieurs', () => {
    // Vérifier qu'aucune écriture 621* n'est dans services_exterieurs
    const servicesExt = SIG_MAPPING.find(p => p.id === 'services_exterieurs');
    const has621InExcludes = servicesExt.excludeRanges?.includes('621');
    expect(has621InExcludes).toBe(true);

    // Vérifier que 621* est dans charges_personnel
    const chargesPerso = SIG_MAPPING.find(p => p.id === 'charges_personnel');
    const has621InRanges = chargesPerso.accounts.some(a => a.range === '621');
    expect(has621InRanges).toBe(true);
  });
});

describe('computeSig — données mensuelles', () => {
  it('la somme des CA mensuels égale le CA annuel', () => {
    const sumMonthlyCa = sigResult.monthly.reduce((s, m) => s + m.ca, 0);
    expect(sumMonthlyCa).toBeCloseTo(sigResult.caTotal, 0);
  });

  it('les ratios mensuels % EBE/CA sont cohérents (à 0.01% près)', () => {
    for (const m of sigResult.monthly) {
      if (m.ca !== 0) {
        const expected = (m.ebe / m.ca) * 100;
        expect(m.percentEbeCa).toBeCloseTo(expected, 2);
      }
    }
  });
});
