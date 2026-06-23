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
