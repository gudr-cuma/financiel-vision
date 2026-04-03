/**
 * generatePdf.js — Moteur d'export PDF (pdfmake)
 * Import dynamique de pdfmake pour ne pas alourdir le bundle principal.
 */

import { computeBalance, computeBalanceAuxiliaire, computeGrandLivre } from './computeLivres';
import {
  COLORS,
  makeFooter, makeHeader,
  makeCoverPage, makeSommaire, makeSectionTitle,
  pdfFmt,
} from './pdfLayouts';
import { formatDate } from './formatUtils';

// ─────────────────────────────────────────────────────────────
// Libellés des documents
// ─────────────────────────────────────────────────────────────
export const DOC_LABELS = {
  dossier_gestion:   'Dossier de gestion',
  sig:               'Soldes Intermédiaires de Gestion',
  bilan:             'Bilan simplifié',
  balance:           'Balance générale',
  balance_aux:       'Balance auxiliaire',
  grand_livre:       'Grand Livre général',
  treasury_curve:    'Trésorerie — Courbe de solde',
  charges_charts:    'Structure des charges',
  analytique_table:  'Analytique — Tous les matériels',
  analytique_podium: 'Analytique — Top 3 matériels',
};

// ─────────────────────────────────────────────────────────────
// Helpers locaux
// ─────────────────────────────────────────────────────────────
function fmtPct(n) {
  if (n == null || !isFinite(n)) return '—';
  return `${Number(n).toFixed(1)} %`;
}
function fmtEur(n) {
  if (n == null) return '—';
  const abs = Math.abs(n);
  const formatted = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
    .format(abs)
    .replace(/[\u00A0\u202F]/g, '\u00a0');
  return (n < 0 ? '-' : '') + formatted + ' €';
}
function tableLayout() {
  return {
    hLineWidth: (i, node) => (i === 0 || i === node.table.body.length) ? 1 : 0.3,
    vLineWidth: () => 0,
    hLineColor: () => COLORS.border,
    paddingLeft: () => 4,
    paddingRight: () => 4,
    paddingTop: () => 3,
    paddingBottom: () => 3,
  };
}

// ─────────────────────────────────────────────────────────────
// SIG → contenu pdfmake
// ─────────────────────────────────────────────────────────────
function buildSigContent(sigResult) {
  if (!sigResult?.lines) return [];

  const tableBody = [
    [
      { text: 'Libellé',     style: 'tableHeader', fillColor: '#F7FAFC' },
      { text: 'Montant',     style: 'tableHeader', alignment: 'right', fillColor: '#F7FAFC' },
      { text: '% CA',        style: 'tableHeader', alignment: 'right', fillColor: '#F7FAFC' },
    ],
  ];

  for (const line of sigResult.lines) {
    const isNet     = line.id === 'resultat_net';
    const fillColor = isNet ? '#FFF3E0' : line.isTotal ? '#E8F5E0' : undefined;
    const bold      = line.isTotal || isNet;
    const fontSize  = isNet ? 9 : 8;
    const amount    = line.amount ?? 0;
    const isNeg     = amount < 0;

    const labelText = line.prefix
      ? `${line.prefix}  ${line.label}`
      : `      ${line.label}`;

    tableBody.push([
      { text: labelText, fontSize, bold, fillColor, color: COLORS.text },
      { text: pdfFmt(amount), fontSize, bold, alignment: 'right', fillColor,
        color: isNeg ? COLORS.red : COLORS.text },
      { text: line.percentCa != null ? fmtPct(line.percentCa) : '',
        fontSize: fontSize - 1, alignment: 'right', fillColor, color: COLORS.secondary },
    ]);
  }

  return [
    makeSectionTitle(DOC_LABELS.sig, 'sig'),
    {
      table: { headerRows: 1, widths: ['*', 100, 60], body: tableBody },
      layout: tableLayout(),
    },
    { text: ' ', pageBreak: 'after' },
  ];
}

// ─────────────────────────────────────────────────────────────
// Bilan simplifié → contenu pdfmake
// ─────────────────────────────────────────────────────────────
function buildBilanContent(bilanData) {
  if (!bilanData) return [];

  const { actifImmobilise, actifCirculant, capitauxPropres, dettes,
          totalActif, totalPassif, ecartBilan, bilanEquilibre, ratios } = bilanData;

  // — 4 Ratio cards —
  const STATUS_COLORS = { green: '#268E00', orange: '#FF8200', red: COLORS.red, neutral: COLORS.secondary };
  const ratioRows = Object.values(ratios).map(r => {
    const valStr = r.unit === 'eur'
      ? fmtEur(r.value)
      : r.unit === 'percent'
      ? fmtPct(r.value)
      : r.value != null ? r.value.toFixed(2) : '—';
    return {
      border: [true, true, true, true],
      fillColor: '#F7FAFC',
      stack: [
        { text: r.label, fontSize: 7, color: COLORS.secondary, bold: true },
        { text: valStr, fontSize: 16, bold: true, color: STATUS_COLORS[r.status] ?? COLORS.text, margin: [0, 3, 0, 2] },
        { text: r.formula, fontSize: 6, color: COLORS.secondary, italics: true },
      ],
      margin: [6, 6, 6, 6],
    };
  });

  // — Bilan overview SVG (actif vs passif stacked bars) —
  const overviewSvg = buildBilanOverviewSvg(bilanData);

  // — Section table helper —
  function sectionTable(section, halfW) {
    const postes = Object.entries(section)
      .filter(([k]) => !k.startsWith('_'))
      .map(([, v]) => v);

    const body = postes.map(p => [
      { text: p.label, fontSize: 7, color: COLORS.text },
      { text: pdfFmt(p.montant ?? 0), fontSize: 7, alignment: 'right',
        color: (p.montant ?? 0) < 0 ? COLORS.red : COLORS.text },
    ]);
    body.push([
      { text: section._label, fontSize: 7, bold: true, fillColor: COLORS.blueLight, color: COLORS.text },
      { text: pdfFmt(section._sousTotal), fontSize: 7, bold: true, alignment: 'right', fillColor: COLORS.blueLight },
    ]);

    return {
      table: { widths: ['*', 60], body },
      layout: tableLayout(),
      margin: [0, 0, 0, 6],
    };
  }

  const grandTotalCell = (label, amount) => ({
    table: {
      widths: ['*', 60],
      body: [[
        { text: label, fontSize: 8, bold: true, color: COLORS.white, fillColor: COLORS.grandTotal },
        { text: pdfFmt(amount), fontSize: 8, bold: true, alignment: 'right', color: COLORS.white, fillColor: COLORS.grandTotal },
      ]],
    },
    layout: 'noBorders',
    margin: [0, 4, 0, 0],
  });

  const blocks = [
    makeSectionTitle(DOC_LABELS.bilan, 'bilan'),
    // Ratio cards
    {
      table: { widths: ['*', '*', '*', '*'], body: [ratioRows] },
      layout: {
        hLineWidth: () => 1,
        vLineWidth: (i) => (i === 0 || i === 4) ? 1 : 0,
        hLineColor: () => COLORS.border,
        vLineColor: () => COLORS.border,
        paddingLeft: () => 0,
        paddingRight: () => 0,
        paddingTop: () => 0,
        paddingBottom: () => 0,
      },
      margin: [0, 0, 0, 14],
    },
    // Overview SVG
    overviewSvg ? { svg: overviewSvg, width: 720, margin: [0, 0, 0, 14] } : {},
    // 2 columns: Actif | Passif
    {
      columns: [
        {
          width: '50%',
          margin: [0, 0, 10, 0],
          stack: [
            { text: 'ACTIF', fontSize: 10, bold: true, color: COLORS.text, margin: [0, 0, 0, 6] },
            { text: actifImmobilise._label, fontSize: 8, bold: true, color: COLORS.secondary, margin: [0, 0, 0, 3] },
            sectionTable(actifImmobilise),
            { text: actifCirculant._label, fontSize: 8, bold: true, color: COLORS.secondary, margin: [0, 6, 0, 3] },
            sectionTable(actifCirculant),
            grandTotalCell('TOTAL ACTIF', totalActif),
          ],
        },
        {
          width: '50%',
          stack: [
            { text: 'PASSIF', fontSize: 10, bold: true, color: COLORS.text, margin: [0, 0, 0, 6] },
            { text: capitauxPropres._label, fontSize: 8, bold: true, color: COLORS.secondary, margin: [0, 0, 0, 3] },
            sectionTable(capitauxPropres),
            { text: dettes._label, fontSize: 8, bold: true, color: COLORS.secondary, margin: [0, 6, 0, 3] },
            sectionTable(dettes),
            grandTotalCell('TOTAL PASSIF', totalPassif),
          ],
        },
      ],
    },
  ];

  if (!bilanEquilibre && ecartBilan) {
    blocks.push({
      text: `⚠️ Écart bilan : ${fmtEur(Math.abs(ecartBilan))}`,
      fontSize: 9, color: '#7C4D00', background: '#FFF3E0',
      margin: [0, 10, 0, 0],
    });
  }
  blocks.push({ text: ' ', pageBreak: 'after' });
  return blocks;
}

function buildBilanOverviewSvg({ actifImmobilise, actifCirculant, capitauxPropres, dettes, totalActif, totalPassif }) {
  if (!totalActif || !totalPassif) return null;
  const W = 720, barH = 30, padL = 60, padR = 20;
  const barW = W - padL - padR;
  const H = 110;

  function clamp(v) { return Math.max(0, Math.min(v, barW)); }

  const actTotal = actifImmobilise._sousTotal + actifCirculant._sousTotal;
  const immobW  = clamp(actTotal > 0 ? (actifImmobilise._sousTotal / actTotal) * barW : 0);
  const circW   = clamp(barW - immobW);

  const pasTotal = capitauxPropres._sousTotal + dettes._sousTotal;
  const cpW      = clamp(pasTotal > 0 ? (capitauxPropres._sousTotal / pasTotal) * barW : 0);
  const detW     = clamp(barW - cpW);

  const fmt = (v) => {
    const abs = Math.abs(v);
    return abs >= 1000000 ? `${(v / 1000000).toFixed(1)} M€`
      : abs >= 1000 ? `${(v / 1000).toFixed(0)} k€`
      : `${Math.round(v)} €`;
  };

  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <text x="${padL - 5}" y="22" font-size="9" text-anchor="end" font-weight="bold" fill="#4A5568">ACTIF</text>
    <rect x="${padL}" y="8" width="${immobW.toFixed(1)}" height="${barH}" rx="3" fill="#B1DCE2"/>
    <rect x="${(padL + immobW).toFixed(1)}" y="8" width="${circW.toFixed(1)}" height="${barH}" rx="3" fill="#E3F2F5"/>
    ${immobW > 60 ? `<text x="${(padL + immobW / 2).toFixed(1)}" y="27" font-size="9" text-anchor="middle" fill="#1A202C">Immobilisé ${fmt(actifImmobilise._sousTotal)}</text>` : ''}
    ${circW > 60 ? `<text x="${(padL + immobW + circW / 2).toFixed(1)}" y="27" font-size="9" text-anchor="middle" fill="#1A202C">Circulant ${fmt(actifCirculant._sousTotal)}</text>` : ''}
    <text x="${padL - 5}" y="78" font-size="9" text-anchor="end" font-weight="bold" fill="#4A5568">PASSIF</text>
    <rect x="${padL}" y="64" width="${cpW.toFixed(1)}" height="${barH}" rx="3" fill="#E8F5E0"/>
    <rect x="${(padL + cpW).toFixed(1)}" y="64" width="${detW.toFixed(1)}" height="${barH}" rx="3" fill="#FFF3E0"/>
    ${cpW > 70 ? `<text x="${(padL + cpW / 2).toFixed(1)}" y="83" font-size="9" text-anchor="middle" fill="#1A202C">Cap. propres ${fmt(capitauxPropres._sousTotal)}</text>` : ''}
    ${detW > 60 ? `<text x="${(padL + cpW + detW / 2).toFixed(1)}" y="83" font-size="9" text-anchor="middle" fill="#1A202C">Dettes ${fmt(dettes._sousTotal)}</text>` : ''}
    <text x="${(padL + barW).toFixed(1)}" y="27" font-size="9" text-anchor="start" fill="#718096" dx="4">${fmt(totalActif)}</text>
    <text x="${(padL + barW).toFixed(1)}" y="83" font-size="9" text-anchor="start" fill="#718096" dx="4">${fmt(totalPassif)}</text>
  </svg>`;
}

// ─────────────────────────────────────────────────────────────
// Balance générale → contenu pdfmake
// ─────────────────────────────────────────────────────────────
function buildBalanceContent(parsedFec) {
  const rows = computeBalance(parsedFec, { inclureComptesSansMouvement: false });

  const tableBody = [
    [
      { text: 'Compte',       style: 'tableHeader', fillColor: '#F7FAFC' },
      { text: 'Intitulé',     style: 'tableHeader', fillColor: '#F7FAFC' },
      { text: 'Rpt Débit',    style: 'tableHeader', alignment: 'right', fillColor: '#F7FAFC' },
      { text: 'Rpt Crédit',   style: 'tableHeader', alignment: 'right', fillColor: '#F7FAFC' },
      { text: 'Mvt Débit',    style: 'tableHeader', alignment: 'right', fillColor: '#F7FAFC' },
      { text: 'Mvt Crédit',   style: 'tableHeader', alignment: 'right', fillColor: '#F7FAFC' },
      { text: 'Solde Débit',  style: 'tableHeader', alignment: 'right', fillColor: '#F7FAFC' },
      { text: 'Solde Crédit', style: 'tableHeader', alignment: 'right', fillColor: '#F7FAFC' },
    ],
  ];

  for (const row of rows) {
    const isGrandTotal  = row.rowType === 'grandTotal';
    const isCategTotal  = row.rowType === 'bilanTotal' || row.rowType === 'gestionTotal';
    const isClasseTotal = row.rowType === 'classe';
    const isGroupeTotal = row.rowType === 'groupe';

    const fillColor = isGrandTotal ? COLORS.grandTotal
      : isCategTotal  ? '#E8F5E0'
      : isClasseTotal ? COLORS.blueLight
      : isGroupeTotal ? '#F7FAFC'
      : undefined;

    const textColor = isGrandTotal ? COLORS.white : COLORS.text;
    const bold      = isGrandTotal || isCategTotal || isClasseTotal || isGroupeTotal;
    const fontSize  = isGrandTotal ? 8 : 7;

    const cell = (text, align = 'left') => ({
      text: text ?? '', fontSize, bold, color: textColor, alignment: align, fillColor,
    });

    tableBody.push([
      cell(row.compteNum),
      cell(row.compteLib),
      cell(pdfFmt(row.report_debit),  'right'),
      cell(pdfFmt(row.report_credit), 'right'),
      cell(pdfFmt(row.mvt_debit),     'right'),
      cell(pdfFmt(row.mvt_credit),    'right'),
      cell(pdfFmt(row.solde_debit),   'right'),
      cell(pdfFmt(row.solde_credit),  'right'),
    ]);
  }

  return [
    makeSectionTitle(DOC_LABELS.balance, 'balance'),
    {
      table: { headerRows: 1, widths: [60, '*', 55, 55, 55, 55, 55, 55], body: tableBody },
      layout: tableLayout(),
    },
    { text: ' ', pageBreak: 'after' },
  ];
}

// ─────────────────────────────────────────────────────────────
// Balance auxiliaire → contenu pdfmake
// ─────────────────────────────────────────────────────────────
function buildBalanceAuxContent(parsedFec) {
  const rows = computeBalanceAuxiliaire(parsedFec, { collectifs: ['401', '411', '453'] });

  const tableBody = [
    [
      { text: 'Compte aux.',  style: 'tableHeader', fillColor: '#F7FAFC' },
      { text: 'Tiers',        style: 'tableHeader', fillColor: '#F7FAFC' },
      { text: 'Rpt Débit',   style: 'tableHeader', alignment: 'right', fillColor: '#F7FAFC' },
      { text: 'Rpt Crédit',  style: 'tableHeader', alignment: 'right', fillColor: '#F7FAFC' },
      { text: 'Mvt Débit',   style: 'tableHeader', alignment: 'right', fillColor: '#F7FAFC' },
      { text: 'Mvt Crédit',  style: 'tableHeader', alignment: 'right', fillColor: '#F7FAFC' },
      { text: 'Solde Débit', style: 'tableHeader', alignment: 'right', fillColor: '#F7FAFC' },
      { text: 'Solde Crédit',style: 'tableHeader', alignment: 'right', fillColor: '#F7FAFC' },
    ],
  ];

  for (const row of rows) {
    const isTotal   = row.rowType === 'collectifTotal';
    const fillColor = isTotal ? COLORS.blueLight : undefined;
    const bold      = isTotal;
    const fontSize  = 7;
    const cell = (text, align = 'left') => ({ text: text ?? '', fontSize, bold, alignment: align, fillColor });

    tableBody.push([
      cell(row.compAuxNum),
      cell(isTotal ? `Total ${row.collectif} — ${row.collectifLib}` : `${row.collectif}  ${row.compAuxLib}`),
      cell(pdfFmt(row.report_debit),  'right'),
      cell(pdfFmt(row.report_credit), 'right'),
      cell(pdfFmt(row.mvt_debit),     'right'),
      cell(pdfFmt(row.mvt_credit),    'right'),
      cell(pdfFmt(row.solde_debit),   'right'),
      cell(pdfFmt(row.solde_credit),  'right'),
    ]);
  }

  return [
    makeSectionTitle(DOC_LABELS.balance_aux, 'balance_aux'),
    {
      table: { headerRows: 1, widths: [60, '*', 55, 55, 55, 55, 55, 55], body: tableBody },
      layout: tableLayout(),
    },
    { text: ' ', pageBreak: 'after' },
  ];
}

// ─────────────────────────────────────────────────────────────
// Grand Livre → contenu pdfmake
// ─────────────────────────────────────────────────────────────
function buildGrandLivreContent(parsedFec) {
  const glData = computeGrandLivre(parsedFec);
  const blocks = [makeSectionTitle(DOC_LABELS.grand_livre, 'grand_livre')];

  for (const compte of glData) {
    blocks.push({
      table: {
        widths: ['*'],
        body: [[{
          text: `${compte.compteNum}   ${compte.compteLib}`,
          fontSize: 8, bold: true, color: COLORS.text, fillColor: COLORS.blue, margin: [4, 3, 4, 3],
        }]],
      },
      layout: 'noBorders',
      margin: [0, 6, 0, 0],
    });

    const tableBody = [[
      { text: 'Jnl',          style: 'tableHeader', fillColor: '#F7FAFC' },
      { text: 'Date',         style: 'tableHeader', fillColor: '#F7FAFC' },
      { text: 'Libellé',      style: 'tableHeader', fillColor: '#F7FAFC' },
      { text: 'Pièce',        style: 'tableHeader', fillColor: '#F7FAFC' },
      { text: 'Contrepartie', style: 'tableHeader', fillColor: '#F7FAFC' },
      { text: 'Débit',        style: 'tableHeader', alignment: 'right', fillColor: '#F7FAFC' },
      { text: 'Crédit',       style: 'tableHeader', alignment: 'right', fillColor: '#F7FAFC' },
      { text: 'Solde cumulé', style: 'tableHeader', alignment: 'right', fillColor: '#F7FAFC' },
    ]];

    if (compte.reportNet !== 0) {
      const net = compte.reportNet;
      tableBody.push([
        { text: 'ANC', fontSize: 7, color: COLORS.secondary, italics: true },
        { text: '', fontSize: 7 },
        { text: 'Report à nouveau', fontSize: 7, italics: true, color: COLORS.secondary },
        { text: '', fontSize: 7 }, { text: '', fontSize: 7 },
        { text: net > 0 ? pdfFmt(net) : '', fontSize: 7, alignment: 'right' },
        { text: net < 0 ? pdfFmt(-net) : '', fontSize: 7, alignment: 'right' },
        { text: `${pdfFmt(Math.abs(net))} ${net >= 0 ? 'Db' : 'Cr'}`, fontSize: 7, alignment: 'right',
          color: net >= 0 ? COLORS.primary : COLORS.red },
      ]);
    }

    for (const l of compte.lignes) {
      const s = l.soldeCumule ?? 0;
      tableBody.push([
        { text: l.journalCode, fontSize: 7 },
        { text: formatDate(l.ecritureDate), fontSize: 7 },
        { text: l.ecritureLib ?? '', fontSize: 7 },
        { text: l.pieceRef ?? '', fontSize: 7 },
        { text: l.contrepartie ?? '', fontSize: 7, color: COLORS.secondary },
        { text: pdfFmt(l.debit),  fontSize: 7, alignment: 'right', color: l.debit  ? COLORS.primary : '' },
        { text: pdfFmt(l.credit), fontSize: 7, alignment: 'right', color: l.credit ? COLORS.red : '' },
        { text: `${pdfFmt(Math.abs(s))} ${s >= 0 ? 'Db' : 'Cr'}`, fontSize: 7, alignment: 'right',
          color: s >= 0 ? COLORS.primary : COLORS.red },
      ]);
    }

    const tot = compte.totalGeneral;
    const s   = tot.solde;
    tableBody.push([
      { text: 'Total', fontSize: 7, bold: true, colSpan: 5, fillColor: '#E8F5E0' }, {}, {}, {}, {},
      { text: pdfFmt(tot.debit),  fontSize: 7, bold: true, alignment: 'right', fillColor: '#E8F5E0' },
      { text: pdfFmt(tot.credit), fontSize: 7, bold: true, alignment: 'right', fillColor: '#E8F5E0' },
      { text: `${pdfFmt(Math.abs(s))} ${s >= 0 ? 'Db' : 'Cr'}`, fontSize: 7, bold: true, alignment: 'right',
        fillColor: '#E8F5E0', color: s >= 0 ? COLORS.primary : COLORS.red },
    ]);

    blocks.push({
      table: { headerRows: 1, widths: [20, 42, '*', 40, 42, 48, 48, 55], body: tableBody },
      layout: tableLayout(),
    });
  }

  return blocks;
}

// ─────────────────────────────────────────────────────────────
// Trésorerie — courbe de solde → contenu pdfmake
// ─────────────────────────────────────────────────────────────
function buildTreasuryCurve(treasuryData) {
  if (!treasuryData) return [];

  const { soldeActuel, soldeMini, soldeMaxi, totalEntrees, totalSorties, soldeMoyen, dailyCurve } = treasuryData;

  const kpiCells = [
    { label: 'Solde actuel',        value: pdfFmt(soldeActuel), color: soldeActuel >= 0 ? '#268E00' : COLORS.red },
    { label: 'Solde minimal',       value: pdfFmt(soldeMini),   color: soldeMini >= 0 ? COLORS.text : COLORS.red },
    { label: 'Solde maximal',       value: pdfFmt(soldeMaxi),   color: '#268E00' },
    { label: 'Total encaissements', value: pdfFmt(totalEntrees),color: '#268E00' },
    { label: 'Total décaissements', value: pdfFmt(totalSorties),color: COLORS.red },
    { label: 'Solde moyen',         value: pdfFmt(soldeMoyen),  color: COLORS.text },
  ].map(k => ({
    border: [true, true, true, true],
    fillColor: '#F7FAFC',
    stack: [
      { text: k.label, fontSize: 7, color: COLORS.secondary, bold: true },
      { text: k.value, fontSize: 14, bold: true, color: k.color, margin: [0, 2, 0, 0] },
    ],
    margin: [6, 6, 6, 6],
  }));

  const svgStr = buildTreasurySvg(dailyCurve);

  return [
    makeSectionTitle(DOC_LABELS.treasury_curve, 'treasury_curve'),
    {
      table: { widths: Array(6).fill('*'), body: [kpiCells] },
      layout: {
        hLineWidth: () => 1, vLineWidth: (i) => (i === 0 || i === 6) ? 1 : 0,
        hLineColor: () => COLORS.border, vLineColor: () => COLORS.border,
        paddingLeft: () => 0, paddingRight: () => 0,
        paddingTop: () => 0, paddingBottom: () => 0,
      },
      margin: [0, 0, 0, 14],
    },
    { svg: svgStr, width: 720, margin: [0, 0, 0, 0] },
    { text: ' ', pageBreak: 'after' },
  ];
}

function buildTreasurySvg(dailyCurve) {
  const W = 720, H = 170;
  const padL = 65, padR = 20, padT = 15, padB = 32;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  if (!dailyCurve?.length) {
    return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg"><rect width="${W}" height="${H}" fill="#FAFAFA"/><text x="${W/2}" y="${H/2}" font-size="12" text-anchor="middle" fill="#A0AEC0">Aucune donnée</text></svg>`;
  }

  // Aggregate by month: last solde of the month
  const byMonth = new Map();
  for (const d of dailyCurve) {
    const key = `${d.date.getFullYear()}-${String(d.date.getMonth() + 1).padStart(2, '0')}`;
    byMonth.set(key, d.solde);
  }
  const months = [...byMonth.entries()].sort(([a], [b]) => a < b ? -1 : 1);
  if (months.length < 2) {
    return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg"><rect width="${W}" height="${H}" fill="#FAFAFA"/><text x="${W/2}" y="${H/2}" font-size="12" text-anchor="middle" fill="#A0AEC0">Données insuffisantes</text></svg>`;
  }

  const values = months.map(([, v]) => v);
  const minVal = Math.min(...values, 0);
  const maxVal = Math.max(...values, 0);
  const range  = maxVal - minVal || 1;

  const toX = (i) => padL + (i / (months.length - 1)) * chartW;
  const toY = (v) => padT + (1 - (v - minVal) / range) * chartH;
  const zeroY = toY(0).toFixed(1);

  const polyPts  = values.map((v, i) => `${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(' ');
  const areaPts  = [
    `${toX(0).toFixed(1)},${zeroY}`,
    ...values.map((v, i) => `${toX(i).toFixed(1)},${toY(v).toFixed(1)}`),
    `${toX(values.length - 1).toFixed(1)},${zeroY}`,
  ].join(' ');

  const fmtAx = (v) => {
    const abs = Math.abs(v);
    if (abs >= 1000000) return `${(v / 1000000).toFixed(1)} M`;
    if (abs >= 1000)    return `${(v / 1000).toFixed(0)} k`;
    return String(Math.round(v));
  };

  const nTicks = 4;
  const yLines = Array.from({ length: nTicks + 1 }, (_, i) => minVal + (i / nTicks) * range).map(v => {
    const y = toY(v).toFixed(1);
    return `<line x1="${padL}" y1="${y}" x2="${(padL + chartW).toFixed(1)}" y2="${y}" stroke="#E2E8F0" stroke-width="0.5"/>
    <text x="${padL - 5}" y="${y}" dy="4" font-size="9" text-anchor="end" fill="#718096">${fmtAx(v)}</text>`;
  });

  const step   = Math.max(1, Math.ceil(months.length / 12));
  const xLabels = months
    .filter((_, i) => i % step === 0 || i === months.length - 1)
    .map(([key]) => {
      const i = months.findIndex(([k]) => k === key);
      const [yr, mo] = key.split('-');
      return `<text x="${toX(i).toFixed(1)}" y="${(padT + chartH + 20).toFixed(1)}" font-size="9" text-anchor="middle" fill="#718096">${mo}/${yr.slice(2)}</text>`;
    });

  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${W}" height="${H}" fill="#FAFAFA"/>
    ${yLines.join('')}
    <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${(padT + chartH).toFixed(1)}" stroke="#CBD5E0" stroke-width="1"/>
    <line x1="${padL}" y1="${(padT + chartH).toFixed(1)}" x2="${(padL + chartW).toFixed(1)}" y2="${(padT + chartH).toFixed(1)}" stroke="#CBD5E0" stroke-width="1"/>
    ${minVal < 0 ? `<line x1="${padL}" y1="${zeroY}" x2="${(padL + chartW).toFixed(1)}" y2="${zeroY}" stroke="${COLORS.red}" stroke-width="1" stroke-dasharray="4,3" opacity="0.6"/>` : ''}
    <polygon points="${areaPts}" fill="${COLORS.blue}" opacity="0.35"/>
    <polyline points="${polyPts}" fill="none" stroke="#31B700" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
    ${xLabels.join('')}
  </svg>`;
}

// ─────────────────────────────────────────────────────────────
// Structure des charges → contenu pdfmake
// ─────────────────────────────────────────────────────────────
function buildChargesCharts(chargesData) {
  if (!chargesData?.categories?.length) return [];

  const sorted = [...chargesData.categories].sort((a, b) => b.montant - a.montant);
  const donutSvg = buildChargesDonutSvg(sorted);
  const barSvg   = buildChargesBarsSvg(sorted);

  // Legend table next to bars
  const legendBody = sorted.map(c => [
    { canvas: [{ type: 'rect', x: 0, y: 2, w: 10, h: 10, r: 2, color: c.color }], width: 14 },
    { text: c.label, fontSize: 8, color: COLORS.text },
    { text: pdfFmt(c.montant), fontSize: 8, alignment: 'right' },
    { text: fmtPct(c.percent), fontSize: 8, alignment: 'right', color: COLORS.secondary },
  ]);
  legendBody.push([
    {},
    { text: 'Total', fontSize: 8, bold: true },
    { text: pdfFmt(chargesData.totalCharges), fontSize: 8, bold: true, alignment: 'right' },
    { text: '100,0 %', fontSize: 8, alignment: 'right', color: COLORS.secondary },
  ]);

  return [
    makeSectionTitle(DOC_LABELS.charges_charts, 'charges_charts'),
    {
      columns: [
        {
          width: 200,
          stack: [
            { text: 'Répartition', fontSize: 9, bold: true, color: COLORS.secondary, margin: [0, 0, 0, 6] },
            { svg: donutSvg, width: 180, margin: [10, 0, 0, 0] },
          ],
        },
        {
          width: '*',
          stack: [
            { text: 'Détail par nature', fontSize: 9, bold: true, color: COLORS.secondary, margin: [0, 0, 0, 6] },
            { svg: barSvg, width: 460, margin: [0, 0, 0, 12] },
            {
              table: {
                widths: [14, '*', 80, 55],
                body: legendBody,
              },
              layout: {
                hLineWidth: (i, node) => (i === 0 || i === node.table.body.length) ? 0.5 : 0,
                vLineWidth: () => 0,
                hLineColor: () => COLORS.border,
                paddingLeft: () => 2, paddingRight: () => 2,
                paddingTop: () => 3, paddingBottom: () => 3,
              },
            },
          ],
        },
      ],
    },
    { text: ' ', pageBreak: 'after' },
  ];
}

function buildChargesDonutSvg(categories) {
  const size = 180, cx = 90, cy = 90, R = 75, r = 42;
  const total = categories.reduce((s, c) => s + c.montant, 0);
  if (!total) return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"/>`;

  const paths = [];
  let start = -Math.PI / 2;

  for (const cat of categories) {
    const angle = (cat.montant / total) * 2 * Math.PI;
    const end   = start + angle;

    if (angle >= 2 * Math.PI - 0.001) {
      paths.push(`<circle cx="${cx}" cy="${cy}" r="${R}" fill="${cat.color}"/>`);
    } else {
      const large = angle > Math.PI ? 1 : 0;
      const x1 = cx + R * Math.cos(start), y1 = cy + R * Math.sin(start);
      const x2 = cx + R * Math.cos(end),   y2 = cy + R * Math.sin(end);
      const ix1 = cx + r * Math.cos(end),  iy1 = cy + r * Math.sin(end);
      const ix2 = cx + r * Math.cos(start),iy2 = cy + r * Math.sin(start);
      paths.push(
        `<path d="M${x1.toFixed(2)},${y1.toFixed(2)} A${R},${R} 0 ${large},1 ${x2.toFixed(2)},${y2.toFixed(2)} ` +
        `L${ix1.toFixed(2)},${iy1.toFixed(2)} A${r},${r} 0 ${large},0 ${ix2.toFixed(2)},${iy2.toFixed(2)} Z" fill="${cat.color}"/>`
      );
    }
    start = end;
  }

  return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    ${paths.join('')}
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="white"/>
  </svg>`;
}

function buildChargesBarsSvg(categories) {
  const padL = 10, padR = 10, padT = 8, rowH = 28;
  const W = 460;
  const H = padT + categories.length * rowH + 4;
  const barAreaW = W - padL - padR;
  const maxVal = Math.max(...categories.map(c => c.montant), 1);

  const bars = categories.map((cat, i) => {
    const y  = padT + i * rowH;
    const bW = Math.max(2, (cat.montant / maxVal) * barAreaW);
    return `<rect x="${padL}" y="${(y + 4).toFixed(1)}" width="${bW.toFixed(1)}" height="${rowH - 8}" rx="3" fill="${cat.color}" opacity="0.85"/>`;
  });

  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${W}" height="${H}" fill="#FAFAFA" rx="4"/>
    ${bars.join('')}
  </svg>`;
}

// ─────────────────────────────────────────────────────────────
// Analytique — Tableau tous les matériels
// ─────────────────────────────────────────────────────────────
function buildAnalytiqueTable(analytiqueData) {
  if (!analytiqueData?.materiels?.length) return [];

  const { materiels, global: g } = analytiqueData;

  const tableBody = [
    [
      { text: 'Code',       style: 'tableHeader', fillColor: '#F7FAFC' },
      { text: 'Matériel',   style: 'tableHeader', fillColor: '#F7FAFC' },
      { text: 'Facturé',    style: 'tableHeader', alignment: 'right', fillColor: '#F7FAFC' },
      { text: 'Charges',    style: 'tableHeader', alignment: 'right', fillColor: '#F7FAFC' },
      { text: 'Résultat',   style: 'tableHeader', alignment: 'right', fillColor: '#F7FAFC' },
      { text: 'Couverture', style: 'tableHeader', alignment: 'right', fillColor: '#F7FAFC' },
    ],
  ];

  for (const m of materiels) {
    const isPos     = m.resultat >= 0;
    const fillColor = undefined;
    const resCellColor = isPos ? '#268E00' : COLORS.red;
    tableBody.push([
      { text: m.code,  fontSize: 7, color: COLORS.secondary },
      { text: m.label, fontSize: 8 },
      { text: pdfFmt(m.totalProduit), fontSize: 8, alignment: 'right', color: '#268E00' },
      { text: pdfFmt(m.totalCharge),  fontSize: 8, alignment: 'right', color: COLORS.red },
      { text: pdfFmt(m.resultat), fontSize: 8, bold: true, alignment: 'right', color: resCellColor },
      { text: fmtPct(m.txCouverture), fontSize: 8, alignment: 'right', color: resCellColor },
    ]);
  }

  // Ligne totaux
  if (g) {
    const gPos = g.resultatGlobal >= 0;
    tableBody.push([
      { text: '', fontSize: 7, fillColor: COLORS.blueLight },
      { text: 'TOTAL', fontSize: 8, bold: true, fillColor: COLORS.blueLight },
      { text: pdfFmt(g.totalProduit),    fontSize: 8, bold: true, alignment: 'right', fillColor: COLORS.blueLight, color: '#268E00' },
      { text: pdfFmt(g.totalCharge),     fontSize: 8, bold: true, alignment: 'right', fillColor: COLORS.blueLight, color: COLORS.red },
      { text: pdfFmt(g.resultatGlobal),  fontSize: 8, bold: true, alignment: 'right', fillColor: COLORS.blueLight, color: gPos ? '#268E00' : COLORS.red },
      { text: fmtPct(g.txCouvertureGlobal), fontSize: 8, bold: true, alignment: 'right', fillColor: COLORS.blueLight, color: gPos ? '#268E00' : COLORS.red },
    ]);
  }

  return [
    makeSectionTitle(DOC_LABELS.analytique_table, 'analytique_table'),
    {
      table: { headerRows: 1, widths: [40, '*', 75, 75, 75, 60], body: tableBody },
      layout: tableLayout(),
    },
    { text: ' ', pageBreak: 'after' },
  ];
}

// ─────────────────────────────────────────────────────────────
// Analytique — Podium Top 3
// ─────────────────────────────────────────────────────────────
function buildAnalytiquePodium(analytiqueData) {
  if (!analytiqueData?.materiels) return [];

  const top3 = analytiqueData.materiels
    .filter(m => m.totalProduit > 0 && m.code.length > 1)
    .slice(0, 3);

  if (top3.length < 2) return [];

  const svgStr = buildPodiumSvg(top3);

  return [
    makeSectionTitle(DOC_LABELS.analytique_podium, 'analytique_podium'),
    { svg: svgStr, width: 500, margin: [80, 0, 0, 0] },
    { text: ' ', pageBreak: 'after' },
  ];
}

function buildPodiumSvg(top3) {
  // Display order: 2nd (left), 1st (center), 3rd (right)
  const W = 500, H = 240;
  const barW = 130, gap = 25;
  const padL = (W - (3 * barW + 2 * gap)) / 2;
  const maxBarH = 140, padB = 60;
  const colors    = ['#FFD700', '#C0C0C0', '#CD7F32'];
  const displayOrder = [1, 0, 2]; // 2nd, 1st, 3rd
  const barHeights = [100, maxBarH, 80];

  const fmt = (v) => {
    const abs = Math.abs(v);
    if (abs >= 1000000) return `${(v / 1000000).toFixed(2)} M€`;
    if (abs >= 1000)    return `${(v / 1000).toFixed(0)} k€`;
    return `${Math.round(v)} €`;
  };

  const elements = displayOrder.map((rank, pos) => {
    const m = top3[rank];
    if (!m) return '';
    const x  = padL + pos * (barW + gap);
    const bH = barHeights[pos];
    const y  = H - padB - bH;
    const cx = x + barW / 2;
    const label = m.label.length > 16 ? m.label.slice(0, 14) + '…' : m.label;
    const medals = ['🥇', '🥈', '🥉'];

    return [
      // Amount above bar
      `<text x="${cx.toFixed(1)}" y="${(y - 22).toFixed(1)}" font-size="10" text-anchor="middle" font-weight="bold" fill="#1A202C">${fmt(m.totalProduit)}</text>`,
      // Label above bar
      `<text x="${cx.toFixed(1)}" y="${(y - 8).toFixed(1)}" font-size="9" text-anchor="middle" fill="#4A5568">${label}</text>`,
      // Bar
      `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW}" height="${bH}" rx="6" fill="${colors[rank]}" opacity="0.85"/>`,
      // Rank inside
      `<text x="${cx.toFixed(1)}" y="${(y + bH / 2 + 6).toFixed(1)}" font-size="20" text-anchor="middle" fill="rgba(0,0,0,0.35)">${rank === 0 ? '1er' : rank === 1 ? '2e' : '3e'}</text>`,
      // Code below
      `<text x="${cx.toFixed(1)}" y="${(H - padB + 18).toFixed(1)}" font-size="9" text-anchor="middle" fill="#718096">${m.code}</text>`,
    ].join('');
  });

  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${W}" height="${H}" fill="#FAFAFA" rx="6"/>
    ${elements.join('')}
    <!-- Ground line -->
    <line x1="${padL.toFixed(1)}" y1="${(H - padB).toFixed(1)}" x2="${(padL + 3 * barW + 2 * gap).toFixed(1)}" y2="${(H - padB).toFixed(1)}" stroke="#CBD5E0" stroke-width="2"/>
  </svg>`;
}

// ─────────────────────────────────────────────────────────────
// Dossier de gestion
// ─────────────────────────────────────────────────────────────

function dossierVal(variables, overrides, key) {
  const v = overrides?.[key] !== undefined ? overrides[key] : (variables?.[key] ?? '');
  return v !== '' ? String(v) : '—';
}

function dossierSection(title, text, rows, variables, overrides) {
  const tableBody = [
    [
      { text: 'Libellé', style: 'tableHeader', alignment: 'left' },
      { text: 'N', style: 'tableHeader', alignment: 'right' },
      { text: 'N-1', style: 'tableHeader', alignment: 'right' },
      { text: 'N-2', style: 'tableHeader', alignment: 'right' },
      { text: 'Moy. Groupe', style: 'tableHeader', alignment: 'right' },
    ],
    ...rows.map(r => {
      const [kN, kN1, kN2] = r.keys || [];
      const suf = r.suffix || '';
      const fmt = v => v !== '—' ? `${v} ${suf}`.trim() : '—';
      const avgKey = `avg_${kN || r.label}`;
      return [
        { text: r.label, fontSize: 9, color: r.isTotal ? COLORS.green : COLORS.text },
        { text: kN  ? fmt(dossierVal(variables, overrides, kN))  : '—', fontSize: 9, alignment: 'right', color: r.isTotal ? COLORS.green : COLORS.text, bold: !!r.isTotal },
        { text: kN1 ? fmt(dossierVal(variables, overrides, kN1)) : '—', fontSize: 9, alignment: 'right', color: r.isTotal ? COLORS.green : COLORS.text, bold: !!r.isTotal },
        { text: kN2 ? fmt(dossierVal(variables, overrides, kN2)) : '—', fontSize: 9, alignment: 'right', color: r.isTotal ? COLORS.green : COLORS.text, bold: !!r.isTotal },
        { text: dossierVal({}, overrides, avgKey), fontSize: 9, alignment: 'right', color: '#718096' },
      ];
    }),
  ];

  const blocks = [];
  if (title) blocks.push({ text: title, fontSize: 10, bold: true, color: COLORS.orange, margin: [0, 8, 0, 4] });
  if (text)  blocks.push({ text, fontSize: 9, color: '#718096', italics: true, margin: [0, 0, 0, 6] });
  blocks.push({
    table: {
      headerRows: 1,
      widths: ['*', 70, 70, 70, 80],
      body: tableBody,
    },
    layout: {
      hLineWidth: (i) => (i === 0 || i === 1) ? 1 : 0.5,
      vLineWidth: () => 0,
      hLineColor: (i) => (i === 0 || i === 1) ? '#E2E8F0' : '#F0F0F0',
      fillColor: (row) => row === 0 ? '#F8FAFB' : null,
    },
    margin: [0, 0, 0, 12],
  });
  return blocks;
}

function buildDossierContent(dossierData) {
  if (!dossierData) return [{ text: 'Données dossier non disponibles.', color: '#A0AEC0' }];

  const { variables = {}, overrides = {}, comments = {}, cumaList = [] } = dossierData;
  const content = [];

  // Page de garde
  content.push(
    { text: 'ANALYSE DE GESTION', fontSize: 20, bold: true, color: COLORS.text, margin: [0, 0, 0, 8] },
    { text: `CUMA ${variables.nom_cuma || ''}`, fontSize: 16, color: COLORS.orange, margin: [0, 0, 0, 4] },
    { text: `Exercice comptable du ${variables.debut_periode || '—'} au ${variables.fin_periode || '—'}`, fontSize: 12, color: '#718096', margin: [0, 0, 0, 24] },
    {
      table: {
        widths: ['auto', '*'],
        body: [
          [{ text: 'N° agrément :', fontSize: 10, color: '#718096' }, { text: variables.num_agrement || '—', fontSize: 10 }],
          [{ text: 'Commune :', fontSize: 10, color: '#718096' }, { text: variables.commune || '—', fontSize: 10 }],
          [{ text: 'Comptable :', fontSize: 10, color: '#718096' }, { text: variables.comptable_nom || '—', fontSize: 10 }],
          [{ text: 'Nb adhérents :', fontSize: 10, color: '#718096' }, { text: String(variables.nb_adherent || '—'), fontSize: 10 }],
        ],
      },
      layout: 'noBorders',
      margin: [0, 0, 0, 20],
    },
    { text: '', pageBreak: 'after' },
  );

  // Page 2 — Résultats
  content.push(
    makeSectionTitle(DOC_LABELS.dossier_gestion + ' — Différents niveaux de résultats', 'dossier_resultats'),
    ...dossierSection(null, null, [
      { label: "Chiffres d'affaires", keys: ['ca', 'ca_n1', 'ca_n2'], suffix: '€' },
      { label: "Excédent brut d'exploitation", keys: ['ebe', 'ebe_n1', 'ebe_n2'], suffix: '€' },
      { label: "Résultat courant (hors plu/moins value)", keys: ['res_courant_plu_val_n', 'res_courant_plu_val_n1', 'res_courant_plu_val_n2'], suffix: '€' },
      { label: "Plu / moins value", keys: ['plu_moins_value_n', 'plu_moins_value_n1', 'plu_moins_value_n2'], suffix: '€' },
      { label: "Résultat courant", keys: ['rc', 'rc_n1', 'rc_n2'], suffix: '€', isTotal: true },
      { label: "Résultat exceptionnel", keys: ['rex', 'rex_n1', 'rex_n2'], suffix: '€' },
      { label: "Résultat Net comptable", keys: ['rnc', 'rnc_n1', 'rnc_n2'], suffix: '€', isTotal: true },
    ], variables, overrides),
    { text: "E.B.E. = CA − Achats − Services extérieurs − Impôts et Taxes − Charges Salariales + Subventions d'exploitation", fontSize: 8, color: '#718096', italics: true, margin: [0, 0, 0, 8] },
  );
  if (comments.resultats) content.push({ text: comments.resultats, fontSize: 9, italics: true, color: '#4A5568', margin: [0, 4, 0, 0] });
  content.push({ text: '', pageBreak: 'after' });

  // Page 3 — Charges
  content.push(
    makeSectionTitle(DOC_LABELS.dossier_gestion + ' — Analyse des charges', 'dossier_charges'),
    { text: "Note : Ces ratios sont calculés par rapport à un chiffre d'affaires corrigé des prestations réalisées par d'autres CUMA.", fontSize: 8, italics: true, color: '#718096', margin: [0, 0, 0, 8] },
    ...dossierSection("Frais d'entretien et taux de vétusté", null, [
      { label: 'Charges entretien réparation corrigé', keys: ['entretien', 'entretien_n1', 'entretien_n2'], suffix: '€' },
      { label: 'Entretien & réparation / CA corrigé', keys: ['entretien_ca', 'entretien_ca_n1', 'entretien_ca_n2'], suffix: '%' },
      { label: 'Amortissement / CA corrigé', keys: ['amort_ca', 'amort_ca_n1', 'amort_ca_n2'], suffix: '%' },
      { label: 'Taux de vétusté', keys: ['tx_vetuste', 'tx_vetuste_n1', 'tx_vetuste_n2'], suffix: '%' },
    ], variables, overrides),
    ...dossierSection("Autres charges", null, [
      { label: 'Charges salariales', keys: ['chgsal', 'chgsal_n1', 'chgsal_n2'], suffix: '€' },
      { label: 'Charges salariales / CA corrigé', keys: ['chgsal_ca', 'chgsal_ca_n1', 'chgsal_ca_n2'], suffix: '%' },
      { label: 'Carburant', keys: ['carburant', 'carburant_n1', 'carburant_n2'], suffix: '€' },
      { label: 'Frais financiers / CA corrigé', keys: ['ffinancier_ca', 'ffinancier_ca_n1', 'ffinancier_ca_n2'], suffix: '%' },
    ], variables, overrides),
  );
  if (comments.charges) content.push({ text: comments.charges, fontSize: 9, italics: true, color: '#4A5568', margin: [0, 4, 0, 0] });
  content.push({ text: '', pageBreak: 'after' });

  // Page 4 — Financement
  content.push(
    makeSectionTitle(DOC_LABELS.dossier_gestion + ' — Financement de l\'exercice', 'dossier_financement'),
    {
      table: {
        headerRows: 1,
        widths: ['*', 100, 100],
        body: [
          [{ text: 'Libellé', style: 'tableHeader', alignment: 'left' }, { text: 'N', style: 'tableHeader', alignment: 'right' }, { text: 'N-1', style: 'tableHeader', alignment: 'right' }],
          [{ text: "Résultat (hors vente de matériel)", fontSize: 9 }, { text: dossierVal(variables, overrides, 'res_hors_revente'), fontSize: 9, alignment: 'right' }, { text: '—', fontSize: 9, alignment: 'right' }],
          [{ text: "+ Amortissements + Provisions − Reprises", fontSize: 9, color: '#718096' }, { text: dossierVal(variables, overrides, 'dot_amort_reprise_prov'), fontSize: 9, alignment: 'right' }, { text: '—', fontSize: 9, alignment: 'right' }],
          [{ text: "= Capacité d'Autofinancement Nette", fontSize: 9, bold: true, color: COLORS.green }, { text: dossierVal(variables, overrides, 'CAF'), fontSize: 9, alignment: 'right', bold: true, color: COLORS.green }, { text: dossierVal(variables, overrides, 'CAF_n1'), fontSize: 9, alignment: 'right', bold: true, color: COLORS.green }],
          [{ text: "− Remboursement capital emprunts LMT", fontSize: 9, color: '#718096' }, { text: dossierVal(variables, overrides, 'remb_emprunt'), fontSize: 9, alignment: 'right' }, { text: '—', fontSize: 9, alignment: 'right' }],
          [{ text: "Achat d'immobilisation", fontSize: 9 }, { text: dossierVal(variables, overrides, 'achat_immo'), fontSize: 9, alignment: 'right' }, { text: '—', fontSize: 9, alignment: 'right' }],
          [{ text: "+ Augmentation P.S. CRCA et autres", fontSize: 9, color: '#718096' }, { text: dossierVal(variables, overrides, 'augment_PSCRCA'), fontSize: 9, alignment: 'right' }, { text: '—', fontSize: 9, alignment: 'right' }],
          [{ text: "+ Remboursement emprunt par anticipation", fontSize: 9, color: '#718096' }, { text: dossierVal(variables, overrides, 'Emprunt_anticipation'), fontSize: 9, alignment: 'right' }, { text: '—', fontSize: 9, alignment: 'right' }],
          [{ text: "− Réalisations d'emprunt LMT", fontSize: 9, color: '#718096' }, { text: dossierVal(variables, overrides, 'emprunt_LMT'), fontSize: 9, alignment: 'right' }, { text: '—', fontSize: 9, alignment: 'right' }],
          [{ text: "− Revente d'immobilisations", fontSize: 9, color: '#718096' }, { text: dossierVal(variables, overrides, 'revente_immo'), fontSize: 9, alignment: 'right' }, { text: '—', fontSize: 9, alignment: 'right' }],
          [{ text: "+/− Besoin / Dégagement", fontSize: 9, bold: true, color: COLORS.green }, { text: dossierVal(variables, overrides, 'besoin_autofin'), fontSize: 9, alignment: 'right', bold: true, color: COLORS.green }, { text: dossierVal(variables, overrides, 'besoin_autofin_n1'), fontSize: 9, alignment: 'right', bold: true, color: COLORS.green }],
          [{ text: "+/− Variation du capital social", fontSize: 9, color: '#718096' }, { text: dossierVal(variables, overrides, 'variation_KS'), fontSize: 9, alignment: 'right' }, { text: '—', fontSize: 9, alignment: 'right' }],
          [{ text: "− Subvention d'investissement", fontSize: 9, color: '#718096' }, { text: dossierVal(variables, overrides, 'subvention'), fontSize: 9, alignment: 'right' }, { text: '—', fontSize: 9, alignment: 'right' }],
          [{ text: "= Variation du Fonds de Roulement", fontSize: 9, bold: true, color: COLORS.green }, { text: dossierVal(variables, overrides, 'var_FdR'), fontSize: 9, alignment: 'right', bold: true, color: COLORS.green }, { text: dossierVal(variables, overrides, 'var_FdR_n1'), fontSize: 9, alignment: 'right', bold: true, color: COLORS.green }],
        ],
      },
      layout: { hLineWidth: (i) => i <= 1 ? 1 : 0.5, vLineWidth: () => 0, hLineColor: () => '#E2E8F0', fillColor: (r) => r === 0 ? '#F8FAFB' : null },
      margin: [0, 0, 0, 8],
    },
    { text: `Pour info, montant d'emprunt à réaliser : ${dossierVal(variables, overrides, 'Emprunt_recevoir')}`, fontSize: 9, color: '#718096', margin: [0, 0, 0, 8] },
  );
  if (comments.financement) content.push({ text: comments.financement, fontSize: 9, italics: true, color: '#4A5568', margin: [0, 4, 0, 0] });
  content.push({ text: '', pageBreak: 'after' });

  // Page 5 — Fonds de roulement
  content.push(
    makeSectionTitle(DOC_LABELS.dossier_gestion + ' — Fonds de roulement et disponibilité', 'dossier_fdr'),
    ...dossierSection("Fonds de roulement", null, [
      { label: 'Fonds de roulement', keys: ['fd_roulement', 'fd_roulement_n1', 'fd_roulement_n2'], suffix: '€' },
      { label: 'Fonds de roulement / CA', keys: ['fd_roulement_ca', 'fd_roulement_ca_n1', 'fd_roulement_ca_n2'], suffix: '%' },
    ], variables, overrides),
    ...dossierSection("Créances et trésorerie", null, [
      { label: 'Créances / CA', keys: ['creance_ca', 'creance_ca_n1', 'creance_ca_n2'], suffix: '%' },
      { label: 'Trésorerie Nette Globale', keys: ['treso_net', 'treso_net_n1', 'treso_net_n2'], suffix: '€' },
    ], variables, overrides),
  );
  if (comments.fonds_roulement) content.push({ text: comments.fonds_roulement, fontSize: 9, italics: true, color: '#4A5568', margin: [0, 4, 0, 0] });
  content.push({ text: '', pageBreak: 'after' });

  // Page 6 — Capital social
  content.push(
    makeSectionTitle(DOC_LABELS.dossier_gestion + ' — Capital social. Recours à l\'emprunt', 'dossier_capital'),
    ...dossierSection("Capital social", null, [
      { label: 'Capital Social / CA', keys: ['CS_CA', 'CS_CA_n1', 'CS_CA_n2'], suffix: '%' },
      { label: 'Capital Social / valeur brute du matériel', keys: ['CS_val_brute_mat', 'CS_val_brute_mat_n1', 'CS_val_brute_mat_n2'], suffix: '%' },
      { label: 'Capital Social / capitaux propres', keys: ['CS_k_propres', 'CS_k_propres_n1', 'CS_k_propres_n2'], suffix: '%' },
    ], variables, overrides),
    ...dossierSection("Endettement et autonomie", null, [
      { label: "Taux d'endettement MT et LT", keys: ['tx_endette', 'tx_endette_n1', 'tx_endette_n2'], suffix: '%' },
      { label: 'Capitaux Propres / passif (autonomie financière)', keys: ['k_propres_passif', 'k_propres_passif_n1', 'k_propres_passif_n2'], suffix: '%' },
      { label: 'Capitaux Propres / Capitaux permanents', keys: ['Capitaux_Permanent', 'Capitaux_Permanent_n1', 'Capitaux_Permanent_n2'], suffix: '%' },
    ], variables, overrides),
  );
  if (comments.capital_social) content.push({ text: comments.capital_social, fontSize: 9, italics: true, color: '#4A5568', margin: [0, 4, 0, 0] });

  // Page 7 — Synthèse
  if (comments.synthese) {
    content.push(
      { text: '', pageBreak: 'after' },
      makeSectionTitle(DOC_LABELS.dossier_gestion + ' — Synthèse générale', 'dossier_synthese'),
      { text: comments.synthese, fontSize: 10, color: '#1A202C', lineHeight: 1.6 },
    );
  }

  // Saut de page final — séparation avec le document suivant
  content.push({ text: '', pageBreak: 'after' });

  return content;
}

// ─────────────────────────────────────────────────────────────
// Point d'entrée principal
// ─────────────────────────────────────────────────────────────

/**
 * @param {object}   parsedFec
 * @param {string[]} selectedDocs  ex: ['sig', 'balance', 'grand_livre']
 * @param {{ mode: 'separate' | 'global' }} options
 * @param {(progress: number, label: string) => void} onProgress
 * @param {{ sigResult, bilanData, treasuryData, chargesData, analytiqueData }} storeData
 */
export async function generateExport(
  parsedFec, selectedDocs, options = { mode: 'global' }, onProgress = () => {},
  storeData = {}
) {
  onProgress(5, 'Chargement du moteur PDF…');
  const pdfMakeModule  = await import('pdfmake/build/pdfmake');
  const pdfFontsModule = await import('pdfmake/build/vfs_fonts');
  const pdfMake  = pdfMakeModule.default ?? pdfMakeModule;
  const pdfFonts = pdfFontsModule.default ?? pdfFontsModule;
  pdfMake.vfs = pdfFonts.pdfMake?.vfs ?? pdfFonts.vfs ?? pdfFonts;

  const BUILDERS = {
    dossier_gestion:   () => buildDossierContent(storeData.dossierData),
    sig:               () => buildSigContent(storeData.sigResult),
    bilan:             () => buildBilanContent(storeData.bilanData),
    balance:           () => buildBalanceContent(parsedFec),
    balance_aux:       () => buildBalanceAuxContent(parsedFec),
    grand_livre:       () => buildGrandLivreContent(parsedFec),
    treasury_curve:    () => buildTreasuryCurve(storeData.treasuryData),
    charges_charts:    () => buildChargesCharts(storeData.chargesData),
    analytique_table:  () => buildAnalytiqueTable(storeData.analytiqueData),
    analytique_podium: () => buildAnalytiquePodium(storeData.analytiqueData),
  };

  const defaultStyles = {
    tableHeader: { fontSize: 7, bold: true, color: COLORS.secondary },
    label:       { fontSize: 7, color: COLORS.secondary },
  };

  if (options.mode === 'separate') {
    for (let i = 0; i < selectedDocs.length; i++) {
      const id = selectedDocs[i];
      onProgress(10 + (i / selectedDocs.length) * 80, `Génération : ${DOC_LABELS[id]}…`);
      const builder = BUILDERS[id];
      if (!builder) continue;
      const content = builder();
      const docDef = {
        pageSize: 'A4', pageOrientation: 'landscape', pageMargins: [30, 50, 30, 40],
        header: makeHeader(parsedFec, DOC_LABELS[id]),
        footer: makeFooter,
        content,
        defaultStyle: { fontSize: 8, color: COLORS.text },
        styles: defaultStyles,
      };
      const fileName = `${DOC_LABELS[id].replace(/[\s—]+/g, '_')}_${parsedFec?.siren ?? 'export'}.pdf`;
      const blob = await pdfMake.createPdf(docDef).getBlob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = fileName;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      await new Promise(resolve => setTimeout(resolve, 800));
      URL.revokeObjectURL(url);
    }
  } else {
    // Dossier de gestion toujours en premier s'il est sélectionné
    const orderedDocs = [
      ...selectedDocs.filter(id => id === 'dossier_gestion'),
      ...selectedDocs.filter(id => id !== 'dossier_gestion'),
    ];

    const contentBlocks = [
      ...makeCoverPage(parsedFec, orderedDocs, DOC_LABELS),
      ...makeSommaire(),
    ];

    for (let i = 0; i < orderedDocs.length; i++) {
      const id = orderedDocs[i];
      onProgress(10 + (i / orderedDocs.length) * 75, `Génération : ${DOC_LABELS[id]}…`);
      const builder = BUILDERS[id];
      if (!builder) continue;
      contentBlocks.push(...builder());
    }

    onProgress(90, 'Assemblage du PDF…');

    const siren    = parsedFec?.siren ?? 'export';
    const today    = formatDate(new Date()).replace(/\//g, '-');
    const fileName = `Export_comptable_${siren}_${today}.pdf`;

    const docDef = {
      pageSize: 'A4', pageOrientation: 'landscape', pageMargins: [30, 50, 30, 40],
      header: makeHeader(parsedFec, 'Export comptable'),
      footer: makeFooter,
      content: contentBlocks,
      defaultStyle: { fontSize: 8, color: COLORS.text },
      styles: defaultStyles,
      info: {
        title:   `Export comptable — ${siren}`,
        author:  'Clario',
        subject: 'Export comptable',
      },
    };

    await pdfMake.createPdf(docDef).download(fileName);
  }

  onProgress(100, 'Terminé');
}
