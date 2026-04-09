/**
 * generatePptx.js — Génération de diaporama .pptx côté client
 * Utilise pptxgenjs (100% browser, pas de serveur).
 *
 * Couleurs (sans #) :
 *   N      : '31B700'  (vert)
 *   N-1    : 'FF8200'  (orange)
 *   N-2    : 'B1DCE2'  (bleu)
 */

import PptxGenJS from 'pptxgenjs';

// ---------------------------------------------------------------------------
// Constantes de style
// ---------------------------------------------------------------------------

const CLR = {
  green:    '31B700',
  orange:   'FF8200',
  blue:     'B1DCE2',
  forest:   '00965E',
  lime:     '93C90E',
  red:      'E53935',
  grey:     '718096',
  darkgrey: '4A5568',
  text:     '1A202C',
  border:   'E2E8F0',
  bgLight:  'F8FAFB',
};

// Palette séries N / N-1 / N-2
const SERIES_COLORS = [CLR.green, CLR.orange, CLR.blue];

// Palette charges
const CHARGE_COLORS = [CLR.orange, CLR.green, CLR.forest, CLR.lime, CLR.blue, CLR.red, CLR.grey];

// Dimensions slide (LAYOUT_WIDE = 13.33 × 7.5 pouces)
const W = 13.33;
const H = 7.5;
const MARGIN = 0.4;

// Zone de titre
const TITLE_Y = 0.28;
const TITLE_H = 0.55;

// Zone graphique principale (sous le titre)
const CHART_Y = TITLE_Y + TITLE_H + 0.12;
const CHART_H = H - CHART_Y - MARGIN;
const CHART_W = W - MARGIN * 2;

// ---------------------------------------------------------------------------
// Helpers — extraction données
// ---------------------------------------------------------------------------

/**
 * Récupère le montant d'un poste SIG par son id.
 */
function sigVal(sigResult, id) {
  return sigResult?.lines?.find(l => l.id === id)?.amount ?? 0;
}

/**
 * Construit un label exercice court à partir d'un parsedFec.
 * Exemple : "2024"
 */
function exLabel(parsedFec) {
  if (!parsedFec) return '';
  const end = parsedFec.exerciceEnd;
  if (!end) return '';
  return String(end.getFullYear());
}

/**
 * Données mensuelles CA depuis sigResult.monthly.
 * Retourne [{ label, value }]
 */
function monthlyCA(sigResult) {
  return (sigResult?.monthly ?? []).map(m => ({
    label: m.shortLabel ?? m.label ?? '',
    value: m.ca ?? 0,
  }));
}

/**
 * Données mensuelles trésorerie (solde fin de mois) depuis dailyCurve.
 * Retourne [{ label, value }]
 */
function monthlyTreasury(treasuryData, parsedFec) {
  if (!treasuryData?.dailyCurve?.length) return [];
  const curve = treasuryData.dailyCurve;

  // Regrouper par mois (YYYY-MM) → prendre le dernier solde du mois
  const byMonth = new Map();
  for (const { date, solde } of curve) {
    const d = date instanceof Date ? date : new Date(date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    byMonth.set(key, { solde, date: d });
  }

  // Ordonner selon exerciceMonths si disponible
  const months = parsedFec?.exerciceMonths ?? [];
  const result = [];

  if (months.length > 0) {
    const year = parsedFec.exerciceEnd?.getFullYear() ?? new Date().getFullYear();
    const startYear = parsedFec.exerciceStart?.getFullYear() ?? year;

    for (const m of months) {
      // Un exercice peut chevaucher deux années
      const yr = m <= parsedFec.exerciceEnd?.getMonth() + 1
        ? year
        : startYear;
      const key = `${yr}-${String(m).padStart(2, '0')}`;
      const entry = byMonth.get(key);
      if (entry) {
        result.push({
          label: entry.date.toLocaleString('fr-FR', { month: 'short' }),
          value: Math.round(entry.solde),
        });
      }
    }
    if (result.length > 0) return result;
  }

  // Fallback : tri chronologique
  return [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, { solde, date }]) => ({
      label: date.toLocaleString('fr-FR', { month: 'short' }),
      value: Math.round(solde),
    }));
}

/**
 * Formate un montant en € (k€ si >= 10 000).
 */
function fmt(v) {
  if (v === null || v === undefined || !isFinite(v)) return '—';
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${(v / 1_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} M€`;
  if (abs >= 10_000) return `${Math.round(v / 1_000).toLocaleString('fr-FR')} k€`;
  return `${Math.round(v).toLocaleString('fr-FR')} €`;
}

function fmtPct(v) {
  if (v === null || v === undefined || !isFinite(v)) return '—';
  return `${v.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %`;
}

function safeDiv(a, b) {
  if (!b || b === 0 || !isFinite(a) || !isFinite(b)) return null;
  return (a / b) * 100;
}

// ---------------------------------------------------------------------------
// Slide — titre partagé
// ---------------------------------------------------------------------------

function addSlideTitle(slide, title) {
  slide.addText(title, {
    x: MARGIN, y: TITLE_Y, w: CHART_W, h: TITLE_H,
    fontSize: 22,
    bold: true,
    color: CLR.text,
    fontFace: 'Calibri',
  });
  // Ligne de séparation
  slide.addShape('rect', {
    x: MARGIN, y: TITLE_Y + TITLE_H, w: CHART_W, h: 0.02,
    fill: { color: CLR.border },
    line: { color: CLR.border },
  });
}

/**
 * Ajoute un pied de page discret sur chaque diapo.
 */
function addFooter(slide, cumaName, exerciceLabel) {
  const text = [cumaName, exerciceLabel].filter(Boolean).join(' — ');
  if (!text) return;
  slide.addText(text, {
    x: MARGIN, y: H - 0.3, w: CHART_W, h: 0.25,
    fontSize: 8,
    color: CLR.grey,
    fontFace: 'Calibri',
    align: 'right',
  });
}

// ---------------------------------------------------------------------------
// Slide — Page de garde
// ---------------------------------------------------------------------------

function addCoverSlide(pptx, { cumaName, exerciceLabel, logoDataUrl }) {
  const slide = pptx.addSlide();

  // Fond vert dégradé simulé avec un rectangle plein
  slide.addShape('rect', {
    x: 0, y: 0, w: W, h: H * 0.55,
    fill: { color: 'E8F5E0' },
    line: { color: 'E8F5E0' },
  });

  // Logo optionnel (coin supérieur gauche)
  if (logoDataUrl) {
    try {
      slide.addImage({
        data: logoDataUrl,
        x: 0.5, y: 0.4, w: 1.8, h: 0.9,
        sizing: { type: 'contain', w: 1.8, h: 0.9 },
      });
    } catch (_) { /* ignore logo errors */ }
  }

  // Titre principal
  slide.addText('🌿 Clario Vision', {
    x: 1.0, y: 1.1, w: W - 2.0, h: 0.8,
    fontSize: 28,
    bold: true,
    color: CLR.green,
    fontFace: 'Calibri',
    align: 'center',
  });

  // Nom CUMA
  if (cumaName) {
    slide.addText(cumaName, {
      x: 1.0, y: 2.0, w: W - 2.0, h: 0.6,
      fontSize: 22,
      bold: false,
      color: CLR.text,
      fontFace: 'Calibri',
      align: 'center',
    });
  }

  // Exercice
  if (exerciceLabel) {
    slide.addText(exerciceLabel, {
      x: 1.0, y: 2.7, w: W - 2.0, h: 0.5,
      fontSize: 16,
      color: CLR.darkgrey,
      fontFace: 'Calibri',
      align: 'center',
    });
  }

  // Sous-titre analyse
  slide.addText('Analyse financière', {
    x: 1.0, y: 3.35, w: W - 2.0, h: 0.4,
    fontSize: 13,
    color: CLR.grey,
    fontFace: 'Calibri',
    align: 'center',
    italic: true,
  });

  // Date de génération
  const dateStr = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  slide.addText(`Document généré le ${dateStr}`, {
    x: 1.0, y: H - 0.8, w: W - 2.0, h: 0.3,
    fontSize: 9,
    color: CLR.grey,
    fontFace: 'Calibri',
    align: 'center',
  });
}

// ---------------------------------------------------------------------------
// Slide — Graphique barre de comparaison (1 indicateur, N / N-1 / N-2)
// ---------------------------------------------------------------------------

function addCompBarSlide(pptx, { title, values, footer }) {
  // values = [{ label: '2024', value: 150000 }, { label: '2023', value: 130000 }, ...]
  const slide = pptx.addSlide();
  addSlideTitle(slide, title);

  const validValues = values.filter(v => v.value !== null && isFinite(v.value));
  if (validValues.length === 0) {
    slide.addText('Données insuffisantes', {
      x: MARGIN, y: CHART_Y + 1.5, w: CHART_W, h: 0.5,
      fontSize: 14, color: CLR.grey, align: 'center',
    });
  } else {
    // Chart data : chaque série = 1 exercice, 1 label = indicateur
    const chartData = validValues.map((v, i) => ({
      name: v.label,
      labels: [title],
      values: [Math.round(v.value)],
      color: SERIES_COLORS[i] ?? CLR.grey,
    }));

    // Zone valeurs sur la droite
    const valZoneX = W - MARGIN - 3.5;
    const valZoneW = 3.2;

    slide.addChart(PptxGenJS.ChartType.bar, chartData, {
      x: MARGIN,
      y: CHART_Y,
      w: valZoneX - MARGIN - 0.3,
      h: CHART_H - 0.4,
      barDir: 'col',
      chartColors: validValues.map((_, i) => SERIES_COLORS[i] ?? CLR.grey),
      showLegend: true,
      legendPos: 'b',
      showValue: true,
      dataLabelFontSize: 11,
      dataLabelPosition: 'outEnd',
      valAxisMinVal: 0,
      catAxisLabelFontSize: 13,
      valAxisHidden: true,
      catGridLine: { style: 'none' },
      valGridLine: { style: 'none' },
      plotAreaBorderColor: CLR.border,
    });

    // Tableau de valeurs à droite
    let ty = CHART_Y + 0.5;
    for (const v of validValues) {
      slide.addText(v.label, {
        x: valZoneX, y: ty, w: valZoneW, h: 0.35,
        fontSize: 12, bold: true, color: CLR.text, fontFace: 'Calibri',
      });
      slide.addText(fmt(v.value), {
        x: valZoneX, y: ty + 0.35, w: valZoneW, h: 0.45,
        fontSize: 20, bold: true, color: CLR.green, fontFace: 'Calibri',
      });
      ty += 1.1;
    }
  }

  addFooter(slide, footer.cumaName, footer.exerciceLabel);
  return slide;
}

// ---------------------------------------------------------------------------
// Slide — Multi-indicateurs barre (ex : résultats courant/exceptionnel/net)
// ---------------------------------------------------------------------------

function addMultiBarSlide(pptx, { title, series, footer }) {
  // series = [{ name: '2024', labels: ['Courant', 'Excep.', 'Net'], values: [v1, v2, v3] }, ...]
  const slide = pptx.addSlide();
  addSlideTitle(slide, title);

  const slide_chart_data = series.map((s, i) => ({
    name: s.name,
    labels: s.labels,
    values: s.values.map(v => Math.round(v ?? 0)),
    color: SERIES_COLORS[i] ?? CLR.grey,
  }));

  slide.addChart(PptxGenJS.ChartType.bar, slide_chart_data, {
    x: MARGIN,
    y: CHART_Y,
    w: CHART_W,
    h: CHART_H,
    barDir: 'col',
    barGrouping: 'clustered',
    chartColors: series.map((_, i) => SERIES_COLORS[i] ?? CLR.grey),
    showLegend: true,
    legendPos: 'b',
    showValue: true,
    dataLabelFontSize: 9,
    catAxisLabelFontSize: 12,
    valAxisHidden: false,
    catGridLine: { style: 'none' },
  });

  addFooter(slide, footer.cumaName, footer.exerciceLabel);
}

// ---------------------------------------------------------------------------
// Slide — Comparaison ratio % (barre horizontale ou barre verticale)
// ---------------------------------------------------------------------------

function addCompRatioSlide(pptx, { title, values, unit, footer }) {
  // values = [{ label: '2024', value: 35.2 }, ...]
  const slide = pptx.addSlide();
  addSlideTitle(slide, title);

  const validValues = values.filter(v => v.value !== null && isFinite(v.value));
  if (validValues.length === 0) {
    slide.addText('Données insuffisantes', {
      x: MARGIN, y: CHART_Y + 1.5, w: CHART_W, h: 0.5,
      fontSize: 14, color: CLR.grey, align: 'center',
    });
    addFooter(slide, footer.cumaName, footer.exerciceLabel);
    return;
  }

  const chartData = validValues.map((v, i) => ({
    name: v.label,
    labels: [title],
    values: [Math.round(v.value * 10) / 10],
  }));

  const valZoneX = W - MARGIN - 3.5;

  slide.addChart(PptxGenJS.ChartType.bar, chartData, {
    x: MARGIN,
    y: CHART_Y,
    w: valZoneX - MARGIN - 0.3,
    h: CHART_H - 0.4,
    barDir: 'col',
    chartColors: validValues.map((_, i) => SERIES_COLORS[i] ?? CLR.grey),
    showLegend: true,
    legendPos: 'b',
    showValue: true,
    dataLabelFontSize: 11,
    valAxisMinVal: 0,
    catAxisLabelFontSize: 13,
    valAxisHidden: true,
    catGridLine: { style: 'none' },
    valGridLine: { style: 'none' },
  });

  // Valeurs texte
  let ty = CHART_Y + 0.5;
  for (const v of validValues) {
    slide.addText(v.label, {
      x: valZoneX, y: ty, w: 3.2, h: 0.35,
      fontSize: 12, bold: true, color: CLR.text, fontFace: 'Calibri',
    });
    slide.addText(unit === 'pct' ? fmtPct(v.value) : fmt(v.value), {
      x: valZoneX, y: ty + 0.35, w: 3.2, h: 0.45,
      fontSize: 20, bold: true, color: CLR.green, fontFace: 'Calibri',
    });
    ty += 1.1;
  }

  addFooter(slide, footer.cumaName, footer.exerciceLabel);
}

// ---------------------------------------------------------------------------
// Slide — Courbe mensuelle (ligne)
// ---------------------------------------------------------------------------

function addLineSlide(pptx, { title, series, footer }) {
  // series = [{ name, data: [{label, value}] }]
  const slide = pptx.addSlide();
  addSlideTitle(slide, title);

  const labels = series[0]?.data?.map(d => d.label) ?? [];
  const chartData = series.map((s, i) => ({
    name: s.name,
    labels,
    values: s.data.map(d => Math.round(d.value ?? 0)),
  }));

  slide.addChart(PptxGenJS.ChartType.line, chartData, {
    x: MARGIN,
    y: CHART_Y,
    w: CHART_W,
    h: CHART_H,
    chartColors: series.map((_, i) => SERIES_COLORS[i] ?? CLR.grey),
    lineSize: 2.5,
    showDot: true,
    showLegend: series.length > 1,
    legendPos: 'b',
    showValue: false,
    catAxisLabelFontSize: 11,
    valAxisHidden: false,
    catGridLine: { style: 'none' },
    valGridLine: { style: 'thin', color: CLR.border },
  });

  addFooter(slide, footer.cumaName, footer.exerciceLabel);
}

// ---------------------------------------------------------------------------
// Slide — Donut structure des charges
// ---------------------------------------------------------------------------

function addDonutSlide(pptx, { title, categories, footer }) {
  const slide = pptx.addSlide();
  addSlideTitle(slide, title);

  const validCats = categories.filter(c => c.montant > 0);
  if (validCats.length === 0) {
    slide.addText('Aucune charge', { x: MARGIN, y: CHART_Y + 1, w: CHART_W, h: 0.5, fontSize: 14, color: CLR.grey, align: 'center' });
    addFooter(slide, footer.cumaName, footer.exerciceLabel);
    return;
  }

  const chartData = [{
    name: 'Charges',
    labels: validCats.map(c => c.label),
    values: validCats.map(c => Math.round(c.montant)),
  }];

  const colors = validCats.map((_, i) => CHARGE_COLORS[i % CHARGE_COLORS.length]);

  // Donut à gauche
  const donutW = 6.5;
  slide.addChart(PptxGenJS.ChartType.doughnut, chartData, {
    x: MARGIN,
    y: CHART_Y,
    w: donutW,
    h: CHART_H,
    chartColors: colors,
    showLegend: true,
    legendPos: 'b',
    legendFontSize: 10,
    holeSize: 55,
    showValue: false,
    showPercent: true,
    dataLabelFontSize: 10,
  });

  // Tableau détail à droite
  const tableX = MARGIN + donutW + 0.3;
  const tableW = W - tableX - MARGIN;

  // En-tête
  slide.addText('Répartition', {
    x: tableX, y: CHART_Y + 0.1, w: tableW, h: 0.35,
    fontSize: 11, bold: true, color: CLR.text, fontFace: 'Calibri',
  });

  const total = validCats.reduce((s, c) => s + c.montant, 0);
  let ry = CHART_Y + 0.55;
  const rowH = (CHART_H - 0.7) / Math.min(validCats.length, 8);

  for (const cat of validCats.slice(0, 8)) {
    const pct = total > 0 ? (cat.montant / total * 100).toFixed(1) : '0.0';
    slide.addText(`${cat.label}`, {
      x: tableX, y: ry, w: tableW * 0.55, h: rowH - 0.04,
      fontSize: 10, color: CLR.text, fontFace: 'Calibri',
    });
    slide.addText(fmt(cat.montant), {
      x: tableX + tableW * 0.55, y: ry, w: tableW * 0.25, h: rowH - 0.04,
      fontSize: 10, color: CLR.darkgrey, fontFace: 'Calibri', align: 'right',
    });
    slide.addText(`${pct} %`, {
      x: tableX + tableW * 0.8, y: ry, w: tableW * 0.2, h: rowH - 0.04,
      fontSize: 10, color: CLR.grey, fontFace: 'Calibri', align: 'right',
    });
    ry += rowH;
  }

  addFooter(slide, footer.cumaName, footer.exerciceLabel);
}

// ---------------------------------------------------------------------------
// Slide — Bilan simplifié (tableau)
// ---------------------------------------------------------------------------

function addBilanSlide(pptx, { title, bilanData, footer }) {
  const slide = pptx.addSlide();
  addSlideTitle(slide, title);

  if (!bilanData) {
    slide.addText('Données bilan indisponibles', { x: MARGIN, y: CHART_Y + 1, w: CHART_W, h: 0.5, fontSize: 14, color: CLR.grey, align: 'center' });
    addFooter(slide, footer.cumaName, footer.exerciceLabel);
    return;
  }

  const { actifImmobilise, actifCirculant, capitauxPropres, dettes, totalActif, totalPassif, ratios } = bilanData;

  const colW = (CHART_W - 0.4) / 2;
  const leftX = MARGIN;
  const rightX = MARGIN + colW + 0.4;
  let ay = CHART_Y + 0.15;
  let py = CHART_Y + 0.15;
  const rowH = 0.32;
  const headerH = 0.38;

  const hStyle = { fontSize: 12, bold: true, color: CLR.text, fontFace: 'Calibri' };
  const sectionStyle = { fontSize: 10, bold: true, color: CLR.darkgrey, fontFace: 'Calibri' };
  const lineStyle = { fontSize: 10, color: CLR.darkgrey, fontFace: 'Calibri' };
  const totalStyle = { fontSize: 11, bold: true, color: CLR.green, fontFace: 'Calibri' };
  const alignRight = { align: 'right' };

  // En-têtes colonnes
  slide.addText('ACTIF', { x: leftX, y: ay, w: colW * 0.6, h: headerH, ...hStyle });
  slide.addText(fmt(totalActif), { x: leftX + colW * 0.6, y: ay, w: colW * 0.4, h: headerH, ...hStyle, ...alignRight });
  slide.addText('PASSIF', { x: rightX, y: py, w: colW * 0.6, h: headerH, ...hStyle });
  slide.addText(fmt(totalPassif), { x: rightX + colW * 0.6, y: py, w: colW * 0.4, h: headerH, ...hStyle, ...alignRight });
  ay += headerH + 0.05;
  py += headerH + 0.05;

  // ---- ACTIF ----
  // Immobilisé
  slide.addText(actifImmobilise._label ?? 'Actif immobilisé', { x: leftX, y: ay, w: colW, h: rowH, ...sectionStyle });
  ay += rowH;
  for (const [id, poste] of Object.entries(actifImmobilise)) {
    if (id.startsWith('_') || poste.montant === 0) continue;
    slide.addText(poste.label, { x: leftX + 0.2, y: ay, w: colW * 0.65, h: rowH, ...lineStyle });
    slide.addText(fmt(poste.montant), { x: leftX + colW * 0.65 + 0.2, y: ay, w: colW * 0.35 - 0.2, h: rowH, ...lineStyle, ...alignRight });
    ay += rowH;
  }
  slide.addText(fmt(actifImmobilise._sousTotal), { x: leftX + colW * 0.65, y: ay - rowH * 0.8, w: colW * 0.35, h: rowH, ...totalStyle, ...alignRight });

  ay += 0.1;
  // Circulant
  slide.addText(actifCirculant._label ?? 'Actif circulant', { x: leftX, y: ay, w: colW, h: rowH, ...sectionStyle });
  ay += rowH;
  for (const [id, poste] of Object.entries(actifCirculant)) {
    if (id.startsWith('_') || poste.montant === 0) continue;
    slide.addText(poste.label, { x: leftX + 0.2, y: ay, w: colW * 0.65, h: rowH, ...lineStyle });
    slide.addText(fmt(poste.montant), { x: leftX + colW * 0.65 + 0.2, y: ay, w: colW * 0.35 - 0.2, h: rowH, ...lineStyle, ...alignRight });
    ay += rowH;
    if (ay > H - 0.6) break;
  }

  // ---- PASSIF ----
  // Capitaux propres
  slide.addText(capitauxPropres._label ?? 'Capitaux propres', { x: rightX, y: py, w: colW, h: rowH, ...sectionStyle });
  py += rowH;
  for (const [id, poste] of Object.entries(capitauxPropres)) {
    if (id.startsWith('_') || poste.montant === 0) continue;
    slide.addText(poste.label, { x: rightX + 0.2, y: py, w: colW * 0.65, h: rowH, ...lineStyle });
    slide.addText(fmt(poste.montant), { x: rightX + colW * 0.65 + 0.2, y: py, w: colW * 0.35 - 0.2, h: rowH, ...lineStyle, ...alignRight });
    py += rowH;
    if (py > H - 0.6) break;
  }
  py += 0.1;
  // Dettes
  slide.addText(dettes._label ?? 'Dettes', { x: rightX, y: py, w: colW, h: rowH, ...sectionStyle });
  py += rowH;
  for (const [id, poste] of Object.entries(dettes)) {
    if (id.startsWith('_') || poste.montant === 0) continue;
    slide.addText(poste.label, { x: rightX + 0.2, y: py, w: colW * 0.65, h: rowH, ...lineStyle });
    slide.addText(fmt(poste.montant), { x: rightX + colW * 0.65 + 0.2, y: py, w: colW * 0.35 - 0.2, h: rowH, ...lineStyle, ...alignRight });
    py += rowH;
    if (py > H - 0.6) break;
  }

  // Ratios en bas
  if (ratios) {
    const ry = H - 0.65;
    const rw = (CHART_W - 0.6) / 4;
    const ratioList = [
      { label: 'Fonds de roulement', v: fmt(ratios.fondsRoulement?.value) },
      { label: 'BFR', v: fmt(ratios.bfr?.value) },
      { label: 'Autonomie financière', v: fmtPct(ratios.autonomieFinanciere?.value) },
      { label: 'Liquidité générale', v: ratios.liquiditeGenerale?.value != null ? ratios.liquiditeGenerale.value.toFixed(2) : '—' },
    ];
    ratioList.forEach((r, i) => {
      slide.addText(r.label, {
        x: MARGIN + i * (rw + 0.2), y: ry, w: rw, h: 0.2,
        fontSize: 8, color: CLR.grey, fontFace: 'Calibri', align: 'center',
      });
      slide.addText(r.v, {
        x: MARGIN + i * (rw + 0.2), y: ry + 0.2, w: rw, h: 0.3,
        fontSize: 13, bold: true, color: CLR.green, fontFace: 'Calibri', align: 'center',
      });
    });
  }

  addFooter(slide, footer.cumaName, footer.exerciceLabel);
}

// ---------------------------------------------------------------------------
// Slide — Top 3 matériels
// ---------------------------------------------------------------------------

function addTop3Slide(pptx, { title, materiels, footer }) {
  const slide = pptx.addSlide();
  addSlideTitle(slide, title);

  const top3 = (materiels ?? []).slice(0, 3);
  if (top3.length === 0) {
    slide.addText('Aucune donnée analytique', { x: MARGIN, y: CHART_Y + 1, w: CHART_W, h: 0.5, fontSize: 14, color: CLR.grey, align: 'center' });
    addFooter(slide, footer.cumaName, footer.exerciceLabel);
    return;
  }

  const colW = (CHART_W - 0.6) / 3;
  const colors = [CLR.green, CLR.orange, CLR.blue];

  top3.forEach((mat, i) => {
    const x = MARGIN + i * (colW + 0.3);
    const cy = CHART_Y + 0.2;

    // Icône rang
    slide.addText(`${i + 1}`, {
      x, y: cy, w: 0.5, h: 0.5,
      fontSize: 22, bold: true, color: colors[i], fontFace: 'Calibri',
    });

    // Libellé matériel
    slide.addText(mat.label || mat.code || `Matériel ${i + 1}`, {
      x: x + 0.55, y: cy, w: colW - 0.55, h: 0.6,
      fontSize: 13, bold: true, color: CLR.text, fontFace: 'Calibri',
      wrap: true,
    });

    const rows = [
      { label: 'Produits facturés', value: fmt(mat.totalProduit), color: CLR.green },
      { label: 'Charges', value: fmt(mat.totalCharge), color: CLR.darkgrey },
      { label: 'Résultat', value: fmt(mat.resultat), color: mat.resultat >= 0 ? CLR.green : CLR.red },
      { label: 'Tx couverture', value: fmtPct(mat.txCouverture), color: CLR.darkgrey },
    ];

    let ry = cy + 0.7;
    for (const row of rows) {
      slide.addText(row.label, {
        x, y: ry, w: colW * 0.55, h: 0.4,
        fontSize: 10, color: CLR.grey, fontFace: 'Calibri',
      });
      slide.addText(row.value, {
        x: x + colW * 0.55, y: ry, w: colW * 0.45, h: 0.4,
        fontSize: 14, bold: true, color: row.color, fontFace: 'Calibri', align: 'right',
      });
      ry += 0.45;
    }

    // Mini-barre de couverture
    if (isFinite(mat.txCouverture) && mat.txCouverture > 0) {
      const barFull = colW - 0.1;
      const pct = Math.min(mat.txCouverture / 100, 2); // cap à 200 %
      const barFilled = barFull * Math.min(pct, 1);
      const barY = ry + 0.15;
      slide.addShape('rect', { x, y: barY, w: barFull, h: 0.12, fill: { color: CLR.border }, line: { color: CLR.border } });
      slide.addShape('rect', { x, y: barY, w: barFilled, h: 0.12, fill: { color: colors[i] }, line: { color: colors[i] } });
    }
  });

  // Légende mini en bas
  slide.addText('Source : Balance Analytique', {
    x: MARGIN, y: H - 0.45, w: CHART_W, h: 0.25,
    fontSize: 8, color: CLR.grey, fontFace: 'Calibri', italic: true,
  });

  addFooter(slide, footer.cumaName, footer.exerciceLabel);
}

// ---------------------------------------------------------------------------
// Export principal
// ---------------------------------------------------------------------------

/**
 * Génère et télécharge un fichier .pptx.
 *
 * @param {object} params
 * @param {string[]}  params.selectedSlides  — IDs des slides à inclure
 * @param {{ cumaName: string, exerciceLabel: string, logoDataUrl: string|null }} params.coverInfo
 * @param {object}    params.storeData       — snapshot du store Zustand
 * @param {function}  [params.onProgress]    — callback(message: string)
 */
export async function generatePptx({ selectedSlides, coverInfo, storeData, onProgress }) {
  const progress = (msg) => onProgress?.(msg);

  progress('Initialisation…');

  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.title  = ['Clario Vision', coverInfo.cumaName, coverInfo.exerciceLabel].filter(Boolean).join(' — ');
  pptx.author = 'Clario Vision';

  const footer = {
    cumaName:      coverInfo.cumaName ?? '',
    exerciceLabel: coverInfo.exerciceLabel ?? '',
  };

  const {
    parsedFec, sigResult, sigResultN1, sigResultN2,
    treasuryData, chargesData, bilanData,
    bilanDataN1, bilanDataN2,
    analytiqueData,
  } = storeData;

  // Labels exercices
  const labelN  = exLabel(parsedFec)  || 'N';
  const labelN1 = exLabel(storeData.parsedFecN1) || 'N-1';
  const labelN2 = exLabel(storeData.parsedFecN2) || 'N-2';

  // Helper : liste des valeurs disponibles N / N-1 / N-2
  function compValues(getterN, getterN1, getterN2) {
    const out = [];
    if (sigResult)   out.push({ label: labelN,  value: getterN() });
    if (sigResultN1) out.push({ label: labelN1, value: getterN1() });
    if (sigResultN2) out.push({ label: labelN2, value: getterN2() });
    return out;
  }

  // ── Page de garde ──────────────────────────────────────────────────────────
  progress('Page de garde…');
  addCoverSlide(pptx, coverInfo);

  // ── Slides ─────────────────────────────────────────────────────────────────

  const include = (id) => selectedSlides.includes(id);

  // CA
  if (include('comp_ca')) {
    progress('CA…');
    addCompBarSlide(pptx, {
      title: 'Chiffre d\'affaires',
      values: compValues(
        () => sigVal(sigResult,   'chiffre_affaires'),
        () => sigVal(sigResultN1, 'chiffre_affaires'),
        () => sigVal(sigResultN2, 'chiffre_affaires'),
      ),
      footer,
    });
  }

  // EBE
  if (include('comp_ebe')) {
    progress('EBE…');
    addCompBarSlide(pptx, {
      title: 'EBE — Excédent Brut d\'Exploitation',
      values: compValues(
        () => sigVal(sigResult,   'ebe'),
        () => sigVal(sigResultN1, 'ebe'),
        () => sigVal(sigResultN2, 'ebe'),
      ),
      footer,
    });
  }

  // Résultats
  if (include('comp_resultats')) {
    progress('Résultats…');
    const series = [];
    if (sigResult)   series.push({ name: labelN,  labels: ['Courant', 'Exceptionnel', 'Net'], values: [sigVal(sigResult,   'resultat_courant'), sigVal(sigResult,   'resultat_exceptionnel'), sigVal(sigResult,   'resultat_net')] });
    if (sigResultN1) series.push({ name: labelN1, labels: ['Courant', 'Exceptionnel', 'Net'], values: [sigVal(sigResultN1, 'resultat_courant'), sigVal(sigResultN1, 'resultat_exceptionnel'), sigVal(sigResultN1, 'resultat_net')] });
    if (sigResultN2) series.push({ name: labelN2, labels: ['Courant', 'Exceptionnel', 'Net'], values: [sigVal(sigResultN2, 'resultat_courant'), sigVal(sigResultN2, 'resultat_exceptionnel'), sigVal(sigResultN2, 'resultat_net')] });
    addMultiBarSlide(pptx, { title: 'Résultats', series, footer });
  }

  // Fonds de roulement
  if (include('comp_fr')) {
    progress('Fonds de roulement…');
    addCompBarSlide(pptx, {
      title: 'Fonds de Roulement',
      values: compValues(
        () => bilanData?.ratios?.fondsRoulement?.value ?? null,
        () => bilanDataN1?.ratios?.fondsRoulement?.value ?? null,
        () => bilanDataN2?.ratios?.fondsRoulement?.value ?? null,
      ),
      footer,
    });
  }

  // FR / CA
  if (include('comp_fr_ca')) {
    progress('FR/CA…');
    addCompRatioSlide(pptx, {
      title: 'Fonds de Roulement / CA (%)',
      unit: 'pct',
      values: compValues(
        () => safeDiv(bilanData?.ratios?.fondsRoulement?.value, sigVal(sigResult, 'chiffre_affaires')),
        () => safeDiv(bilanDataN1?.ratios?.fondsRoulement?.value, sigVal(sigResultN1, 'chiffre_affaires')),
        () => safeDiv(bilanDataN2?.ratios?.fondsRoulement?.value, sigVal(sigResultN2, 'chiffre_affaires')),
      ),
      footer,
    });
  }

  // CP / Passif
  if (include('comp_cp_passif')) {
    progress('Capitaux propres / Passif…');
    addCompRatioSlide(pptx, {
      title: 'Capitaux propres / Total passif (%)',
      unit: 'pct',
      values: compValues(
        () => bilanData?.ratios?.autonomieFinanciere?.value ?? null,
        () => bilanDataN1?.ratios?.autonomieFinanciere?.value ?? null,
        () => bilanDataN2?.ratios?.autonomieFinanciere?.value ?? null,
      ),
      footer,
    });
  }

  // Capital social / CA
  if (include('comp_cs_ca')) {
    progress('Capital social / CA…');
    addCompRatioSlide(pptx, {
      title: 'Capital social / CA (%)',
      unit: 'pct',
      values: compValues(
        () => safeDiv(bilanData?.capitauxPropres?.capital_social?.montant, sigVal(sigResult, 'chiffre_affaires')),
        () => safeDiv(bilanDataN1?.capitauxPropres?.capital_social?.montant, sigVal(sigResultN1, 'chiffre_affaires')),
        () => safeDiv(bilanDataN2?.capitauxPropres?.capital_social?.montant, sigVal(sigResultN2, 'chiffre_affaires')),
      ),
      footer,
    });
  }

  // Capital social / Valeur brute matériels
  if (include('comp_cs_vbm')) {
    progress('Capital social / VBM…');
    addCompRatioSlide(pptx, {
      title: 'Capital social / Valeur brute matériels (%)',
      unit: 'pct',
      values: compValues(
        () => safeDiv(bilanData?.capitauxPropres?.capital_social?.montant, bilanData?.valeurBruteMateriels),
        () => safeDiv(bilanDataN1?.capitauxPropres?.capital_social?.montant, bilanDataN1?.valeurBruteMateriels),
        () => safeDiv(bilanDataN2?.capitauxPropres?.capital_social?.montant, bilanDataN2?.valeurBruteMateriels),
      ),
      footer,
    });
  }

  // Capital social / Capitaux propres
  if (include('comp_cs_cp')) {
    progress('Capital social / CP…');
    addCompRatioSlide(pptx, {
      title: 'Capital social / Capitaux propres (%)',
      unit: 'pct',
      values: compValues(
        () => safeDiv(bilanData?.capitauxPropres?.capital_social?.montant, bilanData?.capitauxPropres?._sousTotal),
        () => safeDiv(bilanDataN1?.capitauxPropres?.capital_social?.montant, bilanDataN1?.capitauxPropres?._sousTotal),
        () => safeDiv(bilanDataN2?.capitauxPropres?.capital_social?.montant, bilanDataN2?.capitauxPropres?._sousTotal),
      ),
      footer,
    });
  }

  // Créances / CA
  if (include('comp_creances')) {
    progress('Créances / CA…');
    const getCreances = (bilan) => {
      if (!bilan) return null;
      const ac = bilan.actifCirculant;
      return (ac?.creances_adherents?.montant ?? 0)
           + (ac?.creances_exploitation?.montant ?? 0);
    };
    addCompRatioSlide(pptx, {
      title: 'Créances / CA (%)',
      unit: 'pct',
      values: compValues(
        () => safeDiv(getCreances(bilanData), sigVal(sigResult, 'chiffre_affaires')),
        () => safeDiv(getCreances(bilanDataN1), sigVal(sigResultN1, 'chiffre_affaires')),
        () => safeDiv(getCreances(bilanDataN2), sigVal(sigResultN2, 'chiffre_affaires')),
      ),
      footer,
    });
  }

  // Taux d'endettement
  if (include('comp_endettement')) {
    progress('Taux d\'endettement…');
    const getEndet = (bilan) => {
      if (!bilan) return null;
      const cp = bilan.capitauxPropres?._sousTotal;
      const d = bilan.dettes?._sousTotal;
      return safeDiv(d, cp);
    };
    addCompRatioSlide(pptx, {
      title: 'Taux d\'endettement : Dettes / Capitaux propres (%)',
      unit: 'pct',
      values: compValues(
        () => getEndet(bilanData),
        () => getEndet(bilanDataN1),
        () => getEndet(bilanDataN2),
      ),
      footer,
    });
  }

  // Trésorerie fin de mois
  if (include('comp_treso_mois')) {
    progress('Trésorerie mensuelle…');
    const seriesN  = sigResult   ? { name: labelN,  data: monthlyTreasury(treasuryData, parsedFec) } : null;
    const seriesN1 = sigResultN1 ? { name: labelN1, data: monthlyTreasury(storeData.treasuryDataN1, storeData.parsedFecN1) } : null;
    const seriesList = [seriesN, seriesN1].filter(Boolean);
    if (seriesList.length > 0) {
      addLineSlide(pptx, { title: 'Trésorerie — Solde fin de mois', series: seriesList, footer });
    }
  }

  // CA mensuel
  if (include('comp_ca_mensuel')) {
    progress('CA mensuel…');
    const dataN  = monthlyCA(sigResult);
    const dataN1 = monthlyCA(sigResultN1);
    const dataN2 = monthlyCA(sigResultN2);
    const series = [];
    if (dataN.length)  series.push({ name: labelN,  data: dataN  });
    if (dataN1.length) series.push({ name: labelN1, data: dataN1 });
    if (dataN2.length) series.push({ name: labelN2, data: dataN2 });
    if (series.length > 0) {
      addLineSlide(pptx, { title: 'Chiffre d\'affaires mensuel', series, footer });
    }
  }

  // Répartition des charges (comparaison barre)
  if (include('comp_charges')) {
    progress('Charges comparées…');
    const getTotal = (sr) => sr ? [
      sigVal(sr, 'charges_personnel'),
      sigVal(sr, 'services_exterieurs'),
      sigVal(sr, 'dotations'),
      sigVal(sr, 'achats_consommes'),
      sigVal(sr, 'charges_financieres'),
      sigVal(sr, 'impots_taxes'),
    ].reduce((a, b) => a + b, 0) : null;
    addCompBarSlide(pptx, {
      title: 'Total des charges',
      values: compValues(
        () => getTotal(sigResult),
        () => getTotal(sigResultN1),
        () => getTotal(sigResultN2),
      ),
      footer,
    });
  }

  // Courbe de trésorerie (N uniquement, par jour/mois)
  if (include('treso_courbe')) {
    progress('Courbe de trésorerie…');
    const tresoMonthly = monthlyTreasury(treasuryData, parsedFec);
    if (tresoMonthly.length > 0) {
      addLineSlide(pptx, {
        title: 'Courbe de trésorerie (solde fin de mois)',
        series: [{ name: labelN, data: tresoMonthly }],
        footer,
      });
    }
  }

  // Structure des charges (donut)
  if (include('charges_donut')) {
    progress('Structure des charges…');
    if (chargesData?.categories?.length > 0) {
      addDonutSlide(pptx, {
        title: 'Structure des charges — Exercice ' + labelN,
        categories: chargesData.categories,
        footer,
      });
    }
  }

  // Bilan simplifié
  if (include('bilan_simplifie')) {
    progress('Bilan simplifié…');
    addBilanSlide(pptx, {
      title: 'Bilan simplifié — Exercice ' + labelN,
      bilanData,
      footer,
    });
  }

  // Top 3 matériels
  if (include('top3_materiels')) {
    progress('Top 3 matériels…');
    const mats = analytiqueData?.materiels
      ? [...analytiqueData.materiels].sort((a, b) => (b.totalProduit ?? 0) - (a.totalProduit ?? 0))
      : [];
    addTop3Slide(pptx, {
      title: 'Top 3 matériels — Produits facturés',
      materiels: mats,
      footer,
    });
  }

  // ── Écriture fichier ──────────────────────────────────────────────────────
  progress('Génération du fichier…');
  const siren = parsedFec?.siren || 'diaporama';
  const fileName = `${siren}_diaporama.pptx`;
  await pptx.writeFile({ fileName });
  progress('Terminé');
}
