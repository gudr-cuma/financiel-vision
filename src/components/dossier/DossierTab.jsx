import { useState, useCallback, useRef } from 'react';
import useStore from '../../store/useStore';
import useAuthStore from '../../store/useAuthStore';
import DossierSubNav from './DossierSubNav';
import ResultatsTab from './ResultatsTab';
import ChargesTab from './ChargesTab';
import FinancementTab from './FinancementTab';
import FondsRoulementTab from './FondsRoulementTab';
import CapitalSocialTab from './CapitalSocialTab';
import SyntheseTab from './SyntheseTab';

export function DossierTab() {
  const dossierData        = useStore(s => s.dossierData);
  const setDossierData     = useStore(s => s.setDossierData);
  const selectDossierCuma  = useStore(s => s.selectDossierCuma);
  const updateDossierOverride = useStore(s => s.updateDossierOverride);
  const updateDossierComment  = useStore(s => s.updateDossierComment);
  const loadDemoGestion    = useStore(s => s.loadDemoGestion);
  const loadFecGestion     = useStore(s => s.loadFecGestion);

  const canUploadFile = useAuthStore(s => s.canUploadFile());
  const [activeTab, setActiveTab] = useState('resultats');
  const [isDragging, setIsDragging] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFile = useCallback(async (file) => {
    setLoadError(null);
    if (!file.name.match(/\.xlsx?$/i)) {
      setLoadError('Le fichier doit être un fichier Excel (.xlsx).');
      return;
    }
    try {
      await loadFecGestion(file);
    } catch (err) {
      setLoadError(err.message);
    }
  }, [loadFecGestion]);

  const handleDrop = useCallback(e => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleReset = () => {
    setDossierData(null);
    setActiveTab('resultats');
    setLoadError(null);
  };

  // ── État : pas de données chargées ──
  if (!dossierData) {
    return (
      <div style={{ paddingTop: '32px', maxWidth: '600px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1A202C', marginBottom: '6px' }}>
          Dossier de gestion
        </h2>
        <p style={{ fontSize: '14px', color: '#718096', marginBottom: '24px' }}>
          Chargez le fichier Excel <strong>dossier_gestion.xlsx</strong> (feuille Publipostage) pour pré-remplir les tableaux.
        </p>

        {/* Dropzone — visible seulement si import autorisé */}
        {canUploadFile && (
          <div
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${isDragging ? '#FF8200' : '#B1DCE2'}`,
              borderRadius: '12px',
              padding: '40px 24px',
              textAlign: 'center',
              cursor: 'pointer',
              background: isDragging ? '#FFF3E0' : '#F8FAFB',
              transition: 'all 150ms',
              marginBottom: '16px',
            }}
          >
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>📊</div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#1A202C', marginBottom: '6px' }}>
              Glissez-déposez votre fichier Excel
            </div>
            <div style={{ fontSize: '13px', color: '#718096' }}>
              ou cliquez pour parcourir — <strong>.xlsx</strong> uniquement
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              style={{ display: 'none' }}
              onChange={e => e.target.files[0] && handleFile(e.target.files[0])}
            />
          </div>
        )}

        {/* Bouton démo */}
        <button
          onClick={loadDemoGestion}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '10px 20px',
            fontSize: '14px', fontWeight: 600,
            color: '#FF8200',
            background: '#FFF3E0',
            border: '1px solid #FFD6A0',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'background 150ms',
          }}
        >
          ⚡ Charger les données de démonstration
        </button>

        {!canUploadFile && (
          <div style={{ marginTop: '10px', padding: '9px 14px', background: '#FFF3E0', borderRadius: '8px', fontSize: '12px', color: '#718096' }}>
            🔒 Import limité à la démonstration — droits non activés
          </div>
        )}

        {loadError && (
          <div style={{
            marginTop: '12px', padding: '10px 14px',
            background: '#FEF2F2', border: '1px solid #F87171',
            borderRadius: '8px', fontSize: '13px', color: '#991B1B',
          }}>
            {loadError}
          </div>
        )}
      </div>
    );
  }

  // ── État : données chargées ──
  const { cumaList, selectedCumaIndex, variables, overrides, comments } = dossierData;

  const tabProps = {
    variables,
    overrides,
    comments,
    onEdit: updateDossierOverride,
    onCommentChange: updateDossierComment,
  };

  return (
    <div style={{ paddingTop: '8px' }}>
      {/* Header CUMA + actions */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '4px', flexWrap: 'wrap', gap: '8px',
      }}>
        <div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#1A202C' }}>
            {variables.nom_cuma || 'Dossier de gestion'}
          </div>
          <div style={{ fontSize: '13px', color: '#718096' }}>
            Exercice du {variables.debut_periode || '—'} au {variables.fin_periode || '—'}
            {variables.num_gestion ? ` · N° ${variables.num_gestion}` : ''}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {cumaList.length > 1 && (
            <select
              value={selectedCumaIndex}
              onChange={e => selectDossierCuma(Number(e.target.value))}
              style={{
                padding: '6px 10px', fontSize: '13px',
                border: '1px solid #E2E8F0', borderRadius: '6px',
                background: '#FFFFFF', color: '#1A202C', cursor: 'pointer',
              }}
            >
              {cumaList.map((c, i) => (
                <option key={i} value={i}>{c.nom_cuma || `CUMA ${i + 1}`}</option>
              ))}
            </select>
          )}
          <button
            onClick={handleReset}
            style={{
              padding: '6px 12px', fontSize: '13px',
              color: '#718096', background: 'transparent',
              border: '1px solid #E2E8F0', borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            ✕ Fermer
          </button>
        </div>
      </div>

      <DossierSubNav activeTab={activeTab} onTabChange={setActiveTab} />

      <div style={{ paddingTop: '20px', maxWidth: '900px', margin: '0 auto' }}>
        {activeTab === 'resultats'       && <ResultatsTab       {...tabProps} />}
        {activeTab === 'charges'         && <ChargesTab         {...tabProps} />}
        {activeTab === 'financement'     && <FinancementTab     {...tabProps} />}
        {activeTab === 'fonds_roulement' && <FondsRoulementTab  {...tabProps} />}
        {activeTab === 'capital_social'  && <CapitalSocialTab   {...tabProps} />}
        {activeTab === 'synthese'        && (
          <SyntheseTab
            variables={variables}
            comments={comments}
            onCommentChange={updateDossierComment}
          />
        )}
      </div>
    </div>
  );
}

export default DossierTab;
