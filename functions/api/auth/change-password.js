/**
 * POST /api/auth/change-password
 * Vérifie l'ancien mot de passe, en définit un nouveau, révoque les autres sessions.
 */
import { verifyPassword, hashPassword } from '../../_lib/password.js';
import { revokeOtherSessions }          from '../../_lib/db.js';
import { validatePassword }             from '../../_lib/validate.js';
import { json, error, methodNotAllowed } from '../../_lib/responses.js';

export async function onRequestPost(context) {
  const { request, env, data } = context;

  let body;
  try { body = await request.json(); }
  catch { return error('Corps de requête invalide'); }

  const { current_password, new_password } = body ?? {};

  if (!current_password || !new_password) {
    return error('Champs requis manquants');
  }

  const pwCheck = validatePassword(new_password);
  if (!pwCheck.ok) return error(pwCheck.error);

  // Récupérer le hash actuel
  const userRow = await env.DB.prepare(
    'SELECT password_hash FROM users WHERE id = ?'
  ).bind(data.user.id).first();

  if (!userRow) return error('Utilisateur introuvable', 404);

  const valid = await verifyPassword(current_password, userRow.password_hash);
  if (!valid) return error('Mot de passe actuel incorrect', 401);

  // Nouveau hash
  const newHash = await hashPassword(new_password);
  await env.DB.prepare(
    'UPDATE users SET password_hash = ? WHERE id = ?'
  ).bind(newHash, data.user.id).run();

  // Révoquer toutes les autres sessions (force re-login sur les autres appareils)
  await revokeOtherSessions(env.DB, data.user.id, data.sessionId);

  return json({ success: true });
}

export async function onRequest(context) {
  if (context.request.method !== 'POST') return methodNotAllowed();
  return onRequestPost(context);
}
