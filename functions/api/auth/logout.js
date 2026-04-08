/**
 * POST /api/auth/logout
 * Révoque la session courante et efface le cookie.
 */
import { clearSessionCookie } from '../../_lib/session.js';
import { revokeSession }      from '../../_lib/db.js';
import { json, methodNotAllowed } from '../../_lib/responses.js';

export async function onRequestPost(context) {
  const { env, data } = context;
  await revokeSession(env.DB, data.sessionId);
  return json(
    { success: true },
    200,
    { 'Set-Cookie': clearSessionCookie() }
  );
}

export async function onRequest(context) {
  if (context.request.method !== 'POST') return methodNotAllowed();
  return onRequestPost(context);
}
