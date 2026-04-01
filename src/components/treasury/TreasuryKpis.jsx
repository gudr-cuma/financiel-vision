import { formatAmountFull } from '../../engine/formatUtils';

const KpiCard = ({ label, value, color }) => (
  <div style={{
    background: '#FFFFFF',
    border: '1px solid #E2E8F0',
    borderRadius: 8,
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  }}>
    <span style={{
      fontSize: 11,
      color: '#718096',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      fontWeight: 600,
    }}>
      {label}
    </span>
    <span style={{
      fontSize: 24,
      fontWeight: 700,
      color: color,
      lineHeight: 1.2,
    }}>
      {formatAmountFull(value)}
    </span>
  </div>
);

const getSignColor = (value) => value >= 0 ? '#268E00' : '#E53935';

export default function TreasuryKpis({ data }) {
  const {
    soldeActuel,
    soldeMini,
    soldeMaxi,
    soldeMoyen,
    totalEntrees,
    totalSorties,
  } = data;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 12,
    }}>
      <KpiCard
        label="Solde actuel"
        value={soldeActuel}
        color={getSignColor(soldeActuel)}
      />
      <KpiCard
        label="Solde mini"
        value={soldeMini}
        color={soldeMini < 0 ? '#E53935' : '#268E00'}
      />
      <KpiCard
        label="Solde maxi"
        value={soldeMaxi}
        color="#268E00"
      />
      <KpiCard
        label="Solde moyen"
        value={soldeMoyen}
        color={getSignColor(soldeMoyen)}
      />
      <KpiCard
        label="Total encaissements"
        value={totalEntrees}
        color="#268E00"
      />
      <KpiCard
        label="Total décaissements"
        value={totalSorties}
        color="#E53935"
      />
    </div>
  );
}
