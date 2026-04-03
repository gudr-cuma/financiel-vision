import useStore from '../../store/useStore';

const TABS = [
  { id: 'sig',         icon: '📋', label: 'SIG' },
  { id: 'monthly',     icon: '📈', label: 'Analyses' },
  { id: 'treasury',    icon: '💰', label: 'Trésorerie' },
  { id: 'charges',     icon: '🥧', label: 'Charges' },
  { id: 'balance',     icon: '⚖️', label: 'Bilan' },
  { id: 'comparaison', icon: '📊', label: 'Comparaison N/N-1' },
  { id: 'analytique',  icon: '🔬', label: 'Analytique' },
];

export function TabNav() {
  const activeSection = useStore((s) => s.activeSection);
  const activeTab     = useStore((s) => s.activeTab);
  const setActiveTab  = useStore((s) => s.setActiveTab);

  if (activeSection !== 'dashboard') return null;

  return (
    <nav
      role="tablist"
      aria-label="Tableaux de bord"
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: '0',
        borderBottom: '1px solid #E2E8F0',
        overflowX: 'auto',
        overflowY: 'visible',
        scrollbarWidth: 'none',
        marginTop: '4px',
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
            onMouseEnter={(e) => {
              if (!isActive) e.currentTarget.style.color = '#4A5568';
            }}
            onMouseLeave={(e) => {
              if (!isActive) e.currentTarget.style.color = '#718096';
            }}
          >
            <span style={{ marginRight: '5px', fontSize: '14px' }}>{tab.icon}</span>{tab.label}
          </button>
        );
      })}
    </nav>
  );
}

export default TabNav;
