import { formatAmountFull } from '../../engine/formatUtils';

// Couleurs par type de ligne
const ROW_STYLES = {
  compte:        { background: '#FFFFFF',   fontWeight: 'normal', fontSize: '13px', color: '#2D3748' },
  groupe:        { background: '#F7FAFC',   fontWeight: 600,      fontSize: '13px', color: '#1A202C' },
  classe:        { background: '#E3F2F5',   fontWeight: 700,      fontSize: '13px', color: '#1A202C' },
  bilanTotal:    { background: '#E8F5E0',   fontWeight: 700,      fontSize: '13px', color: '#1A202C' },
  gestionTotal:  { background: '#FFF3E0',   fontWeight: 700,      fontSize: '13px', color: '#1A202C' },
  grandTotal:    { background: '#1A202C',   fontWeight: 700,      fontSize: '13px', color: '#FFFFFF' },
};

function fmt(n) {
  if (n === undefined || n === null || n === 0) return '';
  return formatAmountFull(n);
}

function AmtCell({ value, style = {} }) {
  if (!value) return <td style={{ textAlign: 'right', padding: '5px 10px', ...style }} />;
  return (
    <td style={{ textAlign: 'right', padding: '5px 10px', fontVariantNumeric: 'tabular-nums', ...style }}>
      {fmt(value)}
    </td>
  );
}

export function BalanceTable({ rows, onSelectCompte }) {
  if (!rows || rows.length === 0) {
    return <div style={{ padding: '48px', textAlign: 'center', color: '#A0AEC0' }}>Aucune donnée</div>;
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '860px', fontSize: '13px' }}>
        <thead>
          <tr style={{ background: '#F7FAFC', borderBottom: '2px solid #E2E8F0' }}>
            <th style={{ textAlign: 'left',  padding: '8px 10px', fontWeight: 600, color: '#4A5568', whiteSpace: 'nowrap', width: '110px' }}>Compte</th>
            <th style={{ textAlign: 'left',  padding: '8px 10px', fontWeight: 600, color: '#4A5568' }}>Intitulé</th>
            <th style={{ textAlign: 'right', padding: '8px 10px', fontWeight: 600, color: '#4A5568', whiteSpace: 'nowrap', width: '120px' }}>Report Débit</th>
            <th style={{ textAlign: 'right', padding: '8px 10px', fontWeight: 600, color: '#4A5568', whiteSpace: 'nowrap', width: '120px' }}>Report Crédit</th>
            <th style={{ textAlign: 'right', padding: '8px 10px', fontWeight: 600, color: '#4A5568', whiteSpace: 'nowrap', width: '120px' }}>Mvt Débit</th>
            <th style={{ textAlign: 'right', padding: '8px 10px', fontWeight: 600, color: '#4A5568', whiteSpace: 'nowrap', width: '120px' }}>Mvt Crédit</th>
            <th style={{ textAlign: 'right', padding: '8px 10px', fontWeight: 600, color: '#4A5568', whiteSpace: 'nowrap', width: '120px' }}>Solde Débit</th>
            <th style={{ textAlign: 'right', padding: '8px 10px', fontWeight: 600, color: '#4A5568', whiteSpace: 'nowrap', width: '120px' }}>Solde Crédit</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const s = ROW_STYLES[row.rowType] ?? ROW_STYLES.compte;
            const isTotal = ['groupe','classe','bilanTotal','gestionTotal','grandTotal'].includes(row.rowType);
            const isClickable = row.rowType === 'compte' && onSelectCompte;
            return (
              <tr
                key={idx}
                onClick={isClickable ? () => onSelectCompte(row) : undefined}
                style={{
                  background: s.background,
                  borderBottom: isTotal ? '2px solid #E2E8F0' : '1px solid #F0F4F8',
                  cursor: isClickable ? 'pointer' : 'default',
                }}
                onMouseEnter={isClickable ? e => { e.currentTarget.style.background = '#EBF8FF'; } : undefined}
                onMouseLeave={isClickable ? e => { e.currentTarget.style.background = s.background; } : undefined}
              >
                <td style={{ padding: '5px 10px', fontWeight: s.fontWeight, color: isClickable ? '#FF8200' : s.color, fontFamily: 'monospace', fontSize: s.fontSize, textDecoration: isClickable ? 'underline dotted' : 'none' }}>
                  {row.compteNum}
                </td>
                <td style={{ padding: '5px 10px', fontWeight: s.fontWeight, color: s.color, fontSize: s.fontSize }}>
                  {row.compteLib}
                </td>
                <AmtCell value={row.report_debit}  style={{ fontWeight: s.fontWeight, color: s.color, fontSize: s.fontSize, background: s.background }} />
                <AmtCell value={row.report_credit} style={{ fontWeight: s.fontWeight, color: s.color, fontSize: s.fontSize, background: s.background }} />
                <AmtCell value={row.mvt_debit}     style={{ fontWeight: s.fontWeight, color: s.color, fontSize: s.fontSize, background: s.background }} />
                <AmtCell value={row.mvt_credit}    style={{ fontWeight: s.fontWeight, color: s.color, fontSize: s.fontSize, background: s.background }} />
                <AmtCell value={row.solde_debit}   style={{ fontWeight: s.fontWeight, color: row.rowType === 'grandTotal' ? '#FFFFFF' : '#268E00', fontSize: s.fontSize, background: s.background }} />
                <AmtCell value={row.solde_credit}  style={{ fontWeight: s.fontWeight, color: row.rowType === 'grandTotal' ? '#FFFFFF' : '#E53935', fontSize: s.fontSize, background: s.background }} />
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default BalanceTable;
