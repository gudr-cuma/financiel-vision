/**
 * EntryFilter — champ de filtrage des écritures.
 *
 * Props :
 *   value    (string) — valeur courante du filtre
 *   onChange (fn)     — callback avec la nouvelle valeur normalisée
 *
 * Filtre insensible à la casse et aux accents.
 */
export function EntryFilter({ value, onChange }) {
  return (
    <div style={{ marginBottom: '8px' }}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Filtrer..."
        aria-label="Filtrer les écritures"
        style={{
          width: '100%',
          boxSizing: 'border-box',
          border: '1px solid #CBD5E0',
          borderRadius: '6px',
          padding: '8px 12px',
          fontSize: '13px',
          color: '#1A202C',
          backgroundColor: '#ffffff',
          outline: 'none',
          transition: 'border-color 150ms, box-shadow 150ms',
        }}
        onFocus={(e) => {
          e.target.style.borderColor = '#FF8200';
          e.target.style.boxShadow = '0 0 0 3px rgba(255,130,0,0.15)';
        }}
        onBlur={(e) => {
          e.target.style.borderColor = '#CBD5E0';
          e.target.style.boxShadow = 'none';
        }}
      />
    </div>
  );
}

/**
 * Normalise une chaîne pour comparaison insensible à la casse et aux accents.
 * @param {string} str
 * @returns {string}
 */
export function normalizeText(str) {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export default EntryFilter;
