# Module Contrôles — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new "Contrôles" module to Clario Vision that shows green/red status cards comparing two related figures (capital social, emprunts, équilibre comptable), grouped by business category, inserted between "Analyseur FEC" and "Tableaux de bord" in the nav and on the home page.

**Architecture:** A pure calculation function (`computeControles`) reads the existing `parsedFec`/`exploitationData` Zustand state and returns a flat list of control results (status `ok`/`ko`/`neutral` + the two compared values). A container component (`ControlesTab`) groups those results by category and renders one presentational card (`ControleCard`) per control. No new store state, no new persistence — same pattern as `LivresTab`/`computeBalance`.

**Tech Stack:** React 19, Zustand 5, Vitest 4 (tests), no new dependencies.

**Reference spec:** [`docs/superpowers/specs/2026-06-25-module-controles-design.md`](../specs/2026-06-25-module-controles-design.md)

All file paths below are relative to the `financiel-vision/` directory (the actual app root — the repo root one level up has no package.json).

---

### Task 1: Calcul des contrôles — `engine/computeControles.js`

**Files:**
- Create: `src/engine/computeControles.js`
- Test: `src/__tests__/computeControles.test.js`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/computeControles.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { computeControles } from '../engine/computeControles';

function fec(entries) {
  return { entries };
}

describe('computeControles — pas de FEC', () => {
  it('renvoie un tableau vide si parsedFec est absent', () => {
    expect(computeControles(null, null)).toEqual([]);
  });
});

describe('computeControles — Capital social', () => {
  it('statut ok quand les deux comptes sont égaux', () => {
    const parsedFec = fec([
      { compteNum: '10121000', compteLib: 'Capital souscrit appelé', journalCode: 'OD', debit: 0, credit: 250000 },
      { compteNum: '45620000', compteLib: 'Associés - apports', journalCode: 'OD', debit: 250000, credit: 0 },
    ]);
    const [capitalSocial] = computeControles(parsedFec, null);
    expect(capitalSocial.status).toBe('ok');
    expect(capitalSocial.valueA).toBe(250000);
    expect(capitalSocial.valueB).toBe(250000);
    expect(capitalSocial.ecart).toBe(0);
  });

  it('statut ko avec écart au-delà de la tolérance', () => {
    const parsedFec = fec([
      { compteNum: '10121000', compteLib: 'Capital souscrit appelé', journalCode: 'OD', debit: 0, credit: 250000 },
      { compteNum: '45620000', compteLib: 'Associés - apports', journalCode: 'OD', debit: 235000, credit: 0 },
    ]);
    const [capitalSocial] = computeControles(parsedFec, null);
    expect(capitalSocial.status).toBe('ko');
    expect(capitalSocial.ecart).toBe(15000);
  });

  it('statut neutral quand les deux comptes sont absents du FEC', () => {
    const parsedFec = fec([
      { compteNum: '512000', compteLib: 'Banque', journalCode: 'OD', debit: 1000, credit: 0 },
    ]);
    const [capitalSocial] = computeControles(parsedFec, null);
    expect(capitalSocial.status).toBe('neutral');
    expect(capitalSocial.valueA).toBe(0);
    expect(capitalSocial.valueB).toBe(0);
    expect(typeof capitalSocial.neutralMessage).toBe('string');
  });
});

describe('computeControles — Emprunts', () => {
  const entries164 = [
    { compteNum: '16410000', compteLib: 'Emprunts auprès des établissements de crédit', journalCode: 'OD', debit: 0, credit: 5000 },
  ];
  const exploitationData = {
    emprunts: [{ nEmprunt: '001', situation: 4 }],
    lignesEmprunt: [{ nEmprunt: '001', exercice: '2024', nLigne: 1, mtRestantDuReel: 5000 }],
  };

  it('statut ok quand le widget Emprunts et les comptes 164 concordent', () => {
    const parsedFec = fec(entries164);
    const [, emprunts] = computeControles(parsedFec, exploitationData);
    expect(emprunts.status).toBe('ok');
    expect(emprunts.valueA).toBe(5000);
    expect(emprunts.valueB).toBe(5000);
  });

  it('statut ko quand le widget Emprunts et les comptes 164 diffèrent', () => {
    const parsedFec = fec([
      { compteNum: '16410000', compteLib: 'Emprunts', journalCode: 'OD', debit: 0, credit: 4000 },
    ]);
    const [, emprunts] = computeControles(parsedFec, exploitationData);
    expect(emprunts.status).toBe('ko');
    expect(emprunts.ecart).toBe(1000);
  });

  it("statut neutral quand l'Export Multi n'est pas chargé", () => {
    const parsedFec = fec(entries164);
    const [, emprunts] = computeControles(parsedFec, null);
    expect(emprunts.status).toBe('neutral');
  });

  it('statut neutral (message différent) quand ni le widget ni les comptes 164 ne portent de montant', () => {
    const parsedFec = fec([
      { compteNum: '512000', compteLib: 'Banque', journalCode: 'OD', debit: 1000, credit: 0 },
    ]);
    const exploitationDataVide = { emprunts: [], lignesEmprunt: [] };
    const [, sansExport] = computeControles(parsedFec, null);
    const [, sansDonnees] = computeControles(parsedFec, exploitationDataVide);
    expect(sansExport.status).toBe('neutral');
    expect(sansDonnees.status).toBe('neutral');
    expect(sansDonnees.neutralMessage).not.toBe(sansExport.neutralMessage);
  });
});

describe('computeControles — Comptable', () => {
  it('statut ok quand le total des débits égale le total des crédits', () => {
    const parsedFec = fec([
      { compteNum: '10121000', compteLib: 'Capital', journalCode: 'OD', debit: 0, credit: 250000 },
      { compteNum: '45620000', compteLib: 'Associés', journalCode: 'OD', debit: 250000, credit: 0 },
    ]);
    const [, , comptable] = computeControles(parsedFec, null);
    expect(comptable.status).toBe('ok');
    expect(comptable.valueA).toBe(250000);
    expect(comptable.valueB).toBe(250000);
  });

  it('statut ok dans la tolérance de 0,01 €', () => {
    const parsedFec = fec([
      { compteNum: '601000', compteLib: 'Achats', journalCode: 'OD', debit: 1000.005, credit: 0 },
      { compteNum: '512000', compteLib: 'Banque', journalCode: 'OD', debit: 0, credit: 1000 },
    ]);
    const [, , comptable] = computeControles(parsedFec, null);
    expect(comptable.status).toBe('ok');
  });

  it('statut ko au-delà de la tolérance', () => {
    const parsedFec = fec([
      { compteNum: '601000', compteLib: 'Achats', journalCode: 'OD', debit: 1000, credit: 0 },
      { compteNum: '512000', compteLib: 'Banque', journalCode: 'OD', debit: 0, credit: 900 },
    ]);
    const [, , comptable] = computeControles(parsedFec, null);
    expect(comptable.status).toBe('ko');
    expect(comptable.ecart).toBe(100);
  });

  it('statut neutral quand le FEC ne contient aucune écriture', () => {
    const parsedFec = fec([]);
    const [, , comptable] = computeControles(parsedFec, null);
    expect(comptable.status).toBe('neutral');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run (from `financiel-vision/`):
```bash
npx vitest run src/__tests__/computeControles.test.js
```
Expected: FAIL — `Failed to resolve import "../engine/computeControles"` (file doesn't exist yet).

- [ ] **Step 3: Write the implementation**

Create `src/engine/computeControles.js`:

```js
/**
 * computeControles.js — contrôles de cohérence entre modules et comptes comptables.
 * Fonctions pures, aucune dépendance React.
 */
import { computeBalance } from './computeLivres';
import { getCapitalRestantDu } from './empruntsUtils';

const TOLERANCE_ECART = 0.01; // € — arrondi flottant, pas un vrai écart
const MESSAGE_NEUTRAL_AUCUNE_DONNEE = 'Aucune écriture trouvée sur les comptes concernés par ce contrôle.';

function sommeComptesRacine(balanceRows, prefix) {
  return balanceRows
    .filter((r) => r.rowType === 'compte' && r.compteNum.startsWith(prefix))
    .reduce((sum, r) => sum + (r.solde_credit - r.solde_debit), 0);
}

const CONTROLES_DEFINITIONS = [
  {
    id: 'capitalSocial_apports',
    categoryId: 'capitalSocial', categoryLabel: 'Capital social', categoryIcon: '🪙',
    label: 'Capital social = Apports adhérents',
    valueALabel: 'Cpt 10121000 (solde créditeur)',
    valueBLabel: 'Cpt 45620000 (solde débiteur)',
    compute: ({ balanceParCompte }) => ({
      valueA: balanceParCompte.get('10121000')?.solde_credit ?? 0,
      valueB: balanceParCompte.get('45620000')?.solde_debit ?? 0,
    }),
  },
  {
    id: 'emprunts_capitalRestantDu',
    categoryId: 'emprunts', categoryLabel: 'Emprunts', categoryIcon: '🏦',
    label: 'Capital restant dû = Soldes cptes 164',
    valueALabel: 'Widget Emprunts',
    valueBLabel: 'Cptes racine 164',
    requiresExportMulti: true,
    neutralMessage: "Chargez l'Export Multi (onglet Emprunts) pour activer ce contrôle",
    compute: ({ balanceRows, exploitationData }) => ({
      valueA: getCapitalRestantDu(exploitationData.emprunts, exploitationData.lignesEmprunt),
      valueB: sommeComptesRacine(balanceRows, '164'),
    }),
  },
  {
    id: 'comptable_equilibreBalance',
    categoryId: 'comptable', categoryLabel: 'Comptable', categoryIcon: '📐',
    label: 'Total débits balance = Total crédits',
    valueALabel: 'Total mvt débit',
    valueBLabel: 'Total mvt crédit',
    compute: ({ balanceRows }) => ({
      valueA: balanceRows.filter((r) => r.rowType === 'compte').reduce((s, r) => s + r.mvt_debit, 0),
      valueB: balanceRows.filter((r) => r.rowType === 'compte').reduce((s, r) => s + r.mvt_credit, 0),
    }),
  },
];

/**
 * @param {object|null} parsedFec
 * @param {object|null} exploitationData
 * @returns {Array<object>} liste des contrôles calculés (vide si pas de FEC)
 */
export function computeControles(parsedFec, exploitationData) {
  if (!parsedFec) return [];

  const balanceRows = computeBalance(parsedFec);
  const balanceParCompte = new Map(
    balanceRows.filter((r) => r.rowType === 'compte').map((r) => [r.compteNum, r])
  );

  return CONTROLES_DEFINITIONS.map((def) => {
    if (def.requiresExportMulti && !exploitationData) {
      return { ...def, status: 'neutral' };
    }

    const { valueA, valueB } = def.compute({ balanceRows, balanceParCompte, exploitationData });

    // Comptes attendus totalement absents du FEC (aucune écriture des deux côtés) :
    // un 0 == 0 ne veut rien dire ici, on le distingue d'un vrai équilibre constaté.
    if (valueA === 0 && valueB === 0) {
      return { ...def, valueA, valueB, ecart: 0, status: 'neutral', neutralMessage: MESSAGE_NEUTRAL_AUCUNE_DONNEE };
    }

    const ecart = Math.abs(valueA - valueB);
    return { ...def, valueA, valueB, ecart, status: ecart <= TOLERANCE_ECART ? 'ok' : 'ko' };
  });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:
```bash
npx vitest run src/__tests__/computeControles.test.js
```
Expected: PASS — 12 tests passing (1 in "pas de FEC" + 3 in "Capital social" + 4 in "Emprunts" + 4 in "Comptable"), all green.

- [ ] **Step 5: Commit**

```bash
git add src/engine/computeControles.js src/__tests__/computeControles.test.js
git commit -m "feat: ajoute le calcul des contrôles de cohérence (capital social, emprunts, comptable)"
```

---

### Task 2: Carte de contrôle — `components/controles/ControleCard.jsx`

Presentational component, no logic. Not covered by an automated test, consistent with the rest of the app (no tests on `*Tab.jsx`/presentational components — only the pure `compute*` functions are tested). It will be exercised visually in Task 5.

**Files:**
- Create: `src/components/controles/ControleCard.jsx`

- [ ] **Step 1: Create the component**

Create `src/components/controles/ControleCard.jsx`:

```jsx
import { formatAmountFull } from '../../engine/formatUtils';

const STATUS_COLORS = {
  ok: '#31B700',
  ko: '#E53935',
  neutral: '#CBD5E0',
};

function Toggle({ status }) {
  return (
    <div style={{
      width: '32px', height: '17px',
      background: STATUS_COLORS[status],
      borderRadius: '10px',
      position: 'relative',
      flexShrink: 0,
    }}>
      {status !== 'neutral' && (
        <div style={{
          width: '13px', height: '13px',
          background: '#fff',
          borderRadius: '50%',
          position: 'absolute',
          top: '2px',
          [status === 'ok' ? 'right' : 'left']: '2px',
        }} />
      )}
    </div>
  );
}

/**
 * ControleCard — carte de contrôle de cohérence (capital social, emprunts, comptable…).
 * Props :
 *   label          (string) — intitulé du contrôle
 *   valueALabel / valueA — premier terme comparé
 *   valueBLabel / valueB — second terme comparé
 *   ecart          (number) — |valueA - valueB|, affiché uniquement si status === 'ko'
 *   status         ('ok' | 'ko' | 'neutral')
 *   neutralMessage (string) — message d'invite affiché si status === 'neutral'
 */
export function ControleCard({ label, valueALabel, valueA, valueBLabel, valueB, ecart, status, neutralMessage }) {
  const isNeutral = status === 'neutral';

  return (
    <div style={{
      background: isNeutral ? '#F8FAFB' : '#FFFFFF',
      border: isNeutral ? '1px dashed #CBD5E0' : '1px solid #E2E8F0',
      borderRadius: '12px',
      padding: '14px 16px',
      boxShadow: isNeutral ? 'none' : '0 1px 4px rgba(0,0,0,0.06)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: isNeutral ? '#A0AEC0' : '#1A202C' }}>
          {label}
        </div>
        <Toggle status={status} />
      </div>

      {isNeutral ? (
        <div style={{ fontSize: '12px', color: '#A0AEC0' }}>
          ⏳ {neutralMessage}
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '10px', color: '#718096' }}>{valueALabel}</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#1A202C' }}>{formatAmountFull(valueA)}</div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '10px', color: '#718096' }}>{valueBLabel}</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#1A202C' }}>{formatAmountFull(valueB)}</div>
            </div>
          </div>
          {status === 'ko' && (
            <div style={{ marginTop: '8px', fontSize: '11px', fontWeight: 600, color: '#E53935' }}>
              Écart : {formatAmountFull(ecart)}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default ControleCard;
```

- [ ] **Step 2: Commit**

```bash
git add src/components/controles/ControleCard.jsx
git commit -m "feat: ajoute le composant carte ControleCard"
```

---

### Task 3: Conteneur de page — `components/controles/ControlesTab.jsx`

**Files:**
- Create: `src/components/controles/ControlesTab.jsx`

- [ ] **Step 1: Create the component**

Create `src/components/controles/ControlesTab.jsx`:

```jsx
import { useMemo } from 'react';
import useStore from '../../store/useStore';
import { computeControles } from '../../engine/computeControles';
import { ControleCard } from './ControleCard';

export function ControlesTab() {
  const parsedFec = useStore((s) => s.parsedFec);
  const exploitationData = useStore((s) => s.exploitationData);
  const setActiveSection = useStore((s) => s.setActiveSection);

  const controles = useMemo(
    () => computeControles(parsedFec, exploitationData),
    [parsedFec, exploitationData]
  );

  if (!parsedFec) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '380px' }}>
        <div style={{ textAlign: 'center', maxWidth: '320px' }}>
          <div style={{ fontSize: '32px', marginBottom: '10px' }}>🚦</div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#1A202C', marginBottom: '6px' }}>
            Aucun FEC chargé
          </div>
          <div style={{ fontSize: '13px', color: '#718096', marginBottom: '16px' }}>
            Chargez un fichier FEC dans l'Analyseur pour activer les contrôles de cohérence.
          </div>
          <button
            onClick={() => setActiveSection('analyseur')}
            style={{
              padding: '10px 20px', fontSize: '14px', fontWeight: 600,
              color: '#FFFFFF', background: '#FF8200',
              border: 'none', borderRadius: '8px', cursor: 'pointer',
            }}
          >
            Aller à l'Analyseur FEC
          </button>
        </div>
      </div>
    );
  }

  // Regroupement par catégorie, en conservant l'ordre de première apparition
  // dans CONTROLES_DEFINITIONS (cf. computeControles.js).
  const categories = [];
  for (const controle of controles) {
    let cat = categories.find((c) => c.id === controle.categoryId);
    if (!cat) {
      cat = { id: controle.categoryId, label: controle.categoryLabel, icon: controle.categoryIcon, controles: [] };
      categories.push(cat);
    }
    cat.controles.push(controle);
  }

  return (
    <div style={{ paddingTop: '16px', paddingBottom: '40px' }}>
      <div style={{ fontSize: '18px', fontWeight: 700, color: '#1A202C', marginBottom: '4px' }}>
        🚦 Contrôles
      </div>
      <div style={{ fontSize: '13px', color: '#718096', marginBottom: '20px' }}>
        Vérifications de cohérence entre modules et comptes comptables.
      </div>

      {categories.map((cat) => (
        <div key={cat.id} style={{ marginBottom: '24px' }}>
          <div style={{
            fontSize: '11px', fontWeight: 700, color: '#718096',
            textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '10px',
          }}>
            {cat.icon} {cat.label}
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '14px',
          }}>
            {cat.controles.map((controle) => (
              <ControleCard
                key={controle.id}
                label={controle.label}
                valueALabel={controle.valueALabel}
                valueA={controle.valueA}
                valueBLabel={controle.valueBLabel}
                valueB={controle.valueB}
                ecart={controle.ecart}
                status={controle.status}
                neutralMessage={controle.neutralMessage}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default ControlesTab;
```

- [ ] **Step 2: Commit**

```bash
git add src/components/controles/ControlesTab.jsx
git commit -m "feat: ajoute le conteneur de page ControlesTab"
```

---

### Task 4: Navigation, permissions et montage dans l'application

Six small, mechanical edits across the files that declare the section list elsewhere in the app. None of these are testable in isolation — they're verified together in Task 5.

**Files:**
- Modify: `src/components/layout/SideNav.jsx`
- Modify: `src/components/accueil/AccueilTab.jsx`
- Modify: `src/components/admin/AdminPanel.jsx`
- Modify: `src/App.jsx`
- Modify: `functions/_lib/validate.js`
- Modify: `src/store/useStore.js`

- [ ] **Step 1: Add the section to the side nav**

In `src/components/layout/SideNav.jsx`, find:
```js
  { id: 'analyseur',  icon: '🔎', label: 'Analyseur FEC' },
  { id: 'dashboard',  icon: '📊', label: 'Tableaux de bord' },
```
Replace with:
```js
  { id: 'analyseur',  icon: '🔎', label: 'Analyseur FEC' },
  { id: 'controles',  icon: '🚦', label: 'Contrôles' },
  { id: 'dashboard',  icon: '📊', label: 'Tableaux de bord' },
```

- [ ] **Step 2: Add the module card on the home page**

In `src/components/accueil/AccueilTab.jsx`, find:
```js
  {
    id: 'analyseur',
    icon: '🔎',
    label: 'Analyseur FEC',
    color: '#31B700',
    bg: '#E8F5E0',
    description: 'Chargez votre fichier FEC (.csv) — les calculs sont instantanés et 100% locaux.',
  },
  {
    id: 'dashboard',
```
Replace with:
```js
  {
    id: 'analyseur',
    icon: '🔎',
    label: 'Analyseur FEC',
    color: '#31B700',
    bg: '#E8F5E0',
    description: 'Chargez votre fichier FEC (.csv) — les calculs sont instantanés et 100% locaux.',
  },
  {
    id: 'controles',
    icon: '🚦',
    label: 'Contrôles',
    color: '#0D9488',
    bg: '#E6FFFA',
    description: 'Vérifiez la cohérence de vos données entre modules et comptes — capital social, emprunts, équilibre comptable…',
  },
  {
    id: 'dashboard',
```

- [ ] **Step 3: Make the section assignable by an admin**

In `src/components/admin/AdminPanel.jsx`, find:
```js
  { id: 'analyseur',  label: 'Analyseur FEC' },
  { id: 'dashboard',  label: 'Tableaux de bord' },
```
Replace with:
```js
  { id: 'analyseur',  label: 'Analyseur FEC' },
  { id: 'controles',  label: 'Contrôles' },
  { id: 'dashboard',  label: 'Tableaux de bord' },
```

- [ ] **Step 4: Render the tab in `App.jsx`**

In `src/App.jsx`, find the import line:
```js
import AnalyseurTab from './components/analyseur/AnalyseurTab';
```
Replace with:
```js
import AnalyseurTab from './components/analyseur/AnalyseurTab';
import ControlesTab from './components/controles/ControlesTab';
```

Then find:
```jsx
                {activeSection === 'analyseur'  && <AnalyseurTab />}

                {activeSection === 'dashboard' && (
```
Replace with:
```jsx
                {activeSection === 'analyseur'  && <AnalyseurTab />}
                {activeSection === 'controles'   && <ControlesTab />}

                {activeSection === 'dashboard' && (
```

- [ ] **Step 5: Whitelist the section server-side**

In `functions/_lib/validate.js`, find:
```js
const VALID_SECTIONS = [
  'analyseur', 'dashboard', 'dossier', 'budget', 'treasury', 'bilanCR', 'bilanParam', 'editions',
  'emprunts', 'immobilisations', 'capitalSocialRegistre', 'materiels', 'ficheSynthese',
  'export', 'diaporama', 'analyse',
];
```
Replace with:
```js
const VALID_SECTIONS = [
  'analyseur', 'controles', 'dashboard', 'dossier', 'budget', 'treasury', 'bilanCR', 'bilanParam', 'editions',
  'emprunts', 'immobilisations', 'capitalSocialRegistre', 'materiels', 'ficheSynthese',
  'export', 'diaporama', 'analyse',
];
```

This array gates which `section` values the backend accepts when an admin sets a user's permissions (`POST /api/admin/users/:id/permissions` or similar) — without this, granting the `controles` permission to a non-admin user would be rejected server-side even though the UI offers it.

- [ ] **Step 6: Update the `activeSection` type comment**

In `src/store/useStore.js`, find:
```js
  activeSection: 'accueil',   // 'accueil' | 'analyseur' | 'dashboard' | 'dossier' | 'editions' | 'export' | 'analyse'
```
Replace with:
```js
  activeSection: 'accueil',   // 'accueil' | 'analyseur' | 'controles' | 'dashboard' | 'dossier' | 'editions' | 'export' | 'analyse'
```

- [ ] **Step 7: Commit**

```bash
git add src/components/layout/SideNav.jsx src/components/accueil/AccueilTab.jsx src/components/admin/AdminPanel.jsx src/App.jsx functions/_lib/validate.js src/store/useStore.js
git commit -m "feat: monte le module Contrôles dans la navigation et les permissions"
```

---

### Task 5: Vérification manuelle dans le navigateur

No automated test covers the wiring end-to-end (no component/E2E test infra in this app). Verify by hand.

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```
Expected: Vite prints a local URL (e.g. `http://localhost:5173`).

- [ ] **Step 2: Check the "no FEC" state**

Open the app, log in, and click **Contrôles** in the left sidebar (between "Analyseur FEC" and "Tableaux de bord") without loading any FEC.
Expected: centered 🚦 message "Aucun FEC chargé" with an orange button "Aller à l'Analyseur FEC". Clicking it switches to the Analyseur FEC section.

- [ ] **Step 3: Load demo data and check the active state**

Go to **Analyseur FEC**, click "Charger les données de démonstration" (or load a real FEC), then go back to **Contrôles**.
Expected: two category sections appear — "🪙 Capital social" and "📐 Comptable" (no "🏦 Emprunts" yet — see next step) — each with one card showing a green or red toggle, the two compared amounts, and (if red) an "Écart : …" line.

- [ ] **Step 4: Check the Emprunts neutral state, then the active state**

While still on **Contrôles** (Export Multi not loaded yet), confirm a third section "🏦 Emprunts" appears with a grey dashed card and the message "Chargez l'Export Multi (onglet Emprunts) pour activer ce contrôle".
Then go to **Emprunts**, click "Charger les données de démonstration" for the Export Multi file, and return to **Contrôles**.
Expected: the Emprunts card now shows a green or red toggle with the two compared amounts instead of the grey message.

- [ ] **Step 5: Check the home page card**

Go to **Accueil**.
Expected: a "🚦 Contrôles" card appears as the 3rd card in the grid, between "Analyseur FEC" and "Tableaux de bord", with a teal icon background. Clicking it opens the Contrôles section.

- [ ] **Step 6: Check admin permission gating (if an admin account is available)**

Log in as an admin, go to **Administration**, open a non-admin user's permissions.
Expected: "Contrôles" appears in the list of assignable sections, between "Analyseur FEC" and "Tableaux de bord". Toggling it on/off and saving works without a server error (confirms the `functions/_lib/validate.js` whitelist update).

No commit for this task — verification only, no files changed.

---

### Task 6: Vérification finale

- [ ] **Step 1: Run the full test suite**

```bash
npx vitest run
```
Expected: all tests pass, including the new `computeControles.test.js`.

- [ ] **Step 2: Lint**

```bash
npm run lint
```
Expected: no errors on the files created/modified in this plan.

- [ ] **Step 3: Build**

```bash
npm run build
```
Expected: build succeeds with no errors.

No commit for this task unless lint/build surface an issue — if they do, fix it in the relevant file from Tasks 1-4 and commit that fix separately with a clear message (e.g. `fix: corrige une erreur de lint dans ControlesTab`).
