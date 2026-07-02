// src/components/multiCuma/MultiCumaTab.jsx
import { useState } from 'react';
import useStore from '../../store/useStore';
import useAuthStore from '../../store/useAuthStore';
import { UploadPrompt } from '../shared/UploadPrompt';
import { MultiCumaDataTab } from './MultiCumaDataTab';
import { MultiCumaSynthese } from './MultiCumaSynthese';

const SUB_TABS = [
  { id: 'donnees', label: 'Données' },
  { id: 'synthese', label: 'Synthèse' },
];

function SubTab({ active, onClick, children }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      style={{
        padding: '8px 14px', fontSize: '13px', fontWeight: active ? 700 : 400,
        color: active ? '#1A202C' : '#718096', background: 'transparent', border: 'none',
        borderBottom: active ? '3px solid #FF8200' : '3px solid transparent', cursor: 'pointer', marginBottom: '-1px',
      }}
    >
      {children}
    </button>
  );
}

export function MultiCumaTab() {
  const multiCumaData = useStore((s) => s.multiCumaData);
  const loadMultiCuma = useStore((s) => s.loadMultiCuma);
  const errorMultiCuma = useStore((s) => s.errorMultiCuma);
  const canUploadFile = useAuthStore((s) => s.canUploadFile());
  const [subTab, setSubTab] = useState('donnees');

  if (!multiCumaData) {
    return (
      <UploadPrompt
        title="Analyse multi-CUMA"
        description="Chargez le classeur benchmark (onglet « global ») pour analyser l'ensemble des CUMA."
        accept=".xlsx,.xls,.xlsm"
        onFile={loadMultiCuma}
        canUpload={canUploadFile}
        error={errorMultiCuma}
      />
    );
  }

  const rows = multiCumaData.rows;

  return (
    <div style={{ paddingTop: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#1A202C' }}>Analyse multi-CUMA</div>
          <div style={{ fontSize: '13px', color: '#718096' }}>{rows.length} CUMA — {multiCumaData.fileName}</div>
        </div>
      </div>

      <nav role="tablist" style={{ display: 'flex', borderBottom: '1px solid #E2E8F0', marginBottom: '4px' }}>
        {SUB_TABS.map((t) => (
          <SubTab key={t.id} active={t.id === subTab} onClick={() => setSubTab(t.id)}>{t.label}</SubTab>
        ))}
      </nav>

      {subTab === 'donnees' && <MultiCumaDataTab rows={rows} />}
      {subTab === 'synthese' && <MultiCumaSynthese rows={rows} />}
    </div>
  );
}

export default MultiCumaTab;
