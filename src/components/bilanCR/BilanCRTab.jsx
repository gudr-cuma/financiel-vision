import { useState, useCallback, useRef } from 'react';
import useStore from '../../store/useStore';
import BilanCRSubNav from './BilanCRSubNav';
import ActifView from './ActifView';
import PassifView from './PassifView';
import ResultatView from './ResultatView';

export function BilanCRTab() {
  const bilanCRData      = useStore(s => s.bilanCRData);
  const setBilanCRData   = useStore(s => s.setBilanCRData);
  const loadDemoBilanCR  = useStore(s => s.loadDemoBilanCR);
  const loadFileBilanCR  = useStore(s => s.loadFileBilanCR);

  const [activeTab, setActiveTab]   = useState('actif');
  const [isDragging, setIsDragging] = useState(false);
  const [loadError, setLoadError]   = useState(null);
  const fileInputRef = useRef(null);

  const handleFile = useCallback(async (file) => {
    setLoadError(null);
    if (!file.name.match(/\.xlsx?$/i)) {
      setLoadError('Le fichier doit être un fichier Excel (.xlsx).');
      return;
    }
    try {
      await loadFileBilanCR(file);
    } catch (err) {
      setLoadError(err.message);
    }
  }, [loadFileBilanCR]);

  const handleDrop = useCallback(e => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  // ── État : pas de données chargées ──────────────────────────────────────────
  if (!bilanCRData) {
    return (
      <div style={{ paddingTop: '32px', maxWidth: '600px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1A202C', marginBottom: '6px' }}>
          Bilan & Compte de résultat
        </h2>
        <p style={{ fontSize: '14px', color: '#718096', marginBottom: '24px' }}>
          Chargez le fichier <strong>BilanCR.xlsx</strong> généré par Divalto pour afficher le bilan
          complet (Brut / Amort. / Net) et le compte de résultat avec comparatif N-1.
        </p>

        {/* Dropzone */}
        <div
          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${isDragging ? '#31B700' : '#B1DCE2'}`,
            borderRadius: '12px',
            padding: '40px 24px',
            textAlign: 'center',
            cursor: 'pointer',
            background: isDragging ? '#E8F5E0' : '#F8FAFB',
            transition: 'all 150ms',
            marginBottom: '16px',
          }}
        >
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>📈</div>
          <div style={{ fontSize: '15px', fontWeight: 600, color: '#1A202C', marginBottom: '6px' }}>
            Glissez-déposez votre fichier BilanCR
          </div>
          <div style={{ fontSize: '13px', color: '#718096' }}>
            ou cliquez pour parcourir — <strong>BilanCR.xlsx</strong> uniquement
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            style={{ display: 'none' }}
            onChange={e => e.target.files[0] && handleFile(e.target.files[0])}
          />
        </div>

        {/* Bouton démo */}
        <button
          onClick={loadDemoBilanCR}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '10px 20px',
            fontSize: '14px', fontWeight: 600,
            color: '#31B700',
            background: '#E8F5E0',
            border: '1px solid #B7DFB7',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'background 150ms',
          }}
        >
          ⚡ Charger les données de démonstration
        </button>

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

  // ── État : données chargées ─────────────────────────────────────────────────
  const { nomCuma, dateDebut, dateFin, actif, passif, resultat } = bilanCRData;

  return (
    <div style={{ paddingTop: '8px', maxWidth: '960px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '12px', flexWrap: 'wrap', gap: '8px',
      }}>
        <div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#1A202C' }}>
            {nomCuma || 'Bilan & Compte de résultat'}
          </div>
          {(dateDebut || dateFin) && (
            <div style={{ fontSize: '13px', color: '#718096' }}>
              {dateDebut && dateFin ? `Du ${dateDebut} au ${dateFin}` : dateDebut || dateFin}
            </div>
          )}
        </div>
        <button
          onClick={() => setBilanCRData(null)}
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

      <BilanCRSubNav activeTab={activeTab} onTabChange={setActiveTab} />

      <div style={{ paddingTop: '20px' }}>
        {activeTab === 'actif'    && <ActifView    items={actif} />}
        {activeTab === 'passif'   && <PassifView   items={passif} />}
        {activeTab === 'resultat' && <ResultatView items={resultat} />}
      </div>
    </div>
  );
}

export default BilanCRTab;
