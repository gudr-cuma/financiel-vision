/**
 * Middleware d'authentification — s'applique à toutes les routes /api/*
 * Injecte context.data.user et context.data.sessionId pour les handlers suivants.
 */
import { getSessionId }    from '../_lib/session.js';
import { getValidSession } from '../_lib/db.js';
import { unauthorized, forbidden } from '../_lib/responses.js';

const PUBLIC_ROUTES = ['/api/auth/login'];

export async function onRequest(context) {
  const { request, env, next } = context;
  const pathname = new URL(request.url).pathname;

  // Routes publiques — pas d'auth requise
  if (PUBLIC_ROUTES.includes(pathname)) {
    return next();
  }

  // Lire le cookie de session
  const sessionId = getSessionId(request);
  if (!sessionId) return unauthorized();

  // Vérifier la session en D1
  const row = await getValidSession(env.DB, sessionId);
  if (!row) return unauthorized('Session expirée ou invalide. Veuillez vous reconnecter.');

  // Mettre à jour last_seen de façon non-bloquante
  context.waitUntil(
    env.DB.prepare('UPDATE sessions SET last_seen = datetime(\'now\') WHERE id = ?')
      .bind(sessionId).run()
  );

  // Injecter les données dans le contexte
  context.data.user      = { id: row.id, email: row.email, name: row.name, role: row.role };
  context.data.sessionId = sessionId;

  // Routes admin : vérifier le rôle
  if (pathname.startsWith('/api/admin/') && row.role !== 'admin') {
    return forbidden();
  }

  return next();
}
