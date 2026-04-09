import { formatAmount } from '../../engine/formatUtils';

const TYPE_STYLES = {
  section:    { fontWeight: 700, fontSize: '13px', background: '#E3F2F5', color: '#1A202C', paddingLeft: '8px' },
  subsection: { fontWeight: 600, fontSize: '13px', background: '#F8FAFB', color: '#2D3748', paddingLeft: '20px' },
  line:       { fontWeight: 400, fontSize: '13px', color: '#4A5568', paddingLeft: '36px' },
  total:      { fontWeight: 700, fontSize: '13px', borderTop: '1px solid #E2E8F0', color: '#1A202C', paddingLeft: '8px' },
  grandtotal: { fontWeight: 800, fontSize: '14px', borderTop: '2px solid #1A202C', borderBottom: '2px solid #1A202C', color: '#1A202C', paddingLeft: '8px' },
  separator:  { height: '12px' },
};

function AmountCell({ amount }) {
  if (amount === null || amount === undefined) return <td style={{ width: '140px' }} />;
  const formatted = formatAmount(Math.abs(amount));
  const color = amount < 0 ? '#E53935' : '#1A202C';
  return (
    <td style={{ width: '140px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color, paddingRight: '12px' }}>
      {amount < 0 ? `(${formatted})` : formatted}
    </td>
  );
}

export function BilanParamView({ items, title }) {
  if (!items?.length) return null;

  return (
    <div style={{ marginBottom: '24px' }}>
      {title && (
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#1A202C', marginBottom: '8px' }}>{title}</h3>
      )}
      <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <tbody>
          {items.map((item) => {
            const style = TYPE_STYLES[item.type] ?? TYPE_STYLES.line;
            if (item.type === 'separator') {
              return <tr key={item.id}><td colSpan={2} style={style} /></tr>;
            }
            return (
              <tr key={item.id} style={{ borderBottom: '1px solid #F0F0F0' }}>
                <td style={{ padding: '6px 8px', ...style, paddingRight: undefined }}>
                  {item.label}
                </td>
                <AmountCell amount={item.amount} />
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default BilanParamView;
