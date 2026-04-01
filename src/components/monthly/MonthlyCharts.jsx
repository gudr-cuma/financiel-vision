import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatAmountFull } from '../../engine/formatUtils';

const CHARTS_CONFIG = [
  { key: 'ca',           label: 'Chiffre d\'affaires',      color: '#31B700' },
  { key: 'margeBrute',   label: 'Marge brute',              color: '#93C90E' },
  { key: 'valeurAjoutee',label: 'Valeur Ajoutée',           color: '#00965E' },
  { key: 'ebe',          label: 'EBE',                      color: '#FF8200' },
  { key: 'rex',          label: 'Résultat d\'exploitation',  color: '#268E00' },
  { key: 'resultatNet',  label: 'Résultat net',              color: '#268E00' },
];

function CustomTooltip({ active, payload, label, formatter }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '6px',
        padding: '8px 12px',
        fontSize: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      }}
    >
      <p style={{ margin: '0 0 4px', fontWeight: 600, color: '#1A202C' }}>{label}</p>
      <p style={{ margin: 0, color: payload[0].value < 0 ? '#E53935' : '#268E00' }}>
        {formatter(payload[0].value)}
      </p>
    </div>
  );
}

function ChartCard({ config, monthly }) {
  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '8px',
        padding: '12px',
      }}
    >
      <p
        style={{
          margin: '0 0 8px',
          fontSize: '12px',
          fontWeight: 600,
          color: '#718096',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        {config.label}
      </p>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart
          data={monthly}
          margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
          barCategoryGap="30%"
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#E2E8F0"
            vertical={false}
          />
          <XAxis
            dataKey="shortLabel"
            tick={{ fontSize: 10, fill: '#718096' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis hide={true} />
          <Tooltip
            content={
              <CustomTooltip formatter={formatAmountFull} />
            }
            cursor={{ fill: '#E3F2F5', opacity: 0.6 }}
          />
          <Bar
            dataKey={config.key}
            fill={config.color}
            radius={[2, 2, 0, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function MonthlyCharts({ monthly }) {
  if (!monthly || monthly.length === 0) return null;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '16px',
      }}
    >
      {CHARTS_CONFIG.map((config) => (
        <ChartCard key={config.key} config={config} monthly={monthly} />
      ))}
    </div>
  );
}

export default MonthlyCharts;
