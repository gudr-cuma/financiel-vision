const TABS = [
  { id: 'actif',    label: 'Actif' },
  { id: 'passif',   label: 'Passif' },
  { id: 'resultat', label: 'Compte de résultat' },
];

export function BilanCRSubNav({ activeTab, onTabChange }) {
  return (
    <div style={{
      display: 'flex', gap: '4px',
      borderBottom: '2px solid #E2E8F0',
      marginBottom: '0',
    }}>
      {TABS.map(tab => {
        const active = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{
              padding: '9px 20px',
              fontSize: '13px',
              fontWeight: active ? 700 : 500,
              color: active ? '#1A202C' : '#718096',
              background: 'transparent',
              border: 'none',
              borderBottom: active ? '2px solid #31B700' : '2px solid transparent',
              cursor: 'pointer',
              marginBottom: '-2px',
              transition: 'color 150ms, border-bottom-color 150ms',
              whiteSpace: 'nowrap',
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export default BilanCRSubNav;
