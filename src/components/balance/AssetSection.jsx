import { formatAmountFull } from '../../engine/formatUtils';
import BalanceRow from './BalanceRow';
import { BILAN_RANGES_BY_ID } from '../../engine/computeBilan';

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
 * AssetSection — renders the Actif column of the balance sheet.
 *
 * Props:
 *   actifImmobilise  {object}
 *   actifCirculant   {object}
 *   totalActif       {number}
 *   onPostClick      {function(id)} — called when a detail line is clicked
 */
export default function AssetSection({ actifImmobilise, actifCirculant, totalActif, onPostClick }) {
  const totalColor = totalActif < 0 ? '#E53935' : totalActif === 0 ? '#A0AEC0' : '#268E00';

  const immobiliseLines = getSectionLines(actifImmobilise);
  const circulantLines = getSectionLines(actifCirculant);

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
          ACTIF
        </span>
        <span style={{ fontWeight: 700, fontSize: 16, color: totalColor, fontVariantNumeric: 'tabular-nums' }}>
          {formatAmountFull(totalActif)}
        </span>
      </div>

      {/* Actif immobilisé */}
      <BalanceRow
        label={actifImmobilise._label}
        montant={actifImmobilise._sousTotal}
        isHeader
      />
      {immobiliseLines
        .filter((line) => line.montant !== 0)
        .map((line) => (
          <BalanceRow
            key={line.id}
            label={line.label}
            montant={line.montant}
            indent
            isClickable={typeof onPostClick === 'function'}
            onClick={() => onPostClick && onPostClick(line.id)}
            ranges={BILAN_RANGES_BY_ID[line.id]}
          />
        ))}

      {/* Actif circulant */}
      <BalanceRow
        label={actifCirculant._label}
        montant={actifCirculant._sousTotal}
        isHeader
      />
      {circulantLines
        .filter((line) => line.montant !== 0)
        .map((line) => (
          <BalanceRow
            key={line.id}
            label={line.label}
            montant={line.montant}
            indent
            isClickable={typeof onPostClick === 'function'}
            onClick={() => onPostClick && onPostClick(line.id)}
            ranges={BILAN_RANGES_BY_ID[line.id]}
          />
        ))}
    </div>
  );
}
