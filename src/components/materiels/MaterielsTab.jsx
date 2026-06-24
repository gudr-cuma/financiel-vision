import { useMemo, useState } from 'react';
import useStore from '../../store/useStore';
import useAuthStore from '../../store/useAuthStore';
import { UploadPrompt } from '../shared/UploadPrompt';
import { FilterField } from '../shared/FilterField';
import { MaterielsTable } from './MaterielsTable';
import { MaterielDetailPanel } from './MaterielDetailPanel';
import { sortRows, nextSortState, groupRows, yearOf } from '../../engine/tableUtils';

const SELECT_STYLE = {
  border: '1px solid #CBD5E0',
  borderRadius: '6px',
  padding: '7px 10px',
  fontSize: '13px',
  color: '#1A202C',
  backgroundColor: '#ffffff',
  cursor: 'pointer',
};

function ToggleButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: `1px solid ${active ? '#31B700' : '#CBD5E0'}`,
        borderRadius: '6px',
        padding: '7px 12px',
        fontSize: '13px',
        fontWeight: 600,
        color: active ? '#268E00' : '#718096',
        backgroundColor: active ? '#E8F5E0' : '#ffffff',
        cursor: 'pointer',
      }}
    >
      {active ? '✓ ' : ''}{children}
    </button>
  );
}

const GROUP_OPTIONS = [
  { value: 'none', label: 'Aucun regroupement' },
  { value: 'yearDateAchat', label: "Année d'achat" },
  { value: 'marque', label: 'Marque' },
];

function groupKeyFn(groupBy) {
  if (groupBy === 'yearDateAchat') return (row) => yearOf(row.dateAchat) ?? 'Sans date';
  if (groupBy === 'marque') return (row) => row.marque || 'Sans marque';
  return null;
}

export function MaterielsTab() {
  const exploitationData = useStore((s) => s.exploitationData);
  const loadExportMulti = useStore((s) => s.loadExportMulti);
  const loadDemoExportMulti = useStore((s) => s.loadDemoExportMulti);
  const isLoadingExploitation = useStore((s) => s.isLoadingExploitation);
  const errorExploitation = useStore((s) => s.errorExploitation);
  const canUploadFile = useAuthStore((s) => s.canUploadFile());

  const [groupBy, setGroupBy] = useState('none');
  const [enUsageOnly, setEnUsageOnly] = useState(true);
  const [sort, setSort] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);

  const materiels = useMemo(() => exploitationData?.materiels ?? [], [exploitationData]);

  const filtered = useMemo(
    () => (enUsageOnly ? materiels.filter((m) => !m.dateVente) : materiels),
    [materiels, enUsageOnly]
  );

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    return sortRows(filtered, sort.key, sort.direction);
  }, [filtered, sort]);

  const groups = useMemo(() => {
    const keyFn = groupKeyFn(groupBy);
    if (!keyFn) return [{ key: 'all', label: '', rows: sorted, subtotal: {} }];
    return groupRows(sorted, keyFn);
  }, [sorted, groupBy]);

  if (!exploitationData) {
    return (
      <UploadPrompt
        title="Matériels"
        description="Chargez le fichier Excel Export_Multi (onglet Materiels) pour afficher le parc matériel."
        accept=".xlsx,.xls"
        onFile={loadExportMulti}
        onDemo={loadDemoExportMulti}
        canUpload={canUploadFile}
        error={errorExploitation}
      />
    );
  }

  return (
    <div style={{ paddingTop: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#1A202C' }}>Matériels</div>
          <div style={{ fontSize: '13px', color: '#718096' }}>{filtered.length} matériel{filtered.length > 1 ? 's' : ''} sur {materiels.length}</div>
        </div>
        {isLoadingExploitation && <div style={{ fontSize: '13px', color: '#718096' }}>Import en cours…</div>}
      </div>

      <div style={{ marginBottom: '12px' }}>
        <ToggleButton active={enUsageOnly} onClick={() => setEnUsageOnly((v) => !v)}>
          Matériels en cours d'usage uniquement
        </ToggleButton>
      </div>

      <div style={{ marginBottom: '16px', maxWidth: '260px' }}>
        <FilterField label="Regroupement">
          <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)} style={{ ...SELECT_STYLE, width: '100%', boxSizing: 'border-box' }}>
            {GROUP_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </FilterField>
      </div>

      <MaterielsTable
        groups={groups}
        showGroupHeaders={groupBy !== 'none'}
        sort={sort}
        onSort={(key) => setSort(nextSortState(sort, key))}
        onRowClick={(row) => setSelectedRow(selectedRow?.codeMateriel === row.codeMateriel ? null : row)}
        selectedRow={selectedRow}
      />

      <MaterielDetailPanel
        materiel={selectedRow}
        onClose={() => setSelectedRow(null)}
      />
    </div>
  );
}

export default MaterielsTab;
