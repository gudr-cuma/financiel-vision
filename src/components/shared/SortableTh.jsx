/**
 * SortableTh — en-tête de colonne cliquable avec indicateur de tri.
 *
 * Props :
 *   label       (string) — libellé affiché
 *   sortKey     (string) — clé de tri associée à cette colonne
 *   currentSort ({key, direction}|null) — état de tri courant
 *   onSort      (fn)     — appelé avec sortKey au clic
 *   align       ('left'|'right') — alignement du texte (défaut 'left')
 */
export function SortableTh({ label, sortKey, currentSort, onSort, align = 'left' }) {
  const isActive = currentSort?.key === sortKey;
  const arrow = isActive ? (currentSort.direction === 'asc' ? '▲' : '▼') : '';

  return (
    <th
      onClick={() => onSort(sortKey)}
      role="columnheader button"
      aria-sort={isActive ? (currentSort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
      style={{
        padding: '8px 10px',
        textAlign: align,
        fontSize: '11px',
        fontWeight: 600,
        color: isActive ? '#1A202C' : '#718096',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        borderBottom: '2px solid #E2E8F0',
        backgroundColor: '#F7FAFC',
        whiteSpace: 'nowrap',
        cursor: 'pointer',
        userSelect: 'none',
      }}
    >
      {label} <span style={{ display: 'inline-block', width: '10px', fontSize: '9px', color: '#FF8200' }}>{arrow}</span>
    </th>
  );
}

export default SortableTh;
