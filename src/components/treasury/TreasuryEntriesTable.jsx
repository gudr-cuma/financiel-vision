import { useMemo } from 'react';
import { List } from 'react-window';
import { formatAmountFull, formatDate } from '../../engine/formatUtils';

const VIRTUALIZATION_THRESHOLD = 500;
const ROW_HEIGHTS = { header: 36, entry: 38 };
const GRID_COLUMNS = '90px 76px minmax(120px,1fr) 90px 90px 100px 150px';
const ROW_MIN_WIDTH = 680;

function fmt(n) {
  if (!n) return '—';
  return formatAmountFull(n);
}

function buildRows(entries, groupByAccount) {
  if (!groupByAccount) {
    return entries
      .slice()
      .sort((a, b) => a.ecritureDate - b.ecritureDate)
      .map((entry) => ({ type: 'entry', entry }));
  }

  const byCompte = new Map();
  for (const entry of entries) {
    if (!byCompte.has(entry.compteNum)) byCompte.set(entry.compteNum, []);
    byCompte.get(entry.compteNum).push(entry);
  }

  const rows = [];
  for (const compteNum of Array.from(byCompte.keys()).sort()) {
    const list = byCompte.get(compteNum).sort((a, b) => a.ecritureDate - b.ecritureDate);
    rows.push({ type: 'header', compteNum, compteLib: list[0].compteLib });
    for (const entry of list) rows.push({ type: 'entry', entry });
  }
  return rows;
}

function Row({ index, style, rows }) {
  const row = rows[index];

  if (row.type === 'header') {
    return (
      <div
        style={{
          ...style,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '0 12px',
          background: '#B1DCE2',
          borderBottom: '1px solid #82C5CF',
          fontWeight: 700,
          fontSize: 13,
          color: '#1A202C',
        }}
      >
        <span style={{ fontFamily: 'monospace', minWidth: 90 }}>{row.compteNum}</span>
        <span>{row.compteLib}</span>
      </div>
    );
  }

  const { entry } = row;
  const isNegativeSolde = entry.soldeCumule < 0;

  return (
    <div
      style={{
        ...style,
        display: 'grid',
        gridTemplateColumns: GRID_COLUMNS,
        columnGap: 12,
        minWidth: ROW_MIN_WIDTH,
        alignItems: 'center',
        padding: '0 12px',
        borderBottom: '1px solid #F0F4F8',
        fontSize: 13,
        color: '#1A202C',
      }}
    >
      <span style={{ color: '#718096', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {entry.journalLib || entry.journalCode}
      </span>
      <span style={{ color: '#718096' }}>{formatDate(entry.ecritureDate)}</span>
      <span
        style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        title={entry.ecritureLib}
      >
        {entry.ecritureLib || '—'}
      </span>
      <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: entry.debit > 0 ? '#1A202C' : '#A0AEC0' }}>
        {fmt(entry.debit)}
      </span>
      <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: entry.credit > 0 ? '#1A202C' : '#A0AEC0' }}>
        {fmt(entry.credit)}
      </span>
      <span
        style={{
          textAlign: 'right',
          fontVariantNumeric: 'tabular-nums',
          fontWeight: 500,
          color: isNegativeSolde ? '#E53935' : '#268E00',
        }}
      >
        {formatAmountFull(entry.soldeCumule)}
      </span>
      <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#718096', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {entry.compteNum} {entry.compteLib}
      </span>
    </div>
  );
}

/**
 * Tableau des écritures de trésorerie sous-jacentes à la courbe (hors ANC),
 * avec option de regroupement par compte.
 *
 * Props :
 *   entries          (TreasuryEntry[]) — issues de getTreasuryEntries
 *   groupByAccount    (boolean)
 *   onToggleGroup     (boolean) => void
 */
export default function TreasuryEntriesTable({ entries, groupByAccount, onToggleGroup }) {
  const rows = useMemo(() => buildRows(entries ?? [], groupByAccount), [entries, groupByAccount]);
  const rowHeight = (index) => ROW_HEIGHTS[rows[index]?.type] ?? ROW_HEIGHTS.entry;
  const listHeight = Math.min(560, Math.max(rows.length, 1) * 38);

  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: 8,
        padding: 16,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 600, color: '#718096' }}>
          Écritures de trésorerie ({entries?.length ?? 0})
        </span>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#4A5568' }}>
          <input
            type="checkbox"
            checked={groupByAccount}
            onChange={(e) => onToggleGroup(e.target.checked)}
            style={{ width: 15, height: 15, cursor: 'pointer' }}
          />
          Regrouper par compte
        </label>
      </div>

      {rows.length === 0 ? (
        <div style={{ padding: 24, textAlign: 'center', fontSize: 13, color: '#A0AEC0' }}>
          Aucune écriture pour les comptes sélectionnés.
        </div>
      ) : (
        <div style={{ border: '1px solid #E2E8F0', borderRadius: 8, overflowX: 'auto', overflowY: 'hidden' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: GRID_COLUMNS,
              columnGap: 12,
              minWidth: ROW_MIN_WIDTH,
              padding: '6px 12px',
              background: '#F7FAFC',
              borderBottom: '2px solid #E2E8F0',
              fontSize: 11,
              fontWeight: 600,
              color: '#4A5568',
              textTransform: 'uppercase',
              letterSpacing: '0.4px',
              position: 'sticky',
              top: 0,
              zIndex: 1,
            }}
          >
            <span>Banque</span>
            <span>Date</span>
            <span>Libellé</span>
            <span style={{ textAlign: 'right' }}>Débit</span>
            <span style={{ textAlign: 'right' }}>Crédit</span>
            <span style={{ textAlign: 'right' }}>Solde</span>
            <span>Compte</span>
          </div>

          {rows.length > VIRTUALIZATION_THRESHOLD ? (
            <List
              rowComponent={Row}
              rowCount={rows.length}
              rowHeight={rowHeight}
              rowProps={{ rows }}
              style={{ height: listHeight }}
              overscanCount={10}
            />
          ) : (
            rows.map((_, index) => (
              <Row key={index} index={index} style={{ height: rowHeight(index) }} rows={rows} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
