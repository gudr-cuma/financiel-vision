import { formatAmountFull } from '../../engine/formatUtils';
import useStore from '../../store/useStore';
import AssetSection from './AssetSection';
import LiabilitySection from './LiabilitySection';

/**
 * BalanceOverview — equilibre banner + two-column balance sheet layout.
 *
 * Props:
 *   bilanData  {object} — full bilanData object from store
 */
export default function BalanceOverview({ bilanData }) {
  const openBilanDetail = useStore((s) => s.openBilanDetail);

  const {
    actifImmobilise,
    actifCirculant,
    capitauxPropres,
    dettes,
    totalActif,
    totalPassif,
    ecartBilan,
    bilanEquilibre,
  } = bilanData;

  return (
    <div>
      {/* Desequilibre warning banner */}
      {!bilanEquilibre && (
        <div
          style={{
            background: '#FFF3E0',
            border: '1px solid #FF8200',
            borderRadius: 6,
            padding: '10px 14px',
            marginBottom: 16,
            fontSize: 13,
            color: '#1A202C',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span>⚠️</span>
          <span>
            Attention : écart de{' '}
            <strong>{formatAmountFull(Math.abs(ecartBilan))}</strong> entre l'actif et le passif
          </span>
        </div>
      )}

      {/* Two-column layout */}
      <div style={{ display: 'flex', gap: 16 }}>
        {/* Actif */}
        <div
          style={{
            flex: 1,
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 8,
            overflow: 'hidden',
          }}
        >
          <AssetSection
            actifImmobilise={actifImmobilise}
            actifCirculant={actifCirculant}
            totalActif={totalActif}
            onPostClick={openBilanDetail}
          />
        </div>

        {/* Passif */}
        <div
          style={{
            flex: 1,
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 8,
            overflow: 'hidden',
          }}
        >
          <LiabilitySection
            capitauxPropres={capitauxPropres}
            dettes={dettes}
            totalPassif={totalPassif}
            onPostClick={openBilanDetail}
          />
        </div>
      </div>
    </div>
  );
}
