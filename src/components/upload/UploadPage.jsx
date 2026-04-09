import useStore from '../../store/useStore';
import useAuthStore from '../../store/useAuthStore';
import { Dropzone } from './Dropzone';
import { ProgressBar } from './ProgressBar';
import { ErrorBanner } from '../shared/ErrorBanner';

export function UploadPage() {
  const loadFec          = useStore((s) => s.loadFec);
  const loadDemo         = useStore((s) => s.loadDemo);
  const loadDemoComplete = useStore((s) => s.loadDemoComplete);
  const isLoading = useStore((s) => s.isLoading);
  const loadProgress = useStore((s) => s.loadProgress);
  const error = useStore((s) => s.error);
  const clearError = useStore((s) => s.clearError);
  const canUploadFile = useAuthStore((s) => s.canUploadFile);

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#F8FAFB',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
      }}
    >
      {/* Card */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)',
          padding: '48px',
          width: '100%',
          maxWidth: '560px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center' }}>
          <h1
            style={{
              margin: '0 0 12px',
              fontSize: '26px',
              fontWeight: 700,
              color: '#1A202C',
              lineHeight: 1.2,
            }}
          >
            Analyse financière FEC
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: '14px',
              color: '#718096',
              lineHeight: 1.6,
            }}
          >
            Déposez votre fichier FEC pour obtenir vos SIG, analyses mensuelles
            et drill-down jusqu'aux écritures.
          </p>
        </div>

        {/* Error banner */}
        {error && (
          <ErrorBanner message={error} type="error" onClose={clearError} />
        )}

        {/* Dropzone — visible seulement si import autorisé */}
        {canUploadFile() && (
          <>
            <Dropzone
              onFile={(file) => loadFec(file)}
              disabled={isLoading}
            />
            {isLoading && <ProgressBar percent={loadProgress} />}
          </>
        )}

        {/* Separator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#E2E8F0' }} />
          <span style={{ fontSize: '13px', color: '#A0AEC0', fontWeight: 500, whiteSpace: 'nowrap' }}>ou</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#E2E8F0' }} />
        </div>

        {/* Demo buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            onClick={() => loadDemoComplete()}
            disabled={isLoading}
            style={{
              width: '100%', padding: '12px 24px',
              backgroundColor: isLoading ? '#FFC06A' : '#FF8200',
              color: '#FFFFFF', border: 'none', borderRadius: '8px',
              fontSize: '15px', fontWeight: 600,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s ease',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}
            onMouseEnter={(e) => { if (!isLoading) e.currentTarget.style.backgroundColor = '#E57300'; }}
            onMouseLeave={(e) => { if (!isLoading) e.currentTarget.style.backgroundColor = '#FF8200'; }}
          >
            🚀 Charger la démo complète
          </button>
          {canUploadFile() && (
            <button
              onClick={() => loadDemo()}
              disabled={isLoading}
              style={{
                width: '100%', padding: '9px 24px',
                backgroundColor: 'transparent',
                color: isLoading ? '#CBD5E0' : '#FF8200',
                border: '1px solid ' + (isLoading ? '#CBD5E0' : '#FF8200'),
                borderRadius: '8px', fontSize: '13px', fontWeight: 500,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s ease',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              }}
              onMouseEnter={(e) => { if (!isLoading) e.currentTarget.style.backgroundColor = '#FFF3E0'; }}
              onMouseLeave={(e) => { if (!isLoading) e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              ⚡ FEC seul (démonstration)
            </button>
          )}
          {!canUploadFile() && (
            <div style={{ padding: '9px 14px', background: '#FFF3E0', borderRadius: '8px', fontSize: '12px', color: '#718096', textAlign: 'center' }}>
              🔒 Import limité à la démonstration — droits non activés
            </div>
          )}
        </div>

        {/* RGPD notice */}
        <p
          style={{
            margin: 0,
            fontSize: '12px',
            color: '#A0AEC0',
            textAlign: 'center',
            lineHeight: 1.5,
          }}
        >
          🔒 Vos données restent dans votre navigateur et ne sont jamais
          envoyées sur nos serveurs.
        </p>
      </div>
    </div>
  );
}

export default UploadPage;
