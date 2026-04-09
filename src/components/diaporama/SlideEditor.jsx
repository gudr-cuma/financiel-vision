import { useRef } from 'react';
import { TEMPLATES } from '../../engine/diaporamaConfig';
import { LayoutPicker } from './LayoutPicker';
import { ZoneEditor } from './ZoneEditor';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createZonesForTemplate(templateId) {
  const template = TEMPLATES.find(t => t.id === templateId);
  if (!template) return [];
  return template.zones.map(z => ({ type: z.defaultType, content: '', graphId: null }));
}

// ---------------------------------------------------------------------------
// CoverEditor — éditeur de la page de garde
// ---------------------------------------------------------------------------

function CoverEditor({ diaporamaCover, onUpdateCover }) {
  const logoRef = useRef();

  const handleLogo = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => onUpdateCover({ logoDataUrl: ev.target.result });
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #E2E8F0',
    borderRadius: '8px',
    fontSize: '13px',
    color: '#1A202C',
    boxSizing: 'border-box',
    outline: 'none',
  };

  const labelStyle = {
    fontSize: '12px',
    fontWeight: 600,
    color: '#4A5568',
    display: 'block',
    marginBottom: '6px',
  };

  return (
    <div>
      <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#1A202C', margin: '0 0 20px' }}>
        Page de garde
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        <div>
          <label style={labelStyle}>Nom de la CUMA</label>
          <input
            type="text"
            value={diaporamaCover?.cumaName ?? ''}
            onChange={e => onUpdateCover({ cumaName: e.target.value })}
            placeholder="CUMA du Plateau…"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Exercice</label>
          <input
            type="text"
            value={diaporamaCover?.exerciceLabel ?? ''}
            onChange={e => onUpdateCover({ exerciceLabel: e.target.value })}
            placeholder="Exercice 2024"
            style={inputStyle}
          />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={() => logoRef.current?.click()}
          style={{
            fontSize: '12px', fontWeight: 600,
            color: '#718096', background: 'transparent',
            border: '1px solid #E2E8F0', borderRadius: '6px',
            padding: '6px 14px', cursor: 'pointer',
          }}
        >
          {diaporamaCover?.logoDataUrl ? 'Changer le logo' : 'Ajouter un logo (optionnel)'}
        </button>
        {diaporamaCover?.logoDataUrl && (
          <>
            <img
              src={diaporamaCover.logoDataUrl}
              alt="Logo"
              style={{ height: '32px', objectFit: 'contain', borderRadius: '4px', border: '1px solid #E2E8F0' }}
            />
            <button
              onClick={() => onUpdateCover({ logoDataUrl: null })}
              style={{ fontSize: '12px', color: '#E53935', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Supprimer
            </button>
          </>
        )}
        <input ref={logoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogo} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SlideEditor — éditeur d'un slide (ou page de garde)
// ---------------------------------------------------------------------------

/**
 * SlideEditor — panneau droit d'édition du slide sélectionné.
 *
 * Props:
 *   selectedId     {string|null}
 *   slides         {Array}
 *   diaporamaCover {object}
 *   onUpdateCover  {function} — (changes) => void
 *   onUpdateSlide  {function} — (id, changes) => void
 *   onUpdateZone   {function} — (slideId, zoneIdx, changes) => void
 *   storeData      {object}
 */
export function SlideEditor({
  selectedId,
  slides,
  diaporamaCover,
  onUpdateCover,
  onUpdateSlide,
  onUpdateZone,
  storeData,
}) {
  if (!selectedId) {
    return (
      <div style={{ paddingTop: '60px', textAlign: 'center', color: '#718096', fontSize: '14px' }}>
        Sélectionnez ou ajoutez un slide.
      </div>
    );
  }

  if (selectedId === 'cover') {
    return (
      <CoverEditor diaporamaCover={diaporamaCover} onUpdateCover={onUpdateCover} />
    );
  }

  const slide = slides.find(s => s.id === selectedId);
  if (!slide) {
    return (
      <div style={{ paddingTop: '60px', textAlign: 'center', color: '#718096', fontSize: '14px' }}>
        Slide introuvable.
      </div>
    );
  }

  const template = TEMPLATES.find(t => t.id === slide.templateId) ?? TEMPLATES[0];

  const handleTemplateChange = (newTemplateId) => {
    const zones = createZonesForTemplate(newTemplateId);
    onUpdateSlide(slide.id, { templateId: newTemplateId, zones });
  };

  const sectionTitle = {
    fontSize: '13px',
    fontWeight: 700,
    color: '#4A5568',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    margin: '20px 0 10px',
  };

  return (
    <div>
      {/* Titre du slide */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ fontSize: '12px', fontWeight: 600, color: '#4A5568', display: 'block', marginBottom: '6px' }}>
          Titre du slide
        </label>
        <input
          type="text"
          value={slide.title ?? ''}
          onChange={e => onUpdateSlide(slide.id, { title: e.target.value })}
          placeholder="Titre de la diapositive…"
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 600,
            color: '#1A202C',
            boxSizing: 'border-box',
            outline: 'none',
          }}
        />
      </div>

      {/* Mise en page */}
      <div style={sectionTitle}>Mise en page</div>
      <LayoutPicker selectedId={slide.templateId} onSelect={handleTemplateChange} />

      {/* Zones */}
      {template.zones.length > 0 && (
        <>
          <div style={{ ...sectionTitle, marginTop: '24px' }}>Contenu des zones</div>
          {template.zones.map((zoneDef, i) => {
            const zone = slide.zones?.[i] ?? { type: zoneDef.defaultType, content: '', graphId: null };
            return (
              <ZoneEditor
                key={i}
                zoneIndex={i}
                zoneDef={zoneDef}
                zone={zone}
                onChange={(idx, changes) => onUpdateZone(slide.id, idx, changes)}
                storeData={storeData}
                label={zoneDef.label}
              />
            );
          })}
        </>
      )}
    </div>
  );
}

export default SlideEditor;
