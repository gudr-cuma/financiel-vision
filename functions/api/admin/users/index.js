/**
 * GET  /api/admin/users  — Liste tous les utilisateurs avec leurs permissions
 * POST /api/admin/users  — Crée un nouvel utilisateur
 */
import { hashPassword }   from '../../../_lib/password.js';
import { getAllUsers }     from '../../../_lib/db.js';
import { validateEmail, validatePassword, isValidSection, isValidRole, VALID_SECTIONS } from '../../../_lib/validate.js';
import { json, error, methodNotAllowed } from '../../../_lib/responses.js';

export async function onRequestGet(context) {
  const users = await getAllUsers(context.env.DB);
  return json({ users });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try { body = await request.json(); }
  catch { return error('Corps de requête invalide'); }

  const { email, name, password, role = 'user', permissions = [] } = body ?? {};

  // Validation
  const emailCheck = validateEmail(email ?? '');
  if (!emailCheck.ok) return error(emailCheck.error);

  const pwCheck = validatePassword(password ?? '');
  if (!pwCheck.ok) return error(pwCheck.error);

  if (!name?.trim()) return error('Le nom est requis');
  if (!isValidRole(role)) return error('Rôle invalide');

  const validPerms = permissions.filter(isValidSection);

  // Vérifier unicité email
  const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?')
    .bind(email.trim().toLowerCase()).first();
  if (existing) return error('Un compte avec cet email existe déjà', 409);

  // Créer l'utilisateur
  const userId   = crypto.randomUUID();
  const pwHash   = await hashPassword(password);
  await env.DB.prepare(`
    INSERT INTO users (id, email, name, role, password_hash)
    VALUES (?, ?, ?, ?, ?)
  `).bind(userId, email.trim().toLowerCase(), name.trim(), role, pwHash).run();

  // Créer les permissions
  if (validPerms.length > 0) {
    const stmts = validPerms.map(section =>
      env.DB.prepare('INSERT INTO permissions (id, user_id, section) VALUES (?, ?, ?)')
        .bind(crypto.randomUUID(), userId, section)
    );
    await env.DB.batch(stmts);
  }

  const user = await env.DB.prepare(
    'SELECT id, email, name, role, is_active, created_at FROM users WHERE id = ?'
  ).bind(userId).first();

  return json({ user: { ...user, permissions: validPerms } }, 201);
}

export async function onRequest(context) {
  if (context.request.method === 'GET')  return onRequestGet(context);
  if (context.request.method === 'POST') return onRequestPost(context);
  return methodNotAllowed();
}
