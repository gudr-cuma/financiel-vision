import { useMemo } from 'react';
import { List as FixedSizeList } from 'react-window';
import { formatAmountFull, formatDate } from '../../engine/formatUtils';
import { normalizeText } from './EntryFilter';

const VIRTUALIZATION_THRESHOLD = 500;
const ROW_HEIGHT = 48;

const COL_WIDTHS = {
  date: '80px',
  libelle: 'auto',
  debit: '80px',
  credit: '80px',
  solde: '90px',
};

const headerCellStyle = {
  padding: '8px 10px',
  fontSize: '11px',
  fontWeight: 600,
  color: '#718096',
  textTransform: 'uppercase',
  letterSpacing: '0.4px',
  backgroundColor: '#F7FAFC',
  borderBottom: '2px solid #E2E8F0',
  whiteSpace: 'nowrap',
};

function formatMoney(val) {
  if (val === 0 || val === null || val === undefined) return '—';
  return formatAmountFull(val);
}

function EntryRow({ entry, style }) {
  const isNegativeSolde = entry.soldeCumule < 0;

  return (
    <div
      role="row"
      style={{
        ...style,
        display: 'flex',
        alignItems: 'center',
        borderBottom: '1px solid #F0F4F8',
        backgroundColor: 'transparent',
        fontSize: '13px',
        color: '#1A202C',
      }}
    >
      <div
        role="cell"
        style={{ width: COL_WIDTHS.date, padding: '0 10px', flexShrink: 0, color: '#718096' }}
      >
        {formatDate(entry.ecritureDate)}
      </div>
      <div
        role="cell"
        style={{
          flex: 1,
          padding: '0 10px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={entry.ecritureLib}
      >
        {entry.ecritureLib || '—'}
      </div>
      <div
        role="cell"
        style={{
          width: COL_WIDTHS.debit,
          padding: '0 10px',
          textAlign: 'right',
          flexShrink: 0,
          color: entry.debit > 0 ? '#1A202C' : '#A0AEC0',
        }}
      >
        {formatMoney(entry.debit)}
      </div>
      <div
        role="cell"
        style={{
          width: COL_WIDTHS.credit,
          padding: '0 10px',
          textAlign: 'right',
          flexShrink: 0,
          color: entry.credit > 0 ? '#1A202C' : '#A0AEC0',
        }}
      >
        {formatMoney(entry.credit)}
      </div>
      <div
        role="cell"
        style={{
          width: COL_WIDTHS.solde,
          padding: '0 10px',
          textAlign: 'right',
          flexShrink: 0,
          fontWeight: 500,
          color: isNegativeSolde ? '#E53935' : '#268E00',
        }}
      >
        {formatAmountFull(entry.soldeCumule)}
      </div>
    </div>
  );
}

/**
 * EntryTable — tableau des écritures avec solde running.
 *
 * Props :
 *   entries    (EntryWithRunning[]) — écritures à afficher
 *   filterText (string)             — texte de filtre
 */
export function EntryTable({ entries, filterText }) {
  const filtered = useMemo(() => {
    if (!entries) return [];
    if (!filterText || filterText.trim() === '') return entries;
    const norm = normalizeText(filterText);
    return entries.filter((e) => {
      return (
        normalizeText(e.ecritureLib ?? '').includes(norm) ||
        normalizeText(e.pieceRef ?? '').includes(norm)
      );
    });
  }, [entries, filterText]);

  const tableHeader = (
    <div
      role="row"
      style={{
        display: 'flex',
        alignItems: 'center',
        borderBottom: '2px solid #E2E8F0',
        backgroundColor: '#F7FAFC',
      }}
    >
      <div role="columnheader" style={{ ...headerCellStyle, width: COL_WIDTHS.date, flexShrink: 0 }}>
        Date
      </div>
      <div role="columnheader" style={{ ...headerCellStyle, flex: 1 }}>
        Libellé
      </div>
      <div role="columnheader" style={{ ...headerCellStyle, width: COL_WIDTHS.debit, textAlign: 'right', flexShrink: 0 }}>
        Débit
      </div>
      <div role="columnheader" style={{ ...headerCellStyle, width: COL_WIDTHS.credit, textAlign: 'right', flexShrink: 0 }}>
        Crédit
      </div>
      <div role="columnheader" style={{ ...headerCellStyle, width: COL_WIDTHS.solde, textAlign: 'right', flexShrink: 0 }}>
        Solde
      </div>
    </div>
  );

  if (filtered.length === 0) {
    return (
      <div
        role="table"
        aria-label="Écritures du compte"
        style={{ border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}
      >
        {tableHeader}
        <div
          style={{
            padding: '20px',
            textAlign: 'center',
            fontSize: '13px',
            color: '#A0AEC0',
          }}
        >
          Aucune écriture correspondante.
        </div>
      </div>
    );
  }

  const useVirtualization = filtered.length > VIRTUALIZATION_THRESHOLD;

  return (
    <div
      role="table"
      aria-label="Écritures du compte"
      aria-rowcount={filtered.length}
      style={{ border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}
    >
      {tableHeader}

      {useVirtualization ? (
        <FixedSizeList
          height={Math.min(ROW_HEIGHT * 10, ROW_HEIGHT * filtered.length)}
          itemCount={filtered.length}
          itemSize={ROW_HEIGHT}
          width="100%"
        >
          {({ index, style }) => (
            <EntryRow key={index} entry={filtered[index]} style={style} />
          )}
        </FixedSizeList>
      ) : (
        <div role="rowgroup">
          {filtered.map((entry, index) => (
            <EntryRow
              key={`${entry.ecritureDate?.getTime?.() ?? index}-${index}`}
              entry={entry}
              style={{ height: ROW_HEIGHT }}
            />
          ))}
        </div>
      )}

      <div
        style={{
          padding: '6px 10px',
          fontSize: '11px',
          color: '#A0AEC0',
          backgroundColor: '#FAFAFA',
          borderTop: '1px solid #E2E8F0',
          textAlign: 'right',
        }}
      >
        {filtered.length} écriture{filtered.length > 1 ? 's' : ''}
      </div>
    </div>
  );
}

export default EntryTable;
