import { useMemo, useState } from 'react';
import useStore from '../../store/useStore';
import useAuthStore from '../../store/useAuthStore';
import { UploadPrompt } from '../shared/UploadPrompt';
import { RangeFilterInput } from '../shared/RangeFilterInput';
import { FilterField } from '../shared/FilterField';
import { MiniStatCard } from '../shared/MiniStatCard';
import { ImmobilisationsTable } from './ImmobilisationsTable';
import { ImmobilisationDetailPanel } from './ImmobilisationDetailPanel';
import { sortRows, nextSortState, filterByText, filterByRange, distinctValues, groupRows, sumColumn, yearOf } from '../../engine/tableUtils';
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

const ETAT_ACTIF = 1;
const POSITION_NON_AMORTIE = 1;

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
  { value: 'yearEffetAmort', label: "Année d'effet amort." },
  { value: 'yearAcquisition', label: "Année d'acquisition" },
  { value: 'fournisseur', label: 'Fournisseur' },
];

function groupKeyFn(groupBy) {
  if (groupBy === 'yearEffetAmort') return (row) => yearOf(row.dateEffetAmort) ?? 'Sans date';
  if (groupBy === 'yearAcquisition') return (row) => yearOf(row.dateAcquisition) ?? 'Sans date';
  if (groupBy === 'fournisseur') return (row) => row.cptFournisseur || 'Sans fournisseur';
  return null;
}

export function ImmobilisationsTab() {
  const exploitationData = useStore((s) => s.exploitationData);
  const loadExportMulti = useStore((s) => s.loadExportMulti);
  const loadDemoExportMulti = useStore((s) => s.loadDemoExportMulti);
  const isLoadingExploitation = useStore((s) => s.isLoadingExploitation);
  const errorExploitation = useStore((s) => s.errorExploitation);
  const canUploadFile = useAuthStore((s) => s.canUploadFile());

  const [search, setSearch] = useState('');
  const [dateEffetMin, setDateEffetMin] = useState(null);
  const [dateEffetMax, setDateEffetMax] = useState(null);
  const [dateAcqMin, setDateAcqMin] = useState(null);
  const [dateAcqMax, setDateAcqMax] = useState(null);
  const [axe, setAxe] = useState('');
  const [fournisseur, setFournisseur] = useState('');
  const [groupBy, setGroupBy] = useState('none');
  const [actifOnly, setActifOnly] = useState(true);
  const [sort, setSort] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);

  const immobilisations = useMemo(() => exploitationData?.immobilisations ?? [], [exploitationData]);
  const immoLignes = useMemo(() => exploitationData?.immoLignes ?? [], [exploitationData]);

  const axes = useMemo(() => distinctValues(immobilisations, 'axe1'), [immobilisations]);
  const fournisseurs = useMemo(() => distinctValues(immobilisations, 'cptFournisseur'), [immobilisations]);

  const actives = useMemo(
    () => immobilisations.filter((i) => Number(i.etat) === ETAT_ACTIF),
    [immobilisations]
  );
  const nbActives = actives.length;
  const nbNonAmorties = useMemo(
    () => immobilisations.filter((i) => Number(i.position) === POSITION_NON_AMORTIE).length,
    [immobilisations]
  );
  const valeurEntreeActives = useMemo(() => sumColumn(actives, 'valeurEntree'), [actives]);

  const filteredSorted = useMemo(() => {
    let result = actifOnly ? actives : immobilisations;
    result = filterByText(result, ['nBien', 'libelle'], search);
    if (dateEffetMin || dateEffetMax) result = filterByRange(result, 'dateEffetAmort', dateEffetMin, dateEffetMax);
    if (dateAcqMin || dateAcqMax) result = filterByRange(result, 'dateAcquisition', dateAcqMin, dateAcqMax);
    if (axe) result = result.filter((r) => r.axe1 === axe);
    if (fournisseur) result = result.filter((r) => r.cptFournisseur === fournisseur);
    if (sort) result = sortRows(result, sort.key, sort.direction);
    return result;
  }, [immobilisations, actives, actifOnly, search, dateEffetMin, dateEffetMax, dateAcqMin, dateAcqMax, axe, fournisseur, sort]);

  const groups = useMemo(() => {
    const keyFn = groupKeyFn(groupBy);
    if (!keyFn) return [{ key: 'all', label: '', rows: filteredSorted, subtotal: {} }];
    return groupRows(filteredSorted, keyFn, { subtotalKeys: ['valeurEntree'] });
  }, [filteredSorted, groupBy]);

  if (!exploitationData) {
    return (
      <UploadPrompt
        title="Immobilisations"
        description="Chargez le fichier Excel Export_Multi (onglets I1 + I2) pour afficher le registre des immobilisations."
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
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#1A202C' }}>Immobilisations</div>
          <div style={{ fontSize: '13px', color: '#718096' }}>{filteredSorted.length} bien{filteredSorted.length > 1 ? 's' : ''} sur {immobilisations.length}</div>
        </div>
        {isLoadingExploitation && <div style={{ fontSize: '13px', color: '#718096' }}>Import en cours…</div>}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '12px',
        marginBottom: '16px',
      }}>
        <MiniStatCard label="Immobilisations actives" value={nbActives} />
        <MiniStatCard label="Non amorties" value={nbNonAmorties} />
        <MiniStatCard label="Valeur d'entrée (actives)" value={formatAmountFull(valeurEntreeActives)} color="#FF8200" />
      </div>

      <div style={{ marginBottom: '12px' }}>
        <ToggleButton active={actifOnly} onClick={() => setActifOnly((v) => !v)}>
          Immobilisations actives uniquement
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
            placeholder="N. Bien ou libellé…"
            style={{ ...SELECT_STYLE, width: '100%', boxSizing: 'border-box', cursor: 'text' }}
          />
        </FilterField>
        <FilterField label="Date d'effet amort.">
          <RangeFilterInput type="date" minValue={dateEffetMin} maxValue={dateEffetMax} onChange={(min, max) => { setDateEffetMin(min); setDateEffetMax(max); }} minPlaceholder="Min" maxPlaceholder="Max" />
        </FilterField>
        <FilterField label="Date d'acquisition">
          <RangeFilterInput type="date" minValue={dateAcqMin} maxValue={dateAcqMax} onChange={(min, max) => { setDateAcqMin(min); setDateAcqMax(max); }} minPlaceholder="Min" maxPlaceholder="Max" />
        </FilterField>
        <FilterField label="Axe 1">
          <select value={axe} onChange={(e) => setAxe(e.target.value)} style={{ ...SELECT_STYLE, width: '100%', boxSizing: 'border-box' }}>
            <option value="">Tous les axes</option>
            {axes.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </FilterField>
        <FilterField label="Fournisseur">
          <select value={fournisseur} onChange={(e) => setFournisseur(e.target.value)} style={{ ...SELECT_STYLE, width: '100%', boxSizing: 'border-box' }}>
            <option value="">Tous les fournisseurs</option>
            {fournisseurs.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </FilterField>
        <FilterField label="Regroupement">
          <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)} style={{ ...SELECT_STYLE, width: '100%', boxSizing: 'border-box' }}>
            {GROUP_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </FilterField>
      </div>

      <ImmobilisationsTable
        groups={groups}
        showGroupHeaders={groupBy !== 'none'}
        sort={sort}
        onSort={(key) => setSort(nextSortState(sort, key))}
        onRowClick={(row) => setSelectedRow(selectedRow?.nBien === row.nBien ? null : row)}
        selectedRow={selectedRow}
      />

      <ImmobilisationDetailPanel
        immobilisation={selectedRow}
        immoLignes={immoLignes}
        onClose={() => setSelectedRow(null)}
      />
    </div>
  );
}

export default ImmobilisationsTab;
