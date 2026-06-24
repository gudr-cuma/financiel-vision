# Complément Export PDF — Financiel Vision / Clario Vision

Racine projet : `C:\_pCloud\Extensions\Financiel vision\financiel-vision`

## Contexte

Le module Export PDF (`src/components/export/ExportTab.jsx` + moteur `src/engine/generatePdf.js`, basé sur **pdfmake** avec graphiques en **SVG natif**, pas de html2canvas) gère aujourd'hui 13 documents exportables (dossier de gestion, SIG, bilan, bilan CR, balances, grand livre, trésorerie, charges, analytique, rapport IA, comparaison N/N-1). Plusieurs modules métier de l'app (Capital social, Immobilisations, Emprunts, Matériels, Fiche de synthèse, Suivi budgétaire) ont leurs propres pages avec widgets/tableaux/regroupements, mais ne sont pas exportables en PDF. La trésorerie n'imprime que la courbe, jamais l'histogramme déjà disponible côté app. Il n'existe par ailleurs aucune persistance ni import/export de la configuration d'export (contrairement au Suivi budgétaire qui a déjà ce pattern via `budgetRepository.js` / `BudgetList.jsx`).

Objectif : étendre l'Export PDF avec 6 nouveaux documents, enrichir la Trésorerie d'options (histogramme/granularité/top10), réordonner le catalogue par défaut, et ajouter l'export/import de la configuration — en réutilisant systématiquement les fonctions de calcul pures déjà existantes (`tableUtils.js`, `computeTreasury.js`, `empruntsUtils.js`, `domain/budget/calculs.js`) plutôt que de dupliquer la logique métier.

**Décisions actées avec l'utilisateur** : pas d'ajout de doc "Tableau de bord" ni "Bilan paramétré" (jugés déjà couverts/hors scope). "Suivi budgétaire" est ajouté en plus de la demande initiale, positionné juste avant "Rapport IA", non coché par défaut, avec choix du budget + type de tableau (Suivi & écart / avec scénario) et regroupement par poste **toujours actif** (pas une option).

## Approche

### 1. État des options par doc — objet unique `docOptions`

Dans `ExportTab.jsx`, un seul state `docOptions` (clé = doc id) plutôt que des states éclatés, pour simplifier la sérialisation JSON :

```js
const DEFAULT_DOC_OPTIONS = {
  treasury_curve: { chartType: 'courbe', granularity: 'mois', showSolde: true, showTop10: false },
  capital_social: { groupBy: 'none' },        // 'none' | 'adherent' | 'baseSouscription'
  materiels:      { groupBy: 'none' },        // 'none' | 'marque' | 'yearDateAchat'
  budget_suivi:   { budgetId: null, tableType: 'ecarts', scenarioId: null },
};
```
`immobilisations` et `emprunts` n'ont pas d'options (filtres fixes imposés). `docOptions` est transmis à `generateExport` via `storeData`, comme `comparaisonSubTables` aujourd'hui.

### 2. Réordonnancement de `ALL_DOCS` / `DEFAULT_SELECTED` (ExportTab.jsx:30-46)

Nouvel ordre exact (et nouveaux flags `requiresExploitation` basé sur `exploitationData`, `requiresBudget` basé sur `budgets.length>0` du `useBudgetStore`) :

```js
const ALL_DOCS = [
  { id: 'fiche_synthese',    requiresExploitation: true },
  { id: 'bilan',             requiresFec: true },
  { id: 'dossier_gestion',   requiresDossier: true },
  { id: 'comparaison_nn1',   requiresComparaisonNN1: true },
  { id: 'treasury_curve',    requiresFec: true },
  { id: 'charges_charts',    requiresFec: true },
  { id: 'sig',               requiresFec: true },
  { id: 'balance',           requiresFec: true },
  { id: 'balance_aux',       requiresFec: true },
  { id: 'grand_livre',       requiresFec: true, warn: true },
  { id: 'bilan_cr',          requiresBilanCR: true },
  { id: 'capital_social',    requiresExploitation: true },
  { id: 'emprunts',          requiresExploitation: true },
  { id: 'immobilisations',   requiresExploitation: true },
  { id: 'materiels',         requiresExploitation: true },
  { id: 'analytique_podium', requiresAnalytique: true },
  { id: 'analytique_table',  requiresAnalytique: true },
  { id: 'budget_suivi',      requiresBudget: true },
  { id: 'rapport_ia',        requiresRapportIA: true },
];

const DEFAULT_SELECTED = [
  'fiche_synthese', 'dossier_gestion', 'treasury_curve', 'charges_charts',
  'sig', 'balance', 'balance_aux', 'bilan_cr',
  'capital_social', 'emprunts', 'immobilisations', 'materiels',
];
```
Les deux filtres `requiresXxx` dupliqués (init `orderedSelection` et `availableDocs`) doivent être factorisés en une fonction `isDocAvailable(doc, ctx)` unique pour éviter la duplication actuelle.

### 3. Trésorerie — histogramme + top10 (`generatePdf.js`, autour de `buildTreasuryCurve` L636-747)

- Nouvelle fonction `buildTreasuryBarSvg(buckets, showSolde, svgW)` : barres groupées encaissements (vert `#31B700`)/décaissements (rouge `#E53935`) par bucket issu de `aggregateTreasuryByGranularity(dailyCurve, granularity)` (déjà dans `computeTreasury.js`, gère semaine/mois/trimestre/semestre), + ligne de solde optionnelle sur axe secondaire (couleur `#B1DCE2`), même esprit graphique que `buildTreasurySvg` existant (grille, labels, pas d'espacement auto pour éviter la surcharge avec la granularité semaine).
- `buildTreasuryCurve(treasuryData, chartW, docOpts)` étendu : bascule `chartType==='histogramme'` → `buildTreasuryBarSvg(...)` sinon comportement actuel inchangé. Les 6 widgets KPI restent toujours affichés au-dessus, dans les deux cas.
- Nouveau `buildTop10Block(top10Entrees, top10Sorties, chartW)` : 2 tables pdfmake côte à côte (`columns`), réutilise `treasuryData.top10Entrees`/`top10Sorties` (déjà calculés par `computeTreasury`), affiché sous le graphique seulement si `docOpts.showTop10`.
- UI `ExportTab.jsx` : sous-bloc conditionnel sous la checkbox `treasury_curve` (même pattern que le sous-bloc `comparaison_nn1` existant L267-322) — segmented Courbe/Histogramme, puis si Histogramme : `GranularityToggle` (réutilisable directement depuis `src/components/treasury/GranularityToggle.jsx`, composant pur) + checkbox "Avec courbe de solde", puis checkbox indépendante "Top 10 encaissements/décaissements".

### 4. Nouveaux builders pour les modules Export_Multi (`generatePdf.js`)

Tous lisent `exploitationData` (slice déjà dans `useStore.js`, alimentée par `loadExportMulti`) et dupliquent localement les définitions de colonnes (pattern déjà utilisé pour balance/grand livre — pas d'import de composants React dans le moteur PDF) :

- `buildCapitalSocialContent(exploitationData, docOpts, chartW)` — table `exploitationData.capitalSocial`, colonnes de [CapitalSocialRegistreTable.jsx:6-17](../../src/components/capitalSocialRegistre/CapitalSocialRegistreTable.jsx), 2 widgets (Qt. Solde total, Montant total via `sumColumn`), regroupement optionnel via `groupRows(rows, keyFn, {subtotalKeys:['montant','qtSolde']})` (adhérent/base), total général en pied de table.
- `buildImmobilisationsContent(exploitationData, chartW)` — filtre `etat===1` pour la table, mais les 3 widgets (actives, non amorties, valeur entrée actives) sont calculés comme dans [ImmobilisationsTab.jsx:87-96](../../src/components/immobilisations/ImmobilisationsTab.jsx) (non-amorties sur l'ensemble, pas seulement les actives). Colonnes de `ImmobilisationsTable.jsx:5-16`.
- `buildEmpruntsContent(exploitationData, chartW)` — filtre `situation===4`, widgets via `getCapitalRestantDu`/`countEmpruntsEnCours` (déjà dans `empruntsUtils.js`). Colonnes de `EmpruntsTable.jsx:4-14`.
- `buildMaterielsContent(exploitationData, docOpts, chartW)` — filtre `!dateVente`, regroupement optionnel marque/année d'achat via `groupRows` + `yearOf`. Colonnes de `MaterielsTable.jsx:5-15`.
- `buildFicheSyntheseContent(exploitationData, syntheseOverrides, chartW)` — **contrainte 1 page A4 impérative** : pas le helper `makeSectionTitle` standard (trop verbeux), titre compact inline + ligne canvas dimensionnée à `chartW`. Disposition en 3 colonnes (paysage, chartW=781) ou 2 colonnes (portrait, chartW=515), police réduite (6.5-7pt), cards `unbreakable: true` pour éviter une coupure entre 2 pages. Reprend les mêmes champs/regroupements que [FicheSyntheseTab.jsx:110-180](../../src/components/synthese/FicheSyntheseTab.jsx) (Identité, Dirigeants, Situation CUMA, Année en cours, État du dossier ×3), avec résolution `overrides[key] ?? s[key] ?? '-'` identique à la page React.

### 5. Suivi budgétaire (`buildBudgetSuiviContent`)

- Branchement non invasif de `useBudgetStore` dans `ExportTab.jsx` (lecture seule de `budgets`, store Zustand indépendant déjà utilisé ailleurs — aucun risque de couplage).
- UI : sous-bloc avec sélecteur de budget (`budgets` du store), segmented "Suivi & écart" / "Suivi & écart avec scénario", et si scénario : sélecteur de scénario (défaut = type `median`).
- Builder : reproduit fidèlement la logique pure de [TableauEcarts.jsx](../../src/components/budget/TableauEcarts.jsx) (8 colonnes) / [SuiviEcartScenario.jsx](../../src/components/budget/SuiviEcartScenario.jsx) (12 colonnes : + Budg. bas/Écart bas/Budg. haut/Écart haut), en réutilisant `ecart`, `ecartPct`, `tauxConso`, `resteAEngager`, `totalBudgetePoste`, `sortPostesByCode` de `domain/budget/calculs.js` et `realiseFromFec` de `domain/budget/realiseFromFec.js`. **Le regroupement par nature+code (`groupRowsByNatureAndCode`) est toujours appliqué**, ce n'est pas une checkbox. Si `parsedFec` absent : note d'avertissement "FEC non chargé — Réalisé non calculé" (le builder reçoit `parsedFec` directement depuis le scope de `generateExport`, pas besoin de le faire transiter par `storeData`).

### 6. Export/Import de la configuration (nouveau fichier `src/components/export/exportConfigRepository.js`)

Réplique exacte du pattern `budgetRepository.js` / `BudgetList.jsx` (lignes 29-68) :
- `exportConfigJson({orderedSelection, docOptions, mode, orientation, comparaisonSubTables})` → `JSON.stringify({..., exportedAt})`.
- `importConfigJson(jsonString)` → `JSON.parse` + validation (`Array.isArray(parsed.orderedSelection)`), sinon `throw`.
- UI : 2 boutons ("Exporter la configuration" / "Importer une configuration") + input file caché (`accept="application/json"`), erreur affichée dans un state local `importConfigError`. À l'import, `orderedSelection` est filtré sur `availableDocs` pour ignorer silencieusement les docs indisponibles dans la session courante.
- Pas de persistance automatique en localStorage (non demandé — seulement l'export/import fichier).
- `annexes` (Files binaires) et `logoDataUrl` ne sont pas capturés dans cette config.

## Fichiers modifiés / créés

- [src/engine/generatePdf.js](../../src/engine/generatePdf.js) — cœur du changement : nouveaux imports (`tableUtils`, `aggregateTreasuryByGranularity`, `empruntsUtils`, `domain/budget/calculs`, `domain/budget/realiseFromFec`), 6 nouvelles entrées `DOC_LABELS`/`BUILDERS`, `buildTreasuryBarSvg`, extension de `buildTreasuryCurve`, `buildTop10Block`.
- [src/components/export/ExportTab.jsx](../../src/components/export/ExportTab.jsx) — réordonnancement `ALL_DOCS`/`DEFAULT_SELECTED`, `docOptions` unifié, branchement `useBudgetStore`, 4 sous-blocs UI conditionnels (trésorerie, capital social, matériels, budget), bloc "Configuration de l'export".
- `src/components/export/exportConfigRepository.js` (nouveau) — sérialisation JSON, pattern de `src/data/budgetRepository.js`.
- Aucun changement dans `tableUtils.js`, `computeTreasury.js`, `empruntsUtils.js`, `domain/budget/calculs.js`, `realiseFromFec.js`, `useStore.js`, `useBudgetStore.js` — tout y existe déjà en fonctions pures.

## Ordre d'implémentation suivi

1. **Indépendant** : réordonnancement `ALL_DOCS`/`DEFAULT_SELECTED`/`DOC_LABELS`, puis les 4 builders simples (capital_social, immobilisations, emprunts, materiels), puis `buildFicheSyntheseContent` (le plus sensible — testé avec données complètes ET partielles, dans les 2 orientations, pour valider la tenue sur 1 page).
2. **Trésorerie** : `buildTreasuryBarSvg` (testé isolément avec des buckets factices) → extension `buildTreasuryCurve` + `buildTop10Block` → UI correspondante.
3. **Budget** : branchement `useBudgetStore` → `buildBudgetSuiviContent` (testé avec un budget multi-scénarios/postes groupés) → UI sélecteurs.
4. **Transverse** : `docOptions`/`DEFAULT_DOC_OPTIONS` créé en premier puisque chaque sous-bloc y écrit ; `exportConfigRepository.js` + UI export/import en dernier.

## Vérification effectuée

- Build (`vite build`) et lint (`eslint .`) : OK, aucune erreur introduite.
- Test en navigateur avec les données de démo (FEC + Export_Multi + un budget de test) : nouvel ordre/cases pré-cochées conforme à la spec, tous les sous-réglages fonctionnels (histogramme/granularité/sans-solde + top10, regroupements adhérent/marque, suivi budgétaire en mode scénario).
- Génération PDF testée avec toutes les options non-standard activées simultanément : aucune erreur.
- Fiche de synthèse confirmée sur **une seule page A4** en portrait et en paysage (comptage des pages réelles dans le PDF généré, comparé à un document existant de référence).
- Export/import de la configuration JSON testé en aller-retour (sérialisation → désérialisation → ré-application de l'état).

## Décisions hors-scope actées avec l'utilisateur

- Pas de nouveau document "Tableau de bord" (les graphiques utiles de cet onglet sont déjà couverts par les exports SIG / Charges / Balance / Comparaison N-1 / Analytique existants).
- Pas de nouveau document "Bilan paramétré".
