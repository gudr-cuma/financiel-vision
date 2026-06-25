import { describe, it, expect } from 'vitest';
import { computeControles } from '../engine/computeControles';

function fec(entries) {
  return { entries };
}

describe('computeControles — pas de FEC', () => {
  it('renvoie un tableau vide si parsedFec est absent', () => {
    expect(computeControles(null, null)).toEqual([]);
  });
});

describe('computeControles — Capital social', () => {
  it('statut ok quand les deux comptes sont égaux', () => {
    const parsedFec = fec([
      { compteNum: '10121000', compteLib: 'Capital souscrit appelé', journalCode: 'OD', debit: 0, credit: 250000 },
      { compteNum: '45620000', compteLib: 'Associés - apports', journalCode: 'OD', debit: 250000, credit: 0 },
    ]);
    const [capitalSocial] = computeControles(parsedFec, null);
    expect(capitalSocial.status).toBe('ok');
    expect(capitalSocial.valueA).toBe(250000);
    expect(capitalSocial.valueB).toBe(250000);
    expect(capitalSocial.ecart).toBe(0);
  });

  it('statut ko avec écart au-delà de la tolérance', () => {
    const parsedFec = fec([
      { compteNum: '10121000', compteLib: 'Capital souscrit appelé', journalCode: 'OD', debit: 0, credit: 250000 },
      { compteNum: '45620000', compteLib: 'Associés - apports', journalCode: 'OD', debit: 235000, credit: 0 },
    ]);
    const [capitalSocial] = computeControles(parsedFec, null);
    expect(capitalSocial.status).toBe('ko');
    expect(capitalSocial.ecart).toBe(15000);
  });

  it('statut neutral quand les deux comptes sont absents du FEC', () => {
    const parsedFec = fec([
      { compteNum: '512000', compteLib: 'Banque', journalCode: 'OD', debit: 1000, credit: 0 },
    ]);
    const [capitalSocial] = computeControles(parsedFec, null);
    expect(capitalSocial.status).toBe('neutral');
    expect(capitalSocial.valueA).toBe(0);
    expect(capitalSocial.valueB).toBe(0);
    expect(typeof capitalSocial.neutralMessage).toBe('string');
  });
});

describe('computeControles — Emprunts', () => {
  const entries164 = [
    { compteNum: '16410000', compteLib: 'Emprunts auprès des établissements de crédit', journalCode: 'OD', debit: 0, credit: 5000 },
  ];
  const exploitationData = {
    emprunts: [{ nEmprunt: '001', situation: 4 }],
    lignesEmprunt: [{ nEmprunt: '001', exercice: '2024', nLigne: 1, mtRestantDuReel: 5000 }],
  };

  it('statut ok quand le widget Emprunts et les comptes 164 concordent', () => {
    const parsedFec = fec(entries164);
    const [, emprunts] = computeControles(parsedFec, exploitationData);
    expect(emprunts.status).toBe('ok');
    expect(emprunts.valueA).toBe(5000);
    expect(emprunts.valueB).toBe(5000);
  });

  it('statut ko quand le widget Emprunts et les comptes 164 diffèrent', () => {
    const parsedFec = fec([
      { compteNum: '16410000', compteLib: 'Emprunts', journalCode: 'OD', debit: 0, credit: 4000 },
    ]);
    const [, emprunts] = computeControles(parsedFec, exploitationData);
    expect(emprunts.status).toBe('ko');
    expect(emprunts.ecart).toBe(1000);
  });

  it("statut neutral quand l'Export Multi n'est pas chargé", () => {
    const parsedFec = fec(entries164);
    const [, emprunts] = computeControles(parsedFec, null);
    expect(emprunts.status).toBe('neutral');
  });

  it('statut neutral (message différent) quand ni le widget ni les comptes 164 ne portent de montant', () => {
    const parsedFec = fec([
      { compteNum: '512000', compteLib: 'Banque', journalCode: 'OD', debit: 1000, credit: 0 },
    ]);
    const exploitationDataVide = { emprunts: [], lignesEmprunt: [] };
    const [, sansExport] = computeControles(parsedFec, null);
    const [, sansDonnees] = computeControles(parsedFec, exploitationDataVide);
    expect(sansExport.status).toBe('neutral');
    expect(sansDonnees.status).toBe('neutral');
    expect(sansDonnees.neutralMessage).not.toBe(sansExport.neutralMessage);
  });
});

describe('computeControles — Comptable', () => {
  it('statut ok quand le total des débits égale le total des crédits', () => {
    const parsedFec = fec([
      { compteNum: '10121000', compteLib: 'Capital', journalCode: 'OD', debit: 0, credit: 250000 },
      { compteNum: '45620000', compteLib: 'Associés', journalCode: 'OD', debit: 250000, credit: 0 },
    ]);
    const [, , comptable] = computeControles(parsedFec, null);
    expect(comptable.status).toBe('ok');
    expect(comptable.valueA).toBe(250000);
    expect(comptable.valueB).toBe(250000);
  });

  it('statut ok dans la tolérance de 0,01 €', () => {
    const parsedFec = fec([
      { compteNum: '601000', compteLib: 'Achats', journalCode: 'OD', debit: 1000.005, credit: 0 },
      { compteNum: '512000', compteLib: 'Banque', journalCode: 'OD', debit: 0, credit: 1000 },
    ]);
    const [, , comptable] = computeControles(parsedFec, null);
    expect(comptable.status).toBe('ok');
  });

  it('statut ko au-delà de la tolérance', () => {
    const parsedFec = fec([
      { compteNum: '601000', compteLib: 'Achats', journalCode: 'OD', debit: 1000, credit: 0 },
      { compteNum: '512000', compteLib: 'Banque', journalCode: 'OD', debit: 0, credit: 900 },
    ]);
    const [, , comptable] = computeControles(parsedFec, null);
    expect(comptable.status).toBe('ko');
    expect(comptable.ecart).toBe(100);
  });

  it('statut neutral quand le FEC ne contient aucune écriture', () => {
    const parsedFec = fec([]);
    const [, , comptable] = computeControles(parsedFec, null);
    expect(comptable.status).toBe('neutral');
  });
});
