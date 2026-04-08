/**
 * Module parseFec — point d'entrée côté main thread.
 *
 * Lance le parsing dans un Web Worker Vite dédié pour ne pas bloquer l'UI.
 * Retourne une Promise<ParsedFEC>.
 *
 * Usage :
 *   import { parseFec } from './engine/parseFec';
 *   const result = await parseFec(file, onProgress);
 */

import { extractSiren, detectExerciceStart, buildExerciceMonths } from './exerciceUtils';
import workerSource from './parseFec.worker.js?raw';

// Blob URL — same-origin dans tous les contextes (iframe, etc.)
function createWorker() {
  const blob = new Blob([workerSource], { type: 'application/javascript' });
  const url = URL.createObjectURL(blob);
  const worker = new Worker(url);
  worker._blobUrl = url;
  return worker;
}

/**
 * Parse un fichier FEC en utilisant un Web Worker.
 *
 * @param {File} file - Le fichier FEC déposé par l'utilisateur
 * @param {(percent: number) => void} [onProgress] - Callback de progression (0-100)
 * @returns {Promise<import('./types').ParsedFEC>}
 */
export function parseFec(file, onProgress) {
  return new Promise((resolve, reject) => {
    const worker = createWorker();

    worker.onmessage = (event) => {
      const { type, result, percent, message } = event.data;

      if (type === 'progress') {
        onProgress?.(percent);
        return;
      }

      worker.terminate();
      URL.revokeObjectURL(worker._blobUrl);

      if (type === 'error') {
        reject(new Error(message));
        return;
      }

      if (type === 'done') {
        // Enrichir le résultat avec les métadonnées d'exercice
        let { siren, closingDate } = extractSiren(result.fileName);
        // Fallback : si le nom ne contient pas de date, prendre la date max des écritures
        if (!closingDate && result.entries.length > 0) {
          closingDate = result.entries
            .filter(e => e.ecritureDate instanceof Date && !isNaN(e.ecritureDate))
            .reduce((max, e) => (e.ecritureDate > max ? e.ecritureDate : max), new Date(0));
        }
        const exerciceStart = detectExerciceStart(result.entries, closingDate);
        const exerciceMonths = buildExerciceMonths(exerciceStart, closingDate);
        const isOffsetExercice = exerciceStart.getMonth() !== 0; // true si début ≠ janvier

        resolve({
          ...result,
          siren,
          exerciceEnd: closingDate,
          exerciceStart,
          exerciceMonths,
          isOffsetExercice,
        });
      }
    };

    worker.onerror = (err) => {
      worker.terminate();
      URL.revokeObjectURL(worker._blobUrl);
      reject(new Error(err.message || 'Erreur lors du chargement du module de parsing.'));
    };

    // Lire le fichier en ArrayBuffer et l'envoyer au worker
    const reader = new FileReader();
    reader.onload = (e) => {
      worker.postMessage({ buffer: e.target.result, fileName: file.name });
    };
    reader.onerror = () => {
      worker.terminate();
      reject(new Error('Impossible de lire le fichier.'));
    };
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Version synchrone du parsing — utilisée dans les tests unitaires (pas de Worker).
 * Même logique que le worker, mais exécutée dans le thread principal.
 *
 * @param {ArrayBuffer} buffer
 * @param {string} fileName
 * @returns {{ entries: object[], encoding: string, separator: string, stats: object, warnings: string[] }}
 */
export function parseFecSync(buffer, fileName) {
  const FEC_HEADERS = [
    'JournalCode', 'JournalLib', 'EcritureNum', 'EcritureDate',
    'CompteNum', 'CompteLib', 'CompAuxNum', 'CompAuxLib',
    'PieceRef', 'PieceDate', 'EcritureLib', 'Debit', 'Credit',
    'EcritureLet', 'DateLet', 'ValidDate', 'Montantdevise', 'Idevise',
  ];

  // Détection encodage
  const uint8 = new Uint8Array(buffer);
  let encoding = 'iso-8859-15';
  if (uint8[0] === 0xEF && uint8[1] === 0xBB && uint8[2] === 0xBF) {
    encoding = 'utf-8';
  } else {
    try {
      new TextDecoder('utf-8', { fatal: true }).decode(buffer);
      encoding = 'utf-8';
    } catch {
      encoding = 'iso-8859-15';
    }
  }

  const text = new TextDecoder(encoding).decode(buffer);
  const lines = text.split(/\r?\n/);
  const firstLine = lines[0] || '';

  // Détection séparateur
  const pipes = (firstLine.match(/\|/g) || []).length;
  const tabs = (firstLine.match(/\t/g) || []).length;
  const semis = (firstLine.match(/;/g) || []).length;
  let separator;
  if (pipes === 17) separator = '|';
  else if (tabs === 17) separator = '\t';
  else if (semis === 17) separator = ';';
  else { const max = Math.max(pipes, tabs, semis); separator = max === semis ? ';' : (pipes >= tabs ? '|' : '\t'); }

  // Validation header
  const headerCols = firstLine.split(separator).map(c => c.trim());
  if (headerCols.length !== 18) {
    throw new Error(`Header FEC invalide : ${headerCols.length} colonne(s) trouvée(s), 18 attendues.`);
  }
  for (let i = 0; i < FEC_HEADERS.length; i++) {
    if (headerCols[i] !== FEC_HEADERS[i]) {
      throw new Error(`Header FEC invalide : colonne ${i + 1} attendue "${FEC_HEADERS[i]}", trouvée "${headerCols[i]}".`);
    }
  }

  const dataLines = lines.slice(1);
  const entries = [];
  const warnings = [];
  let skippedLines = 0;

  for (let i = 0; i < dataLines.length; i++) {
    const line = dataLines[i];
    if (!line.trim()) continue;

    const cols = line.split(separator);
    if (cols.length !== 18) {
      skippedLines++;
      continue;
    }

    const ecritureDate = parseFecDateSync(cols[3]);
    if (!ecritureDate) {
      skippedLines++;
      warnings.push(`Ligne ${i + 2} : date invalide "${cols[3].trim()}" — ignorée.`);
      continue;
    }

    entries.push({
      journalCode: cols[0].trim(),
      journalLib: cols[1].trim(),
      ecritureNum: cols[2].trim(),
      ecritureDate,
      compteNum: cols[4].trim(),
      compteLib: cols[5].trim(),
      compAuxNum: cols[6].trim() || null,
      compAuxLib: cols[7].trim() || null,
      pieceRef: cols[8].trim(),
      pieceDate: parseFecDateSync(cols[9]),
      ecritureLib: cols[10].trim(),
      debit: parseMontantSync(cols[11]),
      credit: parseMontantSync(cols[12]),
      ecritureLet: cols[13].trim() || null,
      dateLet: parseFecDateSync(cols[14]),
      validDate: parseFecDateSync(cols[15]),
      montantDevise: parseMontantSync(cols[16]),
      idevise: cols[17].trim() || null,
    });
  }

  if (skippedLines > 0) {
    warnings.push(`${skippedLines} ligne(s) ignorée(s) sur ${entries.length + skippedLines}.`);
  }

  return { entries, fileName, encoding, separator, stats: { totalLines: entries.length, skippedLines, encoding, separator }, warnings };
}

function parseMontantSync(str) {
  if (!str || str.trim() === '') return 0;
  const val = parseFloat(str.trim().replace(/\s/g, '').replace(',', '.'));
  return isNaN(val) ? 0 : val;
}

function parseFecDateSync(str) {
  if (!str || str.trim() === '') return null;
  const s = str.trim();
  if (/^\d{8}$/.test(s)) {
    const y = parseInt(s.slice(0, 4));
    const m = parseInt(s.slice(4, 6)) - 1;
    const d = parseInt(s.slice(6, 8));
    const dt = new Date(y, m, d);
    return isNaN(dt.getTime()) ? null : dt;
  }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    const parts = s.split('/');
    const dt = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    return isNaN(dt.getTime()) ? null : dt;
  }
  return null;
}
