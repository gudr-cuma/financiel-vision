/**
 * POST /api/bootstrap
 * Endpoint temporaire — réinitialise le mot de passe admin via Workers crypto.
 * SUPPRIMER après usage.
 *
 * Body JSON : { token: <BOOTSTRAP_TOKEN>, email: string, password: string }
 */
import { hashPassword } from '../_lib/password.js';

function resp(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function onRequestPost(context) {
  try {
    const { request, env } = context;

    const token = env.BOOTSTRAP_TOKEN;
    if (!token) return resp({ error: 'disabled — set BOOTSTRAP_TOKEN env var' }, 404);

    let body;
    try { body = await request.json(); } catch { return resp({ error: 'bad json' }, 400); }

    if (body.token !== token) return resp({ error: 'forbidden' }, 403);
    if (!body.email || !body.password) return resp({ error: 'missing fields' }, 400);

    if (!env.DB) return resp({ error: 'DB binding missing — check D1 binding in Pages settings' }, 500);

    const hash = await hashPassword(body.password);

    const result = await env.DB.prepare(
      'UPDATE users SET password_hash = ?, failed_login_attempts = 0, locked_until = NULL WHERE email = ?'
    ).bind(hash, body.email.trim().toLowerCase()).run();

    if ((result.meta?.changes ?? result.changes ?? 0) === 0) {
      return resp({ error: 'user not found' }, 404);
    }

    return resp({ ok: true, message: 'Password updated. Delete /api/bootstrap now.' });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err), stack: err?.stack }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
