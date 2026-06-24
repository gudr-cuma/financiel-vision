const INPUT_STYLE = {
  width: '100%',
  boxSizing: 'border-box',
  border: '1px solid #CBD5E0',
  borderRadius: '6px',
  padding: '7px 10px',
  fontSize: '13px',
  color: '#1A202C',
  backgroundColor: '#ffffff',
  outline: 'none',
  transition: 'border-color 150ms, box-shadow 150ms',
};

function focusStyle(e) {
  e.target.style.borderColor = '#FF8200';
  e.target.style.boxShadow = '0 0 0 3px rgba(255,130,0,0.15)';
}
function blurStyle(e) {
  e.target.style.borderColor = '#CBD5E0';
  e.target.style.boxShadow = 'none';
}

function toInputValue(value, type) {
  if (value === null || value === undefined) return '';
  if (type === 'date' && value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(value);
}

function fromInputValue(raw, type) {
  if (raw === '') return null;
  if (type === 'date') {
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  }
  const n = Number(raw);
  return isNaN(n) ? null : n;
}

/**
 * RangeFilterInput — paire de champs min/max pour filtrer une plage de
 * nombres ou de dates.
 *
 * Props :
 *   type          ('number'|'date')
 *   minValue      (number|Date|null)
 *   maxValue      (number|Date|null)
 *   onChange      (fn) — appelé avec (min, max) à chaque changement
 *   minPlaceholder, maxPlaceholder (string)
 */
export function RangeFilterInput({ type = 'number', minValue, maxValue, onChange, minPlaceholder = 'Min', maxPlaceholder = 'Max' }) {
  return (
    <div style={{ display: 'flex', gap: '6px' }}>
      <input
        type={type}
        value={toInputValue(minValue, type)}
        placeholder={minPlaceholder}
        onChange={(e) => onChange(fromInputValue(e.target.value, type), maxValue)}
        onFocus={focusStyle}
        onBlur={blurStyle}
        style={INPUT_STYLE}
      />
      <input
        type={type}
        value={toInputValue(maxValue, type)}
        placeholder={maxPlaceholder}
        onChange={(e) => onChange(minValue, fromInputValue(e.target.value, type))}
        onFocus={focusStyle}
        onBlur={blurStyle}
        style={INPUT_STYLE}
      />
    </div>
  );
}

export default RangeFilterInput;
