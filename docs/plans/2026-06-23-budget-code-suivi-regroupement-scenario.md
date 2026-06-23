# Améliorations Budget — tableau de saisie, suivi, scénarios

## Contexte

Le module Budget (`src/components/budget/`) permet de saisir des postes budgétaires mois par mois (`BudgetGrid`), de suivre les écarts budget/réalisé (`TableauEcarts`) et de visualiser un dashboard (`BudgetDashboard`). Les postes n'ont aujourd'hui ni code ni mode d'édition après création, le tri suit l'ordre d'insertion, et il n'existe pas de vue de regroupement ni de vue comparant le réalisé aux scénarios bas/haut (qui existent déjà dans le store mais ne sont utilisés que pour calculer une seule colonne "Budgété" à la fois). L'objectif est d'enrichir ces écrans sans changer le modèle de données existant (juste l'étendre avec un champ `code`).

Décisions issues des questions de clarification :
- "Agrandir le tableau de 20%" = **élargir le tableau/la page** (plus de colonnes visibles), pas un zoom CSS ni un agrandissement de police.
- Le nouvel onglet "Suivi & écart avec scénario" affichera **Budgété (bas) + Écart (bas)** et **Budgété (haut) + Écart (haut)** en plus des colonnes actuelles.

## 1. Élargir l'écran Budget (plus de colonnes visibles)

- `src/App.jsx` : le conteneur principal est limité à `max-w-[1280px]` (ligne 150). Rendre cette largeur conditionnelle : `1536px` (1280 × 1.2) quand `activeSection === 'budget'`, sinon `1280px` inchangé pour les autres écrans.
- `src/components/budget/BudgetGrid.jsx` : la colonne **Poste** n'a pas de largeur explicite aujourd'hui (elle s'ajuste au contenu). Lui donner une largeur explicite doublée (`360px` au lieu d'une largeur implicite ~`180px`) via le style du `th`/`td` de la colonne `libelle`. La colonne **Total** passe d'une largeur implicite (~`90px`) à `130px` (légère augmentation).

## 2. Code de poste + tri par défaut

- **Modèle** : `addPoste`/`updatePoste` (`src/store/useBudgetStore.js`) acceptent déjà un objet libre (spread `...posteData`), aucun changement de store n'est nécessaire — `code` sera simplement un champ texte du poste (`poste.code`, ex. `'POS001'`, `'ACH001'`). Gérer partout l'absence de `code` (postes existants) avec un fallback `''`.
- **Helper partagé** dans `src/domain/budget/calculs.js` :
  - `sortPostesByCode(postes)` : tri stable par `code` (croissant, `localeCompare`), postes sans code (ou code vide) renvoyés en fin de liste, tri secondaire par `libelle`.
  - `groupKeyForCode(code)` : retourne les 3 premiers caractères du code en majuscules, ou `'AUTRE'` si absent/trop court.
- **`BudgetGrid.jsx`** :
  - Ajouter un champ "Code" dans la zone de saisie au-dessus du tableau (avec Libellé/Nature/Comptes mappés), state `newPoste.code`.
  - Ajouter une colonne **Code** dans le tableau (avant Poste), affichée en badge/texte gras.
  - Trier `data` avec `sortPostesByCode` avant de construire les lignes `@tanstack/react-table`.
- **`TableauEcarts.jsx`**, **`BudgetDashboard.jsx`**, et le nouvel onglet scénario (§4) : trier les `rows`/`postes` avec `sortPostesByCode` avant rendu/passage au `BarChart`, pour que tableau de suivi et histogramme suivent le même ordre.

## 3. Édition d'un poste existant

- `BudgetGrid.jsx` : ajouter un état local `editingPosteId` + `editValues` (`{ code, libelle, comptesMappes }`).
- Dans la cellule "Poste" : si le poste est en cours d'édition, afficher 3 inputs (code, libellé, comptes mappés en texte virgule) + boutons ✓ (valider → `updatePoste(budget.id, posteId, { code, libelle, comptesMappes: [...] })`) et ✕ (annuler). Sinon, afficher l'état actuel + une icône crayon (✏️) qui initialise `editValues` depuis le poste et bascule en mode édition.
- Pas de nouvelle action de store nécessaire : `updatePoste` existe déjà et fait un patch partiel.

## 4. Agrandir les zones de saisie au-dessus du tableau

- `BudgetGrid.jsx`, zone d'ajout de poste (lignes ~130-159) : élargir l'input "Libellé du poste" (ajouter une largeur explicite ~`220px`, actuellement sans largeur définie) et l'input "Comptes mappés" (`220px` → `320px`). Ajouter le nouveau champ "Code" (largeur ~`110px`, placeholder `Code (ex. ACH001)`).

## 5. Bouton "Regroupement postes" dans Suivi & écarts

- `TableauEcarts.jsx` : ajouter un bouton toggle "Regroupement postes" au-dessus du tableau (état `grouped`, plus `collapsedGroups: Set<string>` pour les groupes repliés).
- Quand `grouped` est actif :
  - Grouper les `rows` (déjà triées par code) par `groupKeyForCode(poste.code)`.
  - Afficher une ligne d'en-tête de groupe (fond légèrement teinté, chevron ▾/▸ cliquable) avec les totaux agrégés (Budgété, Engagé, Réalisé, Écart, Écart %, Taux conso., Reste à engager) du groupe.
  - Cliquer sur la ligne de groupe replie/déplie les lignes de détail du groupe (masque les postes individuels, garde la ligne de total visible).
- Quand `grouped` est inactif : comportement actuel (liste plate), simplement triée par code.
- Extraire le composant `DrillDown` (actuellement interne à `TableauEcarts.jsx`) vers `src/components/budget/PosteDrillDown.jsx` pour le réutiliser dans le nouvel onglet scénario (§6) sans dupliquer la logique de détail comptes/écritures.

## 6. Nouvel onglet "Suivi & écart avec scénario"

- **Navigation** : `src/components/budget/BudgetSubNav.jsx` → ajouter `{ id: 'suivi-scenario', label: 'Suivi & écart avec scénario' }` au tableau `TABS`. `src/components/budget/BudgetTab.jsx` → ajouter le rendu conditionnel `activeSubTab === 'suivi-scenario' && <SuiviEcartScenario budget={budget} activeScenarioId={resolvedScenarioId} />`.
- **Nouveau fichier** `src/components/budget/SuiviEcartScenario.jsx`, dupliqué de `TableauEcarts.jsx` (même tri par code, même bouton "Regroupement postes", même `PosteDrillDown` partagé), avec 4 colonnes supplémentaires :
  - `Budgété (bas)` et `Écart (bas)` : calculées via `totalBudgetePoste(poste, budget.scenarios, scenarioBas.id)` où `scenarioBas = budget.scenarios.find(s => s.type === 'bas')`, écart = `ecart(realise, budgeteBas)`.
  - `Budgété (haut)` et `Écart (haut)` : idem avec `scenarioHaut = budget.scenarios.find(s => s.type === 'haut')`.
  - Fond des colonnes bas : `#FFF3E0` (var CSS `--color-orange-light`, le ton pastel orange défini dans `index.css`).
  - Fond des colonnes haut : `#B1DCE2` (var CSS `--color-blue-pastel`, littéralement nommée "pastel" dans `index.css`).
- **Condensation des colonnes** pour tout faire rentrer à l'écran : réduire le padding des cellules (`8px` → `5px`), réduire légèrement la police (`13px` → `12px`), raccourcir les en-têtes (`Budg. bas`, `Écart bas`, `Budg. haut`, `Écart haut`, `Taux conso.`, `Reste à engager`). Combiné à l'élargissement de page du §1 (1536px), l'objectif est de limiter le scroll horizontal.

## Fichiers impactés

| Fichier | Nature du changement |
|---|---|
| `src/App.jsx` | Largeur conteneur conditionnelle pour la section budget |
| `src/components/budget/BudgetGrid.jsx` | Colonne Code, tri, édition inline, largeurs colonnes/inputs |
| `src/store/useBudgetStore.js` | Aucun changement de logique (vérifier juste les defaults `code`) |
| `src/domain/budget/calculs.js` | Ajout `sortPostesByCode`, `groupKeyForCode` |
| `src/components/budget/TableauEcarts.jsx` | Tri par code, bouton regroupement, extraction DrillDown |
| `src/components/budget/PosteDrillDown.jsx` | Nouveau — extrait de TableauEcarts |
| `src/components/budget/BudgetDashboard.jsx` | Tri des barres par code |
| `src/components/budget/BudgetSubNav.jsx` | Nouvel onglet "Suivi & écart avec scénario" |
| `src/components/budget/BudgetTab.jsx` | Routage du nouvel onglet |
| `src/components/budget/SuiviEcartScenario.jsx` | Nouveau — duplication + colonnes scénario bas/haut |

## Vérification

- Lancer l'app (`npm run dev` dans `financiel-vision/`), ouvrir un budget existant avec plusieurs postes.
- Onglet **Saisie** : vérifier la largeur du tableau/colonnes, créer un poste avec un code (ex. `ACH001`), modifier un poste existant (libellé + comptes mappés) via le crayon, vérifier le tri par code.
- Onglet **Suivi & écarts** : vérifier le tri par code, activer "Regroupement postes" et vérifier les totaux de groupe (ex. `ACH001`+`ACH002` → groupe `ACH`) et le repli/dépli.
- Onglet **Suivi & écart avec scénario** : vérifier l'affichage des 4 colonnes scénario avec les bons fonds pastel, et que les écarts bas/haut sont cohérents avec les coefficients de scénario.
- Onglet **Dashboard** : vérifier que l'ordre des barres suit le code.

## Statut

Implémenté le 2026-06-23. Vérifié via la suite Vitest (208 tests, dont 5 nouveaux tests de rendu sur `BudgetGrid`/`TableauEcarts`/`SuiviEcartScenario` dans `src/__tests__/budgetUI.test.jsx` et `src/__tests__/budgetCalculs.test.js`) et `eslint` (aucune erreur sur les fichiers modifiés). La vérification visuelle dans le navigateur n'a pas pu être faite dans cet environnement (l'app exige une session backend `/api/auth/me` absente du serveur de dev Vite).
