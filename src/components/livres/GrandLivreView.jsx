import { useMemo, useRef } from 'react';
import { List } from 'react-window';
import { formatDate, formatAmountFull } from '../../engine/formatUtils';

// ─────────────────────────────────────────────────────────────
// Hauteurs par type de row
// ─────────────────────────────────────────────────────────────
const ROW_HEIGHTS = {
  header:  40,
  report:  36,
  entry:   38,
  total:   40,
  spacer:  8,
};

// ─────────────────────────────────────────────────────────────
// Aplatissement en rows
// ─────────────────────────────────────────────────────────────
function buildFlatRows(glData) {
  const rows = [];
  for (const compte of glData) {
    rows.push({ type: 'header', compte });
    if (compte.reportNet !== 0) {
      rows.push({ type: 'report', compte });
    }
    for (const ligne of compte.lignes) {
      rows.push({ type: 'entry', compte, ligne });
    }
    rows.push({ type: 'total', compte });
    rows.push({ type: 'spacer' });
  }
  return rows;
}

// ─────────────────────────────────────────────────────────────
// Cellule montant
// ─────────────────────────────────────────────────────────────
function fmt(n) {
  if (!n) return '';
  return formatAmountFull(n);
}

// ─────────────────────────────────────────────────────────────
// Rendu d'une row (rowComponent v2 API)
// ─────────────────────────────────────────────────────────────
function GlRow({ index, style, rows }) {
  const row = rows[index];

  if (row.type === 'spacer') {
    return <div style={{ ...style, height: ROW_HEIGHTS.spacer }} />;
  }

  if (row.type === 'header') {
    return (
      <div style={{
        ...style,
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        background: '#B1DCE2',
        borderBottom: '1px solid #82C5CF',
        fontWeight: 700,
        fontSize: '13px',
        color: '#1A202C',
        gap: '12px',
      }}>
        <span style={{ fontFamily: 'monospace', minWidth: '90px' }}>{row.compte.compteNum}</span>
        <span>{row.compte.compteLib}</span>
      </div>
    );
  }

  if (row.type === 'report') {
    const net = row.compte.reportNet;
    return (
      <div style={{
        ...style,
        display: 'grid',
        gridTemplateColumns: 'minmax(0,1fr) 80px 100px 100px 100px 100px 110px',
        alignItems: 'center',
        padding: '0 12px',
        background: '#F7FAFC',
        borderBottom: '1px solid #E2E8F0',
        fontSize: '12px',
        color: '#718096',
        fontStyle: 'italic',
      }}>
        <span style={{ paddingLeft: '90px' }}>Report à nouveau</span>
        <span />
        <span />
        <span />
        <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{net > 0 ? fmt(net) : ''}</span>
        <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{net < 0 ? fmt(-net) : ''}</span>
        <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: net >= 0 ? '#268E00' : '#E53935' }}>
          {fmt(Math.abs(net))} {net >= 0 ? 'Db' : 'Cr'}
        </span>
      </div>
    );
  }

  if (row.type === 'entry') {
    const l = row.ligne;
    const solde = l.soldeCumule ?? 0;
    return (
      <div style={{
        ...style,
        display: 'grid',
        gridTemplateColumns: 'minmax(0,1fr) 80px 100px 100px 100px 100px 110px',
        alignItems: 'center',
        padding: '0 12px',
        background: '#FFFFFF',
        borderBottom: '1px solid #F0F4F8',
        fontSize: '12px',
        color: '#2D3748',
      }}>
        {/* Libellé + méta */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', minWidth: 0 }}>
          <span style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {l.ecritureLib}
          </span>
          <span style={{ fontSize: '11px', color: '#A0AEC0', display: 'flex', gap: '8px' }}>
            <span style={{ fontFamily: 'monospace' }}>{l.journalCode}</span>
            <span>{l.ecritureNum?.trim()}</span>
            <span>{formatDate(l.ecritureDate)}</span>
            {l.pieceRef && <span>{l.pieceRef}</span>}
            {l.contrepartie && <span style={{ color: '#B1DCE2' }}>↔ {l.contrepartie}</span>}
            {l.ecritureLet && <span style={{ color: '#FF8200' }}>[{l.ecritureLet}]</span>}
          </span>
        </div>
        {/* Pièce */}
        <span style={{ fontSize: '11px', color: '#718096', textAlign: 'center' }}>{l.pieceRef}</span>
        {/* Contrepartie */}
        <span style={{ fontSize: '11px', color: '#718096', textAlign: 'center', fontFamily: 'monospace' }}>{l.contrepartie}</span>
        {/* Débit */}
        <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#268E00' }}>{fmt(l.debit)}</span>
        {/* Crédit */}
        <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#E53935' }}>{fmt(l.credit)}</span>
        {/* Solde cumulé */}
        <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: solde >= 0 ? '#268E00' : '#E53935' }}>
          {fmt(Math.abs(solde))} {solde >= 0 ? 'Db' : 'Cr'}
        </span>
      </div>
    );
  }

  if (row.type === 'total') {
    const tot = row.compte.totalGeneral;
    const solde = tot.solde;
    return (
      <div style={{
        ...style,
        display: 'grid',
        gridTemplateColumns: 'minmax(0,1fr) 80px 100px 100px 100px 100px 110px',
        alignItems: 'center',
        padding: '0 12px',
        background: '#E8F5E0',
        borderBottom: '2px solid #C6E6B4',
        fontSize: '12px',
        fontWeight: 700,
        color: '#1A202C',
      }}>
        <span>Total {row.compte.compteNum}</span>
        <span />
        <span />
        <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(tot.debit)}</span>
        <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(tot.credit)}</span>
        <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: solde >= 0 ? '#268E00' : '#E53935' }}>
          {fmt(Math.abs(solde))} {solde >= 0 ? 'Db' : 'Cr'}
        </span>
      </div>
    );
  }

  return null;
}

// ─────────────────────────────────────────────────────────────
// Composant principal
// ─────────────────────────────────────────────────────────────
export function GrandLivreView({ glData }) {
  const listRef = useRef(null);

  const flatRows = useMemo(() => buildFlatRows(glData ?? []), [glData]);

  const rowHeight = (index) => ROW_HEIGHTS[flatRows[index]?.type] ?? ROW_HEIGHTS.entry;

  if (!glData || glData.length === 0) {
    return <div style={{ padding: '48px', textAlign: 'center', color: '#A0AEC0' }}>Aucune donnée</div>;
  }

  const totalRows = glData.reduce((s, c) => s + c.lignes.length, 0);
  const totalComptes = glData.length;
  const listHeight = Math.min(600, flatRows.length * 38);

  return (
    <div>
      {/* Résumé */}
      <div style={{ display: 'flex', gap: '16px', padding: '12px 0', fontSize: '12px', color: '#718096' }}>
        <span>{totalComptes} compte{totalComptes > 1 ? 's' : ''}</span>
        <span>·</span>
        <span>{totalRows.toLocaleString('fr-FR')} écriture{totalRows > 1 ? 's' : ''}</span>
      </div>

      {/* Header colonnes */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0,1fr) 80px 100px 100px 100px 100px 110px',
        padding: '6px 12px',
        background: '#F7FAFC',
        borderBottom: '2px solid #E2E8F0',
        fontSize: '11px',
        fontWeight: 600,
        color: '#4A5568',
        position: 'sticky',
        top: 0,
        zIndex: 1,
      }}>
        <span>Libellé / Journal / N° écriture / Date</span>
        <span style={{ textAlign: 'center' }}>Pièce</span>
        <span style={{ textAlign: 'center' }}>Contrepartie</span>
        <span style={{ textAlign: 'right' }}>Débit</span>
        <span style={{ textAlign: 'right' }}>Crédit</span>
        <span style={{ textAlign: 'right' }}>Solde cumulé</span>
      </div>

      {/* Liste virtualisée — react-window v2 API */}
      <List
        listRef={listRef}
        rowComponent={GlRow}
        rowCount={flatRows.length}
        rowHeight={rowHeight}
        rowProps={{ rows: flatRows }}
        style={{ height: listHeight }}
        overscanCount={10}
      />
    </div>
  );
}

export default GrandLivreView;
