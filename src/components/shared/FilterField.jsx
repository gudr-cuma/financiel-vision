const LABEL_STYLE = {
  fontSize: '11px',
  fontWeight: 600,
  color: '#718096',
  textTransform: 'uppercase',
  letterSpacing: '0.3px',
  marginBottom: '4px',
};

/**
 * FilterField — enveloppe un contrôle de filtre (input, select, RangeFilterInput…)
 * avec un libellé explicite affiché au-dessus.
 *
 * Props :
 *   label    (string)
 *   children (ReactNode)
 */
export function FilterField({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <span style={LABEL_STYLE}>{label}</span>
      {children}
    </div>
  );
}

export default FilterField;
