function fmtEur(v) {
  if (v === null || v === undefined) return '';
  if (v === 0) return '—';
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(v);
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

export function PassifView({ items }) {
  if (!items?.length) return <div style={{ color: '#A0AEC0', padding: '24px' }}>Aucune donnée Passif</div>;

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr>
            <TH>Libellé</TH>
            <TH right>Net N</TH>
            <TH right>Net N-1</TH>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => {
            if (item.type === 'section') return (
              <tr key={i} style={{ background: '#B1DCE2' }}>
                <td colSpan={3} style={{ padding: '7px 10px', fontWeight: 700, fontSize: '12px', color: '#1A202C', letterSpacing: '0.04em' }}>
                  {item.label}
                </td>
              </tr>
            );

            if (item.type === 'subsection') return (
              <tr key={i} style={{ background: '#E3F2F5' }}>
                <td colSpan={3} style={{ padding: '5px 10px 5px 20px', fontWeight: 600, fontSize: '12px', color: '#4A5568', fontStyle: 'italic' }}>
                  {item.label}
                </td>
              </tr>
            );

            if (item.type === 'grandtotal') return (
              <tr key={i} style={{ background: '#1A202C' }}>
                <td style={{ padding: '9px 10px', fontWeight: 700, fontSize: '13px', color: '#FFFFFF' }}>{item.label}</td>
                <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 700, color: '#31B700', fontFamily: 'monospace' }}>{fmtEur(item.netN)}</td>
                <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 700, color: '#B1DCE2', fontFamily: 'monospace' }}>{fmtEur(item.netN1)}</td>
              </tr>
            );

            if (item.type === 'total') return (
              <tr key={i} style={{ background: '#E8F5E0', borderTop: '1px solid #C6E38A' }}>
                <td style={{ padding: '7px 10px', fontWeight: 700, fontSize: '12px', color: '#1A202C' }}>{item.label}</td>
                <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 700, fontFamily: 'monospace', color: '#268E00' }}>{fmtEur(item.netN)}</td>
                <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 700, fontFamily: 'monospace', color: '#4A5568' }}>{fmtEur(item.netN1)}</td>
              </tr>
            );

            if (item.type === 'subline') return (
              <tr key={i} style={{ borderBottom: '1px solid #F0F4F8', background: '#FAFAFA' }}>
                <td style={{ padding: '4px 10px 4px 28px', fontSize: '12px', color: '#718096', fontStyle: 'italic' }}>
                  <span style={{ fontSize: '10px', color: '#CBD5E0', marginRight: '8px', fontFamily: 'monospace' }}>{item.code}</span>
                  {item.label}
                </td>
                <td style={{ padding: '4px 10px', textAlign: 'right', fontSize: '12px', color: '#718096', fontFamily: 'monospace' }}>{fmtEur(item.amount)}</td>
                <td style={{ padding: '4px 10px', textAlign: 'right', fontSize: '12px', color: '#A0AEC0', fontFamily: 'monospace' }}>{fmtEur(item.amountN1)}</td>
              </tr>
            );

            // Ligne de données
            return (
              <tr key={i} style={{ borderBottom: '1px solid #F0F4F8' }}
                onMouseEnter={e => e.currentTarget.style.background = '#F8FAFB'}
                onMouseLeave={e => e.currentTarget.style.background = ''}
              >
                <td style={{ padding: '5px 10px', color: '#1A202C' }}>
                  <span style={{ fontSize: '10px', color: '#CBD5E0', marginRight: '8px', fontFamily: 'monospace' }}>{item.code}</span>
                  {item.label}
                  {item.subLabel && item.subAmount !== null && (
                    <span style={{ fontSize: '11px', color: '#A0AEC0', marginLeft: '10px' }}>
                      {item.subLabel} {fmtEur(item.subAmount)}
                    </span>
                  )}
                </td>
                <td style={{ padding: '5px 10px', textAlign: 'right', color: '#1A202C', fontWeight: 500, fontFamily: 'monospace' }}>{fmtEur(item.netN)}</td>
                <td style={{ padding: '5px 10px', textAlign: 'right', color: '#718096', fontFamily: 'monospace' }}>{fmtEur(item.netN1)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default PassifView;
