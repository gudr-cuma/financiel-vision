/**
 * pdfLayouts.js — Styles et blocs communs pour les exports PDF (pdfmake)
 */

import { formatDate } from './formatUtils';

// ─────────────────────────────────────────────────────────────
// Palette
// ─────────────────────────────────────────────────────────────
export const COLORS = {
  primary:    '#31B700',
  orange:     '#FF8200',
  blue:       '#B1DCE2',
  blueLight:  '#E3F2F5',
  greenLight: '#E8F5E0',
  red:        '#E53935',
  text:       '#1A202C',
  secondary:  '#718096',
  border:     '#E2E8F0',
  white:      '#FFFFFF',
  rowEven:    '#F9FAFB',
  rowOdd:     '#FFFFFF',
  totalRow:   '#E3F2F5',
  classRow:   '#B1DCE2',
  grandTotal: '#1A202C',
};

// ─────────────────────────────────────────────────────────────
// Styles de texte réutilisables
// ─────────────────────────────────────────────────────────────
export const STYLES = {
  default: {
    fontSize: 8,
    color: COLORS.text,
  },
  header: {
    fontSize: 9,
    bold: true,
    color: COLORS.secondary,
    fillColor: '#F7FAFC',
  },
  sectionTitle: {
    fontSize: 13,
    bold: true,
    color: COLORS.text,
    margin: [0, 16, 0, 8],
  },
  label: {
    fontSize: 8,
    color: COLORS.secondary,
  },
  amount: {
    fontSize: 8,
    alignment: 'right',
  },
  totalRow: {
    fontSize: 8,
    bold: true,
    fillColor: COLORS.totalRow,
  },
  classRow: {
    fontSize: 8,
    bold: true,
    fillColor: COLORS.classRow,
  },
  grandTotalRow: {
    fontSize: 9,
    bold: true,
    color: COLORS.white,
    fillColor: COLORS.grandTotal,
  },
};

// ─────────────────────────────────────────────────────────────
// Footer pagination — "Page X / Y"
// ─────────────────────────────────────────────────────────────
export function makeFooter(currentPage, pageCount) {
  return {
    columns: [
      { text: 'Clario Vision', fontSize: 7, color: COLORS.secondary, margin: [40, 0, 0, 0] },
      { text: `Page ${currentPage} / ${pageCount}`, fontSize: 7, color: COLORS.secondary, alignment: 'right', margin: [0, 0, 40, 0] },
    ],
    margin: [0, 8, 0, 0],
  };
}

// ─────────────────────────────────────────────────────────────
// Header de page (à partir de la page 2)
// ─────────────────────────────────────────────────────────────
export function makeHeader(parsedFec, sectionTitle) {
  return (currentPage) => {
    if (currentPage <= 1) return null;
    return {
      columns: [
        { text: sectionTitle ?? 'Livres comptables', fontSize: 7, color: COLORS.secondary, bold: true, margin: [40, 8, 0, 0] },
        { text: parsedFec?.siren ?? '', fontSize: 7, color: COLORS.secondary, alignment: 'right', margin: [0, 8, 40, 0] },
      ],
      margin: [0, 0, 0, 4],
    };
  };
}

// ─────────────────────────────────────────────────────────────
// Page de garde
// ─────────────────────────────────────────────────────────────
export function makeCoverPage(parsedFec, selectedDocs, DOC_LABELS, annexeNames = [], logoDataUrl = null) {
  const period = parsedFec?.exerciceStart && parsedFec?.exerciceEnd
    ? `${formatDate(parsedFec.exerciceStart)} — ${formatDate(parsedFec.exerciceEnd)}`
    : '';

  return [
    // Bloc logo / titre
    {
      stack: [
        // Logo client en haut à droite (si fourni)
        ...(logoDataUrl ? [{
          columns: [
            { text: '', width: '*' },
            { image: logoDataUrl, fit: [150, 70], alignment: 'right', margin: [0, 20, 0, 0] },
          ],
        }] : []),
        { text: 'Clario Vision', fontSize: 32, bold: true, color: COLORS.primary, margin: [0, logoDataUrl ? 16 : 80, 0, 4] },
        { text: 'Export des livres comptables', fontSize: 16, color: COLORS.secondary, margin: [0, 0, 0, 40] },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 2, lineColor: COLORS.blue }] },
        { text: ' ', fontSize: 4 },
        { columns: [
            { stack: [
                { text: 'SIREN',      style: 'label', margin: [0, 12, 0, 2] },
                { text: parsedFec?.siren ?? '—', fontSize: 18, bold: true, color: COLORS.text },
              ]},
            { stack: [
                { text: 'Exercice',   style: 'label', margin: [0, 12, 0, 2] },
                { text: period || '—', fontSize: 12, color: COLORS.text },
              ]},
          ]},
        { text: ' ', fontSize: 4 },
        { text: `Fichier : ${parsedFec?.fileName ?? '—'}`, fontSize: 9, color: COLORS.secondary, margin: [0, 8, 0, 0] },
        { text: `Généré le : ${formatDate(new Date())}`, fontSize: 9, color: COLORS.secondary, margin: [0, 4, 0, 40] },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: COLORS.border }] },
        { text: ' ', fontSize: 4 },
        { text: 'Documents inclus :', fontSize: 10, bold: true, color: COLORS.text, margin: [0, 12, 0, 6] },
        ...selectedDocs.map(id => ({
          text: `• ${DOC_LABELS[id] ?? id}`,
          fontSize: 10,
          color: COLORS.secondary,
          margin: [8, 2, 0, 0],
        })),
        ...(annexeNames && annexeNames.length > 0 ? [
          { text: 'Annexes :', fontSize: 10, bold: true, color: COLORS.text, margin: [0, 10, 0, 6] },
          ...annexeNames.map(name => ({
            text: `• ${name}`,
            fontSize: 10,
            color: COLORS.secondary,
            margin: [8, 2, 0, 0],
          })),
        ] : []),
      ],
      pageBreak: 'after',
    },
  ];
}

// ─────────────────────────────────────────────────────────────
// Page séparatrice Annexes (insérée à la fin du PDF pdfmake)
// ─────────────────────────────────────────────────────────────
export function makeAnnexesSeparator(annexeNames) {
  return [
    {
      stack: [
        {
          text: 'Annexes',
          id: 'section_annexes',
          fontSize: 14,
          bold: true,
          color: COLORS.text,
          margin: [0, 0, 0, 4],
          tocItem: 'mainToc',
          tocStyle: { fontSize: 11, color: COLORS.text },
          tocNumberStyle: { fontSize: 11, bold: true, color: COLORS.secondary },
          tocMargin: [0, 4, 0, 4],
        },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 2, lineColor: COLORS.blue }] },
        { text: ' ', fontSize: 6 },
        ...annexeNames.map((name, i) => ({
          text: `${i + 1}. ${name}`,
          fontSize: 10,
          color: COLORS.secondary,
          margin: [0, 4, 0, 0],
        })),
      ],
      pageBreak: 'after',
    },
  ];
}

// ─────────────────────────────────────────────────────────────
// Sommaire avec numéros de page automatiques (pdfmake TOC natif)
// ─────────────────────────────────────────────────────────────
export function makeSommaire() {
  return [
    { text: 'Sommaire', fontSize: 18, bold: true, color: COLORS.text, margin: [0, 0, 0, 20] },
    {
      toc: {
        id: 'mainToc',
        textStyle:       { fontSize: 11, color: COLORS.text },
        numberStyle:     { fontSize: 11, bold: true, color: COLORS.secondary },
        textMargin:      [0, 4, 0, 4],
        numberMargin:    [0, 4, 0, 4],
      },
    },
    { text: ' ', pageBreak: 'after' },
  ];
}

// ─────────────────────────────────────────────────────────────
// Titre de section (ancre + entrée TOC automatique)
// ─────────────────────────────────────────────────────────────
export function makeSectionTitle(label, id) {
  return {
    stack: [
      {
        text: label,
        id: `section_${id}`,
        fontSize: 14,
        bold: true,
        color: COLORS.text,
        margin: [0, 0, 0, 4],
        // Enregistrement dans le TOC natif pdfmake
        tocItem: 'mainToc',
        tocStyle: { fontSize: 11, color: COLORS.text },
        tocNumberStyle: { fontSize: 11, bold: true, color: COLORS.secondary },
        tocMargin: [0, 4, 0, 4],
      },
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 2, lineColor: COLORS.blue }] },
      { text: ' ', fontSize: 6 },
    ],
  };
}

// ─────────────────────────────────────────────────────────────
// Utilitaire : montant formaté pour pdfmake (vide si 0)
// ─────────────────────────────────────────────────────────────
export function pdfFmt(n) {
  if (!n) return '';
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    .format(n)
    .replace(/[\u00A0\u202F]/g, ' '); // espace insécable/fine → espace normale (compatibilité police pdfmake)
}
