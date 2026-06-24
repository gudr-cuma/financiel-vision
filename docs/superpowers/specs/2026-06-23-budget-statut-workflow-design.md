# Workflow de statuts du suivi budgétaire

## Contexte

Le module Suivi Budgétaire (`src/components/budget/`, `src/store/useBudgetStore.js`) modélise chaque `Budget` avec un champ `statut` (`brouillon` | `soumis` | `valide` | `cloture` | `revise`), affiché en badge et filtrable dans `BudgetList.jsx`. Mais aucune action ne permet de faire évoluer ce statut : `updateBudget(id, patch)` existe en générique mais n'est appelé par aucun bouton pour changer le statut. Un budget créé reste donc indéfiniment en `brouillon`.

L'utilisateur souhaite :
1. pouvoir faire évoluer le statut d'un budget selon un enchaînement contrôlé (pas un sélecteur libre) ;
2. conserver une trace de qui a fait quelle transition et quand.

Persistance : le module budget est actuellement 100% en mémoire (`data/budgetRepository.js`, tableau JS module-level), avec import/export JSON existant (`exportBudgets`/`importBudgets`). L'historique des transitions suit cette même persistance — pas de nouveau mécanisme de stockage, pas de lien avec le fichier `.clario` (qui concerne un domaine fonctionnel différent, le dossier d'analyse FEC). Une base de données remplacera ce repository en mémoire plus tard sans changer l'interface (`getAll/save/remove/exportJson/importJson`), donc l'historique voyagera avec elle sans changement de design.

L'auteur d'une transition est lu depuis `useAuthStore.currentUser` (`{ id, email, name, role }`), déjà utilisé ailleurs dans l'app pour les permissions.

## Périmètre

Concerne uniquement le champ `statut` des `Budget` et son cycle de vie. Hors périmètre : workflow de statut sur d'autres entités (`Engagement.statut` reste un champ libre `devis|commande|facture` géré indépendamment, non concerné par ce design).

## Conception

### 1. Modèle de données

Ajout d'un champ `historique` sur chaque `Budget`, initialisé à `[]` à la création et à la duplication :

```js
historique: [
  {
    id: 'hist_xxx',
    de: 'brouillon',                  // statut de départ
    vers: 'soumis',                   // statut d'arrivée
    date: '2026-06-23T14:32:00.000Z', // ISO 8601, horodatage exact de la transition
    auteur: { id, nom, email },       // copié depuis useAuthStore.currentUser au moment de l'action
    commentaire: '',                  // optionnel, '' si non renseigné
  },
]
```

Seules les transitions effectives sont journalisées — pas d'entrée pour la création initiale en `brouillon`.

### 2. Règles de transition — `domain/budget/regles.js`

Fonctions pures ajoutées au module existant (aucune dépendance React, cohérent avec les autres règles du fichier) :

```js
const STATUT_TRANSITIONS = {
  brouillon: ['soumis'],
  soumis:    ['valide', 'brouillon'],  // brouillon = retour / rejet
  valide:    ['cloture', 'revise', 'soumis'],
  cloture:   ['valide'],                // réouverture d'un budget clôturé
  revise:    ['valide'],                // fin de révision → re-validation directe
};

export function getTransitionsPossibles(statutActuel) {
  return STATUT_TRANSITIONS[statutActuel] ?? [];
}

export function peutTransitionner(statutActuel, statutCible) {
  return getTransitionsPossibles(statutActuel).includes(statutCible);
}
```

Chaque état de la chaîne principale (`brouillon → soumis → valide → cloture`) peut revenir d'un cran en arrière. `revise` est un état secondaire accessible uniquement depuis `valide`, qui revient directement à `valide` (pas de repassage par `soumis`).

### 3. Action store — `store/useBudgetStore.js`

Nouvelle action `changerStatutBudget`, retournant `{ ok: boolean, error?: string }` (pas d'exception — l'UI affiche `error` si présent) :

```js
import useAuthStore from './useAuthStore';
import { peutTransitionner } from '../domain/budget/regles';

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

Décision d'architecture : l'action lit `useAuthStore.getState()` directement plutôt que de recevoir `currentUser` en paramètre. Il n'existe aujourd'hui aucune dépendance croisée entre stores Zustand dans le projet, mais lire l'état d'un autre vanilla store via `getState()` est l'usage idiomatique Zustand — cela évite de faire transiter `currentUser` depuis chaque composant appelant jusqu'à l'action.

Le guard "utilisateur requis" est dupliqué côté UI (boutons désactivés) ET côté store (refus de l'action). C'est une invariante de données (toute entrée d'historique doit avoir un auteur), pas un cas hypothétique — elle doit tenir même si un futur appelant contourne l'UI.

`createBudget` et `duplicateBudget` initialisent `historique: []`.

### 4. UI — composant partagé `components/budget/StatutControl.jsx`

Nouveau fichier, remplace les `STATUT_LABELS`/`STATUT_COLORS`/`StatutBadge` actuellement définis localement dans `BudgetList.jsx` (déplacés ici pour être partagés entre les deux points d'usage).

Expose `StatutControl({ budget, variant })` avec deux variantes :

- **`compact`** (utilisé dans `BudgetList.jsx`, remplace le badge actuel sur chaque ligne) : badge de statut + un bouton par transition autorisée, action immédiate au clic (pas de commentaire — usage pensé pour aller vite sur plusieurs budgets sans ouvrir chacun).
- **`full`** (utilisé dans `BudgetTab.jsx`, header du budget ouvert) : badge + boutons qui déroulent un mini-formulaire inline (textarea commentaire optionnelle + Confirmer/Annuler) avant d'appeler `changerStatutBudget`. Un lien « Historique » déroule la liste complète des transitions passées (de → vers, date+heure, auteur, commentaire si présent). `engine/formatUtils.js` n'expose que `formatDate` (jour seul) ; comme plusieurs transitions peuvent survenir le même jour, `StatutControl.jsx` formate date+heure localement avec `Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' })` plutôt que d'étendre `formatUtils` pour ce seul usage.

Les boutons affichés viennent de `getTransitionsPossibles(budget.statut)`. Le libellé de chaque bouton est résolu par couple `de→vers` (pas seulement par `vers`, pour rester explicite sur les retours en arrière) :

```js
const TRANSITION_LABELS = {
  'brouillon>soumis': 'Soumettre',
  'soumis>valide':    'Valider',
  'soumis>brouillon': '↩ Renvoyer en brouillon',
  'valide>cloture':   'Clôturer',
  'valide>revise':    'Marquer à réviser',
  'valide>soumis':    '↩ Renvoyer en soumission',
  'cloture>valide':   '↩ Rouvrir (repasser en validé)',
  'revise>valide':    'Valider la révision',
};
```

Si `useAuthStore().currentUser` est `null`, tous les boutons de transition sont désactivés (`disabled`) avec `title="Connectez-vous pour modifier le statut"` — cohérent avec le refus côté store.

`BudgetList.jsx` et `BudgetTab.jsx` sont mis à jour pour utiliser `StatutControl` à la place du badge actuel / en ajout dans le header.

### 5. Erreurs

`changerStatutBudget` ne lève jamais d'exception ; elle retourne `{ ok: false, error }`. `StatutControl` affiche ce message d'erreur inline (cas attendu : double-clic créant une course entre deux transitions, budget supprimé entre-temps) sans bloquer le reste de l'UI.

## Tests

- `budgetRegles.test.js` (extension du fichier existant) : table de vérité `peutTransitionner`/`getTransitionsPossibles` sur les 5 statuts (transitions autorisées et refusées, y compris les retours en arrière et le cycle `valide↔revise`).
- `budgetStatutWorkflow.test.js` (nouveau) : `changerStatutBudget` — transition valide (statut mis à jour + entrée historique correcte), transition refusée (statut/historique inchangés, `error` renvoyée), blocage sans `currentUser` (mock `useAuthStore`), accumulation de plusieurs entrées dans l'ordre.
- `StatutControl` (test UI, nouveau fichier ou extension de `budgetUI.test.jsx`) : les boutons affichés correspondent aux transitions autorisées pour un statut donné, clic déclenche `changerStatutBudget` avec les bons arguments, boutons désactivés quand `currentUser` est `null`, la liste d'historique affiche les entrées dans l'ordre chronologique.

## Statut

Design validé par l'utilisateur le 2026-06-23, prêt pour le plan d'implémentation.
