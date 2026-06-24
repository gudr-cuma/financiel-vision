# Plan — 5 nouveaux modules "Export Multi" (Emprunts, Immobilisations, Capital social registre, Matériels, Fiche de synthèse)

> Plan approuvé le 2026-06-22, exécuté dans la même session.

## Contexte

L'application Financiel Vision (alias interne "Clario Vision") a déjà largement dépassé le périmètre initial du PRB : elle gère désormais l'authentification, les permissions par section, un "Dossier de gestion" piloté par un Excel séparé, un Bilan CR, etc. L'utilisateur a fourni un nouveau classeur Excel multi-onglets (`Export_Multi_295_20260622_170153.xlsx`) issu d'un export logiciel tiers, contenant des données d'exploitation qui ne sont pas dans le FEC : emprunts bancaires, immobilisations/amortissements, registre du capital social, parc matériel, et une fiche de synthèse administrative. Il souhaite exposer ces données dans 5 nouvelles entrées de menu, avec tableaux triables/filtrables et, pour 2 d'entre elles, un panneau de détail maître-détail (Emprunts → Lignes d'échéances ; Immobilisations → lignes d'amortissement annuel).

Décisions validées avec l'utilisateur (questions posées en amont, ne pas revenir dessus) :
1. **5 entrées de menu indépendantes** au même niveau que Dossier/Bilan CR (pas un seul menu parent à sous-onglets).
2. **Un seul import Excel partagé** : le classeur est parsé une fois et alimente les 5 sections (le premier import, depuis n'importe laquelle des 5, peuple les autres).
3. Le regroupement par année pour Matériels se fait sur **"Date Achat"** (la colonne "Date Effet" n'existe pas dans cet onglet).
4. La page "Fiche de synthèse" reproduit visuellement la mise en page du PDF de référence fourni, avec "—" pour les champs du PDF absents de l'onglet `Synthese`.

J'ai inspecté le classeur réel (via le package `xlsx` déjà présent dans le projet) : les 26 rubriques de l'onglet `Synthese` sont connues précisément (voir §5.5) — cela résout entièrement le mapping de la fiche de synthèse, aucune incertitude résiduelle.

---

## Architecture générale

Un seul parseur (`engine/parseExportMulti.js`) lit les 7 onglets et produit un objet unique stocké dans une nouvelle slice Zustand (`exploitationData`). Les 5 nouveaux Tabs lisent cette slice ; aucun état de filtre/tri/regroupement ne va dans le store global — il reste en `useState` local à chaque Tab, conformément à la convention déjà en place (`BilanAccountCard.filterText`). Tri/filtre/regroupement sont implémentés une fois comme utilitaires purs (`engine/tableUtils.js`) réutilisés par les 4 tables (Emprunts, Immobilisations, Capital social, Matériels).

Volumes (101 / 657 / 202 / 714 / 74 / 209 lignes) restent sous le seuil de virtualisation déjà utilisé dans le code (500 lignes, réservé aux écritures comptables dans `EntryTable.jsx`) — pas de `react-window` nécessaire ici. Les tables maîtres affichées intégralement (Emprunts 101, I1 202, Capital_Social 74, Matériels 209) sont toutes confortablement en dessous.

---

## 1. `src/engine/parseExportMulti.js` (nouveau)

```js
export async function parseExportMulti(file)        // File -> ExportMultiData (async)
export function parseExportMultiBuffer(arrayBuffer)  // ArrayBuffer -> ExportMultiData (sync, testable)
export function headerToKey(header)                  // utilitaire de mapping, exporté pour tests unitaires
```

- Lecture : `XLSX.read(arrayBuffer, { type: 'array', cellDates: true })` — comme `computeAnalytique.js` — pour que toute date Excel (Date Réalisation, 1ère Échéance, Date Effet Amort, Date Acquisition, Date Achat, etc.) arrive en `Date` JS native, sans calcul de numéro de série.
- Pour chaque onglet sauf `Synthese` : `XLSX.utils.sheet_to_json(ws, { defval: null })`, puis chaque ligne est remappée via `headerToKey(header)` en clé camelCase JS (ex. `"N. Emprunt"` → `nEmprunt`, `"Date Realisation"` → `dateRealisation`, `"Mt Capital Prev"` → `mtCapitalPrev`, `"Eco - Mt Lineaire"` → `ecoMtLineaire`). La fonction est générique (trim, suppression ponctuation, translitération accents, camelCase) avec une petite table d'exceptions documentée en tête de fichier pour les en-têtes commençant par un chiffre (`"1ere Echeance"` → `premiereEcheance`) — décrite une fois, appliquée mécaniquement aux ~150 colonnes des 6 onglets tabulaires (pas besoin de les énumérer dans le code).
- Cas spécial `Synthese` (onglet `{Rubrique, Valeur}` en lignes, pas en colonnes) : transformé en objet plat via la même fonction `headerToKey` appliquée à chaque `Rubrique`, donnant un lookup `{ dossier, raisonSociale, dateDebutExercice, ..., solde10121, ... }`. `defval: null` préserve les rubriques à valeur vide (ex. `President` vide) plutôt que de les omettre.
- Validation : si un des 7 onglets attendus est absent → `throw new Error('Feuille "X" introuvable dans le fichier Excel.')` (même style que `parseDossierGestion.js`).
- Pas de jointure pré-calculée entre Emprunts/Lignes ou I1/I2 dans le parseur — chaque composant filtre à la volée (`lignesEmprunt.filter(l => l.nEmprunt === row.nEmprunt)`), cohérent avec le faible volume et avec le pattern existant `getEntriesForBilanAccount`.
- Forme retournée :
```js
{
  fileName, importedAt,
  emprunts: [...],          // 101 lignes
  lignesEmprunt: [...],     // 657 lignes
  immobilisations: [...],   // 202 lignes (I1)
  immoLignes: [...],        // 714 lignes (I2)
  capitalSocial: [...],     // 74 lignes
  materiels: [...],         // 209 lignes
  synthese: { ... },        // objet plat, 26 clés
}
```

## 2. `src/engine/tableUtils.js` (nouveau)

Module pur (aucune dépendance React/Zustand), réutilisé par les 4 tables :

```js
export function sortRows(rows, key, direction = 'asc')        // détecte number/string/Date ; null/undefined toujours en fin
export function nextSortState(currentSort, clickedKey)        // cycle 3 états : null -> asc -> desc -> null
export function filterByText(rows, keys, searchText)          // insensible casse/accents, OR sur plusieurs clés
export function filterByRange(rows, key, min, max)             // bornes number ou Date, min/max nullable
export function distinctValues(rows, key)                      // valeurs uniques triées (fr), pour peupler les selects
export function groupRows(rows, keyFn, { subtotalKeys = [] })  // -> [{ key, label, rows, subtotal }]
export function yearOf(date)                                   // extrait l'année, tolère null/undefined
```

Le filtre texte réutilise la logique de normalisation déjà présente dans `src/components/sig/EntryFilter.jsx` (`normalizeText`) — à déplacer vers `engine/formatUtils.js` (export) pour respecter le sens de dépendance (engine ne doit pas dépendre de components) ; `EntryFilter.jsx` ré-exporte depuis `formatUtils.js` pour ne rien casser.

## 3. Composants partagés — `src/components/shared/` (nouveaux)

- **`UploadPrompt.jsx`** : généralisation de l'état vide de `DossierTab.jsx` (drag&drop + clic-pour-parcourir + gate `canUploadFile` de `useAuthStore` + bannière d'erreur). Props : `title`, `description`, `accept`, `onFile`, `canUpload`, `error`. Utilisé par les 5 nouveaux Tabs tant qu'`exploitationData` est `null` — tous appellent la même action store `loadExportMulti`.
- **`SortableTh.jsx`** : `<th>` cliquable avec indicateur de tri (▲/▼), style aligné sur `BalanceTable.jsx`/`SigTable.jsx`. Props : `label`, `sortKey`, `currentSort`, `onSort`.
- **`RangeFilterInput.jsx`** : paire d'`<input>` (`type="number"` ou `"date"`) pour les filtres de plage (Montant, Date Réalisation, 1ère Échéance, Date Effet Amort, Date Acquisition). Style cohérent avec `EntryFilter.jsx`.
- **`SlideOverPanel.jsx`** : coquille générique extraite du pattern slide-in de `DetailPanel.jsx` (position fixe, `translateX`, overlay, fermeture Échap, focus auto) — autonome (gère son propre overlay, contrairement à `SigTable.jsx` qui le rend séparément). `DetailPanel.jsx` existant n'est pas touché (zéro risque de régression SIG/Bilan). Props : `isOpen`, `onClose`, `title`, `subtitle`, `headerExtra`, `children`.

## 4. Store — `src/store/useStore.js`

État ajouté :
```js
exploitationData: null,       // ExportMultiData | null
isLoadingExploitation: false,
errorExploitation: null,
```

Actions ajoutées :
```js
loadExportMulti: async (file) => {
  set({ isLoadingExploitation: true, errorExploitation: null });
  try {
    const exploitationData = await parseExportMulti(file);
    set({ exploitationData, isLoadingExploitation: false });
  } catch (err) {
    set({ isLoadingExploitation: false, errorExploitation: err.message });
  }
},
clearExploitationError: () => set({ errorExploitation: null }),
```
(Pas de changement d'`activeSection` forcé dans `loadExportMulti` — contrairement à `loadFecGestion`, l'import peut venir de n'importe laquelle des 5 sections, on reste sur la section courante.)

`reset()` : ajouter `exploitationData: null, isLoadingExploitation: false, errorExploitation: null`.

`sessionManager.js` : **aucune modification**. Le fichier `.clario` exclut déjà délibérément les données Excel volumineuses (`dossierData` lui-même n'est pas sérialisé, seuls `overrides`/`comments` le sont) ; `exploitationData` n'a pas de notion d'override/commentaire utilisateur, donc rien à persister.

## 5. Détail par module

Pattern commun aux 4 tables (Emprunts, Immobilisations, Capital social, Matériels) : le `XxxTab.jsx` lit `exploitationData` + `loadExportMulti` du store ; si `null`, rend `<UploadPrompt/>` ; sinon garde en `useState` local `sort`, `filters`, `groupBy` (et `selectedRow` pour Emprunts/Immobilisations) ; calcule via `useMemo` la chaîne filtre → tri → (regroupement) en utilisant `tableUtils.js` ; délègue le rendu à `XxxTable.jsx` (toutes colonnes visibles, `<SortableTh>` par colonne, scroll horizontal façon `BalanceTable.jsx`).

### 5.1 Emprunts (`src/components/emprunts/`)
- `EmpruntsTab.jsx` : filtre texte (N. Emprunt + Désignation), plage Montant, plage Date Réalisation, plage 1ère Échéance, select Banque, select Catégorie (`distinctValues`). Pas de regroupement.
- `EmpruntsTable.jsx` : toutes les colonnes de l'onglet Emprunts, triables ; clic ligne → `setSelectedRow`.
- `EmpruntDetailPanel.jsx` : `<SlideOverPanel>` ; corps = table des `lignesEmprunt` filtrées sur `nEmprunt === row.nEmprunt`, triées par Exercice puis N. Ligne.

### 5.2 Immobilisations (`src/components/immobilisations/`)
- `ImmobilisationsTab.jsx` : filtre texte (N. Bien + Libellé), plage Date Effet Amort, plage Date Acquisition, select Axe (Axe 1), select Fournisseur (Cpt Fournisseur). Regroupement à 4 états : aucun / année Date Effet Amort / année Date Acquisition / Fournisseur, avec sous-total de Valeur Entrée par groupe.
- `ImmobilisationsTable.jsx` : table plate ou sections repliables (même pattern expand/collapse que `BilanAccountCard.jsx`, en-tête de section = libellé + sous-total formaté).
- `ImmobilisationDetailPanel.jsx` : corps = `immoLignes.filter(l => l.nBien === row.nBien)`.

### 5.3 Capital social registre (`src/components/capitalSocialRegistre/`)
> Nom de dossier distinct de `src/components/dossier/CapitalSocialTab.jsx` existant (qui affiche des ratios calculés à partir du FEC, pas un registre) — aucun risque de confusion.
- `CapitalSocialRegistreTab.jsx` : tri par défaut Adhérent asc. Regroupement : aucun / Adhérent / Base Souscription, avec sous-total Montant + Qt. Solde.
- `CapitalSocialRegistreTable.jsx` : table plate ou groupée. Pas de panneau de détail (pas d'onglet enfant).

### 5.4 Matériels (`src/components/materiels/`)
- `MaterielsTab.jsx` : regroupement aucun / année de Date Achat / Marque.
- `MaterielsTable.jsx` : table plate ou groupée. Pas de panneau de détail.

### 5.5 Fiche de synthèse (`src/components/synthese/FicheSyntheseTab.jsx`)
> Nommé `FicheSyntheseTab` (pas `SyntheseTab`, déjà pris par `src/components/dossier/SyntheseTab.jsx`).

Les 26 rubriques réelles de l'onglet `Synthese` ont été vérifiées directement dans le fichier fourni — mapping figé, pas d'incertitude :

| Bloc PDF | Rubriques disponibles (affichées) | Champs PDF absents (affichés en "—") |
|---|---|---|
| Identité | Dossier, Raison sociale | Adresse, CP/Ville, Téléphone, SIRET, N° agrément, N° exploitation |
| Dirigeants | President, VP, Tresorier, Secretaire | Adresse/téléphone par dirigeant |
| Situation CUMA | Nb adherents total, Nb adherents individuels, Nb adherents groupes (= "Autres"), Nb materiels actifs, Nb articles, Nb activites, Nb salaries | — |
| Exercice | Date debut exercice, Date fin exercice, Nb lignes compta (note : "hormis ODY et ANC"), Nb pieces compta | Nb de BL facturés |
| État du dossier — Capital Social | Solde 10121, Solde 10122, Solde 10131, Solde 10132 (affichés tels quels) | CS appelé/versé, CS appelé/non versé (non disponibles sous cette forme dans `Synthese`) |
| État du dossier — Facturation adhérent | BL cli non generes, BL cli non factures, Fact. cli non integrees | — |
| État du dossier — Facturation fournisseur | BL fou non factures, Fact. fou non integrees | — |

Rendu en boîtes (pas un tableau), via un petit composant interne `InfoField` (`label` + `value ?? '—'`) répété dans chaque boîte pour rester DRY. Lecture seule, pas de tri/filtre/groupBy, pas de dépendance à `tableUtils.js`. Si `!exploitationData`, même `<UploadPrompt/>` partagé que les 4 autres modules.

## 6. Navigation — 3 fichiers

IDs / icônes / labels retenus (emojis distincts de l'existant) :

| id | icon | label |
|---|---|---|
| `emprunts` | 🏦 | Emprunts |
| `immobilisations` | 🏗️ | Immobilisations |
| `capitalSocialRegistre` | 🪙 | Capital social (registre) |
| `materiels` | 🚜 | Matériels |
| `ficheSynthese` | 🗂️ | Fiche de synthèse |

- **`src/components/layout/SideNav.jsx`** : ajouter les 5 objets à `SECTIONS` (fin de liste). Le filtrage `hasPermission(section.id)` s'applique automatiquement.
- **`src/App.jsx`** : importer les 5 nouveaux Tabs ; ajouter `{activeSection === 'emprunts' && <EmpruntsTab />}` etc. dans le bloc `<main>`, au même niveau que `dossier`/`bilanCR`/`bilanParam` (hors du bloc conditionné par `activeSection === 'dashboard'`).
- **`src/components/admin/AdminPanel.jsx`** : ajouter les 5 mêmes `{id, label}` à `ALL_SECTIONS` — sans cela, aucun utilisateur non-admin ne pourra jamais se voir accorder l'accès à ces sections.

## 7. Tests (Vitest, `src/__tests__/`)

- **`parseExportMulti.test.js`** : construire un classeur de test minimal en mémoire (`XLSX.utils.book_new()` + `sheet_add_aoa`) pour ne pas dépendre de données client réelles dans le repo. Vérifie : comptage de lignes par onglet, qu'une colonne date connue ressort `instanceof Date` (option `cellDates`), la convention `headerToKey` sur quelques cas représentatifs (`"N. Emprunt"` → `nEmprunt`, `"1ere Echeance"` → `premiereEcheance`, `"Eco - Mt Lineaire"` → `ecoMtLineaire`), que `synthese` est un objet plat préservant les valeurs `null`, et la levée d'erreur si un onglet obligatoire manque.
- **`tableUtils.test.js`** : fixtures inline. Tri asc/desc sur number/string/Date avec `null` toujours en fin ; cycle complet de `nextSortState` ; `filterByText` insensible casse/accents sur plusieurs clés ; `filterByRange` bornes indépendamment nulles ; `distinctValues` dédoublonné et trié ; `groupRows` avec sous-totaux exacts ; `yearOf` tolérant aux valeurs nulles.

## Vérification

1. `npm run dev` depuis `financiel-vision/`, se connecter (admin pour avoir accès direct à toutes les sections sans configuration de permissions).
2. Vérifier que les 5 nouvelles entrées apparaissent dans le menu latéral et affichent l'état vide (`UploadPrompt`) avant tout import.
3. Importer `Export_Multi_295_20260622_170153.xlsx` depuis l'une des 5 sections ; vérifier que les 4 autres affichent immédiatement leurs données (import partagé).
4. Emprunts : vérifier 101 lignes, tester le tri sur 2-3 colonnes, chaque filtre (texte, plages Montant/dates, Banque, Catégorie), cliquer une ligne et vérifier que le panneau affiche bien les lignes de l'onglet `Lignes` correspondant au même N. Emprunt.
5. Immobilisations : vérifier 202 lignes, tester les 3 modes de regroupement (sous-totaux corrects), cliquer une ligne et vérifier le détail I2 par N. Bien.
6. Capital social registre : 74 lignes, tri par Adhérent/Base, regroupement avec sous-totaux Montant/Qt. Solde.
7. Matériels : 209 lignes, regroupement par année de Date Achat et par Marque.
8. Fiche de synthèse : comparer visuellement au PDF fourni — champs présents corrects, champs absents affichés "—".
9. `npm run lint` et exécution des nouveaux tests Vitest (`parseExportMulti.test.js`, `tableUtils.test.js`).
10. Vérifier dans `AdminPanel` que les 5 nouvelles sections apparaissent dans la liste des permissions accordables.

## Fichiers critiques

- `src/engine/parseExportMulti.js` (nouveau) — cœur du parsing multi-feuilles
- `src/engine/tableUtils.js` (nouveau) — tri/filtre/regroupement partagés
- `src/store/useStore.js` — slice `exploitationData` + actions + `reset()`
- `src/components/shared/UploadPrompt.jsx`, `SortableTh.jsx`, `RangeFilterInput.jsx`, `SlideOverPanel.jsx` (nouveaux)
- `src/components/emprunts/`, `src/components/immobilisations/`, `src/components/capitalSocialRegistre/`, `src/components/materiels/`, `src/components/synthese/` (nouveaux dossiers, ~4 fichiers chacun pour les 4 premiers, 1 fichier pour le dernier)
- `src/App.jsx`, `src/components/layout/SideNav.jsx`, `src/components/admin/AdminPanel.jsx` — câblage navigation

---

## Addendum — chargement démo (post-implémentation, 2026-06-22)

À la demande de l'utilisateur, le fichier `Export_Multi_295_20260622_170153.xlsx` fourni a été copié tel quel dans `public/demo/demo_export_multi.xlsx` (confirmé par l'utilisateur — l'onglet Synthese affichait déjà "Raison sociale: TEST" / "Dossier: 999001", signe qu'il s'agit déjà d'un jeu de test). Une action `loadDemoExportMulti` a été ajoutée au store et câblée dans `loadDemoComplete()`, et un bouton "⚡ Charger les données de démonstration" a été ajouté à l'état vide de chacun des 5 modules (cohérent avec le pattern déjà utilisé par Dossier de gestion / Bilan CR).
