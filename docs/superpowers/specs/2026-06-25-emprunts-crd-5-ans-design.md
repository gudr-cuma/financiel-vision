# Tableau "CRD à 5 ans" dans l'onglet Emprunts

## Contexte

L'onglet Emprunts (`src/components/emprunts/`) affiche aujourd'hui un registre des emprunts issu du fichier Export_Multi (feuilles `Emprunts` + `Lignes`, parsées par `parseExportMulti.js`). Chaque emprunt a un échéancier détaillé dans `lignesEmprunt`, avec pour chaque ligne un couple Prévisionnel/Réel (`mtCapitalPrev`/`mtCapitalReel`, `mtInteretPrev`/`mtInteretReel`, `mtRestantDuPrev`/`mtRestantDuReel`) et deux dates (`datePrevue`/`dateReelle`).

L'utilisateur veut un nouveau tableau de synthèse — une ligne par emprunt — donnant, **à une date de fin de période choisie**, le capital remboursé et les intérêts réglés cumulés depuis l'origine, le capital restant dû, et la répartition du capital restant à rembourser par tranche d'échéance (< 1 an / 1 à 5 ans / > 5 ans). Ce découpage en tranches correspond à la présentation standard des annexes de dettes financières (dettes à moins d'1 an / entre 1 et 5 ans / à plus de 5 ans).

Vérification faite sur `public/demo/demo_export_multi.xlsx` : le champ `Mt Restant Du Reel` d'une ligne d'échéancier représente le capital restant dû **avant** que cette échéance précise soit payée (= montant initial − cumul du capital remboursé sur toutes les lignes précédentes). Cette vérification a permis de simplifier la formule du CRD demandée par l'utilisateur (cf. §3) en l'identité comptable standard : `CRD = Montant − Capital remboursé cumulé`.

L'app n'a aucun mécanisme d'export Excel existant (seulement PDF via `generatePdf.js`/pdfmake, déclenché depuis `ExportTab.jsx`). L'export de ce nouveau tableau est donc scopé au PDF, en réutilisant ce mécanisme existant.

## Périmètre

- Concerne uniquement l'ajout d'une nouvelle vue dans l'onglet Emprunts existant, à l'écran et en export PDF.
- Pas de nouvelle entrée de navigation globale (`SideNav.jsx`/`App.jsx`/`AdminPanel.jsx` non modifiés).
- Pas d'export Excel (hors périmètre — fonctionnalité transverse qui n'existe pas dans l'app).
- La notion d'intérêts courus est explicitement omise (demande utilisateur).
- Le filtre "en cours uniquement" reste basé sur `emprunt.situation` (valeur du fichier importé), indépendant de la date de période choisie.

## Conception

### 1. Sous-onglet local dans `EmpruntsTab.jsx`

Ajout d'un sélecteur de vue local (state React `useState`, pas le store global — `SubTabNav`/`activeSubTab` existants sont câblés en dur sur la section `monthly` et ne sont pas réutilisables ici sans la modifier) :

```js
const [view, setView] = useState('registre'); // 'registre' | 'crd5ans'
```

Deux boutons en haut de l'onglet ("Registre" / "CRD à 5 ans"), style cohérent avec les `ToggleButton` déjà présents dans ce fichier. Vue par défaut : `'registre'` (comportement actuel inchangé). Le bloc de filtres actuel (recherche, montant, dates, banque, catégorie, toggle "en cours") et `EmpruntsTable` restent affichés uniquement quand `view === 'registre'`.

Quand `view === 'crd5ans'`, affichage de :
- un champ `<input type="date">` "À la date du", pré-rempli avec `bilanCRData?.dateFin` (exercice N, déjà dans le store) formaté en `YYYY-MM-DD`, sinon la date du jour ; modifiable librement par l'utilisateur (state local) ;
- une recherche texte (sur `nEmprunt` / `designation` / `ancienCode`) ;
- le toggle "Emprunts en cours uniquement" (activé par défaut) ;
- le nouveau tableau `EmpruntsCrd5AnsTable`.

Un seul écran d'import (`UploadPrompt`) reste partagé entre les deux vues — inchangé.

### 2. Colonnes du tableau "CRD à 5 ans"

Nouveau fichier `src/components/emprunts/EmpruntsCrd5AnsTable.jsx`, sur le modèle de `EmpruntsTable.jsx` (réutilise `SortableTh`, `sortRows`, `nextSortState`, `formatAmountFull`, `formatPercent`, `formatDate`).

| Colonne | Clé | Source / calcul |
|---|---|---|
| N° Emprunt | `nEmprunt` | `emprunt.nEmprunt` |
| Référence | `reference` | `emprunt.ancienCode` |
| Libellé | `designation` | `emprunt.designation` |
| Date de réalisation | `dateRealisation` | `emprunt.dateRealisation` |
| Durée | `duree` | `emprunt.duree` (années) |
| Période | `periode` | `emprunt.annuite` décodé : `A`→Annuel, `M`→Mensuel, `T`→Trimestriel, `S`→Semestriel, sinon valeur brute affichée telle quelle |
| Taux | `taux` | `emprunt.taux` |
| Montant de l'emprunt | `montant` | `emprunt.montant` |
| Capital remboursé | `capitalRembourseCumule` | calculé, §3 |
| Intérêts réglés | `interetsReglesCumule` | calculé, §3 |
| Capital restant dû | `capitalRestantDu` | calculé, §3 |
| Capital à rembourser < 1 an | `capitalMoins1An` | calculé, §3 |
| Capital à rembourser 1 à 5 ans | `capitalEntre1Et5Ans` | calculé, §3 |
| Capital à rembourser > 5 ans | `capitalPlusDe5Ans` | calculé, §3 |

Clic sur une ligne → ouvre `EmpruntDetailPanel` existant (même comportement que la vue Registre, état `selectedRow` partagé entre les deux vues ou dupliqué localement — à trancher en plan selon simplicité d'implémentation).

### 3. Calcul — nouvelle fonction dans `empruntsUtils.js`

```js
/**
 * @param {object[]} emprunts
 * @param {object[]} lignesEmprunt
 * @param {Date|string} dateFin — date de fin de période demandée
 * @returns {object[]} emprunts enrichis des champs calculés ci-dessous
 */
export function computeCrd5Ans(emprunts, lignesEmprunt, dateFin) { ... }
```

Pour chaque emprunt, sur ses lignes (`lignesEmprunt.filter(l => l.nEmprunt === emprunt.nEmprunt)`) :

```
pour chaque ligne :
  dateLigne     = ligne.dateReelle ?? ligne.datePrevue
  capitalLigne  = ligne.mtCapitalReel ?? ligne.mtCapitalPrev
  interetLigne  = ligne.mtInteretReel ?? ligne.mtInteretPrev

lignes passées (dateLigne <= dateFin) :
  capitalRembourseCumule = somme(capitalLigne)
  interetsReglesCumule   = somme(interetLigne)

capitalRestantDu = emprunt.montant - capitalRembourseCumule

lignes futures (dateLigne > dateFin), bornes glissantes depuis dateFin :
  capitalMoins1An      = somme(capitalLigne) où dateLigne <= dateFin + 1 an
  capitalEntre1Et5Ans   = somme(capitalLigne) où dateFin + 1 an < dateLigne <= dateFin + 5 ans
  capitalPlusDe5Ans     = somme(capitalLigne) où dateLigne > dateFin + 5 ans
```

Toute ligne dont `dateLigne <= dateFin` compte dans le cumul, qu'elle soit validée ou non (pas de filtre sur le champ `Valide`) — montant Réel utilisé si présent, sinon Prévisionnel. Un emprunt sans aucune ligne d'échéancier renvoie tous les champs calculés à 0, sauf `capitalRestantDu` = `montant`.

Les fenêtres "< 1 an" / "1-5 ans" / "> 5 ans" sont glissantes depuis `dateFin` (date + 1 an, date + 5 ans), pas des années calendaires.

### 4. Export PDF

- Nouveau document `emprunts_crd5ans` dans `ALL_DOCS` (`src/components/export/ExportTab.jsx`), `requiresExploitation: true`.
- Entrée correspondante dans `DOC_LABELS` (`generatePdf.js`).
- Nouvelle fonction `buildEmpruntsCrd5AnsContent(exploitationData, bilanCRData, chartW)` dans `generatePdf.js`, sur le modèle de `buildEmpruntsContent` existant (même style de tableau, mêmes colonnes que §2).
- Date utilisée pour le calcul en export : `bilanCRData?.dateFin` (exercice N) si disponible, sinon la date du jour — pas de sélecteur de date dans `ExportTab` pour cette première version (le flux d'export n'a pas d'UI interactive par document, contrairement à l'écran).

### 5. Tests

Extension de `src/__tests__/empruntsUtils.test.js` pour `computeCrd5Ans` :
- cumul capital/intérêts correct à une date pile sur une échéance (limite inclusive) ;
- repli sur le montant Prévisionnel quand le Réel est absent (ligne future) ;
- `capitalRestantDu = montant - capitalRembourseCumule` ;
- bornes exactes des fenêtres glissantes (pile à dateFin+1an, pile à dateFin+5ans) ;
- emprunt sans aucune ligne → tous les champs calculés à 0 sauf `capitalRestantDu = montant`.

## Hors périmètre

- Export Excel.
- Notion d'intérêts courus.
- Filtres avancés (banque, catégorie, montant, plage de dates) sur la vue "CRD à 5 ans" — restent propres à la vue "Registre".
- Sélecteur de date interactif dans le flux d'export PDF.
