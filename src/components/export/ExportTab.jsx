import { useState } from 'react';
import useStore from '../../store/useStore';
import { generateExport, DOC_LABELS } from '../../engine/generatePdf';

// Tous les documents disponibles, dans l'ordre d'export
const ALL_DOCS = [
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

  const [selected, setSelected] = useState(DEFAULT_SELECTED);
  const [mode, setMode]         = useState('global');
  const [progress, setProgress] = useState(null);
  const [error, setError]       = useState(null);

  if (!parsedFec) {
    return (
      <div style={{ padding: '48px', textAlign: 'center', color: '#A0AEC0' }}>
        Aucun FEC chargé
      </div>
    );
  }

  const docs = ALL_DOCS.filter(d => !d.requiresAnalytique || analytiqueData);

  const toggleDoc = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]);
  };

  const handleGenerate = async () => {
    if (!selected.length) return;
    setError(null);
    setProgress({ pct: 0, label: 'Initialisation…' });

    const storeData = { sigResult, bilanData, treasuryData, chargesData, analytiqueData };

    try {
      await generateExport(
        parsedFec,
        selected,
        { mode },
        (pct, label) => setProgress({ pct, label }),
        storeData,
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
