import { formatAmountFull, formatPercent } from '../../engine/formatUtils';
import { CHARGE_CATEGORIES } from '../../engine/computeCharges';

// Lookup ranges par id
const RANGES_BY_ID = Object.fromEntries(
  CHARGE_CATEGORIES.map(c => [c.id, {
    ranges: c.ranges.map(r => `${r}*`),
    excludeRanges: c.excludeRanges?.map(r => `${r}*`) ?? [],
  }])
);

export default function ChargesDetailList({ categories, totalCharges, selectedCategoryId, onSelectCategory }) {
  const sorted = [...categories].sort((a, b) => b.montant - a.montant);

  return (
    <div style={{ flex: 1, minWidth: '280px' }}>
      {sorted.map((cat, index) => {
        const isSelected = cat.id === selectedCategoryId;
        return (
        <div
          key={cat.id}
          onClick={() => onSelectCategory(cat.id)}
          style={{
            padding: '10px 8px',
            borderBottom: index < sorted.length - 1 ? '1px solid #F0F4F8' : 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            background: isSelected ? cat.color + '20' : 'transparent',
            transition: 'background 0.15s ease',
          }}
        >
          {/* Ligne principale : point coloré + libellé + montant + % */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '6px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
              {/* Dot coloré */}
              <span
                style={{
                  display: 'inline-block',
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: cat.color,
                  flexShrink: 0,
                }}
              />
              <span style={{ display: 'flex', alignItems: 'baseline', gap: '5px', overflow: 'hidden' }}>
                <span
                  style={{
                    fontSize: '13px',
                    color: '#1A202C',
                    fontWeight: isSelected ? 700 : 500,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {cat.label}
                </span>
                {RANGES_BY_ID[cat.id] && (
                  <span style={{ fontSize: '11px', color: '#A0AEC0', whiteSpace: 'nowrap' }}>
                    ({[
                      ...RANGES_BY_ID[cat.id].ranges,
                      ...RANGES_BY_ID[cat.id].excludeRanges.map(r => `sauf ${r}`),
                    ].join(', ')})
                  </span>
                )}
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                flexShrink: 0,
                marginLeft: '12px',
              }}
            >
              <span style={{ fontSize: '13px', fontWeight: isSelected ? 700 : 600, color: '#1A202C' }}>
                {formatAmountFull(cat.montant)}
              </span>
              <span
                style={{
                  fontSize: '12px',
                  color: '#718096',
                  minWidth: '46px',
                  textAlign: 'right',
                }}
              >
                {formatPercent(cat.percent)}
              </span>
            </div>
          </div>

          {/* Barre de progression */}
          <div
            style={{
              height: '6px',
              background: '#F0F4F8',
              borderRadius: '3px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${Math.min(cat.percent, 100)}%`,
                background: cat.color,
                borderRadius: '3px',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>
        );
      })}

      {/* Ligne total */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: '12px',
          borderTop: '2px solid #E2E8F0',
          marginTop: '4px',
        }}
      >
        <span style={{ fontSize: '13px', fontWeight: 700, color: '#1A202C' }}>
          Total charges
        </span>
        <span style={{ fontSize: '13px', fontWeight: 700, color: '#1A202C' }}>
          {formatAmountFull(totalCharges)}
        </span>
      </div>
    </div>
  );
}
