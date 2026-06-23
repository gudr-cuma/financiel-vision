import * as XLSX from 'xlsx';

/**
 * Table d'exceptions pour les en-têtes que la convention générique de
 * headerToKey() ne peut pas traiter correctement (en-têtes commençant par
 * un chiffre, contractions françaises). Clés en minuscules, comparées après
 * trim() + toLowerCase() de l'en-tête brut.
 */
const HEADER_KEY_EXCEPTIONS = {
  '1ere echeance': 'premiereEcheance',
};

function stripAccents(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Convertit un en-tête de colonne (ou une rubrique Synthese) en clé JS
 * camelCase. Règle générale : trim, dépontuation (. et parenthèses ->
 * espace), suppression des accents, découpage sur tout caractère non
 * alphanumérique, puis camelCase — en préservant tel quel un token court
 * (<= 3 caractères) entièrement en majuscules/chiffres situé après le
 * premier token (sigle, ex. "P"/"R" dans "Type (P/R)").
 * @param {string} header
 * @returns {string}
 */
export function headerToKey(header) {
  const trimmed = String(header ?? '').trim();
  const exception = HEADER_KEY_EXCEPTIONS[trimmed.toLowerCase()];
  if (exception) return exception;

  const cleaned = stripAccents(trimmed).replace(/[.()]/g, ' ');
  const tokens = cleaned.split(/[^A-Za-z0-9]+/).filter(Boolean);
  if (tokens.length === 0) return '';

  return tokens
    .map((tok, i) => {
      if (i === 0) return tok.toLowerCase();
      const isShortAcronym = tok.length <= 3 && /^[A-Z0-9]+$/.test(tok);
      if (isShortAcronym) return tok;
      return tok.charAt(0).toUpperCase() + tok.slice(1).toLowerCase();
    })
    .join('');
}

function sheetToObjects(ws) {
  const raw = XLSX.utils.sheet_to_json(ws, { defval: null });
  return raw.map((row) => {
    const obj = {};
    for (const [header, value] of Object.entries(row)) {
      obj[headerToKey(header)] = value;
    }
    return obj;
  });
}

function parseSynthese(ws) {
  const rows = XLSX.utils.sheet_to_json(ws, { defval: null });
  const lookup = {};
  for (const { Rubrique, Valeur } of rows) {
    if (!Rubrique) continue;
    lookup[headerToKey(Rubrique)] = Valeur;
  }
  return lookup;
}

const REQUIRED_SHEETS = ['Emprunts', 'Lignes', 'I1', 'I2', 'Capital_Social', 'Materiels', 'Synthese'];

/**
 * Parse un classeur Export_Multi déjà lu en ArrayBuffer (point d'entrée
 * synchrone, utilisé par parseExportMulti() et testable directement).
 * @param {ArrayBuffer} arrayBuffer
 * @returns {object} ExportMultiData
 */
export function parseExportMultiBuffer(arrayBuffer) {
  const wb = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });

  for (const name of REQUIRED_SHEETS) {
    if (!wb.SheetNames.includes(name)) {
      throw new Error(`Feuille "${name}" introuvable dans le fichier Excel.`);
    }
  }

  return {
    importedAt: new Date().toISOString(),
    emprunts: sheetToObjects(wb.Sheets['Emprunts']),
    lignesEmprunt: sheetToObjects(wb.Sheets['Lignes']),
    immobilisations: sheetToObjects(wb.Sheets['I1']),
    immoLignes: sheetToObjects(wb.Sheets['I2']),
    capitalSocial: sheetToObjects(wb.Sheets['Capital_Social']),
    materiels: sheetToObjects(wb.Sheets['Materiels']),
    synthese: parseSynthese(wb.Sheets['Synthese']),
  };
}

/**
 * Parse le fichier Excel Export_Multi déposé par l'utilisateur.
 * @param {File} file
 * @returns {Promise<object>} ExportMultiData
 */
export async function parseExportMulti(file) {
  const arrayBuffer = await file.arrayBuffer();
  const data = parseExportMultiBuffer(arrayBuffer);
  return { ...data, fileName: file.name };
}
