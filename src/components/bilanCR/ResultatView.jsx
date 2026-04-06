function fmtEur(v) {
  if (v === null || v === undefined) return '';
  if (v === 0) return '—';
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(v);
}

function fmtVar(v) {
  if (v === null || v === undefined) return '';
  const color = v >= 0 ? '#268E00' : '#E53935';
  const sign  = v >= 0 ? '+' : '';
  return (
    <span style={{ color, fontWeight: 600 }}>
      {sign}{v.toFixed(1)} %
    </span>
  );
}

const TH = ({ children, right }) => (
  <th style={{
    padding: '8px 10px',
    textAlign: right ? 'right' : 'left',
    fontSize: '11px', fontWeight: 700,
    color: '#718096', letterSpacing: '0.03em',
    borderBottom: '2px solid #E2E8F0',
    whiteSpace: 'nowrap',
  }}>
    {children}
  </th>
);

export function ResultatView({ items }) {
  if (!items?.length) return <div style={{ color: '#A0AEC0', padding: '24px' }}>Aucune donnée Résultat</div>;

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr>
            <TH>Libellé</TH>
            <TH right>Total N</TH>
            <TH right>N-1</TH>
            <TH right>Var. N/N-1</TH>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => {
            if (item.type === 'section') return (
              <tr key={i} style={{ background: '#B1DCE2' }}>
                <td colSpan={4} style={{ padding: '7px 10px', fontWeight: 700, fontSize: '12px', color: '#1A202C', letterSpacing: '0.04em' }}>
                  {item.label}
                </td>
              </tr>
            );

            if (item.type === 'subsection') return (
              <tr key={i} style={{ background: '#E3F2F5' }}>
                <td colSpan={4} style={{ padding: '5px 10px 5px 16px', fontWeight: 600, fontSize: '12px', color: '#4A5568', fontStyle: 'italic' }}>
                  {item.label}
                </td>
              </tr>
            );

            if (item.type === 'total') {
              // Résultat (net positif / négatif)
              const isResult = item.label && /^\d\)/.test(String(item.code ?? item.label));
              const bg = isResult
                ? (item.totalN >= 0 ? '#E8F5E0' : '#FFF5F5')
                : '#F7FAFC';
              const color = isResult
                ? (item.totalN >= 0 ? '#268E00' : '#E53935')
                : '#1A202C';
              return (
                <tr key={i} style={{ background: bg, borderTop: '2px solid #E2E8F0', borderBottom: '1px solid #E2E8F0' }}>
                  <td style={{ padding: '8px 10px', fontWeight: 700, fontSize: '12px', color: '#1A202C' }}>{item.label}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color, fontFamily: 'monospace' }}>{fmtEur(item.totalN)}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#4A5568', fontFamily: 'monospace' }}>{fmtEur(item.totalN1)}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right' }}>{fmtVar(item.variation)}</td>
                </tr>
              );
            }

            if (item.type === 'subline') return (
              <tr key={i} style={{ borderBottom: '1px solid #F0F4F8', background: '#FAFAFA' }}>
                <td style={{ padding: '4px 10px 4px 28px', fontSize: '12px', color: '#718096', fontStyle: 'italic' }}>
                  {item.code && <span style={{ fontSize: '10px', color: '#CBD5E0', marginRight: '8px', fontFamily: 'monospace' }}>{item.code}</span>}
                  {item.label}
                </td>
                <td style={{ padding: '4px 10px', textAlign: 'right', fontSize: '12px', color: '#718096', fontFamily: 'monospace' }}>{fmtEur(item.totalN)}</td>
                <td style={{ padding: '4px 10px', textAlign: 'right', fontSize: '12px', color: '#A0AEC0', fontFamily: 'monospace' }}>{fmtEur(item.totalN1)}</td>
                <td style={{ padding: '4px 10px', textAlign: 'right', fontSize: '12px' }}>{fmtVar(item.variation)}</td>
              </tr>
            );

            // Ligne principale
            const isNeg = item.totalN !== null && item.totalN < 0;
            return (
              <tr key={i} style={{ borderBottom: '1px solid #F0F4F8' }}
                onMouseEnter={e => e.currentTarget.style.background = '#F8FAFB'}
                onMouseLeave={e => e.currentTarget.style.background = ''}
              >
                <td style={{ padding: '5px 10px', color: '#1A202C' }}>
                  {item.code && <span style={{ fontSize: '10px', color: '#CBD5E0', marginRight: '8px', fontFamily: 'monospace' }}>{item.code}</span>}
                  {item.label}
                </td>
                <td style={{ padding: '5px 10px', textAlign: 'right', fontWeight: 500, fontFamily: 'monospace', color: isNeg ? '#E53935' : '#1A202C' }}>{fmtEur(item.totalN)}</td>
                <td style={{ padding: '5px 10px', textAlign: 'right', fontFamily: 'monospace', color: '#718096' }}>{fmtEur(item.totalN1)}</td>
                <td style={{ padding: '5px 10px', textAlign: 'right' }}>{fmtVar(item.variation)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default ResultatView;
