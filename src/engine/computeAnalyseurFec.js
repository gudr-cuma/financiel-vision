/**
 * Moteur d'analyse qualité du FEC — Article A47 A-1 du Livre des Procédures Fiscales.
 *
 * Score sur 100 points :
 *   - Conformité réglementaire  : 30 pts (18 champs obligatoires)
 *   - Équilibre comptable        : 25 pts (Débit = Crédit global)
 *   - Qualité des libellés       : 25 pts (libellés exploitables)
 *   - Traçabilité pièces         : 20 pts (PieceRef renseignées)
 *
 * Anomalies :
 *   Critiques  — Doublons de ligne (risque de rejet fiscal DGFiP)
 *   Majeures   — Comptes hors PCG, montants > 1 000 000 €
 *   Mineures   — Libellés trop courts, références de pièces manquantes
 */

// Journaux exclus du contrôle doublons et traçabilité
const JOURNAUX_EXCLUS = ['OD', 'ODY', 'ODA', 'ND2', 'NDF'];

// ---------------------------------------------------------------------------
// Score
// ---------------------------------------------------------------------------

function calcScoreConformite(parsedFec) {
  // parsedFec a réussi → les 18 champs sont présents (validation dans parseFec.js)
  return { score: 30, detail: '18/18 champs présents (article A47 A-1)' };
}

function calcScoreEquilibre(entries) {
  let debit = 0, credit = 0;
  for (const e of entries) { debit += e.debit; credit += e.credit; }
  const ecart = Math.abs(debit - credit);
  const ok = ecart < 0.05;
  return { score: ok ? 25 : Math.max(0, Math.round(25 - ecart / 1000)), isBalanced: ok, totalDebit: debit, totalCredit: credit, ecart };
}

function calcScoreLibelles(entries) {
  if (entries.length === 0) return { score: 25, pct: 100 };
  const bons = entries.filter(e => e.ecritureLib && e.ecritureLib.trim().length > 1).length;
  const pct = (bons / entries.length) * 100;
  return { score: Math.round((bons / entries.length) * 25), pct: Math.round(pct * 10) / 10 };
}

function calcScoreTracabilite(entries) {
  const hors = entries.filter(e => !JOURNAUX_EXCLUS.includes(e.journalCode));
  if (hors.length === 0) return { score: 20, pct: 100 };
  const avecRef = hors.filter(e => e.pieceRef && e.pieceRef.trim().length > 0).length;
  const pct = (avecRef / hors.length) * 100;
  return { score: Math.round((avecRef / hors.length) * 20), pct: Math.round(pct * 10) / 10 };
}

// ---------------------------------------------------------------------------
// Anomalies
// ---------------------------------------------------------------------------

function detectDoublons(entries) {
  const seen = new Map();
  const anomalies = [];
  entries.forEach((e, idx) => {
    if (JOURNAUX_EXCLUS.includes(e.journalCode)) return;
    if (!e.pieceRef || e.pieceRef.trim() === '') return;
    const key = [e.ecritureNum, e.compteNum, e.pieceRef, e.debit, e.credit, e.dateLet ?? '', e.ecritureLib].join('|');
    if (seen.has(key)) {
      anomalies.push({ ligne: idx + 2, type: 'Doublon de ligne complète', journal: e.journalCode, ecriture: e.ecritureNum, compte: e.compteNum, piece: e.pieceRef, impact: 'Risque de rejet fiscal' });
    } else {
      seen.set(key, idx + 2);
    }
  });
  return anomalies;
}

function detectComptesNonConformes(entries) {
  const anomalies = [];
  const vus = new Set();
  entries.forEach((e, idx) => {
    const c = String(e.compteNum ?? '').trim();
    const key = `${idx}_${c}`;
    if (!vus.has(key) && (c.length < 6 || c.length > 8)) {
      vus.add(key);
      anomalies.push({ ligne: idx + 2, type: 'Compte non conforme au PCG', journal: e.journalCode, ecriture: e.ecritureNum, compte: e.compteNum, piece: e.pieceRef, impact: 'Non-conformité' });
    }
  });
  return anomalies;
}

function detectMontantsEleves(entries) {
  const SEUIL = 1_000_000;
  return entries
    .map((e, idx) => ({ e, idx }))
    .filter(({ e }) => e.debit > SEUIL || e.credit > SEUIL)
    .map(({ e, idx }) => ({
      ligne: idx + 2,
      type: 'Montant anormalement élevé',
      journal: e.journalCode,
      ecriture: e.ecritureNum,
      compte: e.compteNum,
      piece: e.pieceRef,
      impact: 'Vérification requise',
    }));
}

function detectLibellesCourts(entries) {
  return entries
    .map((e, idx) => ({ e, idx }))
    .filter(({ e }) => e.ecritureLib && e.ecritureLib.trim().length === 1)
    .map(({ e, idx }) => ({
      ligne: idx + 2,
      type: 'Libellé trop court',
      journal: e.journalCode,
      ecriture: e.ecritureNum,
      compte: e.compteNum,
      piece: e.pieceRef,
      impact: 'Traçabilité réduite',
    }));
}

function detectRefManquantes(entries) {
  return entries
    .map((e, idx) => ({ e, idx }))
    .filter(({ e }) => !JOURNAUX_EXCLUS.includes(e.journalCode) && (!e.pieceRef || e.pieceRef.trim() === ''))
    .map(({ e, idx }) => ({
      ligne: idx + 2,
      type: 'Référence de pièce manquante',
      journal: e.journalCode,
      ecriture: e.ecritureNum,
      compte: e.compteNum,
      piece: '',
      impact: 'Documentation incomplète',
    }));
}

// ---------------------------------------------------------------------------
// Balance par journal
// ---------------------------------------------------------------------------

function buildBalanceJournaux(entries) {
  const map = {};
  for (const e of entries) {
    if (!map[e.journalCode]) {
      map[e.journalCode] = { code: e.journalCode, label: e.journalLib || e.journalCode, debit: 0, credit: 0 };
    }
    map[e.journalCode].debit += e.debit;
    map[e.journalCode].credit += e.credit;
  }
  return Object.values(map)
    .map(j => ({ ...j, solde: j.debit - j.credit, equilibre: Math.abs(j.debit - j.credit) < 0.05 }))
    .sort((a, b) => a.code.localeCompare(b.code));
}

// ---------------------------------------------------------------------------
// Export principal
// ---------------------------------------------------------------------------

export function computeAnalyseurFec(parsedFec) {
  const { entries, fileName } = parsedFec;

  const conformite = calcScoreConformite(parsedFec);
  const equilibre  = calcScoreEquilibre(entries);
  const libelles   = calcScoreLibelles(entries);
  const tracabilite = calcScoreTracabilite(entries);

  const scoreTotal = Math.min(100,
    conformite.score + equilibre.score + libelles.score + tracabilite.score
  );

  const scoreLabel =
    scoreTotal >= 90 ? 'EXCELLENT' :
    scoreTotal >= 75 ? 'BON' :
    scoreTotal >= 50 ? 'MOYEN' : 'INSUFFISANT';

  const anomaliesCritiques = detectDoublons(entries);
  const anomaliesMajeures  = [
    ...detectComptesNonConformes(entries),
    ...detectMontantsEleves(entries),
  ];
  const anomaliesMineures  = [
    ...detectLibellesCourts(entries),
    ...detectRefManquantes(entries),
  ];

  const balanceJournaux = buildBalanceJournaux(entries);
  const nbComptes = new Set(entries.map(e => e.compteNum)).size;

  return {
    fileName,
    generatedAt: new Date(),
    scoreTotal,
    scoreLabel,
    scores: {
      conformite: { ...conformite, max: 30, label: 'Conformité Réglementaire' },
      equilibre:  { ...equilibre,  max: 25, label: 'Équilibre Comptable' },
      libelles:   { ...libelles,   max: 25, label: 'Qualité des Libellés' },
      tracabilite:{ ...tracabilite,max: 20, label: 'Traçabilité Pièces' },
    },
    stats: {
      nbEntries: entries.length,
      nbComptes,
      isBalanced: equilibre.isBalanced,
      totalDebit: equilibre.totalDebit,
      totalCredit: equilibre.totalCredit,
      conformite: '18/18',
    },
    anomaliesCritiques,
    anomaliesMajeures,
    anomaliesMineures,
    balanceJournaux,
  };
}
