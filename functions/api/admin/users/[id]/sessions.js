/**
 * DELETE /api/admin/users/:id/sessions
 * Révoque toutes les sessions actives d'un utilisateur (force déconnexion).
 */
import { revokeAllSessions } from '../../../../_lib/db.js';
import { isValidUUID }       from '../../../../_lib/validate.js';
import { json, error, notFound, methodNotAllowed } from '../../../../_lib/responses.js';

export async function onRequestDelete(context) {
  const { env, params } = context;
  const id = params.id;
  if (!isValidUUID(id)) return error('ID invalide');

  const user = await env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(id).first();
  if (!user) return notFound();

  await revokeAllSessions(env.DB, id);
  return json({ success: true });
}

export async function onRequest(context) {
  if (context.request.method !== 'DELETE') return methodNotAllowed();
  return onRequestDelete(context);
}
