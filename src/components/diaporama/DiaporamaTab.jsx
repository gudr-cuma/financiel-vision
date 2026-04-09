import { useState } from 'react';
import useStore from '../../store/useStore';
import { generateBuilderPptx } from '../../engine/generatePptx';
import { SlideList } from './SlideList';
import { SlideEditor } from './SlideEditor';

// ---------------------------------------------------------------------------
// DiaporamaTab — constructeur de diaporama
// ---------------------------------------------------------------------------

export function DiaporamaTab() {
  const diaporamaSlides    = useStore(s => s.diaporamaSlides);
  const diaporamaCover     = useStore(s => s.diaporamaCover);
  const addDiaporamaSlide  = useStore(s => s.addDiaporamaSlide);
  const updateDiaporamaSlide = useStore(s => s.updateDiaporamaSlide);
  const updateDiaporamaZone  = useStore(s => s.updateDiaporamaZone);
  const removeDiaporamaSlide = useStore(s => s.removeDiaporamaSlide);
  const moveDiaporamaSlide   = useStore(s => s.moveDiaporamaSlide);
  const updateDiaporamaCover = useStore(s => s.updateDiaporamaCover);

  // Snapshot de toutes les données du store pour la génération
  const storeData = useStore(s => ({
    parsedFec:      s.parsedFec,
    parsedFecN1:    s.parsedFecN1,
    parsedFecN2:    s.parsedFecN2,
    sigResult:      s.sigResult,
    sigResultN1:    s.sigResultN1,
    sigResultN2:    s.sigResultN2,
    treasuryData:   s.treasuryData,
    treasuryDataN1: s.treasuryDataN1,
    chargesData:    s.chargesData,
    bilanData:      s.bilanData,
    bilanDataN1:    s.bilanDataN1,
    bilanDataN2:    s.bilanDataN2,
    analytiqueData: s.analytiqueData,
  }));

  const [selectedId,   setSelectedId]   = useState('cover');
  const [generating,   setGenerating]   = useState(false);
  const [progressMsg,  setProgressMsg]  = useState('');
  const [genError,     setGenError]     = useState(null);

  const hasFec = storeData.parsedFec !== null;

  // Ajout d'un slide avec template 'title_full' par défaut
  const handleAdd = () => {
    addDiaporamaSlide('title_full');
    // Sélectionner le nouveau slide (dernier dans la liste)
    setTimeout(() => {
      const slides = useStore.getState().diaporamaSlides;
      if (slides.length > 0) {
        setSelectedId(slides[slides.length - 1].id);
      }
    }, 0);
  };

  const handleDelete = (id) => {
    if (selectedId === id) setSelectedId('cover');
    removeDiaporamaSlide(id);
  };

  const handleGenerate = async () => {
    if (!hasFec) return;
    setGenerating(true);
    setGenError(null);
    try {
      await generateBuilderPptx({
        slides:     diaporamaSlides,
        coverInfo:  diaporamaCover,
        storeData,
        onProgress: setProgressMsg,
      });
    } catch (err) {
      console.error('Erreur génération PPTX :', err);
      setGenError(err.message ?? 'Erreur inconnue');
    } finally {
      setGenerating(false);
      setProgressMsg('');
    }
  };

  // ── Écran vide sans FEC ──────────────────────────────────────────────────

  if (!hasFec) {
    return (
      <div style={{ paddingTop: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '40px', marginBottom: '16px' }}>🎬</div>
        <p style={{ fontSize: '16px', color: '#718096' }}>
          Chargez un fichier FEC pour générer un diaporama.
        </p>
      </div>
    );
  }

  const totalSlides = diaporamaSlides.length + 1; // +1 pour la page de garde

  return (
    <div style={{ paddingTop: '24px', paddingBottom: '60px' }}>
      <div style={{
        display: 'flex',
        gap: '0',
        height: 'calc(100vh - 180px)',
        minHeight: '600px',
      }}>
        {/* Panneau gauche — liste des slides */}
        <div style={{
          width: '240px',
          flexShrink: 0,
          borderRight: '1px solid #E2E8F0',
          overflow: 'auto',
          paddingBottom: '8px',
        }}>
          <SlideList
            slides={diaporamaSlides}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onAdd={handleAdd}
            onDelete={handleDelete}
            onMove={moveDiaporamaSlide}
            diaporamaCover={diaporamaCover}
          />
        </div>

        {/* Panneau droit — éditeur */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '0 24px 24px',
        }}>
          <SlideEditor
            selectedId={selectedId}
            slides={diaporamaSlides}
            diaporamaCover={diaporamaCover}
            onUpdateCover={updateDiaporamaCover}
            onUpdateSlide={updateDiaporamaSlide}
            onUpdateZone={updateDiaporamaZone}
            storeData={storeData}
          />
        </div>
      </div>

      {/* Barre de génération — sticky en bas */}
      <div style={{
        position: 'sticky',
        bottom: 0,
        background: '#FFFFFF',
        borderTop: '1px solid #E2E8F0',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        marginTop: '8px',
        zIndex: 10,
      }}>
        <div>
          <span style={{ fontSize: '13px', color: '#4A5568' }}>
            {totalSlides} slide{totalSlides > 1 ? 's' : ''} (page de garde incluse)
          </span>
          {generating && progressMsg && (
            <span style={{ fontSize: '12px', color: '#31B700', marginLeft: '12px' }}>
              {progressMsg}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {genError && (
            <span style={{ fontSize: '12px', color: '#E53935' }}>
              {genError}
            </span>
          )}
          <button
            onClick={handleGenerate}
            disabled={generating}
            style={{
              background: generating ? '#A0AEC0' : '#31B700',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '10px',
              padding: '10px 24px',
              fontSize: '14px',
              fontWeight: 700,
              cursor: generating ? 'default' : 'pointer',
              transition: 'background 150ms',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => { if (!generating) e.currentTarget.style.background = '#268E00'; }}
            onMouseLeave={e => { if (!generating) e.currentTarget.style.background = '#31B700'; }}
          >
            {generating ? 'Génération…' : 'Télécharger le diaporama .pptx'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DiaporamaTab;
