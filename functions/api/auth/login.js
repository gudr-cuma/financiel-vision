/**
 * POST /api/auth/login
 * Rate limit IP → vérif PBKDF2 → session D1 → cookie httpOnly
 */
import { verifyPassword, dummyVerify } from '../../_lib/password.js';
import { buildSessionCookie, getClientIp } from '../../_lib/session.js';
import { checkRateLimit, incrementRateLimit, resetRateLimit } from '../../_lib/ratelimit.js';
import { getUserByEmail, getUserPermissions, createSession } from '../../_lib/db.js';
import { validateEmail } from '../../_lib/validate.js';
import { json, error, tooManyRequests } from '../../_lib/responses.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  // ── 1. Lire et valider le body ──────────────────────────────────────────────
  let body;
  try { body = await request.json(); }
  catch { return error('Corps de requête invalide'); }

  const email    = (body.email    ?? '').trim().toLowerCase();
  const password = body.password  ?? '';

  if (!validateEmail(email).ok || !password) {
    return error('Identifiants invalides', 401);
  }

  // ── 2. Rate limiting par IP ─────────────────────────────────────────────────
  const ip          = getClientIp(request);
  const maxAttempts = parseInt(env.MAX_LOGIN_ATTEMPTS_PER_IP ?? '5', 10);
  const windowSecs  = parseInt(env.RATE_LIMIT_WINDOW_SECONDS ?? '900', 10);

  const { blocked } = await checkRateLimit(env.RATE_LIMIT_KV, ip, maxAttempts);
  if (blocked) return tooManyRequests();

  // ── 3. Rechercher l'utilisateur ─────────────────────────────────────────────
  const user = await getUserByEmail(env.DB, email);

  if (!user) {
    // Email inconnu : on exécute quand même un hash pour éviter le timing leak
    await dummyVerify();
    await incrementRateLimit(env.RATE_LIMIT_KV, ip, windowSecs);
    return error('Identifiants invalides', 401);
  }

  // ── 4. Vérifier compte actif et non verrouillé ─────────────────────────────
  if (!user.is_active) {
    await dummyVerify();
    return error('Ce compte est désactivé.', 401);
  }
  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    await dummyVerify();
    return error('Compte temporairement verrouillé. Réessayez plus tard.', 401);
  }

  // ── 5. Vérifier le mot de passe ─────────────────────────────────────────────
  const valid = await verifyPassword(password, user.password_hash);

  if (!valid) {
    // Incrémenter les tentatives en D1
    const newAttempts = user.failed_login_attempts + 1;
    const lockoutAttempts = parseInt(env.ACCOUNT_LOCKOUT_ATTEMPTS ?? '10', 10);
    const lockoutHours    = parseInt(env.ACCOUNT_LOCKOUT_HOURS ?? '1', 10);

    if (newAttempts >= lockoutAttempts) {
      const lockUntil = new Date(Date.now() + lockoutHours * 3600 * 1000)
        .toISOString().replace('T', ' ').replace('Z', '');
      await env.DB.prepare(
        'UPDATE users SET failed_login_attempts = ?, locked_until = ? WHERE id = ?'
      ).bind(newAttempts, lockUntil, user.id).run();
    } else {
      await env.DB.prepare(
        'UPDATE users SET failed_login_attempts = ? WHERE id = ?'
      ).bind(newAttempts, user.id).run();
    }

    await incrementRateLimit(env.RATE_LIMIT_KV, ip, windowSecs);
    return error('Identifiants invalides', 401);
  }

  // ── 6. Login réussi ─────────────────────────────────────────────────────────
  // Reset compteurs
  await env.DB.prepare(
    'UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login = datetime(\'now\') WHERE id = ?'
  ).bind(user.id).run();
  await resetRateLimit(env.RATE_LIMIT_KV, ip);

  // Créer la session
  const durationHours = parseInt(env.SESSION_DURATION_HOURS ?? '8', 10);
  const sessionId = await createSession(
    env.DB, user.id, durationHours,
    ip, request.headers.get('User-Agent') ?? ''
  );

  // Permissions
  const permissions = user.role === 'admin'
    ? ['analyseur', 'dashboard', 'dossier', 'bilanCR', 'editions', 'export', 'analyse']
    : await getUserPermissions(env.DB, user.id);

  return json(
    { user: { id: user.id, email: user.email, name: user.name, role: user.role }, permissions },
    200,
    { 'Set-Cookie': buildSessionCookie(sessionId, durationHours) }
  );
}

export async function onRequest(context) {
  if (context.request.method !== 'POST') {
    const { methodNotAllowed } = await import('../../_lib/responses.js');
    return methodNotAllowed();
  }
  return onRequestPost(context);
}
