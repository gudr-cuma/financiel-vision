/**
 * GET  /api/bilan-config  — Lire la configuration bilan complète
 * PUT  /api/bilan-config  — Sauvegarder la configuration (can_edit requis)
 */
import { getBilanConfig, saveBilanConfig } from '../../_lib/db.js';
import { json, error, forbidden, methodNotAllowed } from '../../_lib/responses.js';
import { isValidUUID } from '../../_lib/validate.js';

const VALID_TYPES = ['section', 'subsection', 'line', 'total', 'grandtotal', 'separator'];
const VALID_DOCS  = ['actif', 'passif', 'resultat'];

export async function onRequestGet(context) {
  const { env, data } = context;

  // Vérifier permission d'accès à bilanParam
  if (data.user.role !== 'admin') {
    const hasAccess = await env.DB.prepare(
      'SELECT 1 FROM permissions WHERE user_id = ? AND section = ? AND can_access = 1'
    ).bind(data.user.id, 'bilanParam').first();
    if (!hasAccess) return forbidden();
  }

  const items = await getBilanConfig(env.DB);
  // Désérialiser les champs JSON
  const parsed = items.map(item => ({
    ...item,
    code_ranges:  item.code_ranges  ? JSON.parse(item.code_ranges)  : null,
    formula_refs: item.formula_refs ? JSON.parse(item.formula_refs) : null,
    bold: !!item.bold,
  }));
  return json({ items: parsed });
}

export async function onRequestPut(context) {
  const { request, env, data } = context;

  // Vérifier permission d'édition
  if (data.user.role !== 'admin') {
    const hasEdit = await env.DB.prepare(
      'SELECT 1 FROM permissions WHERE user_id = ? AND section = ? AND can_access = 1 AND can_edit = 1'
    ).bind(data.user.id, 'bilanParam').first();
    if (!hasEdit) return forbidden();
  }

  let body;
  try { body = await request.json(); } catch { return error('Corps de requête invalide'); }

  const { items } = body ?? {};
  if (!Array.isArray(items)) return error('items doit être un tableau');

  // Validation basique de chaque item
  const validated = [];
  for (const item of items) {
    if (!item.id || !isValidUUID(item.id))        return error(`id invalide : ${item.id}`);
    if (!VALID_DOCS.includes(item.doc))            return error(`doc invalide : ${item.doc}`);
    if (!VALID_TYPES.includes(item.type))          return error(`type invalide : ${item.type}`);
    if (typeof item.label !== 'string' || !item.label.trim()) return error('label manquant');
    validated.push(item);
  }

  await saveBilanConfig(env.DB, validated, data.user.id);
  return json({ ok: true, count: validated.length });
}

export async function onRequest(context) {
  const method = context.request.method;
  if (method === 'GET') return onRequestGet(context);
  if (method === 'PUT') return onRequestPut(context);
  return methodNotAllowed();
}
