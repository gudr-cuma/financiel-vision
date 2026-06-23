import { Fragment, useState } from 'react';
import useStore from '../../store/useStore';
import { ecart, ecartPct, tauxConso, resteAEngager, totalBudgetePoste, sortPostesByCode, groupKeyForCode } from '../../domain/budget/calculs';
import { realiseFromFec } from '../../domain/budget/realiseFromFec';
import { formatAmountFull, formatPercent, signColor } from '../../engine/formatUtils';
import PosteDrillDown from './PosteDrillDown';

const COLOR_BAS = '#FFF3E0';
const COLOR_HAUT = '#B1DCE2';

export function SuiviEcartScenario({ budget, activeScenarioId }) {
  const parsedFec = useStore(s => s.parsedFec);
  const [expandedPosteId, setExpandedPosteId] = useState(null);
  const [expandedCompte, setExpandedCompte] = useState(null);
  const [grouped, setGrouped] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState(new Set());

  const scenarioBas = budget.scenarios.find(s => s.type === 'bas');
  const scenarioHaut = budget.scenarios.find(s => s.type === 'haut');

  const rows = sortPostesByCode(budget.postes).map(poste => {
    const budgete = totalBudgetePoste(poste, budget.scenarios, activeScenarioId);
    const budgeteBas = scenarioBas ? totalBudgetePoste(poste, budget.scenarios, scenarioBas.id) : 0;
    const budgeteHaut = scenarioHaut ? totalBudgetePoste(poste, budget.scenarios, scenarioHaut.id) : 0;
    const engage = budget.engagements
      .filter(e => e.posteId === poste.id)
      .reduce((sum, e) => sum + e.montant, 0);
    const realise = parsedFec && poste.comptesMappes?.length > 0
      ? realiseFromFec(parsedFec, poste).reduce((sum, r) => sum + r.montant, 0)
      : 0;

    return {
      poste, budgete, budgeteBas, budgeteHaut, engage, realise,
      ecart: ecart(realise, budgete),
      ecartPct: ecartPct(ecart(realise, budgete), budgete),
      ecartBas: ecart(realise, budgeteBas),
      ecartHaut: ecart(realise, budgeteHaut),
      tauxConso: tauxConso(realise, engage, budgete),
      resteAEngager: resteAEngager(budgete, engage, realise),
    };
  });

  const totals = rows.reduce((acc, r) => ({
    budgete: acc.budgete + r.budgete, budgeteBas: acc.budgeteBas + r.budgeteBas, budgeteHaut: acc.budgeteHaut + r.budgeteHaut,
    engage: acc.engage + r.engage, realise: acc.realise + r.realise,
  }), { budgete: 0, budgeteBas: 0, budgeteHaut: 0, engage: 0, realise: 0 });

  const groups = [];
  if (grouped) {
    const byKey = new Map();
    for (const row of rows) {
      const key = groupKeyForCode(row.poste.code);
      if (!byKey.has(key)) byKey.set(key, []);
      byKey.get(key).push(row);
    }
    for (const [key, groupRows] of byKey) {
      const t = groupRows.reduce((acc, r) => ({
        budgete: acc.budgete + r.budgete, budgeteBas: acc.budgeteBas + r.budgeteBas, budgeteHaut: acc.budgeteHaut + r.budgeteHaut,
        engage: acc.engage + r.engage, realise: acc.realise + r.realise,
      }), { budgete: 0, budgeteBas: 0, budgeteHaut: 0, engage: 0, realise: 0 });
      groups.push({
        key, rows: groupRows, ...t,
        ecart: ecart(t.realise, t.budgete),
        ecartPct: ecartPct(ecart(t.realise, t.budgete), t.budgete),
        ecartBas: ecart(t.realise, t.budgeteBas),
        ecartHaut: ecart(t.realise, t.budgeteHaut),
        tauxConso: tauxConso(t.realise, t.engage, t.budgete),
        resteAEngager: resteAEngager(t.budgete, t.engage, t.realise),
      });
    }
  }

  const toggleGroup = (key) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
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
        <td style={{ ...cellStyle, background: COLOR_BAS }}>{formatAmountFull(r.budgeteBas)}</td>
        <td style={{ ...cellStyle, background: COLOR_BAS, color: signColor(r.ecartBas) }}>{formatAmountFull(r.ecartBas)}</td>
        <td style={{ ...cellStyle, background: COLOR_HAUT }}>{formatAmountFull(r.budgeteHaut)}</td>
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

  return (
    <div style={{ paddingTop: '16px' }}>
      {!parsedFec && (
        <div style={{ padding: '10px 14px', background: '#FFF3E0', border: '1px solid #FFD6A0', borderRadius: '8px', fontSize: '13px', color: '#E57300', marginBottom: '16px' }}>
          Aucun FEC chargé : le Réalisé reste à 0. Chargez un dossier FEC pour calculer le réalisé depuis la comptabilité.
        </div>
      )}

      <div style={{ marginBottom: '12px' }}>
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
              groups.map(g => (
                <Fragment key={g.key}>
                  <tr style={{ cursor: 'pointer', background: '#F0F7D4' }} onClick={() => toggleGroup(g.key)}>
                    <td style={{ ...cellStyle, fontWeight: 700 }}>{collapsedGroups.has(g.key) ? '▸' : '▾'} {g.key}</td>
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
                  {!collapsedGroups.has(g.key) && g.rows.map(renderPosteRow)}
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
