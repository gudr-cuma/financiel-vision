const TABS = [
  { id: 'saisie',          label: 'Saisie' },
  { id: 'financement',     label: 'Plan de financement' },
  { id: 'suivi',           label: 'Suivi & écarts' },
  { id: 'suivi-scenario',  label: 'Suivi & écart avec scénario' },
  { id: 'dashboard',       label: 'Dashboard' },
];

export function BudgetSubNav({ activeTab, onTabChange }) {
  return (
    <nav
      role="tablist"
      aria-label="Sous-onglets budget"
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: '0',
        borderBottom: '1px solid #E2E8F0',
        overflowX: 'auto',
        overflowY: 'visible',
        scrollbarWidth: 'none',
        marginTop: '16px',
      }}
    >
      {TABS.map(tab => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onTabChange(tab.id)}
            style={{
              padding: '10px 16px',
              fontSize: '13px',
              fontWeight: isActive ? 700 : 400,
              color: isActive ? '#1A202C' : '#718096',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: isActive ? '3px solid #FF8200' : '3px solid transparent',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'color 150ms, border-bottom-color 150ms',
              marginBottom: '-1px',
              flexShrink: 0,
            }}
            onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = '#4A5568'; }}
            onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = '#718096'; }}
          >
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}

export default BudgetSubNav;
