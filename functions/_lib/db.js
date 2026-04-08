/**
 * db.js — Helpers D1 réutilisables
 */

/**
 * Récupère un utilisateur par email avec son mot de passe (pour login).
 */
export async function getUserByEmail(db, email) {
  return db.prepare(
    'SELECT id, email, name, role, is_active, password_hash, failed_login_attempts, locked_until FROM users WHERE email = ?'
  ).bind(email.trim().toLowerCase()).first();
}

/**
 * Récupère un utilisateur par ID (sans password_hash).
 */
export async function getUserById(db, id) {
  return db.prepare(
    'SELECT id, email, name, role, is_active, created_at, updated_at, last_login FROM users WHERE id = ?'
  ).bind(id).first();
}

/**
 * Vérifie une session et retourne { session, user } ou null.
 * @param {D1Database} db
 * @param {string} sessionId
 */
export async function getValidSession(db, sessionId) {
  return db.prepare(`
    SELECT
      s.id as session_id, s.expires_at, s.is_revoked,
      u.id, u.email, u.name, u.role, u.is_active
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.id = ?
      AND s.is_revoked = 0
      AND s.expires_at > datetime('now')
      AND u.is_active = 1
  `).bind(sessionId).first();
}

/**
 * Retourne les sections autorisées pour un user (role='user').
 * @param {D1Database} db
 * @param {string} userId
 * @returns {Promise<string[]>}
 */
export async function getUserPermissions(db, userId) {
  const result = await db.prepare(
    'SELECT section FROM permissions WHERE user_id = ? AND can_access = 1'
  ).bind(userId).all();
  return result.results.map(r => r.section);
}

/**
 * Crée une session en D1 et retourne son ID.
 * @param {D1Database} db
 * @param {string} userId
 * @param {number} durationHours
 * @param {string} ip
 * @param {string} userAgent
 */
export async function createSession(db, userId, durationHours, ip, userAgent) {
  const sessionId  = crypto.randomUUID();
  const expiresAt  = new Date(Date.now() + durationHours * 3600 * 1000).toISOString().replace('T', ' ').replace('Z', '');
  const sessionUuid = crypto.randomUUID(); // id de la ligne permissions
  await db.prepare(`
    INSERT INTO sessions (id, user_id, expires_at, ip_address, user_agent)
    VALUES (?, ?, ?, ?, ?)
  `).bind(sessionId, userId, expiresAt, ip, userAgent).run();
  return sessionId;
}

/**
 * Révoque une session (is_revoked = 1).
 */
export async function revokeSession(db, sessionId) {
  await db.prepare('UPDATE sessions SET is_revoked = 1 WHERE id = ?').bind(sessionId).run();
}

/**
 * Révoque toutes les sessions d'un user sauf une.
 */
export async function revokeOtherSessions(db, userId, exceptSessionId) {
  await db.prepare(
    'UPDATE sessions SET is_revoked = 1 WHERE user_id = ? AND id != ? AND is_revoked = 0'
  ).bind(userId, exceptSessionId).run();
}

/**
 * Révoque toutes les sessions d'un user.
 */
export async function revokeAllSessions(db, userId) {
  await db.prepare(
    'UPDATE sessions SET is_revoked = 1 WHERE user_id = ? AND is_revoked = 0'
  ).bind(userId).run();
}

/**
 * Retourne tous les users avec leurs permissions.
 */
export async function getAllUsers(db) {
  const users = await db.prepare(
    'SELECT id, email, name, role, is_active, created_at, last_login FROM users ORDER BY created_at DESC'
  ).all();

  const perms = await db.prepare(
    'SELECT user_id, section FROM permissions WHERE can_access = 1'
  ).all();

  const permMap = {};
  for (const p of perms.results) {
    if (!permMap[p.user_id]) permMap[p.user_id] = [];
    permMap[p.user_id].push(p.section);
  }

  return users.results.map(u => ({ ...u, permissions: permMap[u.id] ?? [] }));
}
