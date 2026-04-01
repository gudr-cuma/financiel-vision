import { useState, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { parseAnalytique, computeAnalytique, computeAnalytiqueGlobal, CHARGE_CATEGORIES } from '../../engine/computeAnalytique';
import { formatAmountFull } from '../../engine/formatUtils';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function fmt(n) {
  if (n === null || n === undefined) return '—';
  const abs = Math.abs(n);
  if (abs >= 1000) return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n) + ' €';
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n) + ' €';
}

function fmtPct(n) {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(n) + ' %';
}

const CAT_COLORS = {
  entretien: '#FF8200',
  mo: '#31B700',
  carburant: '#B1DCE2',
  amortissement: '#718096',
  financier: '#E53935',
  autres: '#93C90E',
};

// ---------------------------------------------------------------------------
// Podium Top 3
// ---------------------------------------------------------------------------
function Podium({ top3 }) {
  const order = [1, 0, 2]; // 2nd, 1st, 3rd
  const heights = [130, 170, 100];
  const medals = ['🥇', '🥈', '🥉'];
  const colors = ['#FFD700', '#C0C0C0', '#CD7F32'];
  const labels = ['2e', '1er', '3e'];

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '8px', padding: '20px 0 0' }}>
      {order.map((rank, pos) => {
        const m = top3[rank];
        if (!m) return null;
        return (
          <div key={rank} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '180px' }}>
            {/* Medal + name */}
            <div style={{ textAlign: 'center', marginBottom: '8px' }}>
              <div style={{ fontSize: '28px' }}>{medals[rank]}</div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#2D3748', lineHeight: 1.3, maxHeight: '36px', overflow: 'hidden', textOverflow: 'ellipsis' }}
                title={m.label}>
                {m.label.length > 30 ? m.label.slice(0, 28) + '…' : m.label}
              </div>
              <div style={{ fontSize: '11px', color: '#718096', marginTop: '2px' }}>{m.code}</div>
            </div>
            {/* Podium block */}
            <div style={{
              width: '100%',
              height: `${heights[pos]}px`,
              background: `linear-gradient(180deg, ${colors[rank]}dd, ${colors[rank]}88)`,
              borderRadius: '8px 8px 0 0',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '8px',
              border: `2px solid ${colors[rank]}`,
            }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#1A202C' }}>{fmt(m.totalProduit)}</div>
              <div style={{ fontSize: '11px', color: '#4A5568', marginTop: '2px' }}>facturé</div>
              <div style={{ fontSize: '11px', color: m.resultat >= 0 ? '#268E00' : '#E53935', marginTop: '4px', fontWeight: 600 }}>
                {m.resultat >= 0 ? '+' : ''}{fmt(m.resultat)}
              </div>
              <div style={{ fontSize: '11px', color: '#718096' }}>{labels[pos]}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// KPI global
// ---------------------------------------------------------------------------
function GlobalKpis({ global: g }) {
  const kpis = [
    { label: 'Total facturé', value: fmt(g.totalProduit), color: '#268E00' },
    { label: 'Total charges', value: fmt(g.totalCharge), color: '#E53935' },
    { label: 'Résultat global', value: fmt(g.resultatGlobal), color: g.resultatGlobal >= 0 ? '#268E00' : '#E53935' },
    { label: 'Tx de couverture', value: fmtPct(g.txCouvertureGlobal), color: g.txCouvertureGlobal >= 100 ? '#268E00' : '#E53935' },
    { label: 'Matériels équilibrés', value: String(g.nbPositifs), color: '#268E00' },
    { label: 'Matériels déficitaires', value: String(g.nbNegatifs), color: '#E53935' },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
      {kpis.map(k => (
        <div key={k.label} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '14px 16px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#718096', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{k.label}</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: k.color, marginTop: '4px' }}>{k.value}</div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ligne matériel dans le tableau
// ---------------------------------------------------------------------------
function MaterielRow({ m, onClick, isSelected }) {
  const isPos = m.resultat >= 0;
  return (
    <tr
      onClick={() => onClick(m)}
      style={{
        cursor: 'pointer',
        backgroundColor: isSelected ? '#E3F2F5' : 'transparent',
        transition: 'background 0.1s',
      }}
      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#F7FAFC'; }}
      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
    >
      <td style={{ padding: '8px 10px', fontSize: '12px', color: '#718096', whiteSpace: 'nowrap' }}>{m.code}</td>
      <td style={{ padding: '8px 10px', fontSize: '13px', color: '#1A202C', maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.label}</td>
      <td style={{ padding: '8px 10px', fontSize: '13px', color: '#268E00', textAlign: 'right', whiteSpace: 'nowrap' }}>{fmt(m.totalProduit)}</td>
      <td style={{ padding: '8px 10px', fontSize: '13px', color: '#E53935', textAlign: 'right', whiteSpace: 'nowrap' }}>{fmt(m.totalCharge)}</td>
      <td style={{ padding: '8px 10px', fontSize: '13px', fontWeight: 600, color: isPos ? '#268E00' : '#E53935', textAlign: 'right', whiteSpace: 'nowrap' }}>
        {isPos ? '+' : ''}{fmt(m.resultat)}
      </td>
      <td style={{ padding: '8px 10px', textAlign: 'right', whiteSpace: 'nowrap' }}>
        <span style={{
          display: 'inline-block', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 600,
          background: isPos ? '#E8F5E0' : '#FFF5F5',
          color: isPos ? '#268E00' : '#E53935',
        }}>{fmtPct(m.txCouverture)}</span>
      </td>
      <td style={{ padding: '8px 10px', textAlign: 'center', fontSize: '16px' }}>
        {isPos ? '✅' : '⚠️'}
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Panel détail matériel
// ---------------------------------------------------------------------------
function DetailPanel({ m, onClose }) {
  if (!m) return null;

  const isPos = m.resultat >= 0;

  // Données pour le graphique charges
  const chartData = m.chargesDetail.map(c => ({ name: c.label.split(' ')[0], montant: c.montant, color: CAT_COLORS[c.id] || '#93C90E' }));

  // Charge dominante
  const dominant = m.chargesDetail[0];
  const second = m.chargesDetail[1];
  const entretienPct = m.chargesDetail.find(c => c.id === 'entretien')?.pct ?? 0;
  const moPct = m.chargesDetail.find(c => c.id === 'mo')?.pct ?? 0;
  const chargeComment = entretienPct > 50
    ? `⚠️ Charges d'entretien dominantes (${fmtPct(entretienPct)} des charges)`
    : moPct > 50
    ? `👷 Main d'œuvre dominante (${fmtPct(moPct)} des charges)`
    : dominant
    ? `${dominant.label} : ${fmtPct(dominant.pct)} des charges`
    : '';

  return (
    <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '20px 24px', marginTop: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div>
          <span style={{ fontSize: '11px', color: '#718096', fontWeight: 600 }}>{m.code}</span>
          <h3 style={{ margin: '2px 0 0', fontSize: '16px', fontWeight: 700, color: '#1A202C' }}>{m.label}</h3>
        </div>
        <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '20px', color: '#718096', padding: '0 4px' }}>✕</button>
      </div>

      {/* Verdict */}
      <div style={{
        padding: '12px 16px', borderRadius: '8px', marginBottom: '16px',
        background: isPos ? '#E8F5E0' : '#FFF5F5',
        border: `1px solid ${isPos ? '#C6E6B0' : '#FED7D7'}`,
      }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: isPos ? '#268E00' : '#E53935' }}>
          {isPos ? '✅ Matériel correctement facturé — plus-value' : '⚠️ Matériel sous-facturé — moins-value'}
        </div>
        <div style={{ display: 'flex', gap: '24px', marginTop: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px', color: '#4A5568' }}>
            Résultat : <strong style={{ color: isPos ? '#268E00' : '#E53935' }}>{isPos ? '+' : ''}{fmt(m.resultat)}</strong>
          </span>
          <span style={{ fontSize: '13px', color: '#4A5568' }}>
            Couverture : <strong style={{ color: isPos ? '#268E00' : '#E53935' }}>{fmtPct(m.txCouverture)}</strong>
          </span>
          {!isPos && m.totalCharge > 0 && (
            <span style={{ fontSize: '13px', color: '#4A5568' }}>
              Manque à facturer : <strong style={{ color: '#E53935' }}>{fmt(Math.abs(m.resultat))}</strong>
            </span>
          )}
        </div>
        {chargeComment && <div style={{ fontSize: '12px', color: '#718096', marginTop: '6px' }}>{chargeComment}</div>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Graphique charges */}
        <div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#718096', textTransform: 'uppercase', marginBottom: '8px' }}>Structure des charges</div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 10, top: 0, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 11 }} />
                <Tooltip formatter={v => fmt(v)} />
                <Bar dataKey="montant" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <div style={{ color: '#A0AEC0', fontSize: '13px' }}>Aucune charge</div>}
        </div>

        {/* Détail charges texte */}
        <div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#718096', textTransform: 'uppercase', marginBottom: '8px' }}>Détail par nature</div>
          {m.chargesDetail.length === 0
            ? <div style={{ color: '#A0AEC0', fontSize: '13px' }}>Aucune charge</div>
            : m.chargesDetail.map(c => (
              <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid #F7FAFC' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: CAT_COLORS[c.id] || '#93C90E', display: 'inline-block' }} />
                  <span style={{ fontSize: '13px', color: '#2D3748' }}>{c.label}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#1A202C' }}>{fmt(c.montant)}</span>
                  <span style={{ fontSize: '11px', color: '#718096', marginLeft: '6px' }}>{fmtPct(c.pct)}</span>
                </div>
              </div>
            ))
          }
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', paddingTop: '6px', borderTop: '2px solid #E2E8F0' }}>
            <span style={{ fontSize: '13px', fontWeight: 700 }}>Total charges</span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#E53935' }}>{fmt(m.totalCharge)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700 }}>Total facturé</span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#268E00' }}>{fmt(m.totalProduit)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main — AnalytiqueTab
// ---------------------------------------------------------------------------
export function AnalytiqueTab() {
  const [materiels, setMateriels] = useState(null);
  const [global, setGlobal] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all' | 'positif' | 'negatif'
  const [search, setSearch] = useState('');

  const processArrayBuffer = useCallback((arrayBuffer) => {
    const { rows, error: parseError } = parseAnalytique(arrayBuffer);
    if (parseError) {
      setError(parseError);
      setIsLoading(false);
      return;
    }
    const mats = computeAnalytique(rows);
    const glob = computeAnalytiqueGlobal(mats);
    setMateriels(mats);
    setGlobal(glob);
    setIsLoading(false);
  }, []);

  const loadFile = useCallback((file) => {
    if (!file) return;
    setIsLoading(true);
    setError(null);
    setSelected(null);

    const reader = new FileReader();
    reader.onload = (e) => processArrayBuffer(e.target.result);
    reader.onerror = () => { setError('Erreur de lecture du fichier.'); setIsLoading(false); };
    reader.readAsArrayBuffer(file);
  }, [processArrayBuffer]);

  const loadDemo = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setSelected(null);
    try {
      const response = await fetch('/demo/demo_analytique.xlsx');
      if (!response.ok) throw new Error('Impossible de charger le fichier de démonstration.');
      const arrayBuffer = await response.arrayBuffer();
      processArrayBuffer(arrayBuffer);
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
    }
  }, [processArrayBuffer]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) loadFile(file);
  }, [loadFile]);

  const handleFileInput = (e) => {
    const file = e.target.files[0];
    if (file) loadFile(file);
  };

  // Filtrage + recherche
  const filtered = materiels
    ? materiels.filter(m => {
        if (filter === 'positif' && m.resultat < 0) return false;
        if (filter === 'negatif' && m.resultat >= 0) return false;
        if (search && !m.label.toLowerCase().includes(search.toLowerCase()) && !m.code.toLowerCase().includes(search.toLowerCase())) return false;
        // Exclure codes 0-9 (charges générales non affectées) du tableau principal mais pas du global
        return true;
      })
    : [];

  const top3 = materiels ? materiels.filter(m => m.totalProduit > 0 && m.code.length > 1).slice(0, 3) : [];

  // ---------------------------------------------------------------------------
  // Render — Upload
  // ---------------------------------------------------------------------------
  if (!materiels) {
    return (
      <div style={{ padding: '40px 24px', maxWidth: '640px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontSize: '36px', marginBottom: '12px' }}>📊</div>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1A202C', margin: '0 0 6px' }}>Comptabilité analytique</h2>
        <p style={{ fontSize: '14px', color: '#718096', margin: '0 0 28px' }}>
          Importez la balance analytique (fichier Excel .xlsx) pour analyser les résultats par matériel.
        </p>

        {error && (
          <div style={{ background: '#FFF5F5', border: '1px solid #FED7D7', borderRadius: '8px', padding: '12px', marginBottom: '16px', color: '#C53030', fontSize: '13px' }}>
            ⚠️ {error}
          </div>
        )}

        <div
          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => document.getElementById('analytique-file-input').click()}
          style={{
            border: `2px dashed ${isDragging ? '#FF8200' : '#B1DCE2'}`,
            borderRadius: '12px',
            padding: '40px 24px',
            cursor: 'pointer',
            background: isDragging ? '#FFF3E0' : '#F8FAFB',
            transition: 'all 0.2s',
          }}
        >
          {isLoading ? (
            <div style={{ color: '#718096', fontSize: '14px' }}>⏳ Chargement en cours…</div>
          ) : (
            <>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>📂</div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#2D3748' }}>Déposez votre Balance Analytique ici</div>
              <div style={{ fontSize: '12px', color: '#A0AEC0', marginTop: '4px' }}>Format .xlsx — ligne 4 = en-têtes</div>
            </>
          )}
        </div>

        <input id="analytique-file-input" type="file" accept=".xlsx,.xls" onChange={handleFileInput} style={{ display: 'none' }} />

        <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center' }}>
          <div style={{ height: '1px', flex: 1, background: '#E2E8F0' }} />
          <span style={{ fontSize: '12px', color: '#A0AEC0' }}>ou</span>
          <div style={{ height: '1px', flex: 1, background: '#E2E8F0' }} />
        </div>

        <button
          onClick={loadDemo}
          disabled={isLoading}
          style={{
            marginTop: '16px', width: '100%', padding: '11px 20px',
            borderRadius: '8px', border: '1px solid #E2E8F0',
            background: '#F8FAFB', cursor: isLoading ? 'wait' : 'pointer',
            fontSize: '14px', fontWeight: 500, color: '#4A5568',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#EDF2F7'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#F8FAFB'; }}
        >
          ⚡ Charger les données de démonstration
        </button>
        <div style={{ marginTop: '8px', fontSize: '12px', color: '#A0AEC0' }}>
          🔒 Vos données restent dans votre navigateur
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render — Dashboard analytique
  // ---------------------------------------------------------------------------
  return (
    <div style={{ padding: '20px 0' }}>
      {/* Header + reset */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1A202C' }}>
          Comptabilité analytique — {materiels.length} matériels
        </h2>
        <button
          onClick={() => { setMateriels(null); setGlobal(null); setSelected(null); setError(null); }}
          style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#fff', cursor: 'pointer', fontSize: '13px', color: '#718096' }}
        >
          🔄 Changer de fichier
        </button>
      </div>

      {/* KPIs globaux */}
      <GlobalKpis global={global} />

      {/* Podium */}
      {top3.length >= 3 && (
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px 24px', marginBottom: '24px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#718096', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
            🏆 Top 3 — Matériels les plus facturés
          </div>
          <Podium top3={top3} />
        </div>
      )}

      {/* Filtres + search */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap' }}>
        {[
          { id: 'all', label: 'Tous les matériels' },
          { id: 'positif', label: '✅ Plus-values' },
          { id: 'negatif', label: '⚠️ Moins-values' },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            style={{
              padding: '6px 14px', borderRadius: '20px', border: '1px solid', fontSize: '13px', cursor: 'pointer',
              borderColor: filter === f.id ? '#FF8200' : '#E2E8F0',
              background: filter === f.id ? '#FFF3E0' : '#fff',
              color: filter === f.id ? '#FF8200' : '#718096',
              fontWeight: filter === f.id ? 600 : 400,
            }}
          >
            {f.label}
          </button>
        ))}
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher un matériel…"
          style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '13px', outline: 'none', marginLeft: 'auto', width: '200px' }}
        />
      </div>

      {/* Tableau matériels */}
      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden', marginBottom: '16px' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F7FAFC', borderBottom: '2px solid #E2E8F0' }}>
                {['Code', 'Matériel', 'Facturé', 'Charges', 'Résultat', 'Couverture', ''].map((h, i) => (
                  <th key={i} style={{ padding: '10px 10px', fontSize: '11px', fontWeight: 600, color: '#718096', textTransform: 'uppercase', textAlign: i >= 2 ? 'right' : 'left', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(m => (
                <MaterielRow
                  key={m.code}
                  m={m}
                  onClick={mat => setSelected(selected?.code === mat.code ? null : mat)}
                  isSelected={selected?.code === m.code}
                />
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#A0AEC0', fontSize: '13px' }}>Aucun matériel trouvé</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Panel détail */}
      {selected && <DetailPanel m={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

export default AnalytiqueTab;
