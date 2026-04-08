/**
 * POST /api/bootstrap
 * Endpoint temporaire — réinitialise le mot de passe admin via Workers crypto.
 * SUPPRIMER après usage.
 *
 * Body JSON : { token: <BOOTSTRAP_TOKEN>, email: string, password: string }
 */
import { hashPassword } from '../_lib/password.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  const token = env.BOOTSTRAP_TOKEN;
  if (!token) return new Response('disabled', { status: 404 });

  let body;
  try { body = await request.json(); } catch { return new Response('bad json', { status: 400 }); }

  if (body.token !== token) return new Response('forbidden', { status: 403 });

  if (!body.email || !body.password) return new Response('missing fields', { status: 400 });

  const hash = await hashPassword(body.password);

  const result = await env.DB.prepare(
    'UPDATE users SET password_hash = ?, failed_login_attempts = 0, locked_until = NULL WHERE email = ?'
  ).bind(hash, body.email.trim().toLowerCase()).run();

  if (result.meta?.changes === 0) {
    return new Response(JSON.stringify({ error: 'user not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ ok: true, message: 'Password updated. Delete /api/bootstrap now.' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
