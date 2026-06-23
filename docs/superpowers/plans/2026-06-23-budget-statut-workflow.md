# Workflow de statuts du suivi budgétaire — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre de faire évoluer le statut d'un budget (brouillon → soumis → validé → clôturé, avec révision et retours en arrière) via des boutons d'action contrôlés, en journalisant qui a fait quoi et quand.

**Architecture:** Une table de transitions pure dans `domain/budget/regles.js` valide chaque changement de statut. Une action `changerStatutBudget` dans `useBudgetStore.js` applique la transition, lit l'auteur depuis `useAuthStore`, et pousse une entrée dans un nouveau champ `historique` du budget. Un composant partagé `StatutControl.jsx` (variantes `compact`/`full`) rend les boutons d'action et est branché dans `BudgetList.jsx` (liste) et `BudgetTab.jsx` (détail).

**Tech Stack:** React 19, Zustand, Vitest + React Testing Library. Toutes les commandes ci-dessous s'exécutent depuis le répertoire `financiel-vision/` (racine du projet, où se trouve `package.json`).

---

## File Structure

- **Modify** `src/domain/budget/regles.js` — ajoute la table de transitions et les fonctions `getTransitionsPossibles`/`peutTransitionner`.
- **Modify** `src/store/useBudgetStore.js` — ajoute l'action `changerStatutBudget` et initialise `historique: []` sur `createBudget`/`duplicateBudget`.
- **Create** `src/components/budget/StatutControl.jsx` — composant partagé : badge de statut, boutons de transition, formulaire de commentaire (variante `full`), liste d'historique (variante `full`). Remplace les `STATUT_LABELS`/`STATUT_COLORS`/`StatutBadge` actuellement dupliqués dans `BudgetList.jsx`.
- **Modify** `src/components/budget/BudgetList.jsx` — utilise `StatutControl` (variante `compact`) à la place du badge actuel.
- **Modify** `src/components/budget/BudgetTab.jsx` — ajoute `StatutControl` (variante `full`) dans l'en-tête du budget ouvert.
- **Modify** `src/__tests__/budgetRegles.test.js` — ajoute les tests de la table de transitions.
- **Create** `src/__tests__/budgetStatutWorkflow.test.js` — tests de l'action store `changerStatutBudget`.
- **Create** `src/__tests__/budgetStatutControl.test.jsx` — tests du composant `StatutControl`.
- **Create** `src/__tests__/budgetList.test.jsx` — test de branchement dans `BudgetList`.
- **Create** `src/__tests__/budgetTab.test.jsx` — test de branchement dans `BudgetTab`.

---

### Task 1: Table de transitions de statut

**Files:**
- Modify: `src/domain/budget/regles.js`
- Test: `src/__tests__/budgetRegles.test.js`

- [ ] **Step 1: Écrire les tests qui échouent**

Dans `src/__tests__/budgetRegles.test.js`, remplacer le bloc d'import (lignes 2-8) par :

```js
import {
  validateMontantPositif,
  validatePeriode,
  validateDatesBudget,
  validateFinancement,
  validatePlanFinancement,
  getTransitionsPossibles,
  peutTransitionner,
} from '../domain/budget/regles';
```

Puis ajouter à la fin du fichier (après le dernier `describe('validatePlanFinancement', ...)`) :

```js
describe('getTransitionsPossibles', () => {
  it('liste les transitions autorisées pour chaque statut', () => {
    expect(getTransitionsPossibles('brouillon')).toEqual(['soumis']);
    expect(getTransitionsPossibles('soumis')).toEqual(['valide', 'brouillon']);
    expect(getTransitionsPossibles('valide')).toEqual(['cloture', 'revise', 'soumis']);
    expect(getTransitionsPossibles('cloture')).toEqual(['valide']);
    expect(getTransitionsPossibles('revise')).toEqual(['valide']);
  });

  it('renvoie un tableau vide pour un statut inconnu', () => {
    expect(getTransitionsPossibles('inexistant')).toEqual([]);
  });
});

describe('peutTransitionner', () => {
  it('autorise les transitions déclarées dans le graphe', () => {
    expect(peutTransitionner('brouillon', 'soumis')).toBe(true);
    expect(peutTransitionner('soumis', 'valide')).toBe(true);
    expect(peutTransitionner('soumis', 'brouillon')).toBe(true);
    expect(peutTransitionner('valide', 'cloture')).toBe(true);
    expect(peutTransitionner('valide', 'revise')).toBe(true);
    expect(peutTransitionner('valide', 'soumis')).toBe(true);
    expect(peutTransitionner('cloture', 'valide')).toBe(true);
    expect(peutTransitionner('revise', 'valide')).toBe(true);
  });

  it('refuse les transitions qui sautent une étape ou n\'existent pas dans le graphe', () => {
    expect(peutTransitionner('brouillon', 'valide')).toBe(false);
    expect(peutTransitionner('brouillon', 'cloture')).toBe(false);
    expect(peutTransitionner('soumis', 'cloture')).toBe(false);
    expect(peutTransitionner('cloture', 'soumis')).toBe(false);
    expect(peutTransitionner('cloture', 'brouillon')).toBe(false);
    expect(peutTransitionner('revise', 'cloture')).toBe(false);
    expect(peutTransitionner('revise', 'brouillon')).toBe(false);
  });
});
```

- [ ] **Step 2: Vérifier que les tests échouent**

Run: `npx vitest run src/__tests__/budgetRegles.test.js`
Expected: FAIL — `getTransitionsPossibles is not a function` (ou erreur d'import similaire).

- [ ] **Step 3: Implémenter**

Ajouter à la fin de `src/domain/budget/regles.js` :

```js
const STATUT_TRANSITIONS = {
  brouillon: ['soumis'],
  soumis: ['valide', 'brouillon'],
  valide: ['cloture', 'revise', 'soumis'],
  cloture: ['valide'],
  revise: ['valide'],
};

export function getTransitionsPossibles(statutActuel) {
  return STATUT_TRANSITIONS[statutActuel] ?? [];
}

export function peutTransitionner(statutActuel, statutCible) {
  return getTransitionsPossibles(statutActuel).includes(statutCible);
}
```

- [ ] **Step 4: Vérifier que les tests passent**

Run: `npx vitest run src/__tests__/budgetRegles.test.js`
Expected: PASS — 19 tests (15 existants + 4 nouveaux).

- [ ] **Step 5: Commit**

```bash
git add src/domain/budget/regles.js src/__tests__/budgetRegles.test.js
git commit -m "feat(budget): ajoute le graphe de transitions de statut"
```

---

### Task 2: Action store `changerStatutBudget`

**Files:**
- Modify: `src/store/useBudgetStore.js`
- Test: `src/__tests__/budgetStatutWorkflow.test.js`

- [ ] **Step 1: Écrire les tests qui échouent**

Créer `src/__tests__/budgetStatutWorkflow.test.js` :

```js
import { describe, it, expect, beforeEach } from 'vitest';
import useBudgetStore from '../store/useBudgetStore';
import useAuthStore from '../store/useAuthStore';

beforeEach(() => {
  useAuthStore.setState({ currentUser: { id: 'u1', name: 'Jean Dupont', email: 'jean@example.com' } });
});

function createTestBudget() {
  return useBudgetStore.getState().createBudget({
    nom: 'Test', type: 'fonctionnement', exercice: 2026,
    dateDebut: '2026-01-01', dateFin: '2026-12-31',
  });
}

describe('changerStatutBudget', () => {
  it('fait évoluer le statut et journalise la transition', () => {
    const budget = createTestBudget();
    const result = useBudgetStore.getState().changerStatutBudget(budget.id, 'soumis', 'Prêt');
    expect(result).toEqual({ ok: true });

    const updated = useBudgetStore.getState().budgets.find(b => b.id === budget.id);
    expect(updated.statut).toBe('soumis');
    expect(updated.historique).toHaveLength(1);
    expect(updated.historique[0]).toMatchObject({
      de: 'brouillon',
      vers: 'soumis',
      commentaire: 'Prêt',
      auteur: { id: 'u1', nom: 'Jean Dupont', email: 'jean@example.com' },
    });
    expect(updated.historique[0].date).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('refuse une transition non autorisée par le graphe d\'états', () => {
    const budget = createTestBudget();
    const result = useBudgetStore.getState().changerStatutBudget(budget.id, 'cloture');
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/non autorisée/);

    const updated = useBudgetStore.getState().budgets.find(b => b.id === budget.id);
    expect(updated.statut).toBe('brouillon');
    expect(updated.historique).toHaveLength(0);
  });

  it('refuse la transition si aucun utilisateur n\'est connecté', () => {
    useAuthStore.setState({ currentUser: null });
    const budget = createTestBudget();
    const result = useBudgetStore.getState().changerStatutBudget(budget.id, 'soumis');
    expect(result.ok).toBe(false);

    const updated = useBudgetStore.getState().budgets.find(b => b.id === budget.id);
    expect(updated.statut).toBe('brouillon');
  });

  it('accumule plusieurs transitions dans l\'ordre', () => {
    const budget = createTestBudget();
    useBudgetStore.getState().changerStatutBudget(budget.id, 'soumis');
    useBudgetStore.getState().changerStatutBudget(budget.id, 'valide');
    useBudgetStore.getState().changerStatutBudget(budget.id, 'cloture');

    const updated = useBudgetStore.getState().budgets.find(b => b.id === budget.id);
    expect(updated.statut).toBe('cloture');
    expect(updated.historique.map(h => `${h.de}>${h.vers}`)).toEqual([
      'brouillon>soumis', 'soumis>valide', 'valide>cloture',
    ]);
  });
});
```

- [ ] **Step 2: Vérifier que les tests échouent**

Run: `npx vitest run src/__tests__/budgetStatutWorkflow.test.js`
Expected: FAIL — `changerStatutBudget is not a function`.

- [ ] **Step 3: Implémenter**

En haut de `src/store/useBudgetStore.js`, ajouter aux imports existants (après la ligne 2 `import * as budgetRepository from '../data/budgetRepository';`) :

```js
import useAuthStore from './useAuthStore';
import { peutTransitionner } from '../domain/budget/regles';
```

Dans `createBudget`, ajouter `historique: [],` juste après `engagements: [],` (ligne 40 du fichier actuel) :

```js
      financements: [],
      engagements: [],
      historique: [],
    };
```

Dans `duplicateBudget`, ajouter `historique: [],` dans l'objet `copy` (après `version: 1,`) :

```js
    const copy = {
      ...structuredClone(source),
      id: newId('bud'),
      nom: `${source.nom} (copie)`,
      statut: 'brouillon',
      version: 1,
      historique: [],
    };
```

Ajouter la nouvelle action juste avant `exportBudgets: () => budgetRepository.exportJson(),` :

```js
  changerStatutBudget: (budgetId, statutCible, commentaire = '') => {
    const budget = get().budgets.find(b => b.id === budgetId);
    if (!budget) return { ok: false, error: 'Budget introuvable.' };

    if (!peutTransitionner(budget.statut, statutCible)) {
      return { ok: false, error: `Transition de "${budget.statut}" vers "${statutCible}" non autorisée.` };
    }

    const currentUser = useAuthStore.getState().currentUser;
    if (!currentUser) {
      return { ok: false, error: 'Vous devez être connecté pour modifier le statut.' };
    }

    const entry = {
      id: newId('hist'),
      de: budget.statut,
      vers: statutCible,
      date: new Date().toISOString(),
      auteur: { id: currentUser.id, nom: currentUser.name, email: currentUser.email },
      commentaire,
    };

    applyToBudget(get, set, budgetId, (b) => ({
      ...b,
      statut: statutCible,
      historique: [...(b.historique ?? []), entry],
    }));

    return { ok: true };
  },

```

- [ ] **Step 4: Vérifier que les tests passent**

Run: `npx vitest run src/__tests__/budgetStatutWorkflow.test.js`
Expected: PASS — 4 tests.

Run aussi la suite complète du repository pour vérifier l'absence de régression :
Run: `npx vitest run src/__tests__/budgetRepository.test.js`
Expected: PASS — 5 tests (inchangé).

- [ ] **Step 5: Commit**

```bash
git add src/store/useBudgetStore.js src/__tests__/budgetStatutWorkflow.test.js
git commit -m "feat(budget): ajoute l'action changerStatutBudget avec journalisation"
```

---

### Task 3: Composant `StatutControl`

**Files:**
- Create: `src/components/budget/StatutControl.jsx`
- Test: `src/__tests__/budgetStatutControl.test.jsx`

- [ ] **Step 1: Écrire les tests qui échouent**

Créer `src/__tests__/budgetStatutControl.test.jsx` :

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StatutControl } from '../components/budget/StatutControl';

const changerStatutBudget = vi.fn();
let mockCurrentUser = { id: 'u1', name: 'Jean Dupont', email: 'jean@example.com' };

vi.mock('../store/useBudgetStore', () => ({
  default: (selector) => selector({ changerStatutBudget }),
}));

vi.mock('../store/useAuthStore', () => ({
  default: (selector) => selector({ currentUser: mockCurrentUser }),
}));

function makeBudget(overrides = {}) {
  return { id: 'bud_1', statut: 'brouillon', historique: [], ...overrides };
}

beforeEach(() => {
  changerStatutBudget.mockClear();
  changerStatutBudget.mockReturnValue({ ok: true });
  mockCurrentUser = { id: 'u1', name: 'Jean Dupont', email: 'jean@example.com' };
});

describe('StatutControl — variant compact', () => {
  it('affiche un bouton par transition autorisée et déclenche l\'action au clic', () => {
    render(<StatutControl budget={makeBudget({ statut: 'brouillon' })} variant="compact" />);
    fireEvent.click(screen.getByText('Soumettre'));
    expect(changerStatutBudget).toHaveBeenCalledWith('bud_1', 'soumis');
  });

  it('désactive les boutons quand aucun utilisateur n\'est connecté', () => {
    mockCurrentUser = null;
    render(<StatutControl budget={makeBudget({ statut: 'brouillon' })} variant="compact" />);
    const btn = screen.getByText('Soumettre');
    expect(btn).toBeDisabled();
    fireEvent.click(btn);
    expect(changerStatutBudget).not.toHaveBeenCalled();
  });

  it('affiche les trois transitions possibles depuis "valide"', () => {
    render(<StatutControl budget={makeBudget({ statut: 'valide' })} variant="compact" />);
    expect(screen.getByText('Clôturer')).toBeInTheDocument();
    expect(screen.getByText('Marquer à réviser')).toBeInTheDocument();
    expect(screen.getByText('↩ Renvoyer en soumission')).toBeInTheDocument();
  });
});

describe('StatutControl — variant full', () => {
  it('ouvre un formulaire de commentaire avant de confirmer la transition', () => {
    render(<StatutControl budget={makeBudget({ statut: 'brouillon' })} variant="full" />);
    fireEvent.click(screen.getByText('Soumettre'));
    expect(changerStatutBudget).not.toHaveBeenCalled();
    fireEvent.change(screen.getByPlaceholderText('Commentaire (optionnel)'), { target: { value: 'Prêt pour relecture' } });
    fireEvent.click(screen.getByText('Confirmer'));
    expect(changerStatutBudget).toHaveBeenCalledWith('bud_1', 'soumis', 'Prêt pour relecture');
  });

  it('affiche un message d\'erreur si la transition est refusée par le store', () => {
    changerStatutBudget.mockReturnValue({ ok: false, error: 'Transition non autorisée.' });
    render(<StatutControl budget={makeBudget({ statut: 'brouillon' })} variant="full" />);
    fireEvent.click(screen.getByText('Soumettre'));
    fireEvent.click(screen.getByText('Confirmer'));
    expect(screen.getByText('Transition non autorisée.')).toBeInTheDocument();
  });

  it('affiche l\'historique des transitions au clic sur le lien', () => {
    const historique = [
      { id: 'hist_1', de: 'brouillon', vers: 'soumis', date: '2026-06-20T10:00:00.000Z', auteur: { nom: 'Jean Dupont' }, commentaire: '' },
    ];
    render(<StatutControl budget={makeBudget({ statut: 'soumis', historique })} variant="full" />);
    fireEvent.click(screen.getByText('Historique'));
    expect(screen.getByText(/Brouillon → Soumis/)).toBeInTheDocument();
    expect(screen.getByText(/Jean Dupont/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Vérifier que les tests échouent**

Run: `npx vitest run src/__tests__/budgetStatutControl.test.jsx`
Expected: FAIL — le module `../components/budget/StatutControl` n'existe pas.

- [ ] **Step 3: Implémenter**

Créer `src/components/budget/StatutControl.jsx` :

```jsx
import { useState } from 'react';
import useAuthStore from '../../store/useAuthStore';
import useBudgetStore from '../../store/useBudgetStore';
import { getTransitionsPossibles } from '../../domain/budget/regles';

export const STATUT_LABELS = {
  brouillon: 'Brouillon',
  soumis: 'Soumis',
  valide: 'Validé',
  cloture: 'Clôturé',
  revise: 'Révisé',
};

export const STATUT_COLORS = {
  brouillon: { bg: '#F8FAFB', color: '#718096' },
  soumis: { bg: '#FFF3E0', color: '#E57300' },
  valide: { bg: '#E8F5E0', color: '#268E00' },
  cloture: { bg: '#E3F2F5', color: '#1A202C' },
  revise: { bg: '#FFF3E0', color: '#E57300' },
};

const TRANSITION_LABELS = {
  'brouillon>soumis': 'Soumettre',
  'soumis>valide': 'Valider',
  'soumis>brouillon': '↩ Renvoyer en brouillon',
  'valide>cloture': 'Clôturer',
  'valide>revise': 'Marquer à réviser',
  'valide>soumis': '↩ Renvoyer en soumission',
  'cloture>valide': '↩ Rouvrir (repasser en validé)',
  'revise>valide': 'Valider la révision',
};

function formatDateHeure(iso) {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));
}

export function StatutBadge({ statut }) {
  const c = STATUT_COLORS[statut] ?? STATUT_COLORS.brouillon;
  return (
    <span style={{
      display: 'inline-block', padding: '2px 10px', borderRadius: '999px',
      fontSize: '12px', fontWeight: 600, background: c.bg, color: c.color,
    }}>
      {STATUT_LABELS[statut] ?? statut}
    </span>
  );
}

export function StatutControl({ budget, variant = 'compact' }) {
  const changerStatutBudget = useBudgetStore(s => s.changerStatutBudget);
  const currentUser = useAuthStore(s => s.currentUser);
  const [pendingTarget, setPendingTarget] = useState(null);
  const [commentaire, setCommentaire] = useState('');
  const [error, setError] = useState(null);
  const [showHistorique, setShowHistorique] = useState(false);

  const transitions = getTransitionsPossibles(budget.statut);

  const handleClick = (cible) => {
    setError(null);
    if (variant === 'compact') {
      const result = changerStatutBudget(budget.id, cible);
      if (!result.ok) setError(result.error);
      return;
    }
    setPendingTarget(cible);
    setCommentaire('');
  };

  const handleConfirm = () => {
    const result = changerStatutBudget(budget.id, pendingTarget, commentaire);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setPendingTarget(null);
    setCommentaire('');
    setError(null);
  };

  const handleCancel = () => {
    setPendingTarget(null);
    setCommentaire('');
    setError(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <StatutBadge statut={budget.statut} />
        {transitions.map((cible) => (
          <button
            key={cible}
            type="button"
            disabled={!currentUser}
            title={!currentUser ? 'Connectez-vous pour modifier le statut' : undefined}
            onClick={() => handleClick(cible)}
            style={actionBtnStyle}
          >
            {TRANSITION_LABELS[`${budget.statut}>${cible}`]}
          </button>
        ))}
        {variant === 'full' && budget.historique?.length > 0 && (
          <button type="button" onClick={() => setShowHistorique(v => !v)} style={linkBtnStyle}>
            {showHistorique ? 'Masquer historique' : 'Historique'}
          </button>
        )}
      </div>

      {error && <div style={{ fontSize: '12px', color: '#E53935' }}>{error}</div>}

      {variant === 'full' && pendingTarget && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '8px', border: '1px solid #E2E8F0', borderRadius: '6px' }}>
          <textarea
            placeholder="Commentaire (optionnel)"
            value={commentaire}
            onChange={e => setCommentaire(e.target.value)}
            style={{ fontSize: '13px', padding: '6px', border: '1px solid #E2E8F0', borderRadius: '4px', resize: 'vertical' }}
          />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" onClick={handleConfirm} style={confirmBtnStyle}>Confirmer</button>
            <button type="button" onClick={handleCancel} style={cancelBtnStyle}>Annuler</button>
          </div>
        </div>
      )}

      {variant === 'full' && showHistorique && (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {budget.historique.map((h) => (
            <li key={h.id} style={{ fontSize: '12px', color: '#718096' }}>
              {STATUT_LABELS[h.de] ?? h.de} → {STATUT_LABELS[h.vers] ?? h.vers} · {formatDateHeure(h.date)} · {h.auteur?.nom ?? h.auteur?.email}
              {h.commentaire ? ` · « ${h.commentaire} »` : ''}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const actionBtnStyle = {
  padding: '4px 10px', fontSize: '12px', fontWeight: 600, color: '#1A202C',
  background: '#FFFFFF', border: '1px solid #B1DCE2', borderRadius: '6px', cursor: 'pointer',
};

const linkBtnStyle = {
  padding: '4px 6px', fontSize: '12px', color: '#718096',
  background: 'transparent', border: 'none', cursor: 'pointer', textDecoration: 'underline',
};

const confirmBtnStyle = {
  padding: '6px 12px', fontSize: '12px', fontWeight: 700, color: '#FFFFFF',
  background: '#31B700', border: 'none', borderRadius: '6px', cursor: 'pointer',
};

const cancelBtnStyle = {
  padding: '6px 12px', fontSize: '12px', color: '#718096',
  background: 'transparent', border: '1px solid #E2E8F0', borderRadius: '6px', cursor: 'pointer',
};

export default StatutControl;
```

- [ ] **Step 4: Vérifier que les tests passent**

Run: `npx vitest run src/__tests__/budgetStatutControl.test.jsx`
Expected: PASS — 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/budget/StatutControl.jsx src/__tests__/budgetStatutControl.test.jsx
git commit -m "feat(budget): ajoute le composant StatutControl (badge + transitions + historique)"
```

---

### Task 4: Brancher `StatutControl` dans `BudgetList`

**Files:**
- Modify: `src/components/budget/BudgetList.jsx`
- Test: `src/__tests__/budgetList.test.jsx`

- [ ] **Step 1: Écrire le test qui échoue**

Créer `src/__tests__/budgetList.test.jsx` :

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BudgetList from '../components/budget/BudgetList';

const duplicateBudget = vi.fn();
const deleteBudget = vi.fn();
const exportBudgets = vi.fn(() => '{}');
const importBudgets = vi.fn();
const changerStatutBudget = vi.fn(() => ({ ok: true }));

const budgets = [
  { id: 'bud_1', nom: 'Animation réseau', type: 'fonctionnement', exercice: 2026, statut: 'brouillon', historique: [] },
];

vi.mock('../store/useBudgetStore', () => ({
  default: (selector) => selector({ budgets, duplicateBudget, deleteBudget, exportBudgets, importBudgets, changerStatutBudget }),
}));

vi.mock('../store/useAuthStore', () => ({
  default: (selector) => selector({ currentUser: { id: 'u1', name: 'Jean Dupont', email: 'jean@example.com' } }),
}));

const onOpen = vi.fn();

beforeEach(() => {
  onOpen.mockClear();
  changerStatutBudget.mockClear();
});

describe('BudgetList', () => {
  it('affiche le badge de statut et les boutons de transition pour chaque budget', () => {
    render(<BudgetList onOpen={onOpen} onCreate={() => {}} />);
    expect(screen.getByText('Brouillon')).toBeInTheDocument();
    expect(screen.getByText('Soumettre')).toBeInTheDocument();
  });

  it('le clic sur un bouton de transition ne déclenche pas l\'ouverture du budget', () => {
    render(<BudgetList onOpen={onOpen} onCreate={() => {}} />);
    fireEvent.click(screen.getByText('Soumettre'));
    expect(changerStatutBudget).toHaveBeenCalledWith('bud_1', 'soumis');
    expect(onOpen).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Vérifier que le test échoue**

Run: `npx vitest run src/__tests__/budgetList.test.jsx`
Expected: FAIL — `getByText('Soumettre')` introuvable (le badge actuel n'a pas de bouton de transition).

- [ ] **Step 3: Implémenter**

Dans `src/components/budget/BudgetList.jsx`, remplacer les lignes 1-30 (imports + `STATUT_LABELS`/`STATUT_COLORS`/`StatutBadge` locaux) par :

```jsx
import { useMemo, useRef, useState } from 'react';
import useBudgetStore from '../../store/useBudgetStore';
import { StatutControl, STATUT_LABELS } from './StatutControl';
```

Puis remplacer la ligne `<StatutBadge statut={b.statut} />` (ligne 150 du fichier actuel) par :

```jsx
                <div onClick={e => e.stopPropagation()}>
                  <StatutControl budget={b} variant="compact" />
                </div>
```

- [ ] **Step 4: Vérifier que le test passe**

Run: `npx vitest run src/__tests__/budgetList.test.jsx`
Expected: PASS — 2 tests.

Run aussi la suite UI existante pour vérifier l'absence de régression :
Run: `npx vitest run src/__tests__/budgetUI.test.jsx`
Expected: PASS — tests inchangés (BudgetList n'y est pas testé).

- [ ] **Step 5: Commit**

```bash
git add src/components/budget/BudgetList.jsx src/__tests__/budgetList.test.jsx
git commit -m "feat(budget): branche StatutControl dans la liste des budgets"
```

---

### Task 5: Brancher `StatutControl` dans `BudgetTab`

**Files:**
- Modify: `src/components/budget/BudgetTab.jsx`
- Test: `src/__tests__/budgetTab.test.jsx`

- [ ] **Step 1: Écrire le test qui échoue**

Créer `src/__tests__/budgetTab.test.jsx` :

```jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BudgetTab from '../components/budget/BudgetTab';

const addPoste = vi.fn();
const updatePoste = vi.fn();
const removePoste = vi.fn();
const setLigneBudget = vi.fn();
const updateScenario = vi.fn();
const changerStatutBudget = vi.fn(() => ({ ok: true }));

const budget = {
  id: 'bud_1', nom: 'Animation réseau', type: 'fonctionnement', exercice: 2026,
  dateDebut: '2026-01-01', dateFin: '2026-12-31', statut: 'brouillon', historique: [],
  scenarios: [{ id: 'sce_median', type: 'median', coefficient: 1 }],
  postes: [], financements: [], engagements: [],
};

vi.mock('../store/useBudgetStore', () => ({
  default: (selector) => selector({
    budgets: [budget], addPoste, updatePoste, removePoste, setLigneBudget, updateScenario, changerStatutBudget,
  }),
}));

vi.mock('../store/useAuthStore', () => ({
  default: (selector) => selector({ currentUser: { id: 'u1', name: 'Jean Dupont', email: 'jean@example.com' } }),
}));

vi.mock('../store/useStore', () => ({
  default: (selector) => selector({ parsedFec: null }),
}));

describe('BudgetTab', () => {
  it('affiche le contrôle de statut en variante complète une fois le budget ouvert', () => {
    render(<BudgetTab />);
    fireEvent.click(screen.getByText('Animation réseau'));
    expect(screen.getByText('Soumettre')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Vérifier que le test échoue**

Run: `npx vitest run src/__tests__/budgetTab.test.jsx`
Expected: FAIL — `getByText('Soumettre')` introuvable (le header du budget ouvert n'a pas encore de contrôle de statut).

- [ ] **Step 3: Implémenter**

Dans `src/components/budget/BudgetTab.jsx`, ajouter l'import après `import BudgetWizard from './BudgetWizard';` (ligne 5) :

```jsx
import { StatutControl } from './StatutControl';
```

Puis insérer le contrôle juste après la fermeture du `<div>` d'en-tête (après la ligne `</div>` qui clôt le bloc `flex` contenant le titre et le bouton "Retour à la liste", avant `<ScenarioSelector`) :

```jsx
      <div style={{ marginBottom: '8px' }}>
        <StatutControl budget={budget} variant="full" />
      </div>

      <ScenarioSelector
```

- [ ] **Step 4: Vérifier que le test passe**

Run: `npx vitest run src/__tests__/budgetTab.test.jsx`
Expected: PASS — 1 test.

Run la suite complète du module budget pour vérifier l'absence de régression globale :
Run: `npx vitest run src/__tests__/budget*`
Expected: PASS — tous les tests budget (anciens + nouveaux).

- [ ] **Step 5: Commit**

```bash
git add src/components/budget/BudgetTab.jsx src/__tests__/budgetTab.test.jsx
git commit -m "feat(budget): branche StatutControl dans l'en-tête du budget ouvert"
```
