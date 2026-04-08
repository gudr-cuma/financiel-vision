/**
 * session.js — Gestion des sessions : génération, cookies, parsing
 */

const SESSION_COOKIE = 'cv_session';

/**
 * Génère un UUID v4 aléatoire (token de session opaque).
 * @returns {string}
 */
export function generateSessionId() {
  return crypto.randomUUID();
}

/**
 * Parse le header Cookie et retourne la valeur d'un cookie nommé.
 * @param {string} cookieHeader
 * @param {string} name
 * @returns {string|null}
 */
export function parseCookie(cookieHeader, name) {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k.trim() === name) return v.join('=').trim();
  }
  return null;
}

/**
 * Retourne la valeur du cookie de session depuis un Request.
 * @param {Request} request
 * @returns {string|null}
 */
export function getSessionId(request) {
  return parseCookie(request.headers.get('Cookie') || '', SESSION_COOKIE);
}

/**
 * Retourne le header Set-Cookie pour créer le cookie de session.
 * @param {string} sessionId
 * @param {number} durationHours
 * @returns {string}
 */
export function buildSessionCookie(sessionId, durationHours = 8) {
  const maxAge = durationHours * 3600;
  return [
    `${SESSION_COOKIE}=${sessionId}`,
    `Max-Age=${maxAge}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Strict',
  ].join('; ');
}

/**
 * Retourne le header Set-Cookie pour effacer le cookie de session.
 * @returns {string}
 */
export function clearSessionCookie() {
  return [
    `${SESSION_COOKIE}=`,
    'Max-Age=0',
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Strict',
  ].join('; ');
}

/**
 * Retourne l'adresse IP du client depuis la requête Cloudflare.
 * @param {Request} request
 * @returns {string}
 */
export function getClientIp(request) {
  return request.headers.get('CF-Connecting-IP')
    || request.headers.get('X-Forwarded-For')?.split(',')[0].trim()
    || 'unknown';
}
