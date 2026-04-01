import { useState, useRef } from 'react';

const ACCEPTED_EXTENSIONS = ['.csv', '.txt'];

function getExtension(filename) {
  const idx = filename.lastIndexOf('.');
  if (idx === -1) return '';
  return filename.slice(idx).toLowerCase();
}

export function Dropzone({ onFile, disabled }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [localError, setLocalError] = useState(null);
  const inputRef = useRef(null);

  function validate(files) {
    if (!files || files.length === 0) return null;

    if (files.length > 1) {
      return 'Un seul fichier FEC est accepté. Veuillez déposer un unique fichier.';
    }

    const file = files[0];
    const ext = getExtension(file.name);

    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      return 'Format non supporté. Veuillez déposer un fichier .csv ou .txt.';
    }

    if (file.size === 0) {
      return 'Le fichier est vide.';
    }

    return null;
  }

  function handleFiles(files) {
    const error = validate(files);
    if (error) {
      setLocalError(error);
      return;
    }
    setLocalError(null);
    onFile(files[0]);
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragOver(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (disabled) return;
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }

  function handleInputChange(e) {
    const files = Array.from(e.target.files);
    handleFiles(files);
    // Reset input so same file can be re-selected
    e.target.value = '';
  }

  function handleClick() {
    if (!disabled) {
      inputRef.current?.click();
    }
  }

  function handleKeyDown(e) {
    if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
      e.preventDefault();
      inputRef.current?.click();
    }
  }

  const hasError = !!localError;

  const containerStyle = {
    width: '100%',
    border: '2px dashed',
    borderRadius: '12px',
    padding: '36px 24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s ease',
    // Color variants
    borderColor: hasError
      ? '#E53935'
      : isDragOver
        ? '#B1DCE2'
        : '#E2E8F0',
    backgroundColor: hasError
      ? '#FFF5F5'
      : isDragOver
        ? '#E3F2F5'
        : '#FAFAFA',
    opacity: disabled ? 0.6 : 1,
  };

  return (
    <div style={{ width: '100%' }}>
      <div
        style={containerStyle}
        onDragOver={handleDragOver}
        onDragEnter={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="Zone de dépôt du fichier FEC"
        aria-disabled={disabled}
      >
        {/* Upload icon */}
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: isDragOver ? '#B1DCE2' : '#E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '22px',
            transition: 'background-color 0.2s ease',
            marginBottom: '4px',
          }}
          aria-hidden="true"
        >
          📂
        </div>

        <p
          style={{
            margin: 0,
            fontSize: '15px',
            fontWeight: 600,
            color: '#1A202C',
            textAlign: 'center',
          }}
        >
          Déposez votre fichier FEC ici
        </p>

        <p
          style={{
            margin: 0,
            fontSize: '13px',
            color: '#718096',
            textAlign: 'center',
          }}
        >
          Glissez-déposez un fichier ou cliquez pour sélectionner
        </p>

        <p
          style={{
            margin: '4px 0 0',
            fontSize: '12px',
            color: '#A0AEC0',
            textAlign: 'center',
          }}
        >
          Formats : .csv ou .txt — Séparateur : | tabulation ou ;
        </p>

        <input
          ref={inputRef}
          type="file"
          accept=".csv,.txt"
          onChange={handleInputChange}
          style={{ display: 'none' }}
          tabIndex={-1}
          aria-hidden="true"
        />
      </div>

      {/* Validation error */}
      {localError && (
        <div
          role="alert"
          aria-live="polite"
          style={{
            marginTop: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            color: '#C53030',
          }}
        >
          <span aria-hidden="true">⚠️</span>
          {localError}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setLocalError(null);
            }}
            aria-label="Effacer l'erreur"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '16px',
              color: '#C53030',
              padding: '0 0 0 4px',
              opacity: 0.7,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}

export default Dropzone;
