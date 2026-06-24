/**
 * GET    /api/admin/users/:id  — Détail user + sessions actives
 * PUT    /api/admin/users/:id  — Modifier name / email / password / role / is_active / can_upload_file
 * DELETE /api/admin/users/:id  — Supprimer (cascade)
 */
import { hashPassword } from '../../../_lib/password.js';
import { getUserPermissions, revokeAllSessions, revokeOtherSessions } from '../../../_lib/db.js';
import { isValidRole, isValidUUID, validateEmail, validatePassword } from '../../../_lib/validate.js';
import { json, error, notFound, forbidden, methodNotAllowed } from '../../../_lib/responses.js';

async function getUser(db, id) {
  return db.prepare(
    'SELECT id, email, name, role, is_active, created_at, updated_at, last_login, can_upload_file FROM users WHERE id = ?'
  ).bind(id).first();
}

export async function onRequestGet(context) {
  const { env, params, data } = context;
  const id = params.id;
  if (!isValidUUID(id)) return error('ID invalide');

  const user = await getUser(env.DB, id);
  if (!user) return notFound();

  const permissions = user.role === 'admin'
    ? ['analyseur', 'dashboard', 'dossier', 'bilanCR', 'editions', 'export', 'analyse']
    : await getUserPermissions(env.DB, id);

  const sessions = await env.DB.prepare(`
    SELECT id, created_at, last_seen, expires_at, ip_address, is_revoked
    FROM sessions
    WHERE user_id = ? AND is_revoked = 0 AND expires_at > datetime('now')
    ORDER BY last_seen DESC
  `).bind(id).all();

  return json({ user: { ...user, permissions }, sessions: sessions.results });
}

export async function onRequestPut(context) {
  const { request, env, params, data } = context;
  const id = params.id;
  if (!isValidUUID(id)) return error('ID invalide');

  const user = await getUser(env.DB, id);
  if (!user) return notFound();

  let body;
  try { body = await request.json(); }
  catch { return error('Corps de requête invalide'); }

  const { name, email, password, role, is_active, can_upload_file } = body ?? {};
  const updates = [];
  const values  = [];

  if (name !== undefined) {
    if (!name?.trim()) return error('Le nom ne peut pas être vide');
    updates.push('name = ?'); values.push(name.trim());
  }
  if (email !== undefined) {
    const emailCheck = validateEmail(email ?? '');
    if (!emailCheck.ok) return error(emailCheck.error);
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ? AND id != ?')
      .bind(normalizedEmail, id).first();
    if (existing) return error('Un compte avec cet email existe déjà', 409);
    updates.push('email = ?'); values.push(normalizedEmail);
  }
  if (password !== undefined) {
    const pwCheck = validatePassword(password ?? '');
    if (!pwCheck.ok) return error(pwCheck.error);
    updates.push('password_hash = ?'); values.push(await hashPassword(password));
  }
  if (role !== undefined) {
    if (!isValidRole(role)) return error('Rôle invalide');
    // Empêcher de se retirer ses propres droits admin
    if (id === data.user.id && role !== 'admin') return forbidden('Impossible de modifier son propre rôle');
    updates.push('role = ?'); values.push(role);
  }
  if (is_active !== undefined) {
    if (id === data.user.id) return forbidden('Impossible de désactiver son propre compte');
    updates.push('is_active = ?'); values.push(is_active ? 1 : 0);
    // Si on désactive, révoquer toutes les sessions
    if (!is_active) await revokeAllSessions(env.DB, id);
  }
  if (can_upload_file !== undefined) {
    updates.push('can_upload_file = ?'); values.push(can_upload_file ? 1 : 0);
  }

  if (updates.length === 0) return error('Aucun champ à modifier');

  values.push(id);
  await env.DB.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`)
    .bind(...values).run();

  if (password !== undefined) {
    // Le mot de passe a changé : on coupe les sessions ouvertes avec l'ancien.
    // Si l'admin réinitialise son propre mot de passe, on garde sa session courante active.
    if (id === data.user.id) await revokeOtherSessions(env.DB, id, data.sessionId);
    else await revokeAllSessions(env.DB, id);
  }

  const updated = await getUser(env.DB, id);
  return json({ user: updated });
}

export async function onRequestDelete(context) {
  const { env, params, data } = context;
  const id = params.id;
  if (!isValidUUID(id)) return error('ID invalide');
  if (id === data.user.id) return forbidden('Impossible de supprimer son propre compte');

  const user = await getUser(env.DB, id);
  if (!user) return notFound();

  await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id).run();
  return json({ success: true });
}

export async function onRequest(context) {
  if (context.request.method === 'GET')    return onRequestGet(context);
  if (context.request.method === 'PUT')    return onRequestPut(context);
  if (context.request.method === 'DELETE') return onRequestDelete(context);
  return methodNotAllowed();
}
