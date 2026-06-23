import { useState } from 'react';

const VIEWS = [
  { value: 'courbe', label: '📈 Courbe' },
  { value: 'histogramme', label: '📊 Histogramme' },
];

export default function TreasuryChartSwitch({ value, onChange }) {
  const [hoveredValue, setHoveredValue] = useState(null);

  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {VIEWS.map((v) => {
        const isActive = value === v.value;
        const isHovered = hoveredValue === v.value;

        return (
          <button
            key={v.value}
            onClick={() => onChange(v.value)}
            onMouseEnter={() => setHoveredValue(v.value)}
            onMouseLeave={() => setHoveredValue(null)}
            style={{
              padding: '7px 16px',
              fontSize: 13,
              fontWeight: isActive ? 600 : 400,
              borderRadius: 6,
              border: `1px solid ${isActive ? '#31B700' : '#E2E8F0'}`,
              background: isActive ? '#31B700' : (isHovered ? '#F8FAFB' : '#FFFFFF'),
              color: isActive ? '#FFFFFF' : '#718096',
              cursor: 'pointer',
              transition: 'background 0.15s, border-color 0.15s, color 0.15s',
              outline: 'none',
            }}
          >
            {v.label}
          </button>
        );
      })}
    </div>
  );
}
