import { useState } from 'react';
import { SortableTh } from '../shared/SortableTh';
import { formatAmountFull, formatPercent, formatDate } from '../../engine/formatUtils';

export const IMMOBILISATIONS_COLUMNS = [
  { key: 'nBien', label: 'N. Bien', type: 'number', width: '7%' },
  { key: 'axe1', label: 'Axe 1', type: 'text', width: '9%' },
  { key: 'libelle', label: 'Libellé', type: 'text', width: '28%' },
  { key: 'dateAcquisition', label: 'Date Acquisition', type: 'date', width: '15%' },
  { key: 'valeurEntree', label: 'Valeur Entrée', type: 'amount', width: '14%' },
  { key: 'dateDebutAmort', label: 'Date Début Amort', type: 'date', width: '14%' },
  { key: 'valeurResiduelle', label: 'Valeur Résiduelle', type: 'amount', width: '13%' },
];

/**
 * Champs complets d'une immobilisation (au-delà des colonnes affichées dans
 * le tableau), utilisés pour la fiche détaillée dans ImmobilisationDetailPanel.
 */
export const IMMOBILISATION_FICHE_FIELDS = [
  ...IMMOBILISATIONS_COLUMNS,
  { key: 'dateMiseEnService', label: 'Date Mise en Service', type: 'date' },
  { key: 'typeImmoCOG', label: 'Type Immo COG', type: 'text' },
  { key: 'codeNational', label: 'Code National', type: 'text' },
  { key: 'dateEffetAmort', label: 'Date Effet Amort', type: 'date' },
  { key: 'axe2', label: 'Axe 2', type: 'text' },
  { key: 'cptFournisseur', label: 'Fournisseur', type: 'text' },
  { key: 'compteImmo', label: 'Compte Immo', type: 'text' },
  { key: 'cptAmort', label: 'Compte Amort.', type: 'text' },
  { key: 'cptDotAmort', label: 'Compte Dot. Amort.', type: 'text' },
  { key: 'ecoMethode', label: 'Éco. Méthode', type: 'number' },
  { key: 'ecoDuree', label: 'Éco. Durée', type: 'number' },
  { key: 'ecoDateDebut', label: 'Éco. Date Début', type: 'date' },
  { key: 'ecoDateFin', label: 'Éco. Date Fin', type: 'date' },
  { key: 'ecoBase', label: 'Éco. Base', type: 'amount' },
  { key: 'ecoTaux', label: 'Éco. Taux', type: 'percent' },
  { key: 'ecoMtLineaire', label: 'Éco. Mt Linéaire', type: 'amount' },
  { key: 'ecoMtTotal', label: 'Éco. Mt Total', type: 'amount' },
  { key: 'ecoMtResiduel', label: 'Éco. Mt Résiduel', type: 'amount' },
  { key: 'dateCession', label: 'Date Cession', type: 'date' },
  { key: 'mtCession', label: 'Mt Cession', type: 'amount' },
  { key: 'dateDebutExo', label: 'Date Début Exo', type: 'date' },
  { key: 'dateFinExo', label: 'Date Fin Exo', type: 'date' },
  { key: 'natureImmo', label: 'Nature Immo', type: 'text' },
  { key: 'codeMateriel', label: 'Code Matériel', type: 'number' },
  { key: 'etat', label: 'État', type: 'number' },
  { key: 'position', label: 'Position', type: 'number' },
];

function formatCell(value, type) {
  if (value === null || value === undefined || value === '') return '—';
  switch (type) {
    case 'amount': return formatAmountFull(value);
    case 'percent': return formatPercent(value);
    case 'date': return formatDate(value);
    default: return String(value);
  }
}

function GroupSection({ group, showHeader, onRowClick, selectedRow }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <>
      {showHeader && (
        <tr style={{ background: '#F0F9FF' }}>
          <td
            colSpan={IMMOBILISATIONS_COLUMNS.length}
            onClick={() => setExpanded((v) => !v)}
            style={{ padding: '8px 10px', fontWeight: 700, color: '#1A202C', cursor: 'pointer' }}
          >
            <span style={{ display: 'inline-block', transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)', marginRight: '8px', transition: 'transform 150ms' }}>▼</span>
            {group.label} ({group.rows.length}) — Valeur Entrée : {formatAmountFull(group.subtotal.valeurEntree)}
          </td>
        </tr>
      )}
      {expanded && group.rows.map((row, idx) => {
        const isSelected = selectedRow?.nBien === row.nBien;
        return (
          <tr
            key={row.nBien ?? idx}
            onClick={() => onRowClick(row)}
            style={{
              background: isSelected ? '#E3F2F5' : idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA',
              cursor: 'pointer',
              borderBottom: '1px solid #F0F4F8',
            }}
          >
            {IMMOBILISATIONS_COLUMNS.map((col) => {
              const value = formatCell(row[col.key], col.type);
              return (
                <td
                  key={col.key}
                  title={value}
                  style={{
                    padding: '6px 10px',
                    textAlign: col.type === 'text' ? 'left' : 'right',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    fontVariantNumeric: 'tabular-nums',
                    width: col.width,
                    boxSizing: 'border-box',
                  }}
                >
                  {value}
                </td>
              );
            })}
          </tr>
        );
      })}
    </>
  );
}

/**
 * ImmobilisationsTable — `groups` est toujours un tableau de sections
 * (1 section sans en-tête si aucun regroupement n'est actif).
 */
export function ImmobilisationsTable({ groups, showGroupHeaders, sort, onSort, onRowClick, selectedRow }) {
  const totalRows = groups.reduce((sum, g) => sum + g.rows.length, 0);
  if (totalRows === 0) {
    return <div style={{ padding: '48px', textAlign: 'center', color: '#A0AEC0' }}>Aucune immobilisation ne correspond aux filtres.</div>;
  }

  return (
    <div style={{ overflowX: 'auto', border: '1px solid #E2E8F0', borderRadius: '12px' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: '13px' }}>
        <thead>
          <tr>
            {IMMOBILISATIONS_COLUMNS.map((col) => (
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
            <GroupSection
              key={group.key}
              group={group}
              showHeader={showGroupHeaders}
              onRowClick={onRowClick}
              selectedRow={selectedRow}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ImmobilisationsTable;
