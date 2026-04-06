import * as XLSX from 'xlsx';

/** Arrondit à 2 décimales et élimine les flottants parasites proches de zéro */
function round(v) {
  if (typeof v !== 'number') return null;
  if (Math.abs(v) < 1e-4) return 0;
  return Math.round(v * 100) / 100;
}

/** Extrait les informations d'identité communes aux 3 feuilles */
function extractIdentity(raw) {
  let nomCuma = null, dateDebut = null, dateFin = null;
  for (const row of raw.slice(0, 10)) {
    if (!row) continue;
    // nomCuma : col1 remplie, col2 vide (ligne "TEST" ou nom réel)
    if (row[1] && typeof row[1] === 'string' && !row[2] && !row[3] && !nomCuma) {
      nomCuma = row[1];
    }
    // Actif/Passif : "du"/"au" en col5, date en col7
    if (row[5] === 'du'  && row[7]) dateDebut = String(row[7]);
    if (row[5] === 'au'  && row[7]) dateFin   = String(row[7]);
    // Résultat : "du"/"au" en col7, date en col9
    if (row[7] === 'du'  && row[9]) dateDebut = String(row[9]);
    if (row[7] === 'au'  && row[9]) dateFin   = String(row[9]);
  }
  return { nomCuma, dateDebut, dateFin };
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTIF
// Colonnes : [0=code, 1=null, 2=libellé, 3=BRUT, 4=AMORT, 5=NET_N, 6=null, 7=NET_N1]
// ─────────────────────────────────────────────────────────────────────────────
function parseActif(ws) {
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
  const identity = extractIdentity(raw);
  const items = [];

  for (const row of raw.slice(9)) {
    if (!row || !row.some(v => v !== null && v !== '')) continue;

    const c0 = row[0], c1 = row[1], c2 = row[2];
    const brut  = round(row[3]);
    const amort = round(row[4]);
    const netN  = round(row[5]);
    const netN1 = round(row[7]);

    // En-tête de colonnes
    if (c0 === 'ACTIF' && row[3] === 'BRUT') continue;

    // Total général : "TOTAL ACTIF"
    if (typeof c0 === 'string' && c0.startsWith('TOTAL')) {
      items.push({ type: 'grandtotal', label: c0, brut, amort, netN, netN1 });
      continue;
    }

    // Titre de section (ex : "ACTIF IMMOBILISE")
    if (typeof c0 === 'string' && c0 === c0.toUpperCase() && c0.length > 2 && !c2 && !brut && !netN) {
      items.push({ type: 'section', label: c0 });
      continue;
    }

    // Sous-section (ex : "IMMOBILISAT. CORPO.")
    if (c0 === null && typeof c1 === 'string' && !c2 && !netN && !brut) {
      items.push({ type: 'subsection', label: c1 });
      continue;
    }

    // Sous-total (ex : "TOTAL ACTIF IMMOBILISE")
    if (c0 === null && c1 === null && typeof c2 === 'string' && c2.startsWith('TOTAL')) {
      items.push({ type: 'total', label: c2, brut, amort, netN, netN1 });
      continue;
    }

    // Note de bas de tableau (ex : "(1) dont créances à plus de 1 an")
    if (c0 === null && c1 === null && typeof c2 === 'string' && c2.startsWith('(')) {
      items.push({ type: 'footnote', label: c2, netN, netN1 });
      continue;
    }

    // Sous-libellé sans valeurs (ex : "Marchandises")
    if (c0 === null && c1 === null && typeof c2 === 'string' && !netN && !brut) {
      items.push({ type: 'sublabel', label: c2 });
      continue;
    }

    // Ligne de données
    if ((typeof c0 === 'number' || (typeof c0 === 'string' && /^\d/.test(c0))) && c2) {
      items.push({ type: 'line', code: String(c0), label: c2, brut, amort, netN, netN1 });
    }
  }

  return { ...identity, items };
}

// ─────────────────────────────────────────────────────────────────────────────
// PASSIF
// Colonnes : [0=code, 1=null, 2=libellé, 3=detail_label, 4=detail_amount, 5=NET_N, 6=null, 7=NET_N1]
// ─────────────────────────────────────────────────────────────────────────────
function parsePassif(ws) {
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
  const identity = extractIdentity(raw);
  const items = [];

  for (const row of raw.slice(9)) {
    if (!row || !row.some(v => v !== null && v !== '')) continue;

    const c0 = row[0], c1 = row[1], c2 = row[2];
    const netN  = round(row[5]);
    const netN1 = round(row[7]);

    // En-tête de colonnes
    if (c0 === 'PASSIF' && row[5] === 'NET N') continue;

    // Totaux principaux
    if (typeof c0 === 'string' && c0.startsWith('TOTAL')) {
      items.push({ type: 'grandtotal', label: c0, netN, netN1 });
      continue;
    }

    // Titre de section
    if (typeof c0 === 'string' && c0 === c0.toUpperCase() && c0.length > 2 && !c2 && !netN) {
      items.push({ type: 'section', label: c0 });
      continue;
    }

    // Sous-section (ex : "Réserves") : col0=null, col1=null, col2=texte, pas de montants
    if (c0 === null && c1 === null && typeof c2 === 'string' && !netN && !round(row[4])) {
      items.push({ type: 'subsection', label: c2 });
      continue;
    }

    // Ligne parasite (flottants résiduels)
    if (!c0 && !c2 && netN === 0 && netN1 === 0) continue;

    // Ligne de sous-détail (code avec "*" = ventilation d'emprunts)
    const hasSubAmt = typeof row[4] === 'number' && row[4] !== null;
    const noMain    = netN === null;
    if (hasSubAmt && noMain && c2) {
      items.push({
        type: 'subline',
        code: c0 !== null ? String(c0).replace('*', '.') : null,
        label: c2,
        amount: round(row[4]),
        amountN1: netN1,
      });
      continue;
    }

    // Ligne de données principale
    if ((typeof c0 === 'number' || (typeof c0 === 'string' && /^\d/.test(c0))) && c2) {
      const subLabel  = typeof row[3] === 'string' ? row[3] : null;
      const subAmount = hasSubAmt && !noMain ? round(row[4]) : null;
      items.push({
        type: 'line',
        code: String(c0),
        label: c2,
        netN,
        netN1,
        subLabel,
        subAmount,
      });
    }
  }

  return { ...identity, items };
}

// ─────────────────────────────────────────────────────────────────────────────
// RÉSULTAT
// Colonnes : [0=code, 1=libellé_principal, 2=libellé_détail, ..., 6=montant_détail(G), 7=TOTAL_N(H), 8=null, 9=N-1(J), 10=Var(K)]
// ─────────────────────────────────────────────────────────────────────────────
function parseResultat(ws) {
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
  const identity = extractIdentity(raw);
  const items = [];

  for (const row of raw.slice(8)) {
    if (!row || !row.some(v => v !== null && v !== '')) continue;

    const c0 = row[0], c1 = row[1], c2 = row[2];
    const totalN       = round(row[7]);
    const totalN1      = round(row[9]);
    const detailAmount = round(row[6]);
    const variation    = typeof row[10] === 'number'
      ? Math.round(row[10] * 1000) / 10  // → valeur % avec 1 décimale
      : null;

    // En-tête de colonnes (col7 = "TOTAL N" string)
    if (row[7] === 'TOTAL N') continue;

    // Titre de section (ex : "PRODUITS D'EXPLOITATION", "COMPTE DE RESULTAT")
    if (typeof c0 === 'string' && c0 === c0.toUpperCase() && c0.length > 3 && !totalN && !detailAmount) {
      items.push({ type: 'section', label: c0 });
      continue;
    }

    // Ligne principale : col7 (TOTAL N) est remplie
    if (totalN !== null) {
      const label = c1 || c2 || String(c0 ?? '');
      // Ligne de résultat/total : label commence par chiffre+) ou TOTAL
      const isResult = typeof c0 === 'string' && (/^\d\)/.test(c0) || c0.startsWith('TOTAL'));
      const isResult2 = typeof c1 === 'string' && (c1.startsWith('TOTAL') || /^\d\)/.test(c1));
      items.push({
        type: (isResult || isResult2) ? 'total' : 'line',
        code: c0 !== null ? String(c0) : null,
        label,
        totalN,
        totalN1,
        variation,
      });
      continue;
    }

    // Ligne de sous-détail : col6 (G) remplie, col7 null
    if (detailAmount !== null) {
      const label = c2 || c1 || '';
      if (!label || label.trim() === '') continue;
      items.push({
        type: 'subline',
        code: c0 !== null ? String(c0) : null,
        label,
        totalN: detailAmount,
        totalN1,
        variation,
      });
      continue;
    }

    // Sous-section sans montants (ex : "Production vendue et cédée")
    if (c1 && !totalN && !detailAmount) {
      items.push({ type: 'subsection', label: c1 });
    }
  }

  return { ...identity, items };
}

// ─────────────────────────────────────────────────────────────────────────────
// Export principal
// ─────────────────────────────────────────────────────────────────────────────
export async function parseBilanCR(file) {
  const ab = await file.arrayBuffer();
  const wb = XLSX.read(ab, { type: 'array' });

  for (const name of ['Actif', 'Passif', 'Resultat']) {
    if (!wb.Sheets[name]) {
      throw new Error(`Feuille "${name}" introuvable. Vérifiez que le fichier est bien un BilanCR Clario Vision.`);
    }
  }

  const actif    = parseActif(wb.Sheets['Actif']);
  const passif   = parsePassif(wb.Sheets['Passif']);
  const resultat = parseResultat(wb.Sheets['Resultat']);

  return {
    nomCuma:   actif.nomCuma   || passif.nomCuma   || resultat.nomCuma,
    dateDebut: actif.dateDebut || passif.dateDebut || resultat.dateDebut,
    dateFin:   actif.dateFin   || passif.dateFin   || resultat.dateFin,
    actif:    actif.items,
    passif:   passif.items,
    resultat: resultat.items,
  };
}
