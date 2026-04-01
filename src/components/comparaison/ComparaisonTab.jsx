import { useRef } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import useStore from '../../store/useStore';
import { formatAmount } from '../../engine/formatUtils';
import { CHARGE_CATEGORIES } from '../../engine/computeCharges';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extrait le solde de fin de mois depuis la courbe quotidienne,
 * en suivant l'ordre de exerciceMonths.
 */
function extractMonthlyEndSoldes(dailyCurve, exerciceMonths) {
  return exerciceMonths.map(({ month, year }) => {
    const points = dailyCurve.filter(
      d => d.date.getFullYear() === year && d.date.getMonth() + 1 === month
    );
    if (!points.length) return null;
    return Math.round(points[points.length - 1].solde);
  });
}

/** Formate un montant pour les axes Recharts */
function fmtAxis(v) {
  if (Math.abs(v) >= 1000) return `${Math.round(v / 1000)} k€`;
  return `${v} €`;
}

/** Tooltip personnalisé commun */
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      backgroundColor: '#fff',
      border: '1px solid #E2E8F0',
      borderRadius: '8px',
      padding: '10px 14px',
      fontSize: '13px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    }}>
      <p style={{ margin: '0 0 6px', fontWeight: 600, color: '#1A202C' }}>{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ margin: '2px 0', color: entry.color }}>
          {entry.name} : {formatAmount(entry.value, Math.abs(entry.value) >= 10000)}
        </p>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Graphique 1 — Trésorerie N vs N-1
// ---------------------------------------------------------------------------
function TresoComparaison({ sigN, sigN1, tresoN, tresoN1 }) {
  const months = sigN.monthly;
  const soldesN   = extractMonthlyEndSoldes(tresoN.dailyCurve, sigN.monthly.map(m => ({ month: m.month, year: m.year })));
  const soldesN1  = extractMonthlyEndSoldes(tresoN1.dailyCurve, sigN1.monthly.map(m => ({ month: m.month, year: m.year })));

  const data = months.map((m, i) => ({
    label: m.shortLabel,
    N:   soldesN[i]  ?? null,
    N1:  soldesN1[i] ?? null,
  }));

  const yearN  = sigN.monthly[0]?.year  ?? 'N';
  const yearN1 = sigN1.monthly[0]?.year ?? 'N-1';

  return (
    <SectionCard title="Trésorerie — solde fin de mois" subtitle={`${yearN} vs ${yearN1}`}>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F0F4F8" />
          <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#718096' }} />
          <YAxis tickFormatter={fmtAxis} tick={{ fontSize: 11, fill: '#718096' }} width={72} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: '13px' }} />
          <Line
            type="monotone" dataKey="N" name={String(yearN)}
            stroke="#31B700" strokeWidth={2} dot={{ r: 3 }} connectNulls
          />
          <Line
            type="monotone" dataKey="N1" name={String(yearN1)}
            stroke="#FF8200" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="5 3" connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Graphique 2 — CA mensuel N vs N-1
// ---------------------------------------------------------------------------
function CaComparaison({ sigN, sigN1 }) {
  const yearN  = sigN.monthly[0]?.year  ?? 'N';
  const yearN1 = sigN1.monthly[0]?.year ?? 'N-1';

  const data = sigN.monthly.map((m, i) => ({
    label: m.shortLabel,
    N:  m.ca,
    N1: sigN1.monthly[i]?.ca ?? 0,
  }));

  return (
    <SectionCard title="Chiffre d'affaires mensuel" subtitle={`${yearN} vs ${yearN1}`}>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 16 }} barCategoryGap="25%">
          <CartesianGrid strokeDasharray="3 3" stroke="#F0F4F8" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#718096' }} />
          <YAxis tickFormatter={fmtAxis} tick={{ fontSize: 11, fill: '#718096' }} width={72} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: '13px' }} />
          <Bar dataKey="N"  name={String(yearN)}  fill="#31B700" radius={[3, 3, 0, 0]} />
          <Bar dataKey="N1" name={String(yearN1)} fill="#B1DCE2" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Graphique 3 — Répartition des charges N vs N-1
// ---------------------------------------------------------------------------
function ChargesComparaison({ chargesN, chargesN1, sigN, sigN1 }) {
  const yearN  = sigN.monthly[0]?.year  ?? 'N';
  const yearN1 = sigN1.monthly[0]?.year ?? 'N-1';

  // Aligner les catégories dans le même ordre que CHARGE_CATEGORIES
  const catIds = CHARGE_CATEGORIES.map(c => c.id);
  const catMap  = Object.fromEntries(CHARGE_CATEGORIES.map(c => [c.id, c]));

  const catN  = Object.fromEntries(chargesN.categories.map(c => [c.id, c]));
  const catN1 = Object.fromEntries(chargesN1.categories.map(c => [c.id, c]));

  const allIds = catIds.filter(id => catN[id] || catN1[id]);

  function DonutChart({ data, year, total }) {
    return (
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          textAlign: 'center', fontSize: '13px', fontWeight: 600,
          color: '#1A202C', margin: '0 0 4px',
        }}>
          {year}
        </p>
        <p style={{ textAlign: 'center', fontSize: '12px', color: '#718096', margin: '0 0 8px' }}>
          Total : {formatAmount(total, total >= 10000)}
        </p>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={data}
              cx="50%" cy="50%"
              innerRadius={55} outerRadius={85}
              dataKey="value"
              nameKey="name"
            >
              {data.map((entry) => (
                <Cell key={entry.id} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => formatAmount(value, value >= 10000)}
              contentStyle={{
                fontSize: '12px', borderRadius: '6px',
                border: '1px solid #E2E8F0',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  const pieDataN = allIds
    .map(id => ({
      id,
      name: catMap[id]?.label ?? id,
      value: Math.round(catN[id]?.montant ?? 0),
      color: catMap[id]?.color ?? '#718096',
    }))
    .filter(d => d.value > 0);

  const pieDataN1 = allIds
    .map(id => ({
      id,
      name: catMap[id]?.label ?? id,
      value: Math.round(catN1[id]?.montant ?? 0),
      color: catMap[id]?.color ?? '#718096',
    }))
    .filter(d => d.value > 0);

  return (
    <SectionCard title="Répartition des charges" subtitle={`${yearN} vs ${yearN1}`}>
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        <DonutChart data={pieDataN}  year={String(yearN)}  total={chargesN.totalCharges} />
        <DonutChart data={pieDataN1} year={String(yearN1)} total={chargesN1.totalCharges} />
      </div>

      {/* Légende commune */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: '8px 16px',
        justifyContent: 'center', marginTop: '8px',
      }}>
        {allIds.map(id => {
          const cat = catMap[id];
          if (!cat) return null;
          const mN  = catN[id]?.montant  ?? 0;
          const mN1 = catN1[id]?.montant ?? 0;
          const diff = mN - mN1;
          return (
            <div key={id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
              <span style={{
                display: 'inline-block', width: '10px', height: '10px',
                borderRadius: '2px', backgroundColor: cat.color, flexShrink: 0,
              }} />
              <span style={{ color: '#4A5568' }}>{cat.label}</span>
              {mN > 0 && mN1 > 0 && (
                <span style={{
                  color: diff > 0 ? '#E53935' : '#268E00',
                  fontWeight: 500,
                }}>
                  {diff > 0 ? '+' : ''}{formatAmount(diff, Math.abs(diff) >= 10000)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Section card wrapper
// ---------------------------------------------------------------------------
function SectionCard({ title, subtitle, children }) {
  return (
    <div style={{
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      border: '1px solid #E2E8F0',
      padding: '20px 24px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    }}>
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#1A202C' }}>
          {title}
        </h3>
        {subtitle && (
          <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#718096' }}>{subtitle}</p>
        )}
      </div>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Zone d'upload N-1
// ---------------------------------------------------------------------------
function UploadN1Zone() {
  const loadFecN1     = useStore(s => s.loadFecN1);
  const loadDemoN1    = useStore(s => s.loadDemoN1);
  const isLoadingN1   = useStore(s => s.isLoadingN1);
  const errorN1       = useStore(s => s.errorN1);
  const isDemo        = useStore(s => s.isDemo);
  const inputRef      = useRef(null);

  function handleFiles(files) {
    if (!files?.length) return;
    if (files.length > 1) return;
    loadFecN1(files[0]);
  }

  function handleDrop(e) {
    e.preventDefault();
    handleFiles(Array.from(e.dataTransfer.files));
  }

  function handleChange(e) {
    handleFiles(Array.from(e.target.files));
    e.target.value = '';
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      minHeight: '60vh', padding: '32px 16px',
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        padding: '48px',
        width: '100%', maxWidth: '520px',
        display: 'flex', flexDirection: 'column', gap: '20px',
      }}>
        {/* Titre */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>📊</div>
          <h2 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 700, color: '#1A202C' }}>
            Comparaison N / N-1
          </h2>
          <p style={{ margin: 0, fontSize: '14px', color: '#718096', lineHeight: 1.6 }}>
            Déposez le FEC de l'exercice précédent (N-1) pour activer les graphiques de comparaison.
          </p>
        </div>

        {/* Dropzone */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => !isLoadingN1 && inputRef.current?.click()}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && !isLoadingN1 && inputRef.current?.click()}
          role="button"
          tabIndex={isLoadingN1 ? -1 : 0}
          aria-label="Zone de dépôt du FEC N-1"
          style={{
            border: '2px dashed #B1DCE2',
            borderRadius: '12px',
            padding: '32px 24px',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: '8px',
            cursor: isLoadingN1 ? 'not-allowed' : 'pointer',
            backgroundColor: '#F7FEFF',
            opacity: isLoadingN1 ? 0.6 : 1,
            transition: 'background-color 0.2s',
          }}
        >
          <span style={{ fontSize: '28px' }}>📂</span>
          <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#1A202C', textAlign: 'center' }}>
            {isLoadingN1 ? 'Chargement en cours…' : 'Déposez votre FEC N-1 ici'}
          </p>
          <p style={{ margin: 0, fontSize: '12px', color: '#718096', textAlign: 'center' }}>
            Glissez-déposez ou cliquez pour sélectionner
          </p>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.txt"
            onChange={handleChange}
            style={{ display: 'none' }}
            aria-hidden="true"
          />
        </div>

        {/* Séparateur + bouton démo (uniquement si la session N est aussi une démo) */}
        {isDemo && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#E2E8F0' }} />
              <span style={{ fontSize: '13px', color: '#A0AEC0', fontWeight: 500 }}>ou</span>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#E2E8F0' }} />
            </div>
            <button
              onClick={() => loadDemoN1()}
              disabled={isLoadingN1}
              style={{
                width: '100%', padding: '11px 24px',
                backgroundColor: isLoadingN1 ? '#FFC06A' : '#FF8200',
                color: '#FFFFFF', border: 'none', borderRadius: '8px',
                fontSize: '14px', fontWeight: 600,
                cursor: isLoadingN1 ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => { if (!isLoadingN1) e.currentTarget.style.backgroundColor = '#E57300'; }}
              onMouseLeave={(e) => { if (!isLoadingN1) e.currentTarget.style.backgroundColor = '#FF8200'; }}
            >
              ⚡ Charger les données de démonstration N-1
            </button>
          </>
        )}

        {/* Erreur N-1 */}
        {errorN1 && (
          <div role="alert" style={{
            padding: '10px 14px',
            backgroundColor: '#FFF5F5',
            border: '1px solid #FEB2B2',
            borderRadius: '8px',
            fontSize: '13px', color: '#C53030',
          }}>
            ⚠️ {errorN1}
          </div>
        )}

        <p style={{ margin: 0, fontSize: '12px', color: '#A0AEC0', textAlign: 'center' }}>
          🔒 Les données restent dans votre navigateur
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// KPI de comparaison (bandeau de synthèse)
// ---------------------------------------------------------------------------
function ComparaisonKpis({ sigN, sigN1 }) {
  const yearN  = sigN.monthly[0]?.year  ?? 'N';
  const yearN1 = sigN1.monthly[0]?.year ?? 'N-1';

  const kpis = [
    { label: 'Chiffre d\'affaires', n: sigN.caTotal,                        n1: sigN1.caTotal },
    { label: 'EBE',     n: sigN.lines.find(l => l.id === 'ebe')?.amount ?? 0, n1: sigN1.lines.find(l => l.id === 'ebe')?.amount ?? 0 },
    { label: 'Résultat net', n: sigN.lines.find(l => l.id === 'resultat_net')?.amount ?? 0, n1: sigN1.lines.find(l => l.id === 'resultat_net')?.amount ?? 0 },
  ];

  return (
    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
      {kpis.map((kpi) => {
        const diff    = kpi.n - kpi.n1;
        const pct     = kpi.n1 !== 0 ? ((diff / Math.abs(kpi.n1)) * 100) : null;
        const isPos   = diff >= 0;
        return (
          <div key={kpi.label} style={{
            flex: '1 1 200px',
            backgroundColor: '#ffffff',
            border: '1px solid #E2E8F0',
            borderRadius: '10px',
            padding: '16px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}>
            <p style={{ margin: '0 0 6px', fontSize: '11px', fontWeight: 600, color: '#718096', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {kpi.label}
            </p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '20px', fontWeight: 700, color: '#1A202C' }}>
                {formatAmount(kpi.n, Math.abs(kpi.n) >= 10000)}
              </span>
              <span style={{ fontSize: '12px', color: '#A0AEC0' }}>
                vs {formatAmount(kpi.n1, Math.abs(kpi.n1) >= 10000)} ({yearN1})
              </span>
            </div>
            <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{
                fontSize: '13px', fontWeight: 600,
                color: isPos ? '#268E00' : '#E53935',
              }}>
                {isPos ? '▲' : '▼'} {formatAmount(Math.abs(diff), Math.abs(diff) >= 10000)}
              </span>
              {pct !== null && (
                <span style={{ fontSize: '12px', color: '#718096' }}>
                  ({isPos ? '+' : ''}{pct.toFixed(1)} %)
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ComparaisonTab — composant principal
// ---------------------------------------------------------------------------
export default function ComparaisonTab() {
  const sigN         = useStore(s => s.sigResult);
  const sigN1        = useStore(s => s.sigResultN1);
  const tresoN       = useStore(s => s.treasuryData);
  const tresoN1      = useStore(s => s.treasuryDataN1);
  const chargesN     = useStore(s => s.chargesData);
  const chargesN1    = useStore(s => s.chargesDataN1);
  const parsedFecN1  = useStore(s => s.parsedFecN1);
  const resetN1      = useStore(s => s.resetN1);

  // Si N-1 pas chargé → zone d'upload
  if (!parsedFecN1) {
    return <UploadN1Zone />;
  }

  const yearN  = sigN.monthly[0]?.year  ?? 'N';
  const yearN1 = sigN1.monthly[0]?.year ?? 'N-1';

  return (
    <div style={{ paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* En-tête */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#1A202C' }}>
            Comparaison {yearN} / {yearN1}
          </h2>
          <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#718096' }}>
            {parsedFecN1.fileName}
          </p>
        </div>
        <button
          onClick={resetN1}
          style={{
            fontSize: '12px', fontWeight: 500,
            color: '#718096', backgroundColor: 'transparent',
            border: '1px solid #E2E8F0', borderRadius: '6px',
            padding: '5px 12px', cursor: 'pointer',
          }}
        >
          ✕ Retirer le N-1
        </button>
      </div>

      {/* KPI bandeau */}
      <ComparaisonKpis sigN={sigN} sigN1={sigN1} />

      {/* Graphique 1 — Trésorerie */}
      <TresoComparaison sigN={sigN} sigN1={sigN1} tresoN={tresoN} tresoN1={tresoN1} />

      {/* Graphique 2 — CA mensuel */}
      <CaComparaison sigN={sigN} sigN1={sigN1} />

      {/* Graphique 3 — Charges */}
      <ChargesComparaison chargesN={chargesN} chargesN1={chargesN1} sigN={sigN} sigN1={sigN1} />

    </div>
  );
}
