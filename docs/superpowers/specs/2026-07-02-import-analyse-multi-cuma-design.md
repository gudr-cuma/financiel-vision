# Import & Analyse multi-CUMA — Design

**Date** : 2026-07-02
**Statut** : validé (design), en attente de plan d'implémentation

## 1. Objectif

Importer l'onglet `global` du classeur d'analyse multi-CUMA (ex.
`AGCO af2024_v_251219_1230.xlsm`) et l'exploiter dans une nouvelle section de
l'application, sur le même modèle que les fonctionnalités existantes basées sur
un fichier Excel (Export Multi → Matériels/Emprunts/…).

Deux vues :

1. **Données** — le tableau brut des CUMA, avec recherche, regroupements
   repliables et une colonne de catégorie recalculée (tranche de CA).
2. **Synthèse** — deux tableaux croisés par tranche de CA, reproduisant les
   deux tableaux fournis en référence.

## 2. Contexte & invariants

- Le fichier benchmark contient les données financières d'environ 1400 CUMA.
  Comme le FEC, **il ne quitte jamais le navigateur** : aucune donnée n'est
  envoyée ou stockée côté serveur. Import en mémoire de session uniquement
  (pas de persistance `.clario`, pas de D1), cohérent avec le bloc
  `exploitationData` (Export Multi).
- La fonctionnalité réutilise les patterns existants : `UploadPrompt`
  (composant partagé), un bloc de store calqué sur `exploitationData`, la
  navigation par section (`SideNav` + `activeSection`) et le moteur de
  sous-onglets du Tableau de bord (une `TabNav` locale).

## 3. Structure du fichier source (onglet `global`)

- Plage `A1:CB3240`, **en-têtes en ligne 1**.
- Colonnes clés (index 0-based) :
  - `0` classe (valeurs `a`…`f`)
  - `1` Dpt (12 départements : 14, 22, 27, 29, 35, 44, 49, 50, 56, 61, 76, 85)
  - `2` Region (`PDL`, `NOR`, `BZH`)
  - `3` InterR
  - `4` **nom de la CUMA** (en-tête littéral trompeur « 118 CUMA »)
  - `7` **CA** (base du calcul de tranche)
  - ~60 colonnes de valeurs et de ratios déjà calculés par ligne.
- **1405 lignes CUMA réelles** après exclusion des lignes de synthèse
  intercalées. Chaque ligne est une CUMA unique (clé nom|dpt|CA → 1405 clés
  distinctes ; pas de doublon structurel). Classe/Dpt/Region toujours
  renseignés → regroupement direct sans dédoublonnage.

### Lignes à exclure (col. E)

Insensible à la casse et aux espaces, exclure les libellés :
`Total`, `Moyenne`, `1er quartile`, `3ème quartile`, `Nb Cuma concernées`
(tout libellé commençant par « Nb Cuma »), ainsi que les lignes sans nom.

### Colonne recalculée « Catégorie » (tranche de CA, col. H)

| Tranche          | Condition (CA)          |
|------------------|-------------------------|
| `< 10 000€`      | CA < 10 000             |
| `10 à 50 000€`   | 10 000 ≤ CA < 50 000    |
| `50 à 80 000€`   | 50 000 ≤ CA < 80 000    |
| `80 à 130 000€`  | 80 000 ≤ CA < 130 000   |
| `> 130 000€`     | CA ≥ 130 000            |

Borne basse incluse. Ordre d'affichage fixe (du plus petit au plus grand).

## 4. Import & parsing

Nouveau `src/engine/parseGlobalMultiCuma.js` (modèle `parseExportMulti.js`) :

- Point d'entrée synchrone testable `parseGlobalMultiCumaBuffer(arrayBuffer)`
  + wrapper `parseGlobalMultiCuma(file)`.
- Lit **uniquement l'onglet `global`** ; erreur explicite si l'onglet est
  absent.
- Lecture en mode `header:1`. Construit une map header→index depuis la ligne 1,
  puis résout chaque colonne métier via une **table d'alias explicite**
  (`{ headerExact → champInterne }`) plutôt que par normalisation générique
  (les en-têtes sont irréguliers : `118 CUMA`, `% Amortis./ CA`, …). Repli sur
  l'index fixe si un en-tête change entre versions. Nom de CUMA = colonne dont
  l'en-tête contient « CUMA » (repli index 4).
- Exclut les lignes de synthèse (cf. §3) et les lignes sans nom.
- Ajoute `categorie` à chaque ligne (cf. table des tranches).
- Retourne `{ importedAt, fileName, rows }` où `rows` est un tableau d'objets à
  clés internes stables + `categorie`.

Store (`src/store/useStore.js`) — nouveau bloc calqué sur `exploitationData` :

- État : `multiCumaData` (null par défaut), `isLoadingMultiCuma`,
  `errorMultiCuma`.
- Actions : `loadMultiCuma(file)` (async, parse + set),
  éventuellement `loadDemoMultiCuma()` si un petit jeu de démonstration est
  fourni (optionnel, v2).
- En mémoire de session uniquement.

## 5. Section & navigation

Nouvelle section latérale **« Analyse multi-CUMA »** (icône 🌐).

- `src/components/layout/SideNav.jsx` : ajouter
  `{ id: 'multiCuma', icon: '🌐', label: 'Analyse multi-CUMA' }` (gérée par
  `hasPermission`, comme les autres modules).
- `src/App.jsx` : `import MultiCumaTab` + route
  `{activeSection === 'multiCuma' && <MultiCumaTab />}`.
- `MultiCumaTab.jsx` : coquille de section. Si `!multiCumaData` → `UploadPrompt`
  (accept `.xlsx,.xls,.xlsm`, `onFile={loadMultiCuma}`,
  `canUpload={canUploadFile}`, `error={errorMultiCuma}`). Sinon, moteur de
  sous-onglets local (état React local, pas de store global) : **Données** /
  **Synthèse**, rendu via une `TabNav` de même style que le Tableau de bord.

## 6. Onglet « Données »

- **Recherche** par nom de CUMA (col. E) : champ texte, filtrage instantané
  (insensible casse/accents).
- **Regroupements** : toggles indépendants **Classe / Dpt / Region /
  Catégorie (tranche CA)**. Combinables (un, plusieurs ou tous) → arbre
  imbriqué **repliable** (chevron par nœud de groupe, avec compteur de CUMA et
  sous-total). L'ordre des niveaux suit l'ordre d'activation.
- Nouveau helper `groupMultiLevel(rows, keyFns)` dans `src/engine/tableUtils.js`
  (l'actuel `groupRows` ne gère qu'un seul niveau) : produit un arbre de nœuds
  `{ key, label, rows, children?, subtotal }`. État de repli géré par le
  composant (Set d'identifiants de nœuds).
- **Colonnes** : toutes les colonnes métier nommées de `global`, avec
  **Catégorie** insérée juste après CA. Formatage € / % / entiers.
  - Colonnes purement techniques exclues par défaut : `code salarie`,
    `num gestion`, colonnes de détail de compte (84xx, 49xx, 81xx, 653x,
    6581), `inv 2019/2020/…`.
  - La liste des colonnes affichées vit dans **un seul fichier de config**
    (`src/domain/multiCuma/columns.js`) → facile à étendre/réduire.
  - Défilement horizontal ; colonne « nom » figée à gauche.
- `MultiCumaDataTab.jsx` (état : recherche, regroupements actifs, replis) +
  `MultiCumaDataTable.jsx` (rendu de l'arbre groupé + lignes).

## 7. Onglet « Synthèse » (deux tableaux)

En tête de vue :

- **Filtres** Région / Dpt / Classe : le pivot se recalcule sur le
  sous-ensemble filtré. (La recherche par nom n'affecte pas le pivot.)
- **Bascule de calcul** : « Moyenne simple » ⇄ « Ratio des totaux (pondéré) ».

Chaque tableau = une ligne par tranche de CA (ordre fixe) + une ligne
**Total** (agrégat sur l'ensemble filtré).

### Méthode de calcul (config de métriques)

Logique dans `src/domain/multiCuma/synthese.js`, pilotée par une config
`{ label, source, format, num?, denom? }` par colonne :

- **Moyenne simple** (défaut) : `moyenne(source)` sur les CUMA de la tranche.
  Pour les colonnes de ratio, on moyenne les pourcentages déjà présents par
  ligne. Reproduit les lignes « Moyenne » du fichier source (vérifié) et le
  screenshot de référence (recalcul du Carburant Total = 8097 € concordant).
- **Pondéré** : pour une colonne de ratio disposant de `num`/`denom`,
  `Σ(num) / Σ(denom)`. Les colonnes de valeurs absolues (CA, Carburant, CS,
  Créances, FDR…) restent en moyenne dans les deux modes. Si un ratio n'a pas
  de `num`/`denom` fiable, le mode pondéré retombe sur la moyenne des ratios.

### Mapping colonnes → source `global` (index)

**Tableau 1**

| Colonne pivot            | source | num / denom (pondéré) |
|--------------------------|--------|-----------------------|
| CA                       | 7      | —                     |
| Rés. Courant             | 10     | —                     |
| Rés. Excépt.             | 11     | —                     |
| Rés. Net                 | 12     | —                     |
| % Entretien / CA         | 13     | 14 / 7                |
| % Amortis. / CA          | 15     | 16 / 7                |
| % Ch. Salariales / CA    | 18     | 19 / 7                |
| Carburant                | 20     | —                     |
| Frais Financier / CA     | 21     | 22 / 7                |
| Nombre dossiers          | count  | —                     |
| Répartition CUMA par CA  | count ÷ total (somme = 100 %) | — |

**Tableau 2**

| Colonne pivot                | source | num / denom (pondéré) |
|------------------------------|--------|-----------------------|
| Fonds roulement              | 52     | —                     |
| Fonds roulement / CA         | 51     | 52 / 7                |
| % Cap Propres / Passif       | 35     | 34 / 36               |
| CS                           | 30     | —                     |
| Capital soc / CA             | 29     | 30 / 7                |
| % Taux d'endettement         | 37     | 38 / 34 (défaut, cf. note) |
| Créances                     | 27     | —                     |
| % Créances / CA              | 26     | 27 / 7                |
| % CS / Val. Brute Matériel   | 31     | 30 / 32               |

- « Fonds roulement » = col. 52 (`Fond de roulement`) + col. 51
  (`Fond roulement / CA`) — **validé**.
- **Note à vérifier en implémentation** : dénominateur du « % Taux
  d'endettement » (capitaux propres col. 34 par défaut, éventuellement passif
  col. 36). À contrôler empiriquement sur les données lors du TDD ; en cas de
  doute, le mode pondéré retombe sur la moyenne des ratios. La correction se
  limite à une ligne de la config de métriques.

`SynthesePivotTable.jsx` : rendu générique réutilisé pour les deux tableaux
(en-têtes bleus, ligne Total, formatage, style charte). `MultiCumaSynthese.jsx`
gère filtres + bascule + calcule les deux jeux de lignes.

## 8. Droits / permissions (module à part entière)

La section est un module géré comme les autres dans les droits utilisateur
(une coche par utilisateur dans l'admin) :

- `functions/_lib/validate.js` : ajouter `'multiCuma'` à `VALID_SECTIONS`
  (whitelist backend).
- `src/components/admin/AdminPanel.jsx` : ajouter
  `{ id: 'multiCuma', label: 'Analyse multi-CUMA' }` à `ALL_SECTIONS` (affiche
  la coche).
- `src/components/layout/SideNav.jsx` : section gérée par
  `hasPermission('multiCuma')`.
- Aucune migration D1 : les permissions sont stockées par valeur de section,
  pas par colonne. L'admin accorde la coche après déploiement.

## 9. Fichiers créés / modifiés

**Créés**

- `src/engine/parseGlobalMultiCuma.js`
- `src/domain/multiCuma/tranches.js` (catégorisation + libellés + ordre)
- `src/domain/multiCuma/columns.js` (config des colonnes de la vue Données)
- `src/domain/multiCuma/synthese.js` (config des métriques + calcul des pivots)
- `src/components/multiCuma/MultiCumaTab.jsx`
- `src/components/multiCuma/MultiCumaDataTab.jsx`
- `src/components/multiCuma/MultiCumaDataTable.jsx`
- `src/components/multiCuma/MultiCumaSynthese.jsx`
- `src/components/multiCuma/SynthesePivotTable.jsx`
- Tests : `src/__tests__/parseGlobalMultiCuma.test.js`,
  `multiCumaTranches.test.js`, `multiCumaSynthese.test.js`,
  `groupMultiLevel.test.js`

**Modifiés**

- `src/store/useStore.js` (bloc multiCuma)
- `src/engine/tableUtils.js` (`groupMultiLevel`)
- `src/components/layout/SideNav.jsx` (entrée de section)
- `src/App.jsx` (route)
- `functions/_lib/validate.js` (`VALID_SECTIONS`)
- `src/components/admin/AdminPanel.jsx` (`ALL_SECTIONS`)

## 10. Tests (TDD)

- **Parsing** : onglet `global` requis ; exclusion des lignes de synthèse ;
  résolution des colonnes par alias ; attribution `categorie` ; nombre de
  lignes attendu sur un échantillon.
- **Tranches** : tests de bornes (9 999 / 10 000 / 49 999 / 50 000 / 79 999 /
  80 000 / 129 999 / 130 000).
- **groupMultiLevel** : 1, 2 et 3 niveaux ; sous-totaux ; nœuds vides.
- **Synthèse** : moyenne simple vs pondéré ; comptes par tranche ; répartition
  somme à 100 % ; ligne Total ; recalcul sur sous-ensemble filtré.

## 11. Points hors périmètre (YAGNI)

- Pas d'export PDF/PPTX de ces vues en v1.
- Pas de persistance de l'import (ré-import à chaque session).
- Pas de jeu de démonstration en v1 (optionnel ultérieurement).
- Pas de graphiques ; tableaux uniquement (conforme aux références fournies).
