import { formatAmountFull, formatPercent } from '../../engine/formatUtils';

const STATUS_COLOR = {
  green: '#31B700',
  orange: '#FF8200',
  red: '#E53935',
};

/**
 * Formats a ratio value according to its unit.
 */
function formatRatioValue(value, unit) {
  if (value === null || value === undefined) return '—';
  if (unit === '€' || unit === 'eur') return formatAmountFull(value);
  if (unit === '%' || unit === 'percent') return formatPercent(value);
  return value?.toFixed(2) ?? '—';
}

/**
 * Single ratio card.
 */
function RatioCard({ ratio }) {
  const borderColor = STATUS_COLOR[ratio.status] ?? '#E2E8F0';
  const valueColor = STATUS_COLOR[ratio.status] ?? '#1A202C';

  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: 8,
        padding: 16,
        borderLeft: `4px solid ${borderColor}`,
        border: `1px solid #E2E8F0`,
        borderLeftWidth: 4,
        borderLeftColor: borderColor,
        borderLeftStyle: 'solid',
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.07em',
          color: '#718096',
          marginBottom: 8,
        }}
      >
        {ratio.label}
      </div>
      <div
        style={{
          fontSize: 20,
          fontWeight: 700,
          color: valueColor,
          fontVariantNumeric: 'tabular-nums',
          marginBottom: 6,
        }}
      >
        {formatRatioValue(ratio.value, ratio.unit)}
      </div>
      {ratio.formula && (
        <div
          style={{
            fontSize: 11,
            color: '#A0AEC0',
            fontStyle: 'italic',
            lineHeight: 1.4,
          }}
        >
          {ratio.formula}
        </div>
      )}
    </div>
  );
}

/**
 * RatioCards — 2×2 grid of balance sheet ratio cards.
 *
 * Props:
 *   ratios  {object} — ratios object from bilanData
 */
export default function RatioCards({ ratios }) {
  if (!ratios) return null;

  const ratioList = Object.values(ratios);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 12,
      }}
    >
      {ratioList.map((ratio) => (
        <RatioCard key={ratio.label} ratio={ratio} />
      ))}
    </div>
  );
}
