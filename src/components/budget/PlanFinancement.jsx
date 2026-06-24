import useBudgetStore from '../../store/useBudgetStore';
import { validatePlanFinancement } from '../../domain/budget/regles';
import { totalBudgetePoste } from '../../domain/budget/calculs';
import { formatAmountFull, formatPercent } from '../../engine/formatUtils';
import FinanceurForm from './FinanceurForm';

const TYPE_LABELS = {
  subvention: 'Subvention',
  cotisation: 'Cotisation',
  prestation: 'Prestation',
  autofinancement: 'Autofinancement',
};

export function PlanFinancement({ budget, activeScenarioId }) {
  const addFinancement = useBudgetStore(s => s.addFinancement);
  const removeFinancement = useBudgetStore(s => s.removeFinancement);

  const lignesBudget = budget.postes.map(p => ({
    montantPrevu: totalBudgetePoste(p, budget.scenarios, activeScenarioId),
  }));
  const { valid, errors } = validatePlanFinancement(budget.financements, lignesBudget);

  const totalRecettes = budget.financements.reduce((sum, f) => sum + f.montant, 0);
  const totalDepenses = lignesBudget.reduce((sum, l) => sum + l.montantPrevu, 0);

  return (
    <div style={{ paddingTop: '16px' }}>
      <div style={{
        padding: '12px 16px', borderRadius: '8px', marginBottom: '16px',
        background: valid ? '#E8F5E0' : '#FFF3E0',
        border: `1px solid ${valid ? '#B7E4A0' : '#FFD6A0'}`,
      }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: valid ? '#268E00' : '#E57300' }}>
          {valid ? '✓ Plan de financement équilibré' : '⚠️ Plan de financement déséquilibré'}
        </div>
        <div style={{ fontSize: '12px', color: '#718096', marginTop: '2px' }}>
          Recettes : {formatAmountFull(totalRecettes)} · Dépenses : {formatAmountFull(totalDepenses)}
        </div>
        {!valid && errors.map((e, i) => (
          <div key={i} style={{ fontSize: '12px', color: '#991B1B', marginTop: '4px' }}>{e}</div>
        ))}
      </div>

      <FinanceurForm onSubmit={(data) => addFinancement(budget.id, data)} />

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr>
            {['Financeur', 'Type', 'Montant', 'Taux', 'Assiette éligible', ''].map(h => (
              <th key={h} style={{ textAlign: 'left', padding: '8px', borderBottom: '2px solid #E2E8F0', color: '#718096', fontSize: '11px', fontWeight: 700 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {budget.financements.map(f => (
            <tr key={f.id}>
              <td style={cellStyle}>{f.financeur}</td>
              <td style={cellStyle}>{TYPE_LABELS[f.typeRecette]}</td>
              <td style={cellStyle}>{formatAmountFull(f.montant)}</td>
              <td style={cellStyle}>{f.tauxIntervention != null ? formatPercent(f.tauxIntervention * 100, 0) : '—'}</td>
              <td style={cellStyle}>{f.assietteEligible != null ? formatAmountFull(f.assietteEligible) : '—'}</td>
              <td style={cellStyle}>
                <button onClick={() => removeFinancement(budget.id, f.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#718096' }}>🗑</button>
              </td>
            </tr>
          ))}
          {budget.financements.length === 0 && (
            <tr><td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#718096' }}>Aucun financeur. Ajoutez-en un ci-dessus.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

const cellStyle = { padding: '8px', borderBottom: '1px solid #F1F5F9' };

export default PlanFinancement;
