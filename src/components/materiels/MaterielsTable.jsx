import { useState } from 'react';
import { SortableTh } from '../shared/SortableTh';
import { Tooltip } from '../shared/Tooltip';
import { formatAmountFull, formatDate } from '../../engine/formatUtils';

export const MATERIELS_COLUMNS = [
  { key: 'codeMateriel', label: 'Code Matériel', type: 'number', width: '10%' },
  { key: 'baseSref1', label: 'Base', type: 'text', width: '6%' },
  { key: 'libelle', label: 'Libellé', type: 'text', width: '30%' },
  { key: 'codeNational', label: 'Code National', type: 'text', width: '10%' },
  { key: 'marque', label: 'Marque', type: 'text', width: '7%' },
  { key: 'libMarque', label: 'Lib. Marque', type: 'text', width: '9%' },
  { key: 'dateAchat', label: 'Date Achat', type: 'date', width: '9%' },
  { key: 'mtAchat', label: 'Mt Achat', type: 'amount', width: '8%' },
  { key: 'codeAnalytique', label: 'Code Analytique', type: 'text', width: '11%' },
];

/**
 * Champs complets d'un matériel (au-delà des colonnes affichées dans le
 * tableau), utilisés pour la fiche détaillée dans MaterielDetailPanel.
 */
export const MATERIEL_FICHE_FIELDS = [
  ...MATERIELS_COLUMNS,
  { key: 'modele', label: 'Modèle', type: 'text' },
  { key: 'anneeOrigine', label: 'Année Origine', type: 'text' },
  { key: 'renouveau', label: 'Renouveau', type: 'text' },
  { key: 'materielRemplace', label: 'Matériel Remplacé', type: 'number' },
  { key: 'mtRepMateriel', label: 'Mt Rep. Matériel', type: 'amount' },
  { key: 'envOrigine', label: 'Env Origine', type: 'text' },
  { key: 'reserveCuma', label: 'Réserve CUMA', type: 'text' },
  { key: 'surtauxAmort', label: 'Surtaux Amort', type: 'text' },
  { key: 'amortAnterieur', label: 'Amort Antérieur', type: 'number' },
  { key: 'typeCredit', label: 'Type Crédit', type: 'text' },
  { key: 'dureeCredit', label: 'Durée Crédit', type: 'number' },
  { key: 'valRachat', label: 'Val. Rachat', type: 'amount' },
  { key: 'dateCde', label: 'Date Cde', type: 'date' },
  { key: 'qtAchatCuma', label: 'Qt Achat CUMA', type: 'number' },
];

function formatCell(value, type) {
  if (value === null || value === undefined || value === '') return '—';
  if (type === 'amount') return formatAmountFull(value);
  if (type === 'date') return formatDate(value);
  return String(value);
}

function GroupSection({ group, showHeader, onRowClick, selectedRow, duplicateKeys }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <>
      {showHeader && (
        <tr style={{ background: '#F0F9FF' }}>
          <td
            colSpan={MATERIELS_COLUMNS.length}
            onClick={() => setExpanded((v) => !v)}
            style={{ padding: '8px 10px', fontWeight: 700, color: '#1A202C', cursor: 'pointer' }}
          >
            <span style={{ display: 'inline-block', transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)', marginRight: '8px', transition: 'transform 150ms' }}>▼</span>
            {group.label} ({group.rows.length})
          </td>
        </tr>
      )}
      {expanded && group.rows.map((row, idx) => {
        const isSelected = selectedRow?.codeMateriel === row.codeMateriel;
        return (
          <tr
            key={`${row.codeMateriel ?? 'na'}-${idx}`}
            onClick={() => onRowClick?.(row)}
            style={{
              background: isSelected ? '#E3F2F5' : idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA',
              cursor: onRowClick ? 'pointer' : 'default',
              borderBottom: '1px solid #F0F4F8',
            }}
          >
            {MATERIELS_COLUMNS.map((col) => (
              <td
                key={col.key}
                style={{
                  padding: '6px 10px',
                  textAlign: col.type === 'text' ? 'left' : 'right',
                  whiteSpace: 'nowrap',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {col.key === 'codeMateriel' && duplicateKeys?.has(row.codeMateriel) ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                    <Tooltip content={`${duplicateKeys.get(row.codeMateriel)} lignes partagent ce code`}>
                      <span style={{ color: '#E53935', cursor: 'help', lineHeight: 1 }}>⚠️</span>
                    </Tooltip>
                    {formatCell(row[col.key], col.type)}
                  </span>
                ) : formatCell(row[col.key], col.type)}
              </td>
            ))}
          </tr>
        );
      })}
    </>
  );
}

export function MaterielsTable({ groups, showGroupHeaders, sort, onSort, onRowClick, selectedRow, duplicateKeys }) {
  const totalRows = groups.reduce((sum, g) => sum + g.rows.length, 0);
  if (totalRows === 0) {
    return <div style={{ padding: '48px', textAlign: 'center', color: '#A0AEC0' }}>Aucun matériel ne correspond aux filtres.</div>;
  }

  return (
    <div style={{ overflowX: 'auto', border: '1px solid #E2E8F0', borderRadius: '12px' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: '13px' }}>
        <thead>
          <tr>
            {MATERIELS_COLUMNS.map((col) => (
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
          {groups.map((group) => (
            <GroupSection key={group.key} group={group} showHeader={showGroupHeaders} onRowClick={onRowClick} selectedRow={selectedRow} duplicateKeys={duplicateKeys} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default MaterielsTable;
