import { useState } from 'react';
import useStore from '../../store/useStore';
import useAuthStore from '../../store/useAuthStore';
import { getExerciceLabel } from '../../engine/exerciceUtils';

// ---------------------------------------------------------------------------
// Modal confidentialité
// ---------------------------------------------------------------------------
function PrivacyModal({ onClose }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="privacy-title"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        backgroundColor: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: '14px',
          maxWidth: '600px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        }}
      >
        {/* En-tête */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px 16px',
          borderBottom: '1px solid #E2E8F0',
          position: 'sticky', top: 0, background: '#fff', borderRadius: '14px 14px 0 0',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '22px' }}>🔒</span>
            <h2 id="privacy-title" style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#1A202C' }}>
              Sécurité & confidentialité des données
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '20px', color: '#718096', lineHeight: 1,
              padding: '4px 8px', borderRadius: '6px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Corps */}
        <div style={{ padding: '20px 24px 28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Section 1 — FEC local */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{
                background: '#E8F5E0', color: '#268E00',
                borderRadius: '6px', padding: '3px 8px',
                fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
              }}>✔ 100 % local</span>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#1A202C' }}>
                Traitement du fichier FEC
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: '#4A5568', lineHeight: 1.65 }}>
              Votre fichier FEC est lu et analysé <strong>entièrement dans votre navigateur</strong>, sans aucun
              transfert vers un serveur. Le parsing est réalisé via un Web Worker (PapaParse) et toutes les
              données restent en mémoire vive le temps de votre session.
            </p>
            <ul style={{ margin: '8px 0 0', paddingLeft: '18px', fontSize: '13px', color: '#4A5568', lineHeight: 1.75 }}>
              <li>Aucune donnée comptable n'est stockée côté serveur.</li>
              <li>Aucun cookie ni localStorage n'est utilisé pour les écritures FEC.</li>
              <li>Les données disparaissent dès que vous rechargez ou fermez l'onglet.</li>
            </ul>
          </section>

          <hr style={{ border: 'none', borderTop: '1px solid #E2E8F0', margin: 0 }} />

          {/* Section 2 — IA & API Anthropic */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{
                background: '#FFF3E0', color: '#E57300',
                borderRadius: '6px', padding: '3px 8px',
                fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
              }}>⚠ Sur demande</span>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#1A202C' }}>
                Onglet « Analyse IA »
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: '#4A5568', lineHeight: 1.65 }}>
              Si vous utilisez l'onglet <em>Analyse IA</em> et cliquez sur « Générer l'analyse »,
              des <strong>indicateurs financiers agrégés</strong> (CA, EBE, résultat, trésorerie…) sont transmis
              à l'<strong>API Anthropic</strong> (Claude) via votre propre clé API — directement depuis votre
              navigateur, sans passer par un intermédiaire.
            </p>
            <ul style={{ margin: '8px 0 0', paddingLeft: '18px', fontSize: '13px', color: '#4A5568', lineHeight: 1.75 }}>
              <li>
                Seuls des <strong>totaux et ratios calculés</strong> sont envoyés (pas les écritures brutes,
                pas les noms de comptes auxiliaires).
              </li>
              <li>
                La transmission n'a lieu que si vous saisissez une clé API et cliquez explicitement
                sur le bouton de génération.
              </li>
              <li>
                Les conditions d'utilisation et la politique de confidentialité d'Anthropic s'appliquent
                aux données transmises :&nbsp;
                <a
                  href="https://www.anthropic.com/legal/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#FF8200', textDecoration: 'underline' }}
                >
                  anthropic.com/legal/privacy
                </a>.
              </li>
            </ul>
          </section>

          <hr style={{ border: 'none', borderTop: '1px solid #E2E8F0', margin: 0 }} />

          {/* Section 3 — Clé API */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{
                background: '#E3F2F5', color: '#0077A8',
                borderRadius: '6px', padding: '3px 8px',
                fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
              }}>i Info</span>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#1A202C' }}>
                Stockage de la clé API
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: '#4A5568', lineHeight: 1.65 }}>
              Votre clé API Anthropic est conservée dans le <strong>localStorage de votre navigateur</strong>,
              sur votre seul appareil. Elle n'est jamais transmise à un serveur tiers et n'est utilisée
              que pour les appels directs à <code style={{ background: '#F7FAFC', padding: '1px 4px', borderRadius: '3px' }}>api.anthropic.com</code>.
              Vous pouvez la supprimer à tout moment en vidant votre champ de saisie.
            </p>
          </section>

          <hr style={{ border: 'none', borderTop: '1px solid #E2E8F0', margin: 0 }} />

          {/* Section 4 — Aucun tracking */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{
                background: '#E8F5E0', color: '#268E00',
                borderRadius: '6px', padding: '3px 8px',
                fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
              }}>✔ Aucun suivi</span>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#1A202C' }}>
                Cookies & analytics
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: '#4A5568', lineHeight: 1.65 }}>
              Clario Vision ne dépose <strong>aucun cookie analytique</strong>, n'utilise aucun
              outil de tracking (Google Analytics, etc.) et ne collecte aucune donnée sur votre
              utilisation de l'application.
            </p>
          </section>

        </div>

        {/* Pied */}
        <div style={{
          padding: '14px 24px',
          borderTop: '1px solid #E2E8F0',
          background: '#F8FAFB',
          borderRadius: '0 0 14px 14px',
          display: 'flex', justifyContent: 'flex-end',
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '9px 24px',
              borderRadius: '8px', border: 'none',
              background: '#31B700', color: '#fff',
              fontSize: '13px', fontWeight: 600, cursor: 'pointer',
            }}
          >
            J'ai compris
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AppHeader
// ---------------------------------------------------------------------------
export function AppHeader() {
  const parsedFec = useStore((s) => s.parsedFec);
  const isDemo           = useStore((s) => s.isDemo);
  const reset            = useStore((s) => s.reset);
  const loadDemoComplete = useStore((s) => s.loadDemoComplete);
  const setActiveSection = useStore((s) => s.setActiveSection);
  const [showPrivacy, setShowPrivacy] = useState(false);

  const currentUser = useAuthStore((s) => s.currentUser);
  const logout      = useAuthStore((s) => s.logout);

  const fileName = parsedFec?.fileName ?? null;
  const exerciceLabel =
    parsedFec?.exerciceStart && parsedFec?.exerciceEnd
      ? getExerciceLabel(parsedFec.exerciceStart, parsedFec.exerciceEnd)
      : null;

  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #E2E8F0',
      }}
    >
      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}
      >
        {/* Logo */}
        <div
          style={{
            fontWeight: 700,
            fontSize: '20px',
            color: '#31B700',
            letterSpacing: '-0.3px',
            flexShrink: 0,
          }}
        >
          Clario Vision
        </div>

        {/* Right side: file info + demo button */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            minWidth: 0,
          }}
        >
          {parsedFec && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                minWidth: 0,
              }}
            >
              {fileName && (
                <span
                  className="fv-header-filename"
                  style={{
                    fontSize: '13px',
                    color: '#4A5568',
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  title={fileName}
                >
                  {fileName}
                </span>
              )}
              {exerciceLabel && (
                <span
                  style={{
                    fontSize: '12px',
                    color: '#718096',
                  }}
                >
                  {exerciceLabel}
                </span>
              )}
            </div>
          )}

          {isDemo && (
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <button
                onClick={() => loadDemoComplete()}
                title="Recharge FEC + N-1 + N-2 + Dossier de gestion + Bilan & CR"
                style={{
                  fontSize: '12px', fontWeight: 600,
                  color: '#FFFFFF', backgroundColor: '#FF8200',
                  border: 'none', borderRadius: '6px',
                  padding: '5px 12px', cursor: 'pointer',
                  whiteSpace: 'nowrap', transition: 'background-color 150ms',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#E57300'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#FF8200'; }}
              >
                🚀 Démo complète
              </button>
              <button
                onClick={() => reset()}
                title="Réinitialiser — retour à la page d'accueil"
                style={{
                  fontSize: '12px', fontWeight: 500,
                  color: '#FF8200', backgroundColor: 'transparent',
                  border: '1px solid #FF8200', borderRadius: '6px',
                  padding: '5px 12px', cursor: 'pointer',
                  whiteSpace: 'nowrap', transition: 'background-color 150ms',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#FFF3E0'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                ↺ Réinitialiser
              </button>
            </div>
          )}

          {/* Utilisateur connecté + actions */}
          {currentUser && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              {/* Nom */}
              <span style={{ fontSize: '13px', color: '#4A5568', fontWeight: 500 }}>
                {currentUser.name}
              </span>
              {/* Lien admin */}
              {currentUser.role === 'admin' && (
                <button
                  onClick={() => setActiveSection('admin')}
                  title="Gestion des utilisateurs"
                  style={{
                    fontSize: '12px', fontWeight: 500,
                    color: '#718096', background: 'transparent',
                    border: '1px solid #E2E8F0', borderRadius: '6px',
                    padding: '5px 10px', cursor: 'pointer',
                    whiteSpace: 'nowrap', transition: 'border-color 150ms, color 150ms',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#B1DCE2'; e.currentTarget.style.color = '#1A202C'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.color = '#718096'; }}
                >
                  ⚙️ Admin
                </button>
              )}
              {/* Déconnexion */}
              <button
                onClick={logout}
                title="Se déconnecter"
                style={{
                  fontSize: '12px', fontWeight: 500,
                  color: '#E53935', background: 'transparent',
                  border: '1px solid #FECACA', borderRadius: '6px',
                  padding: '5px 10px', cursor: 'pointer',
                  whiteSpace: 'nowrap', transition: 'border-color 150ms, background 150ms',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#FEF2F2'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                Déconnexion
              </button>
            </div>
          )}

          {/* Bouton confidentialité */}
          <button
            onClick={() => setShowPrivacy(true)}
            aria-label="Sécurité & confidentialité des données"
            title="Sécurité & confidentialité des données"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '12px',
              fontWeight: 500,
              color: '#718096',
              backgroundColor: 'transparent',
              border: '1px solid #E2E8F0',
              borderRadius: '6px',
              padding: '5px 10px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              transition: 'border-color 150ms, color 150ms',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#B1DCE2';
              e.currentTarget.style.color = '#1A202C';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#E2E8F0';
              e.currentTarget.style.color = '#718096';
            }}
          >
            🔒 <span className="fv-privacy-label">Confidentialité</span>
          </button>
        </div>
      </div>

      {showPrivacy && <PrivacyModal onClose={() => setShowPrivacy(false)} />}
    </header>
  );
}

export default AppHeader;
