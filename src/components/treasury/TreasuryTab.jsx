import useStore from '../../store/useStore';
import TreasuryKpis from './TreasuryKpis';
import TreasuryCurve from './TreasuryCurve';
import TopMovements from './TopMovements';

export default function TreasuryTab() {
  const treasuryData = useStore((s) => s.treasuryData);

  if (!treasuryData) return null;

  return (
    <div>
      <TreasuryKpis data={treasuryData} />
      <div style={{ marginTop: 16 }}>
        <TreasuryCurve data={treasuryData} />
      </div>
      <div style={{ marginTop: 16 }}>
        <TopMovements
          top10Entrees={treasuryData.top10Entrees}
          top10Sorties={treasuryData.top10Sorties}
        />
      </div>
    </div>
  );
}
