/**
 * computeBilanParam.js
 * Calcule les montants du bilan paramétrable à partir du FEC parsé et de la config D1.
 *
 * Modes de calcul (colonne `mode` de bilan_config) :
 *   SOLDE          = Σdébit − Σcrédit  (signé, peut être négatif)
 *   TOTAL_DEBIT    = Σdébit             (flux charges — toujours positif)
 *   TOTAL_CREDIT   = Σcrédit            (flux produits — toujours positif)
 *   TOTAL_DEBITEUR = max(Σdébit − Σcrédit, 0)   → part active du compte
 *   TOTAL_CREDITEUR= max(Σcrédit − Σdébit, 0)   → part passive du compte
 *
 * Les types 'total' et 'grandtotal' utilisent formula_refs : ["+id", "-id", ...]
 * Les types 'section', 'subsection', 'separator' n'ont pas de montant propre.
 *
 * Spécificité CUMA compte 45 : géré naturellement par TOTAL_DEBITEUR (actif)
 * et TOTAL_CREDITEUR (passif) — aucune logique spéciale requise.
 */

/**
 * Fonctions de calcul par mode.
 * @param {number} td  Σ débits pour le groupe de comptes
 * @param {number} tc  Σ crédits pour le groupe de comptes
 */
const MODE_FN = {
  SOLDE:           (td, tc) => td - tc,
  TOTAL_DEBIT:     (td, tc) => td,
  TOTAL_CREDIT:    (td, tc) => tc,
  TOTAL_DEBITEUR:  (td, tc) => Math.max(td - tc, 0),
  TOTAL_CREDITEUR: (td, tc) => Math.max(tc - td, 0),
};

/**
 * @param {object[]} config   — items D1 (code_ranges et formula_refs déjà désérialisés)
 * @param {object}   parsedFec — { entries: [] }  chaque entry : { CompteNum, Debit, Credit, JournalCode }
 * @returns {{ actif: object[], passif: object[], resultat: object[] }}
 */
export function computeBilanParam(config, parsedFec) {
  // Exclure les écritures ANC (à-nouveau) — elles concernent le bilan d'ouverture
  // Les champs du FEC parsé sont en camelCase : journalCode, compteNum, debit, credit
  const entries = (parsedFec?.entries ?? []).filter(e => e.journalCode !== 'ANC');

  // ── Pré-agréger toutes les écritures par compte ──────────────────────────
  // accountMap : { compteNum → { td: Σdébits, tc: Σcrédits } }
  const accountMap = {};
  for (const e of entries) {
    const num = e.compteNum;
    if (!num) continue;
    if (!accountMap[num]) accountMap[num] = { td: 0, tc: 0 };
    accountMap[num].td += e.debit  ?? 0;
    accountMap[num].tc += e.credit ?? 0;
  }

  // ── Calcul du montant d'un item type=line ─────────────────────────────────
  function computeLine(item) {
    const ranges = item.code_ranges ?? [];
    if (ranges.length === 0) return 0;

    const modeFn = MODE_FN[item.mode] ?? MODE_FN.SOLDE;

    let td = 0;
    let tc = 0;

    for (const [num, sums] of Object.entries(accountMap)) {
      if (ranges.some(r => num.startsWith(r))) {
        td += sums.td;
        tc += sums.tc;
      }
    }

    return modeFn(td, tc);
  }

  // ── Calcul de tous les items ──────────────────────────────────────────────
  const amountById = {};

  // Passe 1 : items type=line
  for (const item of config) {
    if (item.type === 'line') {
      amountById[item.id] = computeLine(item);
    }
  }

  // Passe 2 (multi-passes) : items type=total/grandtotal via formula_refs
  // Nécessaire car un grandtotal peut référencer d'autres totaux
  const totalItems = config.filter(i => i.type === 'total' || i.type === 'grandtotal');
  let maxPasses = 10;
  while (totalItems.some(i => amountById[i.id] === undefined) && maxPasses-- > 0) {
    for (const item of totalItems) {
      if (amountById[item.id] !== undefined) continue;

      const refs = item.formula_refs ?? [];
      const allResolved = refs.every(ref => {
        const refId = ref.replace(/^[+-]/, '');
        return amountById[refId] !== undefined;
      });
      if (!allResolved) continue;

      let total = 0;
      for (const ref of refs) {
        const sign  = ref.startsWith('-') ? -1 : 1;
        const refId = ref.replace(/^[+-]/, '');
        total += sign * (amountById[refId] ?? 0);
      }
      amountById[item.id] = total;
    }
  }

  // ── Enrichir chaque item avec son montant calculé ─────────────────────────
  const enriched = config.map(item => ({
    ...item,
    amount: amountById[item.id] ?? null,
  }));

  return {
    actif:    enriched.filter(i => i.doc === 'actif'),
    passif:   enriched.filter(i => i.doc === 'passif'),
    resultat: enriched.filter(i => i.doc === 'resultat'),
  };
}
