# Fix clés React + alerte doublons Export Multi

## Contexte

Les onglets Immobilisations, Matériels et Emprunts affichent des tableaux dont chaque ligne utilise `key={row.<identifiant> ?? idx}`. Sur le fichier de démo `Export_Multi` (`public/demo/demo_export_multi.xlsx`), la feuille **I1** (Immobilisations) contient des `N. Bien` dupliqués, et la feuille **Materiels** contient des `Code Matériel` dupliqués. React lève alors l'avertissement "Encountered two children with the same key" car la clé n'est pas unique.

Vérification de la cardinalité réelle (script Node ad hoc sur le fichier démo) :

| Feuille | Lignes totales | Valeurs distinctes (clé) | Groupes en doublon | Lignes concernées |
|---|---|---|---|---|
| I1 (Immobilisations) | 202 | 163 | 37 | 76 |
| Materiels | 209 | 202 | 7 | 14 |
| Emprunts | 101 | 101 | 0 | 0 |

Sur Immobilisations, les lignes dupliquées ne sont pas identiques — il s'agit de 2 ou 3 lignes par bien avec des dates/valeurs d'amortissement différentes (révisions d'exercice mal filtrées à l'export, probablement). Sur Matériels, les doublons sont quasi identiques (seule la date de vente diffère sur l'exemple observé).

L'utilisateur a validé que ces doublons sont anormaux du point de vue métier (l'export ne devrait pas produire plusieurs lignes pour un même identifiant) et souhaite :
1. corriger le bug React (clé non unique) sans casser la logique de sélection de ligne ;
2. informer visiblement l'utilisateur de l'anomalie : un bandeau en haut de page + un picto sur les lignes concernées.

## Périmètre

Concerne les 3 tableaux du module "Export Multi" : Immobilisations (clé `nBien`), Matériels (clé `codeMateriel`), Emprunts (clé `nEmprunt`). La détection est générique et s'applique aux 3, même si Emprunts n'a aucun doublon sur le jeu de démo — un futur export réel pourrait en avoir.

Hors périmètre : pas de correction des données sources, pas de déduplication automatique des lignes affichées (on les affiche toutes, on signale juste l'anomalie).

## Conception

### 1. Détection — `engine/tableUtils.js`

Nouvelle fonction pure :

```js
/**
 * Retourne une Map<valeur de clé, nombre d'occurrences> ne contenant que
 * les valeurs apparaissant plus d'une fois dans `rows`. Les valeurs
 * null/undefined/'' sont ignorées (pas de fausse alerte sur des lignes
 * sans identifiant).
 */
export function findDuplicateKeys(rows, key) { ... }
```

Calculée sur le jeu de données **brut complet** de chaque feuille (`exploitationData.immobilisations`, `.materiels`, `.emprunts`), avant tout filtre d'affichage (recherche, "actifs uniquement", etc.) — l'anomalie est une propriété de l'export, pas de la vue filtrée.

### 2. Clé React — fix minimal, non intrusif

Dans `ImmobilisationsTable.jsx`, `MaterielsTable.jsx`, `EmpruntsTable.jsx`, la clé de la ligne `<tr>` devient composite :

```js
key={`${row.nBien ?? 'na'}-${idx}`}      // Immobilisations
key={`${row.codeMateriel ?? 'na'}-${idx}`} // Matériels
key={`${row.nEmprunt ?? 'na'}-${idx}`}     // Emprunts
```

`idx` est l'index de la ligne dans le tableau `group.rows` / `rows` actuellement rendu — garanti unique pour le rendu React. **Aucun changement** sur la comparaison `selectedRow?.nBien === row.nBien` (et équivalents) utilisée pour la sélection/surbrillance et pour `onRowClick` — celle-ci continue de comparer sur l'identifiant métier, jamais sur la clé composite.

### 3. Bannière d'alerte

Extension de `components/shared/ErrorBanner.jsx` avec une prop optionnelle `action` :

```jsx
<ErrorBanner
  type="warning"
  message="…"
  action={{ label: '…', onClick: () => {} }}
/>
```

Le bouton d'action reprend le style des `ToggleButton` déjà présents dans les Tabs (cohérence visuelle), rendu à droite du message, dans la bannière existante.

Dans chaque Tab concerné (`ImmobilisationsTab`, `MaterielsTab`, `EmpruntsTab`) :

```js
const duplicateKeys = useMemo(() => findDuplicateKeys(immobilisations, 'nBien'), [immobilisations]);
const [duplicatesOnly, setDuplicatesOnly] = useState(false);
```

Si `duplicateKeys.size > 0`, une bannière s'affiche juste sous le titre de la page (avant les `MiniStatCard`) :

> ⚠️ **{N} numéro(s) de bien** apparaissent en double dans l'export ({M} lignes concernées) — ceci est anormal, vérifiez l'export auprès de votre éditeur comptable.
> [Afficher uniquement les doublons / Afficher tout]

Le bouton bascule `duplicatesOnly`. Quand actif, le filtre `result.filter(r => duplicateKeys.has(r.nBien))` s'applique **après** les filtres existants (recherche, dates, axe, etc.) et indépendamment du toggle "actifs uniquement" — l'utilisateur peut combiner les deux.

Libellés adaptés par tab :
- Immobilisations : "numéro(s) de bien" / clé `nBien`
- Matériels : "code(s) matériel" / clé `codeMateriel`
- Emprunts : "numéro(s) d'emprunt" / clé `nEmprunt`

### 4. Picto sur les lignes concernées

Dans `GroupSection` de chaque table (`ImmobilisationsTable`, `MaterielsTable`) et dans le rendu des lignes d'`EmpruntsTable`, nouvelle prop `duplicateKeys` (Map) transmise depuis le Tab via la Table. Devant la valeur affichée dans la cellule de la colonne clé :

```jsx
{duplicateKeys?.has(row.nBien) && (
  <Tooltip content={`${duplicateKeys.get(row.nBien)} lignes partagent ce numéro`}>
    <span style={{ color: '#E53935', marginRight: '4px', cursor: 'help' }} aria-hidden="true">⚠️</span>
  </Tooltip>
)}
{formatCell(row.nBien, 'number')}
```

Réutilise le composant `Tooltip` existant (`components/shared/Tooltip.jsx`). N'affecte ni le tri ni la sélection.

## Fichiers touchés

- `src/engine/tableUtils.js` (+ `findDuplicateKeys`)
- `src/components/shared/ErrorBanner.jsx` (+ prop `action`)
- `src/components/immobilisations/ImmobilisationsTable.jsx`, `ImmobilisationsTab.jsx`
- `src/components/materiels/MaterielsTable.jsx`, `MaterielsTab.jsx`
- `src/components/emprunts/EmpruntsTable.jsx`, `EmpruntsTab.jsx`
- `src/__tests__/tableUtils.test.js` (nouveau cas de test pour `findDuplicateKeys`)

## Tests

- Unitaire : `findDuplicateKeys` — tableau vide, aucun doublon, doublons multiples, valeurs null/undefined/'' ignorées.
- Manuel (dev server) : charger la démo Export Multi, vérifier dans la console navigateur la disparition de l'avertissement "two children with the same key" sur les 3 onglets ; vérifier l'affichage de la bannière + picto sur Immobilisations et Matériels ; vérifier l'absence de bannière sur Emprunts (démo actuelle sans doublon) ; vérifier que le bouton "Afficher uniquement les doublons" filtre correctement et que la sélection de ligne (clic, surbrillance, panneau détail) fonctionne toujours normalement.
