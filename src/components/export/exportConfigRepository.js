/**
 * exportConfigRepository.js — sérialisation JSON de la configuration de
 * l'export PDF (sélection de documents, ordre, options par doc, mode,
 * orientation). Fonctions pures, même pattern que src/data/budgetRepository.js.
 */

export function exportConfigJson(config) {
  return JSON.stringify({ ...config, exportedAt: new Date().toISOString() }, null, 2);
}

export function importConfigJson(jsonString) {
  const parsed = JSON.parse(jsonString);
  if (!Array.isArray(parsed.orderedSelection)) {
    throw new Error('Format de fichier invalide : la clé "orderedSelection" doit être un tableau.');
  }
  return parsed;
}
