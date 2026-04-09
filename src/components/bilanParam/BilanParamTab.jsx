import { useEffect, useState } from 'react';
import useStore from '../../store/useStore';
import useAuthStore from '../../store/useAuthStore';
import useBilanParamStore from '../../store/useBilanParamStore';
import BilanParamView from './BilanParamView';
import BilanParamConfigEditor from './BilanParamConfigEditor';

const TABS = [
  { id: 'actif',    label: 'Bilan Actif' },
  { id: 'passif',   label: 'Bilan Passif' },
  { id: 'resultat', label: 'Compte de Résultat' },
];

export function BilanParamTab() {
  const parsedFec = useStore(s => s.parsedFec);
  const canEdit   = useAuthStore(s => s.canEdit);
  const { config, computed, isLoading, error, fetchConfig, compute, clearError } = useBilanParamStore();

  const [activeTab, setActiveTab] = useState('actif');
  const showConfig = canEdit('bilanParam');
  const [viewMode, setViewMode] = useState('view'); // 'view' | 'config'

  useEffect(() => {
    fetchConfig();
  }, []);

  useEffect(() => {
    if (config.length && parsedFec) {
      compute(parsedFec);
    }
  }, [config, parsedFec]);

  if (!parsedFec) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: '#718096' }}>
        <div style={{ fontSize: '40px', marginBottom: '16px' }}>📊</div>
        <p style={{ fontSize: '15px', fontWeight: 600, color: '#4A5568' }}>Chargez un fichier FEC pour afficher le bilan paramétré.</p>
        <p style={{ fontSize: '13px', marginTop: '8px' }}>Utilisez l'onglet "Analyseur FEC" pour importer votre fichier.</p>
      </div>
    );
  }

  return (
    <div style={{ marginTop: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#1A202C' }}>
          Bilan paramétré
          {parsedFec?.siren && <span style={{ fontWeight: 400, color: '#718096', fontSize: '14px', marginLeft: '10px' }}>SIREN {parsedFec.siren}</span>}
        </h2>
        {showConfig && (
          <button
            onClick={() => setViewMode(m => m === 'config' ? 'view' : 'config')}
            style={{
              padding: '7px 14px', fontSize: '13px', border: '1px solid #E2E8F0', borderRadius: '6px',
              background: viewMode === 'config' ? '#E3F2F5' : '#fff', cursor: 'pointer', fontWeight: 600,
              color: '#31B700',
            }}
          >
            {viewMode === 'config' ? '← Retour au bilan' : '⚙ Paramétrage'}
          </button>
        )}
      </div>

      {error && (
        <div style={{ padding: '10px 14px', background: '#FFF3E0', borderRadius: '6px', color: '#E53935', fontSize: '13px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between' }}>
          <span>{error}</span>
          <button onClick={clearError} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}>✕</button>
        </div>
      )}

      {isLoading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#718096', fontSize: '13px', marginBottom: '12px' }}>
          <div style={{ width: '16px', height: '16px', border: '2px solid #E2E8F0', borderTopColor: '#31B700', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          Chargement...
        </div>
      )}

      {/* Mode paramétrage */}
      {viewMode === 'config' && <BilanParamConfigEditor />}

      {/* Mode affichage */}
      {viewMode === 'view' && (
        <>
          {!config.length && !isLoading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#718096' }}>
              <p style={{ fontSize: '14px' }}>Aucune configuration trouvée.</p>
              {showConfig && <p style={{ fontSize: '13px', marginTop: '8px' }}>Utilisez le bouton "⚙ Paramétrage" pour initialiser le gabarit CUMA.</p>}
            </div>
          ) : (
            <>
              {/* Sub-tabs */}
              <div style={{ display: 'flex', gap: '0', borderBottom: '2px solid #E2E8F0', marginBottom: '20px' }}>
                {TABS.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      padding: '9px 20px', fontSize: '13px', fontWeight: activeTab === tab.id ? 700 : 500,
                      color: activeTab === tab.id ? '#1A202C' : '#718096',
                      background: 'transparent', border: 'none',
                      borderBottom: activeTab === tab.id ? '2px solid #FF8200' : '2px solid transparent',
                      cursor: 'pointer', marginBottom: '-2px',
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {computed && (
                <BilanParamView items={computed[activeTab]} />
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

export default BilanParamTab;
