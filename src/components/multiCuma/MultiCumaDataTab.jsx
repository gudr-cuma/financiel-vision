// src/components/multiCuma/MultiCumaDataTab.jsx
import { useMemo, useState } from 'react';
import { filterByText, groupMultiLevel } from '../../engine/tableUtils';
import { MultiCumaDataTable } from './MultiCumaDataTable';

const GROUP_DEFS = [
  { id: 'classe', label: 'Classe', fn: (r) => r.classe ?? '—' },
  { id: 'dpt', label: 'Département', fn: (r) => r.dpt ?? '—' },
  { id: 'region', label: 'Région', fn: (r) => r.region ?? '—' },
  { id: 'categorie', label: 'Tranche CA', fn: (r) => r.categorie ?? '—' },
];

function GroupToggle({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: `1px solid ${active ? '#31B700' : '#CBD5E0'}`, borderRadius: '6px', padding: '6px 12px',
        fontSize: '13px', fontWeight: 600, cursor: 'pointer',
        color: active ? '#268E00' : '#718096', background: active ? '#E8F5E0' : '#fff',
      }}
    >
      {active ? '✓ ' : ''}{children}
    </button>
  );
}

export function MultiCumaDataTab({ rows }) {
  const [search, setSearch] = useState('');
  const [activeGroups, setActiveGroups] = useState([]); // ordre = ordre de clic
  const [collapsed, setCollapsed] = useState(new Set());

  const toggleGroup = (id) =>
    setActiveGroups((prev) => (prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]));
  const onToggleNode = (nodeId) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(nodeId) ? next.delete(nodeId) : next.add(nodeId);
      return next;
    });

  const filtered = useMemo(() => filterByText(rows, ['nom'], search), [rows, search]);

  const keyFns = useMemo(
    () => activeGroups.map((id) => GROUP_DEFS.find((g) => g.id === id)),
    [activeGroups]
  );
  const groups = useMemo(
    () => (keyFns.length ? groupMultiLevel(filtered, keyFns) : null),
    [filtered, keyFns]
  );

  return (
    <div style={{ paddingTop: '8px' }}>
      <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '14px' }}>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher une CUMA…"
          style={{ border: '1px solid #CBD5E0', borderRadius: '6px', padding: '8px 12px', fontSize: '13px', minWidth: '240px' }}
        />
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: '#718096' }}>Regrouper par :</span>
          {GROUP_DEFS.map((g) => (
            <GroupToggle key={g.id} active={activeGroups.includes(g.id)} onClick={() => toggleGroup(g.id)}>
              {g.label}
            </GroupToggle>
          ))}
        </div>
        <div style={{ fontSize: '12px', color: '#718096', marginLeft: 'auto' }}>
          {filtered.length} CUMA sur {rows.length}
        </div>
      </div>

      <MultiCumaDataTable groups={groups} flatRows={filtered} collapsed={collapsed} onToggle={onToggleNode} />
    </div>
  );
}

export default MultiCumaDataTab;
