/**
 * ratelimit.js — Rate limiting via Cloudflare KV
 * Compteur de tentatives de login par IP avec TTL automatique.
 */

const PREFIX = 'ratelimit:login:';

/**
 * Vérifie si l'IP a dépassé la limite de tentatives.
 * @param {KVNamespace} kv
 * @param {string} ip
 * @param {number} maxAttempts
 * @returns {Promise<{ blocked: boolean, attempts: number }>}
 */
export async function checkRateLimit(kv, ip, maxAttempts) {
  const key   = PREFIX + ip;
  const value = await kv.get(key);
  const attempts = value ? parseInt(value, 10) : 0;
  return { blocked: attempts >= maxAttempts, attempts };
}

/**
 * Incrémente le compteur de tentatives pour cette IP.
 * Le TTL repart de zéro à chaque incrément (fenêtre glissante).
 * @param {KVNamespace} kv
 * @param {string} ip
 * @param {number} windowSeconds
 * @returns {Promise<number>} nombre de tentatives après incrément
 */
export async function incrementRateLimit(kv, ip, windowSeconds) {
  const key      = PREFIX + ip;
  const value    = await kv.get(key);
  const attempts = (value ? parseInt(value, 10) : 0) + 1;
  await kv.put(key, String(attempts), { expirationTtl: windowSeconds });
  return attempts;
}

/**
 * Réinitialise le compteur après un login réussi.
 * @param {KVNamespace} kv
 * @param {string} ip
 */
export async function resetRateLimit(kv, ip) {
  await kv.delete(PREFIX + ip);
}
