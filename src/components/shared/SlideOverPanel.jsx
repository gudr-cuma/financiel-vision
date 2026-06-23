import { useEffect, useRef } from 'react';
import { formatAmountFull } from '../../engine/formatUtils';

/**
 * SlideOverPanel — coquille générique de panneau de détail glissant depuis
 * la droite, avec son propre overlay (autonome, contrairement au pattern
 * SIG existant où l'overlay est rendu par l'appelant).
 *
 * Props :
 *   isOpen      (bool)
 *   onClose     (fn)
 *   title       (string)
 *   subtitle    (string) — ex. "Détail →"
 *   amount      (number) — optionnel, affiché en gros sous le titre
 *   headerExtra (ReactNode) — optionnel, contenu additionnel dans l'en-tête
 *   width       (string) — largeur CSS du panel (défaut 'min(640px, 92vw)')
 *   children    (ReactNode) — corps du panel
 */
export function SlideOverPanel({ isOpen, onClose, title, subtitle, amount, headerExtra, width = 'min(640px, 92vw)', children }) {
  const closeBtnRef = useRef(null);

  useEffect(() => {
    if (isOpen && closeBtnRef.current) closeBtnRef.current.focus();
  }, [isOpen, title]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden="true"
        style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.15)', zIndex: 39 }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={subtitle || title}
        style={{
          position: 'fixed',
          right: 0,
          top: 0,
          height: '100%',
          width,
          backgroundColor: '#ffffff',
          boxShadow: '-4px 0 16px rgba(0,0,0,0.12)',
          zIndex: 40,
          display: 'flex',
          flexDirection: 'column',
          transform: 'translateX(0)',
          transition: 'transform 300ms ease-in-out',
          overflowY: 'auto',
        }}
      >
        <div
          style={{
            padding: '18px 20px 16px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '12px',
            flexShrink: 0,
            backgroundColor: '#FAFAFA',
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            {subtitle && (
              <div style={{ fontSize: '13px', color: '#718096', marginBottom: '4px', fontWeight: 500 }}>
                {subtitle}
              </div>
            )}
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#1A202C' }}>{title}</div>
            {amount !== undefined && amount !== null && (
              <div style={{ marginTop: '6px', fontSize: '20px', fontWeight: 700, color: '#FF8200' }}>
                {formatAmountFull(amount)}
              </div>
            )}
            {headerExtra}
          </div>

          <button
            ref={closeBtnRef}
            onClick={onClose}
            aria-label="Fermer le panel"
            style={{
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #E2E8F0',
              borderRadius: '6px',
              backgroundColor: '#ffffff',
              cursor: 'pointer',
              fontSize: '18px',
              color: '#718096',
              flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px' }}>
          {children}
        </div>
      </div>
    </>
  );
}

export default SlideOverPanel;
