# Corrections — Emprunts / Immobilisations / Matériels / Capital social / Menu / Fiche de synthèse

Date : 2026-06-22

## Contexte

L'écran "Export Multi" (Emprunts, Immobilisations, Capital social, Matériels, Fiche de synthèse) a été développé avec des tableaux "pleine largeur" (toutes les colonnes Excel) et des filtres sans libellé, ce qui rend la lecture difficile (cf. capture d'écran : filtres de date qui se chevauchent visuellement, sans indication de ce qu'ils filtrent). L'objectif de cette série de corrections est de :
- clarifier les filtres (libellés explicites) ;
- passer Emprunts/Immobilisations/Matériels à un pattern "tableau resserré + fiche détaillée dans un panel élargi" (cohérent avec le panel de détail déjà existant pour le SIG) ;
- ajouter des indicateurs chiffrés utiles (capital restant dû, actifs en cours, totaux) ;
- nettoyer le menu (renommage, réordonnancement) ;
- aligner la Fiche de synthèse sur le pattern "champs éditables persistés en `.clario`" déjà utilisé par le Dossier de gestion.

Décisions de calcul validées avec l'utilisateur :
- **Capital restant dû (Emprunts)** : pour chaque emprunt en `situation === 4`, prendre la ligne la plus récente de l'onglet *Lignes* (triée comme dans `EmpruntDetailPanel.jsx` : `exercice` puis `nLigne`), valeur = `mtRestantDuReel` (repli sur `mtRestantDuPrev` si absent), puis sommer entre emprunts.
- **Immobilisation "active"** : `etat === 1`.
- **Immobilisation "non amortie"** : `position === 1`.
- **Matériel "en cours d'usage"** : `dateVente` vide.
- **Panel de détail Matériel** : fiche seule (cadre avec toutes les colonnes), pas de second tableau — aucune source de données de détail (type "Lignes"/"I2") n'existe pour les matériels.

## 1. Libellés sur les filtres (Emprunts + Immobilisations)

Composant partagé `src/components/shared/FilterField.jsx` (`label` + `children`, style cohérent avec `RangeFilterInput`), utilisé pour envelopper chaque filtre dans :
- `EmpruntsTab.jsx` : libellés "Recherche", "Montant", "Date de réalisation", "1ère échéance", "Banque", "Catégorie".
- `ImmobilisationsTab.jsx` : libellés "Recherche", "Date d'effet amort.", "Date d'acquisition", "Axe 1", "Fournisseur", "Regroupement".

Réutilisé aussi pour le filtre des Matériels (point 6).

## 2. Emprunts

**Tableau** — `EmpruntsTable.jsx` : `EMPRUNTS_COLUMNS` réduit à `nEmprunt, designation, montant, taux, dateRealisation, premiereEcheance, derniereEcheance, duree, dureeMois, annuite`. Les autres champs (situation, banque, catégorie, etc.) restent dans les données pour les filtres/calculs, seulement retirés de l'affichage. Nouvelle constante `EMPRUNT_FICHE_FIELDS` (24 champs d'origine) pour la fiche.

**Panel de détail** — `EmpruntDetailPanel.jsx` : deux sections empilées — fiche emprunt en haut (cadre libellé/valeur, tous les champs), tableau des lignes d'échéancier en dessous (inchangé).

**Élargissement du panel** — `SlideOverPanel.jsx` : nouvelle prop `width` (défaut `'min(640px, 92vw)'`). `EmpruntDetailPanel` passe `width="min(960px, 95vw)"` (+50 %).

**Widgets + filtre** — `EmpruntsTab.jsx` :
- Nouveau module `src/engine/empruntsUtils.js` (+ test `src/__tests__/empruntsUtils.test.js`) : `getCapitalRestantDu(emprunts, lignesEmprunt, situation = 4)`, `countEmpruntsEnCours(emprunts, situation = 4)`.
- Deux `MiniStatCard` (nouveau composant partagé `src/components/shared/MiniStatCard.jsx`) : "Capital restant dû" et "Emprunts en cours".
- Toggle "Emprunts en cours uniquement", actif par défaut, filtrant sur `situation === 4`.

## 3. Immobilisations

**Tableau** — `ImmobilisationsTable.jsx` : `IMMOBILISATIONS_COLUMNS` réduit à `nBien, axe1, libelle, dateAcquisition, dateMiseEnService, valeurEntree, dateDebutAmort, valeurResiduelle, typeImmoCOG, codeNational`. Nouvelle constante `IMMOBILISATION_FICHE_FIELDS` (44 champs d'origine) pour la fiche.

**Panel de détail** — `ImmobilisationDetailPanel.jsx` : fiche immobilisation en haut + tableau I2 existant en dessous. Largeur `min(960px, 95vw)`.

**Widgets + filtre** — `ImmobilisationsTab.jsx` :
- Trois `MiniStatCard` : "Immobilisations actives" (`count(etat === 1)`), "Non amorties" (`count(position === 1)`), "Valeur d'entrée (actives)" (`sum(valeurEntree)` où `etat === 1`).
- Toggle "Immobilisations actives uniquement", actif par défaut.

## 4. Menu (SideNav)

`SideNav.jsx` (tableau `SECTIONS`) :
- Libellé `'Capital social (registre)'` → `'Capital social'` (l'`id` `capitalSocialRegistre` ne change pas).
- Entrée `{ id: 'editions', ... }` déplacée en dernière position du tableau `SECTIONS`.

## 5. Capital social — totaux

- Deux `MiniStatCard` au-dessus du tableau (`qtSolde` et `montant` sommés).
- `<tfoot>` avec une ligne "Total" sommant chaque colonne numérique.
- Helper partagé `sumColumn(rows, key)` ajouté à `src/engine/tableUtils.js`, réutilisé par les cartes, la ligne de total et les widgets Immobilisations.

## 6. Matériels

**Tableau** — `MaterielsTable.jsx` : `MATERIELS_COLUMNS` réduit à `codeMateriel, baseSref1, libelle, note, joint, codeNational, marque, libMarque, immatriculation, dateAchat, mtAchat, typeAchat, dateGarantie, dateVente, codeAnalytique` (`note`/`joint` nouvellement déclarées). Nouvelle constante `MATERIEL_FICHE_FIELDS`.

**Panel de détail** (nouveau) — `src/components/materiels/MaterielDetailPanel.jsx` : fiche seule (pas de second tableau), `width="min(960px, 95vw)"`.

**Intégration** — `MaterielsTab.jsx` : sélection de ligne + panel, toggle "Matériels en cours d'usage" actif par défaut (`dateVente` vide), libellés de filtre via `FilterField`.

## 7. Fiche de synthèse — champs éditables persistés

Pattern reproduit depuis `dossierData.overrides` :
- **Store** (`useStore.js`) : état `syntheseOverrides: {}` + action `updateSyntheseOverride(key, value)`, ajoutés à `reset()`.
- **Composant** (`FicheSyntheseTab.jsx`) : `InfoField` remplacé par `EditableField` (input contrôlé, valeur = override ?? source formatée). 6 champs auparavant codés en dur à `"—"` (adresse, code postal/ville, téléphone, SIRET, n° agrément, n° exploitation) + 3 autres (nb BL facturés, CS appelé/versé, CS appelé/non versé) deviennent éditables sur une clé dédiée, sans valeur source.
- **Persistance** (`sessionManager.js`) : `exportSession` ajoute `syntheseOverrides` à l'objet `session`.
- **Restauration** (`useStore.js — applySession`) : restaure `syntheseOverrides` depuis la session chargée.

## Vérification effectuée

- `npx vitest run` dans `financiel-vision/` : **126 tests passent** (9 fichiers), y compris le nouveau `empruntsUtils.test.js`.
- Vérification dans le navigateur (démo Export Multi) :
  - Emprunts : filtres libellés, toggle actif par défaut, cartes cohérentes (capital restant dû 498 188 €, 41 emprunts en cours), panel élargi avec fiche + lignes.
  - Immobilisations : cartes (124 actives, 109 non amorties, 4 793 898 € de valeur d'entrée), toggle actif, panel élargi avec fiche + lignes I2.
  - Matériels : tableau resserré, toggle actif (80 sur 209), panel fiche seule sans second tableau.
  - Capital social : cartes (35 008 / 70 016 €) cohérentes avec la ligne de total du tableau.
  - Menu : "Capital social" (sans "(registre)"), "Éditions" en dernière position.
  - Fiche de synthèse : champ modifié → exporté dans le `.clario` (`session.syntheseOverrides`) → restauré via `applySession()` → ré-affiché correctement.

## Point hors périmètre identifié pendant la vérification

Des avertissements React "duplicate key" apparaissent sur les tableaux Immobilisations/Matériels/Emprunts : les identifiants métier (`nBien`, `codeMateriel`, `nEmprunt`) utilisés comme clé React ne sont pas toujours uniques dans les données réelles. Pré-existant, non lié à ces changements (formule de clé non modifiée). Une tâche de suivi a été créée séparément (`task_b7ce8948`) pour fiabiliser ces clés (ex. `${id}-${idx}`) sans casser la logique de sélection de ligne.
