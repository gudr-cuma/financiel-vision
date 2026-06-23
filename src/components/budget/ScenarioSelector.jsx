import useBudgetStore from '../../store/useBudgetStore';

const TYPE_LABELS = { bas: 'Bas', median: 'Médian', haut: 'Haut' };
const ORDER = ['bas', 'median', 'haut'];

export function ScenarioSelector({ budgetId, scenarios, activeScenarioId, onChange }) {
  const updateScenario = useBudgetStore(s => s.updateScenario);

  const ordered = ORDER.map(type => scenarios.find(s => s.type === type)).filter(Boolean);

  return (
    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '12px', flexWrap: 'wrap' }}>
      <span style={{ fontSize: '11px', fontWeight: 700, color: '#718096', textTransform: 'uppercase', marginRight: '4px' }}>
        Scénario
      </span>
      {ordered.map(scenario => {
        const isActive = scenario.id === activeScenarioId;
        return (
          <div
            key={scenario.id}
            style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              padding: '4px 8px', borderRadius: '999px',
              background: isActive ? '#E8F5E0' : '#F8FAFB',
              border: `1px solid ${isActive ? '#B7E4A0' : '#E2E8F0'}`,
            }}
          >
            <button
              onClick={() => onChange(scenario.id)}
              style={{
                fontSize: '12px', fontWeight: isActive ? 700 : 500,
                color: isActive ? '#268E00' : '#1A202C',
                background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
              }}
            >
              {TYPE_LABELS[scenario.type]}
            </button>
            {scenario.type !== 'median' && (
              <input
                type="number"
                step="0.05"
                value={scenario.coefficient}
                onChange={e => {
                  const coefficient = parseFloat(e.target.value);
                  if (Number.isFinite(coefficient)) updateScenario(budgetId, scenario.id, { coefficient });
                }}
                title="Coefficient appliqué au scénario médian"
                style={{ width: '48px', padding: '2px 4px', fontSize: '11px', border: '1px solid #E2E8F0', borderRadius: '4px', textAlign: 'center' }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default ScenarioSelector;
