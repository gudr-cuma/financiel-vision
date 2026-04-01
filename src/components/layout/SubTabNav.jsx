import useStore from '../../store/useStore';

const SUB_TABS = [
  { id: 'mensuel', label: 'Mensuel' },
  { id: 'cumule', label: 'Cumulé' },
  { id: 'tableau', label: 'Tableau' },
];

export function SubTabNav() {
  const activeTab = useStore((s) => s.activeTab);
  const activeSubTab = useStore((s) => s.activeSubTab);
  const setActiveSubTab = useStore((s) => s.setActiveSubTab);

  if (activeTab !== 'monthly') return null;

  return (
    <nav
      role="tablist"
      aria-label="Sous-navigation analyses mensuelles"
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: '0',
        borderBottom: '1px solid #E2E8F0',
        marginTop: '8px',
        overflowX: 'auto',
        scrollbarWidth: 'none',
      }}
    >
      {SUB_TABS.map((tab) => {
        const isActive = tab.id === activeSubTab;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => setActiveSubTab(tab.id)}
            style={{
              padding: '8px 14px',
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
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}

export default SubTabNav;
