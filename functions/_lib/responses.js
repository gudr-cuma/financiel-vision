/**
 * responses.js — Helpers de réponses HTTP avec headers de sécurité uniformes
 */

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options':        'DENY',
  'Referrer-Policy':        'strict-origin-when-cross-origin',
};

/**
 * Réponse JSON avec headers de sécurité.
 * @param {any} data
 * @param {number} [status=200]
 * @param {Record<string,string>} [extraHeaders]
 */
export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...SECURITY_HEADERS,
      ...extraHeaders,
    },
  });
}

/**
 * Réponse d'erreur JSON normalisée.
 * @param {string} message
 * @param {number} [status=400]
 * @param {Record<string,string>} [extraHeaders]
 */
export function error(message, status = 400, extraHeaders = {}) {
  return json({ error: message }, status, extraHeaders);
}

/** 401 Unauthorized */
export const unauthorized  = (msg = 'Non authentifié') => error(msg, 401);
/** 403 Forbidden */
export const forbidden     = (msg = 'Accès refusé') => error(msg, 403);
/** 404 Not Found */
export const notFound      = (msg = 'Ressource introuvable') => error(msg, 404);
/** 429 Too Many Requests */
export const tooManyRequests = (msg = 'Trop de tentatives. Réessayez dans quelques minutes.') => error(msg, 429);
/** 405 Method Not Allowed */
export const methodNotAllowed = () => error('Méthode non autorisée', 405);
