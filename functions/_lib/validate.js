/**
 * validate.js — Validation des inputs côté serveur
 */

const VALID_SECTIONS = ['analyseur', 'dashboard', 'dossier', 'bilanCR', 'bilanParam', 'editions', 'export', 'analyse'];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Valide un email.
 * @param {string} email
 * @returns {{ ok: boolean, error?: string }}
 */
export function validateEmail(email) {
  if (typeof email !== 'string') return { ok: false, error: 'Email invalide' };
  const trimmed = email.trim().toLowerCase();
  if (!EMAIL_RE.test(trimmed) || trimmed.length > 254) {
    return { ok: false, error: 'Email invalide' };
  }
  return { ok: true };
}

/**
 * Valide un mot de passe (complexité minimale).
 * @param {string} password
 * @returns {{ ok: boolean, error?: string }}
 */
export function validatePassword(password) {
  if (typeof password !== 'string') return { ok: false, error: 'Mot de passe invalide' };
  if (password.length < 10) return { ok: false, error: 'Le mot de passe doit contenir au moins 10 caractères' };
  if (password.length > 128) return { ok: false, error: 'Mot de passe trop long' };
  return { ok: true };
}

/**
 * Valide une section (whitelist stricte).
 * @param {string} section
 * @returns {boolean}
 */
export function isValidSection(section) {
  return VALID_SECTIONS.includes(section);
}

export { VALID_SECTIONS };

/**
 * Valide un UUID v4.
 * @param {string} id
 * @returns {boolean}
 */
export function isValidUUID(id) {
  return typeof id === 'string' && UUID_RE.test(id);
}

/**
 * Valide un rôle.
 * @param {string} role
 * @returns {boolean}
 */
export function isValidRole(role) {
  return role === 'admin' || role === 'user';
}
