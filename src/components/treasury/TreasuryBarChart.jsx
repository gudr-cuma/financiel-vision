import { useState, useMemo } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { formatAmount, formatAmountFull } from '../../engine/formatUtils';
import { aggregateTreasuryByGranularity } from '../../engine/computeTreasury';
import GranularityToggle from './GranularityToggle';
import ToggleChip from './ToggleChip';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null;

  const entreesEntry = payload.find((p) => p.dataKey === 'entrees');
  const sortiesEntry = payload.find((p) => p.dataKey === 'sorties');
  const soldeEntry = payload.find((p) => p.dataKey === 'solde');

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
        {label}
      </div>
      {entreesEntry && (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <span style={{ color: '#718096' }}>Encaissement</span>
          <span style={{ fontWeight: 500, color: '#268E00' }}>
            {formatAmountFull(entreesEntry.value)}
          </span>
        </div>
      )}
      {sortiesEntry && (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginTop: 4 }}>
          <span style={{ color: '#718096' }}>Décaissement</span>
          <span style={{ fontWeight: 500, color: '#E53935' }}>
            {formatAmountFull(sortiesEntry.value)}
          </span>
        </div>
      )}
      {soldeEntry && (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginTop: 4 }}>
          <span style={{ color: '#718096' }}>Solde</span>
          <span style={{ fontWeight: 500, color: soldeEntry.value >= 0 ? '#268E00' : '#E53935' }}>
            {formatAmountFull(soldeEntry.value)}
          </span>
        </div>
      )}
    </div>
  );
};

export default function TreasuryBarChart({ data }) {
  const [granularity, setGranularity] = useState('mois');
  const [showSolde, setShowSolde] = useState(true);

  const buckets = useMemo(
    () => aggregateTreasuryByGranularity(data.dailyCurve, granularity),
    [data, granularity]
  );

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
          Encaissements / Décaissements
        </span>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <ToggleChip
            checked={showSolde}
            onChange={setShowSolde}
            label="Solde"
            color="#B1DCE2"
          />
          <GranularityToggle value={granularity} onChange={setGranularity} />
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart
          data={buckets}
          margin={{ top: 8, right: 16, left: 8, bottom: 4 }}
          barGap={2}
        >
          <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
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
          <Bar dataKey="entrees" name="Encaissement" fill="#31B700" radius={[3, 3, 0, 0]} />
          <Bar dataKey="sorties" name="Décaissement" fill="#E53935" radius={[3, 3, 0, 0]} />
          {showSolde && (
            <Line
              type="monotone"
              dataKey="solde"
              name="Solde"
              stroke="#B1DCE2"
              strokeWidth={2}
              dot={{ r: 3, fill: '#B1DCE2' }}
              activeDot={{ r: 4, fill: '#B1DCE2', stroke: '#FFFFFF', strokeWidth: 2 }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>

      <div style={{
        display: 'flex',
        gap: 20,
        marginTop: 10,
        justifyContent: 'center',
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#718096' }}>
          <div style={{ width: 12, height: 12, background: '#31B700', borderRadius: 3 }} />
          <span>Encaissement</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#718096' }}>
          <div style={{ width: 12, height: 12, background: '#E53935', borderRadius: 3 }} />
          <span>Décaissement</span>
        </div>
        {showSolde && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#718096' }}>
            <div style={{ width: 24, height: 3, background: '#B1DCE2', borderRadius: 2 }} />
            <span>Solde</span>
          </div>
        )}
      </div>
    </div>
  );
}
