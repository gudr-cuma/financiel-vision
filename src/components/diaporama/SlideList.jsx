import { TEMPLATES } from '../../engine/diaporamaConfig';

/**
 * SlideList — panneau gauche listant les slides.
 *
 * Props:
 *   slides         {Array}    — diaporamaSlides du store
 *   selectedId     {string}   — 'cover' ou id de slide
 *   onSelect       {function} — (id) => void
 *   onAdd          {function} — () => void
 *   onDelete       {function} — (id) => void
 *   onMove         {function} — (id, direction) => void  // -1 ou +1
 *   diaporamaCover {object}   — { cumaName, exerciceLabel, logoDataUrl }
 */
export function SlideList({ slides, selectedId, onSelect, onAdd, onDelete, onMove, diaporamaCover }) {
  const isCoverSelected = selectedId === 'cover';

  const getTemplateLabel = (templateId) => {
    return TEMPLATES.find(t => t.id === templateId)?.label ?? templateId;
  };

  const handleDelete = (id) => {
    if (window.confirm('Supprimer ce slide ?')) {
      onDelete(id);
    }
  };

  const btnStyle = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#718096',
    padding: '2px 4px',
    lineHeight: 1,
    borderRadius: '4px',
    flexShrink: 0,
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
      padding: '12px',
      background: '#FFFFFF',
      height: '100%',
      boxSizing: 'border-box',
    }}>
      {/* Page de garde (toujours premier, non supprimable) */}
      <div
        onClick={() => onSelect('cover')}
        style={{
          padding: '10px 12px',
          borderRadius: '8px',
          cursor: 'pointer',
          background: isCoverSelected ? '#F0FBF0' : '#FFFFFF',
          borderLeft: isCoverSelected ? '3px solid #31B700' : '3px solid transparent',
          transition: 'background 120ms',
          marginBottom: '4px',
        }}
      >
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#1A202C' }}>
          Page de garde
        </div>
        {diaporamaCover?.cumaName && (
          <div style={{ fontSize: '11px', color: '#718096', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {diaporamaCover.cumaName}
          </div>
        )}
      </div>

      {/* Séparateur */}
      <div style={{ height: '1px', background: '#F0F4F8', margin: '2px 0' }} />

      {/* Slides utilisateur */}
      {slides.map((slide, idx) => {
        const isSelected = selectedId === slide.id;
        const slideTitle = slide.title?.trim() || 'Slide sans titre';
        return (
          <div
            key={slide.id}
            onClick={() => onSelect(slide.id)}
            style={{
              padding: '8px 10px',
              borderRadius: '8px',
              cursor: 'pointer',
              background: isSelected ? '#F0FBF0' : '#FFFFFF',
              borderLeft: isSelected ? '3px solid #31B700' : '3px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'background 120ms',
            }}
          >
            {/* Info slide */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#1A202C',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {slideTitle}
              </div>
              <div style={{ fontSize: '11px', color: '#718096', marginTop: '1px' }}>
                {getTemplateLabel(slide.templateId)}
              </div>
            </div>

            {/* Boutons déplacement + suppression */}
            <div
              style={{ display: 'flex', gap: '2px', flexShrink: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <button
                style={{ ...btnStyle, opacity: idx === 0 ? 0.3 : 1 }}
                disabled={idx === 0}
                onClick={() => onMove(slide.id, -1)}
                title="Monter"
              >
                ↑
              </button>
              <button
                style={{ ...btnStyle, opacity: idx === slides.length - 1 ? 0.3 : 1 }}
                disabled={idx === slides.length - 1}
                onClick={() => onMove(slide.id, +1)}
                title="Descendre"
              >
                ↓
              </button>
              <button
                style={{ ...btnStyle, color: '#E53935' }}
                onClick={() => handleDelete(slide.id)}
                title="Supprimer"
              >
                ×
              </button>
            </div>
          </div>
        );
      })}

      {/* Bouton ajouter */}
      <div style={{ marginTop: 'auto', paddingTop: '8px' }}>
        <button
          onClick={onAdd}
          style={{
            width: '100%',
            padding: '10px',
            background: '#FF8200',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'background 120ms',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#E57300'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#FF8200'; }}
        >
          + Ajouter un slide
        </button>
      </div>
    </div>
  );
}

export default SlideList;
