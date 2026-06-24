import { useState } from 'react';
import { SortableTh } from '../shared/SortableTh';
import { formatAmountFull } from '../../engine/formatUtils';
import { sumColumn } from '../../engine/tableUtils';

const CAPITAL_SOCIAL_COLUMNS = [
  { key: 'adherent', label: 'Adhérent', type: 'text' },
  { key: 'baseSouscription', label: 'Base Souscription', type: 'text' },
  { key: 'qtPrevue', label: 'Qt. Prévue', type: 'number' },
  { key: 'qtAppelee', label: 'Qt. Appelée', type: 'number' },
  { key: 'qtLiberee', label: 'Qt. Libérée', type: 'number' },
  { key: 'qtAnnulee', label: 'Qt. Annulée', type: 'number' },
  { key: 'qtRemboursee', label: 'Qt. Remboursée', type: 'number' },
  { key: 'qtTransferee', label: 'Qt. Transférée', type: 'number' },
  { key: 'qtSolde', label: 'Qt. Solde', type: 'number' },
  { key: 'montant', label: 'Montant', type: 'amount' },
];

function formatCell(value, type) {
  if (value === null || value === undefined || value === '') return '—';
  if (type === 'amount') return formatAmountFull(value);
  return String(value);
}

function GroupSection({ group, showHeader }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <>
      {showHeader && (
        <tr style={{ background: '#F0F9FF' }}>
          <td
            colSpan={CAPITAL_SOCIAL_COLUMNS.length}
            onClick={() => setExpanded((v) => !v)}
            style={{ padding: '8px 10px', fontWeight: 700, color: '#1A202C', cursor: 'pointer' }}
          >
            <span style={{ display: 'inline-block', transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)', marginRight: '8px', transition: 'transform 150ms' }}>▼</span>
            {group.label} ({group.rows.length}) — Montant : {formatAmountFull(group.subtotal.montant)} — Qt. Solde : {group.subtotal.qtSolde}
          </td>
        </tr>
      )}
      {expanded && group.rows.map((row, idx) => (
        <tr key={idx} style={{ background: idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA', borderBottom: '1px solid #F0F4F8' }}>
          {CAPITAL_SOCIAL_COLUMNS.map((col) => (
            <td
              key={col.key}
              style={{
                padding: '6px 10px',
                textAlign: col.type === 'text' ? 'left' : 'right',
                whiteSpace: 'nowrap',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {formatCell(row[col.key], col.type)}
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function CapitalSocialRegistreTable({ groups, showGroupHeaders, sort, onSort }) {
  const totalRows = groups.reduce((sum, g) => sum + g.rows.length, 0);
  if (totalRows === 0) {
    return <div style={{ padding: '48px', textAlign: 'center', color: '#A0AEC0' }}>Aucune ligne ne correspond aux filtres.</div>;
  }

  const allRows = groups.flatMap((g) => g.rows);

  return (
    <div style={{ overflowX: 'auto', border: '1px solid #E2E8F0', borderRadius: '12px' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px', fontSize: '13px' }}>
        <thead>
          <tr>
            {CAPITAL_SOCIAL_COLUMNS.map((col) => (
              <SortableTh
                key={col.key}
                label={col.label}
                sortKey={col.key}
                currentSort={sort}
                onSort={onSort}
                align={col.type === 'text' ? 'left' : 'right'}
              />
            ))}
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => (
            <GroupSection key={group.key} group={group} showHeader={showGroupHeaders} />
          ))}
        </tbody>
        <tfoot>
          <tr style={{ background: '#F0F9FF', borderTop: '2px solid #E2E8F0' }}>
            {CAPITAL_SOCIAL_COLUMNS.map((col, idx) => (
              <td
                key={col.key}
                style={{
                  padding: '8px 10px',
                  textAlign: col.type === 'text' ? 'left' : 'right',
                  fontWeight: 700,
                  color: '#1A202C',
                  whiteSpace: 'nowrap',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {idx === 0 ? 'Total' : col.type === 'amount' || col.type === 'number'
                  ? formatCell(sumColumn(allRows, col.key), col.type)
                  : ''}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export default CapitalSocialRegistreTable;
