# Module "Suivi budgétaire" — Fédérations de CUMA

## Contexte

Financiel Vision est aujourd'hui un outil d'analyse de comptabilité (FEC) pour les
fédérations de CUMA. Les fédérations ont aussi besoin de **construire et piloter leurs
budgets** (projet subventionné & fonctionnement), de suivre le réalisé issu de la
compta, gérer leurs plans de financement multi-financeurs, et donner une vision
consolidée au trésorier/CA. C'est un besoin complémentaire à la compta, pas une
fonctionnalité de plus dans un dossier FEC : une fédération suit ses budgets sur
l'année, indépendamment du FEC qu'elle importe ponctuellement.

Décisions actées avec l'utilisateur (résumées ci-dessous) :

- **Section indépendante** dans la SideNav (pas un onglet de dossier FEC).
- **Réalisé branché sur le FEC actif** dès le MVP (pas de ressaisie manuelle si un
  FEC est chargé) — l'app ne gère qu'un FEC actif à la fois (`parsedFec` dans
  `useStore.js`, pas de multi-dossier simultané), donc pas besoin de sélecteur
  de dossier.
- **Pas de localStorage pour l'instant** (cohérent avec la règle existante de l'app).
  Persistance en mémoire + export/import JSON manuel. Le repository est conçu pour
  être branché plus tard sur une base Cloudflare D1 sans changer les composants.
- **Composants UI maison** (pas shadcn/ui) pour rester visuellement cohérent avec la
  charte fv-* existante.
- **Grille mensuelle + saisie annuelle avec répartition automatique** (pas de mode
  trimestriel pour le MVP).
- **Dashboard MVP** = KPI cards + tableau Budgété/Engagé/Réalisé/Écart + un seul
  graphique Recharts (barres groupées Budget vs Réalisé par poste).
- Scénarios bas/médian/haut, import CSV réalisé séparé, justification financeur,
  fonds dédiés, bénévolat, multi-structures → **hors MVP** (V2/V3 du cadrage), mais
  le modèle de données prévoit déjà `scenarioId` pour éviter une migration.

## Intégration dans l'app existante

- `{ id: 'budget', icon: '💶', label: 'Suivi budgétaire' }` dans `SECTIONS` de
  `src/components/layout/SideNav.jsx`.
- `{ id: 'budget', label: 'Suivi budgétaire' }` dans `ALL_SECTIONS` de
  `src/components/admin/AdminPanel.jsx` (système `hasPermission` existant).
- Branche `{activeSection === 'budget' && <BudgetTab />}` dans `src/App.jsx`.
- `BudgetTab` gère sa propre navigation interne en `useState` local, sur le modèle
  de `src/components/dossier/DossierTab.jsx`.

## Modèle de données (domain/budget)

```js
Budget        { id, nom, type: 'projet'|'fonctionnement', exercice, dateDebut,
                dateFin, statut: 'brouillon'|'soumis'|'valide'|'cloture'|'revise',
                version, devise }
Poste         { id, budgetId, libelle, nature: 'charge'|'produit'|'invest',
                comptesMappes: string[], axeAnalytique, responsable }
Scenario      { id, budgetId, type: 'bas'|'median'|'haut', coefficient }
LigneBudget   { id, posteId, scenarioId, periode: 'AAAA-MM', montantPrevu,
                hypothese: { volume, prixUnitaire } | null, commentaire }
Financement   { id, budgetId, financeur, typeRecette: 'subvention'|'cotisation'|
                'prestation'|'autofinancement', montant, tauxIntervention,
                assietteEligible, echeancier: [{ date, montant, type }] }
Realise       { posteId, periode, montant, sourceCompta: 'fec', dateImport }
                // calculé à la volée depuis parsedFec, pas stocké
Engagement    { id, posteId, libelle, montant, statut: 'devis'|'commande'|'facture' }
```

## Règles de calcul (`domain/budget/calculs.js`)

```js
ecart(realise, budgete) = realise - budgete
ecartPct(ecart, budgete) = ecart / budgete
tauxConso(realise, engage, budgete) = (realise + engage) / budgete
resteAEngager(budgete, engage, realise) = budgete - engage - realise
montantSubvention(assietteEligible, depensesEligiblesRealisees, tauxIntervention)
montantScenario(montantMedian, coefficient) = montantMedian * coefficient
repartitionCharges(chargeStructure, cleRepartition, projet)
controleEquilibre(financements, lignesBudget) -> { equilibre, ecart }
resolveMontantPrevu(poste, scenarios, scenarioId, periode)
  // valeur explicite si saisie, sinon médian × coefficient (bas/haut), sinon 0
totalBudgetePoste(poste, scenarios, scenarioId)
```

## Écrans MVP

1. Liste des budgets — filtres type/exercice/statut, export/import JSON.
2. Assistant de création — type, période, init vierge / copie.
3. Grille de saisie (TanStack Table) — postes × mois, saisie annuelle avec
   répartition automatique.
4. Plan de financement — financeurs, contrôle d'équilibre recettes/dépenses.
5. Suivi & écarts — Budgété/Engagé/Réalisé/Écart, drill-down comptes/écritures.
6. Dashboard — KPI cards + barres groupées Budget vs Réalisé.

## Statut

**MVP livré et vérifié** (toutes les phases 1 à 6 ci-dessus). 188 tests Vitest
passent sur 14 fichiers (`domain/budget/*`, repository, drill-down).

Bugs trouvés et corrigés pendant la vérification MVP :
- `BudgetGrid` utilisait un `<input defaultValue>` non remonté après une mise à
  jour externe du store (ex. répartition annuelle) — fix via `key={montant}`
  pour forcer le remount.
- `validateFinancement` rejetait à tort les financements sans `tauxIntervention`
  ni `assietteEligible` (ex. cotisations) — fix : ces contrôles ne s'appliquent
  que si le champ est renseigné.
- Bug préexistant sans lien avec ce module : commentaire JSDoc dans
  `TreasuryAccountSelector.jsx` cassait le build (`*/` prématuré dans
  `(51*/53*)`) — corrigé en passant à `(51* / 53*)`.

**Scénarios bas/médian/haut (V2 anticipée) — livrés et vérifiés** :
- `Scenario` × 3 auto-créés à la création d'un budget (bas: coefficient 0.9,
  médian: 1, haut: 1.1), modifiables via `ScenarioSelector`.
- Bas/Haut = médian × coefficient, surchargeable cellule par cellule
  (`resolveMontantPrevu`/`totalBudgetePoste`, testés en TDD).
- Navigation par sélecteur au-dessus de la grille (pas de 3 colonnes côte à
  côte) ; un seul scénario actif à la fois dans Grille/Plan de
  financement/Suivi & écarts/Dashboard.
- Vérifié en navigateur : Bas/Haut dérivent correctement du médian, une
  surcharge sur une cellule reste figée indépendamment du coefficient,
  Plan de financement/Suivi & écarts/Dashboard reflètent bien le total du
  scénario actif.

Hors MVP, toujours différé (cadrage V2/V3, non demandé) : import CSV réalisé
séparé, justification financeur, fonds dédiés, bénévolat, multi-structures.
