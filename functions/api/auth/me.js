/**
 * GET /api/auth/me
 * Retourne l'utilisateur courant et ses permissions.
 * Appelé au montage de l'app pour restaurer la session.
 */
import { getUserPermissions, getUserEditPermissions } from '../../_lib/db.js';
import { json, methodNotAllowed } from '../../_lib/responses.js';
import { VALID_SECTIONS } from '../../_lib/validate.js';

export async function onRequestGet(context) {
  const { env, data } = context;
  const user = data.user;

  let permissions, editPermissions;
  if (user.role === 'admin') {
    permissions     = VALID_SECTIONS;
    editPermissions = VALID_SECTIONS;
  } else {
    [permissions, editPermissions] = await Promise.all([
      getUserPermissions(env.DB, user.id),
      getUserEditPermissions(env.DB, user.id),
    ]);
  }

  return json({ user, permissions, editPermissions });
}

export async function onRequest(context) {
  if (context.request.method !== 'GET') return methodNotAllowed();
  return onRequestGet(context);
}
