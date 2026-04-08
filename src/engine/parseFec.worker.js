/**
 * Web Worker dédié au parsing du FEC.
 * Tourne dans un thread séparé pour ne pas bloquer l'UI.
 * Reçoit : { file: File, fileName: string }
 * Émet via postMessage :
 *   { type: 'progress', percent: number }
 *   { type: 'done', result: ParsedFEC }
 *   { type: 'error', message: string }
 */

const FEC_HEADERS = [
  'JournalCode', 'JournalLib', 'EcritureNum', 'EcritureDate',
  'CompteNum', 'CompteLib', 'CompAuxNum', 'CompAuxLib',
  'PieceRef', 'PieceDate', 'EcritureLib', 'Debit', 'Credit',
  'EcritureLet', 'DateLet', 'ValidDate', 'Montantdevise', 'Idevise',
];

/** Détecte l'encodage en essayant UTF-8 puis ISO-8859-15. */
function detectEncoding(buffer) {
  // Tester UTF-8 BOM
  const bytes = new Uint8Array(buffer);
  if (bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
    return 'utf-8';
  }
  // Tester UTF-8 valide
  try {
    const decoder = new TextDecoder('utf-8', { fatal: true });
    decoder.decode(buffer);
    return 'utf-8';
  } catch {
    // Pas UTF-8 valide → ISO-8859-15
    return 'iso-8859-15';
  }
}

/** Détecte le séparateur en comptant |, \t et ; sur la première ligne. */
function detectSeparator(firstLine) {
  const pipes = (firstLine.match(/\|/g) || []).length;
  const tabs = (firstLine.match(/\t/g) || []).length;
  const semis = (firstLine.match(/;/g) || []).length;
  if (pipes === 17) return '|';
  if (tabs === 17) return '\t';
  if (semis === 17) return ';';
  // Choisir le plus fréquent
  const max = Math.max(pipes, tabs, semis);
  if (max === semis) return ';';
  return pipes >= tabs ? '|' : '\t';
}

/** Parse un montant au format français : "  31 004,01" → 31004.01 */
function parseMontant(str) {
  if (!str || str.trim() === '') return 0;
  const cleaned = str.trim().replace(/\s/g, '').replace(',', '.');
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : val;
}

/** Parse une date FEC. Supporte YYYYMMDD et DD/MM/YYYY. */
function parseFecDate(str) {
  if (!str || str.trim() === '') return null;
  const s = str.trim();
  // YYYYMMDD
  if (/^\d{8}$/.test(s)) {
    const y = parseInt(s.slice(0, 4));
    const m = parseInt(s.slice(4, 6)) - 1;
    const d = parseInt(s.slice(6, 8));
    const dt = new Date(y, m, d);
    if (isNaN(dt.getTime())) return null;
    return dt;
  }
  // DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    const parts = s.split('/');
    const dt = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    if (isNaN(dt.getTime())) return null;
    return dt;
  }
  return null;
}

self.onmessage = async function (event) {
  const { buffer, fileName } = event.data;

  try {
    // 1. Détection encodage
    const encoding = detectEncoding(buffer);
    const text = new TextDecoder(encoding).decode(buffer);
    const lines = text.split(/\r?\n/);
    const firstLine = lines[0] || '';

    // 2. Détection séparateur
    const separator = detectSeparator(firstLine);

    // 3. Validation header
    const headerCols = firstLine.split(separator).map(c => c.trim());
    if (headerCols.length !== 18) {
      self.postMessage({
        type: 'error',
        message: `Le fichier ne semble pas être un FEC valide. La première ligne contient ${headerCols.length} colonne(s) au lieu de 18.`,
      });
      return;
    }
    for (let i = 0; i < FEC_HEADERS.length; i++) {
      if (headerCols[i] !== FEC_HEADERS[i]) {
        self.postMessage({
          type: 'error',
          message: `Header FEC invalide : colonne ${i + 1} attendue "${FEC_HEADERS[i]}", trouvée "${headerCols[i]}". Vérifiez que la première ligne contient les 18 colonnes réglementaires.`,
        });
        return;
      }
    }

    // 4. Parsing ligne par ligne
    const dataLines = lines.slice(1);
    const totalLines = dataLines.filter(l => l.trim()).length;
    const entries = [];
    const warnings = [];
    let skippedLines = 0;
    let lastProgress = 0;

    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i];
      if (!line.trim()) continue;

      const cols = line.split(separator);
      if (cols.length !== 18) {
        skippedLines++;
        continue;
      }

      const ecritureDate = parseFecDate(cols[3]);
      if (!ecritureDate) {
        skippedLines++;
        warnings.push(`Ligne ${i + 2} : date invalide "${cols[3].trim()}" — ignorée.`);
        continue;
      }

      const debit = parseMontant(cols[11]);
      const credit = parseMontant(cols[12]);

      // Détection montant format anglo-saxon (point comme séparateur décimal)
      const rawDebit = cols[11].trim();
      const rawCredit = cols[12].trim();
      if (/^\d+\.\d+$/.test(rawDebit) || /^\d+\.\d+$/.test(rawCredit)) {
        self.postMessage({
          type: 'error',
          message: 'Le standard FEC exige la virgule comme séparateur décimal. Ce fichier semble utiliser un point. Veuillez exporter à nouveau depuis votre logiciel comptable.',
        });
        return;
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
        pieceDate: parseFecDate(cols[9]),
        ecritureLib: cols[10].trim(),
        debit,
        credit,
        ecritureLet: cols[13].trim() || null,
        dateLet: parseFecDate(cols[14]),
        validDate: parseFecDate(cols[15]),
        montantDevise: parseMontant(cols[16]),
        idevise: cols[17].trim() || null,
      });

      // Progrès tous les 500 entrées
      const progress = Math.floor((i / dataLines.length) * 100);
      if (progress >= lastProgress + 5) {
        lastProgress = progress;
        self.postMessage({ type: 'progress', percent: progress });
      }
    }

    if (skippedLines > 0) {
      warnings.push(`${skippedLines} ligne(s) ignorée(s) sur ${totalLines} (colonnes manquantes ou date invalide).`);
    }

    self.postMessage({
      type: 'done',
      result: {
        entries,
        fileName,
        encoding,
        separator,
        stats: {
          totalLines: entries.length,
          skippedLines,
          encoding,
          separator,
        },
        warnings,
      },
    });
  } catch (err) {
    self.postMessage({ type: 'error', message: `Erreur inattendue : ${err.message}` });
  }
};
