import { useState } from 'react';

const PERIODS = [
  { value: 'annee', label: 'Année' },
  { value: 't1', label: 'T1' },
  { value: 't2', label: 'T2' },
  { value: 's1', label: 'S1' },
  { value: 's2', label: 'S2' },
];

export default function PeriodToggle({ value, onChange }) {
  const [hoveredValue, setHoveredValue] = useState(null);

  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {PERIODS.map((period) => {
        const isActive = value === period.value;
        const isHovered = hoveredValue === period.value;

        return (
          <button
            key={period.value}
            onClick={() => onChange(period.value)}
            onMouseEnter={() => setHoveredValue(period.value)}
            onMouseLeave={() => setHoveredValue(null)}
            style={{
              padding: '6px 14px',
              fontSize: 13,
              fontWeight: isActive ? 600 : 400,
              borderRadius: 6,
              border: `1px solid ${isActive ? '#FF8200' : '#E2E8F0'}`,
              background: isActive ? '#FF8200' : (isHovered ? '#F8FAFB' : '#FFFFFF'),
              color: isActive ? '#FFFFFF' : '#718096',
              cursor: 'pointer',
              transition: 'background 0.15s, border-color 0.15s, color 0.15s',
              outline: 'none',
            }}
          >
            {period.label}
          </button>
        );
      })}
    </div>
  );
}
