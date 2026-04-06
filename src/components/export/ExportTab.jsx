import { useState } from 'react';
import useStore from '../../store/useStore';
import { generateExport, DOC_LABELS } from '../../engine/generatePdf';

// ── Catalogue complet des documents ──────────────────────────────────────────
// requiresFec        → nécessite un FEC chargé
// requiresDossier    → nécessite dossierData
// requiresAnalytique → nécessite analytiqueData
// requiresBilanCR    → nécessite bilanCRData
const ALL_DOCS = [
  { id: 'dossier_gestion',   requiresDossier: true },
  { id: 'sig',               requiresFec: true },
  { id: 'bilan',             requiresFec: true },
  { id: 'bilan_cr',          requiresBilanCR: true },
  { id: 'balance',           requiresFec: true },
  { id: 'balance_aux',       requiresFec: true },
  { id: 'grand_livre',       requiresFec: true, warn: true },
  { id: 'treasury_curve',    requiresFec: true },
  { id: 'charges_charts',    requiresFec: true },
  { id: 'analytique_table',  requiresAnalytique: true },
  { id: 'analytique_podium', requiresAnalytique: true },
];

const DEFAULT_SELECTED = ['sig', 'bilan', 'balance', 'balance_aux', 'treasury_curve', 'charges_charts'];

// ── Bouton ↑ / ↓ ──────────────────────────────────────────────────────────────
function ArrowBtn({ dir, disabled, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={dir === 'up' ? 'Monter' : 'Descendre'}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: '22px', height: '22px',
        border: '1px solid #E2E8F0', borderRadius: '4px',
        background: disabled ? 'transparent' : '#F8FAFB',
        color: disabled ? '#CBD5E0' : '#718096',
        cursor: disabled ? 'default' : 'pointer',
        fontSize: '11px', lineHeight: 1, padding: 0,
        transition: 'background 100ms',
      }}
    >
      {dir === 'up' ? '▲' : '▼'}
    </button>
  );
}

export function ExportTab() {
  const parsedFec      = useStore(s => s.parsedFec);
  const sigResult      = useStore(s => s.sigResult);
  const bilanData      = useStore(s => s.bilanData);
  const treasuryData   = useStore(s => s.treasuryData);
  const chargesData    = useStore(s => s.chargesData);
  const analytiqueData = useStore(s => s.analytiqueData);
  const dossierData    = useStore(s => s.dossierData);
  const bilanCRData    = useStore(s => s.bilanCRData);

  // orderedSelection = tableau ordonné des IDs cochés (ordre = ordre d'export)
  const [orderedSelection, setOrderedSelection] = useState(
    DEFAULT_SELECTED.filter(id => {
      // ne pré-cocher que ce qui est disponible
      const doc = ALL_DOCS.find(d => d.id === id);
      if (!doc) return false;
      if (doc.requiresFec        && !parsedFec)      return false;
      if (doc.requiresDossier    && !dossierData)    return false;
      if (doc.requiresBilanCR    && !bilanCRData)    return false;
      if (doc.requiresAnalytique && !analytiqueData) return false;
      return true;
    })
  );
  const [mode, setMode]               = useState('global');
  const [orientation, setOrientation] = useState('landscape');
  const [annexes, setAnnexes]         = useState([]);
  const [progress, setProgress]       = useState(null);
  const [error, setError]             = useState(null);

  // Docs disponibles selon les données chargées
  const availableDocs = ALL_DOCS.filter(d => {
    if (d.requiresFec        && !parsedFec)      return false;
    if (d.requiresDossier    && !dossierData)    return false;
    if (d.requiresBilanCR    && !bilanCRData)    return false;
    if (d.requiresAnalytique && !analytiqueData) return false;
    return true;
  });

  const nothingLoaded = availableDocs.length === 0;

  // ── Helpers de sélection / réordonnancement ────────────────────────────────
  const isSelected  = id => orderedSelection.includes(id);
  const rankOf      = id => orderedSelection.indexOf(id) + 1; // 1-based

  const toggle = (id) => {
    setOrderedSelection(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const moveUp = (id) => {
    setOrderedSelection(prev => {
      const idx = prev.indexOf(id);
      if (idx <= 0) return prev;
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  };

  const moveDown = (id) => {
    setOrderedSelection(prev => {
      const idx = prev.indexOf(id);
      if (idx < 0 || idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  };

  // ── Génération ─────────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!orderedSelection.length) return;
    setError(null);
    setProgress({ pct: 0, label: 'Initialisation…' });

    const storeData = { sigResult, bilanData, bilanCRData, treasuryData, chargesData, analytiqueData, dossierData };

    try {
      await generateExport(
        parsedFec,
        orderedSelection,
        { mode, orientation },
        (pct, label) => setProgress({ pct, label }),
        storeData,
        mode === 'global' ? annexes : [],
      );
    } catch (err) {
      console.error('Export PDF error:', err);
      setError(`Erreur lors de la génération : ${err.message}`);
      setProgress(null);
      return;
    }
    setTimeout(() => setProgress(null), 1500);
  };

  const grandLivreChecked = orderedSelection.includes('grand_livre');

  // ── Rendu ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ paddingTop: '24px', maxWidth: '700px' }}>

      {/* ── Message si rien n'est chargé ── */}
      {nothingLoaded && (
        <div style={{
          padding: '16px 20px', background: '#FFF3E0', border: '1px solid #FFB74D',
          borderRadius: '10px', fontSize: '14px', color: '#7C4D00', marginBottom: '28px',
        }}>
          <div style={{ fontWeight: 700, marginBottom: '4px' }}>Aucune donnée disponible</div>
          Chargez un FEC, un dossier de gestion ou un fichier BilanCR pour activer l'export.
        </div>
      )}

      {/* ── Documents à exporter ── */}
      {!nothingLoaded && (
        <section style={{ marginBottom: '28px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#1A202C', marginBottom: '6px' }}>
            Documents à exporter
          </h2>
          <p style={{ fontSize: '12px', color: '#718096', margin: '0 0 14px' }}>
            Cochez les documents souhaités, puis réordonnez-les avec les flèches ▲▼.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {availableDocs.map(doc => {
              const checked = isSelected(doc.id);
              const rank    = checked ? rankOf(doc.id) : null;
              const isFirst = checked && orderedSelection[0] === doc.id;
              const isLast  = checked && orderedSelection[orderedSelection.length - 1] === doc.id;

              return (
                <div
                  key={doc.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '7px 10px', borderRadius: '8px',
                    background: checked ? '#F8FAFB' : 'transparent',
                    border: checked ? '1px solid #E2E8F0' : '1px solid transparent',
                    transition: 'background 100ms, border-color 100ms',
                  }}
                >
                  {/* Rang */}
                  <div style={{
                    width: '20px', textAlign: 'center',
                    fontSize: '11px', fontWeight: 700,
                    color: checked ? '#FF8200' : 'transparent',
                    flexShrink: 0,
                  }}>
                    {checked ? rank : '·'}
                  </div>

                  {/* Checkbox + label */}
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, cursor: 'pointer', fontSize: '14px', color: '#1A202C' }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(doc.id)}
                      style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#FF8200' }}
                    />
                    <span>{DOC_LABELS[doc.id]}</span>
                    {doc.warn && checked && (
                      <span style={{ fontSize: '11px', color: '#E57300', fontWeight: 600 }}>⚠️ volumineux</span>
                    )}
                  </label>

                  {/* Boutons ↑ ↓ (uniquement si coché) */}
                  {checked ? (
                    <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                      <ArrowBtn dir="up"   disabled={isFirst} onClick={() => moveUp(doc.id)} />
                      <ArrowBtn dir="down" disabled={isLast}  onClick={() => moveDown(doc.id)} />
                    </div>
                  ) : (
                    <div style={{ width: '48px', flexShrink: 0 }} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Avertissement analytique */}
          {!analytiqueData && (
            <div style={{ marginTop: '10px', fontSize: '12px', color: '#A0AEC0', fontStyle: 'italic' }}>
              Les documents analytiques sont disponibles après chargement d'une balance analytique (onglet Analytique).
            </div>
          )}

          {/* Avertissement Grand Livre */}
          {grandLivreChecked && (
            <div style={{
              marginTop: '12px', padding: '10px 14px',
              background: '#FFF3E0', border: '1px solid #FFB74D', borderRadius: '8px',
              fontSize: '13px', color: '#7C4D00', display: 'flex', gap: '8px', alignItems: 'flex-start',
            }}>
              <span style={{ fontSize: '16px', lineHeight: '1.2' }}>⚠️</span>
              <span>
                Le Grand Livre peut contenir plusieurs milliers de lignes.
                La génération peut prendre jusqu'à 30 secondes.
                Recommandé : exporter séparément.
              </span>
            </div>
          )}
        </section>
      )}

      {/* ── Mode export ── */}
      <section style={{ marginBottom: '28px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#1A202C', marginBottom: '14px' }}>
          Mode d'export
        </h2>

        <div style={{ display: 'flex', gap: '12px' }}>
          {[
            { value: 'global',   label: 'PDF global',   desc: 'Page de garde + sommaire + tous les documents' },
            { value: 'separate', label: 'PDF séparés',  desc: 'Un fichier PDF par document sélectionné' },
          ].map(opt => {
            const active = mode === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setMode(opt.value)}
                style={{
                  flex: 1, padding: '12px 16px', borderRadius: '10px',
                  border: active ? '2px solid #FF8200' : '2px solid #E2E8F0',
                  background: active ? '#FFF3E0' : '#FAFAFA',
                  cursor: 'pointer', textAlign: 'left',
                  transition: 'border-color 150ms, background 150ms',
                }}
              >
                <div style={{ fontSize: '14px', fontWeight: 700, color: active ? '#E57300' : '#1A202C', marginBottom: '4px' }}>
                  {opt.label}
                </div>
                <div style={{ fontSize: '12px', color: '#718096' }}>{opt.desc}</div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Orientation ── */}
      <section style={{ marginBottom: '28px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#1A202C', marginBottom: '14px' }}>
          Orientation des pages
        </h2>

        <div style={{ display: 'flex', gap: '12px' }}>
          {[
            { value: 'landscape', label: 'Paysage', desc: 'Format horizontal A4 — recommandé pour les tableaux', icon: '🖼' },
            { value: 'portrait',  label: 'Portrait', desc: 'Format vertical A4 — adapté aux textes longs',       icon: '📄' },
          ].map(opt => {
            const active = orientation === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setOrientation(opt.value)}
                style={{
                  flex: 1, padding: '12px 16px', borderRadius: '10px',
                  border: active ? '2px solid #FF8200' : '2px solid #E2E8F0',
                  background: active ? '#FFF3E0' : '#FAFAFA',
                  cursor: 'pointer', textAlign: 'left',
                  transition: 'border-color 150ms, background 150ms',
                }}
              >
                <div style={{ fontSize: '14px', fontWeight: 700, color: active ? '#E57300' : '#1A202C', marginBottom: '4px' }}>
                  {opt.icon} {opt.label}
                </div>
                <div style={{ fontSize: '12px', color: '#718096' }}>{opt.desc}</div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Annexes PDF (mode global uniquement) ── */}
      {mode === 'global' && (
        <section style={{ marginBottom: '28px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#1A202C', marginBottom: '4px' }}>
            Annexes PDF
          </h2>
          <p style={{ fontSize: '12px', color: '#718096', margin: '0 0 12px' }}>
            Ces PDFs seront fusionnés à la fin du document global, après une page séparatrice "Annexes".
          </p>

          <label
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '12px 16px', borderRadius: '10px',
              border: '2px dashed #CBD5E0', background: '#FAFAFA',
              cursor: 'pointer', fontSize: '13px', color: '#718096',
            }}
            onDragOver={e => { e.preventDefault(); }}
            onDrop={e => {
              e.preventDefault();
              const files = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf');
              if (files.length) setAnnexes(prev => [...prev, ...files]);
            }}
          >
            <input
              type="file"
              accept="application/pdf"
              multiple
              style={{ display: 'none' }}
              onChange={e => {
                const files = Array.from(e.target.files);
                if (files.length) setAnnexes(prev => [...prev, ...files]);
                e.target.value = '';
              }}
            />
            <span style={{ fontSize: '18px' }}>📎</span>
            <span>Déposer des PDFs ici ou <strong style={{ color: '#FF8200' }}>parcourir</strong></span>
          </label>

          {annexes.length > 0 && (
            <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {annexes.map((f, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 12px', borderRadius: '8px',
                  background: '#F0F7D4', border: '1px solid #C6E38A',
                  fontSize: '13px', color: '#1A202C',
                }}>
                  <span>📄 {f.name}</span>
                  <button
                    onClick={() => setAnnexes(prev => prev.filter((_, j) => j !== i))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#E53935', fontSize: '16px', lineHeight: 1, padding: '0 4px' }}
                    title="Supprimer"
                  >×</button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── Bouton Générer ── */}
      <button
        onClick={handleGenerate}
        disabled={!orderedSelection.length || progress !== null}
        style={{
          padding: '12px 28px', fontSize: '15px', fontWeight: 700,
          color: '#FFFFFF',
          background: (!orderedSelection.length || progress !== null) ? '#CBD5E0' : '#FF8200',
          border: 'none', borderRadius: '10px',
          cursor: (!orderedSelection.length || progress !== null) ? 'not-allowed' : 'pointer',
          transition: 'background 150ms',
          display: 'flex', alignItems: 'center', gap: '8px',
        }}
      >
        {progress ? '⏳ Génération en cours…' : '⬇️ Générer le PDF'}
      </button>

      {/* ── Progression ── */}
      {progress && (
        <div style={{ marginTop: '20px' }}>
          <div style={{ height: '6px', borderRadius: '3px', background: '#E2E8F0', overflow: 'hidden', marginBottom: '8px' }}>
            <div style={{
              height: '100%', borderRadius: '3px', background: '#FF8200',
              width: `${progress.pct}%`, transition: 'width 300ms ease',
            }} />
          </div>
          <div style={{ fontSize: '13px', color: '#718096' }}>{progress.label}</div>
        </div>
      )}

      {/* ── Erreur ── */}
      {error && (
        <div style={{
          marginTop: '16px', padding: '10px 14px',
          background: '#FEF2F2', border: '1px solid #F87171', borderRadius: '8px',
          fontSize: '13px', color: '#991B1B',
        }}>
          {error}
        </div>
      )}
    </div>
  );
}

export default ExportTab;
