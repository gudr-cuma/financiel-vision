import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { parseFecSync } from '../engine/parseFec';
import { extractSiren, detectExerciceStart, buildExerciceMonths } from '../engine/exerciceUtils';
import { computeBilan } from '../engine/computeBilan';

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
let bilan;

beforeAll(() => {
  parsedFec = buildParsedFec();
  bilan = computeBilan(parsedFec);
});

describe('computeBilan — structure', () => {
  it('produit les 4 sections (actifImmobilise, actifCirculant, capitauxPropres, dettes)', () => {
    expect(bilan.actifImmobilise).toBeDefined();
    expect(bilan.actifCirculant).toBeDefined();
    expect(bilan.capitauxPropres).toBeDefined();
    expect(bilan.dettes).toBeDefined();
  });

  it('totalActif et totalPassif sont des nombres positifs', () => {
    expect(bilan.totalActif).toBeGreaterThan(0);
    expect(bilan.totalPassif).toBeGreaterThan(0);
  });
});

describe('computeBilan — spécificité CUMA 453*', () => {
  it('les comptes 453* sont classés en actif circulant (solde débiteur +188k€)', () => {
    // D\'après l\'analyse : solde net 453* = +188 421 € (débiteur) → actif
    expect(bilan.adherentsEnActif).toBe(true);
    const creances = bilan.actifCirculant['creances_adherents']?.montant ?? 0;
    expect(creances).toBeGreaterThan(0);
  });

  it('le poste dettes_adherents est à 0 quand les adhérents sont en actif', () => {
    const dettesAdh = bilan.dettes['dettes_adherents']?.montant ?? 0;
    expect(dettesAdh).toBe(0);
  });
});

describe('computeBilan — ratios', () => {
  it('tous les 4 ratios sont présents', () => {
    expect(bilan.ratios.fondsRoulement).toBeDefined();
    expect(bilan.ratios.bfr).toBeDefined();
    expect(bilan.ratios.autonomieFinanciere).toBeDefined();
    expect(bilan.ratios.liquiditeGenerale).toBeDefined();
  });

  it('les ratios ont un status vert/orange/red/neutral', () => {
    const statuses = ['green', 'orange', 'red', 'neutral'];
    for (const ratio of Object.values(bilan.ratios)) {
      expect(statuses).toContain(ratio.status);
    }
  });

  it('autonomieFinanciere est un pourcentage entre 0 et 100', () => {
    const af = bilan.ratios.autonomieFinanciere.value;
    expect(af).toBeGreaterThanOrEqual(0);
    expect(af).toBeLessThanOrEqual(100);
  });
});

describe('computeBilan — équilibre', () => {
  it('bilanEquilibre et ecartBilan sont cohérents', () => {
    if (bilan.bilanEquilibre) {
      expect(Math.abs(bilan.ecartBilan)).toBeLessThan(1);
    } else {
      expect(Math.abs(bilan.ecartBilan)).toBeGreaterThanOrEqual(1);
    }
  });
});
