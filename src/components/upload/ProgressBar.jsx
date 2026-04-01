export function ProgressBar({ percent }) {
  const clamped = Math.min(100, Math.max(0, percent ?? 0));

  return (
    <div style={{ width: '100%' }}>
      {/* Track */}
      <div
        style={{
          width: '100%',
          height: '4px',
          backgroundColor: '#E2E8F0',
          borderRadius: '2px',
          overflow: 'hidden',
        }}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Chargement : ${clamped}%`}
      >
        {/* Fill */}
        <div
          style={{
            height: '100%',
            width: `${clamped}%`,
            backgroundColor: '#31B700',
            borderRadius: '2px',
            transition: 'width 0.3s ease',
          }}
        />
      </div>
      {/* Label */}
      <p
        style={{
          textAlign: 'center',
          fontSize: '12px',
          color: '#718096',
          marginTop: '6px',
          marginBottom: 0,
        }}
      >
        {clamped}%
      </p>
    </div>
  );
}

export default ProgressBar;
