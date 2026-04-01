/**
 * Utilitaires de gestion de l'exercice comptable.
 * Gère les exercices calés (Jan–Déc) et décalés (ex. Avr–Mars).
 */

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

/**
 * Extrait le SIREN et la date de clôture depuis le nom du fichier FEC.
 * Pattern attendu : {SIREN}DONNEESCOMPTABLES{YYYYMMDD}.csv
 *
 * @param {string} fileName
 * @returns {{ siren: string, closingDate: Date }}
 */
export function extractSiren(fileName) {
  // Essayer les patterns connus : DONNEESCOMPTABLES, FEC, ou tout séparateur alphanum
  const match =
    fileName.match(/^(\d{9})DONNEESCOMPTABLES(\d{8})/i) ||
    fileName.match(/^(\d{9})FEC(\d{8})/i) ||
    fileName.match(/^(\d{9})[A-Z]+(\d{8})/i);
  if (!match) {
    return { siren: null, closingDate: null };
  }
  const siren = match[1];
  const raw = match[2];
  const closingDate = new Date(
    parseInt(raw.slice(0, 4)),
    parseInt(raw.slice(4, 6)) - 1,
    parseInt(raw.slice(6, 8))
  );
  return { siren, closingDate };
}

/**
 * Détecte la date de début d'exercice à partir des écritures d'à-nouveau (journal ANC).
 * Fallback : closingDate − 12 mois + 1 jour.
 *
 * @param {Array} entries - Toutes les écritures parsées
 * @param {Date} closingDate - Date de clôture
 * @returns {Date}
 */
export function detectExerciceStart(entries, closingDate) {
  if (!entries || entries.length === 0 || !closingDate) {
    return fallbackStart(closingDate);
  }

  const ancDates = entries
    .filter(e => e.journalCode === 'ANC' && e.ecritureDate)
    .map(e => e.ecritureDate.getTime());

  if (ancDates.length === 0) {
    return fallbackStart(closingDate);
  }

  const minTimestamp = Math.min(...ancDates);
  return new Date(minTimestamp);
}

function fallbackStart(closingDate) {
  if (!closingDate) return new Date();
  const start = new Date(closingDate);
  start.setFullYear(start.getFullYear() - 1);
  start.setDate(start.getDate() + 1);
  return start;
}

/**
 * Construit le tableau des mois de l'exercice dans l'ordre chronologique.
 * Ex. exercice Jan–Déc → [{ month: 1, year: 2024, label: 'Janvier 2024' }, ...]
 * Ex. exercice Avr–Mars → [{ month: 4, year: 2024, label: 'Avril 2024' }, ..., { month: 3, year: 2025, label: 'Mars 2025' }]
 *
 * @param {Date} startDate
 * @param {Date} endDate
 * @returns {Array<{ month: number, year: number, label: string, shortLabel: string }>}
 */
export function buildExerciceMonths(startDate, endDate) {
  if (!startDate || !endDate) return [];

  const months = [];
  const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

  let safety = 0;
  while (current <= end && safety < 24) {
    const month = current.getMonth() + 1; // 1-12
    const year = current.getFullYear();
    months.push({
      month,
      year,
      label: `${MONTHS_FR[month - 1]} ${year}`,
      shortLabel: MONTHS_FR[month - 1].slice(0, 3),
    });
    current.setMonth(current.getMonth() + 1);
    safety++;
  }

  return months;
}

/**
 * Retourne le nom du mois en français.
 * @param {number} monthNumber - 1 à 12
 * @returns {string}
 */
export function getMonthLabel(monthNumber) {
  return MONTHS_FR[monthNumber - 1] ?? '';
}

/**
 * Retourne le libellé de l'exercice.
 * Ex. "Exercice 2024" pour Jan–Déc, ou "Exercice avril 2024 — mars 2025" pour décalé.
 *
 * @param {Date} start
 * @param {Date} end
 * @returns {string}
 */
export function getExerciceLabel(start, end) {
  if (!start || !end) return 'Exercice';

  const startMonth = start.getMonth(); // 0 = janvier
  const endMonth = end.getMonth();

  // Exercice calé sur l'année civile (Jan–Déc)
  if (startMonth === 0 && endMonth === 11 && start.getFullYear() === end.getFullYear()) {
    return `Exercice ${end.getFullYear()}`;
  }

  // Exercice décalé
  const startLabel = MONTHS_FR[startMonth].toLowerCase();
  const endLabel = MONTHS_FR[endMonth].toLowerCase();
  return `Exercice ${startLabel} ${start.getFullYear()} — ${endLabel} ${end.getFullYear()}`;
}
