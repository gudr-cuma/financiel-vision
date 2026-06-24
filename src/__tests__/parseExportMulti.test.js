import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { headerToKey, parseExportMultiBuffer } from '../engine/parseExportMulti';

const SHEET_NAMES = ['Emprunts', 'Lignes', 'I1', 'I2', 'Capital_Social', 'Materiels', 'Synthese'];

function buildWorkbook({ omit = [] } = {}) {
  const wb = XLSX.utils.book_new();

  if (!omit.includes('Emprunts')) {
    const ws = XLSX.utils.aoa_to_sheet([
      ['N. Emprunt', 'Designation', 'Montant', 'Date Realisation', '1ere Echeance', 'Banque', 'Categorie'],
      ['006', '835 / TON06-TON07', 42500, new Date(2007, 0, 15), new Date(2007, 5, 1), 'BA', 'AGIL'],
      ['007', '975 / CHA02', 7300, new Date(2007, 3, 10), new Date(2007, 9, 1), 'BA', 'AGIL'],
    ]);
    XLSX.utils.book_append_sheet(wb, ws, 'Emprunts');
  }

  if (!omit.includes('Lignes')) {
    const ws = XLSX.utils.aoa_to_sheet([
      ['N. Emprunt', 'N. Ligne', 'Type (P/R)', 'Exercice', 'Eco - Mt Lineaire'],
      ['006', 1, 'R', '2007', 100.5],
    ]);
    XLSX.utils.book_append_sheet(wb, ws, 'Lignes');
  }

  if (!omit.includes('I1')) {
    const ws = XLSX.utils.aoa_to_sheet([
      ['N. Bien', 'Libelle', 'Date Effet Amort', 'Axe 1', 'Duree (mois)'],
      [166, 'EPANDAGE', new Date(2025, 0, 1), 'TON09', 12],
    ]);
    XLSX.utils.book_append_sheet(wb, ws, 'I1');
  }

  if (!omit.includes('I2')) {
    const ws = XLSX.utils.aoa_to_sheet([
      ['N. Bien', 'Eco - Mt Lineaire'],
      [166, 845.68],
    ]);
    XLSX.utils.book_append_sheet(wb, ws, 'I2');
  }

  if (!omit.includes('Capital_Social')) {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Base Souscription', 'Adherent', 'Montant'],
      ['00000', 'A0000001', 1928],
    ]);
    XLSX.utils.book_append_sheet(wb, ws, 'Capital_Social');
  }

  if (!omit.includes('Materiels')) {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Code Materiel', 'Libelle', 'Marque', 'Date Achat'],
      [2, 'SEMOIR A MAIS', 'NODETGO', new Date(1980, 0, 1)],
    ]);
    XLSX.utils.book_append_sheet(wb, ws, 'Materiels');
  }

  if (!omit.includes('Synthese')) {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Rubrique', 'Valeur'],
      ['Dossier', '999001'],
      ['Raison sociale', 'TEST'],
      ['President', null],
      ['Date debut exercice', new Date(2025, 0, 1)],
      ['Solde 10121', null],
    ]);
    XLSX.utils.book_append_sheet(wb, ws, 'Synthese');
  }

  // type: 'array' (pas 'buffer') — c'est le format utilisé en production
  // (file.arrayBuffer()), et le seul qui préserve correctement les noms de
  // feuilles dans l'environnement de test jsdom.
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
}

describe('headerToKey', () => {
  it.each([
    ['N. Emprunt', 'nEmprunt'],
    ['Date Realisation', 'dateRealisation'],
    ['1ere Echeance', 'premiereEcheance'],
    ['Eco - Mt Lineaire', 'ecoMtLineaire'],
    ['Mt Capital Prev', 'mtCapitalPrev'],
    ['Type (P/R)', 'typePR'],
    ['Duree (mois)', 'dureeMois'],
    ['Axe 1', 'axe1'],
  ])('convertit "%s" en "%s"', (header, expected) => {
    expect(headerToKey(header)).toBe(expected);
  });
});

describe('parseExportMultiBuffer', () => {
  it('parse les 6 onglets tabulaires avec le bon nombre de lignes', () => {
    const data = parseExportMultiBuffer(buildWorkbook());
    expect(data.emprunts).toHaveLength(2);
    expect(data.lignesEmprunt).toHaveLength(1);
    expect(data.immobilisations).toHaveLength(1);
    expect(data.immoLignes).toHaveLength(1);
    expect(data.capitalSocial).toHaveLength(1);
    expect(data.materiels).toHaveLength(1);
  });

  it('remappe les en-têtes en clés camelCase', () => {
    const data = parseExportMultiBuffer(buildWorkbook());
    expect(data.emprunts[0]).toMatchObject({ nEmprunt: '006', designation: '835 / TON06-TON07', montant: 42500 });
    expect(data.lignesEmprunt[0]).toMatchObject({ nEmprunt: '006', nLigne: 1, typePR: 'R', ecoMtLineaire: 100.5 });
  });

  it('convertit les colonnes de date en objets Date natifs (cellDates)', () => {
    const data = parseExportMultiBuffer(buildWorkbook());
    expect(data.emprunts[0].dateRealisation).toBeInstanceOf(Date);
    expect(data.emprunts[0].dateRealisation.getFullYear()).toBe(2007);
  });

  it("transforme l'onglet Synthese en objet plat clé/valeur", () => {
    const data = parseExportMultiBuffer(buildWorkbook());
    expect(data.synthese).toEqual({
      dossier: '999001',
      raisonSociale: 'TEST',
      president: null,
      dateDebutExercice: expect.any(Date),
      solde10121: null,
    });
  });

  it('préserve les valeurs null de Synthese plutôt que de les omettre', () => {
    const data = parseExportMultiBuffer(buildWorkbook());
    expect('president' in data.synthese).toBe(true);
    expect(data.synthese.president).toBeNull();
  });

  it.each(SHEET_NAMES)('lève une erreur explicite si la feuille "%s" est absente', (missing) => {
    expect(() => parseExportMultiBuffer(buildWorkbook({ omit: [missing] }))).toThrow(/introuvable/i);
  });
});
