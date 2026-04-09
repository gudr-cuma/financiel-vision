import { useState } from 'react';
import useStore from '../../store/useStore';
import useAuthStore from '../../store/useAuthStore';

const SECTIONS = [
  { id: 'accueil',    icon: '🏠', label: 'Accueil',             alwaysVisible: true },
  { id: 'analyseur',  icon: '🔎', label: 'Analyseur FEC' },
  { id: 'dashboard',  icon: '📊', label: 'Tableaux de bord' },
  { id: 'dossier',    icon: '📋', label: 'Dossier de gestion' },
  { id: 'bilanCR',    icon: '📈', label: 'Bilan & CR' },
  { id: 'bilanParam', icon: '⚖️',  label: 'Bilan paramétré' },
  { id: 'editions',   icon: '📒', label: 'Éditions' },
  { id: 'export',     icon: '⬇️',  label: 'Export PDF' },
  { id: 'diaporama',  icon: '🎬', label: 'Diaporama' },
  { id: 'analyse',    icon: '🤖', label: 'Rapport IA' },
];

// ---------------------------------------------------------------------------
// Item de navigation individuel
// ---------------------------------------------------------------------------
function NavItem({ id, icon, label, isActive, collapsed, onClick }) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      role="menuitem"
      aria-current={isActive ? 'page' : undefined}
      onClick={onClick}
      title={collapsed ? label : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: collapsed ? 0 : '10px',
        width: '100%',
        padding: collapsed ? '11px 0' : '9px 14px 9px 13px',
        justifyContent: collapsed ? 'center' : 'flex-start',
        background: isActive ? '#E8F5E0' : hovered ? '#F8FAFB' : 'transparent',
        borderLeft: `3px solid ${isActive ? '#31B700' : 'transparent'}`,
        borderTop: 'none', borderRight: 'none', borderBottom: 'none',
        cursor: 'pointer',
        color: isActive ? '#1A202C' : hovered ? '#4A5568' : '#718096',
        whiteSpace: 'nowrap',
        transition: 'background 120ms, color 120ms',
        textAlign: 'left',
        minWidth: 0,
      }}
    >
      <span style={{ fontSize: '17px', flexShrink: 0, lineHeight: 1 }}>{icon}</span>
      {!collapsed && (
        <span style={{
          fontSize: '13px',
          fontWeight: isActive ? 700 : 500,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {label}
        </span>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// SideNav principal
// ---------------------------------------------------------------------------
export function SideNav({ collapsed, onToggle }) {
  const activeSection    = useStore(s => s.activeSection);
  const setActiveSection = useStore(s => s.setActiveSection);
  const hasPermission    = useAuthStore(s => s.hasPermission);
  const currentUser      = useAuthStore(s => s.currentUser);

  const visibleSections = SECTIONS.filter(s => s.alwaysVisible || hasPermission(s.id));

  return (
    <nav
      role="menu"
      aria-label="Navigation principale"
      style={{
        position: 'fixed',
        top: '65px',
        left: 0,
        bottom: 0,
        width: collapsed ? '56px' : '220px',
        transition: 'width 200ms ease',
        background: '#FFFFFF',
        borderRight: '1px solid #E2E8F0',
        zIndex: 40,
        display: 'flex',
        flexDirection: 'column',
        overflowX: 'hidden',
        overflowY: 'auto',
      }}
    >
      {/* ── Sections principales ───────────────────────────────────────────── */}
      <div style={{ flex: 1, paddingTop: '8px', paddingBottom: '8px' }}>
        {visibleSections.map(section => (
          <NavItem
            key={section.id}
            id={section.id}
            icon={section.icon}
            label={section.label}
            isActive={section.id === activeSection}
            collapsed={collapsed}
            onClick={() => setActiveSection(section.id)}
          />
        ))}
      </div>

      {/* ── Bas : Admin + toggle ───────────────────────────────────────────── */}
      <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '4px', paddingBottom: '4px' }}>

        {currentUser?.role === 'admin' && (
          <NavItem
            id="admin"
            icon="⚙️"
            label="Administration"
            isActive={activeSection === 'admin'}
            collapsed={collapsed}
            onClick={() => setActiveSection('admin')}
          />
        )}

        {/* Toggle collapse */}
        <button
          onClick={onToggle}
          title={collapsed ? 'Développer le menu' : 'Réduire le menu'}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            padding: '10px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: '#CBD5E0',
            fontSize: '18px',
            fontWeight: 700,
            transition: 'color 120ms',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#718096'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#CBD5E0'; }}
        >
          {collapsed ? '›' : '‹'}
        </button>
      </div>
    </nav>
  );
}

export default SideNav;
