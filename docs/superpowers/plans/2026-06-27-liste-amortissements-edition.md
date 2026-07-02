# Édition « Liste des amortissements » — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reproduire le contenu de l'édition Divalto « Liste des amortissements » (tableau par bien avec rupture par compte d'immobilisation, totaux par compte, total général, tableau des cessions) dans Clario Vision, en écran et en export PDF.

**Architecture:** Un moteur de calcul pur (`computeAmortissementEdition.js`) joint les feuilles I1 (fiches) et I2 (plan pluri-exercices) de l'Export_Multi déjà parsé, calcule par bien les colonnes d'amortissement (en lisant la VNC dans I2, jamais dans I1 qui est corrompu), regroupe par compte et produit les totaux. Une vue React et un builder PDF consomment cette même sortie. Calcul 100 % client-side.

**Tech Stack:** React 19, Zustand, Vitest, pdfmake (via `generatePdf.js`), xlsx (déjà en place pour le parsing).

**Référence spec :** `docs/superpowers/specs/2026-06-27-liste-amortissements-edition-design.md`

**Commande de test :** `npx vitest run <chemin>` (pas de script `test` dans package.json).

---

## Rappels de données (issus du spec, validés au centime contre le PDF)

Objets déjà parsés par `parseExportMulti.js`, clés camelCase :

- **I1** = `exploitationData.immobilisations` (une fiche par bien). Clés utiles :
  `nBien`, `libelle`, `compteImmo`, `axe1`, `valeurEntree`, `dateAcquisition`,
  `dateMiseEnService`, `dateCession`, `mtCession`, `ecoMethode`, `ecoDuree`.
  ⚠️ Ne **jamais** lire `ecoMtTotal` / `ecoMtResiduel` de I1 (corrompus).
- **I2** = `exploitationData.immoLignes` (une ligne par bien × exercice). Clés utiles :
  `nBien`, `dateFinExo` (objet `Date`), `ecoMtResiduel` (VNC à cette clôture).
- **synthese** = `exploitationData.synthese`, clés `dateDebutExercice` / `dateFinExercice`
  (chaînes `'01/01/2025'` / `'31/12/2025'`).

Formules par bien (exercice courant = année de `dateFinExercice`) :
- `cout = valeurEntree`
- `vncFin = VNC(I2, exerciceYear)`, `base = VNC(I2, exerciceYear − 1)`
  où `VNC(year)` = `ecoMtResiduel` de la ligne I2 de plus grande clôture **≤ year** ;
  si aucune ligne ≤ year → `cout` (rien amorti au début).
- `anterieur = cout − base`, `dotation = base − vncFin`, `total = cout − vncFin`
- Toutes les valeurs monétaires arrondies à 2 décimales.

---

## Structure de fichiers

| Fichier | Responsabilité |
|---|---|
| **Create** `src/engine/computeAmortissementEdition.js` | Moteur pur : helpers comptes, calcul par bien, assemblage comptes/totaux/cessions. |
| **Create** `src/__tests__/computeAmortissementEdition.test.js` | Tests unitaires (valeurs PDF au centime). |
| **Create** `src/components/immobilisations/AmortissementEditionView.jsx` | Rendu écran de l'édition. |
| **Modify** `src/components/immobilisations/ImmobilisationsTab.jsx` | Conteneur à 2 sous-onglets ; le contenu actuel devient `RegistrePane`. |
| **Modify** `src/engine/generatePdf.js` | `DOC_LABELS.amortissements`, `buildAmortissementEditionContent`, dispatch. |
| **Modify** `src/components/export/ExportTab.jsx` | Entrée sélectionnable `amortissements`. |

---

## Task 1 : Moteur — helpers comptes & numériques

**Files:**
- Create: `src/engine/computeAmortissementEdition.js`
- Test: `src/__tests__/computeAmortissementEdition.test.js`

- [ ] **Step 1 : Écrire le test qui échoue**

```js
// src/__tests__/computeAmortissementEdition.test.js
import { describe, it, expect } from 'vitest';
import { compteRacines, compteLabel, modeAmort, round2 } from '../engine/computeAmortissementEdition';

describe('helpers comptes', () => {
  it('dérive les racines immo / amort', () => {
    expect(compteRacines('21450000')).toEqual({ racineImmo: '2145', racineAmort: '28145' });
    expect(compteRacines('21540000')).toEqual({ racineImmo: '2154', racineAmort: '28154' });
    expect(compteRacines('21541000')).toEqual({ racineImmo: '2154', racineAmort: '28154' });
  });

  it('libelle compte : exact, puis racine 4 chiffres, puis fallback numéro', () => {
    expect(compteLabel('21541000')).toBe('Matériels agricoles');
    expect(compteLabel('21450000')).toBe('Agencements');
    expect(compteLabel('27000000')).toBe('27000000');
  });

  it('mode : 1 → L, sinon vide', () => {
    expect(modeAmort(1)).toBe('L');
    expect(modeAmort('1')).toBe('L');
    expect(modeAmort(2)).toBe('');
    expect(modeAmort(null)).toBe('');
  });

  it('round2 arrondit au centime', () => {
    expect(round2(886.099999)).toBe(886.1);
    expect(round2(2114.355)).toBe(2114.36);
  });
});
```

- [ ] **Step 2 : Lancer le test et vérifier l'échec**

Run: `npx vitest run src/__tests__/computeAmortissementEdition.test.js`
Expected: FAIL — `Failed to resolve import` / `compteRacines is not a function`.

- [ ] **Step 3 : Écrire l'implémentation minimale**

```js
// src/engine/computeAmortissementEdition.js

/** Libellés PCG immo (CUMA), extensible. */
export const COMPTE_IMMO_LABELS = {
  '2145': 'Agencements',
  '2154': 'Matériels industriels',
  '21541000': 'Matériels agricoles',
  '21542000': 'Accessoires matériel',
};

/** Arrondi au centime (évite le bruit flottant). */
export function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
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
```

- [ ] **Step 4 : Lancer le test et vérifier le succès**

Run: `npx vitest run src/__tests__/computeAmortissementEdition.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5 : Commit**

```bash
git add src/engine/computeAmortissementEdition.js src/__tests__/computeAmortissementEdition.test.js
git commit -m "feat(amort): helpers comptes et numériques pour l'édition amortissements"
```

---

## Task 2 : Moteur — index VNC (I2) & calcul par bien

**Files:**
- Modify: `src/engine/computeAmortissementEdition.js`
- Test: `src/__tests__/computeAmortissementEdition.test.js`

- [ ] **Step 1 : Écrire le test qui échoue**

Ajouter à la fin du fichier de test (valeurs exactes du PDF) :

```js
import { buildVncIndex, computeBienRow } from '../engine/computeAmortissementEdition';

// Fixtures = lignes I2 réelles (Date Fin Exo, ecoMtResiduel) extraites de l'export demo.
const i2 = [
  // bien 150 (TRACTEUR JD 6R195) — en service 2023, durée 10
  { nBien: 150, dateFinExo: new Date(2023, 11, 31), ecoMtResiduel: 7974.9 },
  { nBien: 150, dateFinExo: new Date(2024, 11, 31), ecoMtResiduel: 7088.8 },
  { nBien: 150, dateFinExo: new Date(2025, 11, 31), ecoMtResiduel: 6202.7 },
  // bien 104 (HOUE)
  { nBien: 104, dateFinExo: new Date(2024, 11, 31), ecoMtResiduel: 3523.94 },
  { nBien: 104, dateFinExo: new Date(2025, 11, 31), ecoMtResiduel: 2114.36 },
  // bien 166 (EPANDAGE) — acquis 2025
  { nBien: 166, dateFinExo: new Date(2025, 11, 31), ecoMtResiduel: 19154.32 },
  // bien 1 (VIS A GRAIN) — totalement amorti, dernière clôture 2022 à 0
  { nBien: 1, dateFinExo: new Date(2022, 11, 31), ecoMtResiduel: 0 },
];

describe('computeBienRow (exercice 2025)', () => {
  const idx = buildVncIndex(i2);

  it('bien amorti en cours (150)', () => {
    const i1 = { nBien: 150, libelle: 'TRACTEUR JD 6R195', valeurEntree: 8861,
      ecoMethode: 1, ecoDuree: 10, axe1: '4' };
    const r = computeBienRow(i1, idx, 2025);
    expect(r).toMatchObject({ cout: 8861, base: 7088.8, anterieur: 1772.2,
      dotation: 886.1, total: 2658.3, vnc: 6202.7, mode: 'L' });
  });

  it('bien 104 (HOUE)', () => {
    const i1 = { nBien: 104, valeurEntree: 17303.44, ecoMethode: 1, ecoDuree: 7 };
    const r = computeBienRow(i1, idx, 2025);
    expect(r).toMatchObject({ anterieur: 13779.5, base: 3523.94,
      dotation: 1409.58, total: 15189.08, vnc: 2114.36 });
  });

  it('bien acquis dans l’exercice (166) : antérieur 0, dotation = total', () => {
    const i1 = { nBien: 166, valeurEntree: 20000, ecoMethode: 1, ecoDuree: 9,
      dateAcquisition: new Date(2025, 7, 14) };
    const r = computeBienRow(i1, idx, 2025);
    expect(r).toMatchObject({ anterieur: 0, base: 20000,
      dotation: 845.68, total: 845.68, vnc: 19154.32 });
  });

  it('bien totalement amorti avant l’exercice (1) : dotation 0, vnc 0', () => {
    const i1 = { nBien: 1, valeurEntree: 792.73, ecoMethode: 1, ecoDuree: 5 };
    const r = computeBienRow(i1, idx, 2025);
    expect(r).toMatchObject({ anterieur: 792.73, base: 0,
      dotation: 0, total: 792.73, vnc: 0 });
  });
});
```

- [ ] **Step 2 : Lancer le test et vérifier l'échec**

Run: `npx vitest run src/__tests__/computeAmortissementEdition.test.js`
Expected: FAIL — `buildVncIndex is not a function`.

- [ ] **Step 3 : Écrire l'implémentation minimale**

Ajouter dans `src/engine/computeAmortissementEdition.js` (l'import de `yearOf` en tête du fichier) :

```js
import { yearOf } from './tableUtils';
```

Puis à la fin du fichier :

```js
/**
 * Index VNC par bien : Map<nBien, Array<[anneeCloture, residuel]>> trié par année.
 * @param {object[]} immoLignes  feuille I2
 */
export function buildVncIndex(immoLignes) {
  const tmp = new Map(); // nBien -> Map<year, residuel>
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

/**
 * VNC du bien à la fin de `year` : residuel de la ligne I2 de plus grande
 * clôture ≤ year ; `cout` si aucune ligne ≤ year (rien amorti au début).
 */
function vncAt(entries, cout, year) {
  let v = cout;
  for (const [y, res] of entries) {
    if (y <= year) v = res;
    else break;
  }
  return v;
}

/**
 * Calcule la ligne d'amortissement d'un bien pour l'exercice `exerciceYear`.
 * @param {object} i1  fiche I1
 * @param {Map} vncIndex  sortie de buildVncIndex
 * @param {number} exerciceYear
 */
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
```

- [ ] **Step 4 : Lancer le test et vérifier le succès**

Run: `npx vitest run src/__tests__/computeAmortissementEdition.test.js`
Expected: PASS (8 tests cumulés).

- [ ] **Step 5 : Commit**

```bash
git add src/engine/computeAmortissementEdition.js src/__tests__/computeAmortissementEdition.test.js
git commit -m "feat(amort): index VNC depuis I2 et calcul par bien (validé contre le PDF)"
```

---

## Task 3 : Moteur — assemblage par compte, totaux & total général

**Files:**
- Modify: `src/engine/computeAmortissementEdition.js`
- Test: `src/__tests__/computeAmortissementEdition.test.js`

- [ ] **Step 1 : Écrire le test qui échoue**

Ajouter au fichier de test :

```js
import { computeAmortissementEdition } from '../engine/computeAmortissementEdition';

describe('computeAmortissementEdition — comptes & totaux', () => {
  // Compte 21450000 réduit à 2 biens pour un total vérifiable.
  const immobilisations = [
    { nBien: 150, libelle: 'TRACTEUR JD 6R195', compteImmo: '21450000',
      valeurEntree: 8861, ecoMethode: 1, ecoDuree: 10, axe1: '4',
      dateAcquisition: new Date(2022, 11, 31), dateCession: null },
    { nBien: 200, libelle: 'ATELIER', compteImmo: '21450000',
      valeurEntree: 15344.14, ecoMethode: 1, ecoDuree: 12,
      dateAcquisition: new Date(1990, 0, 1), dateCession: null },
  ];
  const immoLignes = [
    { nBien: 150, dateFinExo: new Date(2024, 11, 31), ecoMtResiduel: 7088.8 },
    { nBien: 150, dateFinExo: new Date(2025, 11, 31), ecoMtResiduel: 6202.7 },
    { nBien: 200, dateFinExo: new Date(2002, 11, 31), ecoMtResiduel: 0 },
  ];
  const synthese = { dateDebutExercice: '01/01/2025', dateFinExercice: '31/12/2025' };
  const ed = computeAmortissementEdition({ immobilisations, immoLignes, synthese });

  it('expose les bornes d’exercice', () => {
    expect(ed.exercice.fin.getFullYear()).toBe(2025);
  });

  it('groupe par compte, trie les biens par nBien', () => {
    expect(ed.comptes).toHaveLength(1);
    expect(ed.comptes[0].compte).toBe('21450000');
    expect(ed.comptes[0].libelle).toBe('Agencements');
    expect(ed.comptes[0].racineAmort).toBe('28145');
    expect(ed.comptes[0].biens.map(b => b.nBien)).toEqual([150, 200]);
  });

  it('calcule les totaux du compte', () => {
    const t = ed.comptes[0].totaux;
    expect(t.cout).toBe(24205.14);          // 8861 + 15344.14
    expect(t.dotation).toBe(886.1);         // 886.10 + 0
    expect(t.total).toBe(18002.44);         // 2658.30 + 15344.14
    expect(t.vnc).toBe(6202.7);             // 6202.70 + 0
    expect(t.soldeImmo).toBe(24205.14);
    expect(t.soldeNet).toBe(6202.7);
    expect(t.acquisitionsExercice).toBe(0); // aucun acquis en 2025
    expect(t.acquisitionsAnterieures).toBe(24205.14);
  });

  it('calcule le total général tous comptes', () => {
    expect(ed.totalGeneral.cout).toBe(24205.14);
    expect(ed.totalGeneral.vnc).toBe(6202.7);
  });
});
```

- [ ] **Step 2 : Lancer le test et vérifier l'échec**

Run: `npx vitest run src/__tests__/computeAmortissementEdition.test.js`
Expected: FAIL — `computeAmortissementEdition is not a function`.

- [ ] **Step 3 : Écrire l'implémentation minimale**

Ajouter en tête du fichier l'import de `parseFrDate` :

```js
import { parseFrDate } from './formatUtils';
```

Puis à la fin du fichier :

```js
const MONEY_KEYS = ['cout', 'anterieur', 'base', 'dotation', 'total', 'vnc'];

/** Somme arrondie d'une clé sur une liste de lignes. */
function sumKey(rows, key) {
  return round2(rows.reduce((s, r) => s + num(r[key]), 0));
}

/** Bloc de totaux pour une liste de biens d'un compte. */
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
 * @param {object} exploitationData  { immobilisations (I1), immoLignes (I2), synthese }
 */
export function computeAmortissementEdition(exploitationData) {
  const i1All = exploitationData?.immobilisations ?? [];
  const i2 = exploitationData?.immoLignes ?? [];
  const synthese = exploitationData?.synthese ?? {};

  const fin = parseFrDate(synthese.dateFinExercice) ?? new Date();
  const debut = parseFrDate(synthese.dateDebutExercice) ?? new Date(fin.getFullYear(), 0, 1);
  const exerciceYear = fin.getFullYear();
  const vncIndex = buildVncIndex(i2);

  // Liste amortissements = biens non cédés, groupés par compte, triés par nBien.
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
      return { compte, libelle: compteLabel(compte), racineImmo, racineAmort,
        biens, totaux: compteTotaux(biens, exerciceYear) };
    });

  const allBiens = comptes.flatMap(c => c.biens);
  const totalGeneral = {};
  for (const k of MONEY_KEYS) totalGeneral[k] = sumKey(allBiens, k);

  return {
    exercice: { debut, fin },
    comptes,
    totalGeneral,
    cessions: [], // rempli en Task 4
  };
}
```

- [ ] **Step 4 : Lancer le test et vérifier le succès**

Run: `npx vitest run src/__tests__/computeAmortissementEdition.test.js`
Expected: PASS (tous les tests cumulés).

- [ ] **Step 5 : Commit**

```bash
git add src/engine/computeAmortissementEdition.js src/__tests__/computeAmortissementEdition.test.js
git commit -m "feat(amort): assemblage par compte, totaux et total général"
```

---

## Task 4 : Moteur — tableau des cessions

**Files:**
- Modify: `src/engine/computeAmortissementEdition.js`
- Test: `src/__tests__/computeAmortissementEdition.test.js`

- [ ] **Step 1 : Écrire le test qui échoue**

Ajouter au fichier de test :

```js
describe('computeAmortissementEdition — cessions', () => {
  const immobilisations = [
    { nBien: 135, libelle: 'TRACTEUR JD 6215 R', compteImmo: '21541000',
      valeurEntree: 164000, ecoMethode: 1, ecoDuree: 7,
      dateAcquisition: new Date(2021, 9, 1),
      dateCession: new Date(2025, 3, 25), mtCession: 110000 },
  ];
  const immoLignes = [
    { nBien: 135, dateFinExo: new Date(2024, 11, 31), ecoMtResiduel: 125469.88 },
    { nBien: 135, dateFinExo: new Date(2025, 11, 31), ecoMtResiduel: 121715.66 },
  ];
  const synthese = { dateDebutExercice: '01/01/2025', dateFinExercice: '31/12/2025' };
  const ed = computeAmortissementEdition({ immobilisations, immoLignes, synthese });

  it('le bien cédé sort de la liste amortissements', () => {
    expect(ed.comptes).toHaveLength(0);
  });

  it('le bien cédé figure dans les cessions avec sa moins-value', () => {
    expect(ed.cessions).toHaveLength(1);
    const b = ed.cessions[0].biens[0];
    expect(b.nBien).toBe(135);
    expect(b.prixCession).toBe(110000);
    expect(b.vnc).toBe(121715.66);
    expect(b.plusMoinsValue).toBe(-11715.66); // 110000 − 121715.66
    expect(b.derogatoire).toBe(0);            // fiscal = économique
    expect(b.fiscalTotal).toBe(b.total);
  });
});
```

- [ ] **Step 2 : Lancer le test et vérifier l'échec**

Run: `npx vitest run src/__tests__/computeAmortissementEdition.test.js`
Expected: FAIL — `ed.cessions` est `[]`, attendu 1 élément.

- [ ] **Step 3 : Écrire l'implémentation minimale**

Dans `computeAmortissementEdition`, remplacer la ligne `cessions: [], // rempli en Task 4`
par un appel au helper et ajouter le helper `buildCessions` au fichier :

```js
// Dans computeAmortissementEdition, AVANT le `return` :
const cessions = buildCessions(i1All, vncIndex, exerciceYear);

// ... et dans l'objet retourné :
//   cessions,
```

Helper à ajouter à la fin du fichier :

```js
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
      fiscalTotal: row.total,   // fiscal = économique (même durée)
      derogatoire: 0,           // donc amortissement dérogatoire nul
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
      return { compte, libelle: compteLabel(compte), biens, totaux };
    });
}
```

Remplacer la dernière propriété de l'objet retourné par `cessions,`.

- [ ] **Step 4 : Lancer le test et vérifier le succès**

Run: `npx vitest run src/__tests__/computeAmortissementEdition.test.js`
Expected: PASS (tous les tests).

- [ ] **Step 5 : Commit**

```bash
git add src/engine/computeAmortissementEdition.js src/__tests__/computeAmortissementEdition.test.js
git commit -m "feat(amort): tableau des cessions (plus/moins-value, dérogatoire=0)"
```

---

## Task 5 : Vue React — AmortissementEditionView

**Files:**
- Create: `src/components/immobilisations/AmortissementEditionView.jsx`
- Test: `src/__tests__/amortissementEditionView.test.jsx`

- [ ] **Step 1 : Écrire le test qui échoue**

```jsx
// src/__tests__/amortissementEditionView.test.jsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AmortissementEditionView } from '../components/immobilisations/AmortissementEditionView';

const exploitationData = {
  synthese: { dateDebutExercice: '01/01/2025', dateFinExercice: '31/12/2025' },
  immobilisations: [
    { nBien: 150, libelle: 'TRACTEUR JD 6R195', compteImmo: '21450000',
      valeurEntree: 8861, ecoMethode: 1, ecoDuree: 10, axe1: '4',
      dateAcquisition: new Date(2022, 11, 31), dateCession: null },
  ],
  immoLignes: [
    { nBien: 150, dateFinExo: new Date(2024, 11, 31), ecoMtResiduel: 7088.8 },
    { nBien: 150, dateFinExo: new Date(2025, 11, 31), ecoMtResiduel: 6202.7 },
  ],
};

describe('AmortissementEditionView', () => {
  it('affiche l’en-tête de compte et le bien', () => {
    render(<AmortissementEditionView exploitationData={exploitationData} />);
    expect(screen.getByText(/Agencements/)).toBeInTheDocument();
    expect(screen.getByText(/TRACTEUR JD 6R195/)).toBeInTheDocument();
    expect(screen.getByText(/2145 - 28145/)).toBeInTheDocument();
  });
});
```

> Note : `@testing-library/react` est déjà utilisé par les tests `*.test.jsx` existants
> (ex. `budgetTab.test.jsx`). Réutiliser la même configuration.

- [ ] **Step 2 : Lancer le test et vérifier l'échec**

Run: `npx vitest run src/__tests__/amortissementEditionView.test.jsx`
Expected: FAIL — module introuvable.

- [ ] **Step 3 : Écrire l'implémentation minimale**

```jsx
// src/components/immobilisations/AmortissementEditionView.jsx
import { useMemo } from 'react';
import { computeAmortissementEdition } from '../../engine/computeAmortissementEdition';
import { formatAmountFull, formatDate } from '../../engine/formatUtils';

const COLS = [
  { key: 'designation', label: 'Désignation', align: 'left' },
  { key: 'nBien',       label: 'N°',          align: 'right' },
  { key: 'axe',         label: 'Axe',         align: 'left' },
  { key: 'dateAcq',     label: 'Acq.',        align: 'right', type: 'date' },
  { key: 'dateMes',     label: 'Mise service', align: 'right', type: 'date' },
  { key: 'cout',        label: 'Coût',        align: 'right', type: 'amount' },
  { key: 'duree',       label: 'Durée',       align: 'right' },
  { key: 'mode',        label: 'Mode',        align: 'left' },
  { key: 'anterieur',   label: 'Antérieur',   align: 'right', type: 'amount' },
  { key: 'base',        label: 'Base',        align: 'right', type: 'amount' },
  { key: 'dotation',    label: 'Dotation',    align: 'right', type: 'amount' },
  { key: 'total',       label: 'Total',       align: 'right', type: 'amount' },
  { key: 'vnc',         label: 'VNC',         align: 'right', type: 'amount' },
];

function fmt(value, type) {
  if (value === null || value === undefined || value === '') return '—';
  if (type === 'amount') return formatAmountFull(value);
  if (type === 'date') return formatDate(value);
  return String(value);
}

const th = { padding: '6px 8px', fontSize: '11px', fontWeight: 700, color: '#4A5568',
  borderBottom: '2px solid #E2E8F0', whiteSpace: 'nowrap' };
const td = (align) => ({ padding: '5px 8px', fontSize: '12px', textAlign: align,
  fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' });

function AmortRow({ bien }) {
  return (
    <tr>
      {COLS.map(c => (
        <td key={c.key} style={td(c.align)}>{fmt(bien[c.key], c.type)}</td>
      ))}
    </tr>
  );
}

function CompteSection({ compte }) {
  const t = compte.totaux;
  return (
    <div style={{ marginBottom: '28px' }}>
      <div style={{ background: '#F0F9FF', padding: '8px 10px', fontWeight: 700,
        color: '#1A202C', borderRadius: '6px 6px 0 0' }}>
        {compte.compte} — {compte.libelle}
        <span style={{ marginLeft: '8px', fontWeight: 500, color: '#718096' }}>
          ({compte.racineImmo} - {compte.racineAmort})
        </span>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr>{COLS.map(c => (
          <th key={c.key} style={{ ...th, textAlign: c.align }}>{c.label}</th>
        ))}</tr></thead>
        <tbody>
          {compte.biens.map(b => <AmortRow key={b.nBien} bien={b} />)}
          <tr style={{ background: '#FAFAFA', fontWeight: 700 }}>
            <td style={td('left')} colSpan={5}>Total {compte.compte}</td>
            <td style={td('right')}>{formatAmountFull(t.cout)}</td>
            <td colSpan={2} />
            <td style={td('right')}>{formatAmountFull(t.anterieur)}</td>
            <td style={td('right')}>{formatAmountFull(t.base)}</td>
            <td style={td('right')}>{formatAmountFull(t.dotation)}</td>
            <td style={td('right')}>{formatAmountFull(t.total)}</td>
            <td style={td('right')}>{formatAmountFull(t.vnc)}</td>
          </tr>
        </tbody>
      </table>
      <div style={{ fontSize: '11px', color: '#718096', padding: '6px 10px' }}>
        Acquisitions de l'exercice : {formatAmountFull(t.acquisitionsExercice)} ·
        Acquisitions antérieures : {formatAmountFull(t.acquisitionsAnterieures)} ·
        Solde {compte.racineImmo} : {formatAmountFull(t.soldeImmo)} ·
        VNC au 31/12 : {formatAmountFull(t.soldeNet)}
      </div>
    </div>
  );
}

const CESS_COLS = [
  { key: 'designation', label: 'Désignation', align: 'left' },
  { key: 'nBien',       label: 'N°',          align: 'right' },
  { key: 'dateAcq',     label: 'Acq.',        align: 'right', type: 'date' },
  { key: 'cout',        label: 'Coût',        align: 'right', type: 'amount' },
  { key: 'total',       label: 'Amort. total', align: 'right', type: 'amount' },
  { key: 'vnc',         label: 'VNC',         align: 'right', type: 'amount' },
  { key: 'dateCession', label: 'Cession',     align: 'right', type: 'date' },
  { key: 'prixCession', label: 'Prix cession', align: 'right', type: 'amount' },
  { key: 'plusMoinsValue', label: '+/- value', align: 'right', type: 'amount' },
  { key: 'derogatoire', label: 'Dérogatoire', align: 'right', type: 'amount' },
];

function CessionsSection({ cessions }) {
  if (!cessions.length) return null;
  return (
    <div style={{ marginTop: '12px' }}>
      <div style={{ fontSize: '15px', fontWeight: 700, color: '#1A202C', marginBottom: '8px' }}>
        Tableau des cessions
      </div>
      {cessions.map(c => (
        <div key={c.compte} style={{ marginBottom: '20px' }}>
          <div style={{ background: '#FFF7ED', padding: '6px 10px', fontWeight: 700 }}>
            {c.compte} — {c.libelle}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>{CESS_COLS.map(col => (
              <th key={col.key} style={{ ...th, textAlign: col.align }}>{col.label}</th>
            ))}</tr></thead>
            <tbody>
              {c.biens.map(b => (
                <tr key={b.nBien}>
                  {CESS_COLS.map(col => (
                    <td key={col.key} style={td(col.align)}>{fmt(b[col.key], col.type)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

export function AmortissementEditionView({ exploitationData }) {
  const ed = useMemo(() => computeAmortissementEdition(exploitationData), [exploitationData]);

  if (!ed.comptes.length && !ed.cessions.length) {
    return <div style={{ padding: '48px', textAlign: 'center', color: '#A0AEC0' }}>
      Aucune immobilisation amortissable.
    </div>;
  }

  return (
    <div style={{ paddingTop: '8px', overflowX: 'auto' }}>
      <div style={{ fontSize: '13px', color: '#718096', marginBottom: '12px' }}>
        Exercice {formatDate(ed.exercice.debut)} → {formatDate(ed.exercice.fin)}
      </div>
      {ed.comptes.map(c => <CompteSection key={c.compte} compte={c} />)}
      <div style={{ background: '#1A202C', color: '#fff', padding: '8px 10px',
        fontWeight: 700, borderRadius: '6px', marginBottom: '24px' }}>
        Total général — Coût {formatAmountFull(ed.totalGeneral.cout)} ·
        Amort. {formatAmountFull(ed.totalGeneral.total)} ·
        VNC {formatAmountFull(ed.totalGeneral.vnc)}
      </div>
      <CessionsSection cessions={ed.cessions} />
    </div>
  );
}

export default AmortissementEditionView;
```

- [ ] **Step 4 : Lancer le test et vérifier le succès**

Run: `npx vitest run src/__tests__/amortissementEditionView.test.jsx`
Expected: PASS.

- [ ] **Step 5 : Commit**

```bash
git add src/components/immobilisations/AmortissementEditionView.jsx src/__tests__/amortissementEditionView.test.jsx
git commit -m "feat(amort): vue React de l'édition Liste des amortissements"
```

---

## Task 6 : Conteneur Immobilisations à sous-onglets

**Files:**
- Modify: `src/components/immobilisations/ImmobilisationsTab.jsx`

Objectif : transformer `ImmobilisationsTab` en conteneur à 2 sous-onglets
(« Registre » | « Liste des amortissements ») sur le modèle de `EmpruntsTab`
(état `view`, barre inline, soulignement vert `#31B700`). Le contenu actuel devient
un composant interne `RegistrePane` ; rien d'autre ne change dans la logique du registre.

- [ ] **Step 1 : Renommer le composant exporté en `RegistrePane`**

Dans `src/components/immobilisations/ImmobilisationsTab.jsx`, renommer la fonction
`export function ImmobilisationsTab()` en `function RegistrePane()` (retirer `export`)
et supprimer la ligne `export default ImmobilisationsTab;` en bas (sera remplacée).
Le corps de la fonction reste **strictement identique** (y compris le `UploadPrompt`
qui gère l'absence d'`exploitationData`).

- [ ] **Step 2 : Ajouter le nouveau conteneur + import de la vue**

En tête du fichier, ajouter l'import :

```jsx
import { AmortissementEditionView } from './AmortissementEditionView';
```

À la fin du fichier, ajouter le conteneur à sous-onglets et son export par défaut :

```jsx
const SUBTABS = [
  { id: 'registre',       label: 'Registre' },
  { id: 'amortissements', label: 'Liste des amortissements' },
];

export function ImmobilisationsTab() {
  const exploitationData = useStore((s) => s.exploitationData);
  const [view, setView] = useState('registre');

  return (
    <div style={{ paddingTop: '8px' }}>
      <div style={{ display: 'flex', gap: '4px', borderBottom: '2px solid #E2E8F0', marginBottom: '8px' }}>
        {SUBTABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setView(tab.id)}
            style={{
              padding: '8px 18px',
              fontSize: '13px',
              fontWeight: view === tab.id ? 700 : 500,
              color: view === tab.id ? '#1A202C' : '#718096',
              background: 'none',
              border: 'none',
              borderBottom: view === tab.id ? '2px solid #31B700' : '2px solid transparent',
              cursor: 'pointer',
              marginBottom: '-2px',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {view === 'registre' && <RegistrePane />}
      {view === 'amortissements' && (
        exploitationData
          ? <AmortissementEditionView exploitationData={exploitationData} />
          : <RegistrePane />
      )}
    </div>
  );
}

export default ImmobilisationsTab;
```

> Note : quand `exploitationData` est absent, le sous-onglet « Liste des amortissements »
> retombe sur `RegistrePane`, qui affiche déjà le `UploadPrompt` d'import — pas de duplication
> d'état vide.

- [ ] **Step 3 : Vérifier le build / lint et l'app**

Run: `npx vitest run src/__tests__/amortissementEditionView.test.jsx && npm run lint`
Expected: tests PASS, lint sans erreur sur les fichiers touchés.

Vérification manuelle (preview) : onglet Immobilisations → 2 sous-onglets ; « Liste des
amortissements » affiche l'édition avec rupture par compte ; « Registre » inchangé.

- [ ] **Step 4 : Commit**

```bash
git add src/components/immobilisations/ImmobilisationsTab.jsx
git commit -m "feat(amort): sous-onglets Registre / Liste des amortissements"
```

---

## Task 7 : Export PDF — builder & enregistrement

**Files:**
- Modify: `src/engine/generatePdf.js`

> **Contrainte largeur (impératif) :** le tableau PDF doit **s'ajuster à la largeur de
> page** comme les autres tableaux. Ne **jamais** passer de tableau de largeurs en dur :
> toujours `widths: fitTableWidths(COLUMNS, chartW)`. Ce helper met les largeurs fixes à
> l'échelle si leur somme dépasse le budget et la colonne `width: '*'` (Désignation)
> absorbe l'espace restant — la somme tient donc dans `chartW`. Garder **une seule**
> colonne `'*'` par table.

- [ ] **Step 1 : Ajouter le libellé du document**

Dans `DOC_LABELS` (vers la ligne 43), ajouter après `immobilisations` :

```js
  amortissements:    'Liste des amortissements',
```

- [ ] **Step 2 : Ajouter le builder**

Importer le moteur en tête de `generatePdf.js` (à côté des autres imports d'engine) :

```js
import { computeAmortissementEdition } from './computeAmortissementEdition';
```

Ajouter le builder juste après `buildImmobilisationsContent` (après la ligne ~1310) :

```js
// ─────────────────────────────────────────────────────────────
// Liste des amortissements → contenu pdfmake (par compte + cessions)
// ─────────────────────────────────────────────────────────────
const AMORT_PDF_COLUMNS = [
  { key: 'designation', label: 'Désignation', type: 'text',   width: '*' },
  { key: 'nBien',       label: 'N°',          type: 'number', width: 26 },
  { key: 'axe',         label: 'Axe',         type: 'text',   width: 40 },
  { key: 'dateMes',     label: 'Mise serv.',  type: 'date',   width: 52 },
  { key: 'cout',        label: 'Coût',        type: 'amount', width: 58 },
  { key: 'anterieur',   label: 'Antérieur',   type: 'amount', width: 58 },
  { key: 'base',        label: 'Base',        type: 'amount', width: 58 },
  { key: 'dotation',    label: 'Dotation',    type: 'amount', width: 56 },
  { key: 'total',       label: 'Total',       type: 'amount', width: 58 },
  { key: 'vnc',         label: 'VNC',         type: 'amount', width: 58 },
];

function buildAmortissementEditionContent(exploitationData, chartW = 781) {
  const ed = computeAmortissementEdition(exploitationData ?? {});
  if (!ed.comptes.length && !ed.cessions.length) return [];

  const content = [makeSectionTitle(DOC_LABELS.amortissements, 'amortissements')];

  for (const compte of ed.comptes) {
    const header = AMORT_PDF_COLUMNS.map(col => ({
      text: col.label, style: 'tableHeader', fillColor: '#F7FAFC',
      alignment: col.type === 'text' ? 'left' : 'right',
    }));
    const body = [header, ...compte.biens.map(b => AMORT_PDF_COLUMNS.map(col => ({
      text: fmtFicheCell(b[col.key], col.type), fontSize: 7,
      alignment: col.type === 'text' ? 'left' : 'right',
    })))];
    const t = compte.totaux;
    body.push(AMORT_PDF_COLUMNS.map(col => {
      const totalKeys = { cout: t.cout, anterieur: t.anterieur, base: t.base,
        dotation: t.dotation, total: t.total, vnc: t.vnc };
      const text = col.key === 'designation' ? `Total ${compte.compte}`
        : (col.key in totalKeys ? fmtEur(totalKeys[col.key]) : '');
      return { text, fontSize: 7, bold: true, fillColor: '#E8F5E0',
        alignment: col.type === 'text' ? 'left' : 'right' };
    }));

    content.push(
      { text: `${compte.compte} — ${compte.libelle}  (${compte.racineImmo} - ${compte.racineAmort})`,
        fontSize: 9, bold: true, color: COLORS.secondary, margin: [0, 8, 0, 3] },
      { table: { headerRows: 1, widths: fitTableWidths(AMORT_PDF_COLUMNS, chartW), body },
        layout: tableLayout() },
    );
  }

  content.push({
    text: `Total général — Coût ${fmtEur(ed.totalGeneral.cout)} · `
      + `Amort. ${fmtEur(ed.totalGeneral.total)} · VNC ${fmtEur(ed.totalGeneral.vnc)}`,
    fontSize: 8, bold: true, color: COLORS.text, margin: [0, 6, 0, 0],
  });

  if (ed.cessions.length) {
    content.push({ text: 'Tableau des cessions', fontSize: 10, bold: true,
      color: COLORS.secondary, margin: [0, 12, 0, 4] });
    const cessCols = [
      { key: 'designation', label: 'Désignation', type: 'text',   width: '*' },
      { key: 'nBien',       label: 'N°',          type: 'number', width: 26 },
      { key: 'cout',        label: 'Coût',        type: 'amount', width: 60 },
      { key: 'total',       label: 'Amort.',      type: 'amount', width: 60 },
      { key: 'vnc',         label: 'VNC',         type: 'amount', width: 60 },
      { key: 'prixCession', label: 'Prix cession', type: 'amount', width: 64 },
      { key: 'plusMoinsValue', label: '+/- value', type: 'amount', width: 60 },
    ];
    for (const c of ed.cessions) {
      const header = cessCols.map(col => ({
        text: col.label, style: 'tableHeader', fillColor: '#FFF7ED',
        alignment: col.type === 'text' ? 'left' : 'right' }));
      const body = [header, ...c.biens.map(b => cessCols.map(col => ({
        text: fmtFicheCell(b[col.key], col.type), fontSize: 7,
        alignment: col.type === 'text' ? 'left' : 'right' })))];
      content.push(
        { text: `${c.compte} — ${c.libelle}`, fontSize: 8, bold: true, margin: [0, 6, 0, 2] },
        { table: { headerRows: 1, widths: fitTableWidths(cessCols, chartW), body },
          layout: tableLayout() },
      );
    }
  }

  content.push({ text: ' ', pageBreak: 'after' });
  return content;
}
```

- [ ] **Step 3 : Enregistrer le builder dans le dispatch**

Dans l'objet des builders (vers la ligne 2637), ajouter après `immobilisations:` :

```js
    amortissements:    () => buildAmortissementEditionContent(storeData.exploitationData, chartW),
```

- [ ] **Step 4 : Vérifier lint et tests moteur**

Run: `npm run lint && npx vitest run src/__tests__/computeAmortissementEdition.test.js`
Expected: lint sans erreur, tests moteur PASS.

- [ ] **Step 5 : Commit**

```bash
git add src/engine/generatePdf.js
git commit -m "feat(amort): builder PDF Liste des amortissements (réutilise le moteur)"
```

---

## Task 8 : Export PDF — entrée sélectionnable

**Files:**
- Modify: `src/components/export/ExportTab.jsx`

- [ ] **Step 1 : Déclarer le document dans `ALL_DOCS`**

Dans `src/components/export/ExportTab.jsx`, ajouter dans `ALL_DOCS` (après la ligne
`{ id: 'immobilisations', requiresExploitation: true },`) :

```js
  { id: 'amortissements',    requiresExploitation: true },
```

- [ ] **Step 2 : (Optionnel) inclure par défaut**

Si l'on veut le cocher par défaut, ajouter `'amortissements'` dans `DEFAULT_SELECTED`
(vers la ligne 61), après `'immobilisations'` :

```js
  'capital_social', 'emprunts', 'immobilisations', 'amortissements', 'materiels',
```

- [ ] **Step 3 : Vérifier lint et l'app**

Run: `npm run lint`
Expected: sans erreur.

Vérification manuelle (preview) : onglet Export PDF → « Liste des amortissements »
apparaît, sélectionnable quand l'Export_Multi est chargé ; le PDF généré contient
l'édition (sections par compte, totaux, cessions).

- [ ] **Step 4 : Commit**

```bash
git add src/components/export/ExportTab.jsx
git commit -m "feat(amort): entrée Liste des amortissements dans l'export PDF"
```

---

## Vérification finale

- [ ] `npx vitest run src/__tests__/computeAmortissementEdition.test.js src/__tests__/amortissementEditionView.test.jsx` → tout PASS.
- [ ] `npm run lint` → sans erreur.
- [ ] `npm run build` → build OK.
- [ ] Preview : Immobilisations → sous-onglet « Liste des amortissements » conforme au PDF (rupture par compte, totaux, cessions) ; Export PDF inclut la section.

## Notes / limitations (rappel spec)

- Le fichier `demo_export_multi.xlsx` diverge volontairement du PDF sur les biens 97/98/99
  (anonymisation) ; la vue reproduit fidèlement l'**export**, pas ce PDF précis sur ces lignes.
- Fiscal = économique → colonne dérogatoire à 0 (pas de données fiscales distinctes dans l'export).
