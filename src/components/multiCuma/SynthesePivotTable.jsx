// src/components/multiCuma/SynthesePivotTable.jsx
import { formatCell } from '../../domain/multiCuma/columns';

const HEAD_BG = '#4F81BD';   // bleu en-tête (réf. screenshot)
const HEAD_FG = '#FFFFFF';
const TOTAL_BG = '#EAF1FB';

/**
 * Rendu générique d'un tableau croisé par tranche.
 * @param {{ title: string, metrics: object[], data: { trancheRows: object[], totalRow: object } }} props
 */
export function SynthesePivotTable({ title, metrics, data }) {
  const { trancheRows, totalRow } = data;
  const cell = { padding: '7px 10px', fontSize: '12px', textAlign: 'right', borderBottom: '1px solid #E2E8F0', whiteSpace: 'nowrap' };
  const headCell = { ...cell, background: HEAD_BG, color: HEAD_FG, fontWeight: 700, textAlign: 'right', borderBottom: 'none' };

  const renderRow = (row, isTotal) => (
    <tr key={row.categorie} style={isTotal ? { background: TOTAL_BG, fontWeight: 700 } : undefined}>
      <td style={{ ...cell, textAlign: 'left', fontWeight: isTotal ? 700 : 600 }}>{row.categorie}</td>
      {metrics.map((m, i) => (
        <td key={m.label} style={cell}>{formatCell(row.cells[i], m.format)}</td>
      ))}
    </tr>
  );

  return (
    <div style={{ marginBottom: '28px', overflowX: 'auto' }}>
      {title && <div style={{ fontSize: '14px', fontWeight: 700, color: '#1A202C', marginBottom: '8px' }}>{title}</div>}
      <table style={{ borderCollapse: 'collapse', minWidth: '100%' }}>
        <thead>
          <tr>
            <th style={{ ...headCell, textAlign: 'left' }}>Tranches</th>
            {metrics.map((m) => <th key={m.label} style={headCell}>{m.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {trancheRows.map((r) => renderRow(r, false))}
          {renderRow(totalRow, true)}
        </tbody>
      </table>
    </div>
  );
}

export default SynthesePivotTable;
