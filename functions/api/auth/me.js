/**
 * GET /api/auth/me
 * Retourne l'utilisateur courant et ses permissions.
 * Appelé au montage de l'app pour restaurer la session.
 */
import { getUserPermissions } from '../../_lib/db.js';
import { json, methodNotAllowed } from '../../_lib/responses.js';

export async function onRequestGet(context) {
  const { env, data } = context;
  const user = data.user;

  const permissions = user.role === 'admin'
    ? ['analyseur', 'dashboard', 'dossier', 'bilanCR', 'editions', 'export', 'analyse']
    : await getUserPermissions(env.DB, user.id);

  return json({ user, permissions });
}

export async function onRequest(context) {
  if (context.request.method !== 'GET') return methodNotAllowed();
  return onRequestGet(context);
}
