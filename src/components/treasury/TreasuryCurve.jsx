import { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { formatAmount, formatAmountFull, formatDate } from '../../engine/formatUtils';
import PeriodToggle from './PeriodToggle';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null;

  const dateObj = label instanceof Date ? label : new Date(label);
  const soldeEntry = payload.find((p) => p.dataKey === 'solde');
  const moyenneEntry = payload.find((p) => p.dataKey === 'moyenneMobile');

  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid #E2E8F0',
      borderRadius: 6,
      padding: '10px 14px',
      fontSize: 13,
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      minWidth: 180,
    }}>
      <div style={{ fontWeight: 600, color: '#1A202C', marginBottom: 6 }}>
        {formatDate(dateObj)}
      </div>
      {soldeEntry && (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, color: '#B1DCE2' }}>
          <span style={{ color: '#718096' }}>Solde</span>
          <span style={{ fontWeight: 500, color: soldeEntry.value >= 0 ? '#268E00' : '#E53935' }}>
            {formatAmountFull(soldeEntry.value)}
          </span>
        </div>
      )}
      {moyenneEntry && (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginTop: 4 }}>
          <span style={{ color: '#718096' }}>Moy. mobile 7j</span>
          <span style={{ fontWeight: 500, color: '#FF8200' }}>
            {formatAmountFull(moyenneEntry.value)}
          </span>
        </div>
      )}
    </div>
  );
};

export default function TreasuryCurve({ data }) {
  const [period, setPeriod] = useState('annee');

  const filteredCurve = useMemo(() => {
    return data.filterByPeriod(data.dailyCurve, period);
  }, [data, period]);

  const tickInterval = filteredCurve.length > 1
    ? Math.max(1, Math.floor(filteredCurve.length / 6))
    : 0;

  const xTickFormatter = (value) => {
    if (!value) return '';
    const dateObj = value instanceof Date ? value : new Date(value);
    if (isNaN(dateObj.getTime())) return '';
    return dateObj.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  };

  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid #E2E8F0',
      borderRadius: 8,
      padding: 16,
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        flexWrap: 'wrap',
        gap: 10,
      }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#718096' }}>
          Évolution de la trésorerie
        </span>
        <PeriodToggle value={period} onChange={setPeriod} />
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <AreaChart
          data={filteredCurve}
          margin={{ top: 8, right: 16, left: 8, bottom: 4 }}
        >
          <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tickFormatter={xTickFormatter}
            interval={tickInterval}
            tick={{ fontSize: 11, fill: '#718096' }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => formatAmount(v)}
            tick={{ fontSize: 11, fill: '#718096' }}
            tickLine={false}
            axisLine={false}
            width={72}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={0} stroke="#E2E8F0" strokeWidth={1.5} />
          <Area
            type="monotone"
            dataKey="solde"
            stroke="#B1DCE2"
            strokeWidth={2}
            fill="#B1DCE2"
            fillOpacity={0.3}
            dot={false}
            activeDot={{ r: 4, fill: '#B1DCE2', stroke: '#FFFFFF', strokeWidth: 2 }}
          />
          <Area
            type="monotone"
            dataKey="moyenneMobile"
            stroke="#FF8200"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            fill="none"
            fillOpacity={0}
            dot={false}
            activeDot={{ r: 3, fill: '#FF8200', stroke: '#FFFFFF', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>

      <div style={{
        display: 'flex',
        gap: 20,
        marginTop: 10,
        justifyContent: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#718096' }}>
          <div style={{
            width: 24,
            height: 3,
            background: '#B1DCE2',
            borderRadius: 2,
          }} />
          <span>Solde</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#718096' }}>
          <div style={{
            width: 24,
            height: 2,
            background: '#FF8200',
            borderRadius: 2,
            borderTop: '2px dashed #FF8200',
            boxSizing: 'border-box',
          }} />
          <span>Moyenne mobile 7j</span>
        </div>
      </div>
    </div>
  );
}
