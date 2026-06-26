import { SortableTh } from '../shared/SortableTh';
import { Tooltip } from '../shared/Tooltip';
import { formatAmountDec, formatPercent, formatDate } from '../../engine/formatUtils';

export const EMPRUNTS_COLUMNS = [
  { key: 'nEmprunt', label: 'N. Emprunt', type: 'text', width: '10%' },
  { key: 'designation', label: 'Désignation', type: 'text', width: '30%' },
  { key: 'montant', label: 'Montant', type: 'amount', width: '12%' },
  { key: 'taux', label: 'Taux', type: 'percent', width: '8%' },
  { key: 'dateRealisation', label: 'Date Réalisation', type: 'date', width: '16%' },
  { key: 'premiereEcheance', label: '1ère Échéance', type: 'date', width: '15%' },
  { key: 'duree', label: 'Durée', type: 'number', width: '9%' },
];

/**
 * Champs complets d'un emprunt (au-delà des colonnes affichées dans le
 * tableau), utilisés pour la fiche détaillée dans EmpruntDetailPanel.
 */
export const EMPRUNT_FICHE_FIELDS = [
  ...EMPRUNTS_COLUMNS,
  { key: 'dureeMois', label: 'Durée (mois)', type: 'number' },
  { key: 'annuite', label: 'Annuité', type: 'text' },
  { key: 'modeRemb', label: 'Mode Remb.', type: 'text' },
  { key: 'situation', label: 'Situation', type: 'text' },
  { key: 'banque', label: 'Banque', type: 'text' },
  { key: 'categorie', label: 'Catégorie', type: 'text' },
  { key: 'garantie', label: 'Garantie', type: 'text' },
  { key: 'typeEmprunt', label: 'Type Emprunt', type: 'text' },
  { key: 'compteEmprunt', label: 'Compte Emprunt', type: 'text' },
  { key: 'compteInteret', label: 'Compte Intérêt', type: 'text' },
  { key: 'compteAssurance', label: 'Compte Assurance', type: 'text' },
  { key: 'compteFrais', label: 'Compte Frais', type: 'text' },
  { key: 'txAssCapitalRestant', label: 'Tx Ass. Capital Restant', type: 'percent' },
  { key: 'txAssCapitalInitial', label: 'Tx Ass. Capital Initial', type: 'percent' },
  { key: 'fraisRealisation', label: 'Frais Réalisation', type: 'amount' },
  { key: 'ancienCode', label: 'Ancien Code', type: 'text' },
];

function formatCellValue(value, type) {
  if (value === null || value === undefined || value === '') return '—';
  switch (type) {
    case 'amount': return formatAmountDec(value);
    case 'percent': return formatPercent(value);
    case 'date': return formatDate(value);
    default: return String(value);
  }
}

export function EmpruntsTable({ rows, sort, onSort, onRowClick, selectedRow, duplicateKeys }) {
  if (!rows || rows.length === 0) {
    return <div style={{ padding: '48px', textAlign: 'center', color: '#A0AEC0' }}>Aucun emprunt ne correspond aux filtres.</div>;
  }

  return (
    <div style={{ overflowX: 'auto', border: '1px solid #E2E8F0', borderRadius: '12px' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: '13px' }}>
        <thead>
          <tr>
            {EMPRUNTS_COLUMNS.map((col) => (
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
                key={`${row.nEmprunt ?? 'na'}-${idx}`}
                onClick={() => onRowClick(row)}
                style={{
                  background: isSelected ? '#E3F2F5' : idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA',
                  cursor: 'pointer',
                  borderBottom: '1px solid #F0F4F8',
                }}
              >
                {EMPRUNTS_COLUMNS.map((col) => (
                  <td
                    key={col.key}
                    style={{
                      padding: '6px 10px',
                      textAlign: col.type === 'text' ? 'left' : 'right',
                      color: '#2D3748',
                      whiteSpace: 'nowrap',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {col.key === 'nEmprunt' && duplicateKeys?.has(row.nEmprunt) ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <Tooltip content={`${duplicateKeys.get(row.nEmprunt)} lignes partagent ce numéro`}>
                          <span style={{ color: '#E53935', cursor: 'help', lineHeight: 1 }}>⚠️</span>
                        </Tooltip>
                        {formatCellValue(row[col.key], col.type)}
                      </span>
                    ) : formatCellValue(row[col.key], col.type)}
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

export default EmpruntsTable;
