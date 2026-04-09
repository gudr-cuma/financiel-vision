/**
 * POST /api/bilan-config/seed
 * Insère le gabarit CUMA par défaut. Admin uniquement. One-shot — supprimer après usage.
 */
import { saveBilanConfig } from '../../_lib/db.js';
import { json, error, forbidden, methodNotAllowed } from '../../_lib/responses.js';

function uid() { return crypto.randomUUID(); }

function buildSeed() {
  const items = [];
  let pos = 0;

  function add(doc, type, label, opts = {}) {
    const item = { id: uid(), doc, type, label, position: pos++, credit_sign: opts.credit_sign ?? 1, bold: opts.bold ?? false, parent_id: opts.parent_id ?? null, code_ranges: opts.code_ranges ?? null, formula_refs: opts.formula_refs ?? null };
    items.push(item);
    return item;
  }

  // ── ACTIF ────────────────────────────────────────────────────────────────────
  pos = 0;
  const aImmo = add('actif', 'section', 'ACTIF IMMOBILISÉ', { bold: true });
  const aImmoIncorp  = add('actif', 'subsection', 'Immobilisations incorporelles', { parent_id: aImmo.id });
  const lFraisEtab   = add('actif', 'line', 'Frais établissement et R&D', { parent_id: aImmoIncorp.id, code_ranges: ['20'], credit_sign: 1 });
  const lAutresIncorp= add('actif', 'line', 'Autres immob. incorporelles', { parent_id: aImmoIncorp.id, code_ranges: ['26','27'], credit_sign: 1 });
  const lAmortIncorp = add('actif', 'line', 'Amortissements incorporelles', { parent_id: aImmoIncorp.id, code_ranges: ['280','290','296','297'], credit_sign: -1 });
  const tIncorp = add('actif', 'total', 'Total incorporelles', { parent_id: aImmo.id, bold: true, formula_refs: ['+'+lFraisEtab.id,'+'+lAutresIncorp.id,'+'+lAmortIncorp.id] });

  const aImmoCorp  = add('actif', 'subsection', 'Immobilisations corporelles', { parent_id: aImmo.id });
  const lTerrains  = add('actif', 'line', 'Terrains et agencements', { parent_id: aImmoCorp.id, code_ranges: ['21','22','23'], credit_sign: 1 });
  const lAmortCorp = add('actif', 'line', 'Amortissements corporelles', { parent_id: aImmoCorp.id, code_ranges: ['281','282','283','284','285','286','287','288'], credit_sign: -1 });
  const tCorp = add('actif', 'total', 'Total corporelles', { parent_id: aImmo.id, bold: true, formula_refs: ['+'+lTerrains.id,'+'+lAmortCorp.id] });

  const aImmoFin  = add('actif', 'subsection', 'Immobilisations financières', { parent_id: aImmo.id });
  const lPartici  = add('actif', 'line', 'Participations et prêts', { parent_id: aImmoFin.id, code_ranges: ['25'], credit_sign: 1 });
  const lDeprecFin= add('actif', 'line', 'Dépréciations financières', { parent_id: aImmoFin.id, code_ranges: ['291','293','295'], credit_sign: -1 });
  const tFin = add('actif', 'total', 'Total financières', { parent_id: aImmo.id, bold: true, formula_refs: ['+'+lPartici.id,'+'+lDeprecFin.id] });

  const tImmo = add('actif', 'total', 'TOTAL ACTIF IMMOBILISÉ', { bold: true, formula_refs: ['+'+tIncorp.id,'+'+tCorp.id,'+'+tFin.id] });

  const aCirc = add('actif', 'section', 'ACTIF CIRCULANT', { bold: true });
  const lStocks  = add('actif', 'line', 'Stocks et en-cours', { parent_id: aCirc.id, code_ranges: ['3'], credit_sign: 1 });
  const lCreAd   = add('actif', 'line', 'Créances adhérents (solde débiteur)', { parent_id: aCirc.id, code_ranges: ['45'], credit_sign: 1 });
  const lCreCli  = add('actif', 'line', 'Créances clients et comptes rattachés', { parent_id: aCirc.id, code_ranges: ['409','41'], credit_sign: 1 });
  const lCreFisc = add('actif', 'line', 'Créances fiscales et sociales', { parent_id: aCirc.id, code_ranges: ['44'], credit_sign: 1 });
  const lAutreCre= add('actif', 'line', 'Autres créances', { parent_id: aCirc.id, code_ranges: ['46','47'], credit_sign: 1 });
  const lDispo   = add('actif', 'line', 'Disponibilités', { parent_id: aCirc.id, code_ranges: ['50','51','53'], credit_sign: 1 });
  const tCirc = add('actif', 'total', 'TOTAL ACTIF CIRCULANT', { bold: true, formula_refs: ['+'+lStocks.id,'+'+lCreAd.id,'+'+lCreCli.id,'+'+lCreFisc.id,'+'+lAutreCre.id,'+'+lDispo.id] });

  add('actif', 'grandtotal', 'TOTAL ACTIF', { bold: true, formula_refs: ['+'+tImmo.id,'+'+tCirc.id] });

  // ── PASSIF ───────────────────────────────────────────────────────────────────
  pos = 0;
  const pCapProp = add('passif', 'section', 'CAPITAUX PROPRES', { bold: true });
  const lCapital = add('passif', 'line', 'Capital social', { parent_id: pCapProp.id, code_ranges: ['101','102','103','104'], credit_sign: -1 });
  const lResLeg  = add('passif', 'line', 'Réserve légale', { parent_id: pCapProp.id, code_ranges: ['1051'], credit_sign: -1 });
  const lAutRes  = add('passif', 'line', 'Autres réserves et report', { parent_id: pCapProp.id, code_ranges: ['106','11'], credit_sign: -1 });
  const lResExo  = add('passif', 'line', 'Résultat de l\'exercice', { parent_id: pCapProp.id, code_ranges: ['12'], credit_sign: -1 });
  const lSubInv  = add('passif', 'line', 'Subventions d\'investissement', { parent_id: pCapProp.id, code_ranges: ['13'], credit_sign: -1 });
  const tCapProp = add('passif', 'total', 'TOTAL CAPITAUX PROPRES', { bold: true, formula_refs: ['+'+lCapital.id,'+'+lResLeg.id,'+'+lAutRes.id,'+'+lResExo.id,'+'+lSubInv.id] });

  const pDettes = add('passif', 'section', 'DETTES', { bold: true });
  const lEmprunts= add('passif', 'line', 'Emprunts et dettes financières', { parent_id: pDettes.id, code_ranges: ['16'], credit_sign: -1 });
  const lProv    = add('passif', 'line', 'Provisions pour risques', { parent_id: pDettes.id, code_ranges: ['15'], credit_sign: -1 });
  const lDetAd   = add('passif', 'line', 'Dettes adhérents (solde créditeur)', { parent_id: pDettes.id, code_ranges: ['45'], credit_sign: -1 });
  const lDetFou  = add('passif', 'line', 'Dettes fournisseurs', { parent_id: pDettes.id, code_ranges: ['40'], credit_sign: -1 });
  const lDetSoc  = add('passif', 'line', 'Dettes sociales', { parent_id: pDettes.id, code_ranges: ['42','43'], credit_sign: -1 });
  const lDetFisc = add('passif', 'line', 'Dettes fiscales', { parent_id: pDettes.id, code_ranges: ['44'], credit_sign: -1 });
  const lAutDet  = add('passif', 'line', 'Autres dettes', { parent_id: pDettes.id, code_ranges: ['46','47'], credit_sign: -1 });
  const tDettes  = add('passif', 'total', 'TOTAL DETTES', { bold: true, formula_refs: ['+'+lEmprunts.id,'+'+lProv.id,'+'+lDetAd.id,'+'+lDetFou.id,'+'+lDetSoc.id,'+'+lDetFisc.id,'+'+lAutDet.id] });

  add('passif', 'grandtotal', 'TOTAL PASSIF', { bold: true, formula_refs: ['+'+tCapProp.id,'+'+tDettes.id] });

  // ── COMPTE DE RÉSULTAT ───────────────────────────────────────────────────────
  pos = 0;
  const rProdExpl = add('resultat', 'section', 'PRODUITS D\'EXPLOITATION', { bold: true });
  const lCA       = add('resultat', 'line', 'Chiffre d\'affaires', { parent_id: rProdExpl.id, code_ranges: ['701','702','703','704','705','706','707','708'], credit_sign: -1 });
  const lProdSto  = add('resultat', 'line', 'Production stockée', { parent_id: rProdExpl.id, code_ranges: ['713'], credit_sign: -1 });
  const lSubExp   = add('resultat', 'line', 'Subventions d\'exploitation', { parent_id: rProdExpl.id, code_ranges: ['74'], credit_sign: -1 });
  const lRepriExp = add('resultat', 'line', 'Reprises sur amortissements', { parent_id: rProdExpl.id, code_ranges: ['781','786'], credit_sign: -1 });
  const lAutProd  = add('resultat', 'line', 'Autres produits d\'exploitation', { parent_id: rProdExpl.id, code_ranges: ['75'], credit_sign: -1 });
  const tProdExpl = add('resultat', 'total', 'TOTAL PRODUITS D\'EXPLOITATION', { bold: true, formula_refs: ['+'+lCA.id,'+'+lProdSto.id,'+'+lSubExp.id,'+'+lRepriExp.id,'+'+lAutProd.id] });

  const rCharExp = add('resultat', 'section', 'CHARGES D\'EXPLOITATION', { bold: true });
  const lAchats   = add('resultat', 'line', 'Achats et variation de stocks', { parent_id: rCharExp.id, code_ranges: ['601','602','603','604','605','606','607'], credit_sign: 1 });
  const lServExt  = add('resultat', 'line', 'Services extérieurs', { parent_id: rCharExp.id, code_ranges: ['61','62'], credit_sign: 1 });
  const lPersonnel= add('resultat', 'line', 'Charges de personnel (dont 621)', { parent_id: rCharExp.id, code_ranges: ['64','621'], credit_sign: 1 });
  const lImpTax   = add('resultat', 'line', 'Impôts et taxes', { parent_id: rCharExp.id, code_ranges: ['63'], credit_sign: 1 });
  const lDotAmort = add('resultat', 'line', 'Dotations aux amortissements', { parent_id: rCharExp.id, code_ranges: ['681','686'], credit_sign: 1 });
  const lAutChar  = add('resultat', 'line', 'Autres charges d\'exploitation', { parent_id: rCharExp.id, code_ranges: ['65'], credit_sign: 1 });
  const tCharExp  = add('resultat', 'total', 'TOTAL CHARGES D\'EXPLOITATION', { bold: true, formula_refs: ['+'+lAchats.id,'+'+lServExt.id,'+'+lPersonnel.id,'+'+lImpTax.id,'+'+lDotAmort.id,'+'+lAutChar.id] });

  const tResExpl = add('resultat', 'total', 'RÉSULTAT D\'EXPLOITATION', { bold: true, formula_refs: ['+'+tProdExpl.id,'-'+tCharExp.id] });

  add('resultat', 'separator', '', {});

  const lProdFin  = add('resultat', 'line', 'Produits financiers', { code_ranges: ['76'], credit_sign: -1 });
  const lCharFin  = add('resultat', 'line', 'Charges financières', { code_ranges: ['66'], credit_sign: 1 });
  const tResFin   = add('resultat', 'total', 'RÉSULTAT FINANCIER', { bold: true, formula_refs: ['+'+lProdFin.id,'-'+lCharFin.id] });

  const tResCour  = add('resultat', 'total', 'RÉSULTAT COURANT AVANT IS', { bold: true, formula_refs: ['+'+tResExpl.id,'+'+tResFin.id] });

  add('resultat', 'separator', '', {});

  const lProdExc  = add('resultat', 'line', 'Produits exceptionnels', { code_ranges: ['77'], credit_sign: -1 });
  const lCharExc  = add('resultat', 'line', 'Charges exceptionnelles', { code_ranges: ['67'], credit_sign: 1 });
  const tResExc   = add('resultat', 'total', 'RÉSULTAT EXCEPTIONNEL', { bold: true, formula_refs: ['+'+lProdExc.id,'-'+lCharExc.id] });

  const lIS       = add('resultat', 'line', 'IS et participation', { code_ranges: ['69'], credit_sign: 1 });

  add('resultat', 'grandtotal', 'RÉSULTAT NET', { bold: true, formula_refs: ['+'+tResCour.id,'+'+tResExc.id,'-'+lIS.id] });

  return items;
}

export async function onRequestPost(context) {
  const { env, data } = context;

  if (data.user.role !== 'admin') return forbidden();

  try {
    const items = buildSeed();
    await saveBilanConfig(env.DB, items, data.user.id);
    return json({ ok: true, count: items.length, message: 'Gabarit CUMA inséré. Supprimez ce fichier maintenant.' });
  } catch (err) {
    return error(`Erreur seed : ${err.message}`, 500);
  }
}

export async function onRequest(context) {
  if (context.request.method !== 'POST') return methodNotAllowed();
  return onRequestPost(context);
}
