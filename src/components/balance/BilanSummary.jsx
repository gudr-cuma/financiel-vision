import { formatAmountFull, formatPercent } from '../../engine/formatUtils';

/**
 * HorizontalStructureBar — a segmented horizontal bar.
 *
 * Props:
 *   title    {string}
 *   segments {Array<{ label, pct, color }>}
 */
function HorizontalStructureBar({ title, segments }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: '#718096',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          marginBottom: 6,
        }}
      >
        {title}
      </div>

      {/* Bar */}
      <div
        style={{
          display: 'flex',
          height: 20,
          borderRadius: 4,
          overflow: 'hidden',
          border: '1px solid #E2E8F0',
        }}
      >
        {segments.map((seg) => (
          <div
            key={seg.label}
            title={`${seg.label} : ${formatPercent(seg.pct)}`}
            style={{
              width: `${Math.max(seg.pct, 0)}%`,
              backgroundColor: seg.color,
              transition: 'width 400ms ease',
            }}
          />
        ))}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 12, marginTop: 5, flexWrap: 'wrap' }}>
        {segments.map((seg) => (
          <div key={seg.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: 2,
                backgroundColor: seg.color,
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: 11, color: '#718096' }}>
              {seg.label} {formatPercent(seg.pct)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * BilanSummary — widget "Bilan équilibré" showing balance status
 * and actif/passif structure bars.
 *
 * Props:
 *   bilanData {object} — full bilanData from the store
 */
export default function BilanSummary({ bilanData }) {
  const {
    actifImmobilise,
    actifCirculant,
    capitauxPropres,
    dettes,
    totalActif,
    totalPassif,
    bilanEquilibre,
    ecartBilan,
  } = bilanData;

  const safeActif = totalActif || 1; // avoid division by zero
  const safePassif = totalPassif || 1;

  const immobilisePct = (actifImmobilise._sousTotal / safeActif) * 100;
  const circulantPct = (actifCirculant._sousTotal / safeActif) * 100;

  const capitauxPct = (capitauxPropres._sousTotal / safePassif) * 100;
  const dettesPct = (dettes._sousTotal / safePassif) * 100;

  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: 8,
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 24,
        flexWrap: 'wrap',
        marginBottom: 16,
      }}
    >
      {/* Left: balance status */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: 150,
          gap: 4,
        }}
      >
        {bilanEquilibre ? (
          <>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                backgroundColor: '#E8F5E0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
                color: '#268E00',
              }}
            >
              ✓
            </div>
            <div
              style={{
                marginTop: 6,
                fontSize: 13,
                fontWeight: 700,
                color: '#268E00',
                textAlign: 'center',
              }}
            >
              Bilan équilibré
            </div>
            <div style={{ fontSize: 12, color: '#718096', textAlign: 'center' }}>
              Actif = Passif
            </div>
          </>
        ) : (
          <>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                backgroundColor: '#FFF3E0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
                color: '#FF8200',
              }}
            >
              ⚠
            </div>
            <div
              style={{
                marginTop: 6,
                fontSize: 13,
                fontWeight: 700,
                color: '#FF8200',
                textAlign: 'center',
              }}
            >
              Bilan déséquilibré
            </div>
            <div
              style={{
                fontSize: 12,
                color: '#718096',
                textAlign: 'center',
                marginTop: 2,
              }}
            >
              Écart : {formatAmountFull(Math.abs(ecartBilan))}
            </div>
          </>
        )}
      </div>

      {/* Divider */}
      <div
        style={{
          width: 1,
          alignSelf: 'stretch',
          background: '#E2E8F0',
          flexShrink: 0,
        }}
      />

      {/* Right: structure bars */}
      <div style={{ flex: 1, minWidth: 240 }}>
        <HorizontalStructureBar
          title="Structure actif"
          segments={[
            { label: 'Immobilisé', pct: immobilisePct, color: '#4A5568' },
            { label: 'Circulant', pct: circulantPct, color: '#B1DCE2' },
          ]}
        />
        <HorizontalStructureBar
          title="Structure passif"
          segments={[
            { label: 'Capitaux propres', pct: capitauxPct, color: '#FF8200' },
            { label: 'Dettes', pct: dettesPct, color: '#E53935' },
          ]}
        />
      </div>
    </div>
  );
}
