import { SortableTh } from '../shared/SortableTh';
import { formatAmountDec, formatPercent, formatDate } from '../../engine/formatUtils';
import { decodePeriode } from '../../engine/empruntsUtils';

export const CRD_5_ANS_COLUMNS = [
  { key: 'nEmprunt', label: 'N. Emprunt', type: 'text', width: 90 },
  { key: 'ancienCode', label: 'Référence', type: 'text', width: 90 },
  { key: 'designation', label: 'Libellé', type: 'text' },
  { key: 'dateRealisation', label: 'Date Réalisation', type: 'date', width: 120 },
  { key: 'duree', label: 'Durée', type: 'number', width: 60 },
  { key: 'annuite', label: 'Période', type: 'periode', width: 90 },
  { key: 'taux', label: 'Taux', type: 'percent', width: 65 },
  { key: 'montant', label: 'Montant', type: 'amount' },
  { key: 'capitalRembourseCumule', label: 'Capital remboursé', type: 'amount' },
  { key: 'interetsReglesCumule', label: 'Intérêts réglés', type: 'amount' },
  { key: 'capitalRestantDu', label: 'Capital restant dû', type: 'amount' },
  { key: 'capitalMoins1An', label: '< 1 an', type: 'amount' },
  { key: 'capitalEntre1Et5Ans', label: '1 à 5 ans', type: 'amount' },
  { key: 'capitalPlusDe5Ans', label: '> 5 ans', type: 'amount' },
];

function formatCellValue(value, type) {
  if (type === 'periode') return decodePeriode(value);
  if (value === null || value === undefined || value === '') return '—';
  switch (type) {
    case 'amount': return formatAmountDec(value);
    case 'percent': return formatPercent(value);
    case 'date': return formatDate(value);
    default: return String(value);
  }
}

export function EmpruntsCrd5AnsTable({ rows, sort, onSort, onRowClick, selectedRow }) {
  if (!rows || rows.length === 0) {
    return <div style={{ padding: '48px', textAlign: 'center', color: '#A0AEC0' }}>Aucun emprunt ne correspond aux filtres.</div>;
  }

  return (
    <div style={{ overflowX: 'auto', border: '1px solid #E2E8F0', borderRadius: '12px' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1700px', fontSize: '13px' }}>
        <thead>
          <tr>
            {CRD_5_ANS_COLUMNS.map((col) => (
              <SortableTh
                key={col.key}
                label={col.label}
                sortKey={col.key}
                currentSort={sort}
                onSort={onSort}
                align={col.type === 'text' ? 'left' : 'right'}
                width={col.width}
              />
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const isSelected = selectedRow?.nEmprunt === row.nEmprunt;
            return (
              <tr
                key={row.nEmprunt ?? idx}
                onClick={() => onRowClick(row)}
                style={{
                  background: isSelected ? '#E3F2F5' : idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA',
                  cursor: 'pointer',
                  borderBottom: '1px solid #F0F4F8',
                }}
              >
                {CRD_5_ANS_COLUMNS.map((col) => (
                  <td
                    key={col.key}
                    style={{
                      padding: '6px 10px',
                      textAlign: col.type === 'text' ? 'left' : 'right',
                      color: '#2D3748',
                      whiteSpace: 'nowrap',
                      fontVariantNumeric: 'tabular-nums',
                      ...(col.width ? { width: col.width, boxSizing: 'border-box' } : {}),
                    }}
                  >
                    {formatCellValue(row[col.key], col.type)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default EmpruntsCrd5AnsTable;
