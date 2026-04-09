/**
 * PUT /api/admin/users/:id/permissions
 * Remplace toutes les permissions d'un utilisateur (transaction atomique).
 */
import { isValidUUID, isValidSection } from '../../../../_lib/validate.js';
import { json, error, notFound, methodNotAllowed } from '../../../../_lib/responses.js';

export async function onRequestPut(context) {
  const { request, env, params } = context;
  const id = params.id;
  if (!isValidUUID(id)) return error('ID invalide');

  const user = await env.DB.prepare('SELECT id, role FROM users WHERE id = ?').bind(id).first();
  if (!user) return notFound();

  let body;
  try { body = await request.json(); }
  catch { return error('Corps de requête invalide'); }

  const { permissions } = body ?? {};
  if (!Array.isArray(permissions)) return error('permissions doit être un tableau');

  // Accepte deux formats :
  // - string[] (rétrocompatible) : [{ section, can_access?, can_edit_param_bilan? }] ou 'sectionId'
  // - object[] : [{ section, can_access, can_edit_param_bilan }]
  const normalized = permissions.map(p =>
    typeof p === 'string'
      ? { section: p, can_access: 1, can_edit_param_bilan: 0 }
      : { section: p.section, can_access: p.can_access ?? 1, can_edit_param_bilan: p.can_edit_param_bilan ?? 0 }
  ).filter(p => isValidSection(p.section));

  // Transaction : supprimer tout puis réinsérer
  const stmts = [
    env.DB.prepare('DELETE FROM permissions WHERE user_id = ?').bind(id),
    ...normalized.map(({ section, can_access, can_edit_param_bilan }) =>
      env.DB.prepare('INSERT INTO permissions (id, user_id, section, can_access, can_edit_param_bilan) VALUES (?, ?, ?, ?, ?)')
        .bind(crypto.randomUUID(), id, section, can_access ? 1 : 0, can_edit_param_bilan ? 1 : 0)
    ),
  ];
  await env.DB.batch(stmts);

  const resultPerms = normalized.filter(p => p.can_access).map(p => p.section);
  const resultEdit  = normalized.filter(p => p.can_edit_param_bilan).map(p => p.section);
  return json({ permissions: resultPerms, editPermissions: resultEdit });
}

export async function onRequest(context) {
  if (context.request.method !== 'PUT') return methodNotAllowed();
  return onRequestPut(context);
}
