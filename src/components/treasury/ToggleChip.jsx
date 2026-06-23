export default function ToggleChip({ checked, onChange, label, color }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 12px',
        fontSize: 13,
        borderRadius: 6,
        border: `1px solid ${checked ? color : '#E2E8F0'}`,
        background: checked ? `${color}1A` : '#FFFFFF',
        color: checked ? color : '#718096',
        cursor: 'pointer',
        fontWeight: checked ? 600 : 400,
        transition: 'background 0.15s, border-color 0.15s, color 0.15s',
      }}
    >
      <span
        style={{
          width: 14,
          height: 14,
          borderRadius: 3,
          border: `1.5px solid ${checked ? color : '#CBD5E0'}`,
          background: checked ? color : 'transparent',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 10,
          color: '#FFFFFF',
          lineHeight: 1,
          flexShrink: 0,
        }}
      >
        {checked ? '✓' : ''}
      </span>
      {label}
    </button>
  );
}
