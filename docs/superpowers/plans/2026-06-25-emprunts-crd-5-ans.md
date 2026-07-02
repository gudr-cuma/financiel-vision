# Tableau "CRD à 5 ans" — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "CRD à 5 ans" sub-view to the Emprunts tab — one row per emprunt showing, at a chosen reference date, the cumulative capital repaid and interest paid, the remaining principal, and that remaining principal split into <1yr / 1-5yr / >5yr buckets — plus a matching PDF export document.

**Architecture:** Pure calculation logic lives in `src/engine/empruntsUtils.js` (already the home of emprunt-derived calculations), fully unit-tested. The screen is a local view-toggle inside the existing `EmpruntsTab.jsx` (no new route/nav entry), rendering a new presentational table component `EmpruntsCrd5AnsTable.jsx` that mirrors the existing `EmpruntsTable.jsx`. PDF export reuses the existing `generatePdf.js` / `ExportTab.jsx` document-registry pattern (same shape as the existing `emprunts` document).

**Tech Stack:** React 19, Zustand, Vitest (`npx vitest run <path>`), pdfmake (PDF export engine, already wired).

**Spec:** [docs/superpowers/specs/2026-06-25-emprunts-crd-5-ans-design.md](../specs/2026-06-25-emprunts-crd-5-ans-design.md)

---

## Context for the engineer

- Data comes from the Export_Multi Excel import (`parseExportMulti.js`), already in the store as `exploitationData.emprunts` and `exploitationData.lignesEmprunt`. Dates on `lignesEmprunt` rows are real JS `Date` objects (the parser uses `cellDates: true`).
- Each échéancier line (`lignesEmprunt` row) has a Prévisionnel/Réel pair for capital, intérêt and restant dû, plus `datePrevue`/`dateReelle`. Past/realized lines have `*Reel` fields filled in; future lines only have `*Prev`.
- `bilanCRData.dateFin` (Zustand store) is a **plain string** in `JJ/MM/AAAA` format (e.g. `"31/12/2025"`) — verified against `public/demo/demo_bilanCR.xlsx`. It is never parsed into a `Date` anywhere in the codebase today; this plan adds that parser.
- This codebase has no unit tests for presentational table/tab components (`EmpruntsTable.jsx`, `EmpruntsTab.jsx` have none) — only calculation modules (`engine/*.js`, `domain/**/*.js`) are unit-tested. This plan follows that existing convention: full unit tests for the new calculation functions, manual dev-server verification for the JSX wiring.
- Demo data for manual testing: the Emprunts tab and the Bilan & CR tab each have a "charger une démo" action (`loadDemoExportMulti`, `loadDemoBilanCR` in `useStore.js`), or `loadDemoComplete` loads everything at once.
- Run a single test file with: `npx vitest run src/__tests__/<file>.test.js` (no `test` script exists in `package.json` — use `npx vitest run` directly, confirmed working).

---

### Task 1: `parseFrDate` — parse `bilanCRData.dateFin` strings into `Date`

**Files:**
- Modify: `src/engine/formatUtils.js`
- Test: `src/__tests__/formatUtils.test.js` (new file)

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/formatUtils.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { parseFrDate } from '../engine/formatUtils';

describe('parseFrDate', () => {
  it('parse une date au format JJ/MM/AAAA', () => {
    const date = parseFrDate('31/12/2025');
    expect(date.getFullYear()).toBe(2025);
    expect(date.getMonth()).toBe(11);
    expect(date.getDate()).toBe(31);
  });

  it('accepte un jour ou un mois sur un seul chiffre', () => {
    const date = parseFrDate('1/3/2025');
    expect(date.getFullYear()).toBe(2025);
    expect(date.getMonth()).toBe(2);
    expect(date.getDate()).toBe(1);
  });

  it('renvoie null pour une chaîne vide ou mal formée', () => {
    expect(parseFrDate('')).toBeNull();
    expect(parseFrDate('2025-12-31')).toBeNull();
    expect(parseFrDate('pas une date')).toBeNull();
  });

  it("renvoie null si la valeur n'est pas une chaîne", () => {
    expect(parseFrDate(null)).toBeNull();
    expect(parseFrDate(undefined)).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/__tests__/formatUtils.test.js`
Expected: FAIL — `parseFrDate is not a function` (or similar import error), since it doesn't exist yet.

- [ ] **Step 3: Implement `parseFrDate`**

In `src/engine/formatUtils.js`, add this function after `formatDate` (after line 79, before `signColor`):

```js
/**
 * Parse une date au format JJ/MM/AAAA (format texte utilisé par
 * bilanCRData.dateFin) en objet Date. Renvoie null si le format ne
 * correspond pas.
 * @param {string|null|undefined} str
 * @returns {Date|null}
 */
export function parseFrDate(str) {
  if (typeof str !== 'string') return null;
  const match = str.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const [, d, m, y] = match;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return isNaN(date.getTime()) ? null : date;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/__tests__/formatUtils.test.js`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/engine/formatUtils.js src/__tests__/formatUtils.test.js
git commit -m "feat: add parseFrDate to parse JJ/MM/AAAA date strings"
```

---

### Task 2: `decodePeriode` + `computeCrd5Ans` in `empruntsUtils.js`

**Files:**
- Modify: `src/engine/empruntsUtils.js`
- Test: `src/__tests__/empruntsUtils.test.js`

- [ ] **Step 1: Write the failing tests**

Append to `src/__tests__/empruntsUtils.test.js` (after the existing `getCapitalRestantDu` describe block, keep the existing import line and add to it):

Change the import at the top of the file from:

```js
import { getCapitalRestantDu, countEmpruntsEnCours } from '../engine/empruntsUtils';
```

to:

```js
import { getCapitalRestantDu, countEmpruntsEnCours, decodePeriode, computeCrd5Ans } from '../engine/empruntsUtils';
```

Then append at the end of the file:

```js

describe('decodePeriode', () => {
  it('décode les codes connus', () => {
    expect(decodePeriode('A')).toBe('Annuel');
    expect(decodePeriode('M')).toBe('Mensuel');
    expect(decodePeriode('T')).toBe('Trimestriel');
    expect(decodePeriode('S')).toBe('Semestriel');
  });

  it('renvoie le code brut si inconnu', () => {
    expect(decodePeriode('X')).toBe('X');
  });

  it('renvoie "—" si absent', () => {
    expect(decodePeriode(null)).toBe('—');
    expect(decodePeriode(undefined)).toBe('—');
    expect(decodePeriode('')).toBe('—');
  });
});

describe('computeCrd5Ans', () => {
  const emprunt = { nEmprunt: '100', montant: 10000 };

  it("cumule le capital remboursé et les intérêts réglés jusqu'à la date incluse", () => {
    const lignes = [
      { nEmprunt: '100', dateReelle: new Date(2024, 0, 1), mtCapitalReel: 1000, mtInteretReel: 100 },
      { nEmprunt: '100', dateReelle: new Date(2025, 0, 1), mtCapitalReel: 1100, mtInteretReel: 90 },
      { nEmprunt: '100', dateReelle: new Date(2026, 0, 1), mtCapitalReel: 1200, mtInteretReel: 80 },
    ];
    const [result] = computeCrd5Ans([emprunt], lignes, new Date(2025, 0, 1));
    expect(result.capitalRembourseCumule).toBe(2100); // lignes 2024 + 2025, borne incluse
    expect(result.interetsReglesCumule).toBe(190);
    expect(result.capitalRestantDu).toBe(10000 - 2100);
  });

  it('utilise le montant Prévisionnel quand le Réel est absent (ligne future)', () => {
    const lignes = [
      { nEmprunt: '100', datePrevue: new Date(2026, 0, 1), mtCapitalPrev: 1200, mtInteretPrev: 80 },
    ];
    const [result] = computeCrd5Ans([emprunt], lignes, new Date(2025, 0, 1));
    expect(result.capitalMoins1An).toBe(1200);
  });

  it('place une échéance exactement à dateFin + 1 an dans la tranche "< 1 an" (borne incluse)', () => {
    const dateFin = new Date(2025, 0, 1);
    const lignes = [
      { nEmprunt: '100', datePrevue: new Date(2026, 0, 1), mtCapitalPrev: 500 },
    ];
    const [result] = computeCrd5Ans([emprunt], lignes, dateFin);
    expect(result.capitalMoins1An).toBe(500);
    expect(result.capitalEntre1Et5Ans).toBe(0);
  });

  it('place une échéance juste après dateFin + 1 an dans la tranche "1 à 5 ans"', () => {
    const dateFin = new Date(2025, 0, 1);
    const lignes = [
      { nEmprunt: '100', datePrevue: new Date(2026, 0, 2), mtCapitalPrev: 500 },
    ];
    const [result] = computeCrd5Ans([emprunt], lignes, dateFin);
    expect(result.capitalMoins1An).toBe(0);
    expect(result.capitalEntre1Et5Ans).toBe(500);
  });

  it('place une échéance exactement à dateFin + 5 ans dans la tranche "1 à 5 ans" (borne incluse)', () => {
    const dateFin = new Date(2025, 0, 1);
    const lignes = [
      { nEmprunt: '100', datePrevue: new Date(2030, 0, 1), mtCapitalPrev: 300 },
    ];
    const [result] = computeCrd5Ans([emprunt], lignes, dateFin);
    expect(result.capitalEntre1Et5Ans).toBe(300);
    expect(result.capitalPlusDe5Ans).toBe(0);
  });

  it('place une échéance juste après dateFin + 5 ans dans la tranche "> 5 ans"', () => {
    const dateFin = new Date(2025, 0, 1);
    const lignes = [
      { nEmprunt: '100', datePrevue: new Date(2030, 0, 2), mtCapitalPrev: 300 },
    ];
    const [result] = computeCrd5Ans([emprunt], lignes, dateFin);
    expect(result.capitalEntre1Et5Ans).toBe(0);
    expect(result.capitalPlusDe5Ans).toBe(300);
  });

  it('renvoie des champs calculés à 0 et capitalRestantDu = montant pour un emprunt sans ligne', () => {
    const [result] = computeCrd5Ans([emprunt], [], new Date(2025, 0, 1));
    expect(result.capitalRembourseCumule).toBe(0);
    expect(result.interetsReglesCumule).toBe(0);
    expect(result.capitalRestantDu).toBe(10000);
    expect(result.capitalMoins1An).toBe(0);
    expect(result.capitalEntre1Et5Ans).toBe(0);
    expect(result.capitalPlusDe5Ans).toBe(0);
  });

  it('ne mélange pas les lignes de deux emprunts différents', () => {
    const emprunts = [{ nEmprunt: '100', montant: 10000 }, { nEmprunt: '200', montant: 5000 }];
    const lignes = [
      { nEmprunt: '100', dateReelle: new Date(2024, 0, 1), mtCapitalReel: 1000 },
      { nEmprunt: '200', dateReelle: new Date(2024, 0, 1), mtCapitalReel: 2000 },
    ];
    const [r100, r200] = computeCrd5Ans(emprunts, lignes, new Date(2025, 0, 1));
    expect(r100.capitalRembourseCumule).toBe(1000);
    expect(r200.capitalRembourseCumule).toBe(2000);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/__tests__/empruntsUtils.test.js`
Expected: FAIL — `decodePeriode is not a function` / `computeCrd5Ans is not a function` (import error, neither exists yet).

- [ ] **Step 3: Implement `decodePeriode` and `computeCrd5Ans`**

In `src/engine/empruntsUtils.js`, append after the existing `countEmpruntsEnCours` function (after line 61, before the final blank line):

```js

const PERIODE_LABELS = {
  A: 'Annuel',
  M: 'Mensuel',
  T: 'Trimestriel',
  S: 'Semestriel',
};

/**
 * Décode le code de périodicité d'un emprunt (champ "Annuite" du fichier
 * Export_Multi) en libellé lisible. Renvoie le code brut si inconnu.
 * @param {string|null|undefined} code
 * @returns {string}
 */
export function decodePeriode(code) {
  if (code === null || code === undefined || code === '') return '—';
  return PERIODE_LABELS[code] ?? String(code);
}

function ligneDate(ligne) {
  return ligne.dateReelle ?? ligne.datePrevue ?? null;
}

function ligneCapital(ligne) {
  return Number(ligne.mtCapitalReel ?? ligne.mtCapitalPrev) || 0;
}

function ligneInteret(ligne) {
  return Number(ligne.mtInteretReel ?? ligne.mtInteretPrev) || 0;
}

function addYears(date, years) {
  return new Date(date.getFullYear() + years, date.getMonth(), date.getDate());
}

/**
 * Pour chaque emprunt, calcule à la date de fin de période demandée : le
 * capital remboursé et les intérêts réglés cumulés depuis l'origine, le
 * capital restant dû, et la répartition du capital restant à rembourser
 * par tranche d'échéance (< 1 an / 1 à 5 ans / > 5 ans), en fenêtres
 * glissantes depuis dateFin (bornes incluses).
 * @param {object[]} emprunts
 * @param {object[]} lignesEmprunt
 * @param {Date} dateFin
 * @returns {object[]} les emprunts d'entrée, enrichis des champs calculés
 */
export function computeCrd5Ans(emprunts, lignesEmprunt, dateFin) {
  const dateFin1An = addYears(dateFin, 1);
  const dateFin5Ans = addYears(dateFin, 5);

  return emprunts.map((emprunt) => {
    const lignes = lignesEmprunt.filter((l) => l.nEmprunt === emprunt.nEmprunt);

    let capitalRembourseCumule = 0;
    let interetsReglesCumule = 0;
    let capitalMoins1An = 0;
    let capitalEntre1Et5Ans = 0;
    let capitalPlusDe5Ans = 0;

    for (const ligne of lignes) {
      const date = ligneDate(ligne);
      if (!date) continue;
      const capital = ligneCapital(ligne);
      const interet = ligneInteret(ligne);

      if (date.getTime() <= dateFin.getTime()) {
        capitalRembourseCumule += capital;
        interetsReglesCumule += interet;
      } else if (date.getTime() <= dateFin1An.getTime()) {
        capitalMoins1An += capital;
      } else if (date.getTime() <= dateFin5Ans.getTime()) {
        capitalEntre1Et5Ans += capital;
      } else {
        capitalPlusDe5Ans += capital;
      }
    }

    return {
      ...emprunt,
      capitalRembourseCumule,
      interetsReglesCumule,
      capitalRestantDu: (Number(emprunt.montant) || 0) - capitalRembourseCumule,
      capitalMoins1An,
      capitalEntre1Et5Ans,
      capitalPlusDe5Ans,
    };
  });
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/__tests__/empruntsUtils.test.js`
Expected: PASS (all tests, including the pre-existing `getCapitalRestantDu`/`countEmpruntsEnCours` ones)

- [ ] **Step 5: Commit**

```bash
git add src/engine/empruntsUtils.js src/__tests__/empruntsUtils.test.js
git commit -m "feat: add computeCrd5Ans and decodePeriode calculations"
```

---

### Task 3: `EmpruntsCrd5AnsTable.jsx` component

**Files:**
- Create: `src/components/emprunts/EmpruntsCrd5AnsTable.jsx`

No dedicated unit test for this task — this codebase has no component-level tests for table/tab presentational components (`EmpruntsTable.jsx` has none either); it's verified manually in Task 7. All the logic it depends on is already unit-tested in Task 2.

- [ ] **Step 1: Create the component**

Create `src/components/emprunts/EmpruntsCrd5AnsTable.jsx`:

```jsx
import { SortableTh } from '../shared/SortableTh';
import { formatAmountFull, formatPercent, formatDate } from '../../engine/formatUtils';
import { decodePeriode } from '../../engine/empruntsUtils';

export const CRD_5_ANS_COLUMNS = [
  { key: 'nEmprunt', label: 'N. Emprunt', type: 'text', width: 90 },
  { key: 'ancienCode', label: 'Référence', type: 'text', width: 90 },
  { key: 'designation', label: 'Libellé', type: 'text' },
  { key: 'dateRealisation', label: 'Date Réalisation', type: 'date', width: 120 },
  { key: 'duree', label: 'Durée', type: 'number', width: 60 },
  { key: 'annuite', label: 'Période', type: 'periode', width: 90 },
  { key: 'taux', label: 'Taux', type: 'percent', width: 65 },
  { key: 'montant', label: 'Montant', type: 'amount' },
  { key: 'capitalRembourseCumule', label: 'Capital remboursé', type: 'amount' },
  { key: 'interetsReglesCumule', label: 'Intérêts réglés', type: 'amount' },
  { key: 'capitalRestantDu', label: 'Capital restant dû', type: 'amount' },
  { key: 'capitalMoins1An', label: '< 1 an', type: 'amount' },
  { key: 'capitalEntre1Et5Ans', label: '1 à 5 ans', type: 'amount' },
  { key: 'capitalPlusDe5Ans', label: '> 5 ans', type: 'amount' },
];

function formatCellValue(value, type) {
  if (type === 'periode') return decodePeriode(value);
  if (value === null || value === undefined || value === '') return '—';
  switch (type) {
    case 'amount': return formatAmountFull(value);
    case 'percent': return formatPercent(value);
    case 'date': return formatDate(value);
    default: return String(value);
  }
}

export function EmpruntsCrd5AnsTable({ rows, sort, onSort, onRowClick, selectedRow }) {
  if (!rows || rows.length === 0) {
    return <div style={{ padding: '48px', textAlign: 'center', color: '#A0AEC0' }}>Aucun emprunt ne correspond aux filtres.</div>;
  }

  return (
    <div style={{ overflowX: 'auto', border: '1px solid #E2E8F0', borderRadius: '12px' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1700px', fontSize: '13px' }}>
        <thead>
          <tr>
            {CRD_5_ANS_COLUMNS.map((col) => (
              <SortableTh
                key={col.key}
                label={col.label}
                sortKey={col.key}
                currentSort={sort}
                onSort={onSort}
                align={col.type === 'text' ? 'left' : 'right'}
                width={col.width}
              />
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const isSelected = selectedRow?.nEmprunt === row.nEmprunt;
            return (
              <tr
                key={row.nEmprunt ?? idx}
                onClick={() => onRowClick(row)}
                style={{
                  background: isSelected ? '#E3F2F5' : idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA',
                  cursor: 'pointer',
                  borderBottom: '1px solid #F0F4F8',
                }}
              >
                {CRD_5_ANS_COLUMNS.map((col) => (
                  <td
                    key={col.key}
                    style={{
                      padding: '6px 10px',
                      textAlign: col.type === 'text' ? 'left' : 'right',
                      color: '#2D3748',
                      whiteSpace: 'nowrap',
                      fontVariantNumeric: 'tabular-nums',
                      ...(col.width ? { width: col.width, boxSizing: 'border-box' } : {}),
                    }}
                  >
                    {formatCellValue(row[col.key], col.type)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default EmpruntsCrd5AnsTable;
```

- [ ] **Step 2: Verify the project still builds**

Run: `npx eslint src/components/emprunts/EmpruntsCrd5AnsTable.jsx`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/emprunts/EmpruntsCrd5AnsTable.jsx
git commit -m "feat: add EmpruntsCrd5AnsTable component"
```

---

### Task 4: Wire the "CRD à 5 ans" sub-view into `EmpruntsTab.jsx`

**Files:**
- Modify: `src/components/emprunts/EmpruntsTab.jsx`

- [ ] **Step 1: Update imports**

In `src/components/emprunts/EmpruntsTab.jsx`, replace lines 1-12:

```js
import { useMemo, useState } from 'react';
import useStore from '../../store/useStore';
import useAuthStore from '../../store/useAuthStore';
import { UploadPrompt } from '../shared/UploadPrompt';
import { RangeFilterInput } from '../shared/RangeFilterInput';
import { FilterField } from '../shared/FilterField';
import { MiniStatCard } from '../shared/MiniStatCard';
import { EmpruntsTable } from './EmpruntsTable';
import { EmpruntDetailPanel } from './EmpruntDetailPanel';
import { sortRows, nextSortState, filterByText, filterByRange, distinctValues } from '../../engine/tableUtils';
import { getCapitalRestantDu, countEmpruntsEnCours } from '../../engine/empruntsUtils';
import { formatAmountFull } from '../../engine/formatUtils';
```

with:

```js
import { useMemo, useState } from 'react';
import useStore from '../../store/useStore';
import useAuthStore from '../../store/useAuthStore';
import { UploadPrompt } from '../shared/UploadPrompt';
import { RangeFilterInput } from '../shared/RangeFilterInput';
import { FilterField } from '../shared/FilterField';
import { MiniStatCard } from '../shared/MiniStatCard';
import { EmpruntsTable } from './EmpruntsTable';
import { EmpruntsCrd5AnsTable } from './EmpruntsCrd5AnsTable';
import { EmpruntDetailPanel } from './EmpruntDetailPanel';
import { sortRows, nextSortState, filterByText, filterByRange, distinctValues } from '../../engine/tableUtils';
import { getCapitalRestantDu, countEmpruntsEnCours, computeCrd5Ans } from '../../engine/empruntsUtils';
import { formatAmountFull, parseFrDate } from '../../engine/formatUtils';
```

- [ ] **Step 2: Add date-input helpers**

Still in `EmpruntsTab.jsx`, right after the `SELECT_STYLE` constant block (after the closing `};` that currently precedes `const SITUATION_EN_COURS = 4;`), add these two functions:

```js

function dateToInputValue(date) {
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function inputValueToDate(raw) {
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}
```

So the file now reads (around the existing `SITUATION_EN_COURS` declaration):

```js
const SELECT_STYLE = {
  border: '1px solid #CBD5E0',
  borderRadius: '6px',
  padding: '7px 10px',
  fontSize: '13px',
  color: '#1A202C',
  backgroundColor: '#ffffff',
  cursor: 'pointer',
};

function dateToInputValue(date) {
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function inputValueToDate(raw) {
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

const SITUATION_EN_COURS = 4;
```

- [ ] **Step 3: Add state for the new view**

Replace the state block (originally lines 55-66):

```js
  const [search, setSearch] = useState('');
  const [montantMin, setMontantMin] = useState(null);
  const [montantMax, setMontantMax] = useState(null);
  const [dateRealisationMin, setDateRealisationMin] = useState(null);
  const [dateRealisationMax, setDateRealisationMax] = useState(null);
  const [premiereEcheanceMin, setPremiereEcheanceMin] = useState(null);
  const [premiereEcheanceMax, setPremiereEcheanceMax] = useState(null);
  const [banque, setBanque] = useState('');
  const [categorie, setCategorie] = useState('');
  const [enCoursOnly, setEnCoursOnly] = useState(true);
  const [sort, setSort] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);
```

with:

```js
  const [search, setSearch] = useState('');
  const [montantMin, setMontantMin] = useState(null);
  const [montantMax, setMontantMax] = useState(null);
  const [dateRealisationMin, setDateRealisationMin] = useState(null);
  const [dateRealisationMax, setDateRealisationMax] = useState(null);
  const [premiereEcheanceMin, setPremiereEcheanceMin] = useState(null);
  const [premiereEcheanceMax, setPremiereEcheanceMax] = useState(null);
  const [banque, setBanque] = useState('');
  const [categorie, setCategorie] = useState('');
  const [enCoursOnly, setEnCoursOnly] = useState(true);
  const [sort, setSort] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);

  const [view, setView] = useState('registre'); // 'registre' | 'crd5ans'
  const bilanCRData = useStore((s) => s.bilanCRData);
  const [dateFin, setDateFin] = useState(() => parseFrDate(bilanCRData?.dateFin) ?? new Date());
  const [searchCrd, setSearchCrd] = useState('');
  const [enCoursOnlyCrd, setEnCoursOnlyCrd] = useState(true);
  const [sortCrd, setSortCrd] = useState(null);
```

- [ ] **Step 4: Add the `crd5AnsRows` computation**

Right after the existing `rows` `useMemo` block (originally lines 83-97, ending with `}, [emprunts, enCoursOnly, search, montantMin, montantMax, dateRealisationMin, dateRealisationMax, premiereEcheanceMin, premiereEcheanceMax, banque, categorie, sort]);`), add:

```js

  const crd5AnsRows = useMemo(() => {
    let result = enCoursOnlyCrd ? emprunts.filter((e) => Number(e.situation) === SITUATION_EN_COURS) : emprunts;
    result = computeCrd5Ans(result, lignesEmprunt, dateFin);
    result = filterByText(result, ['nEmprunt', 'designation', 'ancienCode'], searchCrd);
    if (sortCrd) result = sortRows(result, sortCrd.key, sortCrd.direction);
    return result;
  }, [emprunts, lignesEmprunt, dateFin, enCoursOnlyCrd, searchCrd, sortCrd]);
```

- [ ] **Step 5: Add the view toggle and the new view's UI**

Replace this block (originally lines 133-183):

```jsx
      <div style={{ marginBottom: '12px' }}>
        <ToggleButton active={enCoursOnly} onClick={() => setEnCoursOnly((v) => !v)}>
          Emprunts en cours uniquement
        </ToggleButton>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: '10px',
        marginBottom: '16px',
      }}>
        <FilterField label="Recherche">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="N. Emprunt ou désignation…"
            style={{ ...SELECT_STYLE, width: '100%', boxSizing: 'border-box', cursor: 'text' }}
          />
        </FilterField>
        <FilterField label="Montant">
          <RangeFilterInput type="number" minValue={montantMin} maxValue={montantMax} onChange={(min, max) => { setMontantMin(min); setMontantMax(max); }} minPlaceholder="Min" maxPlaceholder="Max" />
        </FilterField>
        <FilterField label="Date de réalisation">
          <RangeFilterInput type="date" minValue={dateRealisationMin} maxValue={dateRealisationMax} onChange={(min, max) => { setDateRealisationMin(min); setDateRealisationMax(max); }} minPlaceholder="Min" maxPlaceholder="Max" />
        </FilterField>
        <FilterField label="1ère échéance">
          <RangeFilterInput type="date" minValue={premiereEcheanceMin} maxValue={premiereEcheanceMax} onChange={(min, max) => { setPremiereEcheanceMin(min); setPremiereEcheanceMax(max); }} minPlaceholder="Min" maxPlaceholder="Max" />
        </FilterField>
        <FilterField label="Banque">
          <select value={banque} onChange={(e) => setBanque(e.target.value)} style={{ ...SELECT_STYLE, width: '100%', boxSizing: 'border-box' }}>
            <option value="">Toutes les banques</option>
            {banques.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </FilterField>
        <FilterField label="Catégorie">
          <select value={categorie} onChange={(e) => setCategorie(e.target.value)} style={{ ...SELECT_STYLE, width: '100%', boxSizing: 'border-box' }}>
            <option value="">Toutes les catégories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </FilterField>
      </div>

      <EmpruntsTable
        rows={rows}
        sort={sort}
        onSort={(key) => setSort(nextSortState(sort, key))}
        onRowClick={(row) => setSelectedRow(selectedRow?.nEmprunt === row.nEmprunt ? null : row)}
        selectedRow={selectedRow}
      />

      <EmpruntDetailPanel
        emprunt={selectedRow}
        lignesEmprunt={lignesEmprunt}
        onClose={() => setSelectedRow(null)}
      />
```

with:

```jsx
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <ToggleButton active={view === 'registre'} onClick={() => setView('registre')}>
          Registre
        </ToggleButton>
        <ToggleButton active={view === 'crd5ans'} onClick={() => setView('crd5ans')}>
          CRD à 5 ans
        </ToggleButton>
      </div>

      {view === 'registre' && (
        <>
          <div style={{ marginBottom: '12px' }}>
            <ToggleButton active={enCoursOnly} onClick={() => setEnCoursOnly((v) => !v)}>
              Emprunts en cours uniquement
            </ToggleButton>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '10px',
            marginBottom: '16px',
          }}>
            <FilterField label="Recherche">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="N. Emprunt ou désignation…"
                style={{ ...SELECT_STYLE, width: '100%', boxSizing: 'border-box', cursor: 'text' }}
              />
            </FilterField>
            <FilterField label="Montant">
              <RangeFilterInput type="number" minValue={montantMin} maxValue={montantMax} onChange={(min, max) => { setMontantMin(min); setMontantMax(max); }} minPlaceholder="Min" maxPlaceholder="Max" />
            </FilterField>
            <FilterField label="Date de réalisation">
              <RangeFilterInput type="date" minValue={dateRealisationMin} maxValue={dateRealisationMax} onChange={(min, max) => { setDateRealisationMin(min); setDateRealisationMax(max); }} minPlaceholder="Min" maxPlaceholder="Max" />
            </FilterField>
            <FilterField label="1ère échéance">
              <RangeFilterInput type="date" minValue={premiereEcheanceMin} maxValue={premiereEcheanceMax} onChange={(min, max) => { setPremiereEcheanceMin(min); setPremiereEcheanceMax(max); }} minPlaceholder="Min" maxPlaceholder="Max" />
            </FilterField>
            <FilterField label="Banque">
              <select value={banque} onChange={(e) => setBanque(e.target.value)} style={{ ...SELECT_STYLE, width: '100%', boxSizing: 'border-box' }}>
                <option value="">Toutes les banques</option>
                {banques.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </FilterField>
            <FilterField label="Catégorie">
              <select value={categorie} onChange={(e) => setCategorie(e.target.value)} style={{ ...SELECT_STYLE, width: '100%', boxSizing: 'border-box' }}>
                <option value="">Toutes les catégories</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </FilterField>
          </div>

          <EmpruntsTable
            rows={rows}
            sort={sort}
            onSort={(key) => setSort(nextSortState(sort, key))}
            onRowClick={(row) => setSelectedRow(selectedRow?.nEmprunt === row.nEmprunt ? null : row)}
            selectedRow={selectedRow}
          />
        </>
      )}

      {view === 'crd5ans' && (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '10px',
            marginBottom: '12px',
          }}>
            <FilterField label="À la date du">
              <input
                type="date"
                value={dateToInputValue(dateFin)}
                onChange={(e) => setDateFin(inputValueToDate(e.target.value) ?? dateFin)}
                style={{ ...SELECT_STYLE, width: '100%', boxSizing: 'border-box' }}
              />
            </FilterField>
            <FilterField label="Recherche">
              <input
                type="text"
                value={searchCrd}
                onChange={(e) => setSearchCrd(e.target.value)}
                placeholder="N. Emprunt, référence ou libellé…"
                style={{ ...SELECT_STYLE, width: '100%', boxSizing: 'border-box', cursor: 'text' }}
              />
            </FilterField>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <ToggleButton active={enCoursOnlyCrd} onClick={() => setEnCoursOnlyCrd((v) => !v)}>
              Emprunts en cours uniquement
            </ToggleButton>
          </div>

          <EmpruntsCrd5AnsTable
            rows={crd5AnsRows}
            sort={sortCrd}
            onSort={(key) => setSortCrd(nextSortState(sortCrd, key))}
            onRowClick={(row) => setSelectedRow(selectedRow?.nEmprunt === row.nEmprunt ? null : row)}
            selectedRow={selectedRow}
          />
        </>
      )}

      <EmpruntDetailPanel
        emprunt={selectedRow}
        lignesEmprunt={lignesEmprunt}
        onClose={() => setSelectedRow(null)}
      />
```

- [ ] **Step 6: Lint check**

Run: `npx eslint src/components/emprunts/EmpruntsTab.jsx`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/emprunts/EmpruntsTab.jsx
git commit -m "feat: add CRD à 5 ans sub-view to EmpruntsTab"
```

---

### Task 5: PDF export — `generatePdf.js`

**Files:**
- Modify: `src/engine/generatePdf.js`

- [ ] **Step 1: Add the new document label**

In `src/engine/generatePdf.js`, in the `DOC_LABELS` object (line 27), change:

```js
  emprunts:          'Emprunts',
  materiels:         'Matériels',
```

to:

```js
  emprunts:          'Emprunts',
  emprunts_crd5ans:  'Emprunts — CRD à 5 ans',
  materiels:         'Matériels',
```

- [ ] **Step 2: Update imports**

Change line 14 and line 17 from:

```js
import { formatDate } from './formatUtils';
import { sortRows, groupRows, sumColumn, yearOf } from './tableUtils';
import { aggregateTreasuryByGranularity } from './computeTreasury';
import { getCapitalRestantDu, countEmpruntsEnCours } from './empruntsUtils';
```

to:

```js
import { formatDate, parseFrDate } from './formatUtils';
import { sortRows, groupRows, sumColumn, yearOf } from './tableUtils';
import { aggregateTreasuryByGranularity } from './computeTreasury';
import { getCapitalRestantDu, countEmpruntsEnCours, computeCrd5Ans, decodePeriode } from './empruntsUtils';
```

- [ ] **Step 3: Add the columns and content-builder function**

In `src/engine/generatePdf.js`, right after the existing `buildEmpruntsContent` function closes (after the line `}` that follows the `return [...]` block — currently right before the `// Matériels → contenu pdfmake` comment), insert:

```js

// ─────────────────────────────────────────────────────────────
// Emprunts — CRD à 5 ans → contenu pdfmake (en cours uniquement)
// ─────────────────────────────────────────────────────────────
const EMPRUNTS_CRD5ANS_PDF_COLUMNS = [
  { key: 'nEmprunt',               label: 'N. Emprunt',       type: 'text',    width: 48 },
  { key: 'ancienCode',             label: 'Référence',        type: 'text',    width: 48 },
  { key: 'designation',            label: 'Libellé',          type: 'text',    width: '*' },
  { key: 'dateRealisation',        label: 'Date Réalisation', type: 'date',    width: 58 },
  { key: 'duree',                  label: 'Durée',            type: 'number',  width: 34 },
  { key: 'periode',                label: 'Période',          type: 'text',    width: 48 },
  { key: 'taux',                   label: 'Taux',             type: 'percent', width: 36 },
  { key: 'montant',                label: 'Montant',          type: 'amount',  width: 55 },
  { key: 'capitalRembourseCumule', label: 'Capital remb.',    type: 'amount',  width: 55 },
  { key: 'interetsReglesCumule',   label: 'Intérêts réglés',  type: 'amount',  width: 55 },
  { key: 'capitalRestantDu',       label: 'CRD',              type: 'amount',  width: 55 },
  { key: 'capitalMoins1An',        label: '< 1 an',           type: 'amount',  width: 48 },
  { key: 'capitalEntre1Et5Ans',    label: '1 à 5 ans',        type: 'amount',  width: 48 },
  { key: 'capitalPlusDe5Ans',      label: '> 5 ans',          type: 'amount',  width: 48 },
];

function buildEmpruntsCrd5AnsContent(exploitationData, bilanCRData, chartW = 781) {
  const emprunts = exploitationData?.emprunts ?? [];
  const lignesEmprunt = exploitationData?.lignesEmprunt ?? [];
  if (!emprunts.length) return [];
  const SITUATION_EN_COURS = 4;

  const dateFin = parseFrDate(bilanCRData?.dateFin) ?? new Date();
  const enCours = emprunts.filter((e) => Number(e.situation) === SITUATION_EN_COURS);
  const calculees = computeCrd5Ans(enCours, lignesEmprunt, dateFin)
    .map((row) => ({ ...row, periode: decodePeriode(row.annuite) }));
  const sorted = sortRows(calculees, 'nEmprunt', 'asc');
  const totalCrd = sumColumn(sorted, 'capitalRestantDu');

  const headerRow = EMPRUNTS_CRD5ANS_PDF_COLUMNS.map(col => ({
    text: col.label, style: 'tableHeader', fillColor: '#F7FAFC',
    alignment: col.type === 'text' ? 'left' : 'right',
  }));
  const tableBody = [headerRow, ...sorted.map(row => EMPRUNTS_CRD5ANS_PDF_COLUMNS.map(col => ({
    text: fmtFicheCell(row[col.key], col.type), fontSize: 7,
    alignment: col.type === 'text' ? 'left' : 'right',
  })))];

  return [
    makeSectionTitle(DOC_LABELS.emprunts_crd5ans, 'emprunts_crd5ans'),
    makeWidgetsRow([
      { label: `Capital restant dû au ${formatDate(dateFin)}`, value: fmtEur(totalCrd), color: COLORS.orange },
      { label: 'Emprunts en cours', value: String(sorted.length) },
    ]),
    {
      table: { headerRows: 1, widths: fitTableWidths(EMPRUNTS_CRD5ANS_PDF_COLUMNS, chartW), body: tableBody },
      layout: tableLayout(),
    },
    { text: ' ', pageBreak: 'after' },
  ];
}
```

- [ ] **Step 4: Register the builder**

In the `BUILDERS` map (around line 2581), change:

```js
    emprunts:          () => buildEmpruntsContent(storeData.exploitationData, chartW),
    materiels:         () => buildMaterielsContent(storeData.exploitationData, storeData.docOptions?.materiels, chartW),
```

to:

```js
    emprunts:          () => buildEmpruntsContent(storeData.exploitationData, chartW),
    emprunts_crd5ans:  () => buildEmpruntsCrd5AnsContent(storeData.exploitationData, storeData.bilanCRData, chartW),
    materiels:         () => buildMaterielsContent(storeData.exploitationData, storeData.docOptions?.materiels, chartW),
```

- [ ] **Step 5: Lint check**

Run: `npx eslint src/engine/generatePdf.js`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/engine/generatePdf.js
git commit -m "feat: add Emprunts CRD à 5 ans PDF export document"
```

---

### Task 6: Register the document in `ExportTab.jsx`

**Files:**
- Modify: `src/components/export/ExportTab.jsx`

- [ ] **Step 1: Add the document entry**

In `src/components/export/ExportTab.jsx`, in the `ALL_DOCS` array, change:

```js
  { id: 'emprunts',          requiresExploitation: true },
  { id: 'immobilisations',   requiresExploitation: true },
```

to:

```js
  { id: 'emprunts',          requiresExploitation: true },
  { id: 'emprunts_crd5ans',  requiresExploitation: true },
  { id: 'immobilisations',   requiresExploitation: true },
```

Note: deliberately **not** added to `DEFAULT_SELECTED` — it stays available but unchecked by default in the export picker, since it's an additional view of data already covered by the `emprunts` document. The user can select it manually.

- [ ] **Step 2: Lint check**

Run: `npx eslint src/components/export/ExportTab.jsx`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/export/ExportTab.jsx
git commit -m "feat: register Emprunts CRD à 5 ans in the PDF export picker"
```

---

### Task 7: Manual verification

**Files:** none (manual check only)

- [ ] **Step 1: Run the full test suite**

Run: `npx vitest run`
Expected: all test files pass, including `formatUtils.test.js` and `empruntsUtils.test.js`.

- [ ] **Step 2: Start the dev server**

Run: `npm run dev`
Open the printed local URL in a browser.

- [ ] **Step 3: Load demo data**

On the "Accueil" screen (or directly on the "Emprunts" tab / "Bilan & CR" tab), use the demo-data buttons to load the full demo dataset (this loads both `demo_export_multi.xlsx` and `demo_bilanCR.xlsx`, among others).

- [ ] **Step 4: Verify the Registre view is unchanged**

Go to the "Emprunts" section. Confirm it opens on the "Registre" sub-tab by default, with the existing table, filters, and stat cards behaving exactly as before.

- [ ] **Step 5: Verify the CRD à 5 ans view**

Click the "CRD à 5 ans" button. Confirm:
- The "À la date du" field is pre-filled with the exercice N closing date from the demo Bilan & CR data (`31/12/2025` per the demo file).
- The table shows one row per emprunt with all 14 columns from the spec, correctly formatted (amounts, percent, dates).
- Changing the date updates the cumulative/CRD/bucket columns.
- The search field filters by N° Emprunt / Référence / Libellé.
- "Emprunts en cours uniquement" toggle filters the rows.
- Clicking a column header sorts the table (3-state cycle: asc / desc / none).
- Clicking a row opens the `EmpruntDetailPanel` slide-over with that emprunt's full échéancier.

- [ ] **Step 6: Verify the PDF export**

Go to "Export PDF". Confirm "Emprunts — CRD à 5 ans" appears in the document list (unchecked by default), select it, generate the PDF (either mode), and confirm the generated document contains a table matching the on-screen "CRD à 5 ans" view for the en-cours emprunts.

- [ ] **Step 7: Final check — no regressions**

Run: `npx eslint .`
Expected: no new errors introduced by this feature (pre-existing warnings, if any, are unrelated to this change).
