/**
 * computeBilanParam.js
 * Calcule les montants du bilan paramétrable à partir du FEC parsé et de la config D1.
 *
 * Logique :
 * - type='line'        → Σ(débit−crédit) × credit_sign  sur les comptes correspondants (hors ANC)
 * - type='total'       → évalue formula_refs (somme de ±montants d'autres items par ID)
 * - type='grandtotal'  → idem
 * - type='section','subsection','separator' → pas de montant propre
 *
 * Spécificité CUMA compte 45 :
 * Si un item de l'actif a code_ranges incluant '45' et credit_sign=1 → on n'inclut que la part débitrice nette.
 * Si un item du passif a code_ranges incluant '45' et credit_sign=-1 → on n'inclut que la part créditrice nette.
 * (solde net global des 45* calculé une seule fois)
 */

/**
 * @param {object[]} config  — items D1 (avec code_ranges et formula_refs déjà désérialisés)
 * @param {object}   parsedFec — { entries: [] } où chaque entry a { CompteNum, Debit, Credit, JournalCode }
 * @returns {{ actif: object[], passif: object[], resultat: object[] }}
 */
export function computeBilanParam(config, parsedFec) {
  const entries = (parsedFec?.entries ?? []).filter(e => e.JournalCode !== 'ANC');

  // ── Pré-calcul solde net global du compte 45 (adhérents CUMA) ──────────────
  let solde45 = 0;
  for (const e of entries) {
    if (e.CompteNum?.startsWith('45')) {
      solde45 += (e.Debit ?? 0) - (e.Credit ?? 0);
    }
  }

  // ── Calcul du montant brut d'un item type=line ─────────────────────────────
  function computeLine(item) {
    const ranges = item.code_ranges ?? [];
    if (ranges.length === 0) return 0;

    const has45 = ranges.includes('45');

    let sum = 0;
    for (const e of entries) {
      const num = e.CompteNum ?? '';

      // Traitement spécial compte 45
      if (has45 && num.startsWith('45')) {
        // Géré séparément via solde45 — on skip ici
        continue;
      }

      const match = ranges.some(r => num.startsWith(r));
      if (!match) continue;

      sum += (e.Debit ?? 0) - (e.Credit ?? 0);
    }

    // Injecter la part 45 selon le signe
    if (has45) {
      if (item.credit_sign === 1 && solde45 > 0) {
        // Actif : inclure seulement si débiteur net
        sum += solde45;
      } else if (item.credit_sign === -1 && solde45 < 0) {
        // Passif : inclure seulement si créditeur net (valeur absolue)
        sum += -solde45;
      }
      // Sinon contribution nulle
    }

    return sum * (item.credit_sign ?? 1);
  }

  // ── Calcul de tous les items en deux passes ────────────────────────────────
  const amountById = {};

  // Passe 1 : items type=line
  for (const item of config) {
    if (item.type === 'line') {
      amountById[item.id] = computeLine(item);
    }
  }

  // Passe 2 : items type=total/grandtotal (évaluer formula_refs)
  // Peut nécessiter plusieurs passes si des totaux référencent d'autres totaux
  const totalItems = config.filter(i => i.type === 'total' || i.type === 'grandtotal');
  let maxPasses = 10;
  while (totalItems.some(i => amountById[i.id] === undefined) && maxPasses-- > 0) {
    for (const item of totalItems) {
      if (amountById[item.id] !== undefined) continue;
      const refs = item.formula_refs ?? [];
      // Vérifier que toutes les références sont résolues
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

  // ── Enrichir chaque item avec son montant ──────────────────────────────────
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
