import { formatAmountFull } from '../../engine/formatUtils';
import BalanceRow from './BalanceRow';

/**
 * Extracts detail lines from a balance section object,
 * filtering out keys prefixed with '_'.
 */
function getSectionLines(section) {
  return Object.entries(section)
    .filter(([k]) => !k.startsWith('_'))
    .map(([, v]) => v);
}

/**
 * LiabilitySection — renders the Passif column of the balance sheet.
 *
 * Props:
 *   capitauxPropres  {object}
 *   dettes           {object}
 *   totalPassif      {number}
 *   onPostClick      {function(id)} — called when a detail line is clicked
 */
export default function LiabilitySection({ capitauxPropres, dettes, totalPassif, onPostClick }) {
  const totalColor = totalPassif < 0 ? '#E53935' : totalPassif === 0 ? '#A0AEC0' : '#268E00';

  const capitauxLines = getSectionLines(capitauxPropres);
  const dettesLines = getSectionLines(dettes);

  return (
    <div>
      {/* Column title */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 12px',
          borderBottom: '2px solid #E2E8F0',
          background: '#F8FAFB',
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 13, letterSpacing: '0.08em', color: '#718096' }}>
          PASSIF
        </span>
        <span style={{ fontWeight: 700, fontSize: 16, color: totalColor, fontVariantNumeric: 'tabular-nums' }}>
          {formatAmountFull(totalPassif)}
        </span>
      </div>

      {/* Capitaux propres */}
      <BalanceRow
        label={capitauxPropres._label}
        montant={capitauxPropres._sousTotal}
        isHeader
      />
      {capitauxLines
        .filter((line) => line.montant !== 0)
        .map((line) => (
          <BalanceRow
            key={line.id}
            label={line.label}
            montant={line.montant}
            indent
            isClickable={typeof onPostClick === 'function'}
            onClick={() => onPostClick && onPostClick(line.id)}
          />
        ))}

      {/* Dettes */}
      <BalanceRow
        label={dettes._label}
        montant={dettes._sousTotal}
        isHeader
      />
      {dettesLines
        .filter((line) => line.montant !== 0)
        .map((line) => (
          <BalanceRow
            key={line.id}
            label={line.label}
            montant={line.montant}
            indent
            isClickable={typeof onPostClick === 'function'}
            onClick={() => onPostClick && onPostClick(line.id)}
          />
        ))}
    </div>
  );
}
