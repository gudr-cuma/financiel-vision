// src/components/multiCuma/MultiCumaSynthese.jsx
import { useMemo, useState } from 'react';
import { distinctValues } from '../../engine/tableUtils';
import {
  TABLE1_METRICS, TABLE2_METRICS, computeSyntheseTable,
} from '../../domain/multiCuma/synthese';
import { SynthesePivotTable } from './SynthesePivotTable';

const SELECT_STYLE = {
  border: '1px solid #CBD5E0', borderRadius: '6px', padding: '7px 10px',
  fontSize: '13px', color: '#1A202C', backgroundColor: '#fff', cursor: 'pointer',
};

function FilterSelect({ label, value, options, onChange }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: '#718096' }}>
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)} style={SELECT_STYLE}>
        <option value="">Tous</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

export function MultiCumaSynthese({ rows }) {
  const [region, setRegion] = useState('');
  const [dpt, setDpt] = useState('');
  const [classe, setClasse] = useState('');
  const [mode, setMode] = useState('mean'); // 'mean' | 'weighted'

  const regions = useMemo(() => distinctValues(rows, 'region'), [rows]);
  const depts = useMemo(() => distinctValues(rows, 'dpt'), [rows]);
  const classes = useMemo(() => distinctValues(rows, 'classe'), [rows]);

  const filtered = useMemo(() => rows.filter((r) =>
    (!region || String(r.region) === region) &&
    (!dpt || String(r.dpt) === dpt) &&
    (!classe || String(r.classe) === classe)
  ), [rows, region, dpt, classe]);

  const table1 = useMemo(() => computeSyntheseTable(filtered, TABLE1_METRICS, { mode }), [filtered, mode]);
  const table2 = useMemo(() => computeSyntheseTable(filtered, TABLE2_METRICS, { mode }), [filtered, mode]);

  return (
    <div style={{ paddingTop: '8px' }}>
      <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '18px' }}>
        <FilterSelect label="Région" value={region} options={regions} onChange={setRegion} />
        <FilterSelect label="Département" value={dpt} options={depts.map(String)} onChange={setDpt} />
        <FilterSelect label="Classe" value={classe} options={classes} onChange={setClasse} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: '#718096' }}>
          Mode de calcul
          <div style={{ display: 'flex', border: '1px solid #CBD5E0', borderRadius: '6px', overflow: 'hidden' }}>
            {[['mean', 'Moyenne simple'], ['weighted', 'Pondéré']].map(([v, lbl]) => (
              <button
                key={v}
                type="button"
                onClick={() => setMode(v)}
                style={{
                  padding: '7px 12px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', border: 'none',
                  background: mode === v ? '#31B700' : '#fff', color: mode === v ? '#fff' : '#718096',
                }}
              >
                {lbl}
              </button>
            ))}
          </div>
        </div>
        <div style={{ fontSize: '12px', color: '#718096', marginLeft: 'auto' }}>
          {filtered.length} CUMA
        </div>
      </div>

      <SynthesePivotTable title="Résultats & charges" metrics={TABLE1_METRICS} data={table1} />
      <SynthesePivotTable title="Structure financière" metrics={TABLE2_METRICS} data={table2} />
    </div>
  );
}

export default MultiCumaSynthese;
