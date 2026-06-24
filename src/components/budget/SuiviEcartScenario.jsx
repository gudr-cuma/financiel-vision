import { Fragment, useState } from 'react';
import useStore from '../../store/useStore';
import useBudgetStore from '../../store/useBudgetStore';
import { ecart, ecartPct, tauxConso, resteAEngager, totalBudgetePoste, sortPostesByCode, groupRowsByNatureAndCode, sumRows, prorataRatio, resolveCoefficient } from '../../domain/budget/calculs';
import { realiseFromFec } from '../../domain/budget/realiseFromFec';
import { formatAmountFull, formatPercent, signColor } from '../../engine/formatUtils';
import PosteDrillDown from './PosteDrillDown';

const COLOR_BAS = '#FFF3E0';
const COLOR_HAUT = '#B1DCE2';
const AGG_FIELDS = ['budgete', 'budgeteBas', 'budgeteHaut', 'engage', 'realise'];

function withDerived(totals) {
  return {
    ...totals,
    ecart: ecart(totals.realise, totals.budgete),
    ecartPct: ecartPct(ecart(totals.realise, totals.budgete), totals.budgete),
    ecartBas: ecart(totals.realise, totals.budgeteBas),
    ecartHaut: ecart(totals.realise, totals.budgeteHaut),
    tauxConso: tauxConso(totals.realise, totals.engage, totals.budgete),
    resteAEngager: resteAEngager(totals.budgete, totals.engage, totals.realise),
  };
}

export function SuiviEcartScenario({ budget, activeScenarioId }) {
  const parsedFec = useStore(s => s.parsedFec);
  const updatePosteScenarioCoefficient = useBudgetStore(s => s.updatePosteScenarioCoefficient);
  const updateBudget = useBudgetStore(s => s.updateBudget);
  const [expandedPosteId, setExpandedPosteId] = useState(null);
  const [expandedCompte, setExpandedCompte] = useState(null);
  const [grouped, setGrouped] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState(new Set());
  const [collapsedNatures, setCollapsedNatures] = useState(new Set());
  const [prorata, setProrata] = useState(false);
  const [showCoefficients, setShowCoefficients] = useState(budget.afficherCoefficients ?? false);

  const toggleShowCoefficients = () => {
    const next = !showCoefficients;
    setShowCoefficients(next);
    updateBudget(budget.id, { afficherCoefficients: next });
  };

  const scenarioBas = budget.scenarios.find(s => s.type === 'bas');
  const scenarioHaut = budget.scenarios.find(s => s.type === 'haut');
  const ratio = prorata ? prorataRatio(new Date(budget.dateDebut), new Date(budget.dateFin)) : 1;

  const rows = sortPostesByCode(budget.postes).map(poste => {
    const budgete = totalBudgetePoste(poste, budget.scenarios, activeScenarioId) * ratio;
    const budgeteBas = scenarioBas ? totalBudgetePoste(poste, budget.scenarios, scenarioBas.id) * ratio : 0;
    const budgeteHaut = scenarioHaut ? totalBudgetePoste(poste, budget.scenarios, scenarioHaut.id) * ratio : 0;
    const engage = budget.engagements
      .filter(e => e.posteId === poste.id)
      .reduce((sum, e) => sum + e.montant, 0);
    const realise = parsedFec && poste.comptesMappes?.length > 0
      ? realiseFromFec(parsedFec, poste).reduce((sum, r) => sum + r.montant, 0)
      : 0;

    return withDerived({ poste, budgete, budgeteBas, budgeteHaut, engage, realise });
  });

  const totals = withDerived(sumRows(rows, AGG_FIELDS));

  const natureGroups = grouped
    ? groupRowsByNatureAndCode(rows).map(ng => ({
      ...ng,
      ...withDerived(sumRows(ng.rows, AGG_FIELDS)),
      codeGroups: ng.codeGroups.map(cg => ({ ...cg, ...withDerived(sumRows(cg.rows, AGG_FIELDS)) })),
    }))
    : [];

  const toggleGroup = (key) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const toggleNature = (nature) => {
    setCollapsedNatures(prev => {
      const next = new Set(prev);
      if (next.has(nature)) next.delete(nature); else next.add(nature);
      return next;
    });
  };

  const handleCoefficientChange = (posteId, scenario) => (e) => {
    const coefficient = parseFloat(e.target.value);
    if (Number.isFinite(coefficient) && scenario) {
      updatePosteScenarioCoefficient(budget.id, posteId, scenario.id, coefficient);
    }
  };

  const renderCoefficientInput = (poste, scenario) => {
    if (!scenario) return null;
    const isOverride = poste.scenarioCoefficients?.[scenario.id] !== undefined;
    return (
      <input
        type="number"
        step="0.05"
        value={resolveCoefficient(poste, scenario)}
        onChange={handleCoefficientChange(poste.id, scenario)}
        title={isOverride ? 'Coefficient propre à ce poste' : 'Coefficient hérité du scénario global — modifiez pour surcharger ce poste'}
        style={{
          display: 'block', width: '48px', padding: '2px 4px', fontSize: '11px', marginTop: '2px',
          borderRadius: '4px', textAlign: 'center',
          border: `1px solid ${isOverride ? '#FF8200' : '#E2E8F0'}`,
          fontStyle: isOverride ? 'normal' : 'italic',
          color: isOverride ? '#1A202C' : '#718096',
        }}
      />
    );
  };

  const renderPosteRow = (r) => (
    <Fragment key={r.poste.id}>
      <tr
        style={{ cursor: 'pointer' }}
        onClick={() => setExpandedPosteId(expandedPosteId === r.poste.id ? null : r.poste.id)}
      >
        <td style={cellStyle}>
          {expandedPosteId === r.poste.id ? '▾' : '▸'} {r.poste.code && <strong style={{ color: '#1A202C' }}>{r.poste.code}</strong>} {r.poste.code ? '— ' : ''}{r.poste.libelle}
        </td>
        <td style={cellStyle}>{formatAmountFull(r.budgete)}</td>
        <td style={cellStyle}>{formatAmountFull(r.engage)}</td>
        <td style={cellStyle}>{formatAmountFull(r.realise)}</td>
        <td style={{ ...cellStyle, color: signColor(r.ecart) }}>{formatAmountFull(r.ecart)}</td>
        <td style={{ ...cellStyle, color: signColor(r.ecart) }}>{formatPercent(r.ecartPct * 100)}</td>
        <td style={cellStyle}>{formatPercent(r.tauxConso * 100)}</td>
        <td style={cellStyle}>{formatAmountFull(r.resteAEngager)}</td>
        <td style={{ ...cellStyle, background: COLOR_BAS }} onClick={e => e.stopPropagation()}>
          {formatAmountFull(r.budgeteBas)}
          {showCoefficients && renderCoefficientInput(r.poste, scenarioBas)}
        </td>
        <td style={{ ...cellStyle, background: COLOR_BAS, color: signColor(r.ecartBas) }}>{formatAmountFull(r.ecartBas)}</td>
        <td style={{ ...cellStyle, background: COLOR_HAUT }} onClick={e => e.stopPropagation()}>
          {formatAmountFull(r.budgeteHaut)}
          {showCoefficients && renderCoefficientInput(r.poste, scenarioHaut)}
        </td>
        <td style={{ ...cellStyle, background: COLOR_HAUT, color: signColor(r.ecartHaut) }}>{formatAmountFull(r.ecartHaut)}</td>
      </tr>
      {expandedPosteId === r.poste.id && (
        <tr>
          <td colSpan={12} style={{ padding: '8px 8px 16px 24px', background: '#F8FAFB' }}>
            {!parsedFec || r.poste.comptesMappes?.length === 0 ? (
              <div style={{ fontSize: '12px', color: '#718096' }}>Pas de compte mappé ou pas de FEC chargé.</div>
            ) : (
              <PosteDrillDown poste={r.poste} entries={parsedFec.entries} expandedCompte={expandedCompte} onToggleCompte={setExpandedCompte} />
            )}
          </td>
        </tr>
      )}
    </Fragment>
  );

  const renderCodeGroupRow = (natureKey, g) => {
    const compositeKey = `${natureKey}|${g.key}`;
    return (
      <Fragment key={compositeKey}>
        <tr style={{ cursor: 'pointer', background: '#F0F7D4' }} onClick={() => toggleGroup(compositeKey)}>
          <td style={{ ...cellStyle, fontWeight: 700, paddingLeft: '24px' }}>{collapsedGroups.has(compositeKey) ? '▸' : '▾'} {g.key}</td>
          <td style={{ ...cellStyle, fontWeight: 700 }}>{formatAmountFull(g.budgete)}</td>
          <td style={{ ...cellStyle, fontWeight: 700 }}>{formatAmountFull(g.engage)}</td>
          <td style={{ ...cellStyle, fontWeight: 700 }}>{formatAmountFull(g.realise)}</td>
          <td style={{ ...cellStyle, fontWeight: 700, color: signColor(g.ecart) }}>{formatAmountFull(g.ecart)}</td>
          <td style={{ ...cellStyle, fontWeight: 700, color: signColor(g.ecart) }}>{formatPercent(g.ecartPct * 100)}</td>
          <td style={{ ...cellStyle, fontWeight: 700 }}>{formatPercent(g.tauxConso * 100)}</td>
          <td style={{ ...cellStyle, fontWeight: 700 }}>{formatAmountFull(g.resteAEngager)}</td>
          <td style={{ ...cellStyle, fontWeight: 700, background: COLOR_BAS }}>{formatAmountFull(g.budgeteBas)}</td>
          <td style={{ ...cellStyle, fontWeight: 700, background: COLOR_BAS, color: signColor(g.ecartBas) }}>{formatAmountFull(g.ecartBas)}</td>
          <td style={{ ...cellStyle, fontWeight: 700, background: COLOR_HAUT }}>{formatAmountFull(g.budgeteHaut)}</td>
          <td style={{ ...cellStyle, fontWeight: 700, background: COLOR_HAUT, color: signColor(g.ecartHaut) }}>{formatAmountFull(g.ecartHaut)}</td>
        </tr>
        {!collapsedGroups.has(compositeKey) && g.rows.map(renderPosteRow)}
      </Fragment>
    );
  };

  return (
    <div style={{ paddingTop: '16px' }}>
      {!parsedFec && (
        <div style={{ padding: '10px 14px', background: '#FFF3E0', border: '1px solid #FFD6A0', borderRadius: '8px', fontSize: '13px', color: '#E57300', marginBottom: '16px' }}>
          Aucun FEC chargé : le Réalisé reste à 0. Chargez un dossier FEC pour calculer le réalisé depuis la comptabilité.
        </div>
      )}

      <div style={{ marginBottom: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setGrouped(g => !g)}
          style={{
            padding: '6px 12px', fontSize: '13px', fontWeight: 600, borderRadius: '6px', cursor: 'pointer',
            border: `1px solid ${grouped ? '#FF8200' : '#E2E8F0'}`,
            background: grouped ? '#FFF3E0' : '#FFFFFF',
            color: grouped ? '#E57300' : '#718096',
          }}
        >
          {grouped ? '✓ ' : ''}Regroupement postes
        </button>
        <button
          onClick={() => setProrata(p => !p)}
          title="Proratise le Budgété en fonction des jours écoulés depuis le début de l'exercice"
          style={{
            padding: '6px 12px', fontSize: '13px', fontWeight: 600, borderRadius: '6px', cursor: 'pointer',
            border: `1px solid ${prorata ? '#FF8200' : '#E2E8F0'}`,
            background: prorata ? '#FFF3E0' : '#FFFFFF',
            color: prorata ? '#E57300' : '#718096',
          }}
        >
          {prorata ? '✓ ' : ''}Calcul au prorata temporis
        </button>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#718096', cursor: 'pointer', padding: '6px 4px' }}>
          <input type="checkbox" checked={showCoefficients} onChange={toggleShowCoefficients} />
          Afficher les coefficients par poste
        </label>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr>
              {['Poste', 'Budgété', 'Engagé', 'Réalisé', 'Écart', 'Écart %', 'Taux conso.', 'Reste à engager'].map(h => (
                <th key={h} style={headStyle}>{h}</th>
              ))}
              <th style={{ ...headStyle, background: COLOR_BAS }}>Budg. bas</th>
              <th style={{ ...headStyle, background: COLOR_BAS }}>Écart bas</th>
              <th style={{ ...headStyle, background: COLOR_HAUT }}>Budg. haut</th>
              <th style={{ ...headStyle, background: COLOR_HAUT }}>Écart haut</th>
            </tr>
          </thead>
          <tbody>
            {grouped ? (
              natureGroups.map(ng => (
                <Fragment key={ng.nature ?? 'sans-nature'}>
                  <tr style={{ cursor: 'pointer', background: '#E3F2F5' }} onClick={() => toggleNature(ng.nature)}>
                    <td style={{ ...cellStyle, fontWeight: 700 }}>{collapsedNatures.has(ng.nature) ? '▸' : '▾'} {ng.label}</td>
                    <td style={{ ...cellStyle, fontWeight: 700 }}>{formatAmountFull(ng.budgete)}</td>
                    <td style={{ ...cellStyle, fontWeight: 700 }}>{formatAmountFull(ng.engage)}</td>
                    <td style={{ ...cellStyle, fontWeight: 700 }}>{formatAmountFull(ng.realise)}</td>
                    <td style={{ ...cellStyle, fontWeight: 700, color: signColor(ng.ecart) }}>{formatAmountFull(ng.ecart)}</td>
                    <td style={{ ...cellStyle, fontWeight: 700, color: signColor(ng.ecart) }}>{formatPercent(ng.ecartPct * 100)}</td>
                    <td style={{ ...cellStyle, fontWeight: 700 }}>{formatPercent(ng.tauxConso * 100)}</td>
                    <td style={{ ...cellStyle, fontWeight: 700 }}>{formatAmountFull(ng.resteAEngager)}</td>
                    <td style={{ ...cellStyle, fontWeight: 700, background: COLOR_BAS }}>{formatAmountFull(ng.budgeteBas)}</td>
                    <td style={{ ...cellStyle, fontWeight: 700, background: COLOR_BAS, color: signColor(ng.ecartBas) }}>{formatAmountFull(ng.ecartBas)}</td>
                    <td style={{ ...cellStyle, fontWeight: 700, background: COLOR_HAUT }}>{formatAmountFull(ng.budgeteHaut)}</td>
                    <td style={{ ...cellStyle, fontWeight: 700, background: COLOR_HAUT, color: signColor(ng.ecartHaut) }}>{formatAmountFull(ng.ecartHaut)}</td>
                  </tr>
                  {!collapsedNatures.has(ng.nature) && ng.codeGroups.map(g => renderCodeGroupRow(ng.nature, g))}
                </Fragment>
              ))
            ) : (
              rows.map(renderPosteRow)
            )}
            {rows.length === 0 && (
              <tr><td colSpan={12} style={{ padding: '24px', textAlign: 'center', color: '#718096' }}>Aucun poste budgétaire.</td></tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              <td style={{ ...cellStyle, fontWeight: 700 }}>Total</td>
              <td style={{ ...cellStyle, fontWeight: 700 }}>{formatAmountFull(totals.budgete)}</td>
              <td style={{ ...cellStyle, fontWeight: 700 }}>{formatAmountFull(totals.engage)}</td>
              <td style={{ ...cellStyle, fontWeight: 700 }}>{formatAmountFull(totals.realise)}</td>
              <td colSpan={4} style={cellStyle}></td>
              <td style={{ ...cellStyle, fontWeight: 700, background: COLOR_BAS }}>{formatAmountFull(totals.budgeteBas)}</td>
              <td style={{ ...cellStyle, background: COLOR_BAS }}></td>
              <td style={{ ...cellStyle, fontWeight: 700, background: COLOR_HAUT }}>{formatAmountFull(totals.budgeteHaut)}</td>
              <td style={{ ...cellStyle, background: COLOR_HAUT }}></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

const cellStyle = { padding: '5px 6px', borderBottom: '1px solid #F1F5F9' };
const headStyle = { textAlign: 'left', padding: '5px 6px', borderBottom: '2px solid #E2E8F0', color: '#718096', fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap' };

export default SuiviEcartScenario;
