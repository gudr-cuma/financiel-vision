# Filtre des comptes dans l'onglet Charges — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un bloc de filtre des comptes en haut de l'onglet Charges du tableau de bord ; cocher/décocher un compte recharge dynamiquement le camembert, le tableau de détail et l'histogramme mensuel.

**Architecture:** Filtrage local à l'onglet (mirroir de `TreasuryTab`) : on dérive les comptes de charges depuis `parsedFec`, on filtre `parsedFec.entries` selon la sélection, puis on recalcule via `computeCharges` — sans jamais toucher au `chargesData` global du store (préservé pour l'IA / export / comparaison / diaporama). Les comptes sont regroupés par catégorie PCG dans des groupes repliables (repliés par défaut), avec montants par catégorie et par compte.

**Tech Stack:** React 19, Zustand, Recharts, Vitest + @testing-library/react (jsdom). Tests lancés via `npx vitest run <chemin>`.

---

## File Structure

- **`src/engine/computeCharges.js`** (modifié) — exporter `accountMatchesCategory` (déjà présente, la passer en `export`) et ajouter la fonction pure `getChargeAccountsByCategory(parsedFec)` qui dérive les comptes de charges groupés par catégorie. Logique testable, strictement cohérente avec `computeCharges` (journal `ANC` exclu, `ranges`/`excludeRanges` par catégorie).
- **`src/components/charges/ChargesAccountSelector.jsx`** (nouveau) — composant de présentation pur : reçoit `groups`, `selectedAccounts`, `onChange` ; gère l'affichage repliable, le tri-état des cases de groupe, les totaux, le bouton « Tout sélectionner/désélectionner ». Aucune logique métier.
- **`src/components/charges/ChargesTab.jsx`** (modifié) — lit `parsedFec` (au lieu de `chargesData`), gère l'état `selectedAccounts`, recalcule localement, insère le sélecteur, gère l'état vide.
- **`src/__tests__/computeCharges.test.js`** (nouveau) — tests unitaires de `getChargeAccountsByCategory`.
- **`src/__tests__/chargesAccountSelector.test.jsx`** (nouveau) — tests du composant sélecteur.
- **`src/__tests__/chargesTabFilter.test.jsx`** (nouveau) — test d'intégration du câblage dans `ChargesTab`.

---

## Task 1 : Dérivation des comptes de charges (moteur)

**Files:**
- Modify: `src/engine/computeCharges.js`
- Test: `src/__tests__/computeCharges.test.js`

- [ ] **Step 1 : Écrire le test qui échoue**

Créer `src/__tests__/computeCharges.test.js` :

```js
import { describe, it, expect } from 'vitest';
import { getChargeAccountsByCategory } from '../engine/computeCharges';

const parsedFec = {
  exerciceMonths: [{ month: 1, year: 2025, label: 'Janvier 2025', shortLabel: 'Janv.' }],
  entries: [
    { compteNum: '601000', compteLib: 'Achats semences', debit: 1000, credit: 0, journalCode: 'ACH', ecritureDate: new Date('2025-01-15') },
    { compteNum: '603000', compteLib: 'Variation stocks', debit: 500, credit: 0, journalCode: 'ACH', ecritureDate: new Date('2025-01-15') },
    { compteNum: '641000', compteLib: 'Salaires', debit: 2000, credit: 0, journalCode: 'OD', ecritureDate: new Date('2025-01-20') },
    { compteNum: '621000', compteLib: 'Personnel exterieur', debit: 300, credit: 0, journalCode: 'OD', ecritureDate: new Date('2025-01-20') },
    { compteNum: '706000', compteLib: 'Ventes', debit: 0, credit: 5000, journalCode: 'VT', ecritureDate: new Date('2025-01-10') },
    { compteNum: '601000', compteLib: 'Achats semences', debit: 200, credit: 0, journalCode: 'ANC', ecritureDate: new Date('2025-01-25') },
  ],
};

describe('getChargeAccountsByCategory', () => {
  it('groupe les comptes de charges par catégorie PCG, ANC exclu', () => {
    const groups = getChargeAccountsByCategory(parsedFec);
    // 706* (produit) et 603* (exclu d'Achats) ne sont pas des comptes de charges
    const ids = groups.map((g) => g.id);
    expect(ids).toEqual(['personnel', 'achats']);
  });

  it('rattache 621 a Personnel (et non Services ext.) et trie par montant decroissant', () => {
    const groups = getChargeAccountsByCategory(parsedFec);
    const personnel = groups.find((g) => g.id === 'personnel');
    expect(personnel.accounts.map((a) => a.compteNum)).toEqual(['641000', '621000']);
    expect(personnel.accounts[0].montant).toBe(2000);
    expect(personnel.accounts[1].montant).toBe(300);
  });

  it('exclut les ecritures du journal ANC du montant', () => {
    const groups = getChargeAccountsByCategory(parsedFec);
    const achats = groups.find((g) => g.id === 'achats');
    expect(achats.accounts).toHaveLength(1);
    expect(achats.accounts[0].compteNum).toBe('601000');
    expect(achats.accounts[0].montant).toBe(1000); // 200 ANC exclu
  });

  it('conserve label et couleur de la categorie', () => {
    const groups = getChargeAccountsByCategory(parsedFec);
    const personnel = groups.find((g) => g.id === 'personnel');
    expect(personnel.label).toBe('Personnel');
    expect(personnel.color).toBe('#FF8200');
  });
});
```

- [ ] **Step 2 : Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run src/__tests__/computeCharges.test.js`
Expected: FAIL — `getChargeAccountsByCategory is not a function` (export inexistant).

- [ ] **Step 3 : Implémenter**

Dans `src/engine/computeCharges.js`, passer `accountMatchesCategory` en export et ajouter `getChargeAccountsByCategory`.

Remplacer la ligne :

```js
function accountMatchesCategory(compteNum, cat) {
```

par :

```js
export function accountMatchesCategory(compteNum, cat) {
```

Puis ajouter, à la fin du fichier (après `computeCharges`) :

```js
/**
 * Dérive les comptes de charges disponibles, groupés par catégorie PCG.
 * Strictement cohérent avec computeCharges (journal ANC exclu, ranges/excludeRanges).
 *
 * @param {import('./types').ParsedFEC} parsedFec
 * @returns {{ id, label, color, accounts: { compteNum, compteLib, montant }[] }[]}
 *          catégories non vides seulement, comptes triés par montant décroissant.
 */
export function getChargeAccountsByCategory(parsedFec) {
  const { entries } = parsedFec;

  // { catId: { compteNum: { compteNum, compteLib, montant } } }
  const acc = Object.fromEntries(CHARGE_CATEGORIES.map((c) => [c.id, {}]));

  for (const entry of entries) {
    if (entry.journalCode === 'ANC') continue;
    const cat = CHARGE_CATEGORIES.find((c) => accountMatchesCategory(entry.compteNum, c));
    if (!cat) continue;

    const bucket = acc[cat.id];
    if (!bucket[entry.compteNum]) {
      bucket[entry.compteNum] = { compteNum: entry.compteNum, compteLib: entry.compteLib, montant: 0 };
    }
    bucket[entry.compteNum].montant += entry.debit - entry.credit;
  }

  return CHARGE_CATEGORIES
    .map((cat) => ({
      id: cat.id,
      label: cat.label,
      color: cat.color,
      accounts: Object.values(acc[cat.id])
        .map((a) => ({ ...a, montant: Math.round(a.montant * 100) / 100 }))
        .sort((x, y) => y.montant - x.montant),
    }))
    .filter((g) => g.accounts.length > 0);
}
```

- [ ] **Step 4 : Lancer le test pour vérifier qu'il passe**

Run: `npx vitest run src/__tests__/computeCharges.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5 : Commit**

```bash
git add src/engine/computeCharges.js src/__tests__/computeCharges.test.js
git commit -m "feat(charges): derivation des comptes de charges par categorie"
```

---

## Task 2 : Composant `ChargesAccountSelector`

**Files:**
- Create: `src/components/charges/ChargesAccountSelector.jsx`
- Test: `src/__tests__/chargesAccountSelector.test.jsx`

- [ ] **Step 1 : Écrire le test qui échoue**

Créer `src/__tests__/chargesAccountSelector.test.jsx` :

```jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ChargesAccountSelector from '../components/charges/ChargesAccountSelector';

const groups = [
  { id: 'personnel', label: 'Personnel', color: '#FF8200', accounts: [
    { compteNum: '641000', compteLib: 'Salaires', montant: 2000 },
    { compteNum: '621000', compteLib: 'Personnel ext.', montant: 300 },
  ] },
  { id: 'achats', label: 'Achats', color: '#93C90E', accounts: [
    { compteNum: '601000', compteLib: 'Achats semences', montant: 1000 },
  ] },
];
const allNums = ['641000', '621000', '601000'];

describe('ChargesAccountSelector', () => {
  it('affiche les groupes repliés par défaut (comptes masqués)', () => {
    render(<ChargesAccountSelector groups={groups} selectedAccounts={allNums} onChange={() => {}} />);
    expect(screen.getByText('Personnel')).toBeInTheDocument();
    expect(screen.queryByText('641000')).not.toBeInTheDocument();
  });

  it('déplie un groupe au clic sur son en-tête', () => {
    render(<ChargesAccountSelector groups={groups} selectedAccounts={allNums} onChange={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /Personnel/ }));
    expect(screen.getByText('641000')).toBeInTheDocument();
  });

  it('met la case du groupe en état partiel quand une partie seulement est sélectionnée', () => {
    render(<ChargesAccountSelector groups={groups} selectedAccounts={['641000']} onChange={() => {}} />);
    expect(screen.getByLabelText('Sélectionner tout Personnel')).toBePartiallyChecked();
  });

  it('« Tout désélectionner » appelle onChange avec une liste vide', () => {
    const onChange = vi.fn();
    render(<ChargesAccountSelector groups={groups} selectedAccounts={allNums} onChange={onChange} />);
    fireEvent.click(screen.getByText('Tout désélectionner'));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('décocher la case d\'un groupe retire ses comptes de la sélection', () => {
    const onChange = vi.fn();
    render(<ChargesAccountSelector groups={groups} selectedAccounts={allNums} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('Sélectionner tout Personnel'));
    expect(onChange).toHaveBeenCalledWith(['601000']);
  });
});
```

- [ ] **Step 2 : Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run src/__tests__/chargesAccountSelector.test.jsx`
Expected: FAIL — impossible de résoudre le module `ChargesAccountSelector`.

- [ ] **Step 3 : Implémenter le composant**

Créer `src/components/charges/ChargesAccountSelector.jsx` :

```jsx
import { useState } from 'react';
import { formatAmountFull } from '../../engine/formatUtils';

function AccountRow({ checked, onChange, compteNum, compteLib, montant }) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        cursor: 'pointer',
        fontSize: '13px',
        color: '#4A5568',
        background: checked ? '#E3F2F5' : '#F8FAFB',
        border: '1px solid #E2E8F0',
        borderRadius: '6px',
        padding: '6px 10px',
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ width: '15px', height: '15px', cursor: 'pointer' }}
      />
      <span style={{ fontFamily: 'monospace', color: '#718096' }}>{compteNum}</span>
      <span style={{ flex: 1 }}>{compteLib}</span>
      <span style={{ color: '#718096' }}>{formatAmountFull(montant)}</span>
    </label>
  );
}

function CategoryGroup({ group, selectedAccounts, onChange }) {
  const [expanded, setExpanded] = useState(false);

  const compteNums = group.accounts.map((a) => a.compteNum);
  const selectedInGroup = compteNums.filter((c) => selectedAccounts.includes(c));
  const allSelected = selectedInGroup.length === compteNums.length;
  const noneSelected = selectedInGroup.length === 0;
  const groupTotal = group.accounts
    .filter((a) => selectedAccounts.includes(a.compteNum))
    .reduce((sum, a) => sum + a.montant, 0);

  const setGroupRef = (el) => {
    if (el) el.indeterminate = !allSelected && !noneSelected;
  };

  const toggleGroup = (checked) => {
    const others = selectedAccounts.filter((c) => !compteNums.includes(c));
    onChange(checked ? [...others, ...compteNums] : others);
  };

  const toggleAccount = (compteNum, checked) => {
    if (checked) {
      onChange([...selectedAccounts, compteNum]);
    } else {
      onChange(selectedAccounts.filter((c) => c !== compteNum));
    }
  };

  return (
    <div style={{ border: '1px solid #E2E8F0', borderRadius: 6, marginBottom: 8, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F8FAFB', padding: '8px 10px' }}>
        <input
          type="checkbox"
          ref={setGroupRef}
          checked={allSelected}
          onChange={(e) => toggleGroup(e.target.checked)}
          aria-label={`Sélectionner tout ${group.label}`}
          style={{ width: 15, height: 15, cursor: 'pointer' }}
        />
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            padding: 0,
            font: 'inherit',
          }}
        >
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: group.color, flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#4A5568', flex: 1, textAlign: 'left' }}>
            {group.label}{' '}
            <span style={{ color: '#A0AEC0', fontWeight: 400 }}>
              ({selectedInGroup.length}/{compteNums.length})
            </span>
          </span>
          <span style={{ fontSize: 13, color: '#718096' }}>{formatAmountFull(groupTotal)}</span>
          <span style={{ fontSize: 11, color: '#A0AEC0' }}>{expanded ? '▾' : '▸'}</span>
        </button>
      </div>

      {expanded && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 10 }}>
          {group.accounts.map((a) => (
            <AccountRow
              key={a.compteNum}
              compteNum={a.compteNum}
              compteLib={a.compteLib}
              montant={a.montant}
              checked={selectedAccounts.includes(a.compteNum)}
              onChange={(checked) => toggleAccount(a.compteNum, checked)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Sélecteur de comptes de charges — filtre l'onglet Charges (donut, détail, histogramme).
 * Groupé par catégorie PCG, groupes repliables (repliés par défaut).
 *
 * Props :
 *   groups           — voir getChargeAccountsByCategory (id, label, color, accounts[])
 *   selectedAccounts (string[])        — compteNum sélectionnés
 *   onChange         (string[]) => void
 */
export default function ChargesAccountSelector({ groups, selectedAccounts, onChange }) {
  if (!groups || groups.length === 0) return null;

  const allCompteNums = groups.flatMap((g) => g.accounts.map((a) => a.compteNum));
  const allSelected = selectedAccounts.length === allCompteNums.length;

  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 600, color: '#718096' }}>Comptes de charges</span>
        <button
          type="button"
          onClick={() => onChange(allSelected ? [] : allCompteNums)}
          style={{
            border: 'none',
            background: 'none',
            color: '#FF8200',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            padding: 0,
          }}
        >
          {allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
        </button>
      </div>

      {groups.map((group) => (
        <CategoryGroup
          key={group.id}
          group={group}
          selectedAccounts={selectedAccounts}
          onChange={onChange}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 4 : Lancer le test pour vérifier qu'il passe**

Run: `npx vitest run src/__tests__/chargesAccountSelector.test.jsx`
Expected: PASS (5 tests).

- [ ] **Step 5 : Commit**

```bash
git add src/components/charges/ChargesAccountSelector.jsx src/__tests__/chargesAccountSelector.test.jsx
git commit -m "feat(charges): composant ChargesAccountSelector (groupes repliables tri-etat)"
```

---

## Task 3 : Câblage dans `ChargesTab`

**Files:**
- Modify: `src/components/charges/ChargesTab.jsx`
- Test: `src/__tests__/chargesTabFilter.test.jsx`

- [ ] **Step 1 : Écrire le test qui échoue**

Créer `src/__tests__/chargesTabFilter.test.jsx` :

```jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ChargesTab from '../components/charges/ChargesTab';

const fakeFec = {
  exerciceMonths: [{ month: 1, year: 2025, label: 'Janvier 2025', shortLabel: 'Janv.' }],
  entries: [
    { compteNum: '601000', compteLib: 'Achats', debit: 1000, credit: 0, journalCode: 'ACH', ecritureDate: new Date('2025-01-15') },
    { compteNum: '641000', compteLib: 'Salaires', debit: 2000, credit: 0, journalCode: 'OD', ecritureDate: new Date('2025-01-20') },
  ],
};

vi.mock('../store/useStore', () => ({
  default: (selector) => selector({ parsedFec: fakeFec }),
}));

describe('ChargesTab — filtre des comptes', () => {
  it('affiche le bloc de filtre et la répartition des charges', () => {
    render(<ChargesTab />);
    expect(screen.getByText('Comptes de charges')).toBeInTheDocument();
    expect(screen.getByText('Répartition des charges')).toBeInTheDocument();
  });

  it('affiche le message d\'invite quand aucun compte n\'est sélectionné', () => {
    render(<ChargesTab />);
    fireEvent.click(screen.getByText('Tout désélectionner'));
    expect(screen.getByText(/Sélectionnez au moins un compte/)).toBeInTheDocument();
    expect(screen.queryByText('Répartition des charges')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2 : Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run src/__tests__/chargesTabFilter.test.jsx`
Expected: FAIL — `ChargesTab` ne rend pas encore « Comptes de charges » (le bloc n'existe pas).

- [ ] **Step 3 : Réécrire `ChargesTab.jsx`**

Remplacer entièrement le contenu de `src/components/charges/ChargesTab.jsx` par :

```jsx
import { useEffect, useMemo, useState } from 'react';
import useStore from '../../store/useStore';
import { computeCharges, getChargeAccountsByCategory } from '../../engine/computeCharges';
import ChargesAccountSelector from './ChargesAccountSelector';
import ChargesDonut from './ChargesDonut';
import ChargesDetailList from './ChargesDetailList';
import ChargesMonthlyChart from './ChargesMonthlyChart';

export default function ChargesTab() {
  const parsedFec = useStore((s) => s.parsedFec);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);

  const chargeGroups = useMemo(
    () => (parsedFec ? getChargeAccountsByCategory(parsedFec) : []),
    [parsedFec]
  );
  const allCompteNums = useMemo(
    () => chargeGroups.flatMap((g) => g.accounts.map((a) => a.compteNum)),
    [chargeGroups]
  );

  const [selectedAccounts, setSelectedAccounts] = useState(allCompteNums);

  // Réinitialise la sélection à "tous les comptes" quand un nouveau FEC est chargé.
  useEffect(() => {
    setSelectedAccounts(allCompteNums);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsedFec]);

  const chargesData = useMemo(() => {
    if (!parsedFec || selectedAccounts.length === 0) return null;
    const filteredEntries = parsedFec.entries.filter((e) => selectedAccounts.includes(e.compteNum));
    return computeCharges({ ...parsedFec, entries: filteredEntries });
  }, [parsedFec, selectedAccounts]);

  if (!parsedFec) return null;

  function handleSelectCategory(id) {
    setSelectedCategoryId((prev) => (prev === id ? null : id));
  }

  return (
    <div style={{ padding: '16px' }}>
      <ChargesAccountSelector
        groups={chargeGroups}
        selectedAccounts={selectedAccounts}
        onChange={setSelectedAccounts}
      />

      {!chargesData ? (
        <div
          style={{
            background: '#FFF3E0',
            border: '1px solid #FFE0B2',
            borderRadius: 8,
            padding: 16,
            color: '#1A202C',
            fontSize: 13,
          }}
        >
          Sélectionnez au moins un compte pour afficher les charges.
        </div>
      ) : (
        <>
          {/* Top row: donut + detail list */}
          <div
            style={{
              display: 'flex',
              gap: '16px',
              flexWrap: 'wrap',
              alignItems: 'flex-start',
            }}
          >
            <ChargesDonut
              categories={chargesData.categories}
              totalCharges={chargesData.totalCharges}
              selectedCategoryId={selectedCategoryId}
              onSelectCategory={handleSelectCategory}
            />

            <div
              style={{
                flex: 1,
                minWidth: '280px',
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '16px',
              }}
            >
              <p
                style={{
                  color: '#718096',
                  fontSize: '13px',
                  fontWeight: 600,
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Détail par catégorie
              </p>
              <ChargesDetailList
                categories={chargesData.categories}
                totalCharges={chargesData.totalCharges}
                selectedCategoryId={selectedCategoryId}
                onSelectCategory={handleSelectCategory}
              />
            </div>
          </div>

          {/* Bottom: monthly chart */}
          <ChargesMonthlyChart
            categories={chargesData.categories}
            monthly={chargesData.monthly}
            selectedCategoryId={selectedCategoryId}
          />
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 4 : Lancer le test pour vérifier qu'il passe**

Run: `npx vitest run src/__tests__/chargesTabFilter.test.jsx`
Expected: PASS (2 tests).

- [ ] **Step 5 : Lancer toute la suite de tests des charges (non-régression)**

Run: `npx vitest run src/__tests__/computeCharges.test.js src/__tests__/chargesAccountSelector.test.jsx src/__tests__/chargesTabFilter.test.jsx`
Expected: PASS (11 tests au total).

- [ ] **Step 6 : Commit**

```bash
git add src/components/charges/ChargesTab.jsx src/__tests__/chargesTabFilter.test.jsx
git commit -m "feat(charges): filtre local des comptes dans l'onglet Charges"
```

---

## Task 4 : Vérification build + visuelle

**Files:** aucun (vérification).

- [ ] **Step 1 : Vérifier le build**

Run: `npm run build`
Expected: build réussi, aucune erreur.

- [ ] **Step 2 : Vérification visuelle dans le navigateur**

Lancer le dev server (`preview_start`), charger un FEC, ouvrir Tableau de bord → onglet **Charges**. Vérifier :
- le bloc « Comptes de charges » apparaît en haut, groupes repliés par défaut ;
- déplier un groupe affiche ses comptes avec montants ;
- décocher un compte/un groupe met à jour immédiatement le camembert, le tableau de détail et l'histogramme mensuel ;
- « Tout désélectionner » affiche le message d'invite ;
- charger un autre FEC réinitialise la sélection à « tous les comptes ».

- [ ] **Step 3 : Commit éventuel** (si ajustements visuels nécessaires)

```bash
git add -A
git commit -m "fix(charges): ajustements visuels du filtre de comptes"
```

---

## Self-Review (effectuée)

- **Couverture spec :** bloc de filtre en tête d'onglet (T2/T3) ✓ ; groupement par catégorie, repliable, replié par défaut (T2) ✓ ; montants par catégorie + par compte (T2) ✓ ; tri-état des groupes (T2) ✓ ; recalcul local des 3 éléments sans toucher au `chargesData` global (T3) ✓ ; état initial tous cochés + reset au chargement FEC (T3) ✓ ; état vide (T3) ✓ ; cohérence stricte avec `computeCharges` via `accountMatchesCategory` (T1) ✓.
- **Placeholders :** aucun — tout le code et les commandes sont explicites.
- **Cohérence des types :** `getChargeAccountsByCategory` renvoie `{ id, label, color, accounts: [{compteNum, compteLib, montant}] }`, consommé tel quel par le sélecteur (`group.accounts`, `group.color`, `group.label`) et par `ChargesTab` (`g.accounts.map(a => a.compteNum)`). `onChange` reçoit toujours un `string[]`. `computeCharges({ ...parsedFec, entries })` renvoie `{ categories, totalCharges, monthly }`, props inchangées de `ChargesDonut`/`ChargesDetailList`/`ChargesMonthlyChart`.
