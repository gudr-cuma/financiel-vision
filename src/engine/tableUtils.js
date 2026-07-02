import { normalizeText } from './formatUtils';

/**
 * Compare deux valeurs en plaçant null/undefined toujours en fin,
 * quelle que soit la direction de tri.
 */
function compareValues(a, b) {
  const aEmpty = a === null || a === undefined;
  const bEmpty = b === null || b === undefined;
  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return 1;
  if (bEmpty) return -1;

  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), 'fr');
}

/**
 * Tri générique d'un tableau de lignes par clé. Ne mute pas le tableau original.
 * @param {object[]} rows
 * @param {string} key
 * @param {'asc'|'desc'} [direction='asc']
 * @returns {object[]}
 */
export function sortRows(rows, key, direction = 'asc') {
  const sign = direction === 'desc' ? -1 : 1;
  return [...rows].sort((a, b) => {
    const cmp = compareValues(a[key], b[key]);
    // Les valeurs vides restent toujours en fin (compareValues gère déjà ce cas
    // en renvoyant +1/-1 indépendamment de `sign`).
    const aEmpty = a[key] === null || a[key] === undefined;
    const bEmpty = b[key] === null || b[key] === undefined;
    if (aEmpty || bEmpty) return cmp;
    return cmp * sign;
  });
}

/**
 * Calcule le prochain état de tri après un clic sur l'en-tête `clickedKey`.
 * Cycle à 3 états : null -> {key, asc} -> {key, desc} -> null.
 * @param {{key: string, direction: 'asc'|'desc'}|null} currentSort
 * @param {string} clickedKey
 * @returns {{key: string, direction: 'asc'|'desc'}|null}
 */
export function nextSortState(currentSort, clickedKey) {
  if (!currentSort || currentSort.key !== clickedKey) {
    return { key: clickedKey, direction: 'asc' };
  }
  if (currentSort.direction === 'asc') {
    return { key: clickedKey, direction: 'desc' };
  }
  return null;
}

/**
 * Filtre les lignes dont au moins une des `keys` contient `searchText`
 * (comparaison insensible à la casse et aux accents).
 * @param {object[]} rows
 * @param {string[]} keys
 * @param {string} searchText
 * @returns {object[]}
 */
export function filterByText(rows, keys, searchText) {
  const needle = normalizeText(searchText);
  if (!needle) return rows;
  return rows.filter((row) =>
    keys.some((key) => normalizeText(String(row[key] ?? '')).includes(needle))
  );
}

/**
 * Filtre les lignes dont la valeur de `key` est comprise entre `min` et `max`
 * (bornes incluses). `min`/`max` à null = borne ouverte. Fonctionne avec
 * des nombres ou des dates.
 * @param {object[]} rows
 * @param {string} key
 * @param {number|Date|null} min
 * @param {number|Date|null} max
 * @returns {object[]}
 */
export function filterByRange(rows, key, min, max) {
  return rows.filter((row) => {
    const value = row[key];
    if (value === null || value === undefined) return false;
    const v = value instanceof Date ? value.getTime() : value;
    if (min !== null && min !== undefined) {
      const m = min instanceof Date ? min.getTime() : min;
      if (v < m) return false;
    }
    if (max !== null && max !== undefined) {
      const m = max instanceof Date ? max.getTime() : max;
      if (v > m) return false;
    }
    return true;
  });
}

/**
 * Valeurs distinctes (non vides) d'une colonne, triées alphabétiquement.
 * @param {object[]} rows
 * @param {string} key
 * @returns {string[]}
 */
export function distinctValues(rows, key) {
  const set = new Set();
  for (const row of rows) {
    const value = row[key];
    if (value !== null && value !== undefined && value !== '') set.add(value);
  }
  return [...set].sort((a, b) => String(a).localeCompare(String(b), 'fr'));
}

/**
 * Regroupe les lignes selon `keyFn`, dans l'ordre de première apparition des
 * clés, avec un sous-total optionnel par clé numérique demandée.
 * @param {object[]} rows
 * @param {(row: object) => string|number} keyFn
 * @param {{subtotalKeys?: string[]}} [options]
 * @returns {{key: string|number, label: string, rows: object[], subtotal: Record<string, number>}[]}
 */
export function groupRows(rows, keyFn, { subtotalKeys = [] } = {}) {
  const groups = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  return [...groups.entries()].map(([key, groupRowsList]) => {
    const subtotal = {};
    for (const sKey of subtotalKeys) {
      subtotal[sKey] = groupRowsList.reduce((sum, r) => sum + (Number(r[sKey]) || 0), 0);
    }
    return { key, label: String(key), rows: groupRowsList, subtotal };
  });
}

/**
 * Somme une colonne numérique sur un ensemble de lignes (valeurs non
 * numériques/absentes traitées comme 0).
 * @param {object[]} rows
 * @param {string} key
 * @returns {number}
 */
export function sumColumn(rows, key) {
  return rows.reduce((sum, r) => sum + (Number(r[key]) || 0), 0);
}

/**
 * Extrait l'année d'une date, sans lever si la valeur est absente/invalide.
 * @param {Date|null|undefined} date
 * @returns {number|null}
 */
export function yearOf(date) {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) return null;
  return date.getFullYear();
}

/**
 * Regroupement récursif multi-niveaux.
 * @param {object[]} rows
 * @param {{label: string, fn: (row: object) => string|number}[]} keyFns
 * @param {string[]} [subtotalKeys=[]]
 * @returns {null | Array<{key: string, label: string, count: number, subtotal: Record<string, number>, children: any[]|null, rows: object[]|null}>}
 */
export function groupMultiLevel(rows, keyFns, subtotalKeys = []) {
  if (!keyFns.length) return null;
  const [first, ...rest] = keyFns;
  const map = new Map();
  for (const row of rows) {
    const k = first.fn(row);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(row);
  }
  return [...map.entries()].map(([key, groupRowsList]) => {
    const children = rest.length ? groupMultiLevel(groupRowsList, rest, subtotalKeys) : null;
    const subtotal = {};
    for (const s of subtotalKeys) {
      subtotal[s] = groupRowsList.reduce((sum, r) => sum + (Number(r[s]) || 0), 0);
    }
    return {
      key: String(key),
      label: first.label,
      count: groupRowsList.length,
      subtotal,
      children,
      rows: children ? null : groupRowsList,
    };
  });
}
