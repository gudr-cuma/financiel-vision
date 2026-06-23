import { SortableTh } from '../shared/SortableTh';
import { formatAmountFull, formatPercent, formatDate } from '../../engine/formatUtils';

export const EMPRUNTS_COLUMNS = [
  { key: 'nEmprunt', label: 'N. Emprunt', type: 'text' },
  { key: 'designation', label: 'Désignation', type: 'text' },
  { key: 'montant', label: 'Montant', type: 'amount' },
  { key: 'taux', label: 'Taux', type: 'percent' },
  { key: 'dateRealisation', label: 'Date Réalisation', type: 'date' },
  { key: 'premiereEcheance', label: '1ère Échéance', type: 'date' },
  { key: 'duree', label: 'Durée', type: 'number' },
  { key: 'dureeMois', label: 'Durée (mois)', type: 'number' },
  { key: 'annuite', label: 'Annuité', type: 'text' },
];

/**
 * Champs complets d'un emprunt (au-delà des colonnes affichées dans le
 * tableau), utilisés pour la fiche détaillée dans EmpruntDetailPanel.
 */
export const EMPRUNT_FICHE_FIELDS = [
  ...EMPRUNTS_COLUMNS,
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
    case 'amount': return formatAmountFull(value);
    case 'percent': return formatPercent(value);
    case 'date': return formatDate(value);
    default: return String(value);
  }
}

export function EmpruntsTable({ rows, sort, onSort, onRowClick, selectedRow }) {
  if (!rows || rows.length === 0) {
    return <div style={{ padding: '48px', textAlign: 'center', color: '#A0AEC0' }}>Aucun emprunt ne correspond aux filtres.</div>;
  }

  return (
    <div style={{ overflowX: 'auto', border: '1px solid #E2E8F0', borderRadius: '12px' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1600px', fontSize: '13px' }}>
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

export default EmpruntsTable;
