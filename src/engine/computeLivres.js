/**
 * computeLivres.js — Balance générale, Balance auxiliaire, Grand Livre
 * Toutes les fonctions sont pures (aucune dépendance React).
 */

// ─────────────────────────────────────────────────────────────
// Helpers internes
// ─────────────────────────────────────────────────────────────

/** Calcule solde_debit / solde_credit à partir du solde net */
function ventilerSolde(net) {
  if (net >= 0) return { solde_debit: net, solde_credit: 0 };
  return { solde_debit: 0, solde_credit: -net };
}

/** Somme deux objets BalanceLine (pour construire les totaux) */
function addLine(a, b) {
  return {
    report_debit:  a.report_debit  + b.report_debit,
    report_credit: a.report_credit + b.report_credit,
    mvt_debit:     a.mvt_debit     + b.mvt_debit,
    mvt_credit:    a.mvt_credit    + b.mvt_credit,
  };
}

function computeSoldes(acc) {
  const net = (acc.report_debit + acc.mvt_debit) - (acc.report_credit + acc.mvt_credit);
  return { ...acc, ...ventilerSolde(net) };
}

// ─────────────────────────────────────────────────────────────
// computeBalance — Balance générale
// ─────────────────────────────────────────────────────────────

/**
 * @param {object} parsedFec
 * @param {{ inclureComptesSansMouvement?: boolean }} options
 * @returns {BalanceLine[]}
 */
export function computeBalance(parsedFec, options = {}) {
  const { inclureComptesSansMouvement = false } = options;
  const entries = parsedFec.entries ?? [];

  // 1. Agréger par compteNum
  const map = new Map(); // compteNum → { compteLib, report_debit, report_credit, mvt_debit, mvt_credit }

  for (const e of entries) {
    if (!e.compteNum) continue;
    let acc = map.get(e.compteNum);
    if (!acc) {
      acc = { compteLib: e.compteLib ?? '', report_debit: 0, report_credit: 0, mvt_debit: 0, mvt_credit: 0 };
      map.set(e.compteNum, acc);
    }
    if (e.journalCode === 'ANC') {
      acc.report_debit  += e.debit  ?? 0;
      acc.report_credit += e.credit ?? 0;
    } else {
      acc.mvt_debit  += e.debit  ?? 0;
      acc.mvt_credit += e.credit ?? 0;
    }
  }

  // 2. Filtrer les comptes sans mouvement si option activée
  let comptes = [...map.entries()]
    .filter(([, acc]) => {
      if (inclureComptesSansMouvement) return true;
      return acc.report_debit !== 0 || acc.report_credit !== 0 || acc.mvt_debit !== 0 || acc.mvt_credit !== 0;
    })
    .sort(([a], [b]) => a.localeCompare(b));

  // 3. Construire les lignes avec sous-totaux
  const rows = [];

  // Groupes actifs (2 premiers chiffres)
  const groupes = [...new Set(comptes.map(([num]) => num.slice(0, 2)))].sort();
  // Classes actives (1er chiffre)
  const classes = [...new Set(comptes.map(([num]) => num[0]))].sort();

  // Totaux par groupe et classe
  const totauxGroupe = new Map();
  const totauxClasse = new Map();
  const totauxCategorie = { bilan: { report_debit:0, report_credit:0, mvt_debit:0, mvt_credit:0 }, gestion: { report_debit:0, report_credit:0, mvt_debit:0, mvt_credit:0 } };
  const totalGeneral   = { report_debit:0, report_credit:0, mvt_debit:0, mvt_credit:0 };

  for (const [num, acc] of comptes) {
    const groupe = num.slice(0, 2);
    const classe = num[0];
    const cat    = parseInt(classe) <= 5 ? 'bilan' : 'gestion';

    const g = totauxGroupe.get(groupe) ?? { report_debit:0, report_credit:0, mvt_debit:0, mvt_credit:0 };
    totauxGroupe.set(groupe, addLine(g, acc));

    const c = totauxClasse.get(classe) ?? { report_debit:0, report_credit:0, mvt_debit:0, mvt_credit:0 };
    totauxClasse.set(classe, addLine(c, acc));

    totauxCategorie[cat] = addLine(totauxCategorie[cat], acc);
    totalGeneral[0] = addLine(totalGeneral[0] ?? { report_debit:0, report_credit:0, mvt_debit:0, mvt_credit:0 }, acc);
    if (!totalGeneral._init) { Object.assign(totalGeneral, acc); totalGeneral._init = true; }
    else { totalGeneral.report_debit  += acc.report_debit; totalGeneral.report_credit += acc.report_credit; totalGeneral.mvt_debit += acc.mvt_debit; totalGeneral.mvt_credit += acc.mvt_credit; }
  }

  // Rebuild totalGeneral properly
  const totGen = { report_debit:0, report_credit:0, mvt_debit:0, mvt_credit:0 };
  for (const [, acc] of comptes) {
    totGen.report_debit  += acc.report_debit;
    totGen.report_credit += acc.report_credit;
    totGen.mvt_debit     += acc.mvt_debit;
    totGen.mvt_credit    += acc.mvt_credit;
  }

  // 4. Émettre les lignes dans l'ordre
  let prevGroupe = null;
  let prevClasse = null;

  for (const [num, acc] of comptes) {
    const groupe = num.slice(0, 2);
    const classe = num[0];

    // Sous-total groupe précédent si on change de groupe
    if (prevGroupe !== null && prevGroupe !== groupe) {
      const g = totauxGroupe.get(prevGroupe);
      rows.push({ rowType: 'groupe', compteNum: prevGroupe, compteLib: `Total groupe ${prevGroupe}`, classe: prevGroupe[0], groupe: prevGroupe, ...computeSoldes(g) });
    }
    // Total classe précédente si on change de classe
    if (prevClasse !== null && prevClasse !== classe) {
      const c = totauxClasse.get(prevClasse);
      rows.push({ rowType: 'classe', compteNum: prevClasse, compteLib: `${parseInt(prevClasse) <= 5 ? '■' : '▲'} Total classe ${prevClasse}`, classe: prevClasse, groupe: prevGroupe, ...computeSoldes(c) });
    }

    const net = (acc.report_debit + acc.mvt_debit) - (acc.report_credit + acc.mvt_credit);
    rows.push({ rowType: 'compte', compteNum: num, compteLib: acc.compteLib, classe, groupe, ...acc, ...ventilerSolde(net) });

    prevGroupe = groupe;
    prevClasse = classe;
  }

  // Dernier groupe et classe
  if (prevGroupe !== null) {
    const g = totauxGroupe.get(prevGroupe);
    rows.push({ rowType: 'groupe', compteNum: prevGroupe, compteLib: `Total groupe ${prevGroupe}`, classe: prevClasse, groupe: prevGroupe, ...computeSoldes(g) });
  }
  if (prevClasse !== null) {
    const c = totauxClasse.get(prevClasse);
    rows.push({ rowType: 'classe', compteNum: prevClasse, compteLib: `${parseInt(prevClasse) <= 5 ? '■' : '▲'} Total classe ${prevClasse}`, classe: prevClasse, groupe: prevGroupe, ...computeSoldes(c) });
  }

  // Total comptes de bilan (classes 1-5)
  rows.push({ rowType: 'bilanTotal', compteNum: '', compteLib: 'Total Comptes de Bilan', classe: '', groupe: '', ...computeSoldes(totauxCategorie.bilan) });

  // Total comptes de gestion (classes 6-9)
  rows.push({ rowType: 'gestionTotal', compteNum: '', compteLib: 'Total Comptes de Gestion', classe: '', groupe: '', ...computeSoldes(totauxCategorie.gestion) });

  // Total général
  rows.push({ rowType: 'grandTotal', compteNum: '', compteLib: 'TOTAL GÉNÉRAL', classe: '', groupe: '', ...computeSoldes(totGen) });

  return rows;
}

// ─────────────────────────────────────────────────────────────
// computeBalanceAuxiliaire — Balance auxiliaire (par CompAuxNum)
// Filtre sur les comptes collectifs passés en paramètre (ex: ['401', '411', '453'])
// ─────────────────────────────────────────────────────────────

/**
 * @param {object} parsedFec
 * @param {{ collectifs?: string[], inclureComptesSansMouvement?: boolean }} options
 * @returns {BalanceAuxLine[]}
 */
export function computeBalanceAuxiliaire(parsedFec, options = {}) {
  const { collectifs = ['401', '411', '453'], inclureComptesSansMouvement = false } = options;
  const entries = parsedFec.entries ?? [];

  // Filtrer les entries qui concernent les collectifs ET ont un CompAuxNum
  const relevant = entries.filter(e => {
    if (!e.compAuxNum) return false;
    return collectifs.some(prefix => e.compteNum?.startsWith(prefix));
  });

  // Agréger par collectif (2-3 premiers chiffres) → compAuxNum
  // Structure : Map<collectifKey, Map<compAuxNum, { compAuxLib, report_debit, report_credit, mvt_debit, mvt_credit }>>
  const collectifMap = new Map(); // collectifKey → { compteLib, auxMap }

  for (const e of relevant) {
    // Trouver le préfixe collectif correspondant
    const collectif = collectifs.find(p => e.compteNum.startsWith(p)) ?? e.compteNum.slice(0, 3);

    let cEntry = collectifMap.get(collectif);
    if (!cEntry) {
      cEntry = { collectifLib: e.compteLib ?? collectif, auxMap: new Map() };
      collectifMap.set(collectif, cEntry);
    }

    let aux = cEntry.auxMap.get(e.compAuxNum);
    if (!aux) {
      aux = { compAuxLib: e.compAuxLib ?? e.compAuxNum, report_debit: 0, report_credit: 0, mvt_debit: 0, mvt_credit: 0 };
      cEntry.auxMap.set(e.compAuxNum, aux);
    }

    if (e.journalCode === 'ANC') {
      aux.report_debit  += e.debit  ?? 0;
      aux.report_credit += e.credit ?? 0;
    } else {
      aux.mvt_debit  += e.debit  ?? 0;
      aux.mvt_credit += e.credit ?? 0;
    }
  }

  const rows = [];

  for (const [collectif, { collectifLib, auxMap }] of [...collectifMap.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const totCollectif = { report_debit:0, report_credit:0, mvt_debit:0, mvt_credit:0 };

    const auxEntries = [...auxMap.entries()]
      .filter(([, acc]) => inclureComptesSansMouvement || (acc.report_debit || acc.report_credit || acc.mvt_debit || acc.mvt_credit))
      .sort(([a], [b]) => a.localeCompare(b));

    for (const [compAuxNum, acc] of auxEntries) {
      totCollectif.report_debit  += acc.report_debit;
      totCollectif.report_credit += acc.report_credit;
      totCollectif.mvt_debit     += acc.mvt_debit;
      totCollectif.mvt_credit    += acc.mvt_credit;

      const net = (acc.report_debit + acc.mvt_debit) - (acc.report_credit + acc.mvt_credit);
      rows.push({ rowType: 'aux', collectif, collectifLib, compAuxNum, compAuxLib: acc.compAuxLib, ...acc, ...ventilerSolde(net) });
    }

    rows.push({ rowType: 'collectifTotal', collectif, collectifLib, compAuxNum: '', compAuxLib: `Total collectif ${collectif}`, ...computeSoldes(totCollectif) });
  }

  return rows;
}

// ─────────────────────────────────────────────────────────────
// buildContrepartieIndex — index ecritureNum → liste compteNum
// ─────────────────────────────────────────────────────────────

function buildContrepartieIndex(entries) {
  const index = new Map(); // ecritureNum → Set<compteNum>
  for (const e of entries) {
    if (!e.ecritureNum || !e.compteNum) continue;
    let s = index.get(e.ecritureNum);
    if (!s) { s = new Set(); index.set(e.ecritureNum, s); }
    s.add(e.compteNum);
  }
  return index;
}

// ─────────────────────────────────────────────────────────────
// computeGrandLivre — Grand Livre général
// ─────────────────────────────────────────────────────────────

/**
 * @param {object} parsedFec
 * @param {{
 *   compteFilter?: string,
 *   journalFilter?: string,
 *   dateFrom?: Date|null,
 *   dateTo?: Date|null,
 *   inclureComptesSansMouvement?: boolean,
 * }} options
 * @returns {GrandLivreCompte[]}
 */
export function computeGrandLivre(parsedFec, options = {}) {
  const {
    compteFilter = '',
    journalFilter = '',
    dateFrom = null,
    dateTo = null,
    inclureComptesSansMouvement = false,
  } = options;

  const entries = parsedFec.entries ?? [];

  // Index contrepartie sur TOUTES les entries (pas filtré)
  const contrepartieIndex = buildContrepartieIndex(entries);

  // Grouper par compteNum : report ANC + écritures de période
  const compteMap = new Map(); // compteNum → { compteLib, reportDebit, reportCredit, lignes[] }

  for (const e of entries) {
    if (!e.compteNum) continue;

    // Filtres compte et journal
    if (compteFilter) {
      const f = compteFilter.toLowerCase();
      if (!e.compteNum.toLowerCase().includes(f) && !(e.compteLib ?? '').toLowerCase().includes(f)) continue;
    }
    if (journalFilter && e.journalCode !== journalFilter) continue;

    let compte = compteMap.get(e.compteNum);
    if (!compte) {
      compte = { compteLib: e.compteLib ?? '', reportDebit: 0, reportCredit: 0, lignes: [] };
      compteMap.set(e.compteNum, compte);
    }

    if (e.journalCode === 'ANC') {
      compte.reportDebit  += e.debit  ?? 0;
      compte.reportCredit += e.credit ?? 0;
      continue; // Les ANC ne sont pas des lignes de mouvement dans le GL
    }

    // Filtre date (après avoir traité les ANC)
    if (dateFrom && e.ecritureDate < dateFrom) continue;
    if (dateTo   && e.ecritureDate > dateTo)   continue;

    // Reconstituer la contrepartie
    const autresComptes = [...(contrepartieIndex.get(e.ecritureNum) ?? [])].filter(c => c !== e.compteNum);
    const contrepartie = autresComptes.length === 0 ? '' : autresComptes.length === 1 ? autresComptes[0] : 'Divers';

    compte.lignes.push({
      journalCode:  e.journalCode,
      ecritureNum:  e.ecritureNum,
      ecritureDate: e.ecritureDate,
      ecritureLib:  e.ecritureLib  ?? '',
      pieceRef:     e.pieceRef     ?? '',
      ecritureLet:  e.ecritureLet  ?? '',
      contrepartie,
      debit:  e.debit  ?? 0,
      credit: e.credit ?? 0,
    });
  }

  const result = [];

  for (const [compteNum, { compteLib, reportDebit, reportCredit, lignes }] of [...compteMap.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    // Filtrer comptes sans mouvement sur la période
    if (!inclureComptesSansMouvement && lignes.length === 0 && reportDebit === 0 && reportCredit === 0) continue;

    // Trier les lignes par date puis numéro d'écriture
    lignes.sort((a, b) => {
      const dt = (a.ecritureDate?.getTime() ?? 0) - (b.ecritureDate?.getTime() ?? 0);
      if (dt !== 0) return dt;
      return (a.ecritureNum ?? '').localeCompare(b.ecritureNum ?? '');
    });

    // Calculer le solde cumulé (report + mouvements)
    const reportNet = reportDebit - reportCredit;
    let soldeCumule = reportNet;
    for (const ligne of lignes) {
      soldeCumule += ligne.debit - ligne.credit;
      ligne.soldeCumule = soldeCumule;
    }

    // Totaux période
    const periodeDebit  = lignes.reduce((s, l) => s + l.debit, 0);
    const periodeCredit = lignes.reduce((s, l) => s + l.credit, 0);
    const periodeSolde  = periodeDebit - periodeCredit;

    // Totaux généraux (report + période)
    const generalDebit  = reportDebit  + periodeDebit;
    const generalCredit = reportCredit + periodeCredit;
    const generalSolde  = generalDebit - generalCredit;

    result.push({
      compteNum,
      compteLib,
      reportDebit,
      reportCredit,
      reportNet,
      lignes,
      totalPeriode:  { debit: periodeDebit,  credit: periodeCredit, solde: periodeSolde },
      totalGeneral:  { debit: generalDebit,  credit: generalCredit, solde: generalSolde },
    });
  }

  return result;
}
