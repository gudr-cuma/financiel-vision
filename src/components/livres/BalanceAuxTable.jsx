import { formatAmountFull } from '../../engine/formatUtils';

function fmt(n) {
  if (!n) return '';
  return formatAmountFull(n);
}

function AmtCell({ value, color }) {
  return (
    <td style={{ textAlign: 'right', padding: '5px 10px', fontVariantNumeric: 'tabular-nums', color: color ?? '#2D3748' }}>
      {fmt(value)}
    </td>
  );
}

export function BalanceAuxTable({ rows, onSelectTiers }) {
  if (!rows || rows.length === 0) {
    return <div style={{ padding: '48px', textAlign: 'center', color: '#A0AEC0' }}>Aucune donnée</div>;
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '860px', fontSize: '13px' }}>
        <thead>
          <tr style={{ background: '#F7FAFC', borderBottom: '2px solid #E2E8F0' }}>
            <th style={{ textAlign: 'left',  padding: '8px 10px', fontWeight: 600, color: '#4A5568', width: '110px' }}>Compte aux.</th>
            <th style={{ textAlign: 'left',  padding: '8px 10px', fontWeight: 600, color: '#4A5568' }}>Tiers</th>
            <th style={{ textAlign: 'right', padding: '8px 10px', fontWeight: 600, color: '#4A5568', width: '120px' }}>Report Débit</th>
            <th style={{ textAlign: 'right', padding: '8px 10px', fontWeight: 600, color: '#4A5568', width: '120px' }}>Report Crédit</th>
            <th style={{ textAlign: 'right', padding: '8px 10px', fontWeight: 600, color: '#4A5568', width: '120px' }}>Mvt Débit</th>
            <th style={{ textAlign: 'right', padding: '8px 10px', fontWeight: 600, color: '#4A5568', width: '120px' }}>Mvt Crédit</th>
            <th style={{ textAlign: 'right', padding: '8px 10px', fontWeight: 600, color: '#4A5568', width: '120px' }}>Solde Débit</th>
            <th style={{ textAlign: 'right', padding: '8px 10px', fontWeight: 600, color: '#4A5568', width: '120px' }}>Solde Crédit</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const isTotal = row.rowType === 'collectifTotal';
            const isClickable = !isTotal && onSelectTiers;
            const rowBg = isTotal ? '#E3F2F5' : idx % 2 === 0 ? '#FFFFFF' : '#F9FAFB';
            return (
              <tr
                key={idx}
                onClick={isClickable ? () => onSelectTiers(row) : undefined}
                style={{
                  background: rowBg,
                  borderBottom: isTotal ? '2px solid #B1DCE2' : '1px solid #F0F4F8',
                  fontWeight: isTotal ? 700 : 'normal',
                  cursor: isClickable ? 'pointer' : 'default',
                }}
                onMouseEnter={isClickable ? e => { e.currentTarget.style.background = '#EBF8FF'; } : undefined}
                onMouseLeave={isClickable ? e => { e.currentTarget.style.background = rowBg; } : undefined}
              >
                <td style={{ padding: '5px 10px', fontFamily: 'monospace', color: isClickable ? '#FF8200' : '#2D3748', textDecoration: isClickable ? 'underline dotted' : 'none' }}>
                  {row.compAuxNum}
                </td>
                <td style={{ padding: '5px 10px', color: '#2D3748' }}>
                  {isTotal ? (
                    <span>
                      <span style={{ color: '#718096', fontSize: '11px', marginRight: '6px' }}>{row.collectif}</span>
                      {row.compAuxLib}
                    </span>
                  ) : (
                    <span>
                      <span style={{ color: '#A0AEC0', fontSize: '11px', marginRight: '6px' }}>{row.collectif}</span>
                      {row.compAuxLib}
                    </span>
                  )}
                </td>
                <AmtCell value={row.report_debit}  />
                <AmtCell value={row.report_credit} />
                <AmtCell value={row.mvt_debit}     />
                <AmtCell value={row.mvt_credit}    />
                <AmtCell value={row.solde_debit}   color="#268E00" />
                <AmtCell value={row.solde_credit}  color="#E53935" />
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default BalanceAuxTable;
