import { useMemo } from 'react';
import { formatAmountFull, formatPercent } from '../../engine/formatUtils';

const COL_HEADER = {
  fontSize: '11px',
  fontWeight: 700,
  color: '#718096',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  padding: '8px 12px',
  textAlign: 'right',
  whiteSpace: 'nowrap',
};

const COL_HEADER_LEFT = {
  ...COL_HEADER,
  textAlign: 'left',
};

const CELL = {
  fontSize: '13px',
  padding: '8px 12px',
  textAlign: 'right',
  whiteSpace: 'nowrap',
  borderBottom: '1px solid #F0F4F8',
};

const CELL_LEFT = {
  ...CELL,
  textAlign: 'left',
  color: '#1A202C',
  fontWeight: 500,
};

function amountColor(value) {
  return value < 0 ? '#E53935' : '#1A202C';
}

function MonthlyDataTable({ monthly, caTotal }) {
  const totals = useMemo(() => {
    const t = monthly.reduce(
      (acc, m) => ({
        margeBrute: acc.margeBrute + m.margeBrute,
        ebe: acc.ebe + m.ebe,
        rex: acc.rex + m.rex,
        resultatNet: acc.resultatNet + m.resultatNet,
      }),
      { margeBrute: 0, ebe: 0, rex: 0, resultatNet: 0 }
    );
    const ca = caTotal || 0;
    return {
      ...t,
      ca,
      percentMarge: ca !== 0 ? (t.margeBrute / ca) * 100 : 0,
      percentEbe: ca !== 0 ? (t.ebe / ca) * 100 : 0,
      percentRex: ca !== 0 ? (t.rex / ca) * 100 : 0,
    };
  }, [monthly, caTotal]);

  return (
    <div style={{ overflowX: 'auto' }}>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '13px',
          minWidth: '760px',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '8px',
          overflow: 'hidden',
        }}
      >
        <thead>
          <tr
            style={{
              backgroundColor: '#F7FAFC',
              borderBottom: '2px solid #E2E8F0',
            }}
          >
            <th style={COL_HEADER_LEFT}>Mois</th>
            <th style={COL_HEADER}>CA</th>
            <th style={COL_HEADER}>Marge brute</th>
            <th style={COL_HEADER}>% Marge</th>
            <th style={COL_HEADER}>EBE</th>
            <th style={COL_HEADER}>% EBE/CA</th>
            <th style={COL_HEADER}>REX</th>
            <th style={COL_HEADER}>% REX/CA</th>
            <th style={COL_HEADER}>Rés. Net</th>
          </tr>
        </thead>
        <tbody>
          {monthly.map((m) => (
            <tr
              key={`${m.year}-${m.month}`}
              style={{ transition: 'background-color 100ms' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#F8FAFB';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <td style={CELL_LEFT}>{m.label}</td>
              <td style={{ ...CELL, color: amountColor(m.ca) }}>
                {formatAmountFull(m.ca)}
              </td>
              <td style={{ ...CELL, color: amountColor(m.margeBrute) }}>
                {formatAmountFull(m.margeBrute)}
              </td>
              <td style={{ ...CELL, color: m.percentMarge < 0 ? '#E53935' : '#718096' }}>
                {formatPercent(m.percentMarge)}
              </td>
              <td style={{ ...CELL, color: amountColor(m.ebe) }}>
                {formatAmountFull(m.ebe)}
              </td>
              <td style={{ ...CELL, color: m.percentEbeCa < 0 ? '#E53935' : '#718096' }}>
                {formatPercent(m.percentEbeCa)}
              </td>
              <td style={{ ...CELL, color: amountColor(m.rex) }}>
                {formatAmountFull(m.rex)}
              </td>
              <td style={{ ...CELL, color: m.percentRexCa < 0 ? '#E53935' : '#718096' }}>
                {formatPercent(m.percentRexCa)}
              </td>
              <td style={{ ...CELL, color: amountColor(m.resultatNet) }}>
                {formatAmountFull(m.resultatNet)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr
            style={{
              backgroundColor: '#F7FAFC',
              borderTop: '2px solid #E2E8F0',
              fontWeight: 700,
            }}
          >
            <td
              style={{
                ...CELL_LEFT,
                borderBottom: 'none',
                fontWeight: 700,
                color: '#1A202C',
              }}
            >
              Total exercice
            </td>
            <td
              style={{
                ...CELL,
                borderBottom: 'none',
                fontWeight: 700,
                color: amountColor(totals.ca),
              }}
            >
              {formatAmountFull(totals.ca)}
            </td>
            <td
              style={{
                ...CELL,
                borderBottom: 'none',
                fontWeight: 700,
                color: amountColor(totals.margeBrute),
              }}
            >
              {formatAmountFull(totals.margeBrute)}
            </td>
            <td
              style={{
                ...CELL,
                borderBottom: 'none',
                fontWeight: 700,
                color: totals.percentMarge < 0 ? '#E53935' : '#718096',
              }}
            >
              {formatPercent(totals.percentMarge)}
            </td>
            <td
              style={{
                ...CELL,
                borderBottom: 'none',
                fontWeight: 700,
                color: amountColor(totals.ebe),
              }}
            >
              {formatAmountFull(totals.ebe)}
            </td>
            <td
              style={{
                ...CELL,
                borderBottom: 'none',
                fontWeight: 700,
                color: totals.percentEbe < 0 ? '#E53935' : '#718096',
              }}
            >
              {formatPercent(totals.percentEbe)}
            </td>
            <td
              style={{
                ...CELL,
                borderBottom: 'none',
                fontWeight: 700,
                color: amountColor(totals.rex),
              }}
            >
              {formatAmountFull(totals.rex)}
            </td>
            <td
              style={{
                ...CELL,
                borderBottom: 'none',
                fontWeight: 700,
                color: totals.percentRex < 0 ? '#E53935' : '#718096',
              }}
            >
              {formatPercent(totals.percentRex)}
            </td>
            <td
              style={{
                ...CELL,
                borderBottom: 'none',
                fontWeight: 700,
                color: amountColor(totals.resultatNet),
              }}
            >
              {formatAmountFull(totals.resultatNet)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export default MonthlyDataTable;
