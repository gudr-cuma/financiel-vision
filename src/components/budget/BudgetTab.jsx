import { useState } from 'react';
import useBudgetStore from '../../store/useBudgetStore';
import { formatDate } from '../../engine/formatUtils';
import BudgetList from './BudgetList';
import BudgetWizard from './BudgetWizard';
import BudgetSubNav from './BudgetSubNav';
import { StatutControl } from './StatutControl';
import BudgetGrid from './BudgetGrid';
import PlanFinancement from './PlanFinancement';
import TableauEcarts from './TableauEcarts';
import SuiviEcartScenario from './SuiviEcartScenario';
import BudgetDashboard from './BudgetDashboard';
import ScenarioSelector from './ScenarioSelector';

export function BudgetTab() {
  const budgets = useBudgetStore(s => s.budgets);
  const updateBudget = useBudgetStore(s => s.updateBudget);
  const [openBudgetId, setOpenBudgetId] = useState(null);
  const [showWizard, setShowWizard] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('saisie');
  const [activeScenarioId, setActiveScenarioId] = useState(null);
  const [editingBudget, setEditingBudget] = useState(false);
  const [editValues, setEditValues] = useState({ nom: '', description: '' });

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

  const startEditBudget = () => {
    setEditValues({ nom: budget.nom, description: budget.description ?? '' });
    setEditingBudget(true);
  };

  const cancelEditBudget = () => setEditingBudget(false);

  const saveEditBudget = () => {
    if (!editValues.nom.trim()) return;
    updateBudget(budget.id, { nom: editValues.nom.trim(), description: editValues.description.trim() });
    setEditingBudget(false);
  };

  return (
    <div style={{ paddingTop: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {editingBudget ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '480px' }}>
              <input
                value={editValues.nom}
                onChange={e => setEditValues({ ...editValues, nom: e.target.value })}
                placeholder="Nom du budget"
                style={{ padding: '6px 10px', fontSize: '15px', fontWeight: 700, border: '1px solid #B1DCE2', borderRadius: '6px' }}
              />
              <textarea
                value={editValues.description}
                onChange={e => setEditValues({ ...editValues, description: e.target.value })}
                placeholder="Description (optionnel)"
                rows={2}
                style={{ padding: '6px 10px', fontSize: '13px', border: '1px solid #B1DCE2', borderRadius: '6px', resize: 'vertical' }}
              />
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={saveEditBudget} title="Valider" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#31B700', fontWeight: 700 }}>✓ Enregistrer</button>
                <button onClick={cancelEditBudget} title="Annuler" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#718096' }}>✕ Annuler</button>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#1A202C' }}>{budget.nom}</div>
                <button
                  onClick={startEditBudget}
                  title="Renommer / décrire le budget"
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#718096', fontSize: '13px' }}
                >✏️</button>
              </div>
              <div style={{ fontSize: '13px', color: '#718096' }}>
                {budget.type === 'projet' ? 'Projet' : 'Fonctionnement'} · Exercice {budget.exercice} ·
                {' '}{formatDate(new Date(budget.dateDebut))} – {formatDate(new Date(budget.dateFin))}
              </div>
              {budget.description && (
                <div style={{ fontSize: '13px', color: '#1A202C', marginTop: '4px', maxWidth: '640px', whiteSpace: 'pre-wrap' }}>
                  {budget.description}
                </div>
              )}
            </>
          )}
        </div>
        <button
          onClick={() => setOpenBudgetId(null)}
          style={{ padding: '6px 12px', fontSize: '13px', color: '#718096', background: 'transparent', border: '1px solid #E2E8F0', borderRadius: '6px', cursor: 'pointer', flexShrink: 0 }}
        >
          ✕ Retour à la liste
        </button>
      </div>

      <div style={{ marginBottom: '8px' }}>
        <StatutControl budget={budget} variant="full" />
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
