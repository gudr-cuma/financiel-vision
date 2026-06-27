# Édition « Liste des amortissements » — Design

Date : 2026-06-27
Statut : validé (brainstorming)

## Objectif

Reproduire dans Clario Vision le **contenu** de l'édition Divalto Comptabilité
« Liste des amortissements » (programme `ccii746_snew2`), telle que livrée en PDF
(`amort211295.pdf`, dossier CROIX 211395). On reproduit le contenu du tableau, pas
la mise en page d'origine, et **on conserve la rupture par compte d'immobilisation**.

L'édition comporte deux tableaux :
1. **Liste des amortissements** — biens amortissables, groupés (rupture) par compte
   d'immobilisation, avec colonnes d'amortissement, blocs de totaux par compte et
   un total général tous comptes.
2. **Tableau des cessions** — biens cédés dans l'exercice.

## Source de données — découverte clé

Données : fichier `Export_Multi` déjà parsé par `parseExportMulti.js`
(`exploitationData.immobilisations` = feuille **I1**, `exploitationData.immoLignes`
= feuille **I2**).

**`I2` est la source de vérité pour l'amortissement.** La feuille `I1` est peu
fiable : ses colonnes `ecoMtTotal` / `ecoMtResiduel`, et même `valeurEntree` pour
certains biens, sont corrompues (constaté sur le bien 104 : I1 annonce VNC 5 500 €
alors que PDF + I2 donnent 2 114,36 €). **On ne lit jamais les agrégats
d'amortissement dans I1.** I1 ne sert que pour : `valeurEntree` (coût), `libelle`,
`compteImmo`, `axe1`, `ecoMethode`, `ecoDuree`, `dateAcquisition`,
`dateMiseEnService`, `dateCession`, `mtCession`.

### Validation contre le PDF

Reconciliation sur les 85 biens du PDF (coût PDF + VNC via I2) : coût 2 839 963,10,
amortissement cumulé 1 021 860,72, VNC 1 818 102,38 — **identiques au PDF au centime**.

Le fichier `demo_export_multi.xlsx` (entête anonymisé « TEST / 999001 ») diverge
volontairement du PDF sur **exactement 3 biens** (retouches d'anonymisation) :

| # | Bien | Anomalie |
|---|---|---|
| 97 | TRACTEUR JD 6125 | `I1.valeurEntree` = 63 000 (faux) ; vrai coût 61 000 (PDF + I2). |
| 98 | EPANDEUR FUMIER 3300 N°1 | Présent dans l'export, absent du PDF (bien ajouté). |
| 99 | EPANDEUR FUMIER 3300 N°2 | Idem. |

La vue reproduit fidèlement **l'export**, donc différera du PDF sur ces 3 lignes —
comportement attendu et acté.

## Architecture

Moteur de calcul pur + vue d'affichage (séparation calcul / rendu, testable au centime).

### Emplacement & navigation

L'onglet **Immobilisations** devient un conteneur à 2 sous-onglets :
- **« Registre »** — le tableau exploratoire actuel (code existant déplacé tel quel).
- **« Liste des amortissements »** — la nouvelle édition.

Pattern de sous-onglets **identique à `EmpruntsTab`** (« Registre » | « CRD à 5 ans ») :
état `view` local (`'registre' | 'amortissements'`) + barre de sous-onglets inline
(soulignement vert `#31B700`, libellé gras sur l'onglet actif). Pas de hub `LivresTab`.

Même `exploitationData` déjà chargé ; pas de nouvel upload. L'état « export multi non
chargé » reste géré par le `UploadPrompt` existant au niveau du conteneur.

### Moteur — `src/engine/computeAmortissementEdition.js`

**Entrée** : `exploitationData` (immobilisations = I1, immoLignes = I2, `synthese`
pour les bornes d'exercice `dateDebutExercice` / `dateFinExercice`).

**Sortie** :

```
{
  exercice: { debut, fin },
  comptes: [{
    compte: '21450000', libelle: 'Agencements',
    racineImmo: '2145', racineAmort: '28145',
    biens: [{ nBien, designation, axe, mode, dateAcq, dateMes, duree,
              cout, anterieur, base, dotation, total, vnc }],
    totaux: { cout, anterieur, base, dotation, total, vnc,
              acquisitionsExercice, acquisitionsAnterieures,
              soldeImmo, soldeNet }
  }],
  totalGeneral: { cout, anterieur, base, dotation, total, vnc },
  cessions: [{
    compte, libelle,
    biens: [{ nBien, designation, axe, dateAcq, duree, cout,
              anterieur, base, dotation, total, vnc,
              dateCession, prixCession, plusMoinsValue,
              fiscalTotal, derogatoire }],
    totaux: { ... }
  }]
}
```

**Calcul par bien (liste amortissements)** :

- `cout = i1.valeurEntree`
- `mode` ← `i1.ecoMethode` (`1` → `'L'` linéaire ; autres valeurs mappées si rencontrées)
- `duree = i1.ecoDuree`, `axe = i1.axe1`
- `vncFin` = `I2.residuel` à la clôture de l'exercice **courant** (`dateFinExo` dont
  l'année = année de `exercice.fin`)
- `base` (= VNC début) = `I2.residuel` à la clôture de l'exercice **précédent** ;
  **ou `cout`** si le bien est acquis dans l'exercice (pas de ligne I2 antérieure)
- `anterieur = cout − base`
- `dotation = base − vncFin`
- `total = cout − vncFin` ( = `anterieur + dotation` )

**Racines de compte** :
- `racineImmo = compte.slice(0, 4)` (ex. `2145`, `2154`)
- `racineAmort = '28' + compte.slice(1, 4)` (ex. `21450000` → `28145`)

**Libellés de compte** : table PCG immo en dur, extensible :
`2145 → Agencements`, `2154 → Matériels industriels`,
`21541000 → Matériels agricoles`, `21542000 → Accessoires matériel`.
Fallback = numéro de compte si absent de la table.

**Filtres / regroupement** :
- Liste amortissements = biens **non cédés** (`dateCession` vide), groupés par `compteImmo`,
  triés par **`nBien` croissant** au sein de chaque compte.
- Blocs de totaux par compte : sommes des colonnes + `acquisitionsExercice`
  (Σ coût des biens dont `dateAcquisition` ∈ exercice), `acquisitionsAnterieures`
  (Σ coût des biens acquis avant), `soldeImmo` (= Σ coût = solde du compte immo brut),
  `soldeNet` (= Σ VNC au 31/12).
- Total général = agrégation tous comptes.

**Tableau des cessions** :
- Biens avec `dateCession` ∈ [exercice.debut, exercice.fin].
- `prixCession = i1.mtCession`
- VNC / dotation à la cession calculés comme ci-dessus (I2).
- `plusMoinsValue = prixCession − vnc`
- **Fiscal = économique** : l'amortissement fiscal est calculé sur la **même durée**
  que l'économique → `fiscalTotal = total` (économique) et **`derogatoire = 0`**.
  La colonne « D.fisc » de l'édition reflète donc l'économique.

### Vue — `src/components/immobilisations/AmortissementEditionView.jsx`

Rendu pur à partir de la sortie du moteur :
- Une section par compte : en-tête compte (n° + libellé + racines 2145 / 28145),
  lignes biens, puis bloc de totaux du compte.
- Ligne de total général.
- Tableau des cessions en dessous.

Réutilise `formatUtils` (`formatAmountFull`, `formatDate`, `formatPercent`) et les
conventions de style des tables existantes.

### Export PDF — `src/engine/generatePdf.js` + `ExportTab.jsx`

Ajout d'une section au module d'export PDF, en **réutilisant le même moteur**
`computeAmortissementEdition` (calcul partagé écran ↔ PDF) :

- Nouvelle clé doc `amortissements` dans `DOC_LABELS`
  (libellé « Liste des amortissements »).
- Nouveau builder `buildAmortissementEditionContent(exploitationData, chartW)` qui
  appelle le moteur et produit le contenu pdfmake (sections par compte + totaux +
  cessions), sur le modèle de `buildImmobilisationsContent` / `buildEmpruntsCrd5AnsContent`.
- Enregistrement dans le dispatch des builders (`immobilisations` / `emprunts` …) et
  ajout de l'entrée sélectionnable dans `ExportTab.jsx`.

### Conteneur — `src/components/immobilisations/ImmobilisationsTab.jsx`

Refactor en conteneur à sous-onglets (barre de sous-onglets calquée sur `LivresTab`).
Le contenu actuel de `ImmobilisationsTab` est extrait dans un composant
`RegistrePane` (sous-onglet « Registre ») ; le nouveau sous-onglet rend
`AmortissementEditionView`. Le `UploadPrompt` (état non chargé) reste au niveau du
conteneur.

## Tests — `src/engine/__tests__/computeAmortissementEdition.test.js`

Fixtures dérivées de `demo_export_multi.xlsx`. Assertions au centime :

- Compte 21450000 : coût 41 759,49 / amort total 35 556,79 / VNC 6 202,70 / dotation 886,10.
- Bien 104 (HOUE) : antérieur 13 779,50 / base 3 523,94 / dotation 1 409,58 / VNC 2 114,36.
- Bien 150 (TRACTEUR JD 6R195) : dotation 886,10 / VNC 6 202,70.
- Bien acquis dans l'exercice (ex. 166 EPANDAGE) : antérieur 0 / dotation = total.
- Cession bien 135 (TRACTEUR JD 6215 R) : plus/moins-value −11 715,66 ; dérogatoire 0.
- Dérivation des racines : `21450000` → `2145` / `28145` ; `21540000` → `2154` / `28154`.

## Limitations connues (actées)

- **Dérogatoire / fiscal** : l'export ne fournit que l'amortissement économique
  (`Eco -`). Convention retenue : fiscal = économique (même durée), donc dérogatoire = 0.
- Le fichier `demo` diverge du PDF sur les biens 97 / 98 / 99 (anonymisation) ; la vue
  reproduit l'export, pas ce PDF précis sur ces lignes.

## Hors périmètre (YAGNI)

- Aucun moteur de recalcul d'amortissement (dates → dotation) : on lit les valeurs de I2.
- Aucune écriture serveur : l'invariant « les données comptables ne quittent pas le
  navigateur » est préservé (calcul 100 % client-side).
