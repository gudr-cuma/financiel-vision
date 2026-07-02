# Panel de détail des comptes — onglet « Bilan et CR »

**Date :** 2026-07-02
**Statut :** Design validé

## Objectif

Dans l'onglet **Bilan et CR** (`components/bilanCR/`), permettre le drill-down des lignes de
détail vers les comptes et écritures du **FEC N**, avec un panneau latéral droit **strictement
identique** à celui de l'onglet SIG du tableau de bord.

Une ligne est « de détail » — donc cliquable — dès qu'elle affiche une **racine de compte**
à gauche du libellé (colonne `code`). Le drill-down affiche tous les comptes/écritures dont
le `CompteNum` commence par cette racine (ex. racine `201` → tous les comptes `201*`).

## Contexte technique

- L'onglet Bilan et CR est alimenté par un **fichier Excel** (`bilanCRData`, parsé par
  `engine/parseBilanCR.js`), **distinct du FEC**. Les données de drill-down viennent, elles,
  du FEC N (`parsedFec.entries` dans le store — exercice N).
- Le panneau SIG existe déjà : `components/sig/DetailPanel.jsx` gère déjà les types `sig` et
  `bilan`, et contient un drill-down **générique par racine** :
  `getAccountsForBilan(ranges, entries, options)` + `getEntriesForBilanAccount(compteNum, entries)`
  dans `engine/drillDown.js`.
- Le montage overlay + panneau est déjà démontré par `components/sig/SigTable.jsx` (overlay
  semi-transparent `zIndex 39` + `<DetailPanel/>` en `position: fixed; right: 0`).

## Formes de données (parseBilanCR)

| Vue | Item ligne | Champ montant |
|---|---|---|
| Actif | `{ type:'line', code, label, brut, amort, netN, netN1 }` | `netN` |
| Passif | `{ type:'line', code, label, netN, netN1 }` (+ `subline` à code pointé ex. `164.1`) | `netN` |
| Résultat | `{ type:'line'\|'subline', code, label, totalN, totalN1 }` | `totalN` |

**Règle de cliquabilité :** une ligne est cliquable **ssi `code` est purement numérique**
(`/^\d+$/`). Cela exclut naturellement les sous-lignes d'emprunt à code pointé (`164.1`), les
totaux, sections et sous-sections (sans code).

## Décisions produit

1. **Signe des produits (compte de résultat).** Les comptes de produits (racine classe 7)
   sont affichés en **positif** (crédit − débit), comme le SIG. Toutes les autres racines
   (classes 1 à 6) utilisent débit − crédit.
2. **FEC N non chargé.** La ligne reste cliquable ; le panneau s'ouvre et affiche un message
   invitant à charger le FEC de l'exercice N.
3. **Lignes d'actif amortissables.** Le périmètre inclut la racine **et** les comptes
   d'amortissement / dépréciation associés (ex. `201` → `201*` + `2801*` + `2901*`).

## Conception

### 1. Couche domaine — résolution racine → comptes

Helper `buildBilanCRDrill(item, view)` dans `engine/drillDown.js`, retournant
`{ racine, label, montant, ranges, soldeType }` :

- `racine` = `item.code`.
- `label` = `item.label`.
- `montant` = `item.netN` (actif/passif) ou `item.totalN` (résultat).
- `ranges` :
  - Base : `[racine]`.
  - Pour la vue **actif** avec `amort` non nul, ajout des comptes d'amortissement/dépréciation
    dérivés par **substitution de classe** :
    - classe 2 → `'28' + racine.slice(1)` et `'29' + racine.slice(1)`
    - classe 3 → `'39' + racine.slice(1)`
    - classe 4 → `'49' + racine.slice(1)`
    - classe 5 → `'59' + racine.slice(1)`

    (Ex. `201` → `['201','2801','2901']`, `213` → `['213','2813','2913']`.) Les ranges dérivés
    sans écriture correspondante ne remontent aucun compte — sans effet de bord. La somme des
    soldes (débit − crédit) ≈ Net N.
- `soldeType` = `'product'` si `racine` commence par `'7'`, sinon `'charge'`.

### 2. Extensions moteur (rétrocompatibles)

- `getAccountsForBilan(ranges, entries, options)` : ajout d'une option `type`. Si
  `type === 'product'`, `solde = crédit − débit` ; sinon comportement actuel (`débit − crédit`).
- `getEntriesForBilanAccount(compteNum, entries, type = 'charge')` : solde running
  `+= type === 'product' ? crédit − débit : débit − crédit`.

Les appels existants (BalanceTab, sans `type`) conservent le comportement actuel (`débit − crédit`).

### 3. Store (`useStore.js`)

- Nouvel état possible : `detailPanel = { type:'bilancr', racine, label, montant, ranges, soldeType }`.
- Action `openBilanCRDetail(payload)` → `set({ detailPanel: { type:'bilancr', ...payload } })`.
- `closeDetail` réutilisé.

### 4. DetailPanel (`components/sig/DetailPanel.jsx`)

- Nouvelle branche `panelType === 'bilancr'` :
  - En-tête identique : préfixe = `racine`, libellé = `label`, montant total en orange (`montant`).
  - Corps : liste des comptes contribuant, réutilisant `BilanAccountCard` **paramétré par
    `soldeType`** (passé à `getAccountsForBilan` et `getEntriesForBilanAccount`).
  - Si `entries.length === 0` : message « Chargez le FEC de l'exercice N pour afficher le
    détail des comptes. »
  - Si aucun compte contributeur : message existant « Aucun compte contribuant trouvé. »
- `BilanAccountCard` reçoit et propage le `soldeType` à `getEntriesForBilanAccount`.

### 5. Vues Actif / Passif / Résultat

- Les lignes `type:'line'` (et `subline` du résultat) à `code` numérique deviennent
  interactives, avec la même sémantique que `SigRow` : `role="button"` / `tabIndex`, hover,
  focus clavier (Enter/Espace), fond sélectionné `#E3F2F5`, chevron `›` orange à droite quand
  sélectionnée.
- Chaque vue appelle `openBilanCRDetail(buildBilanCRDrill(item, view))` au clic (toggle : re-clic
  sur la ligne sélectionnée → `closeDetail`).
- `BilanCRTab` monte l'overlay semi-transparent + `<DetailPanel/>` quand
  `detailPanel?.type === 'bilancr'` (même structure que `SigTable`).
- Le panneau est fermé (`closeDetail`) au changement de sous-onglet actif/passif/résultat.

### 6. Source des données

`parsedFec.entries` (exercice N). Le drill-down bilan inclut le journal ANC (contrairement au SIG).

## Périmètre exclu (YAGNI)

- Pas de refonte du panneau partagé pour unifier SIG/bilan/bilancr.
- Pas de drill-down sur les sous-lignes à code pointé (ventilation emprunts `164.1`).
- Pas de comparatif N-1 dans le panneau (le drill-down reste sur le FEC N).

## Composants / fichiers touchés

- `src/engine/drillDown.js` — `buildBilanCRDrill`, option `type` sur les deux fonctions de drill.
- `src/store/useStore.js` — état `bilancr`, action `openBilanCRDetail`.
- `src/components/sig/DetailPanel.jsx` — branche `bilancr`, `soldeType` sur `BilanAccountCard`.
- `src/components/bilanCR/ActifView.jsx`, `PassifView.jsx`, `ResultatView.jsx` — lignes cliquables.
- `src/components/bilanCR/BilanCRTab.jsx` — montage overlay + panneau, fermeture au changement de sous-onglet.
