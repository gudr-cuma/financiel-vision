import { useRef } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import useStore from '../../store/useStore';
import { formatAmount } from '../../engine/formatUtils';
import { CHARGE_CATEGORIES } from '../../engine/computeCharges';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtAxis(v) {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} M€`;
  if (abs >= 1000) return `${Math.round(v / 1000)} k€`;
  return `${v} €`;
}

function fmtPct(v) {
  if (v === null || v === undefined || !isFinite(v)) return '—';
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(v) + ' %';
}

function fmtMoney(v) {
  if (v === null || v === undefined) return '—';
  return formatAmount(v, Math.abs(v) >= 10000);
}

function CustomTooltip({ active, payload, label, isPct }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
      <p style={{ margin: '0 0 6px', fontWeight: 600, color: '#1A202C' }}>{label}</p>
      {payload.map(e => (
        <p key={e.name} style={{ margin: '2px 0', color: e.color }}>
          {e.name} : {isPct ? fmtPct(e.value) : fmtMoney(e.value)}
        </p>
      ))}
    </div>
  );
}

function SectionCard({ title, subtitle, children }) {
  return (
    <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#1A202C' }}>{title}</h3>
        {subtitle && <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#718096' }}>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

// Couleurs par année (N-2 gris, N-1 orange, N vert)
const YEAR_COLORS = ['#B1DCE2', '#FF8200', '#31B700'];

// ---------------------------------------------------------------------------
// Extraction des données annuelles (SIG + Bilan)
// ---------------------------------------------------------------------------
function extractYearData(sigResult, bilanData, year) {
  if (!sigResult) return null;
  const line = (id) => sigResult.lines?.find(l => l.id === id)?.amount ?? 0;

  const ca = sigResult.caTotal ?? 0;
  const ebe = line('ebe');
  const resultatCourant = line('resultat_courant');
  const resultatExceptionnel = line('resultat_exceptionnel');
  const resultatNet = line('resultat_net');

  // Données bilan
  const fr       = bilanData?.ratios?.fondsRoulement?.value ?? 0;
  const cpTotal  = bilanData?.capitauxPropres?._sousTotal ?? 0;
  const totalPassif = bilanData?.totalPassif ?? 0;
  const capitalSocial = bilanData?.capitauxPropres?.capital_social?.montant ?? 0;
  const vbm      = bilanData?.valeurBruteMateriels ?? 0;
  const dettesTotales = Math.max(0, totalPassif - cpTotal);
  const creances = (bilanData?.actifCirculant?.creances_adherents?.montant ?? 0)
    + (bilanData?.actifCirculant?.creances_exploitation?.montant ?? 0)
    + (bilanData?.actifCirculant?.creances_fiscales?.montant ?? 0)
    + (bilanData?.actifCirculant?.autres_creances?.montant ?? 0);

  return {
    year: String(year),
    ca, ebe, resultatCourant, resultatExceptionnel, resultatNet,
    fr, cpTotal, totalPassif, capitalSocial, vbm, dettesTotales, creances,
    frSurCa:                  ca > 0 ? (fr / ca) * 100                        : null,
    creancesSurCa:            ca > 0 ? (creances / ca) * 100                  : null,
    capitalSocialSurCa:       ca > 0 ? (capitalSocial / ca) * 100             : null,
    capitalSocialSurMateriels:vbm > 0 ? (capitalSocial / vbm) * 100           : null,
    capitalSocialSurCp:       cpTotal > 0 ? (capitalSocial / cpTotal) * 100   : null,
    tauxEndettement:          cpTotal > 0 ? (dettesTotales / cpTotal) * 100    : null,
    cpSurPassif:              totalPassif > 0 ? (cpTotal / totalPassif) * 100  : null,
  };
}

// ---------------------------------------------------------------------------
// Graphique annuel générique (1 barre par année, valeurs monétaires)
// ---------------------------------------------------------------------------
function AnnualBarChart({ data, dataKey, colors, isPct = false, yDomain }) {
  const chartData = data.map(d => ({ year: d.year, value: d[dataKey] }));
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 8 }} barCategoryGap="35%">
        <CartesianGrid strokeDasharray="3 3" stroke="#F0F4F8" vertical={false} />
        <XAxis dataKey="year" tick={{ fontSize: 12, fill: '#718096' }} />
        <YAxis tickFormatter={isPct ? fmtPct : fmtAxis} tick={{ fontSize: 11, fill: '#718096' }} width={64} domain={yDomain} />
        <Tooltip content={<CustomTooltip isPct={isPct} />} />
        <ReferenceLine y={0} stroke="#CBD5E0" strokeWidth={1} />
        <Bar dataKey="value" radius={[4, 4, 0, 0]} label={{ position: 'top', fontSize: 10, fill: '#4A5568', formatter: isPct ? fmtPct : fmtAxis }}>
          {chartData.map((entry, i) => (
            <Cell key={i} fill={colors[i] ?? '#B1DCE2'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ---------------------------------------------------------------------------
// Graphique "Résultats" — 3 séries par année (courant / exceptionnel / net)
// ---------------------------------------------------------------------------
function ResultatsChart({ data, years, colors }) {
  // Tableau recharts : une entrée par série (courant, exceptionnel, net)
  const chartData = [
    { label: 'Rés. courant',      key: 'resultatCourant' },
    { label: 'Rés. exceptionnel', key: 'resultatExceptionnel' },
    { label: 'Résultat net',      key: 'resultatNet' },
  ].map(s => {
    const row = { label: s.label };
    data.forEach(d => { row[d.year] = d[s.key]; });
    return row;
  });

  // Tableau synthèse sous le graphique
  return (
    <>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 8 }} barCategoryGap="25%">
          <CartesianGrid strokeDasharray="3 3" stroke="#F0F4F8" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#718096' }} />
          <YAxis tickFormatter={fmtAxis} tick={{ fontSize: 11, fill: '#718096' }} width={68} />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={0} stroke="#CBD5E0" strokeWidth={1} />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          {data.map((d, i) => (
            <Bar key={d.year} dataKey={d.year} name={d.year} fill={colors[i] ?? '#B1DCE2'} radius={[3, 3, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>

      {/* Tableau sous le graphique */}
      <div style={{ overflowX: 'auto', marginTop: '12px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ background: '#F7FAFC', borderBottom: '1px solid #E2E8F0' }}>
              <th style={{ padding: '7px 10px', textAlign: 'left', color: '#718096', fontWeight: 600 }}></th>
              {data.map(d => (
                <th key={d.year} style={{ padding: '7px 10px', textAlign: 'right', color: '#718096', fontWeight: 600 }}>{d.year}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { label: 'Rés. courant', key: 'resultatCourant' },
              { label: 'Rés. exceptionnel', key: 'resultatExceptionnel' },
              { label: 'Résultat net', key: 'resultatNet' },
            ].map(row => (
              <tr key={row.key} style={{ borderBottom: '1px solid #F7FAFC' }}>
                <td style={{ padding: '6px 10px', color: '#4A5568', fontWeight: 500 }}>{row.label}</td>
                {data.map(d => {
                  const v = d[row.key];
                  return (
                    <td key={d.year} style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 600, color: v >= 0 ? '#268E00' : '#E53935' }}>
                      {fmtMoney(v)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Grille des 11 graphiques annuels
// ---------------------------------------------------------------------------
function AnnualChartsGrid({ annualData }) {
  const years = annualData.map(d => d.year);
  const colors = annualData.map((_, i) => YEAR_COLORS[i]);

  // Légende des couleurs en haut
  return (
    <div>
      {/* Légende */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {annualData.map((d, i) => (
          <span key={d.year} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#4A5568' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: colors[i], display: 'inline-block' }} />
            {d.year}
          </span>
        ))}
      </div>

      {/* Grille 2 colonnes */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>

        {/* 1 — CA */}
        <SectionCard title="Chiffre d'affaires" subtitle="Total annuel">
          <AnnualBarChart data={annualData} dataKey="ca" colors={colors} />
        </SectionCard>

        {/* 2 — EBE */}
        <SectionCard title="EBE" subtitle="Excédent Brut d'Exploitation">
          <AnnualBarChart data={annualData} dataKey="ebe" colors={colors} />
        </SectionCard>

        {/* 3 — Résultats — occupe 2 colonnes */}
        <div style={{ gridColumn: '1 / -1' }}>
          <SectionCard title="Résultats" subtitle="Courant · Exceptionnel · Net">
            <ResultatsChart data={annualData} years={years} colors={colors} />
          </SectionCard>
        </div>

        {/* 4 — Fonds de roulement */}
        <SectionCard title="Fonds de roulement" subtitle="(Capitaux propres + Dettes MLT) − Actif immobilisé">
          <AnnualBarChart data={annualData} dataKey="fr" colors={colors} />
        </SectionCard>

        {/* 5 — FR / CA */}
        <SectionCard title="Fonds de roulement / CA" subtitle="Ratio en %">
          <AnnualBarChart data={annualData} dataKey="frSurCa" colors={colors} isPct />
        </SectionCard>

        {/* 6 — Créances / CA */}
        <SectionCard title="Créances / CA" subtitle="Ratio en %">
          <AnnualBarChart data={annualData} dataKey="creancesSurCa" colors={colors} isPct />
        </SectionCard>

        {/* 7 — Capital social / CA */}
        <SectionCard title="Capital social / CA" subtitle="Ratio en %">
          <AnnualBarChart data={annualData} dataKey="capitalSocialSurCa" colors={colors} isPct />
        </SectionCard>

        {/* 8 — Capital social / Valeur brute matériels */}
        <SectionCard title="Capital social / Val. brute matériels" subtitle="Ratio en %">
          <AnnualBarChart data={annualData} dataKey="capitalSocialSurMateriels" colors={colors} isPct />
        </SectionCard>

        {/* 9 — Capital social / Capitaux propres */}
        <SectionCard title="Capital social / Capitaux propres" subtitle="Ratio en %">
          <AnnualBarChart data={annualData} dataKey="capitalSocialSurCp" colors={colors} isPct />
        </SectionCard>

        {/* 10 — Taux d'endettement */}
        <SectionCard title="Taux d'endettement" subtitle="Dettes totales / Capitaux propres × 100">
          <AnnualBarChart data={annualData} dataKey="tauxEndettement" colors={colors} isPct />
        </SectionCard>

        {/* 11 — Capitaux propres / Passif */}
        <SectionCard title="Capitaux propres / Passif" subtitle="Ratio en %">
          <AnnualBarChart data={annualData} dataKey="cpSurPassif" colors={colors} isPct />
        </SectionCard>

      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Graphiques mensuels (existants) — trésorerie, CA mensuel, charges
// ---------------------------------------------------------------------------

function extractMonthlyEndSoldes(dailyCurve, months) {
  return months.map(({ month, year }) => {
    const pts = dailyCurve.filter(d => d.date.getFullYear() === year && d.date.getMonth() + 1 === month);
    return pts.length ? Math.round(pts[pts.length - 1].solde) : null;
  });
}

function TresoComparaison({ sigN, sigN1, tresoN, tresoN1 }) {
  const soldesN  = extractMonthlyEndSoldes(tresoN.dailyCurve, sigN.monthly.map(m => ({ month: m.month, year: m.year })));
  const soldesN1 = extractMonthlyEndSoldes(tresoN1.dailyCurve, sigN1.monthly.map(m => ({ month: m.month, year: m.year })));
  const yearN  = sigN.monthly[0]?.year  ?? 'N';
  const yearN1 = sigN1.monthly[0]?.year ?? 'N-1';
  const data = sigN.monthly.map((m, i) => ({ label: m.shortLabel, N: soldesN[i] ?? null, N1: soldesN1[i] ?? null }));
  return (
    <SectionCard title="Trésorerie — solde fin de mois" subtitle={`${yearN} vs ${yearN1}`}>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F0F4F8" />
          <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#718096' }} />
          <YAxis tickFormatter={fmtAxis} tick={{ fontSize: 11, fill: '#718096' }} width={72} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: '13px' }} />
          <Line type="monotone" dataKey="N" name={String(yearN)} stroke="#31B700" strokeWidth={2} dot={{ r: 3 }} connectNulls />
          <Line type="monotone" dataKey="N1" name={String(yearN1)} stroke="#FF8200" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="5 3" connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </SectionCard>
  );
}

function CaComparaison({ sigN, sigN1 }) {
  const yearN  = sigN.monthly[0]?.year  ?? 'N';
  const yearN1 = sigN1.monthly[0]?.year ?? 'N-1';
  const data = sigN.monthly.map((m, i) => ({ label: m.shortLabel, N: m.ca, N1: sigN1.monthly[i]?.ca ?? 0 }));
  return (
    <SectionCard title="CA mensuel" subtitle={`${yearN} vs ${yearN1}`}>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 16 }} barCategoryGap="25%">
          <CartesianGrid strokeDasharray="3 3" stroke="#F0F4F8" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#718096' }} />
          <YAxis tickFormatter={fmtAxis} tick={{ fontSize: 11, fill: '#718096' }} width={72} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: '13px' }} />
          <Bar dataKey="N"  name={String(yearN)}  fill="#31B700" radius={[3, 3, 0, 0]} />
          <Bar dataKey="N1" name={String(yearN1)} fill="#FF8200" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </SectionCard>
  );
}

function ChargesComparaison({ chargesN, chargesN1, sigN, sigN1 }) {
  const yearN  = sigN.monthly[0]?.year  ?? 'N';
  const yearN1 = sigN1.monthly[0]?.year ?? 'N-1';
  const catIds = CHARGE_CATEGORIES.map(c => c.id);
  const catMap = Object.fromEntries(CHARGE_CATEGORIES.map(c => [c.id, c]));
  const catN   = Object.fromEntries(chargesN.categories.map(c => [c.id, c]));
  const catN1  = Object.fromEntries(chargesN1.categories.map(c => [c.id, c]));
  const allIds = catIds.filter(id => catN[id] || catN1[id]);

  function DonutChart({ data, year, total }) {
    return (
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ textAlign: 'center', fontSize: '13px', fontWeight: 600, color: '#1A202C', margin: '0 0 2px' }}>{year}</p>
        <p style={{ textAlign: 'center', fontSize: '12px', color: '#718096', margin: '0 0 4px' }}>Total : {fmtMoney(total)}</p>
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" nameKey="name">
              {data.map(e => <Cell key={e.id} fill={e.color} />)}
            </Pie>
            <Tooltip formatter={v => fmtMoney(v)} contentStyle={{ fontSize: '12px', borderRadius: '6px', border: '1px solid #E2E8F0' }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  const pieN  = allIds.map(id => ({ id, name: catMap[id]?.label ?? id, value: Math.round(catN[id]?.montant ?? 0), color: catMap[id]?.color ?? '#718096' })).filter(d => d.value > 0);
  const pieN1 = allIds.map(id => ({ id, name: catMap[id]?.label ?? id, value: Math.round(catN1[id]?.montant ?? 0), color: catMap[id]?.color ?? '#718096' })).filter(d => d.value > 0);

  return (
    <SectionCard title="Répartition des charges" subtitle={`${yearN} vs ${yearN1}`}>
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        <DonutChart data={pieN}  year={String(yearN)}  total={chargesN.totalCharges} />
        <DonutChart data={pieN1} year={String(yearN1)} total={chargesN1.totalCharges} />
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', justifyContent: 'center', marginTop: '8px' }}>
        {allIds.map(id => {
          const cat = catMap[id]; if (!cat) return null;
          const diff = (catN[id]?.montant ?? 0) - (catN1[id]?.montant ?? 0);
          return (
            <div key={id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
              <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '2px', backgroundColor: cat.color }} />
              <span style={{ color: '#4A5568' }}>{cat.label}</span>
              {catN[id] && catN1[id] && <span style={{ color: diff > 0 ? '#E53935' : '#268E00', fontWeight: 500 }}>{diff > 0 ? '+' : ''}{fmtMoney(diff)}</span>}
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Zone d'upload N-1
// ---------------------------------------------------------------------------
function UploadN1Zone() {
  const loadFecN1   = useStore(s => s.loadFecN1);
  const loadDemoN1  = useStore(s => s.loadDemoN1);
  const isLoadingN1 = useStore(s => s.isLoadingN1);
  const errorN1     = useStore(s => s.errorN1);
  const isDemo      = useStore(s => s.isDemo);
  const inputRef    = useRef(null);

  function handleFiles(files) { if (files?.length === 1) loadFecN1(files[0]); }
  function handleDrop(e) { e.preventDefault(); handleFiles(Array.from(e.dataTransfer.files)); }
  function handleChange(e) { handleFiles(Array.from(e.target.files)); e.target.value = ''; }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: '32px 16px' }}>
      <div style={{ backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', padding: '48px', width: '100%', maxWidth: '520px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>📊</div>
          <h2 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 700, color: '#1A202C' }}>Comparaison multi-exercices</h2>
          <p style={{ margin: 0, fontSize: '14px', color: '#718096', lineHeight: 1.6 }}>
            Déposez le FEC N-1 pour activer les graphiques de comparaison.
          </p>
        </div>
        <div
          onDragOver={e => e.preventDefault()} onDrop={handleDrop}
          onClick={() => !isLoadingN1 && inputRef.current?.click()}
          style={{ border: '2px dashed #B1DCE2', borderRadius: '12px', padding: '32px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: isLoadingN1 ? 'not-allowed' : 'pointer', backgroundColor: '#F7FEFF', opacity: isLoadingN1 ? 0.6 : 1 }}
        >
          <span style={{ fontSize: '28px' }}>📂</span>
          <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#1A202C' }}>{isLoadingN1 ? 'Chargement…' : 'Déposez votre FEC N-1 ici'}</p>
          <p style={{ margin: 0, fontSize: '12px', color: '#718096' }}>Glissez-déposez ou cliquez pour sélectionner</p>
          <input ref={inputRef} type="file" accept=".csv,.txt" onChange={handleChange} style={{ display: 'none' }} />
        </div>
        {isDemo && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#E2E8F0' }} />
              <span style={{ fontSize: '13px', color: '#A0AEC0' }}>ou</span>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#E2E8F0' }} />
            </div>
            <button onClick={loadDemoN1} disabled={isLoadingN1}
              style={{ width: '100%', padding: '11px 24px', backgroundColor: isLoadingN1 ? '#FFC06A' : '#FF8200', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: isLoadingN1 ? 'not-allowed' : 'pointer' }}
              onMouseEnter={e => { if (!isLoadingN1) e.currentTarget.style.backgroundColor = '#E57300'; }}
              onMouseLeave={e => { if (!isLoadingN1) e.currentTarget.style.backgroundColor = '#FF8200'; }}>
              ⚡ Charger les données de démonstration N-1
            </button>
          </>
        )}
        {errorN1 && <div style={{ padding: '10px 14px', backgroundColor: '#FFF5F5', border: '1px solid #FEB2B2', borderRadius: '8px', fontSize: '13px', color: '#C53030' }}>⚠️ {errorN1}</div>}
        <p style={{ margin: 0, fontSize: '12px', color: '#A0AEC0', textAlign: 'center' }}>🔒 Les données restent dans votre navigateur</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Zone d'upload N-2 (inline dans le dashboard)
// ---------------------------------------------------------------------------
function UploadN2Zone() {
  const loadFecN2   = useStore(s => s.loadFecN2);
  const loadDemoN2  = useStore(s => s.loadDemoN2);
  const isLoadingN2 = useStore(s => s.isLoadingN2);
  const errorN2     = useStore(s => s.errorN2);
  const isDemo      = useStore(s => s.isDemo);
  const inputRef    = useRef(null);

  function handleFiles(files) { if (files?.length === 1) loadFecN2(files[0]); }
  function handleDrop(e) { e.preventDefault(); handleFiles(Array.from(e.dataTransfer.files)); }
  function handleChange(e) { handleFiles(Array.from(e.target.files)); e.target.value = ''; }

  return (
    <div style={{ backgroundColor: '#F8FAFB', borderRadius: '12px', border: '2px dashed #B1DCE2', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
      <span style={{ fontSize: '24px' }}>📁</span>
      <div style={{ flex: 1, minWidth: '200px' }}>
        <div style={{ fontSize: '14px', fontWeight: 600, color: '#1A202C' }}>Ajouter l'exercice N-2</div>
        <div style={{ fontSize: '12px', color: '#718096', marginTop: '2px' }}>Déposez un 3ème FEC pour les graphiques sur 3 ans</div>
        {errorN2 && <div style={{ fontSize: '12px', color: '#E53935', marginTop: '4px' }}>⚠️ {errorN2}</div>}
      </div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button onClick={() => inputRef.current?.click()} disabled={isLoadingN2}
          style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #B1DCE2', background: '#fff', cursor: isLoadingN2 ? 'wait' : 'pointer', fontSize: '13px', fontWeight: 500, color: '#2D3748' }}>
          {isLoadingN2 ? '⏳ Chargement…' : '📂 Parcourir'}
        </button>
        {isDemo && (
          <button onClick={loadDemoN2} disabled={isLoadingN2}
            style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#FF8200', cursor: isLoadingN2 ? 'wait' : 'pointer', fontSize: '13px', fontWeight: 600, color: '#fff' }}
            onMouseEnter={e => { if (!isLoadingN2) e.currentTarget.style.background = '#E57300'; }}
            onMouseLeave={e => { if (!isLoadingN2) e.currentTarget.style.background = '#FF8200'; }}>
            ⚡ Démo N-2
          </button>
        )}
      </div>
      <div
        onDragOver={e => e.preventDefault()} onDrop={handleDrop}
        style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
      />
      <input ref={inputRef} type="file" accept=".csv,.txt" onChange={handleChange} style={{ display: 'none' }} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// KPI bandeau de synthèse
// ---------------------------------------------------------------------------
function ComparaisonKpis({ annualData }) {
  const kpis = [
    { label: 'Chiffre d\'affaires', key: 'ca' },
    { label: 'EBE', key: 'ebe' },
    { label: 'Résultat net', key: 'resultatNet' },
  ];
  const latest = annualData[annualData.length - 1];
  const prev   = annualData[annualData.length - 2];

  return (
    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
      {kpis.map(kpi => {
        const n  = latest?.[kpi.key] ?? 0;
        const n1 = prev?.[kpi.key] ?? 0;
        const diff = n - n1;
        const pct = n1 !== 0 ? (diff / Math.abs(n1)) * 100 : null;
        const isPos = diff >= 0;
        return (
          <div key={kpi.key} style={{ flex: '1 1 200px', backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '16px 20px' }}>
            <p style={{ margin: '0 0 6px', fontSize: '11px', fontWeight: 600, color: '#718096', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{kpi.label}</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '20px', fontWeight: 700, color: '#1A202C' }}>{fmtMoney(n)}</span>
              {prev && <span style={{ fontSize: '12px', color: '#A0AEC0' }}>vs {fmtMoney(n1)} ({prev.year})</span>}
            </div>
            {prev && (
              <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: isPos ? '#268E00' : '#E53935' }}>
                  {isPos ? '▲' : '▼'} {fmtMoney(Math.abs(diff))}
                </span>
                {pct !== null && <span style={{ fontSize: '12px', color: '#718096' }}>({isPos ? '+' : ''}{pct.toFixed(1)} %)</span>}
              </div>
            )}
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
  const sigN        = useStore(s => s.sigResult);
  const sigN1       = useStore(s => s.sigResultN1);
  const sigN2       = useStore(s => s.sigResultN2);
  const tresoN      = useStore(s => s.treasuryData);
  const tresoN1     = useStore(s => s.treasuryDataN1);
  const chargesN    = useStore(s => s.chargesData);
  const chargesN1   = useStore(s => s.chargesDataN1);
  const bilanN      = useStore(s => s.bilanData);
  const bilanN1     = useStore(s => s.bilanDataN1);
  const bilanN2     = useStore(s => s.bilanDataN2);
  const parsedFecN1 = useStore(s => s.parsedFecN1);
  const parsedFecN2 = useStore(s => s.parsedFecN2);
  const resetN1     = useStore(s => s.resetN1);
  const resetN2     = useStore(s => s.resetN2);

  // N-1 pas chargé → zone d'upload
  if (!parsedFecN1) return <UploadN1Zone />;

  // Construire les données annuelles dans l'ordre chronologique
  const yearN  = sigN?.monthly?.[0]?.year  ?? 'N';
  const yearN1 = sigN1?.monthly?.[0]?.year ?? 'N-1';
  const yearN2 = sigN2?.monthly?.[0]?.year ?? 'N-2';

  const dataN2 = parsedFecN2 ? extractYearData(sigN2, bilanN2, yearN2) : null;
  const dataN1 = extractYearData(sigN1, bilanN1, yearN1);
  const dataN  = extractYearData(sigN,  bilanN,  yearN);

  const annualData = [dataN2, dataN1, dataN].filter(Boolean);
  // Aligner les couleurs : N-2 gris-bleu, N-1 orange, N vert
  const colorOffset = dataN2 ? 0 : 1;

  return (
    <div style={{ paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* En-tête */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#1A202C' }}>
            Comparaison {dataN2 ? `${yearN2} / ` : ''}{yearN1} / {yearN}
          </h2>
          <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#718096' }}>
            {parsedFecN1.fileName}{parsedFecN2 ? ` · ${parsedFecN2.fileName}` : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {parsedFecN2 && (
            <button onClick={resetN2} style={{ fontSize: '12px', fontWeight: 500, color: '#718096', backgroundColor: 'transparent', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '5px 12px', cursor: 'pointer' }}>
              ✕ Retirer N-2
            </button>
          )}
          <button onClick={resetN1} style={{ fontSize: '12px', fontWeight: 500, color: '#718096', backgroundColor: 'transparent', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '5px 12px', cursor: 'pointer' }}>
            ✕ Retirer N-1
          </button>
        </div>
      </div>

      {/* Zone d'upload N-2 (si pas encore chargé) */}
      {!parsedFecN2 && <UploadN2Zone />}

      {/* KPI bandeau */}
      <ComparaisonKpis annualData={annualData} />

      {/* === Section 1 — Graphiques annuels === */}
      <div>
        <h3 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 700, color: '#718096', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          📊 Analyses pluriannuelles
        </h3>
        <AnnualChartsGrid annualData={annualData} />
      </div>

      {/* === Section 2 — Graphiques mensuels N vs N-1 === */}
      <div>
        <h3 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 700, color: '#718096', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          📈 Détail mensuel — {yearN} vs {yearN1}
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <TresoComparaison sigN={sigN} sigN1={sigN1} tresoN={tresoN} tresoN1={tresoN1} />
          <CaComparaison sigN={sigN} sigN1={sigN1} />
          <ChargesComparaison chargesN={chargesN} chargesN1={chargesN1} sigN={sigN} sigN1={sigN1} />
        </div>
      </div>

    </div>
  );
}
