# Panel de détail des comptes — onglet « Bilan et CR » — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre les lignes de détail de l'onglet Bilan et CR cliquables pour ouvrir un panneau latéral droit — identique à celui du SIG — listant les comptes/écritures du FEC N sous la racine affichée.

**Architecture:** Réutilisation du composant partagé `DetailPanel` (nouveau type `bilancr`) et du drill-down générique par racine `getAccountsForBilan` / `getEntriesForBilanAccount`. Un helper domaine `buildBilanCRDrill` résout `item.code` → liste de ranges (racine + amortissements dérivés pour l'actif) + convention de signe. Overlay + panneau montés dans `BilanCRTab` comme `SigTable` le fait déjà.

**Tech Stack:** React 19, Zustand, Vitest.

**Référence spec:** `docs/superpowers/specs/2026-07-02-bilancr-detail-panel-design.md`

**Note tests:** il n'y a pas de script `test` dans `package.json`. Lancer les tests avec `npx vitest run <chemin>`.

---

## Structure des fichiers

- `src/engine/drillDown.js` — **Modifier** : ajouter `buildBilanCRDrill`, option `type` sur `getAccountsForBilan` et `getEntriesForBilanAccount`.
- `src/store/useStore.js` — **Modifier** : action `openBilanCRDetail`.
- `src/components/sig/DetailPanel.jsx` — **Modifier** : branche `bilancr`, propagation `soldeType`.
- `src/components/bilanCR/drillRow.js` — **Créer** : helper `isDrillableLine`.
- `src/components/bilanCR/ActifView.jsx`, `PassifView.jsx`, `ResultatView.jsx` — **Modifier** : lignes cliquables.
- `src/components/bilanCR/BilanCRTab.jsx` — **Modifier** : montage overlay + panneau, fermeture au changement de sous-onglet.
- `src/__tests__/bilanCRDrill.test.js` — **Créer** : tests unitaires du drill-down.

---

## Task 1 : Couche domaine — `buildBilanCRDrill` + option `type` sur le drill-down

**Files:**
- Modify: `src/engine/drillDown.js`
- Test: `src/__tests__/bilanCRDrill.test.js`

- [ ] **Step 1 : Écrire les tests qui échouent**

Créer `src/__tests__/bilanCRDrill.test.js` :

```js
import { describe, it, expect } from 'vitest';
import {
  buildBilanCRDrill,
  getAccountsForBilan,
  getEntriesForBilanAccount,
} from '../engine/drillDown';

const entries = [
  { compteNum: '2010000', compteLib: 'Frais établissement', debit: 1000, credit: 0, ecritureDate: new Date('2024-01-05'), ecritureLib: 'ecr a', pieceRef: 'P1', journalCode: 'AC' },
  { compteNum: '2801000', compteLib: 'Amort frais établiss.', debit: 0, credit: 200, ecritureDate: new Date('2024-02-05'), ecritureLib: 'ecr b', pieceRef: 'P2', journalCode: 'OD' },
  { compteNum: '7060000', compteLib: 'Prestations', debit: 0, credit: 5000, ecritureDate: new Date('2024-03-05'), ecritureLib: 'ecr c', pieceRef: 'P3', journalCode: 'VT' },
];

describe('buildBilanCRDrill', () => {
  it('actif amortissable : racine + comptes amort/déprec dérivés, solde charge, montant netN', () => {
    const drill = buildBilanCRDrill(
      { type: 'line', code: '201', label: 'Frais établissement', brut: 1000, amort: 200, netN: 800 },
      'actif'
    );
    expect(drill.racine).toBe('201');
    expect(drill.label).toBe('Frais établissement');
    expect(drill.montant).toBe(800);
    expect(drill.ranges).toEqual(['201', '2801', '2901']);
    expect(drill.soldeType).toBe('charge');
  });

  it('actif sans amort : seule la racine', () => {
    const drill = buildBilanCRDrill(
      { type: 'line', code: '271', label: 'Titres', brut: 500, amort: 0, netN: 500 },
      'actif'
    );
    expect(drill.ranges).toEqual(['271']);
  });

  it('résultat produit (classe 7) : solde product, montant totalN', () => {
    const drill = buildBilanCRDrill(
      { type: 'line', code: '706', label: 'Prestations', totalN: 5000 },
      'resultat'
    );
    expect(drill.ranges).toEqual(['706']);
    expect(drill.soldeType).toBe('product');
    expect(drill.montant).toBe(5000);
  });

  it('passif : racine seule, solde charge, montant netN', () => {
    const drill = buildBilanCRDrill(
      { type: 'line', code: '164', label: 'Emprunts', netN: 12000 },
      'passif'
    );
    expect(drill.ranges).toEqual(['164']);
    expect(drill.soldeType).toBe('charge');
    expect(drill.montant).toBe(12000);
  });
});

describe('getAccountsForBilan — option type', () => {
  it('type product : solde = crédit − débit', () => {
    const accounts = getAccountsForBilan(['706'], entries, { type: 'product' });
    expect(accounts).toHaveLength(1);
    expect(accounts[0].compteNum).toBe('7060000');
    expect(accounts[0].solde).toBe(5000);
  });

  it('sans type (défaut) : solde = débit − crédit', () => {
    const accounts = getAccountsForBilan(['201', '2801', '2901'], entries);
    const brut = accounts.find(a => a.compteNum === '2010000');
    const amort = accounts.find(a => a.compteNum === '2801000');
    expect(brut.solde).toBe(1000);
    expect(amort.solde).toBe(-200);
  });
});

describe('getEntriesForBilanAccount — option type', () => {
  it('type product : solde running = crédit − débit', () => {
    const rows = getEntriesForBilanAccount('7060000', entries, 'product');
    expect(rows[0].soldeCumule).toBe(5000);
  });

  it('défaut : solde running = débit − crédit', () => {
    const rows = getEntriesForBilanAccount('2010000', entries);
    expect(rows[0].soldeCumule).toBe(1000);
  });
});
```

- [ ] **Step 2 : Lancer les tests, vérifier l'échec**

Run: `npx vitest run src/__tests__/bilanCRDrill.test.js`
Expected: FAIL — `buildBilanCRDrill is not a function` et options `type` ignorées.

- [ ] **Step 3 : Étendre `getAccountsForBilan` avec l'option `type`**

Dans `src/engine/drillDown.js`, remplacer la signature et le calcul du solde de `getAccountsForBilan`.

Remplacer :

```js
export function getAccountsForBilan(ranges, entries, options = {}) {
  const { excludeRanges = [], groupByAux = false } = options;
```

par :

```js
export function getAccountsForBilan(ranges, entries, options = {}) {
  const { excludeRanges = [], groupByAux = false, type = 'charge' } = options;
```

Puis, dans le `.map(...)` final de cette fonction, remplacer :

```js
      solde: Math.round((acc.totalDebit - acc.totalCredit) * 100) / 100,
```

par :

```js
      solde: Math.round(netSolde(acc.totalDebit, acc.totalCredit, type) * 100) / 100,
```

- [ ] **Step 4 : Étendre `getEntriesForBilanAccount` avec le paramètre `type`**

Toujours dans `src/engine/drillDown.js`, remplacer :

```js
export function getEntriesForBilanAccount(compteNum, entries) {
  const filtered = entries
    .filter(e => e.compteNum === compteNum)
    .sort((a, b) => a.ecritureDate - b.ecritureDate);

  let running = 0;
  return filtered.map(e => {
    running += e.debit - e.credit;
```

par :

```js
export function getEntriesForBilanAccount(compteNum, entries, type = 'charge') {
  const filtered = entries
    .filter(e => e.compteNum === compteNum)
    .sort((a, b) => a.ecritureDate - b.ecritureDate);

  let running = 0;
  return filtered.map(e => {
    running += netSolde(e.debit, e.credit, type);
```

- [ ] **Step 5 : Ajouter `buildBilanCRDrill`**

À la fin de `src/engine/drillDown.js`, ajouter :

```js
// ---------------------------------------------------------------------------
// Bilan et CR : résolution d'une ligne (racine affichée) → drill-down
// ---------------------------------------------------------------------------

// Préfixes des comptes d'amortissement / dépréciation par classe d'actif.
const AMORT_PREFIX_BY_CLASS = { '2': ['28', '29'], '3': ['39'], '4': ['49'], '5': ['59'] };

/** Dérive les racines d'amortissement/dépréciation d'une racine d'actif immobilisé ou circulant. */
function deriveAmortRanges(racine) {
  const prefixes = AMORT_PREFIX_BY_CLASS[racine[0]];
  if (!prefixes) return [];
  const rest = racine.slice(1);
  return prefixes.map(p => p + rest);
}

/**
 * Résout une ligne de l'onglet Bilan et CR en paramètres de drill-down.
 *
 * @param {object} item - Ligne parsée (type 'line' ou 'subline') avec un `code` numérique.
 * @param {'actif'|'passif'|'resultat'} view - Sous-vue d'origine.
 * @returns {{ racine:string, label:string, montant:number|null, ranges:string[], soldeType:'charge'|'product' }}
 */
export function buildBilanCRDrill(item, view) {
  const racine = String(item.code);
  const montant = view === 'resultat' ? item.totalN : item.netN;
  const ranges = (view === 'actif' && item.amort)
    ? [racine, ...deriveAmortRanges(racine)]
    : [racine];
  const soldeType = racine.startsWith('7') ? 'product' : 'charge';
  return { racine, label: item.label, montant, ranges, soldeType };
}
```

- [ ] **Step 6 : Lancer les tests, vérifier le succès**

Run: `npx vitest run src/__tests__/bilanCRDrill.test.js`
Expected: PASS (8 tests).

- [ ] **Step 7 : Vérifier la non-régression du drill-down existant**

Run: `npx vitest run src/__tests__/computeBilan.test.js`
Expected: PASS (aucune régression — les appels sans `type` conservent débit − crédit).

- [ ] **Step 8 : Commit**

```bash
git add src/engine/drillDown.js src/__tests__/bilanCRDrill.test.js
git commit -m "feat(bilancr): drill-down par racine + option type de solde"
```

---

## Task 2 : Store — action `openBilanCRDetail`

**Files:**
- Modify: `src/store/useStore.js`

- [ ] **Step 1 : Ajouter l'action**

Dans `src/store/useStore.js`, juste après la ligne `openBilanAccountDetail: ...` (≈ ligne 243), ajouter :

```js
  /** Ouvre le panel de détail d'une ligne de l'onglet Bilan et CR (drill FEC N). */
  openBilanCRDetail: (payload) => set({ detailPanel: { type: 'bilancr', ...payload } }),
```

- [ ] **Step 2 : Mettre à jour le commentaire de type de `detailPanel`**

Toujours dans `src/store/useStore.js`, remplacer :

```js
  detailPanel: null,       // { type: 'sig'|'bilan', sigId, compteNum } | null
```

par :

```js
  detailPanel: null,       // { type: 'sig'|'bilan'|'bilancr', ... } | null
```

- [ ] **Step 3 : Vérifier la compilation (lint)**

Run: `npx eslint src/store/useStore.js`
Expected: aucune erreur.

- [ ] **Step 4 : Commit**

```bash
git add src/store/useStore.js
git commit -m "feat(bilancr): action store openBilanCRDetail"
```

---

## Task 3 : DetailPanel — branche `bilancr`

**Files:**
- Modify: `src/components/sig/DetailPanel.jsx`

- [ ] **Step 1 : Propager `soldeType` dans `BilanAccountCard`**

Dans `src/components/sig/DetailPanel.jsx`, remplacer la signature et l'appel d'écritures de `BilanAccountCard`.

Remplacer :

```js
function BilanAccountCard({ account, entries }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filterText, setFilterText] = useState('');

  const isNegative = account.solde < 0;

  const accountEntries = isExpanded
    ? getEntriesForBilanAccount(account.compteNum, entries)
    : [];
```

par :

```js
function BilanAccountCard({ account, entries, soldeType = 'charge' }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filterText, setFilterText] = useState('');

  const isNegative = account.solde < 0;

  const accountEntries = isExpanded
    ? getEntriesForBilanAccount(account.compteNum, entries, soldeType)
    : [];
```

- [ ] **Step 2 : Ajouter `BilanCRAccountList` (liste pilotée par ranges)**

Dans `src/components/sig/DetailPanel.jsx`, juste après le composant `BilanAccountList`, ajouter :

```js
// ---------------------------------------------------------------------------
// BilanCRAccountList — liste de comptes pilotée par des ranges explicites
// ---------------------------------------------------------------------------
function BilanCRAccountList({ ranges, soldeType, entries }) {
  if (!entries || entries.length === 0) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', fontSize: '13px', color: '#A0AEC0' }}>
        Chargez le FEC de l'exercice N pour afficher le détail des comptes.
      </div>
    );
  }

  const accounts = getAccountsForBilan(ranges, entries, { type: soldeType });

  if (!accounts || accounts.length === 0) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', fontSize: '13px', color: '#A0AEC0' }}>
        Aucun compte contribuant trouvé.
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          padding: '12px 0 8px',
          fontSize: '11px',
          fontWeight: 600,
          color: '#718096',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        Comptes contribuant ({accounts.length})
      </div>
      <div>
        {accounts.map((account) => (
          <BilanAccountCard
            key={account.compteNum}
            account={account}
            entries={entries}
            soldeType={soldeType}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3 : Gérer le type `bilancr` dans l'en-tête et le corps du `DetailPanel`**

Dans `src/components/sig/DetailPanel.jsx`, fonction `DetailPanel`, remplacer le bloc de construction d'en-tête :

```js
  if (panelType === 'sig' && sigLine) {
    headerLabel = sigLine.label;
    headerPrefix = sigLine.prefix;
    headerAmount = sigLine.amount;
  } else if (panelType === 'bilan' && bilanLine) {
    headerLabel = bilanLine.label;
    headerAmount = bilanLine.montant;
  }

  const ariaLabel = panelType === 'bilan' ? 'Détail du poste bilan' : 'Détail du poste SIG';
```

par :

```js
  if (panelType === 'sig' && sigLine) {
    headerLabel = sigLine.label;
    headerPrefix = sigLine.prefix;
    headerAmount = sigLine.amount;
  } else if (panelType === 'bilan' && bilanLine) {
    headerLabel = bilanLine.label;
    headerAmount = bilanLine.montant;
  } else if (panelType === 'bilancr') {
    headerLabel = detailPanel.label;
    headerPrefix = detailPanel.racine;
    headerAmount = detailPanel.montant;
  }

  let ariaLabel = 'Détail du poste SIG';
  if (panelType === 'bilan') ariaLabel = 'Détail du poste bilan';
  if (panelType === 'bilancr') ariaLabel = 'Détail de la ligne Bilan et CR';
```

Puis, dans le corps du panel, après le bloc `{panelType === 'bilan' && detailPanel?.bilanPostId && (...)}`, ajouter :

```jsx
        {panelType === 'bilancr' && detailPanel?.ranges && (
          <BilanCRAccountList
            ranges={detailPanel.ranges}
            soldeType={detailPanel.soldeType}
            entries={entries}
          />
        )}
```

Le sous-titre d'en-tête existant affiche `{panelType === 'bilan' ? 'Bilan →' : 'Détail →'}` — pour `bilancr`, `'Détail →'` convient, aucune modification nécessaire.

- [ ] **Step 4 : Vérifier le lint**

Run: `npx eslint src/components/sig/DetailPanel.jsx`
Expected: aucune erreur.

- [ ] **Step 5 : Commit**

```bash
git add src/components/sig/DetailPanel.jsx
git commit -m "feat(bilancr): branche bilancr dans DetailPanel"
```

---

## Task 4 : Vues Actif / Passif / Résultat cliquables

**Files:**
- Create: `src/components/bilanCR/drillRow.js`
- Modify: `src/components/bilanCR/ActifView.jsx`
- Modify: `src/components/bilanCR/PassifView.jsx`
- Modify: `src/components/bilanCR/ResultatView.jsx`
- Test: `src/__tests__/bilanCRDrill.test.js` (ajout)

- [ ] **Step 1 : Écrire le test du helper `isDrillableLine`**

Ajouter à la fin de `src/__tests__/bilanCRDrill.test.js` :

```js
import { isDrillableLine } from '../components/bilanCR/drillRow';

describe('isDrillableLine', () => {
  it('ligne à code numérique : cliquable', () => {
    expect(isDrillableLine({ type: 'line', code: '201' })).toBe(true);
    expect(isDrillableLine({ type: 'subline', code: '706' })).toBe(true);
  });
  it('code pointé (ventilation emprunt) : non cliquable', () => {
    expect(isDrillableLine({ type: 'subline', code: '164.1' })).toBe(false);
  });
  it('total / section / sans code : non cliquable', () => {
    expect(isDrillableLine({ type: 'total', code: null })).toBe(false);
    expect(isDrillableLine({ type: 'section' })).toBe(false);
    expect(isDrillableLine({ type: 'line', code: null })).toBe(false);
  });
});
```

- [ ] **Step 2 : Lancer, vérifier l'échec**

Run: `npx vitest run src/__tests__/bilanCRDrill.test.js`
Expected: FAIL — `isDrillableLine` introuvable.

- [ ] **Step 3 : Créer le helper**

Créer `src/components/bilanCR/drillRow.js` :

```js
/**
 * Une ligne du Bilan et CR est « de détail » (donc drillable) ssi elle porte
 * une racine de compte purement numérique affichée à gauche du libellé.
 * Exclut les sous-lignes à code pointé (ventilation emprunts, ex. "164.1"),
 * les totaux, sections et sous-sections.
 */
export function isDrillableLine(item) {
  return (
    (item.type === 'line' || item.type === 'subline') &&
    typeof item.code === 'string' &&
    /^\d+$/.test(item.code)
  );
}
```

- [ ] **Step 4 : Lancer, vérifier le succès**

Run: `npx vitest run src/__tests__/bilanCRDrill.test.js`
Expected: PASS (tous les tests, dont les 3 nouveaux).

- [ ] **Step 5 : Rendre les lignes de données cliquables dans `ActifView`**

Dans `src/components/bilanCR/ActifView.jsx`, ajouter les imports en tête de fichier (avant `fmtEur`) :

```js
import useStore from '../../store/useStore';
import { buildBilanCRDrill } from '../../engine/drillDown';
import { isDrillableLine } from './drillRow';
```

Remplacer la signature `export function ActifView({ items }) {` et son garde par :

```js
export function ActifView({ items }) {
  const detailPanel = useStore(s => s.detailPanel);
  const openBilanCRDetail = useStore(s => s.openBilanCRDetail);
  const closeDetail = useStore(s => s.closeDetail);
  const selectedRacine = detailPanel?.type === 'bilancr' ? detailPanel.racine : null;

  if (!items?.length) return <div style={{ color: '#A0AEC0', padding: '24px' }}>Aucune donnée Actif</div>;
```

Puis remplacer le bloc final `// Ligne de données` :

```js
            // Ligne de données
            return (
              <tr key={i} style={{ borderBottom: '1px solid #F0F4F8' }}
                onMouseEnter={e => e.currentTarget.style.background = '#F8FAFB'}
                onMouseLeave={e => e.currentTarget.style.background = ''}
              >
                <td style={{ padding: '5px 10px', color: '#1A202C' }}>
                  <span style={{ fontSize: '10px', color: '#CBD5E0', marginRight: '8px', fontFamily: 'monospace' }}>{item.code}</span>
                  {item.label}
                </td>
                <td style={{ padding: '5px 10px', textAlign: 'right', color: '#4A5568', fontFamily: 'monospace' }}>{fmtEur(item.brut)}</td>
                <td style={{ padding: '5px 10px', textAlign: 'right', color: '#E53935', fontFamily: 'monospace' }}>{fmtEur(item.amort)}</td>
                <td style={{ padding: '5px 10px', textAlign: 'right', color: '#1A202C', fontWeight: 500, fontFamily: 'monospace' }}>{fmtEur(item.netN)}</td>
                <td style={{ padding: '5px 10px', textAlign: 'right', color: '#718096', fontFamily: 'monospace' }}>{fmtEur(item.netN1)}</td>
              </tr>
            );
```

par :

```js
            // Ligne de données
            {
              const drillable = isDrillableLine(item);
              const selected = drillable && item.code === selectedRacine;
              const onClick = () => {
                if (!drillable) return;
                if (selected) closeDetail();
                else openBilanCRDetail(buildBilanCRDrill(item, 'actif'));
              };
              return (
                <tr key={i}
                  onClick={onClick}
                  onKeyDown={drillable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
                  role={drillable ? 'button' : undefined}
                  tabIndex={drillable ? 0 : undefined}
                  aria-selected={drillable ? selected : undefined}
                  style={{
                    borderBottom: '1px solid #F0F4F8',
                    background: selected ? '#E3F2F5' : '',
                    cursor: drillable ? 'pointer' : 'default',
                  }}
                  onMouseEnter={e => { if (!selected) e.currentTarget.style.background = drillable ? '#E3F2F5' : '#F8FAFB'; }}
                  onMouseLeave={e => { if (!selected) e.currentTarget.style.background = ''; }}
                >
                  <td style={{ padding: '5px 10px', color: '#1A202C' }}>
                    <span style={{ fontSize: '10px', color: '#CBD5E0', marginRight: '8px', fontFamily: 'monospace' }}>{item.code}</span>
                    {item.label}
                    {drillable && (
                      <span aria-hidden="true" style={{ color: selected ? '#FF8200' : '#CBD5E0', fontSize: '15px', marginLeft: '8px' }}>›</span>
                    )}
                  </td>
                  <td style={{ padding: '5px 10px', textAlign: 'right', color: '#4A5568', fontFamily: 'monospace' }}>{fmtEur(item.brut)}</td>
                  <td style={{ padding: '5px 10px', textAlign: 'right', color: '#E53935', fontFamily: 'monospace' }}>{fmtEur(item.amort)}</td>
                  <td style={{ padding: '5px 10px', textAlign: 'right', color: '#1A202C', fontWeight: 500, fontFamily: 'monospace' }}>{fmtEur(item.netN)}</td>
                  <td style={{ padding: '5px 10px', textAlign: 'right', color: '#718096', fontFamily: 'monospace' }}>{fmtEur(item.netN1)}</td>
                </tr>
              );
            }
```

- [ ] **Step 6 : Rendre les lignes de données cliquables dans `PassifView`**

Dans `src/components/bilanCR/PassifView.jsx`, ajouter les mêmes imports en tête de fichier :

```js
import useStore from '../../store/useStore';
import { buildBilanCRDrill } from '../../engine/drillDown';
import { isDrillableLine } from './drillRow';
```

Remplacer `export function PassifView({ items }) {` et son garde par :

```js
export function PassifView({ items }) {
  const detailPanel = useStore(s => s.detailPanel);
  const openBilanCRDetail = useStore(s => s.openBilanCRDetail);
  const closeDetail = useStore(s => s.closeDetail);
  const selectedRacine = detailPanel?.type === 'bilancr' ? detailPanel.racine : null;

  if (!items?.length) return <div style={{ color: '#A0AEC0', padding: '24px' }}>Aucune donnée Passif</div>;
```

Puis remplacer le bloc final `// Ligne de données` :

```js
            // Ligne de données
            return (
              <tr key={i} style={{ borderBottom: '1px solid #F0F4F8' }}
                onMouseEnter={e => e.currentTarget.style.background = '#F8FAFB'}
                onMouseLeave={e => e.currentTarget.style.background = ''}
              >
                <td style={{ padding: '5px 10px', color: '#1A202C' }}>
                  <span style={{ fontSize: '10px', color: '#CBD5E0', marginRight: '8px', fontFamily: 'monospace' }}>{item.code}</span>
                  {item.label}
                  {item.subLabel && item.subAmount !== null && (
                    <span style={{ fontSize: '11px', color: '#A0AEC0', marginLeft: '10px' }}>
                      {item.subLabel} {fmtEur(item.subAmount)}
                    </span>
                  )}
                </td>
                <td style={{ padding: '5px 10px', textAlign: 'right', color: '#1A202C', fontWeight: 500, fontFamily: 'monospace' }}>{fmtEur(item.netN)}</td>
                <td style={{ padding: '5px 10px', textAlign: 'right', color: '#718096', fontFamily: 'monospace' }}>{fmtEur(item.netN1)}</td>
              </tr>
            );
```

par :

```js
            // Ligne de données
            {
              const drillable = isDrillableLine(item);
              const selected = drillable && item.code === selectedRacine;
              const onClick = () => {
                if (!drillable) return;
                if (selected) closeDetail();
                else openBilanCRDetail(buildBilanCRDrill(item, 'passif'));
              };
              return (
                <tr key={i}
                  onClick={onClick}
                  onKeyDown={drillable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
                  role={drillable ? 'button' : undefined}
                  tabIndex={drillable ? 0 : undefined}
                  aria-selected={drillable ? selected : undefined}
                  style={{
                    borderBottom: '1px solid #F0F4F8',
                    background: selected ? '#E3F2F5' : '',
                    cursor: drillable ? 'pointer' : 'default',
                  }}
                  onMouseEnter={e => { if (!selected) e.currentTarget.style.background = drillable ? '#E3F2F5' : '#F8FAFB'; }}
                  onMouseLeave={e => { if (!selected) e.currentTarget.style.background = ''; }}
                >
                  <td style={{ padding: '5px 10px', color: '#1A202C' }}>
                    <span style={{ fontSize: '10px', color: '#CBD5E0', marginRight: '8px', fontFamily: 'monospace' }}>{item.code}</span>
                    {item.label}
                    {item.subLabel && item.subAmount !== null && (
                      <span style={{ fontSize: '11px', color: '#A0AEC0', marginLeft: '10px' }}>
                        {item.subLabel} {fmtEur(item.subAmount)}
                      </span>
                    )}
                    {drillable && (
                      <span aria-hidden="true" style={{ color: selected ? '#FF8200' : '#CBD5E0', fontSize: '15px', marginLeft: '8px' }}>›</span>
                    )}
                  </td>
                  <td style={{ padding: '5px 10px', textAlign: 'right', color: '#1A202C', fontWeight: 500, fontFamily: 'monospace' }}>{fmtEur(item.netN)}</td>
                  <td style={{ padding: '5px 10px', textAlign: 'right', color: '#718096', fontFamily: 'monospace' }}>{fmtEur(item.netN1)}</td>
                </tr>
              );
            }
```

- [ ] **Step 7 : Rendre les lignes de données cliquables dans `ResultatView`**

Ouvrir `src/components/bilanCR/ResultatView.jsx`, ajouter les mêmes imports en tête :

```js
import useStore from '../../store/useStore';
import { buildBilanCRDrill } from '../../engine/drillDown';
import { isDrillableLine } from './drillRow';
```

Ajouter, en tête du composant `ResultatView`, juste après la ligne `export function ResultatView({ items }) {`, l'abonnement au store (avant tout `return`) :

```js
  const detailPanel = useStore(s => s.detailPanel);
  const openBilanCRDetail = useStore(s => s.openBilanCRDetail);
  const closeDetail = useStore(s => s.closeDetail);
  const selectedRacine = detailPanel?.type === 'bilancr' ? detailPanel.racine : null;
```

Puis localiser le rendu de la ligne de données finale (le `return (<tr ...>` du cas `type === 'line'` / fallback, celui qui rend `item.code`, `item.label`, `fmtEur(item.totalN)`, `fmtEur(item.totalN1)`, variation) et l'envelopper de la même logique `drillable` : ajouter sur son `<tr>` les attributs `onClick`, `onKeyDown`, `role`, `tabIndex`, `aria-selected`, le `style` avec `background: selected ? '#E3F2F5' : ''` et `cursor`, et insérer après `{item.label}` dans la cellule libellé le chevron :

```jsx
{drillable && (
  <span aria-hidden="true" style={{ color: selected ? '#FF8200' : '#CBD5E0', fontSize: '15px', marginLeft: '8px' }}>›</span>
)}
```

en calculant en amont du `return` de ce cas :

```js
const drillable = isDrillableLine(item);
const selected = drillable && item.code === selectedRacine;
const onClick = () => {
  if (!drillable) return;
  if (selected) closeDetail();
  else openBilanCRDetail(buildBilanCRDrill(item, 'resultat'));
};
```

et en branchant `onClick` / `onKeyDown` (`Enter`/`Espace` → `onClick`) sur le `<tr>` de la ligne de données, avec `onMouseEnter`/`onMouseLeave` qui posent `#E3F2F5` (drillable) sinon `#F8FAFB`, et rétablissent `''` sauf si `selected`. Ne pas toucher aux branches `section`, `subsection`, `total`.

> Note : `ResultatView` a des sous-lignes (`subline`) à code numérique qui sont donc drillables via `isDrillableLine`. Si le rendu des `subline` est un `<tr>` distinct, appliquer la même enveloppe drillable à ce `<tr>` (mêmes 4 lignes de calcul + attributs + chevron). Sinon, seules les lignes `line` seront cliquables — acceptable pour cette itération.

- [ ] **Step 8 : Vérifier le lint des 4 fichiers**

Run: `npx eslint src/components/bilanCR/drillRow.js src/components/bilanCR/ActifView.jsx src/components/bilanCR/PassifView.jsx src/components/bilanCR/ResultatView.jsx`
Expected: aucune erreur.

- [ ] **Step 9 : Commit**

```bash
git add src/components/bilanCR/drillRow.js src/components/bilanCR/ActifView.jsx src/components/bilanCR/PassifView.jsx src/components/bilanCR/ResultatView.jsx src/__tests__/bilanCRDrill.test.js
git commit -m "feat(bilancr): lignes de détail cliquables (Actif/Passif/Résultat)"
```

---

## Task 5 : Montage du panneau dans `BilanCRTab`

**Files:**
- Modify: `src/components/bilanCR/BilanCRTab.jsx`

- [ ] **Step 1 : Importer le store detailPanel/closeDetail et le DetailPanel**

Dans `src/components/bilanCR/BilanCRTab.jsx`, sous les imports existants, ajouter :

```js
import { DetailPanel } from '../sig/DetailPanel';
```

Puis, dans le corps du composant, à côté des autres sélecteurs de store, ajouter :

```js
  const detailPanel = useStore(s => s.detailPanel);
  const closeDetail = useStore(s => s.closeDetail);
```

- [ ] **Step 2 : Fermer le panneau au changement de sous-onglet**

Toujours dans `src/components/bilanCR/BilanCRTab.jsx`, remplacer le rendu du sous-nav :

```jsx
      <BilanCRSubNav activeTab={activeTab} onTabChange={setActiveTab} />
```

par :

```jsx
      <BilanCRSubNav
        activeTab={activeTab}
        onTabChange={(tab) => { closeDetail(); setActiveTab(tab); }}
      />
```

- [ ] **Step 3 : Monter l'overlay + le panneau**

Toujours dans `src/components/bilanCR/BilanCRTab.jsx`, à l'intérieur du conteneur racine de l'état « données chargées », juste après le bloc :

```jsx
      <div style={{ paddingTop: '20px' }}>
        {activeTab === 'actif'    && <ActifView    items={actif} />}
        {activeTab === 'passif'   && <PassifView   items={passif} />}
        {activeTab === 'resultat' && <ResultatView items={resultat} />}
      </div>
```

ajouter :

```jsx
      {detailPanel?.type === 'bilancr' && (
        <>
          <div
            onClick={closeDetail}
            aria-hidden="true"
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.15)', zIndex: 39 }}
          />
          <DetailPanel />
        </>
      )}
```

- [ ] **Step 4 : Vérifier le lint**

Run: `npx eslint src/components/bilanCR/BilanCRTab.jsx`
Expected: aucune erreur.

- [ ] **Step 5 : Commit**

```bash
git add src/components/bilanCR/BilanCRTab.jsx
git commit -m "feat(bilancr): montage overlay + DetailPanel dans BilanCRTab"
```

---

## Task 6 : Vérification manuelle dans l'application

**Files:** aucun (vérification).

- [ ] **Step 1 : Lancer la suite complète de tests**

Run: `npx vitest run`
Expected: PASS (y compris `bilanCRDrill.test.js` et absence de régression).

- [ ] **Step 2 : Démarrer le serveur de dev et vérifier dans le navigateur (preview_start)**

- Charger les données de démonstration (bouton « Charger les données de démonstration » du Bilan et CR), et s'assurer qu'un FEC N est chargé (section Tableau de bord) pour peupler le drill-down.
- Onglet Actif : cliquer une ligne avec racine (ex. `201`) → le panneau droit s'ouvre, en-tête = racine + libellé + montant orange, liste « Comptes contribuant », dépliage d'un compte → écritures + solde running. Vérifier que les comptes d'amortissement (ex. `2801*`) apparaissent avec un solde négatif.
- Onglet Compte de résultat : cliquer une ligne de produit (classe 7) → soldes positifs.
- Vérifier : fermeture par ×, par Escape, par clic sur l'overlay ; re-clic sur la ligne sélectionnée referme ; changement de sous-onglet (Actif↔Passif) referme le panneau.
- Sans FEC N chargé : cliquer une ligne → message « Chargez le FEC de l'exercice N… ».

- [ ] **Step 3 : Vérifier l'absence d'erreurs console (preview_console_logs)**

Expected: aucune erreur React/JS lors de l'ouverture/fermeture du panneau.

---

## Auto-revue

- **Couverture spec :** Task 1 (drill-down + type + amort dérivé), Task 2 (store), Task 3 (DetailPanel branche bilancr + message no-FEC), Task 4 (lignes cliquables + règle code numérique), Task 5 (montage + fermeture sous-onglet), Task 6 (source FEC N vérifiée en manuel). Toutes les sections de la spec sont couvertes.
- **Placeholders :** aucun — code complet dans chaque étape de code (Task 7 de Résultat décrit précisément l'enveloppe à répliquer, identique à Actif/Passif).
- **Cohérence des types :** `buildBilanCRDrill` renvoie `{ racine, label, montant, ranges, soldeType }` ; `openBilanCRDetail(payload)` fait `{ type:'bilancr', ...payload }` → `detailPanel.{racine,label,montant,ranges,soldeType}` consommés à l'identique dans `DetailPanel` et les vues (`detailPanel.racine`). `soldeType` (`'charge'|'product'`) cohérent entre `buildBilanCRDrill`, `getAccountsForBilan({type})`, `getEntriesForBilanAccount(...,type)` et `BilanAccountCard`/`BilanCRAccountList`.
