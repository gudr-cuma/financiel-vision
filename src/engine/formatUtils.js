/**
 * Utilitaires de formatage — affichage français.
 * Formatage montants, pourcentages et dates.
 */

const FMT_EUR = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const FMT_EUR_DEC = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Formate un montant en euros.
 * - Inférieur à 1 000 € : "482 €"
 * - Supérieur ou égal à 1 000 € : "18 750 €" (sauf si forceKilo)
 * - Si forceKilo ou ≥ 1 000 : "482 k€"
 *
 * @param {number} amount
 * @param {boolean} [forceKilo=false]
 * @returns {string}
 */
export function formatAmount(amount, forceKilo = false) {
  if (amount === null || amount === undefined || isNaN(amount)) return '— €';
  if (forceKilo || Math.abs(amount) >= 1000) {
    const kilo = amount / 1000;
    const formatted = new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    }).format(kilo);
    return `${formatted} k€`;
  }
  return `${FMT_EUR.format(amount)} €`;
}

/**
 * Formate un montant pour les tableaux SIG — toujours en entier, avec signe si négatif.
 * Ex : -18750 → "-18 750 €", 482000 → "482 000 €"
 *
 * @param {number} amount
 * @returns {string}
 */
export function formatAmountFull(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return '—';
  return `${FMT_EUR.format(amount)} €`;
}

/**
 * Formate un pourcentage.
 * Ex : 33.0123 → "33,0 %"
 *
 * @param {number} value
 * @param {number} [decimals=1]
 * @returns {string}
 */
export function formatPercent(value, decimals = 1) {
  if (value === null || value === undefined || isNaN(value) || !isFinite(value)) return '— %';
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value) + ' %';
}

/**
 * Formate une date en JJ/MM/AAAA.
 *
 * @param {Date|null} date
 * @returns {string}
 */
export function formatDate(date) {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) return '—';
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

/**
 * Retourne la couleur CSS adaptée selon le signe du montant.
 * Positif → vert accessible, négatif → rouge.
 *
 * @param {number} amount
 * @returns {string} — classe Tailwind ou valeur CSS
 */
export function signColor(amount) {
  if (amount < 0) return '#E53935';
  return '#268E00';
}
