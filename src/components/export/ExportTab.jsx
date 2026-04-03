import { useState } from 'react';
import useStore from '../../store/useStore';
import { generateExport, DOC_LABELS } from '../../engine/generatePdf';

// Tous les documents disponibles, dans l'ordre d'export
const ALL_DOCS = [
  { id: 'dossier_gestion',   label: DOC_LABELS.dossier_gestion, requiresDossier: true },
  { id: 'sig',               label: DOC_LABELS.sig },
  { id: 'bilan',             label: DOC_LABELS.bilan },
  { id: 'balance',           label: DOC_LABELS.balance },
  { id: 'balance_aux',       label: DOC_LABELS.balance_aux },
  { id: 'grand_livre',       label: DOC_LABELS.grand_livre, warn: true },
  { id: 'treasury_curve',    label: DOC_LABELS.treasury_curve },
  { id: 'charges_charts',    label: DOC_LABELS.charges_charts },
  { id: 'analytique_table',  label: DOC_LABELS.analytique_table, requiresAnalytique: true },
  { id: 'analytique_podium', label: DOC_LABELS.analytique_podium, requiresAnalytique: true },
];

const DEFAULT_SELECTED = ['sig', 'bilan', 'balance', 'balance_aux', 'treasury_curve', 'charges_charts'];

export function ExportTab() {
  const parsedFec      = useStore(s => s.parsedFec);
  const sigResult      = useStore(s => s.sigResult);
  const bilanData      = useStore(s => s.bilanData);
  const treasuryData   = useStore(s => s.treasuryData);
  const chargesData    = useStore(s => s.chargesData);
  const analytiqueData = useStore(s => s.analytiqueData);
  const dossierData    = useStore(s => s.dossierData);

  const [selected, setSelected] = useState(DEFAULT_SELECTED);
  const [mode, setMode]         = useState('global');
  const [annexes, setAnnexes]   = useState([]);
  const [progress, setProgress] = useState(null);
  const [error, setError]       = useState(null);

  if (!parsedFec) {
    return (
      <div style={{ padding: '48px', textAlign: 'center', color: '#A0AEC0' }}>
        Aucun FEC chargé
      </div>
    );
  }

  const docs = ALL_DOCS.filter(d => {
    if (d.requiresAnalytique && !analytiqueData) return false;
    if (d.requiresDossier && !dossierData) return false;
    return true;
  });

  const toggleDoc = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]);
  };

  const handleGenerate = async () => {
    if (!selected.length) return;
    setError(null);
    setProgress({ pct: 0, label: 'Initialisation…' });

    const storeData = { sigResult, bilanData, treasuryData, chargesData, analytiqueData, dossierData };

    try {
      await generateExport(
        parsedFec,
        selected,
        { mode },
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

  const grandLivreChecked = selected.includes('grand_livre');

  return (
    <div style={{ paddingTop: '24px', maxWidth: '700px' }}>

      {/* ── Documents ── */}
      <section style={{ marginBottom: '28px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#1A202C', marginBottom: '14px' }}>
          Documents à exporter
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {docs.map(doc => (
            <label
              key={doc.id}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: '10px',
                cursor: 'pointer', fontSize: '14px', color: '#1A202C',
              }}
            >
              <input
                type="checkbox"
                checked={selected.includes(doc.id)}
                onChange={() => toggleDoc(doc.id)}
                style={{ width: '16px', height: '16px', marginTop: '1px', cursor: 'pointer', accentColor: '#FF8200' }}
              />
              <span>{doc.label}</span>
            </label>
          ))}
        </div>

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

      {/* ── Annexes PDF (mode global uniquement) ── */}
      {mode === 'global' && (
        <section style={{ marginBottom: '28px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#1A202C', marginBottom: '4px' }}>
            Annexes PDF
          </h2>
          <p style={{ fontSize: '12px', color: '#718096', margin: '0 0 12px' }}>
            Ces PDFs seront fusionnés à la fin du document global, après une page séparatrice "Annexes".
          </p>

          {/* Zone de dépôt */}
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

          {/* Liste des annexes ajoutées */}
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
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: '#E53935', fontSize: '16px', lineHeight: 1, padding: '0 4px',
                    }}
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
        disabled={!selected.length || progress !== null}
        style={{
          padding: '12px 28px', fontSize: '15px', fontWeight: 700,
          color: '#FFFFFF',
          background: (!selected.length || progress !== null) ? '#CBD5E0' : '#FF8200',
          border: 'none', borderRadius: '10px',
          cursor: (!selected.length || progress !== null) ? 'not-allowed' : 'pointer',
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
