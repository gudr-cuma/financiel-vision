import { useMemo, useState } from 'react';
import useStore from '../../store/useStore';
import useAuthStore from '../../store/useAuthStore';
import { UploadPrompt } from '../shared/UploadPrompt';
import { MiniStatCard } from '../shared/MiniStatCard';
import { CapitalSocialRegistreTable } from './CapitalSocialRegistreTable';
import { sortRows, nextSortState, groupRows, sumColumn } from '../../engine/tableUtils';
import { formatAmountFull } from '../../engine/formatUtils';

const SELECT_STYLE = {
  border: '1px solid #CBD5E0',
  borderRadius: '6px',
  padding: '7px 10px',
  fontSize: '13px',
  color: '#1A202C',
  backgroundColor: '#ffffff',
  cursor: 'pointer',
};

const GROUP_OPTIONS = [
  { value: 'none', label: 'Aucun regroupement' },
  { value: 'adherent', label: 'Adhérent' },
  { value: 'baseSouscription', label: 'Base Souscription' },
];

export function CapitalSocialRegistreTab() {
  const exploitationData = useStore((s) => s.exploitationData);
  const loadExportMulti = useStore((s) => s.loadExportMulti);
  const loadDemoExportMulti = useStore((s) => s.loadDemoExportMulti);
  const isLoadingExploitation = useStore((s) => s.isLoadingExploitation);
  const errorExploitation = useStore((s) => s.errorExploitation);
  const canUploadFile = useAuthStore((s) => s.canUploadFile());

  const [groupBy, setGroupBy] = useState('none');
  const [sort, setSort] = useState({ key: 'adherent', direction: 'asc' });

  const capitalSocial = useMemo(() => exploitationData?.capitalSocial ?? [], [exploitationData]);

  const sorted = useMemo(() => {
    if (!sort) return capitalSocial;
    return sortRows(capitalSocial, sort.key, sort.direction);
  }, [capitalSocial, sort]);

  const totalQtSolde = useMemo(() => sumColumn(sorted, 'qtSolde'), [sorted]);
  const totalMontant = useMemo(() => sumColumn(sorted, 'montant'), [sorted]);

  const groups = useMemo(() => {
    if (groupBy === 'none') return [{ key: 'all', label: '', rows: sorted, subtotal: {} }];
    const keyFn = groupBy === 'adherent' ? (r) => r.adherent : (r) => r.baseSouscription;
    return groupRows(sorted, keyFn, { subtotalKeys: ['montant', 'qtSolde'] });
  }, [sorted, groupBy]);

  if (!exploitationData) {
    return (
      <UploadPrompt
        title="Capital social (registre)"
        description="Chargez le fichier Excel Export_Multi (onglet Capital_Social) pour afficher le registre des parts sociales."
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
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#1A202C' }}>Capital social (registre)</div>
          <div style={{ fontSize: '13px', color: '#718096' }}>{capitalSocial.length} ligne{capitalSocial.length > 1 ? 's' : ''}</div>
        </div>
        {isLoadingExploitation && <div style={{ fontSize: '13px', color: '#718096' }}>Import en cours…</div>}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '12px',
        marginBottom: '16px',
      }}>
        <MiniStatCard label="Qt. Solde (total)" value={totalQtSolde} />
        <MiniStatCard label="Montant (total)" value={formatAmountFull(totalMontant)} color="#FF8200" />
      </div>

      <div style={{ marginBottom: '16px' }}>
        <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)} style={SELECT_STYLE}>
          {GROUP_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
      </div>

      <CapitalSocialRegistreTable
        groups={groups}
        showGroupHeaders={groupBy !== 'none'}
        sort={sort}
        onSort={(key) => setSort(nextSortState(sort, key))}
      />
    </div>
  );
}

export default CapitalSocialRegistreTab;
