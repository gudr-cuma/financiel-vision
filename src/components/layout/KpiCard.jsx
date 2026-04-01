import { formatAmount } from '../../engine/formatUtils';
import { Sparkline } from '../shared/Sparkline';

/**
 * KpiCard — affiche un indicateur clé avec sparkline.
 *
 * Props :
 *   label       (string)   — libellé de l'indicateur
 *   value       (number)   — valeur numérique
 *   subInfo     (string?)  — information complémentaire sous le montant
 *   sparklineData (number[]) — tableau de 12 valeurs pour la sparkline
 *   color       (string)   — couleur des barres sparkline
 */
export function KpiCard({ label, value, subInfo, sparklineData, color = '#31B700' }) {
  const isNegative = typeof value === 'number' && value < 0;
  const formattedAmount = formatAmount(value, true);

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        border: '1px solid #E2E8F0',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        minWidth: 0,
      }}
    >
      {/* Label */}
      <span
        style={{
          fontSize: '12px',
          color: '#718096',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          fontWeight: 500,
        }}
      >
        {label}
      </span>

      {/* Amount */}
      <span
        style={{
          fontSize: '28px',
          fontWeight: 700,
          color: isNegative ? '#E53935' : '#1A202C',
          lineHeight: '1.1',
        }}
      >
        {formattedAmount}
      </span>

      {/* SubInfo */}
      {subInfo && (
        <span
          style={{
            fontSize: '12px',
            color: '#718096',
          }}
        >
          {subInfo}
        </span>
      )}

      {/* Sparkline */}
      {sparklineData && sparklineData.length > 0 && (
        <div style={{ marginTop: '8px' }}>
          <Sparkline data={sparklineData} color={color} height={36} />
        </div>
      )}
    </div>
  );
}

export default KpiCard;
