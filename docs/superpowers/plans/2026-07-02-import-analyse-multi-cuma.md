# Import & Analyse multi-CUMA — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Importer l'onglet `global` d'un classeur benchmark multi-CUMA et l'exploiter dans une nouvelle section « Analyse multi-CUMA » (onglets Données + Synthèse).

**Architecture:** Parsing client-only (jamais côté serveur) via un nouveau `parseGlobalMultiCuma`, stockage dans un bloc de `useStore` calqué sur `exploitationData`, logique métier isolée dans `src/domain/multiCuma/`, UI dans `src/components/multiCuma/` avec un moteur de sous-onglets local. Section gérée comme un module de droits à part entière.

**Tech Stack:** React 19 + Vite, Zustand, `xlsx`, Vitest. Encodage/format existants (`formatUtils`, `tableUtils`).

**Référence spec:** `docs/superpowers/specs/2026-07-02-import-analyse-multi-cuma-design.md`

**Commande de test:** il n'existe pas de script `test` dans `package.json`. Lancer les tests avec `npx vitest run <chemin>`.

---

## Convention de clés internes (partagée parser ↔ colonnes ↔ synthèse)

Chaque ligne CUMA parsée utilise ces clés (camelCase) : `classe, dpt, region, interR, nom, nbAdherents, nbCuma, ca, caCorrige, ebe, resultatCourant, resultatExceptionnel, resultatNet, pctEntretienCA, entretienReparation, pctAmortCA, amortissement, pctTxVetuste, pctChSalarialesCA, chargesSalariales, carburant, pctFraisFinancierCA, fraisFinancier, fdgCA, fdrCorrigeCA, fdrCorrige, pctCreancesCA, creances, capitalSocCA, capitalSocial, pctCSValBruteMateriel, valeurBruteMateriels, pctCSCapPropres, capitauxPropres, pctCapPropresPassif, passif, pctTauxEndettement, endettementLMT, caf, fondRoulementCA, fondRoulement` + la clé calculée `categorie`.

Les colonnes de ratio (`pct*`, `*CA`) contiennent des **fractions** (0.40 = 40 %) → l'affichage multiplie par 100.

---

## Task 1 : Module des tranches de CA

**Files:**
- Create: `src/domain/multiCuma/tranches.js`
- Test: `src/__tests__/multiCumaTranches.test.js`

- [ ] **Step 1 : Écrire le test qui échoue**

```javascript
// src/__tests__/multiCumaTranches.test.js
import { describe, it, expect } from 'vitest';
import { categorieFromCA, TRANCHE_ORDER } from '../domain/multiCuma/tranches';

describe('categorieFromCA', () => {
  it('classe selon les bornes (borne basse incluse)', () => {
    expect(categorieFromCA(0)).toBe('< 10 000€');
    expect(categorieFromCA(9999)).toBe('< 10 000€');
    expect(categorieFromCA(10000)).toBe('10 à 50 000€');
    expect(categorieFromCA(49999)).toBe('10 à 50 000€');
    expect(categorieFromCA(50000)).toBe('50 à 80 000€');
    expect(categorieFromCA(79999)).toBe('50 à 80 000€');
    expect(categorieFromCA(80000)).toBe('80 à 130 000€');
    expect(categorieFromCA(129999)).toBe('80 à 130 000€');
    expect(categorieFromCA(130000)).toBe('> 130 000€');
    expect(categorieFromCA(500000)).toBe('> 130 000€');
  });

  it('traite les valeurs non numériques comme 0', () => {
    expect(categorieFromCA(null)).toBe('< 10 000€');
    expect(categorieFromCA('abc')).toBe('< 10 000€');
  });

  it('expose les 5 tranches dans l’ordre croissant', () => {
    expect(TRANCHE_ORDER).toEqual([
      '< 10 000€', '10 à 50 000€', '50 à 80 000€', '80 à 130 000€', '> 130 000€',
    ]);
  });
});
```

- [ ] **Step 2 : Lancer le test, vérifier l'échec**

Run: `npx vitest run src/__tests__/multiCumaTranches.test.js`
Expected: FAIL (module introuvable).

- [ ] **Step 3 : Implémentation minimale**

```javascript
// src/domain/multiCuma/tranches.js
export const TRANCHE_ORDER = [
  '< 10 000€', '10 à 50 000€', '50 à 80 000€', '80 à 130 000€', '> 130 000€',
];

/**
 * Catégorie de tranche de CA (colonne H). Borne basse incluse.
 * @param {number} ca
 * @returns {string} une valeur de TRANCHE_ORDER
 */
export function categorieFromCA(ca) {
  const v = Number(ca) || 0;
  if (v < 10000) return TRANCHE_ORDER[0];
  if (v < 50000) return TRANCHE_ORDER[1];
  if (v < 80000) return TRANCHE_ORDER[2];
  if (v < 130000) return TRANCHE_ORDER[3];
  return TRANCHE_ORDER[4];
}
```

- [ ] **Step 4 : Lancer le test, vérifier le succès**

Run: `npx vitest run src/__tests__/multiCumaTranches.test.js`
Expected: PASS.

- [ ] **Step 5 : Commit**

```bash
git add src/domain/multiCuma/tranches.js src/__tests__/multiCumaTranches.test.js
git commit -m "feat(multi-cuma): tranches de CA"
```

---

## Task 2 : Regroupement multi-niveaux (`groupMultiLevel`)

**Files:**
- Modify: `src/engine/tableUtils.js` (ajout en fin de fichier)
- Test: `src/__tests__/groupMultiLevel.test.js`

- [ ] **Step 1 : Écrire le test qui échoue**

```javascript
// src/__tests__/groupMultiLevel.test.js
import { describe, it, expect } from 'vitest';
import { groupMultiLevel } from '../engine/tableUtils';

const rows = [
  { classe: 'a', region: 'PDL', ca: 100 },
  { classe: 'a', region: 'PDL', ca: 50 },
  { classe: 'a', region: 'NOR', ca: 30 },
  { classe: 'b', region: 'NOR', ca: 20 },
];
const byClasse = { label: 'Classe', fn: (r) => r.classe };
const byRegion = { label: 'Région', fn: (r) => r.region };

describe('groupMultiLevel', () => {
  it('retourne null quand aucun critère', () => {
    expect(groupMultiLevel(rows, [])).toBeNull();
  });

  it('groupe sur un niveau avec compte et sous-total', () => {
    const nodes = groupMultiLevel(rows, [byClasse], ['ca']);
    expect(nodes.map((n) => n.key)).toEqual(['a', 'b']);
    expect(nodes[0].count).toBe(3);
    expect(nodes[0].subtotal.ca).toBe(180);
    expect(nodes[0].children).toBeNull();
    expect(nodes[0].rows).toHaveLength(3);
  });

  it('imbrique deux niveaux', () => {
    const nodes = groupMultiLevel(rows, [byClasse, byRegion], ['ca']);
    expect(nodes[0].rows).toBeNull();
    expect(nodes[0].children.map((c) => c.key)).toEqual(['PDL', 'NOR']);
    expect(nodes[0].children[0].count).toBe(2);
    expect(nodes[0].children[0].rows).toHaveLength(2);
    expect(nodes[0].children[0].subtotal.ca).toBe(150);
  });
});
```

- [ ] **Step 2 : Lancer le test, vérifier l'échec**

Run: `npx vitest run src/__tests__/groupMultiLevel.test.js`
Expected: FAIL (`groupMultiLevel` non exporté).

- [ ] **Step 3 : Implémentation minimale (ajouter en fin de `src/engine/tableUtils.js`)**

```javascript
/**
 * Regroupement récursif multi-niveaux.
 * @param {object[]} rows
 * @param {{label: string, fn: (row: object) => string|number}[]} keyFns
 * @param {string[]} [subtotalKeys=[]]
 * @returns {null | Array<{key: string, label: string, count: number, subtotal: Record<string, number>, children: any[]|null, rows: object[]|null}>}
 */
export function groupMultiLevel(rows, keyFns, subtotalKeys = []) {
  if (!keyFns.length) return null;
  const [first, ...rest] = keyFns;
  const map = new Map();
  for (const row of rows) {
    const k = first.fn(row);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(row);
  }
  return [...map.entries()].map(([key, groupRowsList]) => {
    const children = rest.length ? groupMultiLevel(groupRowsList, rest, subtotalKeys) : null;
    const subtotal = {};
    for (const s of subtotalKeys) {
      subtotal[s] = groupRowsList.reduce((sum, r) => sum + (Number(r[s]) || 0), 0);
    }
    return {
      key: String(key),
      label: first.label,
      count: groupRowsList.length,
      subtotal,
      children,
      rows: children ? null : groupRowsList,
    };
  });
}
```

- [ ] **Step 4 : Lancer le test, vérifier le succès**

Run: `npx vitest run src/__tests__/groupMultiLevel.test.js`
Expected: PASS.

- [ ] **Step 5 : Commit**

```bash
git add src/engine/tableUtils.js src/__tests__/groupMultiLevel.test.js
git commit -m "feat(tableUtils): groupMultiLevel"
```

---

## Task 3 : Parser de l'onglet `global`

**Files:**
- Create: `src/engine/parseGlobalMultiCuma.js`
- Test: `src/__tests__/parseGlobalMultiCuma.test.js`

- [ ] **Step 1 : Écrire le test qui échoue**

```javascript
// src/__tests__/parseGlobalMultiCuma.test.js
import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { parseGlobalMultiCumaBuffer } from '../engine/parseGlobalMultiCuma';

// En-têtes réels (extrait), aux positions réelles utiles.
const HEADER = [
  'classe', 'Dpt', 'Region', 'InterR', '118 CUMA', "Nombre d'adhérents",
  'Nombre de cuma', 'CA', 'CA  corrigé', 'E.B.E.', 'Résultat courant',
  'Résultat exceptionnel', 'Résultat net', '% Entretien / CA', 'Entretien réparation',
];

function buildBuffer(dataRows, { sheetName = 'global' } = {}) {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([HEADER, ...dataRows]);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
}

const CUMA_A = ['a', 85, 'PDL', 'O', 'LE MARAIS', 20, 1, 5000, 5000, 0, -100, 0, -100, 0.4, 200];
const CUMA_B = ['b', 27, 'NOR', 'O', 'DE LA FORET', 12, 1, 60000, 60000, 0, 500, 0, 500, 0.25, 15000];

describe('parseGlobalMultiCumaBuffer', () => {
  it('lève si l’onglet global est absent', () => {
    const buf = buildBuffer([CUMA_A], { sheetName: 'autre' });
    expect(() => parseGlobalMultiCumaBuffer(buf)).toThrow(/global/i);
  });

  it('exclut les lignes de synthèse et garde les CUMA', () => {
    const buf = buildBuffer([
      CUMA_A,
      ['', '', '', '', 'Total', '', '', 65000],
      ['', '', '', '', 'Moyenne', '', '', 32500],
      ['', '', '', '', '1er quartile', '', '', 5000],
      ['', '', '', '', '3ème quartile', '', '', 60000],
      ['', '', '', '', 'Nb Cuma concernées', '', '', 2],
      CUMA_B,
      ['', '', '', '', null],
    ]);
    const { rows } = parseGlobalMultiCumaBuffer(buf);
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.nom)).toEqual(['LE MARAIS', 'DE LA FORET']);
  });

  it('mappe les colonnes et calcule la catégorie', () => {
    const buf = buildBuffer([CUMA_A, CUMA_B]);
    const { rows } = parseGlobalMultiCumaBuffer(buf);
    expect(rows[0]).toMatchObject({
      classe: 'a', dpt: 85, region: 'PDL', nom: 'LE MARAIS',
      ca: 5000, resultatCourant: -100, pctEntretienCA: 0.4,
      categorie: '< 10 000€',
    });
    expect(rows[1].categorie).toBe('50 à 80 000€');
  });
});
```

- [ ] **Step 2 : Lancer le test, vérifier l'échec**

Run: `npx vitest run src/__tests__/parseGlobalMultiCuma.test.js`
Expected: FAIL (module introuvable).

- [ ] **Step 3 : Implémentation**

```javascript
// src/engine/parseGlobalMultiCuma.js
import * as XLSX from 'xlsx';
import { categorieFromCA } from '../domain/multiCuma/tranches';

/**
 * Correspondance clé interne → { header exact (trim), index de repli }.
 * L'ordre n'a pas d'importance. `resolveColumns` cherche d'abord l'en-tête
 * exact ; à défaut il utilise l'index fixe (robustesse inter-versions).
 */
export const GLOBAL_FIELD_MAP = [
  { key: 'classe', header: 'classe', index: 0 },
  { key: 'dpt', header: 'Dpt', index: 1 },
  { key: 'region', header: 'Region', index: 2 },
  { key: 'interR', header: 'InterR', index: 3 },
  { key: 'nom', header: '118 CUMA', index: 4 },
  { key: 'nbAdherents', header: "Nombre d'adhérents", index: 5 },
  { key: 'nbCuma', header: 'Nombre de cuma', index: 6 },
  { key: 'ca', header: 'CA', index: 7 },
  { key: 'caCorrige', header: 'CA  corrigé', index: 8 },
  { key: 'ebe', header: 'E.B.E.', index: 9 },
  { key: 'resultatCourant', header: 'Résultat courant', index: 10 },
  { key: 'resultatExceptionnel', header: 'Résultat exceptionnel', index: 11 },
  { key: 'resultatNet', header: 'Résultat net', index: 12 },
  { key: 'pctEntretienCA', header: '% Entretien / CA', index: 13 },
  { key: 'entretienReparation', header: 'Entretien réparation', index: 14 },
  { key: 'pctAmortCA', header: '% Amortis./ CA', index: 15 },
  { key: 'amortissement', header: 'Amortissement', index: 16 },
  { key: 'pctTxVetuste', header: '% Tx Vétusté', index: 17 },
  { key: 'pctChSalarialesCA', header: '% Ch. salariales/ CA', index: 18 },
  { key: 'chargesSalariales', header: 'Charges salariales', index: 19 },
  { key: 'carburant', header: 'Carburant', index: 20 },
  { key: 'pctFraisFinancierCA', header: 'Frais Financier / CA', index: 21 },
  { key: 'fraisFinancier', header: 'Frais financier', index: 22 },
  { key: 'fdgCA', header: 'FDG/CA', index: 23 },
  { key: 'fdrCorrigeCA', header: 'Fdr corrigé / CA', index: 24 },
  { key: 'fdrCorrige', header: 'Fdr corrigé', index: 25 },
  { key: 'pctCreancesCA', header: '% Créances / CA', index: 26 },
  { key: 'creances', header: 'Créances', index: 27 },
  { key: 'capitalSocCA', header: 'Capital soc / CA', index: 29 },
  { key: 'capitalSocial', header: 'Capital Social', index: 30 },
  { key: 'pctCSValBruteMateriel', header: '% CS / Val. Brute Matériel', index: 31 },
  { key: 'valeurBruteMateriels', header: 'Valeur brute des matériels', index: 32 },
  { key: 'pctCSCapPropres', header: '% CS / Cap. propres', index: 33 },
  { key: 'capitauxPropres', header: 'Capitaux propres', index: 34 },
  { key: 'pctCapPropresPassif', header: '% Cap Propres/ Passif', index: 35 },
  { key: 'passif', header: 'Passif', index: 36 },
  { key: 'pctTauxEndettement', header: "% Taux d'endettement", index: 37 },
  { key: 'endettementLMT', header: 'Endettement LMT', index: 38 },
  { key: 'caf', header: "Capacité d'auto-financement", index: 39 },
  { key: 'fondRoulementCA', header: 'Fond roulement / CA', index: 51 },
  { key: 'fondRoulement', header: 'Fond de roulement', index: 52 },
];

const EXCLUDED_NAMES = ['total', 'moyenne', '1er quartile', '3ème quartile', '3eme quartile'];

function isExcludedName(name) {
  if (name == null) return true;
  const t = String(name).trim().toLowerCase();
  if (t === '') return true;
  if (t.startsWith('nb cuma')) return true;
  return EXCLUDED_NAMES.includes(t);
}

function resolveColumns(headerRow) {
  const trimmed = (headerRow || []).map((h) => (h == null ? '' : String(h).trim()));
  const resolved = {};
  for (const { key, header, index } of GLOBAL_FIELD_MAP) {
    let idx = trimmed.findIndex((h) => h === header);
    if (idx === -1) idx = index;
    resolved[key] = idx;
  }
  return resolved;
}

/**
 * Parse un classeur benchmark multi-CUMA (onglet `global`) déjà lu en
 * ArrayBuffer.
 * @param {ArrayBuffer} arrayBuffer
 * @returns {{ importedAt: string, rows: object[] }}
 */
export function parseGlobalMultiCumaBuffer(arrayBuffer) {
  const wb = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
  if (!wb.SheetNames.includes('global')) {
    throw new Error('Feuille "global" introuvable dans le fichier Excel.');
  }
  const matrix = XLSX.utils.sheet_to_json(wb.Sheets['global'], {
    header: 1, defval: null, blankrows: false,
  });
  if (matrix.length < 2) throw new Error('La feuille "global" est vide.');

  const cols = resolveColumns(matrix[0]);
  const rows = [];
  for (let i = 1; i < matrix.length; i++) {
    const raw = matrix[i];
    const nom = raw[cols.nom];
    if (isExcludedName(nom)) continue;
    const row = {};
    for (const key of Object.keys(cols)) {
      row[key] = raw[cols[key]] ?? null;
    }
    row.nom = String(nom).trim();
    row.categorie = categorieFromCA(Number(row.ca) || 0);
    rows.push(row);
  }
  return { importedAt: new Date().toISOString(), rows };
}

/**
 * Parse le fichier Excel benchmark déposé par l'utilisateur.
 * @param {File} file
 * @returns {Promise<{ importedAt: string, rows: object[], fileName: string }>}
 */
export async function parseGlobalMultiCuma(file) {
  const arrayBuffer = await file.arrayBuffer();
  const data = parseGlobalMultiCumaBuffer(arrayBuffer);
  return { ...data, fileName: file.name };
}
```

- [ ] **Step 4 : Lancer le test, vérifier le succès**

Run: `npx vitest run src/__tests__/parseGlobalMultiCuma.test.js`
Expected: PASS.

- [ ] **Step 5 : Commit**

```bash
git add src/engine/parseGlobalMultiCuma.js src/__tests__/parseGlobalMultiCuma.test.js
git commit -m "feat(multi-cuma): parser onglet global"
```

---

## Task 4 : Calcul de la synthèse (pivots)

**Files:**
- Create: `src/domain/multiCuma/synthese.js`
- Test: `src/__tests__/multiCumaSynthese.test.js`

- [ ] **Step 1 : Écrire le test qui échoue**

```javascript
// src/__tests__/multiCumaSynthese.test.js
import { describe, it, expect } from 'vitest';
import { computeSyntheseTable, TABLE1_METRICS } from '../domain/multiCuma/synthese';

// 3 CUMA : 2 dans la tranche < 10 000€, 1 dans 50 à 80 000€
const rows = [
  { categorie: '< 10 000€', ca: 4000, carburant: 100, pctEntretienCA: 0.40, entretienReparation: 1600 },
  { categorie: '< 10 000€', ca: 6000, carburant: 300, pctEntretienCA: 0.20, entretienReparation: 1200 },
  { categorie: '50 à 80 000€', ca: 60000, carburant: 2000, pctEntretienCA: 0.30, entretienReparation: 18000 },
];

// index des colonnes dans TABLE1_METRICS
const iCA = TABLE1_METRICS.findIndex((m) => m.label === 'CA');
const iCarb = TABLE1_METRICS.findIndex((m) => m.label === 'Carburant');
const iEntr = TABLE1_METRICS.findIndex((m) => m.label === '% Entretien / CA');
const iNb = TABLE1_METRICS.findIndex((m) => m.type === 'count');
const iPart = TABLE1_METRICS.findIndex((m) => m.type === 'share');

describe('computeSyntheseTable', () => {
  it('produit une ligne par tranche + une ligne Total', () => {
    const { trancheRows, totalRow } = computeSyntheseTable(rows, TABLE1_METRICS);
    expect(trancheRows).toHaveLength(5); // les 5 tranches, même vides
    expect(trancheRows[0].categorie).toBe('< 10 000€');
    expect(totalRow.categorie).toBe('Total');
    expect(totalRow.count).toBe(3);
  });

  it('mode moyenne : moyenne simple des valeurs et des ratios', () => {
    const { trancheRows } = computeSyntheseTable(rows, TABLE1_METRICS, { mode: 'mean' });
    const t = trancheRows[0]; // < 10 000€
    expect(t.count).toBe(2);
    expect(t.cells[iCA]).toBe(5000);      // (4000+6000)/2
    expect(t.cells[iCarb]).toBe(200);     // (100+300)/2
    expect(t.cells[iEntr]).toBeCloseTo(0.30); // (0.40+0.20)/2
  });

  it('mode pondéré : ratio = somme(num)/somme(denom)', () => {
    const { trancheRows } = computeSyntheseTable(rows, TABLE1_METRICS, { mode: 'weighted' });
    const t = trancheRows[0];
    // (1600+1200)/(4000+6000) = 0.28
    expect(t.cells[iEntr]).toBeCloseTo(0.28);
    // les valeurs absolues restent en moyenne
    expect(t.cells[iCA]).toBe(5000);
  });

  it('compte et répartition (somme des parts = 100%)', () => {
    const { trancheRows, totalRow } = computeSyntheseTable(rows, TABLE1_METRICS);
    expect(trancheRows[0].cells[iNb]).toBe(2);
    expect(trancheRows[0].cells[iPart]).toBeCloseTo(2 / 3);
    const somme = trancheRows.reduce((s, r) => s + (r.cells[iPart] || 0), 0);
    expect(somme).toBeCloseTo(1);
    expect(totalRow.cells[iPart]).toBeCloseTo(1);
  });
});
```

- [ ] **Step 2 : Lancer le test, vérifier l'échec**

Run: `npx vitest run src/__tests__/multiCumaSynthese.test.js`
Expected: FAIL (module introuvable).

- [ ] **Step 3 : Implémentation**

```javascript
// src/domain/multiCuma/synthese.js
import { TRANCHE_ORDER } from './tranches';

/**
 * Métrique de pivot.
 * type: 'value' (défaut) | 'count' | 'share'
 * value → moyenne(source) ; en mode pondéré avec num/denom → Σnum/Σdenom
 * format: 'amount' | 'percent' | 'int'
 */
export const TABLE1_METRICS = [
  { label: 'CA', type: 'value', source: 'ca', format: 'amount' },
  { label: 'Rés. Courant', type: 'value', source: 'resultatCourant', format: 'amount' },
  { label: 'Rés. Excépt.', type: 'value', source: 'resultatExceptionnel', format: 'amount' },
  { label: 'Rés. Net', type: 'value', source: 'resultatNet', format: 'amount' },
  { label: '% Entretien / CA', type: 'value', source: 'pctEntretienCA', format: 'percent', num: 'entretienReparation', denom: 'ca' },
  { label: '% Amortis. / CA', type: 'value', source: 'pctAmortCA', format: 'percent', num: 'amortissement', denom: 'ca' },
  { label: '% Ch. Salariales / CA', type: 'value', source: 'pctChSalarialesCA', format: 'percent', num: 'chargesSalariales', denom: 'ca' },
  { label: 'Carburant', type: 'value', source: 'carburant', format: 'amount' },
  { label: 'Frais Financier / CA', type: 'value', source: 'pctFraisFinancierCA', format: 'percent', num: 'fraisFinancier', denom: 'ca' },
  { label: 'Nombre dossiers', type: 'count', format: 'int' },
  { label: 'Répartition CUMA par CA', type: 'share', format: 'percent' },
];

export const TABLE2_METRICS = [
  { label: 'Fonds roulement', type: 'value', source: 'fondRoulement', format: 'amount' },
  { label: 'Fonds roulement / CA', type: 'value', source: 'fondRoulementCA', format: 'percent', num: 'fondRoulement', denom: 'ca' },
  { label: '% Cap Propres / Passif', type: 'value', source: 'pctCapPropresPassif', format: 'percent', num: 'capitauxPropres', denom: 'passif' },
  { label: 'CS', type: 'value', source: 'capitalSocial', format: 'amount' },
  { label: 'Capital soc / CA', type: 'value', source: 'capitalSocCA', format: 'percent', num: 'capitalSocial', denom: 'ca' },
  // NOTE spec §7 : dénominateur du taux d'endettement à confirmer (capitauxPropres par défaut).
  { label: "% Taux d'endettement", type: 'value', source: 'pctTauxEndettement', format: 'percent', num: 'endettementLMT', denom: 'capitauxPropres' },
  { label: 'Créances', type: 'value', source: 'creances', format: 'amount' },
  { label: '% Créances / CA', type: 'value', source: 'pctCreancesCA', format: 'percent', num: 'creances', denom: 'ca' },
  { label: '% CS / Val. Brute Matériel', type: 'value', source: 'pctCSValBruteMateriel', format: 'percent', num: 'capitalSocial', denom: 'valeurBruteMateriels' },
];

function mean(rows, key) {
  let sum = 0, n = 0;
  for (const r of rows) {
    const v = Number(r[key]);
    if (Number.isFinite(v)) { sum += v; n++; }
  }
  return n === 0 ? null : sum / n;
}

function sumKey(rows, key) {
  let s = 0;
  for (const r of rows) {
    const v = Number(r[key]);
    if (Number.isFinite(v)) s += v;
  }
  return s;
}

/**
 * Calcule une cellule de métrique sur un sous-ensemble de lignes.
 * @param {object[]} subset
 * @param {object} metric
 * @param {'mean'|'weighted'} mode
 * @param {number} totalCount effectif de l'ensemble filtré (pour 'share')
 * @returns {number|null}
 */
export function computeMetric(subset, metric, mode, totalCount) {
  if (metric.type === 'count') return subset.length;
  if (metric.type === 'share') return totalCount === 0 ? null : subset.length / totalCount;
  if (mode === 'weighted' && metric.num && metric.denom) {
    const d = sumKey(subset, metric.denom);
    return d === 0 ? null : sumKey(subset, metric.num) / d;
  }
  return mean(subset, metric.source);
}

/**
 * Construit un tableau de synthèse : une ligne par tranche (dans l'ordre) +
 * une ligne Total sur l'ensemble filtré.
 * @param {object[]} rows lignes déjà filtrées (région/dpt/classe)
 * @param {object[]} metrics TABLE1_METRICS ou TABLE2_METRICS
 * @param {{mode?: 'mean'|'weighted'}} [options]
 */
export function computeSyntheseTable(rows, metrics, { mode = 'mean' } = {}) {
  const total = rows.length;
  const byTranche = new Map(TRANCHE_ORDER.map((t) => [t, []]));
  for (const r of rows) {
    if (byTranche.has(r.categorie)) byTranche.get(r.categorie).push(r);
  }
  const trancheRows = TRANCHE_ORDER.map((t) => {
    const subset = byTranche.get(t);
    return {
      categorie: t,
      count: subset.length,
      cells: metrics.map((m) => computeMetric(subset, m, mode, total)),
    };
  });
  const totalRow = {
    categorie: 'Total',
    count: total,
    cells: metrics.map((m) => computeMetric(rows, m, mode, total)),
  };
  return { trancheRows, totalRow };
}
```

- [ ] **Step 4 : Lancer le test, vérifier le succès**

Run: `npx vitest run src/__tests__/multiCumaSynthese.test.js`
Expected: PASS.

- [ ] **Step 5 : Commit**

```bash
git add src/domain/multiCuma/synthese.js src/__tests__/multiCumaSynthese.test.js
git commit -m "feat(multi-cuma): calcul des tableaux de synthese"
```

---

## Task 5 : Config des colonnes + formatage des cellules

**Files:**
- Create: `src/domain/multiCuma/columns.js`

Pas de test dédié (config déclarative + helper trivial couvert indirectement). Vérification par lint + build.

- [ ] **Step 1 : Créer le fichier**

```javascript
// src/domain/multiCuma/columns.js
import { formatAmountFull, formatPercent } from '../../engine/formatUtils';

/**
 * Colonnes affichées dans l'onglet Données (dans l'ordre). Les colonnes
 * purement techniques du fichier source sont volontairement omises.
 * format: 'text' | 'int' | 'amount' | 'percent'
 * frozen: colonne figée à gauche (nom).
 */
export const DATA_COLUMNS = [
  { key: 'nom', label: 'CUMA', format: 'text', frozen: true },
  { key: 'classe', label: 'Classe', format: 'text' },
  { key: 'dpt', label: 'Dpt', format: 'text' },
  { key: 'region', label: 'Région', format: 'text' },
  { key: 'categorie', label: 'Tranche CA', format: 'text' },
  { key: 'nbAdherents', label: 'Adhérents', format: 'int' },
  { key: 'ca', label: 'CA', format: 'amount' },
  { key: 'caCorrige', label: 'CA corrigé', format: 'amount' },
  { key: 'ebe', label: 'EBE', format: 'amount' },
  { key: 'resultatCourant', label: 'Rés. courant', format: 'amount' },
  { key: 'resultatExceptionnel', label: 'Rés. except.', format: 'amount' },
  { key: 'resultatNet', label: 'Rés. net', format: 'amount' },
  { key: 'pctEntretienCA', label: '% Entretien/CA', format: 'percent' },
  { key: 'entretienReparation', label: 'Entretien', format: 'amount' },
  { key: 'pctAmortCA', label: '% Amort./CA', format: 'percent' },
  { key: 'amortissement', label: 'Amortissement', format: 'amount' },
  { key: 'pctChSalarialesCA', label: '% Ch. sal./CA', format: 'percent' },
  { key: 'chargesSalariales', label: 'Ch. salariales', format: 'amount' },
  { key: 'carburant', label: 'Carburant', format: 'amount' },
  { key: 'pctFraisFinancierCA', label: '% Frais fin./CA', format: 'percent' },
  { key: 'fraisFinancier', label: 'Frais fin.', format: 'amount' },
  { key: 'fondRoulement', label: 'Fonds roulement', format: 'amount' },
  { key: 'fondRoulementCA', label: 'FDR/CA', format: 'percent' },
  { key: 'pctCreancesCA', label: '% Créances/CA', format: 'percent' },
  { key: 'creances', label: 'Créances', format: 'amount' },
  { key: 'capitalSocCA', label: 'Cap. soc./CA', format: 'percent' },
  { key: 'capitalSocial', label: 'Capital social', format: 'amount' },
  { key: 'pctCSValBruteMateriel', label: '% CS/VBM', format: 'percent' },
  { key: 'valeurBruteMateriels', label: 'Val. brute matériels', format: 'amount' },
  { key: 'pctCapPropresPassif', label: '% Cap. propres/Passif', format: 'percent' },
  { key: 'capitauxPropres', label: 'Capitaux propres', format: 'amount' },
  { key: 'passif', label: 'Passif', format: 'amount' },
  { key: 'pctTauxEndettement', label: "% Taux d'endett.", format: 'percent' },
  { key: 'endettementLMT', label: 'Endettement LMT', format: 'amount' },
  { key: 'caf', label: 'CAF', format: 'amount' },
];

/**
 * Formate une valeur pour l'affichage selon le type de colonne/métrique.
 * Les ratios sont stockés en fraction → multipliés par 100 pour l'affichage.
 * @param {any} value
 * @param {'text'|'int'|'amount'|'percent'} format
 * @returns {string}
 */
export function formatCell(value, format) {
  if (format === 'text') return value == null || value === '' ? '—' : String(value);
  if (value == null || value === '' || !Number.isFinite(Number(value))) {
    return format === 'percent' ? '— %' : '—';
  }
  const n = Number(value);
  if (format === 'int') return new Intl.NumberFormat('fr-FR').format(Math.round(n));
  if (format === 'percent') return formatPercent(n * 100, 1);
  return formatAmountFull(n); // 'amount'
}
```

- [ ] **Step 2 : Lint**

Run: `npx eslint src/domain/multiCuma/columns.js`
Expected: aucune erreur.

- [ ] **Step 3 : Commit**

```bash
git add src/domain/multiCuma/columns.js
git commit -m "feat(multi-cuma): config colonnes Donnees + formatCell"
```

---

## Task 6 : Bloc de store (import multi-CUMA)

**Files:**
- Modify: `src/store/useStore.js` (import ligne 13 ; état ~ligne 42 ; action ~ligne 377 ; reset ~ligne 566)

- [ ] **Step 1 : Ajouter l'import**

Après la ligne `import { parseExportMulti } from '../engine/parseExportMulti';` :

```javascript
import { parseGlobalMultiCuma } from '../engine/parseGlobalMultiCuma';
```

- [ ] **Step 2 : Ajouter l'état**

Juste après le bloc `exploitationData / isLoadingExploitation / errorExploitation` :

```javascript
  multiCumaData: null,          // { importedAt, rows, fileName } | null — voir engine/parseGlobalMultiCuma.js
  isLoadingMultiCuma: false,
  errorMultiCuma: null,
```

- [ ] **Step 3 : Ajouter l'action**

Juste après l'action `clearExploitationError` (~ligne 377) :

```javascript
  loadMultiCuma: async (file) => {
    set({ isLoadingMultiCuma: true, errorMultiCuma: null });
    try {
      const multiCumaData = await parseGlobalMultiCuma(file);
      set({ multiCumaData, isLoadingMultiCuma: false });
    } catch (err) {
      set({ isLoadingMultiCuma: false, errorMultiCuma: err.message });
    }
  },

  clearMultiCumaError: () => set({ errorMultiCuma: null }),
```

- [ ] **Step 4 : Ajouter au reset**

Dans le bloc de réinitialisation (près de `exploitationData: null` ~ligne 566) :

```javascript
    multiCumaData: null,
    isLoadingMultiCuma: false,
    errorMultiCuma: null,
```

- [ ] **Step 5 : Lint + build**

Run: `npx eslint src/store/useStore.js`
Expected: aucune erreur.

- [ ] **Step 6 : Commit**

```bash
git add src/store/useStore.js
git commit -m "feat(multi-cuma): bloc de store import global"
```

---

## Task 7 : Permissions (module de droits à part entière)

**Files:**
- Modify: `functions/_lib/validate.js:5-9`
- Modify: `src/components/admin/AdminPanel.jsx:9-26`

- [ ] **Step 1 : Backend — ajouter à `VALID_SECTIONS`**

Dans `functions/_lib/validate.js`, ajouter `'multiCuma'` au tableau (dernière ligne du bloc) :

```javascript
const VALID_SECTIONS = [
  'analyseur', 'controles', 'dashboard', 'dossier', 'budget', 'treasury', 'bilanCR', 'bilanParam', 'editions',
  'emprunts', 'immobilisations', 'capitalSocialRegistre', 'materiels', 'ficheSynthese',
  'export', 'diaporama', 'analyse', 'multiCuma',
];
```

- [ ] **Step 2 : Front — ajouter à `ALL_SECTIONS`**

Dans `src/components/admin/AdminPanel.jsx`, ajouter l'entrée dans le tableau `ALL_SECTIONS` (avant `export` par ex.) :

```javascript
  { id: 'multiCuma',  label: 'Analyse multi-CUMA' },
```

- [ ] **Step 3 : Lint**

Run: `npx eslint functions/_lib/validate.js src/components/admin/AdminPanel.jsx`
Expected: aucune erreur.

- [ ] **Step 4 : Commit**

```bash
git add functions/_lib/validate.js src/components/admin/AdminPanel.jsx
git commit -m "feat(multi-cuma): section multiCuma dans les droits"
```

---

## Task 8 : Composant générique `SynthesePivotTable`

**Files:**
- Create: `src/components/multiCuma/SynthesePivotTable.jsx`

- [ ] **Step 1 : Créer le composant**

```jsx
// src/components/multiCuma/SynthesePivotTable.jsx
import { formatCell } from '../../domain/multiCuma/columns';

const HEAD_BG = '#4F81BD';   // bleu en-tête (réf. screenshot)
const HEAD_FG = '#FFFFFF';
const TOTAL_BG = '#EAF1FB';

/**
 * Rendu générique d'un tableau croisé par tranche.
 * @param {{ title: string, metrics: object[], data: { trancheRows: object[], totalRow: object } }} props
 */
export function SynthesePivotTable({ title, metrics, data }) {
  const { trancheRows, totalRow } = data;
  const cell = { padding: '7px 10px', fontSize: '12px', textAlign: 'right', borderBottom: '1px solid #E2E8F0', whiteSpace: 'nowrap' };
  const headCell = { ...cell, background: HEAD_BG, color: HEAD_FG, fontWeight: 700, textAlign: 'right', borderBottom: 'none' };

  const renderRow = (row, isTotal) => (
    <tr key={row.categorie} style={isTotal ? { background: TOTAL_BG, fontWeight: 700 } : undefined}>
      <td style={{ ...cell, textAlign: 'left', fontWeight: isTotal ? 700 : 600 }}>{row.categorie}</td>
      {metrics.map((m, i) => (
        <td key={m.label} style={cell}>{formatCell(row.cells[i], m.format)}</td>
      ))}
    </tr>
  );

  return (
    <div style={{ marginBottom: '28px', overflowX: 'auto' }}>
      {title && <div style={{ fontSize: '14px', fontWeight: 700, color: '#1A202C', marginBottom: '8px' }}>{title}</div>}
      <table style={{ borderCollapse: 'collapse', minWidth: '100%' }}>
        <thead>
          <tr>
            <th style={{ ...headCell, textAlign: 'left' }}>Tranches</th>
            {metrics.map((m) => <th key={m.label} style={headCell}>{m.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {trancheRows.map((r) => renderRow(r, false))}
          {renderRow(totalRow, true)}
        </tbody>
      </table>
    </div>
  );
}

export default SynthesePivotTable;
```

- [ ] **Step 2 : Lint**

Run: `npx eslint src/components/multiCuma/SynthesePivotTable.jsx`
Expected: aucune erreur.

- [ ] **Step 3 : Commit**

```bash
git add src/components/multiCuma/SynthesePivotTable.jsx
git commit -m "feat(multi-cuma): tableau croise generique"
```

---

## Task 9 : Onglet Synthèse (filtres + bascule + 2 tableaux)

**Files:**
- Create: `src/components/multiCuma/MultiCumaSynthese.jsx`

- [ ] **Step 1 : Créer le composant**

```jsx
// src/components/multiCuma/MultiCumaSynthese.jsx
import { useMemo, useState } from 'react';
import { distinctValues } from '../../engine/tableUtils';
import {
  TABLE1_METRICS, TABLE2_METRICS, computeSyntheseTable,
} from '../../domain/multiCuma/synthese';
import { SynthesePivotTable } from './SynthesePivotTable';

const SELECT_STYLE = {
  border: '1px solid #CBD5E0', borderRadius: '6px', padding: '7px 10px',
  fontSize: '13px', color: '#1A202C', backgroundColor: '#fff', cursor: 'pointer',
};

function FilterSelect({ label, value, options, onChange }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: '#718096' }}>
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)} style={SELECT_STYLE}>
        <option value="">Tous</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

export function MultiCumaSynthese({ rows }) {
  const [region, setRegion] = useState('');
  const [dpt, setDpt] = useState('');
  const [classe, setClasse] = useState('');
  const [mode, setMode] = useState('mean'); // 'mean' | 'weighted'

  const regions = useMemo(() => distinctValues(rows, 'region'), [rows]);
  const depts = useMemo(() => distinctValues(rows, 'dpt'), [rows]);
  const classes = useMemo(() => distinctValues(rows, 'classe'), [rows]);

  const filtered = useMemo(() => rows.filter((r) =>
    (!region || String(r.region) === region) &&
    (!dpt || String(r.dpt) === dpt) &&
    (!classe || String(r.classe) === classe)
  ), [rows, region, dpt, classe]);

  const table1 = useMemo(() => computeSyntheseTable(filtered, TABLE1_METRICS, { mode }), [filtered, mode]);
  const table2 = useMemo(() => computeSyntheseTable(filtered, TABLE2_METRICS, { mode }), [filtered, mode]);

  return (
    <div style={{ paddingTop: '8px' }}>
      <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '18px' }}>
        <FilterSelect label="Région" value={region} options={regions} onChange={setRegion} />
        <FilterSelect label="Département" value={dpt} options={depts.map(String)} onChange={setDpt} />
        <FilterSelect label="Classe" value={classe} options={classes} onChange={setClasse} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: '#718096' }}>
          Mode de calcul
          <div style={{ display: 'flex', border: '1px solid #CBD5E0', borderRadius: '6px', overflow: 'hidden' }}>
            {[['mean', 'Moyenne simple'], ['weighted', 'Pondéré']].map(([v, lbl]) => (
              <button
                key={v}
                type="button"
                onClick={() => setMode(v)}
                style={{
                  padding: '7px 12px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', border: 'none',
                  background: mode === v ? '#31B700' : '#fff', color: mode === v ? '#fff' : '#718096',
                }}
              >
                {lbl}
              </button>
            ))}
          </div>
        </div>
        <div style={{ fontSize: '12px', color: '#718096', marginLeft: 'auto' }}>
          {filtered.length} CUMA
        </div>
      </div>

      <SynthesePivotTable title="Résultats & charges" metrics={TABLE1_METRICS} data={table1} />
      <SynthesePivotTable title="Structure financière" metrics={TABLE2_METRICS} data={table2} />
    </div>
  );
}

export default MultiCumaSynthese;
```

- [ ] **Step 2 : Lint**

Run: `npx eslint src/components/multiCuma/MultiCumaSynthese.jsx`
Expected: aucune erreur.

- [ ] **Step 3 : Commit**

```bash
git add src/components/multiCuma/MultiCumaSynthese.jsx
git commit -m "feat(multi-cuma): onglet Synthese"
```

---

## Task 10 : Table de données groupée repliable

**Files:**
- Create: `src/components/multiCuma/MultiCumaDataTable.jsx`

- [ ] **Step 1 : Créer le composant**

```jsx
// src/components/multiCuma/MultiCumaDataTable.jsx
import { Fragment } from 'react';
import { DATA_COLUMNS, formatCell } from '../../domain/multiCuma/columns';

const th = {
  position: 'sticky', top: 0, background: '#F1F5F9', zIndex: 1,
  padding: '8px 10px', fontSize: '12px', fontWeight: 700, color: '#4A5568',
  textAlign: 'right', whiteSpace: 'nowrap', borderBottom: '2px solid #E2E8F0',
};
const td = { padding: '6px 10px', fontSize: '12px', textAlign: 'right', whiteSpace: 'nowrap', borderBottom: '1px solid #EDF2F7' };
const leftAlign = { textAlign: 'left' };
const frozen = { position: 'sticky', left: 0, background: '#fff', zIndex: 1 };

function DataRow({ row }) {
  return (
    <tr>
      {DATA_COLUMNS.map((c) => (
        <td key={c.key} style={{ ...td, ...(c.format === 'text' ? leftAlign : {}), ...(c.frozen ? frozen : {}) }}>
          {formatCell(row[c.key], c.format)}
        </td>
      ))}
    </tr>
  );
}

/**
 * Rendu récursif d'un nœud de groupe (avec repli).
 */
function GroupNode({ node, path, depth, collapsed, onToggle }) {
  const id = path;
  const isCollapsed = collapsed.has(id);
  return (
    <Fragment>
      <tr onClick={() => onToggle(id)} style={{ cursor: 'pointer', background: depth === 0 ? '#E8F0FE' : '#F5F8FF' }}>
        <td colSpan={DATA_COLUMNS.length} style={{ ...td, ...leftAlign, fontWeight: 600, paddingLeft: `${10 + depth * 18}px` }}>
          <span style={{ display: 'inline-block', width: '14px' }}>{isCollapsed ? '▸' : '▾'}</span>
          {node.label} : {node.key} <span style={{ color: '#718096', fontWeight: 400 }}>({node.count})</span>
        </td>
      </tr>
      {!isCollapsed && node.children && node.children.map((child) => (
        <GroupNode
          key={`${id}/${child.key}`}
          node={child}
          path={`${id}/${child.key}`}
          depth={depth + 1}
          collapsed={collapsed}
          onToggle={onToggle}
        />
      ))}
      {!isCollapsed && node.rows && node.rows.map((r, i) => <DataRow key={i} row={r} />)}
    </Fragment>
  );
}

/**
 * @param {{ groups: object[]|null, flatRows: object[], collapsed: Set<string>, onToggle: (id: string) => void }} props
 * groups = arbre issu de groupMultiLevel (null si aucun regroupement).
 */
export function MultiCumaDataTable({ groups, flatRows, collapsed, onToggle }) {
  return (
    <div style={{ overflowX: 'auto', maxHeight: '70vh', overflowY: 'auto', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
      <table style={{ borderCollapse: 'collapse', minWidth: '100%' }}>
        <thead>
          <tr>
            {DATA_COLUMNS.map((c) => (
              <th key={c.key} style={{ ...th, ...(c.format === 'text' ? leftAlign : {}), ...(c.frozen ? { ...frozen, background: '#F1F5F9', zIndex: 2 } : {}) }}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groups
            ? groups.map((n) => (
                <GroupNode key={n.key} node={n} path={n.key} depth={0} collapsed={collapsed} onToggle={onToggle} />
              ))
            : flatRows.map((r, i) => <DataRow key={i} row={r} />)}
        </tbody>
      </table>
    </div>
  );
}

export default MultiCumaDataTable;
```

- [ ] **Step 2 : Lint**

Run: `npx eslint src/components/multiCuma/MultiCumaDataTable.jsx`
Expected: aucune erreur.

- [ ] **Step 3 : Commit**

```bash
git add src/components/multiCuma/MultiCumaDataTable.jsx
git commit -m "feat(multi-cuma): table de donnees groupee repliable"
```

---

## Task 11 : Onglet Données (recherche + regroupements)

**Files:**
- Create: `src/components/multiCuma/MultiCumaDataTab.jsx`

- [ ] **Step 1 : Créer le composant**

```jsx
// src/components/multiCuma/MultiCumaDataTab.jsx
import { useMemo, useState } from 'react';
import { filterByText, groupMultiLevel } from '../../engine/tableUtils';
import { MultiCumaDataTable } from './MultiCumaDataTable';

const GROUP_DEFS = [
  { id: 'classe', label: 'Classe', fn: (r) => r.classe ?? '—' },
  { id: 'dpt', label: 'Département', fn: (r) => r.dpt ?? '—' },
  { id: 'region', label: 'Région', fn: (r) => r.region ?? '—' },
  { id: 'categorie', label: 'Tranche CA', fn: (r) => r.categorie ?? '—' },
];

function GroupToggle({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: `1px solid ${active ? '#31B700' : '#CBD5E0'}`, borderRadius: '6px', padding: '6px 12px',
        fontSize: '13px', fontWeight: 600, cursor: 'pointer',
        color: active ? '#268E00' : '#718096', background: active ? '#E8F5E0' : '#fff',
      }}
    >
      {active ? '✓ ' : ''}{children}
    </button>
  );
}

export function MultiCumaDataTab({ rows }) {
  const [search, setSearch] = useState('');
  const [activeGroups, setActiveGroups] = useState([]); // ordre = ordre de clic
  const [collapsed, setCollapsed] = useState(new Set());

  const toggleGroup = (id) =>
    setActiveGroups((prev) => (prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]));
  const onToggleNode = (nodeId) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(nodeId) ? next.delete(nodeId) : next.add(nodeId);
      return next;
    });

  const filtered = useMemo(() => filterByText(rows, ['nom'], search), [rows, search]);

  const keyFns = useMemo(
    () => activeGroups.map((id) => GROUP_DEFS.find((g) => g.id === id)),
    [activeGroups]
  );
  const groups = useMemo(
    () => (keyFns.length ? groupMultiLevel(filtered, keyFns) : null),
    [filtered, keyFns]
  );

  return (
    <div style={{ paddingTop: '8px' }}>
      <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '14px' }}>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher une CUMA…"
          style={{ border: '1px solid #CBD5E0', borderRadius: '6px', padding: '8px 12px', fontSize: '13px', minWidth: '240px' }}
        />
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: '#718096' }}>Regrouper par :</span>
          {GROUP_DEFS.map((g) => (
            <GroupToggle key={g.id} active={activeGroups.includes(g.id)} onClick={() => toggleGroup(g.id)}>
              {g.label}
            </GroupToggle>
          ))}
        </div>
        <div style={{ fontSize: '12px', color: '#718096', marginLeft: 'auto' }}>
          {filtered.length} CUMA sur {rows.length}
        </div>
      </div>

      <MultiCumaDataTable groups={groups} flatRows={filtered} collapsed={collapsed} onToggle={onToggleNode} />
    </div>
  );
}

export default MultiCumaDataTab;
```

- [ ] **Step 2 : Lint**

Run: `npx eslint src/components/multiCuma/MultiCumaDataTab.jsx`
Expected: aucune erreur.

- [ ] **Step 3 : Commit**

```bash
git add src/components/multiCuma/MultiCumaDataTab.jsx
git commit -m "feat(multi-cuma): onglet Donnees (recherche + regroupements)"
```

---

## Task 12 : Coquille de section + sous-onglets + upload

**Files:**
- Create: `src/components/multiCuma/MultiCumaTab.jsx`

- [ ] **Step 1 : Créer le composant**

```jsx
// src/components/multiCuma/MultiCumaTab.jsx
import { useState } from 'react';
import useStore from '../../store/useStore';
import useAuthStore from '../../store/useAuthStore';
import { UploadPrompt } from '../shared/UploadPrompt';
import { MultiCumaDataTab } from './MultiCumaDataTab';
import { MultiCumaSynthese } from './MultiCumaSynthese';

const SUB_TABS = [
  { id: 'donnees', label: 'Données' },
  { id: 'synthese', label: 'Synthèse' },
];

function SubTab({ active, onClick, children }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      style={{
        padding: '8px 14px', fontSize: '13px', fontWeight: active ? 700 : 400,
        color: active ? '#1A202C' : '#718096', background: 'transparent', border: 'none',
        borderBottom: active ? '3px solid #FF8200' : '3px solid transparent', cursor: 'pointer', marginBottom: '-1px',
      }}
    >
      {children}
    </button>
  );
}

export function MultiCumaTab() {
  const multiCumaData = useStore((s) => s.multiCumaData);
  const loadMultiCuma = useStore((s) => s.loadMultiCuma);
  const errorMultiCuma = useStore((s) => s.errorMultiCuma);
  const canUploadFile = useAuthStore((s) => s.canUploadFile());
  const [subTab, setSubTab] = useState('donnees');

  if (!multiCumaData) {
    return (
      <UploadPrompt
        title="Analyse multi-CUMA"
        description="Chargez le classeur benchmark (onglet « global ») pour analyser l'ensemble des CUMA."
        accept=".xlsx,.xls,.xlsm"
        onFile={loadMultiCuma}
        canUpload={canUploadFile}
        error={errorMultiCuma}
      />
    );
  }

  const rows = multiCumaData.rows;

  return (
    <div style={{ paddingTop: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#1A202C' }}>Analyse multi-CUMA</div>
          <div style={{ fontSize: '13px', color: '#718096' }}>{rows.length} CUMA — {multiCumaData.fileName}</div>
        </div>
      </div>

      <nav role="tablist" style={{ display: 'flex', borderBottom: '1px solid #E2E8F0', marginBottom: '4px' }}>
        {SUB_TABS.map((t) => (
          <SubTab key={t.id} active={t.id === subTab} onClick={() => setSubTab(t.id)}>{t.label}</SubTab>
        ))}
      </nav>

      {subTab === 'donnees' && <MultiCumaDataTab rows={rows} />}
      {subTab === 'synthese' && <MultiCumaSynthese rows={rows} />}
    </div>
  );
}

export default MultiCumaTab;
```

- [ ] **Step 2 : Lint**

Run: `npx eslint src/components/multiCuma/MultiCumaTab.jsx`
Expected: aucune erreur.

- [ ] **Step 3 : Commit**

```bash
git add src/components/multiCuma/MultiCumaTab.jsx
git commit -m "feat(multi-cuma): coquille de section + sous-onglets"
```

---

## Task 13 : Câblage navigation + route

**Files:**
- Modify: `src/components/layout/SideNav.jsx:9` (après l'entrée `dashboard`)
- Modify: `src/App.jsx` (import + route)

- [ ] **Step 1 : Ajouter l'entrée de menu**

Dans `src/components/layout/SideNav.jsx`, après la ligne
`{ id: 'dashboard',  icon: '📊', label: 'Tableaux de bord' },` ajouter :

```javascript
  { id: 'multiCuma',  icon: '🌐', label: 'Analyse multi-CUMA' },
```

- [ ] **Step 2 : Importer le composant dans `App.jsx`**

Près des autres imports de tabs (ex. après `import MonthlyTab from './components/monthly/MonthlyTab';`) :

```javascript
import MultiCumaTab from './components/multiCuma/MultiCumaTab';
```

- [ ] **Step 3 : Ajouter la route**

Dans `src/App.jsx`, après la ligne `{activeSection === 'materiels'              && <MaterielsTab />}` (ou toute autre route de section) :

```jsx
                {activeSection === 'multiCuma'  && <MultiCumaTab />}
```

- [ ] **Step 4 : Lint + build**

Run: `npx eslint src/App.jsx src/components/layout/SideNav.jsx`
Run: `npm run build`
Expected: build OK, aucune erreur.

- [ ] **Step 5 : Commit**

```bash
git add src/App.jsx src/components/layout/SideNav.jsx
git commit -m "feat(multi-cuma): navigation + route de section"
```

---

## Task 14 : Vérification manuelle (preview)

**Files:** aucun (validation).

- [ ] **Step 1 : Lancer toute la suite de tests**

Run: `npx vitest run`
Expected: toutes les nouvelles suites PASS, aucune régression.

- [ ] **Step 2 : Lancer l'app**

Run: `npm run dev` (ou via l'outil preview du harness).

- [ ] **Step 3 : Scénario de recette**

1. Se connecter en admin. La section **🌐 Analyse multi-CUMA** apparaît dans le menu.
2. Ouvrir la section → écran d'upload. Déposer
   `AGCO af2024_v_251219_1230.xlsm`.
3. **Onglet Données** : ~1405 CUMA affichées. Rechercher un nom → filtrage.
   Activer « Classe » puis « Région » → arbre imbriqué repliable (chevrons).
   Ajouter « Tranche CA ».
4. **Onglet Synthèse** : les 2 tableaux par tranche + ligne Total. Basculer
   Moyenne simple ⇄ Pondéré → les colonnes de ratio changent, pas les valeurs
   absolues. Filtrer par Région/Dpt/Classe → recalcul.
5. Vérifier qu'aucune requête réseau ne part avec le contenu du fichier
   (onglet réseau du navigateur / `preview_network`).

- [ ] **Step 4 : Contrôle du mapping « % Taux d'endettement »**

Comparer, en mode pondéré, la colonne « % Taux d'endettement » à des valeurs
plausibles. Si incohérent, ajuster le `denom` de la métrique dans
`src/domain/multiCuma/synthese.js` (`capitauxPropres` → `passif`), relancer
`npx vitest run` puis vérifier de nouveau. Commit si modifié :

```bash
git add src/domain/multiCuma/synthese.js
git commit -m "fix(multi-cuma): denominateur taux d'endettement"
```

---

## Récapitulatif des fichiers

**Créés**
- `src/domain/multiCuma/tranches.js`
- `src/domain/multiCuma/columns.js`
- `src/domain/multiCuma/synthese.js`
- `src/engine/parseGlobalMultiCuma.js`
- `src/components/multiCuma/SynthesePivotTable.jsx`
- `src/components/multiCuma/MultiCumaSynthese.jsx`
- `src/components/multiCuma/MultiCumaDataTable.jsx`
- `src/components/multiCuma/MultiCumaDataTab.jsx`
- `src/components/multiCuma/MultiCumaTab.jsx`
- Tests : `multiCumaTranches.test.js`, `groupMultiLevel.test.js`, `parseGlobalMultiCuma.test.js`, `multiCumaSynthese.test.js`

**Modifiés**
- `src/engine/tableUtils.js` (`groupMultiLevel`)
- `src/store/useStore.js` (bloc multiCuma)
- `functions/_lib/validate.js` (`VALID_SECTIONS`)
- `src/components/admin/AdminPanel.jsx` (`ALL_SECTIONS`)
- `src/components/layout/SideNav.jsx` (entrée de menu)
- `src/App.jsx` (import + route)
