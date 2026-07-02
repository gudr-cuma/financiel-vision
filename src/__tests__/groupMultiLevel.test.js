// src/__tests__/groupMultiLevel.test.js
import { describe, it, expect } from 'vitest';
import { groupMultiLevel } from '../engine/tableUtils';

const rows = [
  { classe: 'a', region: 'PDL', ca: 100 },
  { classe: 'a', region: 'PDL', ca: 50 },
  { classe: 'a', region: 'NOR', ca: 30 },
  { classe: 'b', region: 'NOR', ca: 20 },
];
const byClasse = { label: 'Classe', fn: (r) => r.classe };
const byRegion = { label: 'Région', fn: (r) => r.region };

describe('groupMultiLevel', () => {
  it('retourne null quand aucun critère', () => {
    expect(groupMultiLevel(rows, [])).toBeNull();
  });

  it('groupe sur un niveau avec compte et sous-total', () => {
    const nodes = groupMultiLevel(rows, [byClasse], ['ca']);
    expect(nodes.map((n) => n.key)).toEqual(['a', 'b']);
    expect(nodes[0].count).toBe(3);
    expect(nodes[0].subtotal.ca).toBe(180);
    expect(nodes[0].children).toBeNull();
    expect(nodes[0].rows).toHaveLength(3);
  });

  it('imbrique deux niveaux', () => {
    const nodes = groupMultiLevel(rows, [byClasse, byRegion], ['ca']);
    expect(nodes[0].rows).toBeNull();
    expect(nodes[0].children.map((c) => c.key)).toEqual(['PDL', 'NOR']);
    expect(nodes[0].children[0].count).toBe(2);
    expect(nodes[0].children[0].rows).toHaveLength(2);
    expect(nodes[0].children[0].subtotal.ca).toBe(150);
  });
});
