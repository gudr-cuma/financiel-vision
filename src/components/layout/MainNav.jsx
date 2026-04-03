import useStore from '../../store/useStore';

const SECTIONS = [
  { id: 'analyseur', icon: '🔎', label: 'Analyseur FEC' },
  { id: 'dashboard', icon: '📊', label: 'Tableaux de bord' },
  { id: 'editions',  icon: '📒', label: 'Éditions' },
  { id: 'export',    icon: '⬇️',  label: 'Export' },
  { id: 'analyse',   icon: '🤖', label: 'Rapport IA' },
];

export function MainNav() {
  const activeSection    = useStore((s) => s.activeSection);
  const setActiveSection = useStore((s) => s.setActiveSection);

  return (
    <nav
      role="tablist"
      aria-label="Navigation sections"
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: '0',
        borderBottom: '2px solid #E2E8F0',
        overflowX: 'auto',
        overflowY: 'visible',
        scrollbarWidth: 'none',
      }}
    >
      {SECTIONS.map((section) => {
        const isActive = section.id === activeSection;
        return (
          <button
            key={section.id}
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => setActiveSection(section.id)}
            style={{
              padding: '13px 20px',
              fontSize: '14px',
              fontWeight: isActive ? 700 : 500,
              color: isActive ? '#1A202C' : '#718096',
              backgroundColor: isActive ? '#FFFFFF' : 'transparent',
              border: 'none',
              borderBottom: isActive ? '2px solid #FF8200' : '2px solid transparent',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'color 150ms, border-bottom-color 150ms, background 150ms',
              marginBottom: '-2px',
              flexShrink: 0,
              borderRadius: '4px 4px 0 0',
            }}
            onMouseEnter={(e) => {
              if (!isActive) e.currentTarget.style.color = '#4A5568';
            }}
            onMouseLeave={(e) => {
              if (!isActive) e.currentTarget.style.color = '#718096';
            }}
          >
            <span style={{ marginRight: '6px', fontSize: '15px' }}>{section.icon}</span>
            {section.label}
          </button>
        );
      })}
    </nav>
  );
}

export default MainNav;
