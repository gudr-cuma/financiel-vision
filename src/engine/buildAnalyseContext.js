/**
 * Construit le contexte textuel envoyé à l'API Claude pour l'analyse financière.
 * Formate toutes les données calculées en un message structuré.
 */

function fmt(n) {
  if (n === null || n === undefined || isNaN(n)) return 'N/A';
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Math.round(n)) + ' €';
}

function fmtPct(n) {
  if (n === null || n === undefined || isNaN(n)) return 'N/A';
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(n) + ' %';
}

function fmtDate(d) {
  if (!d) return 'N/A';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * @param {object} parsedFec
 * @param {object} sigResult
 * @param {object} bilanData
 * @param {object} treasuryData
 * @param {object} chargesData
 * @returns {{ systemPrompt: string, userMessage: string }}
 */
export function buildAnalyseContext(parsedFec, sigResult, bilanData, treasuryData, chargesData) {
  const { siren, exerciceStart, exerciceEnd, entries } = parsedFec;

  // -------------------------------------------------------------------------
  // Compute N-1 bilan from ANC entries
  // -------------------------------------------------------------------------
  const ancEntries = entries.filter(e => e.journalCode === 'ANC');
  const hasN1 = ancEntries.length > 0;

  function buildSoldes(ents) {
    const s = {};
    for (const e of ents) {
      if (!s[e.compteNum]) s[e.compteNum] = { debit: 0, credit: 0 };
      s[e.compteNum].debit += e.debit;
      s[e.compteNum].credit += e.credit;
    }
    return s;
  }

  function sumRanges(soldes, ranges, excludeRanges = []) {
    let total = 0;
    for (const [num, { debit, credit }] of Object.entries(soldes)) {
      if (!ranges.some(r => num.startsWith(r))) continue;
      if (excludeRanges.some(ex => num.startsWith(ex))) continue;
      total += debit - credit;
    }
    return Math.round(total);
  }

  let n1Str = '';
  if (hasN1) {
    const s = buildSoldes(ancEntries);
    const actImmo = -sumRanges(s, ['20','21','22','23','26','27'], ['28','29']);
    const amortImmo = sumRanges(s, ['28','29']);
    const actImmoNet = actImmo + amortImmo; // amortImmo is negative (credit) → reduces gross
    const actCirc = sumRanges(s, ['3','41','45','46','47','50','51','53','486'], ['495','491','49']);
    const cpSolde = -sumRanges(s, ['10','11','12','13','14']);
    const dettesSolde = -sumRanges(s, ['15','16','40','42','43','44','45','46','47','487'], ['409']);
    const totalActifN1 = sumRanges(s, ['20','21','22','23','26','27','28','29','3','41','45','46','47','50','51','53','486']);
    const totalPassifN1 = cpSolde + dettesSolde;

    n1Str = `
## BILAN N-1 (ouverture de l'exercice, source : écritures ANC)
Capitaux propres N-1 : ${fmt(-sumRanges(s, ['10','11','12','13','14']))}
Dettes totales N-1 : ${fmt(-sumRanges(s, ['15','16','40','42','43','44','487']))}
Disponibilités N-1 : ${fmt(sumRanges(s, ['50','51','53']))}
Note : N-1 reconstitué depuis les à-nouveaux — P&L N-1 non disponible dans ce FEC.`;
  } else {
    n1Str = '\nNote : Aucune écriture ANC détectée — données N-1 non disponibles.';
  }

  // -------------------------------------------------------------------------
  // SIG
  // -------------------------------------------------------------------------
  let sigStr = '## SOLDES INTERMÉDIAIRES DE GESTION (N)\n';
  for (const line of sigResult.lines) {
    const prefix = line.prefix ? line.prefix + ' ' : '  ';
    const pct = line.percentCa != null && !line.isTotal ? ` (${fmtPct(line.percentCa)} du CA)` : '';
    sigStr += `${prefix}${line.label} : ${fmt(line.amount)}${pct}\n`;
  }

  // -------------------------------------------------------------------------
  // Bilan N
  // -------------------------------------------------------------------------
  function bilanSection(section, sectionLabel) {
    let str = `\n### ${sectionLabel} : ${fmt(section._sousTotal)}\n`;
    for (const [key, val] of Object.entries(section)) {
      if (key.startsWith('_')) continue;
      if (val && val.montant !== 0) {
        str += `  - ${val.label} : ${fmt(val.montant)}\n`;
      }
    }
    return str;
  }

  let bilanStr = `\n## BILAN AU ${fmtDate(exerciceEnd)} (N)\nTotal Actif : ${fmt(bilanData.totalActif)} | Total Passif : ${fmt(bilanData.totalPassif)}\n`;
  bilanStr += `Bilan ${bilanData.bilanEquilibre ? 'ÉQUILIBRÉ' : `DÉSÉQUILIBRÉ (écart : ${fmt(bilanData.ecartBilan)})`}\n`;
  bilanStr += bilanSection(bilanData.actifImmobilise, 'Actif Immobilisé');
  bilanStr += bilanSection(bilanData.actifCirculant, 'Actif Circulant');
  bilanStr += bilanSection(bilanData.capitauxPropres, 'Capitaux Propres');
  bilanStr += bilanSection(bilanData.dettes, 'Dettes');

  // -------------------------------------------------------------------------
  // Ratios
  // -------------------------------------------------------------------------
  const r = bilanData.ratios;
  const ratiosStr = `
## RATIOS FINANCIERS (N)
- Fonds de Roulement (FR) : ${fmt(r.fondsRoulement.value)} — ${r.fondsRoulement.status}
- Besoin en Fonds de Roulement (BFR) : ${fmt(r.bfr.value)} — ${r.bfr.status}
- Autonomie financière : ${fmtPct(r.autonomieFinanciere.value)} — ${r.autonomieFinanciere.status}
- Liquidité générale : ${r.liquiditeGenerale.value ?? 'N/A'} — ${r.liquiditeGenerale.status}
`;

  // -------------------------------------------------------------------------
  // Trésorerie
  // -------------------------------------------------------------------------
  const tStr = `
## TRÉSORERIE (N)
- Solde final : ${fmt(treasuryData.soldeActuel)}
- Solde moyen : ${fmt(treasuryData.soldeMoyen)}
- Solde mini : ${fmt(treasuryData.soldeMini)}
- Solde maxi : ${fmt(treasuryData.soldeMaxi)}
- Total encaissements : ${fmt(treasuryData.totalEntrees)}
- Total décaissements : ${fmt(treasuryData.totalSorties)}
`;

  // -------------------------------------------------------------------------
  // Charges
  // -------------------------------------------------------------------------
  let chargesStr = `\n## STRUCTURE DES CHARGES (N) — Total : ${fmt(chargesData.totalCharges)}\n`;
  for (const cat of chargesData.categories) {
    chargesStr += `  - ${cat.label} : ${fmt(cat.montant)} (${fmtPct(cat.percent)})\n`;
  }

  // -------------------------------------------------------------------------
  // Monthly summary (key indicators only)
  // -------------------------------------------------------------------------
  let monthlyStr = '\n## DONNÉES MENSUELLES (N)\n';
  monthlyStr += 'Mois | CA | EBE | REX | Rés.Net\n';
  for (const m of sigResult.monthly) {
    monthlyStr += `${m.label.split(' ')[0]} ${m.year} | ${fmt(m.ca)} | ${fmt(m.ebe)} | ${fmt(m.rex)} | ${fmt(m.resultatNet)}\n`;
  }

  // -------------------------------------------------------------------------
  // Assemble
  // -------------------------------------------------------------------------
  const systemPrompt = `Tu es un expert-comptable senior avec 20 ans d'expérience en analyse financière d'entreprises françaises (PME, ETI, coopératives agricoles). Tu maîtrises les normes comptables françaises (PCG), la structure du Fichier des Écritures Comptables (FEC), et les ratios financiers standards utilisés par les banques et les commissaires aux comptes.`;

  const userMessage = `Voici les données financières pré-calculées par notre moteur d'analyse pour l'exercice clos le ${fmtDate(exerciceEnd)} (SIREN : ${siren || 'non détecté'}).

Les étapes de pré-traitement et de mapping des comptes sont déjà réalisées. Tu disposes directement des soldes agrégés et des postes reconstitués.

---

## INFORMATIONS GÉNÉRALES
- SIREN : ${siren || 'Non détecté'}
- Exercice : du ${fmtDate(exerciceStart)} au ${fmtDate(exerciceEnd)}
- Nombre d'écritures : ${entries.length.toLocaleString('fr-FR')}

${sigStr}
${bilanStr}
${ratiosStr}
${tStr}
${chargesStr}
${monthlyStr}
${n1Str}

---

Réalise maintenant une **analyse financière complète, structurée et professionnelle** accessible à un dirigeant non-comptable. Pour chaque indicateur, fournis la valeur brute et une interprétation claire.

**Plan d'analyse à suivre :**

### 1. SYNTHÈSE EXÉCUTIVE
- Présentation de l'entreprise (secteur présumé, taille, structure détectée)
- Verdict global sur la santé financière : saine / fragile / en difficulté
- Les 3 points forts majeurs
- Les 3 points de vigilance ou risques principaux
- Recommandations prioritaires

### 2. ANALYSE DU COMPTE DE RÉSULTAT
- 2.1 Chiffre d'affaires : montant, interprétation
- 2.2 Résultat d'exploitation : montant, taux de marge d'exploitation (REX/CA×100)
- 2.3 EBE/EBITDA : montant, taux d'EBE (EBE/CA×100), capacité à générer du cash
- 2.4 Résultat net : montant, taux de marge nette, analyse des écarts
- 2.5 Structure des coûts : répartition, évolution, postes anormaux

### 3. ANALYSE DU BILAN
- 3.1 Capital social
- 3.2 Capitaux propres : montant, autonomie financière
- 3.3 Endettement : dettes financières, taux d'endettement, capacité de remboursement (Dettes/EBE)
- 3.4 Fonds de Roulement : montant, FR/CA×100
- 3.5 BFR : montant, BFR en jours de CA
- 3.6 Trésorerie nette : montant, commentaire

### 4. ANALYSE TRÉSORERIE
- Commentaire sur l'évolution du solde de trésorerie
- Adéquation avec le niveau d'activité

### 5. ZONES À RISQUE & POINTS DE VIGILANCE
Classés par niveau de gravité : 🔴 Critique | 🟠 Important | 🟡 À surveiller

### 6. POINTS FORTS

### 7. TABLEAU DE BORD RÉCAPITULATIF
Tableau Markdown avec colonnes : Indicateur | Valeur N | Appréciation
Indicateurs à inclure : CA, EBE, Taux EBE, REX, Résultat net, Taux marge nette, Capitaux propres, Autonomie financière, Taux endettement, Capacité remboursement, FR, BFR en jours, Trésorerie.
Légende : 🟢 Satisfaisant | 🟡 À surveiller | 🔴 Préoccupant

### 8. RECOMMANDATIONS
5 recommandations concrètes et actionnables, classées par priorité :
- Problème ou opportunité identifié
- Action recommandée
- Impact attendu

**Contraintes :** Langue française professionnelle, chiffres avec séparateurs de milliers et symbole €, structure respectée scrupuleusement.`;

  return { systemPrompt, userMessage };
}
