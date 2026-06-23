import { useMemo, useState } from 'react';
import useStore from '../../store/useStore';
import useAuthStore from '../../store/useAuthStore';
import { UploadPrompt } from '../shared/UploadPrompt';
import { RangeFilterInput } from '../shared/RangeFilterInput';
import { FilterField } from '../shared/FilterField';
import { MiniStatCard } from '../shared/MiniStatCard';
import { EmpruntsTable } from './EmpruntsTable';
import { EmpruntDetailPanel } from './EmpruntDetailPanel';
import { sortRows, nextSortState, filterByText, filterByRange, distinctValues } from '../../engine/tableUtils';
import { getCapitalRestantDu, countEmpruntsEnCours } from '../../engine/empruntsUtils';
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

const SITUATION_EN_COURS = 4;

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

export function EmpruntsTab() {
  const exploitationData = useStore((s) => s.exploitationData);
  const loadExportMulti = useStore((s) => s.loadExportMulti);
  const loadDemoExportMulti = useStore((s) => s.loadDemoExportMulti);
  const isLoadingExploitation = useStore((s) => s.isLoadingExploitation);
  const errorExploitation = useStore((s) => s.errorExploitation);
  const canUploadFile = useAuthStore((s) => s.canUploadFile());

  const [search, setSearch] = useState('');
  const [montantMin, setMontantMin] = useState(null);
  const [montantMax, setMontantMax] = useState(null);
  const [dateRealisationMin, setDateRealisationMin] = useState(null);
  const [dateRealisationMax, setDateRealisationMax] = useState(null);
  const [premiereEcheanceMin, setPremiereEcheanceMin] = useState(null);
  const [premiereEcheanceMax, setPremiereEcheanceMax] = useState(null);
  const [banque, setBanque] = useState('');
  const [categorie, setCategorie] = useState('');
  const [enCoursOnly, setEnCoursOnly] = useState(true);
  const [sort, setSort] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);

  const emprunts = useMemo(() => exploitationData?.emprunts ?? [], [exploitationData]);
  const lignesEmprunt = useMemo(() => exploitationData?.lignesEmprunt ?? [], [exploitationData]);

  const banques = useMemo(() => distinctValues(emprunts, 'banque'), [emprunts]);
  const categories = useMemo(() => distinctValues(emprunts, 'categorie'), [emprunts]);

  const capitalRestantDu = useMemo(
    () => getCapitalRestantDu(emprunts, lignesEmprunt, SITUATION_EN_COURS),
    [emprunts, lignesEmprunt]
  );
  const nbEnCours = useMemo(
    () => countEmpruntsEnCours(emprunts, SITUATION_EN_COURS),
    [emprunts]
  );

  const rows = useMemo(() => {
    let result = enCoursOnly ? emprunts.filter((e) => Number(e.situation) === SITUATION_EN_COURS) : emprunts;
    result = filterByText(result, ['nEmprunt', 'designation'], search);
    result = filterByRange(result, 'montant', montantMin, montantMax);
    if (dateRealisationMin || dateRealisationMax) {
      result = filterByRange(result, 'dateRealisation', dateRealisationMin, dateRealisationMax);
    }
    if (premiereEcheanceMin || premiereEcheanceMax) {
      result = filterByRange(result, 'premiereEcheance', premiereEcheanceMin, premiereEcheanceMax);
    }
    if (banque) result = result.filter((r) => r.banque === banque);
    if (categorie) result = result.filter((r) => r.categorie === categorie);
    if (sort) result = sortRows(result, sort.key, sort.direction);
    return result;
  }, [emprunts, enCoursOnly, search, montantMin, montantMax, dateRealisationMin, dateRealisationMax, premiereEcheanceMin, premiereEcheanceMax, banque, categorie, sort]);

  if (!exploitationData) {
    return (
      <UploadPrompt
        title="Emprunts"
        description="Chargez le fichier Excel Export_Multi (onglets Emprunts + Lignes) pour afficher le registre des emprunts."
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
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#1A202C' }}>Emprunts</div>
          <div style={{ fontSize: '13px', color: '#718096' }}>{rows.length} emprunt{rows.length > 1 ? 's' : ''} sur {emprunts.length}</div>
        </div>
        {isLoadingExploitation && <div style={{ fontSize: '13px', color: '#718096' }}>Import en cours…</div>}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '12px',
        marginBottom: '16px',
      }}>
        <MiniStatCard label="Capital restant dû" value={formatAmountFull(capitalRestantDu)} color="#FF8200" />
        <MiniStatCard label="Emprunts en cours" value={nbEnCours} />
      </div>

      <div style={{ marginBottom: '12px' }}>
        <ToggleButton active={enCoursOnly} onClick={() => setEnCoursOnly((v) => !v)}>
          Emprunts en cours uniquement
        </ToggleButton>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: '10px',
        marginBottom: '16px',
      }}>
        <FilterField label="Recherche">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="N. Emprunt ou désignation…"
            style={{ ...SELECT_STYLE, width: '100%', boxSizing: 'border-box', cursor: 'text' }}
          />
        </FilterField>
        <FilterField label="Montant">
          <RangeFilterInput type="number" minValue={montantMin} maxValue={montantMax} onChange={(min, max) => { setMontantMin(min); setMontantMax(max); }} minPlaceholder="Min" maxPlaceholder="Max" />
        </FilterField>
        <FilterField label="Date de réalisation">
          <RangeFilterInput type="date" minValue={dateRealisationMin} maxValue={dateRealisationMax} onChange={(min, max) => { setDateRealisationMin(min); setDateRealisationMax(max); }} minPlaceholder="Min" maxPlaceholder="Max" />
        </FilterField>
        <FilterField label="1ère échéance">
          <RangeFilterInput type="date" minValue={premiereEcheanceMin} maxValue={premiereEcheanceMax} onChange={(min, max) => { setPremiereEcheanceMin(min); setPremiereEcheanceMax(max); }} minPlaceholder="Min" maxPlaceholder="Max" />
        </FilterField>
        <FilterField label="Banque">
          <select value={banque} onChange={(e) => setBanque(e.target.value)} style={{ ...SELECT_STYLE, width: '100%', boxSizing: 'border-box' }}>
            <option value="">Toutes les banques</option>
            {banques.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </FilterField>
        <FilterField label="Catégorie">
          <select value={categorie} onChange={(e) => setCategorie(e.target.value)} style={{ ...SELECT_STYLE, width: '100%', boxSizing: 'border-box' }}>
            <option value="">Toutes les catégories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </FilterField>
      </div>

      <EmpruntsTable
        rows={rows}
        sort={sort}
        onSort={(key) => setSort(nextSortState(sort, key))}
        onRowClick={(row) => setSelectedRow(selectedRow?.nEmprunt === row.nEmprunt ? null : row)}
        selectedRow={selectedRow}
      />

      <EmpruntDetailPanel
        emprunt={selectedRow}
        lignesEmprunt={lignesEmprunt}
        onClose={() => setSelectedRow(null)}
      />
    </div>
  );
}

export default EmpruntsTab;
