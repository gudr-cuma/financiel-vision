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

  const validPerms = permissions.filter(isValidSection);

  // Transaction : supprimer tout puis réinsérer
  const stmts = [
    env.DB.prepare('DELETE FROM permissions WHERE user_id = ?').bind(id),
    ...validPerms.map(section =>
      env.DB.prepare('INSERT INTO permissions (id, user_id, section) VALUES (?, ?, ?)')
        .bind(crypto.randomUUID(), id, section)
    ),
  ];
  await env.DB.batch(stmts);

  return json({ permissions: validPerms });
}

export async function onRequest(context) {
  if (context.request.method !== 'PUT') return methodNotAllowed();
  return onRequestPut(context);
}
