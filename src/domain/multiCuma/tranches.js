// src/domain/multiCuma/tranches.js
export const TRANCHE_ORDER = [
  '< 10 000€', '10 à 50 000€', '50 à 80 000€', '80 à 130 000€', '> 130 000€',
];

/**
 * Catégorie de tranche de CA (colonne H). Borne basse incluse.
 * @param {number} ca
 * @returns {string} une valeur de TRANCHE_ORDER
 */
export function categorieFromCA(ca) {
  const v = Number(ca) || 0;
  if (v < 10000) return TRANCHE_ORDER[0];
  if (v < 50000) return TRANCHE_ORDER[1];
  if (v < 80000) return TRANCHE_ORDER[2];
  if (v < 130000) return TRANCHE_ORDER[3];
  return TRANCHE_ORDER[4];
}
