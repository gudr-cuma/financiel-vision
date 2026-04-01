import { useEffect } from 'react';

export function ErrorBanner({ message, type = 'error', onClose }) {
  const isError = type === 'error';

  const containerStyle = isError
    ? {
        backgroundColor: '#FFF5F5',
        borderColor: '#FEB2B2',
        color: '#C53030',
      }
    : {
        backgroundColor: '#FFF3E0',
        borderColor: '#FBBF24',
        color: '#92400E',
      };

  if (!message) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        ...containerStyle,
        border: '1px solid',
        borderRadius: '8px',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        width: '100%',
      }}
    >
      <span
        style={{ fontSize: '16px', flexShrink: 0, lineHeight: '1.5' }}
        aria-hidden="true"
      >
        ⚠️
      </span>
      <span style={{ flex: 1, fontSize: '14px', lineHeight: '1.5' }}>
        {message}
      </span>
      {onClose && (
        <button
          onClick={onClose}
          aria-label="Fermer le message"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '18px',
            lineHeight: '1',
            padding: '0 0 0 4px',
            color: 'inherit',
            opacity: 0.7,
            flexShrink: 0,
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}

export default ErrorBanner;
