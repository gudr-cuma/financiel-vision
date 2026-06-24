import { useState } from 'react';

const GRANULARITIES = [
  { value: 'semaine', label: 'Semaine' },
  { value: 'mois', label: 'Mois' },
  { value: 'trimestre', label: 'Trimestre' },
  { value: 'semestre', label: 'Semestre' },
];

export default function GranularityToggle({ value, onChange }) {
  const [hoveredValue, setHoveredValue] = useState(null);

  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {GRANULARITIES.map((g) => {
        const isActive = value === g.value;
        const isHovered = hoveredValue === g.value;

        return (
          <button
            key={g.value}
            onClick={() => onChange(g.value)}
            onMouseEnter={() => setHoveredValue(g.value)}
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
            {g.label}
          </button>
        );
      })}
    </div>
  );
}
