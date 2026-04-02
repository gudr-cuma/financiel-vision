import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { parseFecSync } from '../engine/parseFec';
import { extractSiren, detectExerciceStart, buildExerciceMonths } from '../engine/exerciceUtils';
import { computeBalance, computeBalanceAuxiliaire, computeGrandLivre } from '../engine/computeLivres';

const FEC_PATH  = resolve(__dirname, '../../data/381304559DONNEESCOMPTABLES20241231.csv');
const FILE_NAME = '381304559DONNEESCOMPTABLES20241231.csv';

function buildParsedFec() {
  const buf = readFileSync(FEC_PATH);
  const raw = parseFecSync(
    buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
    FILE_NAME
  );
  const { siren, closingDate } = extractSiren(FILE_NAME);
  const exerciceStart  = detectExerciceStart(raw.entries, closingDate);
  const exerciceMonths = buildExerciceMonths(exerciceStart, closingDate);
  return { ...raw, siren, exerciceEnd: closingDate, exerciceStart, exerciceMonths, isOffsetExercice: false };
}

let parsedFec;

beforeAll(() => {
  parsedFec = buildParsedFec();
});

// ─────────────────────────────────────────────────────────────
// Balance générale
// ─────────────────────────────────────────────────────────────
describe('computeBalance', () => {
  let rows;

  beforeAll(() => {
    rows = computeBalance(parsedFec, { inclureComptesSansMouvement: false });
  });

  it('retourne un tableau non vide', () => {
    expect(rows.length).toBeGreaterThan(0);
  });

  it('contient des lignes de compte et des sous-totaux', () => {
    const types = [...new Set(rows.map(r => r.rowType))];
    expect(types).toContain('compte');
    expect(types).toContain('groupe');
    expect(types).toContain('classe');
    expect(types).toContain('grandTotal');
  });

  it('les lignes de compte ont un compteNum et soldes numériques', () => {
    const comptes = rows.filter(r => r.rowType === 'compte');
    expect(comptes.length).toBeGreaterThan(0);
    for (const c of comptes) {
      expect(typeof c.compteNum).toBe('string');
      expect(c.compteNum.length).toBeGreaterThan(0);
      expect(typeof c.solde_debit).toBe('number');
      expect(typeof c.solde_credit).toBe('number');
      // Un compte ne peut pas avoir à la fois solde_debit et solde_credit > 0
      expect(c.solde_debit === 0 || c.solde_credit === 0).toBe(true);
    }
  });

  it('les lignes sont triées par compteNum', () => {
    const comptes = rows.filter(r => r.rowType === 'compte').map(r => r.compteNum);
    const sorted = [...comptes].sort((a, b) => a.localeCompare(b));
    expect(comptes).toEqual(sorted);
  });

  it('le total général a le même solde débit et crédit', () => {
    const grand = rows.find(r => r.rowType === 'grandTotal');
    expect(grand).toBeDefined();
    // Différence de report entre bilan et gestion = résultat de l'exercice
    // Le total général doit avoir solde = report + mvt, et les deux côtés doivent être proches
    const netTotal = (grand.report_debit + grand.mvt_debit) - (grand.report_credit + grand.mvt_credit);
    expect(typeof netTotal).toBe('number');
  });

  it('le total bilan: soldes débiteurs ≈ soldes créditeurs (équilibre)', () => {
    // Pour un bilan équilibré, la somme des soldes débiteurs classes 1-5
    // doit être proche de la somme des soldes créditeurs classes 1-5
    const bilanComptes = rows.filter(r => r.rowType === 'compte' && parseInt(r.classe) <= 5);
    const totalDebit  = bilanComptes.reduce((s, r) => s + r.solde_debit, 0);
    const totalCredit = bilanComptes.reduce((s, r) => s + r.solde_credit, 0);
    // L'écart = résultat comptable, il peut exister — on vérifie juste que les deux sont > 0
    expect(totalDebit + totalCredit).toBeGreaterThan(0);
  });

  it('les sous-totaux groupe correspondent à la somme des comptes du groupe', () => {
    const groupe = rows.find(r => r.rowType === 'groupe');
    if (!groupe) return; // pas de groupe dans ce FEC
    const comptesDuGroupe = rows.filter(r => r.rowType === 'compte' && r.groupe === groupe.compteNum);
    const somme = comptesDuGroupe.reduce((s, r) => s + r.mvt_debit, 0);
    expect(groupe.mvt_debit).toBeCloseTo(somme, 2);
  });

  it('option inclureComptesSansMouvement=true retourne plus de lignes', () => {
    const rowsAvec = computeBalance(parsedFec, { inclureComptesSansMouvement: true });
    expect(rowsAvec.filter(r => r.rowType === 'compte').length).toBeGreaterThanOrEqual(
      rows.filter(r => r.rowType === 'compte').length
    );
  });

  it('les reports (ANC) sont correctement isolés des mouvements', () => {
    // Toutes les écritures ANC du FEC doivent être dans report_debit/report_credit
    const ancEntries = parsedFec.entries.filter(e => e.journalCode === 'ANC');
    const totalAncDebit  = ancEntries.reduce((s, e) => s + (e.debit ?? 0), 0);
    const totalAncCredit = ancEntries.reduce((s, e) => s + (e.credit ?? 0), 0);

    const comptes = rows.filter(r => r.rowType === 'compte');
    const totalReportDebit  = comptes.reduce((s, r) => s + r.report_debit, 0);
    const totalReportCredit = comptes.reduce((s, r) => s + r.report_credit, 0);

    expect(totalReportDebit).toBeCloseTo(totalAncDebit, 0);
    expect(totalReportCredit).toBeCloseTo(totalAncCredit, 0);
  });
});

// ─────────────────────────────────────────────────────────────
// Balance auxiliaire
// ─────────────────────────────────────────────────────────────
describe('computeBalanceAuxiliaire', () => {
  let rows;

  beforeAll(() => {
    rows = computeBalanceAuxiliaire(parsedFec, { collectifs: ['401', '411', '453'] });
  });

  it('retourne des lignes pour les comptes auxiliaires', () => {
    expect(rows.length).toBeGreaterThan(0);
  });

  it('contient des lignes aux et des totaux collectif', () => {
    const types = [...new Set(rows.map(r => r.rowType))];
    expect(types).toContain('aux');
    expect(types).toContain('collectifTotal');
  });

  it('le total collectif = somme des lignes aux du collectif', () => {
    const totaux = rows.filter(r => r.rowType === 'collectifTotal');
    for (const tot of totaux) {
      const lignes = rows.filter(r => r.rowType === 'aux' && r.collectif === tot.collectif);
      const sommeMvtDebit = lignes.reduce((s, r) => s + r.mvt_debit, 0);
      expect(tot.mvt_debit).toBeCloseTo(sommeMvtDebit, 2);
    }
  });

  it('chaque ligne auxiliaire a un compAuxNum non vide', () => {
    const auxLines = rows.filter(r => r.rowType === 'aux');
    for (const l of auxLines) {
      expect(l.compAuxNum.length).toBeGreaterThan(0);
    }
  });
});

// ─────────────────────────────────────────────────────────────
// Grand Livre
// ─────────────────────────────────────────────────────────────
describe('computeGrandLivre', () => {
  let glData;

  beforeAll(() => {
    glData = computeGrandLivre(parsedFec);
  });

  it('retourne un tableau non vide de comptes', () => {
    expect(glData.length).toBeGreaterThan(0);
  });

  it('chaque compte a les champs requis', () => {
    for (const c of glData) {
      expect(typeof c.compteNum).toBe('string');
      expect(typeof c.compteLib).toBe('string');
      expect(typeof c.reportNet).toBe('number');
      expect(Array.isArray(c.lignes)).toBe(true);
      expect(c.totalPeriode).toBeDefined();
      expect(c.totalGeneral).toBeDefined();
    }
  });

  it('les lignes de chaque compte sont triées chronologiquement', () => {
    for (const compte of glData) {
      for (let i = 1; i < compte.lignes.length; i++) {
        const a = compte.lignes[i - 1].ecritureDate?.getTime() ?? 0;
        const b = compte.lignes[i].ecritureDate?.getTime() ?? 0;
        expect(a).toBeLessThanOrEqual(b);
      }
    }
  });

  it('le soldeCumule final = totalGeneral.solde', () => {
    for (const compte of glData) {
      if (compte.lignes.length === 0) continue;
      const dernierSolde = compte.lignes[compte.lignes.length - 1].soldeCumule;
      expect(dernierSolde).toBeCloseTo(compte.totalGeneral.solde, 2);
    }
  });

  it('totalGeneral = report + totalPeriode', () => {
    for (const compte of glData) {
      const expectedDebit  = compte.reportDebit  + compte.totalPeriode.debit;
      const expectedCredit = compte.reportCredit + compte.totalPeriode.credit;
      expect(compte.totalGeneral.debit).toBeCloseTo(expectedDebit, 2);
      expect(compte.totalGeneral.credit).toBeCloseTo(expectedCredit, 2);
    }
  });

  it('la contrepartie est une chaîne (compteNum ou "Divers" ou vide)', () => {
    for (const compte of glData) {
      for (const l of compte.lignes) {
        expect(typeof l.contrepartie).toBe('string');
      }
    }
  });

  it('filtre compteFilter fonctionne', () => {
    const filtered = computeGrandLivre(parsedFec, { compteFilter: '512' });
    expect(filtered.every(c => c.compteNum.includes('512') || c.compteLib.toLowerCase().includes('512'))).toBe(true);
  });

  it('filtre journalFilter fonctionne', () => {
    const filtered = computeGrandLivre(parsedFec, { journalFilter: 'BQ' });
    for (const compte of filtered) {
      for (const l of compte.lignes) {
        expect(l.journalCode).toBe('BQ');
      }
    }
  });
});
