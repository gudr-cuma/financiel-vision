/**
 * diaporamaConfig.js — Templates de diapositives et options de graphiques
 * pour le constructeur de diaporama.
 *
 * Zone geometry: inches, LAYOUT_WIDE 13.33×7.5
 */

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export const TEMPLATES = [
  {
    id: 'title_only',
    label: 'Titre seul',
    zones: [],
  },
  {
    id: 'title_full',
    label: 'Titre + zone',
    zones: [
      { label: 'Zone', defaultType: 'text', x: 0.4, y: 0.95, w: 12.53, h: 6.15 },
    ],
  },
  {
    id: 'title_2col_lr',
    label: '2 colonnes G/D',
    zones: [
      { label: 'Gauche', defaultType: 'text', x: 0.4,  y: 0.95, w: 6.165, h: 6.15 },
      { label: 'Droite', defaultType: 'text', x: 6.77, y: 0.95, w: 6.165, h: 6.15 },
    ],
  },
  {
    id: 'title_2zones_lr',
    label: '2 zones G/D',
    zones: [
      { label: 'Gauche', defaultType: 'graph', x: 0.4,  y: 0.95, w: 6.165, h: 6.15 },
      { label: 'Droite', defaultType: 'graph', x: 6.77, y: 0.95, w: 6.165, h: 6.15 },
    ],
  },
  {
    id: 'title_2zones_tb',
    label: '2 zones H/B',
    zones: [
      { label: 'Haut', defaultType: 'graph', x: 0.4, y: 0.95, w: 12.53, h: 2.95 },
      { label: 'Bas',  defaultType: 'graph', x: 0.4, y: 4.1,  w: 12.53, h: 3.0  },
    ],
  },
  {
    id: 'title_3zones',
    label: '3 zones',
    zones: [
      { label: 'H. gauche', defaultType: 'graph', x: 0.4,  y: 0.95, w: 6.165, h: 2.95 },
      { label: 'B. gauche', defaultType: 'graph', x: 0.4,  y: 4.1,  w: 6.165, h: 3.0  },
      { label: 'Droite',    defaultType: 'graph', x: 6.77, y: 0.95, w: 6.165, h: 6.15 },
    ],
  },
  {
    id: 'title_4zones',
    label: '4 zones',
    zones: [
      { label: 'H. gauche', defaultType: 'graph', x: 0.4,  y: 0.95, w: 6.165, h: 2.95 },
      { label: 'H. droite', defaultType: 'graph', x: 6.77, y: 0.95, w: 6.165, h: 2.95 },
      { label: 'B. gauche', defaultType: 'graph', x: 0.4,  y: 4.1,  w: 6.165, h: 3.0  },
      { label: 'B. droite', defaultType: 'graph', x: 6.77, y: 4.1,  w: 6.165, h: 3.0  },
    ],
  },
];

// ---------------------------------------------------------------------------
// Graph options
// ---------------------------------------------------------------------------

export const GRAPH_OPTIONS = [
  // Group: comparison
  { id: 'comp_ca',          label: "Chiffre d'affaires",               group: 'comparison', requiresN1: true },
  { id: 'comp_ebe',         label: 'EBE',                              group: 'comparison', requiresN1: true },
  { id: 'comp_resultats',   label: 'Résultats (courant/excep./net)',    group: 'comparison', requiresN1: true },
  { id: 'comp_fr',          label: 'Fonds de roulement',               group: 'comparison', requiresN1: true },
  { id: 'comp_fr_ca',       label: 'FR / CA (%)',                      group: 'comparison', requiresN1: true },
  { id: 'comp_cp_passif',   label: 'Capitaux propres / Passif (%)',    group: 'comparison', requiresN1: true },
  { id: 'comp_cs_ca',       label: 'Capital social / CA (%)',          group: 'comparison', requiresN1: true },
  { id: 'comp_cs_vbm',      label: 'Capital social / VBM (%)',         group: 'comparison', requiresN1: true },
  { id: 'comp_cs_cp',       label: 'Capital social / CP (%)',          group: 'comparison', requiresN1: true },
  { id: 'comp_creances',    label: 'Créances / CA (%)',                group: 'comparison', requiresN1: true },
  { id: 'comp_endettement', label: "Taux d'endettement (%)",           group: 'comparison', requiresN1: true },
  { id: 'comp_treso_mois',  label: 'Trésorerie — solde fin de mois',   group: 'comparison', requiresN1: true },
  { id: 'comp_ca_mensuel',  label: 'CA mensuel',                       group: 'comparison', requiresN1: true },
  { id: 'comp_charges',     label: 'Total des charges',                group: 'comparison', requiresN1: true },
  // Group: exercice N
  { id: 'treso_courbe',     label: 'Courbe de trésorerie',             group: 'fec' },
  { id: 'charges_donut',    label: 'Structure des charges',            group: 'fec' },
  { id: 'bilan_simplifie',  label: 'Bilan — ratios clés',              group: 'fec' },
  // Group: analytique
  { id: 'top3_materiels',   label: 'Top 3 matériels',                  group: 'analytique', requiresAnalytique: true },
];
