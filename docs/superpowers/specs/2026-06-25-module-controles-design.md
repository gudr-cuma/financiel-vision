# Module Contrôles

## Contexte

Clario Vision dispose aujourd'hui de ~20 modules métier indépendants (FEC, Export Multi, bilan paramétré…) mais d'aucun moyen de vérifier la cohérence des chiffres *entre* ces modules, ou entre comptes comptables d'un même FEC. Une erreur de saisie (ex. un emprunt mal renseigné dans l'Export Multi, un capital social déséquilibré) n'est détectée qu'en confrontant manuellement plusieurs onglets.

L'utilisateur souhaite un nouveau module **Contrôles**, visuel et "ludique" (esprit feu tricolore vert/rouge), qui affiche en un coup d'œil l'état de cohérence de plusieurs vérifications, rangées par fonctionnalité métier (Capital social, Immobilisations, Emprunts, Dettes et créances, TVA, Clôture, Comptable…).

Trois contrôles sont à implémenter dans cette v1 :
1. **Capital social** : solde créditeur du compte `10121000` == solde débiteur du compte `45620000`.
2. **Emprunts** : capital restant dû (widget déjà affiché en haut de l'onglet Emprunts, calculé par `getCapitalRestantDu`) == somme des soldes des comptes de racine `164`.
3. **Comptable** : somme des mouvements débit de la balance == somme des mouvements crédit.

## Périmètre

- Inclus : le module Contrôles (navigation, page, 3 contrôles ci-dessus, état vide, gestion des permissions).
- Catégories **Immobilisations, Dettes et créances, TVA, Clôture** : prévues dans le vocabulaire métier mais **aucun contrôle n'est défini pour elles dans cette v1** — elles n'apparaissent pas tant qu'aucun contrôle n'y est ajouté (cf. Conception §3). Leur ajout futur est hors périmètre de ce design (chaque nouveau contrôle sera une petite extension additive de `CONTROLES_DEFINITIONS`).
- Hors périmètre : drill-down / panneau de détail au clic sur une carte, sélecteur d'exercice N-1/N-2, configuration des contrôles par l'utilisateur (seuils, comptes) — tout est codé en dur pour l'instant, à l'image des mappings `SIG_MAPPING` / `CHARGE_CATEGORIES` déjà présents dans `engine/`.

## Conception

### 1. Emplacement dans la navigation

Le module est inséré entre **Analyseur FEC** et **Tableaux de bord**, dans les deux endroits où l'ordre des sections est déclaré en dur :

- [`src/components/layout/SideNav.jsx`](../../../src/components/layout/SideNav.jsx) — tableau `SECTIONS` : nouvelle entrée `{ id: 'controles', icon: '🚦', label: 'Contrôles' }` insérée entre `analyseur` et `dashboard`.
- [`src/components/accueil/AccueilTab.jsx`](../../../src/components/accueil/AccueilTab.jsx) — tableau `MODULES` : nouvelle carte insérée entre `analyseur` et `dashboard` :
  ```js
  {
    id: 'controles',
    icon: '🚦',
    label: 'Contrôles',
    color: '#0D9488',
    bg: '#E6FFFA',
    description: 'Vérifiez la cohérence de vos données entre modules et comptes — capital social, emprunts, équilibre comptable…',
  }
  ```
- [`src/components/admin/AdminPanel.jsx`](../../../src/components/admin/AdminPanel.jsx) — tableau `ALL_SECTIONS` : `{ id: 'controles', label: 'Contrôles' }` ajouté après `analyseur`, pour que l'admin puisse accorder/retirer la permission comme pour les autres sections. Pas de `hasEditPerm` — le module est strictement en lecture (pas d'action d'édition possible).
- Gating d'accès : identique aux autres sections — `hasPermission('controles')` dans `useAuthStore`, déjà générique.

Aucun nouvel état Zustand n'est nécessaire : comme `LivresTab` (`computeBalance`), le module lit `parsedFec` et `exploitationData` déjà présents dans `useStore` et calcule à la volée via `useMemo`. `activeSection` accueille simplement la valeur `'controles'` dans son union de types (commentaire JSDoc à mettre à jour).

### 2. Calcul — `src/engine/computeControles.js`

Fonctions pures, sans dépendance React, sur le modèle de `computeLivres.js`.

```js
const TOLERANCE_ECART = 0.01; // € — arrondi flottant, pas un vrai écart

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
      valueB: sommeComptesRacine(balanceRows, '164'), // crédit - débit, cf. ci-dessous
    }),
  },
  {
    id: 'comptable_equilibreBalance',
    categoryId: 'comptable', categoryLabel: 'Comptable', categoryIcon: '📐',
    label: 'Total débits balance = Total crédits',
    valueALabel: 'Total mvt débit',
    valueBLabel: 'Total mvt crédit',
    compute: ({ balanceRows }) => ({
      valueA: balanceRows.filter(r => r.rowType === 'compte').reduce((s, r) => s + r.mvt_debit, 0),
      valueB: balanceRows.filter(r => r.rowType === 'compte').reduce((s, r) => s + r.mvt_credit, 0),
    }),
  },
];

export function computeControles(parsedFec, exploitationData) {
  if (!parsedFec) return [];

  const balanceRows = computeBalance(parsedFec);
  const balanceParCompte = new Map(
    balanceRows.filter(r => r.rowType === 'compte').map(r => [r.compteNum, r])
  );

  return CONTROLES_DEFINITIONS.map((def) => {
    if (def.requiresExportMulti && !exploitationData) {
      return { ...def, status: 'neutral' };
    }
    const { valueA, valueB } = def.compute({ balanceRows, balanceParCompte, exploitationData });
    const ecart = Math.abs(valueA - valueB);
    return { ...def, valueA, valueB, ecart, status: ecart <= TOLERANCE_ECART ? 'ok' : 'ko' };
  });
}
```

`sommeComptesRacine(balanceRows, prefix)` est un petit helper local : somme `(solde_credit - solde_debit)` sur les lignes `rowType === 'compte'` dont `compteNum.startsWith(prefix)` — le compte 164 étant normalement créditeur, ceci donne directement le capital restant dû en positif, comparable au widget.

Le statut `'neutral'` (gris) n'existe que pour le contrôle Emprunts quand `exploitationData` est absent ; les deux autres contrôles ne dépendent que du FEC, toujours disponible si on a atteint cette fonction.

Le regroupement par catégorie (pour l'affichage) se fait côté composant par un simple `reduce` préservant l'ordre de `CONTROLES_DEFINITIONS` — une catégorie qui n'a aucune entrée dans ce tableau n'apparaît jamais, ce qui couvre naturellement la règle "masquer tant que vide" sans logique de filtrage dédiée.

### 3. Composants

- **`src/components/controles/ControlesTab.jsx`** — conteneur de page.
  - Lit `parsedFec` et `exploitationData` via `useStore`.
  - Si `!parsedFec` : écran vide centré (icône 🚦, titre "Aucun FEC chargé", texte d'aide, bouton "Aller à l'Analyseur FEC" → `setActiveSection('analyseur')`). Pas de dropzone d'upload dans ce module — le FEC se charge exclusivement depuis l'Analyseur.
  - Sinon : `useMemo(() => computeControles(parsedFec, exploitationData), [parsedFec, exploitationData])`, regroupement par `categoryId` (ordre de première apparition), puis pour chaque groupe un en-tête (`icône + categoryLabel`, petit label gris majuscule, même style que les sous-totaux existants) suivi d'une grille de `ControleCard` (`repeat(auto-fill, minmax(260px, 1fr))`, cohérent avec `AccueilTab`/`EmpruntsTab`).
- **`src/components/controles/ControleCard.jsx`** — présentation pure.
  - Props : `{ label, valueALabel, valueA, valueBLabel, valueB, ecart, status }` (status ∈ `'ok' | 'ko' | 'neutral'`).
  - Pastille "interrupteur" en haut à droite (forme ovale 32×17px à curseur, identique à la maquette de référence) : verte (`#31B700`) si `ok`, rouge (`#E53935`) si `ko`, grise (`#CBD5E0`, sans curseur visible) si `neutral`.
  - Corps : deux blocs valeur côte à côte (label gris 10px + montant `formatAmountFull`, 13px gras), comme les `MiniStatCard`.
  - Si `status === 'ko'` : ligne sous les valeurs `Écart : {formatAmountFull(ecart)}` en rouge 11px gras.
  - Si `status === 'neutral'` : les deux blocs valeur sont remplacés par le message d'invite ⏳ porté par `def.neutralMessage` (propagé tel quel par `computeControles`, ex. *"Chargez l'Export Multi (onglet Emprunts) pour activer ce contrôle"*), texte gris, carte à fond `#F8FAFB` et bordure pointillée `#CBD5E0` (au lieu du blanc/bordure pleine habituels) pour bien la distinguer visuellement des cartes actives.
  - Pas de `onClick` — carte non interactive en v1 (pas de drill-down).

### 4. Formatage

Réutilisation de `formatAmountFull` (`engine/formatUtils.js`), déjà utilisé par `EmpruntsTab` — aucune nouvelle fonction de formatage.

## Limites connues (non bloquantes)

- Si un compte attendu (`10121000`, `45620000`, racine `164`) est totalement absent du FEC (montant 0 des deux côtés), le contrôle affiche "OK" alors qu'il n'y a en réalité aucune donnée — comportement identique à un vrai équilibre nul, jugé acceptable pour cette v1 plutôt que d'ajouter un état "indéterminé" supplémentaire.
- Le contrôle Comptable, sur un FEC valide, sera quasi toujours vert puisque le FEC est par construction en partie double — sa valeur est avant tout une détection d'anomalie de parsing/import, pas un contrôle métier à proprement parler. Conforme à la demande explicite de l'utilisateur.

## Tests

- `src/__tests__/computeControles.test.js` (nouveau, sur le modèle de `computeBilan.test.js`) : couvre les 3 contrôles avec des FEC de fixture — cas OK, cas en écart (> tolérance), cas dans la tolérance (≤ 0.01 €), et cas `exploitationData` absent pour Emprunts.
- Pas de test composant requis pour `ControleCard`/`ControlesTab` (cohérent avec l'absence de tests sur les autres `*Tab.jsx` de l'app, qui sont testés implicitement via les fonctions `compute*` pures).
