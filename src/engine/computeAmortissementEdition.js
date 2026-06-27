import { yearOf } from './tableUtils';
import { parseFrDate } from './formatUtils';

/** Libellés PCG immo (CUMA), extensible. */
export const COMPTE_IMMO_LABELS = {
  '2145': 'Agencements',
  '2154': 'Matériels industriels',
  '21541000': 'Matériels agricoles',
  '21542000': 'Accessoires matériel',
};

/** Arrondi au centime (symétrique, évite le bruit flottant). */
export function round2(n) {
  return Number(`${Math.round(Number(`${n}e2`))}e-2`);
}

/** Coerce vers nombre fini, 0 sinon. */
export function num(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

/** Racine compte immo (4 chiffres) + racine compte amortissement (28 + 3 chiffres). */
export function compteRacines(compte) {
  const c = String(compte ?? '');
  return { racineImmo: c.slice(0, 4), racineAmort: '28' + c.slice(1, 4) };
}

/** Libellé : match exact, puis racine 4 chiffres, puis numéro brut. */
export function compteLabel(compte) {
  const c = String(compte ?? '');
  return COMPTE_IMMO_LABELS[c] ?? COMPTE_IMMO_LABELS[c.slice(0, 4)] ?? c;
}

/** Mode d'amortissement : ecoMethode 1 → 'L' (linéaire). */
export function modeAmort(ecoMethode) {
  return Number(ecoMethode) === 1 ? 'L' : '';
}

/**
 * Index VNC par bien : Map<nBien, Array<[anneeCloture, residuel]>> trié par année.
 */
export function buildVncIndex(immoLignes) {
  const tmp = new Map();
  for (const l of immoLignes ?? []) {
    const y = yearOf(l.dateFinExo);
    if (y == null) continue;
    if (!tmp.has(l.nBien)) tmp.set(l.nBien, new Map());
    tmp.get(l.nBien).set(y, num(l.ecoMtResiduel));
  }
  const out = new Map();
  for (const [nb, ym] of tmp) {
    out.set(nb, [...ym.entries()].sort((a, b) => a[0] - b[0]));
  }
  return out;
}

/** VNC à la fin de `year` : residuel de la ligne ≤ year la plus récente ; cout si aucune. */
function vncAt(entries, cout, year) {
  let v = cout;
  for (const [y, res] of entries) {
    if (y <= year) v = res;
    else break;
  }
  return v;
}

/** Calcule la ligne d'amortissement d'un bien pour `exerciceYear`. */
export function computeBienRow(i1, vncIndex, exerciceYear) {
  const cout = round2(num(i1.valeurEntree));
  const entries = vncIndex.get(i1.nBien) ?? [];
  const vnc = round2(vncAt(entries, cout, exerciceYear));
  const base = round2(vncAt(entries, cout, exerciceYear - 1));
  const anterieur = round2(cout - base);
  const dotation = round2(base - vnc);
  const total = round2(cout - vnc);
  return {
    nBien: i1.nBien,
    designation: i1.libelle ?? '',
    axe: i1.axe1 ?? '',
    mode: modeAmort(i1.ecoMethode),
    dateAcq: i1.dateAcquisition ?? null,
    dateMes: i1.dateMiseEnService ?? null,
    duree: num(i1.ecoDuree),
    cout, anterieur, base, dotation, total, vnc,
  };
}

const MONEY_KEYS = ['cout', 'anterieur', 'base', 'dotation', 'total', 'vnc'];

function sumKey(rows, key) {
  return round2(rows.reduce((s, r) => s + num(r[key]), 0));
}

function compteTotaux(biens, exerciceYear) {
  const t = {};
  for (const k of MONEY_KEYS) t[k] = sumKey(biens, k);
  const acq = biens.filter(b => yearOf(b.dateAcq) === exerciceYear);
  const ant = biens.filter(b => yearOf(b.dateAcq) !== exerciceYear);
  t.acquisitionsExercice = sumKey(acq, 'cout');
  t.acquisitionsAnterieures = sumKey(ant, 'cout');
  t.soldeImmo = t.cout;
  t.soldeNet = t.vnc;
  return t;
}

/**
 * Construit l'édition « Liste des amortissements » à partir de l'Export_Multi.
 */
export function computeAmortissementEdition(exploitationData) {
  const i1All = exploitationData?.immobilisations ?? [];
  const i2 = exploitationData?.immoLignes ?? [];
  const synthese = exploitationData?.synthese ?? {};

  const fin = parseFrDate(synthese.dateFinExercice) ?? new Date();
  const debut = parseFrDate(synthese.dateDebutExercice) ?? new Date(fin.getFullYear(), 0, 1);
  const exerciceYear = fin.getFullYear();
  const vncIndex = buildVncIndex(i2);

  const actifs = i1All.filter(i => !i.dateCession);
  const byCompte = new Map();
  for (const i1 of actifs) {
    const compte = String(i1.compteImmo ?? '');
    if (!byCompte.has(compte)) byCompte.set(compte, []);
    byCompte.get(compte).push(computeBienRow(i1, vncIndex, exerciceYear));
  }

  const comptes = [...byCompte.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([compte, biens]) => {
      biens.sort((a, b) => num(a.nBien) - num(b.nBien));
      const { racineImmo, racineAmort } = compteRacines(compte);
      return { compte, libelle: compteLabel(compte), racineImmo, racineAmort, biens, totaux: compteTotaux(biens, exerciceYear) };
    });

  const allBiens = comptes.flatMap(c => c.biens);
  const totalGeneral = {};
  for (const k of MONEY_KEYS) totalGeneral[k] = sumKey(allBiens, k);

  const cessions = buildCessions(i1All, vncIndex, exerciceYear);

  return {
    exercice: { debut, fin },
    comptes,
    totalGeneral,
    cessions,
  };
}

/** Tableau des cessions : biens cédés dans l'exercice, groupés par compte. */
function buildCessions(i1All, vncIndex, exerciceYear) {
  const cedes = i1All.filter(i => yearOf(i.dateCession) === exerciceYear);
  const byCompte = new Map();
  for (const i1 of cedes) {
    const compte = String(i1.compteImmo ?? '');
    const row = computeBienRow(i1, vncIndex, exerciceYear);
    const prixCession = round2(num(i1.mtCession));
    const bien = {
      ...row,
      dateCession: i1.dateCession ?? null,
      prixCession,
      plusMoinsValue: round2(prixCession - row.vnc),
      fiscalTotal: row.total,
      derogatoire: 0,
    };
    if (!byCompte.has(compte)) byCompte.set(compte, []);
    byCompte.get(compte).push(bien);
  }
  return [...byCompte.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([compte, biens]) => {
      biens.sort((a, b) => num(a.nBien) - num(b.nBien));
      const totaux = {};
      for (const k of [...MONEY_KEYS, 'prixCession', 'plusMoinsValue']) {
        totaux[k] = sumKey(biens, k);
      }
      const { racineImmo, racineAmort } = compteRacines(compte);
      return { compte, libelle: compteLabel(compte), racineImmo, racineAmort, biens, totaux };
    });
}
