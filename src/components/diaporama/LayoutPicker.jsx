import { TEMPLATES } from '../../engine/diaporamaConfig';

// ── Icône visuelle de template ────────────────────────────────────────────────

function TemplateIcon({ template }) {
  const titleBar = (
    <div style={{
      height: '4px',
      background: '#31B700',
      borderRadius: '2px',
      marginBottom: '3px',
    }} />
  );

  const zoneBox = (isGraph, style = {}) => (
    <div style={{
      background: isGraph ? '#B1DCE2' : '#E2E8F0',
      borderRadius: '2px',
      ...style,
    }} />
  );

  let content = null;

  switch (template.id) {
    case 'title_only':
      content = (
        <div style={{ flex: 1 }} />
      );
      break;

    case 'title_full':
      content = zoneBox(false, { flex: 1 });
      break;

    case 'title_2col_lr':
      content = (
        <div style={{ display: 'flex', gap: '3px', flex: 1 }}>
          {zoneBox(false, { flex: 1 })}
          {zoneBox(false, { flex: 1 })}
        </div>
      );
      break;

    case 'title_2zones_lr':
      content = (
        <div style={{ display: 'flex', gap: '3px', flex: 1 }}>
          {zoneBox(true, { flex: 1 })}
          {zoneBox(true, { flex: 1 })}
        </div>
      );
      break;

    case 'title_2zones_tb':
      content = (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1 }}>
          {zoneBox(true, { flex: 1 })}
          {zoneBox(true, { flex: 1 })}
        </div>
      );
      break;

    case 'title_3zones':
      content = (
        <div style={{ display: 'flex', gap: '3px', flex: 1 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1 }}>
            {zoneBox(true, { flex: 1 })}
            {zoneBox(true, { flex: 1 })}
          </div>
          {zoneBox(true, { flex: 1 })}
        </div>
      );
      break;

    case 'title_4zones':
      content = (
        <div style={{ display: 'flex', gap: '3px', flex: 1 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1 }}>
            {zoneBox(true, { flex: 1 })}
            {zoneBox(true, { flex: 1 })}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1 }}>
            {zoneBox(true, { flex: 1 })}
            {zoneBox(true, { flex: 1 })}
          </div>
        </div>
      );
      break;

    default:
      content = <div style={{ flex: 1, background: '#E2E8F0', borderRadius: '2px' }} />;
  }

  return (
    <div style={{
      width: '70px',
      height: '48px',
      display: 'flex',
      flexDirection: 'column',
      padding: '4px',
      boxSizing: 'border-box',
    }}>
      {titleBar}
      {content}
    </div>
  );
}

// ── LayoutPicker ─────────────────────────────────────────────────────────────

/**
 * LayoutPicker — grille de sélection de template de slide.
 *
 * Props:
 *   selectedId {string}   — id du template actuellement sélectionné
 *   onSelect   {function} — callback(templateId: string)
 */
export function LayoutPicker({ selectedId, onSelect }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '8px',
    }}>
      {TEMPLATES.map(template => {
        const isSelected = template.id === selectedId;
        return (
          <button
            key={template.id}
            onClick={() => onSelect(template.id)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 4px',
              border: isSelected ? '2px solid #31B700' : '1px solid #E2E8F0',
              borderRadius: '8px',
              background: isSelected ? '#F0FBF0' : '#FFFFFF',
              cursor: 'pointer',
              transition: 'border-color 120ms, background 120ms',
            }}
          >
            <TemplateIcon template={template} />
            <span style={{
              fontSize: '11px',
              color: isSelected ? '#268E00' : '#718096',
              fontWeight: isSelected ? 600 : 400,
              textAlign: 'center',
              lineHeight: 1.3,
            }}>
              {template.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default LayoutPicker;
