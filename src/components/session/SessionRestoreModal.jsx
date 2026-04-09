import { useRef } from 'react';
import useStore from '../../store/useStore';
import useAuthStore from '../../store/useAuthStore';

/**
 * SessionRestoreModal — affiché quand pendingSession !== null.
 * L'utilisateur recharge les fichiers sources, puis clique "Continuer".
 */
export function SessionRestoreModal() {
  const pendingSession = useStore(s => s.pendingSession);
  const parsedFec      = useStore(s => s.parsedFec);
  const dossierData    = useStore(s => s.dossierData);
  const bilanCRData    = useStore(s => s.bilanCRData);
  const analytiqueData = useStore(s => s.analytiqueData);
  const isLoading      = useStore(s => s.isLoading);

  const loadFec        = useStore(s => s.loadFec);
  const loadFecGestion = useStore(s => s.loadFecGestion);
  const loadFileBilanCR= useStore(s => s.loadFileBilanCR);
  const applySession   = useStore(s => s.applySession);
  const cancelSession  = useStore(s => s.cancelSession);
  const canUploadFile  = useAuthStore(s => s.canUploadFile());

  const fecRef        = useRef();
  const dossierRef    = useRef();
  const bilanCRRef    = useRef();

  if (!pendingSession) return null;

  const { metadata, session } = pendingSession;

  // Détermine si le dossier de gestion est requis
  const hasDossierData =
    Object.keys(session.dossierOverrides ?? {}).length > 0 ||
    Object.values(session.dossierComments ?? {}).some(v => v && v.trim().length > 0);

  // Critères pour activer "Continuer"
  const fecOk     = parsedFec !== null;
  const dossierOk = !hasDossierData || dossierData !== null;
  const canContinue = fecOk && dossierOk && !isLoading;

  const handleFecFile = (e) => {
    const file = e.target.files?.[0];
    if (file) loadFec(file);
    e.target.value = '';
  };

  const handleDossierFile = (e) => {
    const file = e.target.files?.[0];
    if (file) loadFecGestion(file);
    e.target.value = '';
  };

  const handleBilanCRFile = (e) => {
    const file = e.target.files?.[0];
    if (file) loadFileBilanCR(file);
    e.target.value = '';
  };

  const title = [metadata.cumaName, metadata.exercice].filter(Boolean).join(' — ') || 'Restauration de session';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: '#F8FAFB',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '16px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.10)',
        maxWidth: '560px',
        width: '100%',
        overflow: 'hidden',
      }}>

        {/* En-tête */}
        <div style={{
          padding: '24px 28px 20px',
          borderBottom: '1px solid #F0F4F8',
        }}>
          <div style={{ fontSize: '20px', marginBottom: '6px' }}>📂</div>
          <h2 style={{ margin: '0 0 4px', fontSize: '17px', fontWeight: 700, color: '#1A202C' }}>
            {title}
          </h2>
          <p style={{ margin: 0, fontSize: '13px', color: '#718096' }}>
            Rechargez les fichiers sources pour restaurer votre session.
          </p>
        </div>

        {/* Corps — liste des fichiers */}
        <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

          <FileRow
            icon="🔎"
            label="Fichier FEC"
            hint={metadata.fecFileName}
            required
            loaded={fecOk}
            loading={isLoading}
            canUpload={canUploadFile}
            onPick={() => fecRef.current?.click()}
          />
          <input ref={fecRef} type="file" accept=".csv,.txt" style={{ display: 'none' }} onChange={handleFecFile} />

          <FileRow
            icon="📋"
            label="Dossier de gestion"
            hint={metadata.dossierFileName}
            required={hasDossierData}
            loaded={dossierData !== null}
            loading={false}
            canUpload={canUploadFile}
            onPick={() => dossierRef.current?.click()}
          />
          <input ref={dossierRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleDossierFile} />

          <FileRow
            icon="📈"
            label="Bilan & CR"
            hint={metadata.bilanCRFileName}
            required={false}
            loaded={bilanCRData !== null}
            loading={false}
            canUpload={canUploadFile}
            onPick={() => bilanCRRef.current?.click()}
          />
          <input ref={bilanCRRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleBilanCRFile} />

          <FileRow
            icon="📊"
            label="Balance Analytique"
            hint={metadata.analytiqueFileName}
            required={false}
            loaded={analytiqueData !== null}
            loading={false}
            canUpload={canUploadFile}
            onPick={null}  // chargé depuis AnalytiqueTab — optionnel post-restore
          />

          {!canUploadFile && (
            <div style={{
              background: '#FFF3E0', border: '1px solid #FECB89',
              borderRadius: '8px', padding: '10px 14px',
              fontSize: '12px', color: '#E57300',
            }}>
              🔒 Vous n'avez pas les droits pour charger des fichiers. Contactez votre administrateur.
            </div>
          )}
        </div>

        {/* Pied */}
        <div style={{
          padding: '16px 28px',
          borderTop: '1px solid #F0F4F8',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: '#F8FAFB',
        }}>
          <button
            onClick={cancelSession}
            style={{
              fontSize: '13px', fontWeight: 500,
              color: '#718096', background: 'transparent',
              border: '1px solid #E2E8F0', borderRadius: '8px',
              padding: '9px 20px', cursor: 'pointer',
            }}
          >
            Annuler
          </button>

          <button
            onClick={applySession}
            disabled={!canContinue}
            style={{
              fontSize: '13px', fontWeight: 700,
              color: '#FFFFFF',
              background: canContinue ? '#31B700' : '#A0AEC0',
              border: 'none', borderRadius: '8px',
              padding: '9px 24px',
              cursor: canContinue ? 'pointer' : 'default',
              transition: 'background 150ms',
            }}
          >
            {isLoading ? '⏳ Chargement…' : 'Continuer →'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Composant ligne de fichier
// ---------------------------------------------------------------------------
function FileRow({ icon, label, hint, required, loaded, loading, canUpload, onPick }) {
  const statusIcon  = loaded ? '✅' : loading ? '⏳' : '⬜';
  const statusColor = loaded ? '#268E00' : '#718096';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '12px',
      padding: '12px 14px',
      background: loaded ? '#F0FBF0' : '#F8FAFB',
      border: `1px solid ${loaded ? '#C6EBC6' : '#E2E8F0'}`,
      borderRadius: '10px',
      transition: 'background 200ms, border-color 200ms',
    }}>
      <span style={{ fontSize: '18px', flexShrink: 0 }}>{icon}</span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#1A202C' }}>{label}</span>
          {required
            ? <span style={{ fontSize: '11px', color: '#E53935', fontWeight: 600 }}>requis</span>
            : <span style={{ fontSize: '11px', color: '#A0AEC0' }}>optionnel</span>
          }
        </div>
        {hint && (
          <div style={{
            fontSize: '11px', color: '#A0AEC0',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {hint}
          </div>
        )}
      </div>

      <span style={{ fontSize: '16px', flexShrink: 0 }}>{statusIcon}</span>

      {!loaded && onPick && canUpload && (
        <button
          onClick={onPick}
          disabled={loading}
          style={{
            fontSize: '12px', fontWeight: 600,
            color: '#FFFFFF', background: '#FF8200',
            border: 'none', borderRadius: '6px',
            padding: '6px 12px', cursor: 'pointer',
            flexShrink: 0, whiteSpace: 'nowrap',
            opacity: loading ? 0.6 : 1,
          }}
        >
          Choisir
        </button>
      )}

      {loaded && (
        <span style={{ fontSize: '12px', fontWeight: 600, color: statusColor, flexShrink: 0 }}>
          Chargé
        </span>
      )}
    </div>
  );
}

export default SessionRestoreModal;
