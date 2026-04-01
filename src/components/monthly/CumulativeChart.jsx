import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { formatAmount, formatAmountFull } from '../../engine/formatUtils';

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '6px',
        padding: '10px 14px',
        fontSize: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      }}
    >
      <p style={{ margin: '0 0 6px', fontWeight: 600, color: '#1A202C' }}>{label}</p>
      {payload.map((entry) => (
        <p
          key={entry.dataKey}
          style={{
            margin: '2px 0',
            color: entry.color,
            fontWeight: 500,
          }}
        >
          {entry.name} : {formatAmountFull(entry.value)}
        </p>
      ))}
    </div>
  );
}

function CumulativeChart({ monthly }) {
  const cumulData = useMemo(() => {
    let sumCa = 0;
    let sumEbe = 0;
    return monthly.map((m) => {
      sumCa += m.ca;
      sumEbe += m.ebe;
      return { ...m, caCumul: sumCa, ebeCumul: sumEbe };
    });
  }, [monthly]);

  if (!monthly || monthly.length === 0) return null;

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '8px',
        padding: '16px',
      }}
    >
      <p
        style={{
          margin: '0 0 16px',
          fontSize: '13px',
          fontWeight: 600,
          color: '#718096',
        }}
      >
        Évolution cumulée — CA et EBE
      </p>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart
          data={cumulData}
          margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="gradCa" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#FF8200" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#FF8200" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradEbe" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#31B700" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#31B700" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
          <XAxis
            dataKey="shortLabel"
            tick={{ fontSize: 11, fill: '#718096' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#718096' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => formatAmount(v)}
            width={72}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }}
            formatter={(value) => (
              <span style={{ color: '#1A202C' }}>{value}</span>
            )}
          />
          <Area
            type="monotone"
            dataKey="caCumul"
            name="CA cumulé"
            stroke="#FF8200"
            strokeWidth={2}
            fill="url(#gradCa)"
            dot={false}
            activeDot={{ r: 4, fill: '#FF8200' }}
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="ebeCumul"
            name="EBE cumulé"
            stroke="#31B700"
            strokeWidth={2}
            fill="url(#gradEbe)"
            dot={false}
            activeDot={{ r: 4, fill: '#31B700' }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default CumulativeChart;
