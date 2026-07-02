# Filtre des comptes dans l'onglet Charges — Design

Date : 2026-07-02

## Objectif

Ajouter un bloc de filtre des comptes en haut de l'onglet **Charges** du tableau de
bord, à l'image du sélecteur de comptes du module **Trésorerie**. L'utilisateur peut
exclure certains comptes du calcul ; la coche/décoche est dynamique et recharge les
3 éléments de la page (camembert/donut, tableau de détail par catégorie, histogramme
mensuel).

## Contexte / contraintes architecturales

- **Trésorerie** (`TreasuryTab.jsx`) recalcule *localement* : il filtre
  `parsedFec.entries` selon les comptes cochés puis appelle `computeTreasury`. Le
  sélecteur (`TreasuryAccountSelector.jsx`) est une liste plate de cases à cocher.
- **Charges** (`ChargesTab.jsx`) lit aujourd'hui `chargesData` *global* depuis le
  store, calculé une fois par `computeAll()`. Ce même `chargesData` alimente aussi
  l'analyse IA, l'export, la comparaison et le diaporama.
- **Invariant à préserver** : ne pas modifier le `chargesData` global du store. Le
  filtrage doit rester local à l'onglet pour ne pas polluer l'IA / export /
  comparaison / diaporama.
- Les charges couvrent les classes 60→68 réparties en 7 catégories PCG
  (`CHARGE_CATEGORIES` dans `computeCharges.js`). Le nombre de comptes est
  typiquement bien supérieur à la trésorerie (20-60 vs 5).

## Comportement

- **État initial** : tous les comptes cochés, réinitialisé à chaque chargement d'un
  nouveau FEC (mirroir du `useEffect([parsedFec])` de `TreasuryTab`).
- Décocher un compte → recalcul immédiat et synchrone du **donut**, du **tableau de
  détail par catégorie** et de l'**histogramme mensuel** : les 3 éléments réagissent
  ensemble.
- Si **aucun** compte n'est coché → message d'invite (« Sélectionnez au moins un
  compte pour afficher les charges. »), comme la Trésorerie.
- Le drill-down par catégorie existant (`selectedCategoryId`) est conservé.

## Composant : `ChargesAccountSelector.jsx`

Nouveau fichier dans `src/components/charges/`. Bloc carte blanche placé en haut de
l'onglet, au-dessus du donut.

- **En-tête** : titre « Comptes de charges » + bouton « Tout sélectionner / Tout
  désélectionner » (orange `#FF8200`, à droite) — même style que la Trésorerie.
- **7 groupes = les 7 catégories PCG** (`CHARGE_CATEGORIES`), dans l'ordre existant,
  en ne montrant que les catégories ayant réellement des comptes dans ce FEC.
- Chaque groupe : ligne d'en-tête cliquable pour **replier/déplier**, **repliée par
  défaut**, avec :
  - une case à cocher **tri-état** (cochée / décochée / partielle `indeterminate`
    quand une partie seulement des comptes du groupe est sélectionnée) qui
    coche/décoche tout le groupe ;
  - la pastille de couleur (`cat.color`) + le libellé de la catégorie ;
  - le **montant total de la catégorie** (recalculé selon la sélection courante) ;
  - un chevron ▸ / ▾ indiquant l'état replié/déplié.
- Une fois **dépliée** : liste des comptes du groupe (numéro monospace + libellé +
  **montant du compte**), triés par montant décroissant, chacun avec sa case à cocher.

### Props

```
accounts          — comptes de charges disponibles, groupés par catégorie
                    (structure dérivée dans ChargesTab, voir ci-dessous)
selectedAccounts  (string[])         — compteNum sélectionnés
onChange          (string[]) => void — callback de mise à jour de la sélection
```

## Source des comptes

Les comptes de charges sont dérivés de `parsedFec.entries` avec **exactement** la même
logique que `computeCharges` :

- journal `ANC` exclu ;
- rattachement d'un compte à la catégorie qui le matche via la logique de
  `accountMatchesCategory` (`ranges` + `excludeRanges` par catégorie) ;
- montant d'un compte = somme `débit − crédit` sur ses écritures.

La dérivation produit, par catégorie non vide, la liste `{ compteNum, compteLib,
montant }` triée par `montant` décroissant. Cette dérivation est calculée dans
`ChargesTab` (via `useMemo` sur `parsedFec`) et passée au sélecteur.

> Note d'implémentation : réutiliser `accountMatchesCategory` garantit la cohérence
> stricte avec `computeCharges` (notamment `621` rattaché à Personnel et non à
> Services ext., `603` exclu d'Achats). Extraire/exporter cette fonction depuis
> `computeCharges.js` si nécessaire plutôt que de la dupliquer.

## Recalcul (ChargesTab)

Mirroir de `TreasuryTab` :

```
selectedAccounts (state)
  → filteredEntries = parsedFec.entries.filter(e => selectedAccounts.includes(e.compteNum))
  → computeCharges({ ...parsedFec, entries: filteredEntries })
  → { categories, totalCharges, monthly } passés au donut / liste / histogramme
```

`ChargesTab` cesse de lire `chargesData` du store et lit `parsedFec` à la place
(nécessaire pour re-filtrer). Le résultat recalculé (mémoïsé) remplace l'ancien
`chargesData` local dans le rendu.

## Fichiers

- **Nouveau** : `src/components/charges/ChargesAccountSelector.jsx`
- **Modifié** : `src/components/charges/ChargesTab.jsx`
  (state de sélection + dérivation des comptes + recalcul local + insertion du bloc)
- **Aucune** modification de `computeCharges.js` (sauf export éventuel de
  `accountMatchesCategory`), du store, ni des autres consommateurs de `chargesData`.

## Hors périmètre

- Pas de persistance de la sélection (réinitialisée à chaque FEC).
- Pas d'impact sur N-1 / N-2, l'analyse IA, l'export, la comparaison, le diaporama :
  ces consommateurs continuent d'utiliser le `chargesData` global non filtré.
- Pas de filtre appliqué à l'onglet Charges du Dossier de gestion
  (`components/dossier/ChargesTab.jsx`), qui est un composant distinct.
