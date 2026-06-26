import { describe, it, expect } from 'vitest';
import {
  sortRows,
  nextSortState,
  filterByText,
  filterByRange,
  distinctValues,
  groupRows,
  yearOf,
  findDuplicateKeys,
} from '../engine/tableUtils';

describe('sortRows', () => {
  it('trie des nombres en ordre croissant', () => {
    const rows = [{ v: 3 }, { v: 1 }, { v: 2 }];
    expect(sortRows(rows, 'v', 'asc').map(r => r.v)).toEqual([1, 2, 3]);
  });

  it('trie des nombres en ordre décroissant', () => {
    const rows = [{ v: 3 }, { v: 1 }, { v: 2 }];
    expect(sortRows(rows, 'v', 'desc').map(r => r.v)).toEqual([3, 2, 1]);
  });

  it('trie des chaînes', () => {
    const rows = [{ v: 'banane' }, { v: 'abricot' }, { v: 'cerise' }];
    expect(sortRows(rows, 'v', 'asc').map(r => r.v)).toEqual(['abricot', 'banane', 'cerise']);
  });

  it('trie des dates', () => {
    const rows = [{ v: new Date('2024-03-01') }, { v: new Date('2023-01-01') }];
    expect(sortRows(rows, 'v', 'asc').map(r => r.v.getFullYear())).toEqual([2023, 2024]);
  });

  it('place les valeurs null/undefined en fin, quelle que soit la direction', () => {
    const rows = [{ v: 2 }, { v: null }, { v: 1 }, { v: undefined }];
    expect(sortRows(rows, 'v', 'asc').map(r => r.v)).toEqual([1, 2, null, undefined]);
    expect(sortRows(rows, 'v', 'desc').map(r => r.v)).toEqual([2, 1, null, undefined]);
  });

  it('ne mute pas le tableau original', () => {
    const rows = [{ v: 2 }, { v: 1 }];
    sortRows(rows, 'v', 'asc');
    expect(rows.map(r => r.v)).toEqual([2, 1]);
  });
});

describe('nextSortState', () => {
  it('part de null vers {key, asc} au premier clic', () => {
    expect(nextSortState(null, 'montant')).toEqual({ key: 'montant', direction: 'asc' });
  });

  it('passe de asc à desc sur la même clé', () => {
    expect(nextSortState({ key: 'montant', direction: 'asc' }, 'montant')).toEqual({ key: 'montant', direction: 'desc' });
  });

  it('passe de desc à null (retire le tri) sur la même clé', () => {
    expect(nextSortState({ key: 'montant', direction: 'desc' }, 'montant')).toBeNull();
  });

  it('repart à asc si on clique une nouvelle colonne', () => {
    expect(nextSortState({ key: 'montant', direction: 'desc' }, 'banque')).toEqual({ key: 'banque', direction: 'asc' });
  });
});

describe('filterByText', () => {
  const rows = [
    { nom: 'Crédit Agricole', ville: 'Niort' },
    { nom: 'Banque Populaire', ville: 'Évreux' },
  ];

  it('filtre insensible à la casse et aux accents sur une clé', () => {
    expect(filterByText(rows, ['nom'], 'evreux')).toEqual([]);
    expect(filterByText(rows, ['ville'], 'evreux')).toEqual([rows[1]]);
  });

  it('filtre en OR sur plusieurs clés', () => {
    expect(filterByText(rows, ['nom', 'ville'], 'credit')).toEqual([rows[0]]);
    expect(filterByText(rows, ['nom', 'ville'], 'niort')).toEqual([rows[0]]);
  });

  it('retourne toutes les lignes si le texte est vide', () => {
    expect(filterByText(rows, ['nom'], '')).toEqual(rows);
  });
});

describe('filterByRange', () => {
  const rows = [{ v: 10 }, { v: 20 }, { v: 30 }];

  it('filtre avec une borne min et max', () => {
    expect(filterByRange(rows, 'v', 15, 25)).toEqual([{ v: 20 }]);
  });

  it('inclut les bornes', () => {
    expect(filterByRange(rows, 'v', 10, 20)).toEqual([{ v: 10 }, { v: 20 }]);
  });

  it('tolère min ou max null (borne ouverte)', () => {
    expect(filterByRange(rows, 'v', null, 20)).toEqual([{ v: 10 }, { v: 20 }]);
    expect(filterByRange(rows, 'v', 20, null)).toEqual([{ v: 20 }, { v: 30 }]);
  });

  it('fonctionne avec des dates', () => {
    const dateRows = [{ d: new Date('2024-01-01') }, { d: new Date('2024-06-01') }, { d: new Date('2024-12-01') }];
    const result = filterByRange(dateRows, 'd', new Date('2024-02-01'), new Date('2024-07-01'));
    expect(result).toEqual([dateRows[1]]);
  });
});

describe('distinctValues', () => {
  it('dédoublonne et trie alphabétiquement', () => {
    const rows = [{ banque: 'BA' }, { banque: 'CA' }, { banque: 'BA' }, { banque: 'Agil' }];
    expect(distinctValues(rows, 'banque')).toEqual(['Agil', 'BA', 'CA']);
  });

  it('exclut les valeurs null ou vides', () => {
    const rows = [{ banque: 'BA' }, { banque: null }, { banque: '' }];
    expect(distinctValues(rows, 'banque')).toEqual(['BA']);
  });
});

describe('groupRows', () => {
  const rows = [
    { categorie: 'A', montant: 10 },
    { categorie: 'B', montant: 5 },
    { categorie: 'A', montant: 7 },
  ];

  it('regroupe les lignes par clé', () => {
    const groups = groupRows(rows, r => r.categorie);
    expect(groups.map(g => g.key)).toEqual(['A', 'B']);
    expect(groups.find(g => g.key === 'A').rows).toHaveLength(2);
  });

  it('calcule un sous-total pour les clés demandées', () => {
    const groups = groupRows(rows, r => r.categorie, { subtotalKeys: ['montant'] });
    expect(groups.find(g => g.key === 'A').subtotal.montant).toBe(17);
    expect(groups.find(g => g.key === 'B').subtotal.montant).toBe(5);
  });
});

describe('yearOf', () => {
  it("extrait l'année d'une date valide", () => {
    expect(yearOf(new Date('2024-05-01'))).toBe(2024);
  });

  it('retourne null sans lever pour une valeur absente', () => {
    expect(yearOf(null)).toBeNull();
    expect(yearOf(undefined)).toBeNull();
  });
});

describe('findDuplicateKeys', () => {
  it('retourne une Map vide pour un tableau vide', () => {
    expect(findDuplicateKeys([], 'id').size).toBe(0);
  });

  it('retourne une Map vide si aucun doublon', () => {
    const rows = [{ id: 1 }, { id: 2 }, { id: 3 }];
    expect(findDuplicateKeys(rows, 'id').size).toBe(0);
  });

  it('retourne la clé dupliquée avec son nombre d\'occurrences', () => {
    const rows = [{ id: 1 }, { id: 2 }, { id: 1 }, { id: 1 }];
    const result = findDuplicateKeys(rows, 'id');
    expect(result.size).toBe(1);
    expect(result.get(1)).toBe(3);
  });

  it('gère plusieurs groupes de doublons distincts', () => {
    const rows = [{ id: 'A' }, { id: 'B' }, { id: 'A' }, { id: 'B' }, { id: 'C' }];
    const result = findDuplicateKeys(rows, 'id');
    expect(result.size).toBe(2);
    expect(result.get('A')).toBe(2);
    expect(result.get('B')).toBe(2);
    expect(result.has('C')).toBe(false);
  });

  it('ignore les valeurs null, undefined et chaîne vide', () => {
    const rows = [{ id: null }, { id: null }, { id: undefined }, { id: '' }, { id: '' }];
    expect(findDuplicateKeys(rows, 'id').size).toBe(0);
  });
});
