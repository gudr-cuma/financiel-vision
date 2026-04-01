import { formatAmountFull, formatDate } from '../../engine/formatUtils';

const MovementRow = ({ item, amountColor, isLast }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 0',
    borderBottom: isLast ? 'none' : '1px solid #F0F4F8',
    fontSize: 13,
  }}>
    <span style={{
      flexShrink: 0,
      color: '#718096',
      fontSize: 12,
      minWidth: 46,
    }}>
      {formatDate(item.date instanceof Date ? item.date : new Date(item.date))}
    </span>
    <span
      style={{
        flex: 1,
        color: '#1A202C',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        minWidth: 0,
      }}
      title={item.ecritureLib}
    >
      {item.ecritureLib}
    </span>
    <span style={{
      flexShrink: 0,
      fontWeight: 500,
      color: amountColor,
      textAlign: 'right',
      minWidth: 80,
    }}>
      {formatAmountFull(item.montant)}
    </span>
  </div>
);

const MovementColumn = ({ title, items, accentColor, amountColor }) => (
  <div style={{ flex: 1, minWidth: 0 }}>
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
    }}>
      <div style={{
        width: 10,
        height: 10,
        borderRadius: '50%',
        background: accentColor,
        flexShrink: 0,
      }} />
      <span style={{ fontSize: 13, fontWeight: 600, color: '#1A202C' }}>
        {title}
      </span>
    </div>
    <div>
      {items.length === 0 ? (
        <div style={{ color: '#718096', fontSize: 13, padding: '8px 0' }}>
          Aucun mouvement
        </div>
      ) : (
        items.map((item, index) => (
          <MovementRow
            key={index}
            item={item}
            amountColor={amountColor}
            isLast={index === items.length - 1}
          />
        ))
      )}
    </div>
  </div>
);

export default function TopMovements({ top10Entrees, top10Sorties }) {
  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid #E2E8F0',
      borderRadius: 8,
      padding: 16,
    }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#718096', marginBottom: 16 }}>
        Top 10 mouvements
      </div>
      <div style={{
        display: 'flex',
        gap: 24,
        alignItems: 'flex-start',
      }}>
        <MovementColumn
          title="Top 10 encaissements"
          items={top10Entrees || []}
          accentColor="#268E00"
          amountColor="#268E00"
        />
        <div style={{
          width: 1,
          alignSelf: 'stretch',
          background: '#E2E8F0',
          flexShrink: 0,
        }} />
        <MovementColumn
          title="Top 10 décaissements"
          items={top10Sorties || []}
          accentColor="#E53935"
          amountColor="#E53935"
        />
      </div>
    </div>
  );
}
