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
