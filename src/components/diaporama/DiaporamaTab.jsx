import { useState, useRef, useCallback } from 'react';
import useStore from '../../store/useStore';
import { generatePptx } from '../../engine/generatePptx';

// ---------------------------------------------------------------------------
// Définition des groupes de slides
// ---------------------------------------------------------------------------

const SLIDE_GROUPS = [
  // ── Comparaison N / N-1 / N-2 ──────────────────────────────────────────
  {
    id: 'comp_ca',
    label: 'Chiffre d\'affaires',
    group: 'comparison',
    requiresN1: true,
  },
  {
    id: 'comp_ebe',
    label: 'EBE (Excédent Brut d\'Exploitation)',
    group: 'comparison',
    requiresN1: true,
  },
  {
    id: 'comp_resultats',
    label: 'Résultats (courant / exceptionnel / net)',
    group: 'comparison',
    requiresN1: true,
  },
  {
    id: 'comp_fr',
    label: 'Fonds de roulement',
    group: 'comparison',
    requiresN1: true,
    requiresBilan: true,
  },
  {
    id: 'comp_fr_ca',
    label: 'Fonds de roulement / CA (%)',
    group: 'comparison',
    requiresN1: true,
    requiresBilan: true,
  },
  {
    id: 'comp_cp_passif',
    label: 'Capitaux propres / Passif (%)',
    group: 'comparison',
    requiresN1: true,
    requiresBilan: true,
  },
  {
    id: 'comp_cs_ca',
    label: 'Capital social / CA (%)',
    group: 'comparison',
    requiresN1: true,
    requiresBilan: true,
  },
  {
    id: 'comp_cs_vbm',
    label: 'Capital social / Valeur brute matériels (%)',
    group: 'comparison',
    requiresN1: true,
    requiresBilan: true,
  },
  {
    id: 'comp_cs_cp',
    label: 'Capital social / Capitaux propres (%)',
    group: 'comparison',
    requiresN1: true,
    requiresBilan: true,
  },
  {
    id: 'comp_creances',
    label: 'Créances / CA (%)',
    group: 'comparison',
    requiresN1: true,
    requiresBilan: true,
  },
  {
    id: 'comp_endettement',
    label: 'Taux d\'endettement (%)',
    group: 'comparison',
    requiresN1: true,
    requiresBilan: true,
  },
  {
    id: 'comp_treso_mois',
    label: 'Trésorerie — solde fin de mois',
    group: 'comparison',
    requiresN1: true,
  },
  {
    id: 'comp_ca_mensuel',
    label: 'CA mensuel',
    group: 'comparison',
    requiresN1: true,
  },
  {
    id: 'comp_charges',
    label: 'Total des charges',
    group: 'comparison',
    requiresN1: true,
  },
  // ── Exercice N uniquement ────────────────────────────────────────────────
  {
    id: 'treso_courbe',
    label: 'Courbe de trésorerie',
    group: 'fec',
    requiresFec: true,
  },
  {
    id: 'charges_donut',
    label: 'Structure des charges',
    group: 'fec',
    requiresFec: true,
  },
  {
    id: 'bilan_simplifie',
    label: 'Bilan simplifié',
    group: 'fec',
    requiresFec: true,
    requiresBilan: true,
  },
  // ── Balance analytique ───────────────────────────────────────────────────
  {
    id: 'top3_materiels',
    label: 'Top 3 matériels (balance analytique)',
    group: 'analytique',
    requiresAnalytique: true,
  },
];

// ---------------------------------------------------------------------------
// Composant CheckboxItem
// ---------------------------------------------------------------------------

function CheckboxItem({ slide, checked, disabled, onChange }) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '8px 12px',
        borderRadius: '8px',
        background: checked ? '#F0FBF0' : disabled ? '#F8FAFB' : '#FFFFFF',
        border: `1px solid ${checked ? '#C6EBC6' : '#E2E8F0'}`,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'background 120ms, border-color 120ms',
        userSelect: 'none',
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        style={{ width: '16px', height: '16px', accentColor: '#31B700', flexShrink: 0 }}
      />
      <span style={{ fontSize: '13px', color: disabled ? '#A0AEC0' : '#1A202C', lineHeight: 1.4 }}>
        {slide.label}
      </span>
      {disabled && (
        <span style={{
          marginLeft: 'auto', fontSize: '10px', fontWeight: 600,
          color: '#A0AEC0', whiteSpace: 'nowrap',
        }}>
          {slide.requiresN1 ? 'N-1 requis' : slide.requiresAnalytique ? 'Analytique requis' : ''}
        </span>
      )}
    </label>
  );
}

// ---------------------------------------------------------------------------
// Composant SectionCard
// ---------------------------------------------------------------------------

function SectionCard({ title, icon, children }) {
  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid #E2E8F0',
      borderRadius: '14px',
      overflow: 'hidden',
      marginBottom: '20px',
    }}>
      <div style={{
        padding: '14px 20px',
        borderBottom: '1px solid #F0F4F8',
        display: 'flex', alignItems: 'center', gap: '8px',
      }}>
        <span style={{ fontSize: '18px' }}>{icon}</span>
        <span style={{ fontSize: '14px', fontWeight: 700, color: '#1A202C' }}>{title}</span>
      </div>
      <div style={{ padding: '16px 20px' }}>
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DiaporamaTab principal
// ---------------------------------------------------------------------------

export function DiaporamaTab() {
  const parsedFec    = useStore(s => s.parsedFec);
  const sigResult    = useStore(s => s.sigResult);
  const sigResultN1  = useStore(s => s.sigResultN1);
  const sigResultN2  = useStore(s => s.sigResultN2);
  const treasuryData = useStore(s => s.treasuryData);
  const chargesData  = useStore(s => s.chargesData);
  const bilanData    = useStore(s => s.bilanData);
  const bilanDataN1  = useStore(s => s.bilanDataN1);
  const bilanDataN2  = useStore(s => s.bilanDataN2);
  const analytiqueData = useStore(s => s.analytiqueData);
  const dossierData  = useStore(s => s.dossierData);
  const parsedFecN1  = useStore(s => s.parsedFecN1);
  const parsedFecN2  = useStore(s => s.parsedFecN2);
  const treasuryDataN1 = useStore(s => s.treasuryDataN1);

  // ── Déterminer les dépendances disponibles ──────────────────────────────
  const hasFec        = parsedFec !== null;
  const hasN1         = sigResultN1 !== null;
  const hasAnalytique = analytiqueData !== null;

  // ── État sélection des slides ───────────────────────────────────────────
  const defaultSelected = SLIDE_GROUPS
    .filter(s => {
      if (s.requiresN1 && !hasN1) return false;
      if (s.requiresAnalytique && !hasAnalytique) return false;
      if (s.requiresFec && !hasFec) return false;
      return true;
    })
    .map(s => s.id);

  const [selected, setSelected] = useState(new Set(defaultSelected));

  const toggleSlide = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = (group) => {
    const ids = SLIDE_GROUPS.filter(s => s.group === group && !isDisabled(s)).map(s => s.id);
    setSelected(prev => new Set([...prev, ...ids]));
  };

  const deselectAll = (group) => {
    const ids = SLIDE_GROUPS.filter(s => s.group === group).map(s => s.id);
    setSelected(prev => {
      const next = new Set(prev);
      ids.forEach(id => next.delete(id));
      return next;
    });
  };

  const isDisabled = (slide) => {
    if (slide.requiresN1 && !hasN1) return true;
    if (slide.requiresAnalytique && !hasAnalytique) return true;
    if (slide.requiresFec && !hasFec) return true;
    return false;
  };

  // ── Page de garde ─────────────────────────────────────────────────────
  // Pré-remplir depuis dossierData ou parsedFec
  const defaultCuma = dossierData?.cumaList?.[dossierData.selectedCumaIndex]?.variables?.nom_cuma
    ?? parsedFec?.nomEntreprise
    ?? '';
  const defaultExercice = parsedFec?.exerciceEnd
    ? `Exercice ${parsedFec.exerciceEnd.getFullYear()}`
    : '';

  const [cumaName, setCumaName]           = useState(defaultCuma);
  const [exerciceLabel, setExerciceLabel] = useState(defaultExercice);
  const [logoDataUrl, setLogoDataUrl]     = useState(null);
  const logoRef = useRef();

  const handleLogo = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setLogoDataUrl(ev.target.result);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // ── Génération ────────────────────────────────────────────────────────
  const [generating, setGenerating] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [genError, setGenError]       = useState(null);

  const handleGenerate = useCallback(async () => {
    if (!hasFec) return;
    setGenerating(true);
    setGenError(null);
    setProgressMsg('Initialisation…');

    try {
      await generatePptx({
        selectedSlides: [...selected],
        coverInfo: { cumaName, exerciceLabel, logoDataUrl },
        storeData: {
          parsedFec, parsedFecN1, parsedFecN2,
          sigResult, sigResultN1, sigResultN2,
          treasuryData, treasuryDataN1,
          chargesData,
          bilanData, bilanDataN1, bilanDataN2,
          analytiqueData,
        },
        onProgress: setProgressMsg,
      });
    } catch (err) {
      console.error('Erreur génération PPTX :', err);
      setGenError(err.message ?? 'Erreur inconnue lors de la génération.');
    } finally {
      setGenerating(false);
      setProgressMsg('');
    }
  }, [
    selected, cumaName, exerciceLabel, logoDataUrl,
    parsedFec, parsedFecN1, parsedFecN2,
    sigResult, sigResultN1, sigResultN2,
    treasuryData, treasuryDataN1,
    chargesData,
    bilanData, bilanDataN1, bilanDataN2,
    analytiqueData,
    hasFec,
  ]);

  // ── Render sans FEC ───────────────────────────────────────────────────
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

  const comparisonSlides = SLIDE_GROUPS.filter(s => s.group === 'comparison');
  const fecSlides        = SLIDE_GROUPS.filter(s => s.group === 'fec');
  const analytiqueSlides = SLIDE_GROUPS.filter(s => s.group === 'analytique');

  const totalSelected = selected.size; // page_de_garde toujours incluse → +1 dans le moteur

  return (
    <div style={{ paddingTop: '24px', paddingBottom: '60px', maxWidth: '860px' }}>

      {/* ── En-tête ──────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#1A202C', margin: '0 0 6px' }}>
          🎬 Diaporama PowerPoint
        </h1>
        <p style={{ fontSize: '14px', color: '#718096', margin: 0 }}>
          Sélectionnez les graphiques à inclure et téléchargez un fichier <code>.pptx</code> prêt à présenter.
        </p>
      </div>

      {/* ── Page de garde ──────────────────────────────────────────────── */}
      <SectionCard title="Page de garde" icon="📄">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#4A5568', display: 'block', marginBottom: '6px' }}>
              Nom de la CUMA
            </label>
            <input
              type="text"
              value={cumaName}
              onChange={e => setCumaName(e.target.value)}
              placeholder="CUMA du Plateau…"
              style={{
                width: '100%', padding: '8px 12px',
                border: '1px solid #E2E8F0', borderRadius: '8px',
                fontSize: '13px', color: '#1A202C',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#4A5568', display: 'block', marginBottom: '6px' }}>
              Exercice
            </label>
            <input
              type="text"
              value={exerciceLabel}
              onChange={e => setExerciceLabel(e.target.value)}
              placeholder="Exercice 2024"
              style={{
                width: '100%', padding: '8px 12px',
                border: '1px solid #E2E8F0', borderRadius: '8px',
                fontSize: '13px', color: '#1A202C',
                boxSizing: 'border-box',
              }}
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
              whiteSpace: 'nowrap',
            }}
          >
            🖼 {logoDataUrl ? 'Changer le logo' : 'Ajouter un logo (optionnel)'}
          </button>
          {logoDataUrl && (
            <>
              <img src={logoDataUrl} alt="Logo" style={{ height: '32px', objectFit: 'contain', borderRadius: '4px', border: '1px solid #E2E8F0' }} />
              <button
                onClick={() => setLogoDataUrl(null)}
                style={{ fontSize: '12px', color: '#E53935', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Supprimer
              </button>
            </>
          )}
          <input ref={logoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogo} />
        </div>
      </SectionCard>

      {/* ── Comparaison N / N-1 ─────────────────────────────────────────── */}
      <SectionCard title="Comparaison N / N-1 / N-2" icon="📊">
        {!hasN1 && (
          <div style={{
            background: '#FFF3E0', border: '1px solid #FECB89',
            borderRadius: '8px', padding: '10px 14px',
            fontSize: '12px', color: '#E57300',
            marginBottom: '14px',
          }}>
            ⚠️ Chargez un FEC N-1 dans l'onglet <strong>Analyseur FEC</strong> pour activer les slides de comparaison.
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginBottom: '10px' }}>
          <button onClick={() => selectAll('comparison')} style={linkBtnStyle}>Tout sélectionner</button>
          <span style={{ color: '#E2E8F0' }}>|</span>
          <button onClick={() => deselectAll('comparison')} style={linkBtnStyle}>Tout déselectionner</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {comparisonSlides.map(slide => (
            <CheckboxItem
              key={slide.id}
              slide={slide}
              checked={selected.has(slide.id)}
              disabled={isDisabled(slide)}
              onChange={() => toggleSlide(slide.id)}
            />
          ))}
        </div>
      </SectionCard>

      {/* ── Exercice N ───────────────────────────────────────────────────── */}
      <SectionCard title="Exercice N uniquement" icon="📈">
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginBottom: '10px' }}>
          <button onClick={() => selectAll('fec')} style={linkBtnStyle}>Tout sélectionner</button>
          <span style={{ color: '#E2E8F0' }}>|</span>
          <button onClick={() => deselectAll('fec')} style={linkBtnStyle}>Tout déselectionner</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {fecSlides.map(slide => (
            <CheckboxItem
              key={slide.id}
              slide={slide}
              checked={selected.has(slide.id)}
              disabled={isDisabled(slide)}
              onChange={() => toggleSlide(slide.id)}
            />
          ))}
        </div>
      </SectionCard>

      {/* ── Balance analytique ───────────────────────────────────────────── */}
      <SectionCard title="Balance analytique" icon="⚖️">
        {!hasAnalytique && (
          <div style={{
            background: '#F8FAFB', border: '1px solid #E2E8F0',
            borderRadius: '8px', padding: '10px 14px',
            fontSize: '12px', color: '#718096',
            marginBottom: '14px',
          }}>
            Chargez la Balance Analytique dans l'onglet <strong>Tableaux de bord → Analytique</strong> pour activer ce slide.
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {analytiqueSlides.map(slide => (
            <CheckboxItem
              key={slide.id}
              slide={slide}
              checked={selected.has(slide.id)}
              disabled={isDisabled(slide)}
              onChange={() => toggleSlide(slide.id)}
            />
          ))}
        </div>
      </SectionCard>

      {/* ── Erreur ───────────────────────────────────────────────────────── */}
      {genError && (
        <div style={{
          background: '#FEF2F2', border: '1px solid #FECACA',
          borderRadius: '10px', padding: '12px 16px',
          fontSize: '13px', color: '#E53935',
          marginBottom: '16px',
        }}>
          ⚠️ {genError}
        </div>
      )}

      {/* ── Bouton génération ────────────────────────────────────────────── */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '14px',
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
      }}>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#1A202C', marginBottom: '4px' }}>
            {totalSelected + 1} slide{totalSelected + 1 > 1 ? 's' : ''} sélectionnée{totalSelected + 1 > 1 ? 's' : ''}
            <span style={{ fontWeight: 400, color: '#718096' }}> (page de garde incluse)</span>
          </div>
          {generating && progressMsg && (
            <div style={{ fontSize: '12px', color: '#31B700', fontWeight: 500 }}>
              ⏳ {progressMsg}
            </div>
          )}
        </div>

        <button
          onClick={handleGenerate}
          disabled={generating || totalSelected === 0}
          style={{
            fontSize: '14px', fontWeight: 700,
            color: '#FFFFFF',
            background: generating || totalSelected === 0 ? '#A0AEC0' : '#31B700',
            border: 'none', borderRadius: '10px',
            padding: '12px 28px', cursor: generating || totalSelected === 0 ? 'default' : 'pointer',
            whiteSpace: 'nowrap',
            transition: 'background 150ms',
            flexShrink: 0,
          }}
          onMouseEnter={e => { if (!generating && totalSelected > 0) e.currentTarget.style.background = '#268E00'; }}
          onMouseLeave={e => { if (!generating && totalSelected > 0) e.currentTarget.style.background = '#31B700'; }}
        >
          {generating ? '⏳ Génération…' : '🎬 Télécharger le diaporama .pptx'}
        </button>
      </div>

      {/* ── Note technique ──────────────────────────────────────────────── */}
      <div style={{
        marginTop: '16px',
        padding: '12px 16px',
        background: '#F8FAFB',
        border: '1px solid #E2E8F0',
        borderRadius: '10px',
        fontSize: '12px',
        color: '#718096',
        lineHeight: '1.6',
      }}>
        💡 La génération s'effectue entièrement dans votre navigateur — aucune donnée n'est transmise.
        Le fichier <code>.pptx</code> est directement téléchargé sur votre appareil.
      </div>

    </div>
  );
}

// ── Styles partagés ─────────────────────────────────────────────────────────

const linkBtnStyle = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: '12px',
  fontWeight: 500,
  color: '#718096',
  padding: 0,
  textDecoration: 'underline',
};

export default DiaporamaTab;
