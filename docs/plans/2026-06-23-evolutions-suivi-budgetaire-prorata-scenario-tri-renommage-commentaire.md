# Évolutions du module Suivi Budgétaire

## Contexte

Le module de suivi budgétaire (`src/components/budget/`, `src/domain/budget/`, `src/store/useBudgetStore.js`) permet de saisir un budget par poste, de comparer Budgété/Engagé/Réalisé dans deux onglets (« Suivi & écarts » et « Suivi & écart avec scénario »), et de simuler des scénarios bas/médian/haut au niveau global du budget. L'usage réel du module en cours d'exercice fait apparaître 5 manques :

1. En cours d'année, comparer le budget annuel brut au réalisé crée un écart artificiel (le budget n'est pas encore "consommable" en totalité) — il faut pouvoir proratiser le budgété.
2. Les coefficients bas/haut sont globaux au budget ; pour affiner une simulation, il faut pouvoir les piloter poste par poste.
3. Le tri actuel (par code) mélange charges et produits ; on veut une lecture séparée, avec un regroupement à deux niveaux quand l'option est activée.
4. Un budget créé ne peut pas être renommé ni documenté après coup.
5. Il n'existe aucun moyen de laisser une note libre sur un poste, consultable au moment de l'analyse du détail.

Décisions actées avec l'utilisateur :
- Les coefficients bas/haut par poste sont éditables directement dans l'onglet **Suivi & écart avec scénario**, dans les colonnes Budg. bas / Budg. haut.
- Le toggle « Calcul au prorata temporis » est un réglage **local à chaque onglet** (même pattern que le bouton « Regroupement postes » existant), pas partagé entre les deux onglets de suivi.

---

## 1. Prorata temporis (`TableauEcarts.jsx`, `SuiviEcartScenario.jsx`, `calculs.js`)

- Ajouter dans `src/domain/budget/calculs.js` une fonction pure `prorataRatio(dateDebut, dateFin, today = new Date())` basée sur `date-fns` (`differenceInCalendarDays`, déjà une dépendance du projet) :
  - `ratio = clamp((joursEcoulesDepuisDebut + 1) / joursTotalExercice, 0, 1)`
  - avant `dateDebut` → 0, après `dateFin` → 1.
- Dans `TableauEcarts.jsx` et `SuiviEcartScenario.jsx`, ajouter un bouton toggle « Calcul au prorata temporis » (même style que le bouton « Regroupement postes » déjà présent, état local `useState`).
- Quand actif, multiplier `budgete` (et `budgeteBas`/`budgeteHaut` côté scénario) par `prorataRatio(budget.dateDebut, budget.dateFin)` **avant** de calculer `ecart`, `ecartPct`, `tauxConso`, `resteAEngager` — ces fonctions restent inchangées, elles reçoivent juste un budgété déjà proratisé. Le ratio est unique pour tout le budget donc les totaux/regroupements restent cohérents par simple sommation.
- Aucune incidence sur Réalisé/Engagé (ce sont des montants réels, pas budgétés).

## 2. Scénario par ligne (poste) (`calculs.js`, `useBudgetStore.js`, `SuiviEcartScenario.jsx`)

- Modèle : ajouter un champ optionnel `poste.scenarioCoefficients` (`{ [scenarioId]: coefficient }`). Absence de clé = héritage **dynamique** du coefficient global du scénario (si l'utilisateur change le coefficient global bas/haut via `ScenarioSelector`, les postes sans surcharge suivent automatiquement — c'est ce qui réalise « par défaut on charge les valeurs globales »).
- `calculs.js` : ajouter `resolveCoefficient(poste, scenario)` → `poste.scenarioCoefficients?.[scenario.id] ?? scenario.coefficient`. Modifier `resolveMontantPrevu` pour l'utiliser à la place de `scenario.coefficient` direct.
- `useBudgetStore.js` : nouvelle action `updatePosteScenarioCoefficient(budgetId, posteId, scenarioId, coefficient)` qui merge dans `poste.scenarioCoefficients`, suivant le pattern de `updateScenario`/`updatePoste` existant (`applyToBudget`).
- `SuiviEcartScenario.jsx` : dans les cellules `Budg. bas` / `Budg. haut` de chaque ligne de poste, ajouter un petit `<input type="number" step="0.05">` (sous le montant affiché) pré-rempli avec `resolveCoefficient(poste, scenarioBas|Haut)`, sur `onChange` appelant `updatePosteScenarioCoefficient`. Reprendre la convention visuelle de `BudgetGrid.jsx` (`isAuto`) : bordure/italique grisée si valeur héritée du global, bordure orange pleine si surchargée pour ce poste.

## 3. Tri et regroupement charges/produits (`calculs.js`, `TableauEcarts.jsx`, `SuiviEcartScenario.jsx`, `BudgetGrid.jsx`)

- `calculs.js` : exporter `NATURE_ORDER = ['charge', 'produit', 'invest']` et `NATURE_LABELS` (actuellement dupliqué localement dans `BudgetGrid.jsx` — centraliser et réutiliser partout). Les postes « investissement » sont triés après les produits (non explicitement demandé mais cohérent avec l'ordre Charges → Produits → Investissements).
- Modifier `sortPostesByCode` : trier d'abord par `NATURE_ORDER.indexOf(nature)`, puis appliquer le tri existant par code/libellé à l'intérieur de chaque nature. Cette fonction est déjà utilisée par tous les écrans (`BudgetGrid`, `TableauEcarts`, `SuiviEcartScenario`, `BudgetDashboard`) — le nouveau tri s'applique donc partout sans changement supplémentaire dans ces composants.
- Ajouter un helper de regroupement à deux niveaux dans `calculs.js`, par exemple `groupRowsByNatureAndCode(rows)`, qui : regroupe d'abord les lignes (déjà triées) par `nature` dans l'ordre `NATURE_ORDER`, puis à l'intérieur de chaque nature réutilise `groupKeyForCode` pour le sous-regroupement existant. Ajouter aussi un petit helper `sumRows(rows, fields)` pour factoriser les agrégations (`budgete`, `engage`, `realise`, etc.) qui sont aujourd'hui dupliquées entre `TableauEcarts.jsx` et `SuiviEcartScenario.jsx`.
- Dans `TableauEcarts.jsx`/`SuiviEcartScenario.jsx`, quand `grouped === true` : afficher un niveau supplémentaire « Charges » / « Produits » / « Investissements » au-dessus des groupes par code (couleur de fond distincte, ex. `#E3F2F5`), repliable indépendamment. Les groupes de code conservent leur rendu actuel (fond `#F0F7D4`) mais sont imbriqués sous leur groupe de nature. Utiliser une clé composite (`${nature}|${codeKey}`) pour l'état de repli des groupes de code afin d'éviter toute collision entre natures.

## 4. Renommage + description du budget (`useBudgetStore.js`, `BudgetTab.jsx`, `BudgetWizard.jsx`)

- `useBudgetStore.js` : ajouter `description: ''` par défaut dans `createBudget` (la duplication via `duplicateBudget` clone déjà tous les champs via `structuredClone`, donc rien à changer là).
- `BudgetTab.jsx` : transformer l'en-tête (actuellement `<div>{budget.nom}</div>` statique, ligne 48) en bloc éditable : bouton ✏️ à côté du nom qui bascule en mode édition (input texte pour `nom` + `<textarea>` pour `description`, boutons ✓/✕), en reprenant le pattern d'édition inline déjà utilisé pour les postes dans `BudgetGrid.jsx` (`editingPosteId`/`editValues`). Sauvegarde via `updateBudget(budget.id, { nom, description })`. Affichage en lecture : la description s'affiche sous la ligne type/exercice/dates si elle est non vide.
- `BudgetWizard.jsx` : ajouter un champ optionnel « Description » (textarea) au schéma zod et au formulaire, pour pouvoir la renseigner dès la création.

## 5. Commentaire par poste (`useBudgetStore.js`, `BudgetGrid.jsx`, `PosteDrillDown.jsx`)

- `useBudgetStore.js` : ajouter `commentaire: ''` par défaut dans `addPoste`.
- `BudgetGrid.jsx` : ajouter une colonne « Commentaire » tout à droite du tableau (après la colonne Actions), avec un `<input>` texte simple sur `onBlur` appelant `updatePoste(budget.id, poste.id, { commentaire })`, suivant le pattern déjà utilisé pour les cellules de montant mensuel (valeur non contrôlée + `onBlur`, pour éviter un re-render à chaque frappe).
- `PosteDrillDown.jsx` : juste avant la liste des comptes (ligne 12), afficher `poste.commentaire` en italique gris (`fontStyle: 'italic', color: '#718096', fontSize: '12px'`) s'il est renseigné. Comme ce composant est partagé par `TableauEcarts.jsx` et `SuiviEcartScenario.jsx`, le commentaire apparaît automatiquement dans les deux onglets de suivi.

---

## Tests

- `src/__tests__/budgetCalculs.test.js` : ajouter des cas pour `prorataRatio` (avant/pendant/après l'exercice), `resolveCoefficient` (héritage vs surcharge), le nouvel ordre de `sortPostesByCode` (charge avant produit avant invest), et `groupRowsByNatureAndCode`.
- `src/__tests__/budgetUI.test.jsx` : ajouter des cas pour la colonne Commentaire de `BudgetGrid`, le toggle prorata de `TableauEcarts`, l'input de coefficient par poste dans `SuiviEcartScenario`, et le rendu du niveau de regroupement par nature.

## Vérification

1. `npm test` (Vitest) dans `financiel-vision/` — tous les tests existants + nouveaux doivent passer.
2. `npm run dev`, puis dans l'app :
   - Créer un budget avec 2 postes charge (`ACH001`, `ACH002`) et 1 poste produit ; vérifier l'ordre par défaut (charges puis produits, triés par code).
   - Activer « Regroupement postes » : vérifier les deux niveaux (nature puis préfixe de code).
   - Activer « Calcul au prorata temporis » à une date milieu d'exercice : vérifier que le Budgété diminue proportionnellement et que l'Écart se recalcule en conséquence.
   - Dans « Suivi & écart avec scénario », modifier le coefficient bas d'un seul poste (ex. 0,8) et vérifier que les autres postes restent alignés sur le coefficient global.
   - Renommer le budget ouvert et ajouter une description ; fermer/rouvrir le budget pour confirmer la persistance.
   - Ajouter un commentaire sur un poste dans l'onglet Saisie, puis l'ouvrir dans « Suivi & écarts » pour vérifier son affichage en italique au-dessus du détail des comptes.

---

## Statut

Implémenté le 2026-06-23 (voir conversation associée). Suite de tests Vitest : 224/224 passent. Vérification visuelle en navigateur non réalisée (app gated par une authentification backend hors périmètre de ce plan) — à confirmer manuellement par l'utilisateur.
