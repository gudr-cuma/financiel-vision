import { formatAmountFull } from '../../engine/formatUtils';

/**
 * BalanceRow — single row for the balance sheet.
 *
 * Props:
 *   label       {string}   — row label
 *   montant     {number}   — amount
 *   isHeader    {boolean}  — section header style
 *   indent      {boolean}  — add left indent for detail lines
 *   isClickable {boolean}  — show pointer cursor + chevron, call onClick on click
 *   onClick     {function} — callback when clicked (only fires if isClickable && !isHeader)
 */
export default function BalanceRow({
  label,
  montant,
  isHeader = false,
  indent = false,
  isClickable = false,
  onClick,
  ranges,
}) {
  const amountColor =
    montant === 0 || montant === null || montant === undefined
      ? '#A0AEC0'
      : montant < 0
      ? '#E53935'
      : '#1A202C';

  const canClick = isClickable && !isHeader && typeof onClick === 'function';

  const baseStyle = isHeader
    ? {
        display: 'flex',
        alignItems: 'center',
        padding: '6px 12px',
        background: '#F7FAFC',
        borderBottom: '2px solid #E2E8F0',
        fontWeight: 600,
        fontSize: 14,
      }
    : {
        display: 'flex',
        alignItems: 'center',
        padding: '6px 12px',
        paddingLeft: indent ? 24 : 12,
        background: '#FFFFFF',
        borderBottom: '1px solid #F0F4F8',
        fontSize: 13,
        cursor: canClick ? 'pointer' : 'default',
        transition: canClick ? 'background-color 120ms' : undefined,
      };

  function handleMouseEnter(e) {
    if (canClick) e.currentTarget.style.backgroundColor = '#E3F2F5';
  }

  function handleMouseLeave(e) {
    if (canClick) e.currentTarget.style.backgroundColor = '#FFFFFF';
  }

  function handleClick() {
    if (canClick) onClick();
  }

  return (
    <div
      style={baseStyle}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role={canClick ? 'button' : undefined}
      tabIndex={canClick ? 0 : undefined}
      onKeyDown={canClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
      aria-label={canClick ? `Détail de ${label}` : undefined}
    >
      <span style={{ flex: 1, color: '#1A202C', display: 'flex', alignItems: 'baseline', gap: '5px', minWidth: 0 }}>
        <span>{label}</span>
        {!isHeader && ranges?.ranges?.length > 0 && (
          <span style={{ fontSize: '11px', color: '#A0AEC0', whiteSpace: 'nowrap', fontWeight: 400 }}>
            ({[
              ...ranges.ranges,
              ...(ranges.excludeRanges ?? []).map(r => `sauf ${r}`),
            ].join(', ')})
          </span>
        )}
      </span>
      <span style={{ color: amountColor, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
        {montant !== null && montant !== undefined ? formatAmountFull(montant) : '—'}
      </span>
      {canClick && (
        <span
          aria-hidden="true"
          style={{ marginLeft: 8, color: '#A0AEC0', fontSize: 16, flexShrink: 0 }}
        >
          ›
        </span>
      )}
    </div>
  );
}
