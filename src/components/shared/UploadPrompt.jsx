import { useCallback, useRef, useState } from 'react';

/**
 * UploadPrompt — état vide générique (drag&drop + clic-pour-parcourir)
 * pour les modules alimentés par un import Excel/CSV unique.
 *
 * Props :
 *   title        (string) — titre du module
 *   description  (string) — texte d'aide sous le titre
 *   accept       (string) — attribut accept de l'input file (ex. ".xlsx,.xls")
 *   onFile       (fn)     — appelé avec le File déposé/sélectionné
 *   canUpload    (bool)   — autorise ou non le dépôt de fichier réel
 *   error        (string|null) — message d'erreur à afficher
 *   onDemo       (fn)     — optionnel, affiche un bouton "données de démonstration"
 */
export function UploadPrompt({ title, description, accept = '.xlsx,.xls', onFile, canUpload, error, onDemo }) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  }, [onFile]);

  return (
    <div style={{ paddingTop: '32px', maxWidth: '600px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1A202C', marginBottom: '6px' }}>
        {title}
      </h2>
      <p style={{ fontSize: '14px', color: '#718096', marginBottom: '24px' }}>
        {description}
      </p>

      {canUpload && (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
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
            ou cliquez pour parcourir — <strong>{accept.replace(/\./g, '').toUpperCase()}</strong> uniquement
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            style={{ display: 'none' }}
            onChange={(e) => e.target.files[0] && onFile(e.target.files[0])}
          />
        </div>
      )}

      {onDemo && (
        <button
          onClick={onDemo}
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
      )}

      {!canUpload && (
        <div style={{ marginTop: '10px', padding: '9px 14px', background: '#FFF3E0', borderRadius: '8px', fontSize: '12px', color: '#718096' }}>
          🔒 Import limité à la démonstration — droits non activés
        </div>
      )}

      {error && (
        <div style={{
          marginTop: '12px', padding: '10px 14px',
          background: '#FEF2F2', border: '1px solid #F87171',
          borderRadius: '8px', fontSize: '13px', color: '#991B1B',
        }}>
          {error}
        </div>
      )}
    </div>
  );
}

export default UploadPrompt;
