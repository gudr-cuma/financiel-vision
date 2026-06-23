import { useMemo, useRef, useState } from 'react';
import useBudgetStore from '../../store/useBudgetStore';

const STATUT_LABELS = {
  brouillon: 'Brouillon',
  soumis: 'Soumis',
  valide: 'Validé',
  cloture: 'Clôturé',
  revise: 'Révisé',
};

const STATUT_COLORS = {
  brouillon: { bg: '#F8FAFB', color: '#718096' },
  soumis: { bg: '#FFF3E0', color: '#E57300' },
  valide: { bg: '#E8F5E0', color: '#268E00' },
  cloture: { bg: '#E3F2F5', color: '#1A202C' },
  revise: { bg: '#FFF3E0', color: '#E57300' },
};

function StatutBadge({ statut }) {
  const c = STATUT_COLORS[statut] ?? STATUT_COLORS.brouillon;
  return (
    <span style={{
      display: 'inline-block', padding: '2px 10px', borderRadius: '999px',
      fontSize: '12px', fontWeight: 600, background: c.bg, color: c.color,
    }}>
      {STATUT_LABELS[statut] ?? statut}
    </span>
  );
}

export function BudgetList({ onOpen, onCreate }) {
  const budgets = useBudgetStore(s => s.budgets);
  const duplicateBudget = useBudgetStore(s => s.duplicateBudget);
  const deleteBudget = useBudgetStore(s => s.deleteBudget);
  const exportBudgets = useBudgetStore(s => s.exportBudgets);
  const importBudgets = useBudgetStore(s => s.importBudgets);

  const [filterType, setFilterType] = useState('tous');
  const [filterExercice, setFilterExercice] = useState('tous');
  const [filterStatut, setFilterStatut] = useState('tous');
  const [importError, setImportError] = useState(null);
  const fileInputRef = useRef(null);

  const exercices = useMemo(
    () => [...new Set(budgets.map(b => b.exercice))].sort((a, b) => b - a),
    [budgets]
  );

  const filtered = budgets.filter(b =>
    (filterType === 'tous' || b.type === filterType) &&
    (filterExercice === 'tous' || String(b.exercice) === filterExercice) &&
    (filterStatut === 'tous' || b.statut === filterStatut)
  );

  const handleExport = () => {
    const json = exportBudgets();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `budgets_export_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (file) => {
    setImportError(null);
    try {
      const text = await file.text();
      importBudgets(text);
    } catch (err) {
      setImportError(err.message);
    }
  };

  return (
    <div style={{ paddingTop: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1A202C', margin: 0 }}>Suivi budgétaire</h2>
          <p style={{ fontSize: '13px', color: '#718096', margin: '4px 0 0' }}>
            Budgets projet et fonctionnement de la fédération
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={handleExport} style={btnSecondary}>⬇️ Exporter</button>
          <button onClick={() => fileInputRef.current?.click()} style={btnSecondary}>⬆️ Importer</button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            style={{ display: 'none' }}
            onChange={e => e.target.files[0] && handleImportFile(e.target.files[0])}
          />
          <button onClick={onCreate} style={btnPrimary}>+ Nouveau budget</button>
        </div>
      </div>

      {importError && (
        <div style={{ marginBottom: '12px', padding: '10px 14px', background: '#FEF2F2', border: '1px solid #F87171', borderRadius: '8px', fontSize: '13px', color: '#991B1B' }}>
          {importError}
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} style={selectStyle}>
          <option value="tous">Tous types</option>
          <option value="projet">Projet</option>
          <option value="fonctionnement">Fonctionnement</option>
        </select>
        <select value={filterExercice} onChange={e => setFilterExercice(e.target.value)} style={selectStyle}>
          <option value="tous">Tous exercices</option>
          {exercices.map(ex => <option key={ex} value={ex}>{ex}</option>)}
        </select>
        <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)} style={selectStyle}>
          <option value="tous">Tous statuts</option>
          {Object.entries(STATUT_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div style={{ padding: '40px 24px', textAlign: 'center', color: '#718096', fontSize: '14px' }}>
          Aucun budget. Cliquez sur « + Nouveau budget » pour commencer.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filtered.map(b => (
            <div
              key={b.id}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 16px', background: '#FFFFFF', border: '1px solid #E2E8F0',
                borderRadius: '10px', cursor: 'pointer', transition: 'background 120ms',
              }}
              onClick={() => onOpen(b.id)}
              onMouseEnter={e => { e.currentTarget.style.background = '#F8FAFB'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#FFFFFF'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                <span style={{ fontSize: '20px' }}>{b.type === 'projet' ? '🎯' : '🏢'}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#1A202C' }}>{b.nom}</div>
                  <div style={{ fontSize: '12px', color: '#718096' }}>
                    {b.type === 'projet' ? 'Projet' : 'Fonctionnement'} · Exercice {b.exercice}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <StatutBadge statut={b.statut} />
                <button
                  onClick={e => { e.stopPropagation(); duplicateBudget(b.id); }}
                  title="Dupliquer"
                  style={iconBtn}
                >⧉</button>
                <button
                  onClick={e => { e.stopPropagation(); if (confirm(`Supprimer le budget "${b.nom}" ?`)) deleteBudget(b.id); }}
                  title="Supprimer"
                  style={iconBtn}
                >🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const btnPrimary = {
  padding: '9px 16px', fontSize: '13px', fontWeight: 700, color: '#FFFFFF',
  background: '#31B700', border: 'none', borderRadius: '8px', cursor: 'pointer',
};

const btnSecondary = {
  padding: '9px 16px', fontSize: '13px', fontWeight: 600, color: '#1A202C',
  background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', cursor: 'pointer',
};

const selectStyle = {
  padding: '7px 10px', fontSize: '13px', border: '1px solid #E2E8F0',
  borderRadius: '6px', background: '#FFFFFF', color: '#1A202C', cursor: 'pointer',
};

const iconBtn = {
  padding: '4px 8px', fontSize: '14px', background: 'transparent',
  border: 'none', cursor: 'pointer', color: '#718096',
};

export default BudgetList;
