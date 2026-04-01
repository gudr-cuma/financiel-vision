import { formatAmountFull, formatPercent } from '../../engine/formatUtils';

/**
 * SigRow — ligne du tableau SIG.
 *
 * Props :
 *   line       (SIGLine) — données de la ligne
 *   isSelected (bool)    — si la ligne est sélectionnée (panel ouvert)
 *   onClick    (fn)      — callback appelé avec line.id au clic
 */
export function SigRow({ line, isSelected, onClick }) {
  const { id, label, prefix, isTotal, amount, percentCa } = line;
  const isNegative = typeof amount === 'number' && amount < 0;
  const isResultatNet = id === 'resultat_net';

  // Background par priorité
  let rowBg = 'transparent';
  if (isTotal) rowBg = '#E8F5E0';
  if (isResultatNet) rowBg = '#FFF3E0';
  if (isSelected) rowBg = '#E3F2F5';

  const clickable = !isTotal;

  function handleClick() {
    if (clickable && onClick) onClick(id);
  }

  function handleKeyDown(e) {
    if (clickable && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      handleClick();
    }
  }

  return (
    <tr
      role="row"
      aria-selected={isSelected}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={clickable ? 0 : undefined}
      style={{
        backgroundColor: rowBg,
        cursor: clickable ? 'pointer' : 'default',
        transition: 'background-color 120ms',
      }}
      onMouseEnter={(e) => {
        if (!isSelected && clickable) {
          e.currentTarget.style.backgroundColor = '#E3F2F5';
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.backgroundColor = rowBg;
        }
      }}
      onFocus={(e) => {
        if (clickable) e.currentTarget.style.backgroundColor = '#E3F2F5';
      }}
      onBlur={(e) => {
        if (!isSelected) e.currentTarget.style.backgroundColor = rowBg;
      }}
    >
      {/* Libellé */}
      <td
        style={{
          padding: '10px 12px',
          paddingLeft: !isTotal && !prefix ? '36px' : '12px',
          fontSize: '14px',
          fontWeight: isTotal ? 700 : 400,
          color: '#1A202C',
          borderBottom: '1px solid #E2E8F0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {prefix && (
            <span
              style={{
                color: '#718096',
                fontWeight: 600,
                minWidth: '14px',
                display: 'inline-block',
              }}
            >
              {prefix}
            </span>
          )}
          <span>{label}</span>
        </div>
      </td>

      {/* Montant */}
      <td
        style={{
          padding: '10px 12px',
          fontSize: '14px',
          fontWeight: isTotal ? 700 : 400,
          color: isNegative ? '#E53935' : '#1A202C',
          textAlign: 'right',
          whiteSpace: 'nowrap',
          borderBottom: '1px solid #E2E8F0',
        }}
      >
        {formatAmountFull(amount)}
      </td>

      {/* % CA */}
      <td
        style={{
          padding: '10px 12px',
          fontSize: '13px',
          color: '#718096',
          textAlign: 'right',
          whiteSpace: 'nowrap',
          borderBottom: '1px solid #E2E8F0',
        }}
      >
        {percentCa != null ? formatPercent(percentCa) : '—'}
      </td>

      {/* Chevron */}
      <td
        style={{
          padding: '10px 10px 10px 4px',
          textAlign: 'center',
          borderBottom: '1px solid #E2E8F0',
          width: '32px',
        }}
      >
        {!isTotal && (
          <span
            style={{
              color: isSelected ? '#FF8200' : '#CBD5E0',
              fontSize: '16px',
              transition: 'color 150ms',
            }}
            aria-hidden="true"
          >
            ›
          </span>
        )}
      </td>
    </tr>
  );
}

export default SigRow;
