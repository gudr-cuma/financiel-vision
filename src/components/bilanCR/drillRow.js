/**
 * Une ligne du Bilan et CR est « de détail » (donc drillable) ssi elle porte
 * une (ou plusieurs) racine(s) de compte numérique(s) affichée(s) à gauche du
 * libellé. Un code peut regrouper plusieurs racines jointes par « + »
 * (ex. "267+268"). Exclut les sous-lignes à code pointé (ventilation emprunts,
 * ex. "164.1"), les totaux, sections et sous-sections.
 */
export function isDrillableLine(item) {
  return (
    (item.type === 'line' || item.type === 'subline') &&
    typeof item.code === 'string' &&
    /^\d+(\s*\+\s*\d+)*$/.test(item.code)
  );
}
