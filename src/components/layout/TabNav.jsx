import useStore from '../../store/useStore';

const TABS = [
  { id: 'sig',          icon: '📋', label: 'SIG' },
  { id: 'monthly',      icon: '📈', label: 'Analyses' },
  { id: 'treasury',     icon: '💰', label: 'Trésorerie' },
  { id: 'charges',      icon: '🥧', label: 'Charges' },
  { id: 'balance',      icon: '⚖️', label: 'Bilan' },
  { id: 'comparaison',  icon: '📊', label: 'Comparaison N/N-1' },
  { id: 'analytique',   icon: '🔬', label: 'Analytique' },
  { id: 'analyse',      icon: '🤖', label: 'Rapport IA' },
];

export function TabNav() {
  const activeTab = useStore((s) => s.activeTab);
  const setActiveTab = useStore((s) => s.setActiveTab);

  return (
    <nav
      role="tablist"
      aria-label="Navigation principale"
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: '0',
        borderBottom: '1px solid #E2E8F0',
        overflowX: 'auto',
        overflowY: 'visible',
        scrollbarWidth: 'none',
      }}
    >
      {TABS.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 16px',
              fontSize: '14px',
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
            onMouseEnter={(e) => {
              if (!isActive) e.currentTarget.style.color = '#4A5568';
            }}
            onMouseLeave={(e) => {
              if (!isActive) e.currentTarget.style.color = '#718096';
            }}
          >
            <span style={{ marginRight: '6px', fontSize: '15px' }}>{tab.icon}</span>{tab.label}
          </button>
        );
      })}
    </nav>
  );
}

export default TabNav;
