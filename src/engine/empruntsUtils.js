/**
 * empruntsUtils.js — calculs dérivés sur les emprunts (Export_Multi).
 */

const SITUATION_EN_COURS = 4;

/**
 * Pour un emprunt donné, renvoie la ligne d'échéancier la plus récente
 * (triée comme dans EmpruntDetailPanel : exercice puis n° de ligne).
 * @param {object[]} lignes — lignes de l'onglet "Lignes" déjà filtrées sur un seul nEmprunt
 * @returns {object|undefined}
 */
function latestLigne(lignes) {
  return [...lignes].sort((a, b) => {
    const ex = String(a.exercice ?? '').localeCompare(String(b.exercice ?? ''));
    if (ex !== 0) return ex;
    return (a.nLigne ?? 0) - (b.nLigne ?? 0);
  }).pop();
}

/**
 * Capital restant dû total des emprunts dans la situation donnée (4 = en cours
 * par défaut) : pour chaque emprunt concerné, on prend le Mt Restant Dû Réel
 * (ou Prév. si Réel absent) de sa ligne d'échéancier la plus récente, puis on
 * somme entre emprunts.
 * @param {object[]} emprunts
 * @param {object[]} lignesEmprunt
 * @param {number} [situation=4]
 * @returns {number}
 */
export function getCapitalRestantDu(emprunts, lignesEmprunt, situation = SITUATION_EN_COURS) {
  const idsEnCours = new Set(
    emprunts.filter((e) => Number(e.situation) === situation).map((e) => e.nEmprunt)
  );

  const lignesParEmprunt = new Map();
  for (const ligne of lignesEmprunt) {
    if (!idsEnCours.has(ligne.nEmprunt)) continue;
    if (!lignesParEmprunt.has(ligne.nEmprunt)) lignesParEmprunt.set(ligne.nEmprunt, []);
    lignesParEmprunt.get(ligne.nEmprunt).push(ligne);
  }

  let total = 0;
  for (const lignes of lignesParEmprunt.values()) {
    const derniere = latestLigne(lignes);
    if (!derniere) continue;
    const valeur = derniere.mtRestantDuReel ?? derniere.mtRestantDuPrev;
    total += Number(valeur) || 0;
  }
  return total;
}

/**
 * Nombre d'emprunts dans la situation donnée (4 = en cours par défaut).
 * @param {object[]} emprunts
 * @param {number} [situation=4]
 * @returns {number}
 */
export function countEmpruntsEnCours(emprunts, situation = SITUATION_EN_COURS) {
  return emprunts.filter((e) => Number(e.situation) === situation).length;
}

const PERIODE_LABELS = {
  A: 'Annuel',
  M: 'Mensuel',
  T: 'Trimestriel',
  S: 'Semestriel',
};

/**
 * Décode le code de périodicité d'un emprunt (champ "Annuite" du fichier
 * Export_Multi) en libellé lisible. Renvoie le code brut si inconnu.
 * @param {string|null|undefined} code
 * @returns {string}
 */
export function decodePeriode(code) {
  if (code === null || code === undefined || code === '') return '—';
  return PERIODE_LABELS[code] ?? String(code);
}

function ligneDate(ligne) {
  return ligne.dateReelle ?? ligne.datePrevue ?? null;
}

function ligneCapital(ligne) {
  return Number(ligne.mtCapitalReel ?? ligne.mtCapitalPrev) || 0;
}

function ligneInteret(ligne) {
  return Number(ligne.mtInteretReel ?? ligne.mtInteretPrev) || 0;
}

function addYears(date, years) {
  return new Date(date.getFullYear() + years, date.getMonth(), date.getDate());
}

/**
 * Pour chaque emprunt, calcule à la date de fin de période demandée : le
 * capital remboursé et les intérêts réglés cumulés depuis l'origine, le
 * capital restant dû, et la répartition du capital restant à rembourser
 * par tranche d'échéance (< 1 an / 1 à 5 ans / > 5 ans), en fenêtres
 * glissantes depuis dateFin (bornes incluses).
 * @param {object[]} emprunts
 * @param {object[]} lignesEmprunt
 * @param {Date} dateFin
 * @returns {object[]} les emprunts d'entrée, enrichis des champs calculés
 */
export function computeCrd5Ans(emprunts, lignesEmprunt, dateFin) {
  const dateFin1An = addYears(dateFin, 1);
  const dateFin5Ans = addYears(dateFin, 5);

  return emprunts.map((emprunt) => {
    const lignes = lignesEmprunt.filter((l) => l.nEmprunt === emprunt.nEmprunt);

    let capitalRembourseCumule = 0;
    let interetsReglesCumule = 0;
    let capitalMoins1An = 0;
    let capitalEntre1Et5Ans = 0;
    let capitalPlusDe5Ans = 0;

    for (const ligne of lignes) {
      const date = ligneDate(ligne);
      if (!date) continue;
      const capital = ligneCapital(ligne);
      const interet = ligneInteret(ligne);

      if (date.getTime() <= dateFin.getTime()) {
        capitalRembourseCumule += capital;
        interetsReglesCumule += interet;
      } else if (date.getTime() <= dateFin1An.getTime()) {
        capitalMoins1An += capital;
      } else if (date.getTime() <= dateFin5Ans.getTime()) {
        capitalEntre1Et5Ans += capital;
      } else {
        capitalPlusDe5Ans += capital;
      }
    }

    return {
      ...emprunt,
      capitalRembourseCumule,
      interetsReglesCumule,
      capitalRestantDu: (Number(emprunt.montant) || 0) - capitalRembourseCumule,
      capitalMoins1An,
      capitalEntre1Et5Ans,
      capitalPlusDe5Ans,
    };
  });
}
