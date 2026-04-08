/**
 * GET    /api/admin/users/:id  — Détail user + sessions actives
 * PUT    /api/admin/users/:id  — Modifier name / role / is_active
 * DELETE /api/admin/users/:id  — Supprimer (cascade)
 */
import { getUserPermissions, revokeAllSessions } from '../../../_lib/db.js';
import { isValidRole, isValidUUID }              from '../../../_lib/validate.js';
import { json, error, notFound, forbidden, methodNotAllowed } from '../../../_lib/responses.js';

async function getUser(db, id) {
  return db.prepare(
    'SELECT id, email, name, role, is_active, created_at, updated_at, last_login FROM users WHERE id = ?'
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

  const { name, role, is_active } = body ?? {};
  const updates = [];
  const values  = [];

  if (name !== undefined) {
    if (!name?.trim()) return error('Le nom ne peut pas être vide');
    updates.push('name = ?'); values.push(name.trim());
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

  if (updates.length === 0) return error('Aucun champ à modifier');

  values.push(id);
  await env.DB.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`)
    .bind(...values).run();

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
