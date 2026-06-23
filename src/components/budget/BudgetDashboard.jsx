import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import useStore from '../../store/useStore';
import { ecart, totalBudgetePoste, sortPostesByCode } from '../../domain/budget/calculs';
import { realiseFromFec } from '../../domain/budget/realiseFromFec';
import KpiCard from '../layout/KpiCard';

export function BudgetDashboard({ budget, activeScenarioId }) {
  const parsedFec = useStore(s => s.parsedFec);

  const rows = sortPostesByCode(budget.postes).map(poste => {
    const budgete = totalBudgetePoste(poste, budget.scenarios, activeScenarioId);
    const engage = budget.engagements
      .filter(e => e.posteId === poste.id)
      .reduce((sum, e) => sum + e.montant, 0);
    const realise = parsedFec && poste.comptesMappes?.length > 0
      ? realiseFromFec(parsedFec, poste).reduce((sum, r) => sum + r.montant, 0)
      : 0;
    return { libelle: poste.libelle, budgete, engage, realise, ecart: ecart(realise, budgete) };
  });

  const totalBudgete = rows.reduce((s, r) => s + r.budgete, 0);
  const totalEngage = rows.reduce((s, r) => s + r.engage, 0);
  const totalRealise = rows.reduce((s, r) => s + r.realise, 0);
  const totalEcart = ecart(totalRealise, totalBudgete);

  return (
    <div style={{ paddingTop: '16px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        <KpiCard label="Budgété" value={totalBudgete} color="#31B700" />
        <KpiCard label="Engagé" value={totalEngage} color="#FF8200" />
        <KpiCard label="Réalisé" value={totalRealise} color="#00965E" />
        <KpiCard label="Écart" value={totalEcart} color="#E53935" />
      </div>

      <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px', height: '360px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis dataKey="libelle" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="budgete" name="Budgété" fill="#B1DCE2" />
            <Bar dataKey="realise" name="Réalisé" fill="#31B700" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default BudgetDashboard;
