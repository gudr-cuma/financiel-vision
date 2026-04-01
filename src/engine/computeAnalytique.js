/**
 * Moteur de calcul de la comptabilité analytique CUMA.
 *
 * Colonnes du fichier Balance Analytique (ligne 4 = en-têtes, données dès ligne 5) :
 *   A : Analytique  (code analytique = code matériel)
 *   B : Compte      (compte comptable)
 *   C : Libellé compte
 *   D : Libellé écriture
 *   E : Date écriture
 *   F : Report
 *   G : Charge      (montant charge)
 *   H : Produit     (montant produit / facturation)
 *   I : Niv 1       (code niveau 1)
 *   J : Lib niv 1   (libellé du matériel)
 */

import * as XLSX from 'xlsx';

// ---------------------------------------------------------------------------
// Catégories de charges par préfixe de compte
// ---------------------------------------------------------------------------
const CHARGE_CATEGORIES = [
  { id: 'entretien',     label: 'Entretien & réparations', prefixes: ['615'] },
  { id: 'mo',           label: "Main d'œuvre",            prefixes: ['641', '645', '646', '647', '648', '621'] },
  { id: 'carburant',    label: 'Carburant',               prefixes: ['6022', '6023'] },
  { id: 'amortissement',label: 'Amortissements',          prefixes: ['681', '682', '6811', '6812'] },
  { id: 'financier',    label: 'Charges financières',     prefixes: ['661', '66'] },
  { id: 'autres',       label: 'Autres charges',          prefixes: [] }, // fallback
];

function getCatForCompte(compte) {
  const c = String(compte ?? '');
  for (const cat of CHARGE_CATEGORIES) {
    if (cat.id === 'autres') continue;
    if (cat.prefixes.some(p => c.startsWith(p))) return cat.id;
  }
  return 'autres';
}

// ---------------------------------------------------------------------------
// Parsing du fichier XLSX
// ---------------------------------------------------------------------------

/**
 * Parse un ArrayBuffer issu d'un fichier Balance Analytique XLSX.
 * Retourne { rows, error? }
 */
export function parseAnalytique(arrayBuffer) {
  try {
    const wb = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const allRows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, dateNF: 'DD/MM/YYYY' });

    // Trouver la ligne d'en-têtes (contient "Analytique")
    let headerRowIdx = -1;
    for (let i = 0; i < Math.min(allRows.length, 10); i++) {
      if (allRows[i] && String(allRows[i][0]).toLowerCase().includes('analytique')) {
        headerRowIdx = i;
        break;
      }
    }
    if (headerRowIdx === -1) throw new Error('En-têtes introuvables (colonne "Analytique" manquante).');

    const dataRows = allRows.slice(headerRowIdx + 1);

    const rows = dataRows
      .filter(r => r && r.length > 0 && r[0] !== null && r[0] !== undefined && r[0] !== '')
      .map(r => ({
        analytique:   String(r[0] ?? '').trim(),
        compte:       String(r[1] ?? '').trim(),
        libelleCompte:String(r[2] ?? '').trim(),
        libelleEcrit: String(r[3] ?? '').trim(),
        dateEcriture: r[4] ? String(r[4]).trim() : '',
        report:       parseFloat(r[5]) || 0,
        charge:       parseFloat(String(r[6] ?? '').replace(',', '.')) || 0,
        produit:      parseFloat(String(r[7] ?? '').replace(',', '.')) || 0,
        niv1:         String(r[8] ?? '').trim(),
        libNiv1:      String(r[9] ?? '').trim(),
      }));

    return { rows };
  } catch (err) {
    return { rows: [], error: err.message };
  }
}

// ---------------------------------------------------------------------------
// Calculs analytiques
// ---------------------------------------------------------------------------

/**
 * Calcule les indicateurs par code analytique (matériel).
 * @param {object[]} rows
 * @returns {object[]} materiels — tableau trié par résultat décroissant
 */
export function computeAnalytique(rows) {
  const map = {}; // analytique → agrégats

  for (const row of rows) {
    const code = row.analytique;
    if (!map[code]) {
      map[code] = {
        code,
        label: row.libNiv1 || row.libelleCompte || code,
        totalCharge: 0,
        totalProduit: 0,
        // Détail charges par catégorie
        charges: {
          entretien: 0,
          mo: 0,
          carburant: 0,
          amortissement: 0,
          financier: 0,
          autres: 0,
        },
        // Comptes détaillés
        comptes: {},
        // Lignes brutes pour drill-down
        lignes: [],
      };
    }

    const m = map[code];
    m.totalCharge += row.charge;
    m.totalProduit += row.produit;

    if (row.charge > 0) {
      const cat = getCatForCompte(row.compte);
      m.charges[cat] = (m.charges[cat] || 0) + row.charge;

      // Détail par compte
      if (!m.comptes[row.compte]) {
        m.comptes[row.compte] = { label: row.libelleCompte, charge: 0, produit: 0 };
      }
      m.comptes[row.compte].charge += row.charge;
    }

    if (row.produit > 0) {
      if (!m.comptes[row.compte]) {
        m.comptes[row.compte] = { label: row.libelleCompte, charge: 0, produit: 0 };
      }
      m.comptes[row.compte].produit += row.produit;
    }

    m.lignes.push(row);
  }

  // Calculer résultat et plus/moins-value
  const materiels = Object.values(map).map(m => {
    const resultat = m.totalProduit - m.totalCharge;
    const txCouverture = m.totalCharge > 0
      ? (m.totalProduit / m.totalCharge) * 100
      : m.totalProduit > 0 ? 100 : 0;

    // Plus-value / moins-value = résultat (positif = plus-value, négatif = moins-value)
    // Détail charges : structure (entretien vs MO vs autres)
    const chargesArray = Object.entries(m.charges)
      .filter(([, v]) => v > 0)
      .map(([id, montant]) => ({
        id,
        label: CHARGE_CATEGORIES.find(c => c.id === id)?.label ?? id,
        montant: Math.round(montant * 100) / 100,
        pct: m.totalCharge > 0 ? (montant / m.totalCharge) * 100 : 0,
      }))
      .sort((a, b) => b.montant - a.montant);

    return {
      code: m.code,
      label: m.label,
      totalCharge: Math.round(m.totalCharge * 100) / 100,
      totalProduit: Math.round(m.totalProduit * 100) / 100,
      resultat: Math.round(resultat * 100) / 100,
      txCouverture: Math.round(txCouverture * 10) / 10,
      chargesDetail: chargesArray,
      comptesDetail: Object.entries(m.comptes).map(([compte, v]) => ({
        compte,
        label: v.label,
        charge: Math.round(v.charge * 100) / 100,
        produit: Math.round(v.produit * 100) / 100,
      })).sort((a, b) => b.charge - a.charge),
      nbLignes: m.lignes.length,
    };
  });

  // Trier par produit décroissant pour le podium
  return materiels.sort((a, b) => b.totalProduit - a.totalProduit);
}

/**
 * Retourne les stats globales (totaux exercice).
 */
export function computeAnalytiqueGlobal(materiels) {
  const totalCharge = materiels.reduce((s, m) => s + m.totalCharge, 0);
  const totalProduit = materiels.reduce((s, m) => s + m.totalProduit, 0);
  const resultatGlobal = totalProduit - totalCharge;
  const nbPositifs = materiels.filter(m => m.resultat >= 0 && (m.totalCharge > 0 || m.totalProduit > 0)).length;
  const nbNegatifs = materiels.filter(m => m.resultat < 0).length;

  return {
    totalCharge: Math.round(totalCharge * 100) / 100,
    totalProduit: Math.round(totalProduit * 100) / 100,
    resultatGlobal: Math.round(resultatGlobal * 100) / 100,
    nbPositifs,
    nbNegatifs,
    txCouvertureGlobal: totalCharge > 0 ? Math.round((totalProduit / totalCharge) * 1000) / 10 : 0,
  };
}

export { CHARGE_CATEGORIES };
