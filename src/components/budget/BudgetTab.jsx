import { useState } from 'react';
import useBudgetStore from '../../store/useBudgetStore';
import { formatDate } from '../../engine/formatUtils';
import BudgetList from './BudgetList';
import BudgetWizard from './BudgetWizard';
import BudgetSubNav from './BudgetSubNav';
import BudgetGrid from './BudgetGrid';
import PlanFinancement from './PlanFinancement';
import TableauEcarts from './TableauEcarts';
import SuiviEcartScenario from './SuiviEcartScenario';
import BudgetDashboard from './BudgetDashboard';
import ScenarioSelector from './ScenarioSelector';

export function BudgetTab() {
  const budgets = useBudgetStore(s => s.budgets);
  const [openBudgetId, setOpenBudgetId] = useState(null);
  const [showWizard, setShowWizard] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('saisie');
  const [activeScenarioId, setActiveScenarioId] = useState(null);

  const budget = budgets.find(b => b.id === openBudgetId);

  if (!budget) {
    return (
      <>
        <BudgetList
          onOpen={(id) => { setOpenBudgetId(id); setActiveScenarioId(null); }}
          onCreate={() => setShowWizard(true)}
        />
        {showWizard && (
          <BudgetWizard
            onClose={() => setShowWizard(false)}
            onCreated={(id) => { setShowWizard(false); setOpenBudgetId(id); setActiveSubTab('saisie'); setActiveScenarioId(null); }}
          />
        )}
      </>
    );
  }

  const resolvedScenarioId = budget.scenarios.some(s => s.id === activeScenarioId)
    ? activeScenarioId
    : (budget.scenarios.find(s => s.type === 'median') ?? budget.scenarios[0])?.id;

  return (
    <div style={{ paddingTop: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#1A202C' }}>{budget.nom}</div>
          <div style={{ fontSize: '13px', color: '#718096' }}>
            {budget.type === 'projet' ? 'Projet' : 'Fonctionnement'} · Exercice {budget.exercice} ·
            {' '}{formatDate(new Date(budget.dateDebut))} – {formatDate(new Date(budget.dateFin))}
          </div>
        </div>
        <button
          onClick={() => setOpenBudgetId(null)}
          style={{ padding: '6px 12px', fontSize: '13px', color: '#718096', background: 'transparent', border: '1px solid #E2E8F0', borderRadius: '6px', cursor: 'pointer' }}
        >
          ✕ Retour à la liste
        </button>
      </div>

      <ScenarioSelector
        budgetId={budget.id}
        scenarios={budget.scenarios}
        activeScenarioId={resolvedScenarioId}
        onChange={setActiveScenarioId}
      />

      <BudgetSubNav activeTab={activeSubTab} onTabChange={setActiveSubTab} />

      <div style={{ paddingTop: '4px' }}>
        {activeSubTab === 'saisie' && <BudgetGrid budget={budget} activeScenarioId={resolvedScenarioId} />}
        {activeSubTab === 'financement' && <PlanFinancement budget={budget} activeScenarioId={resolvedScenarioId} />}
        {activeSubTab === 'suivi' && <TableauEcarts budget={budget} activeScenarioId={resolvedScenarioId} />}
        {activeSubTab === 'suivi-scenario' && <SuiviEcartScenario budget={budget} activeScenarioId={resolvedScenarioId} />}
        {activeSubTab === 'dashboard' && <BudgetDashboard budget={budget} activeScenarioId={resolvedScenarioId} />}
      </div>
    </div>
  );
}

export default BudgetTab;
