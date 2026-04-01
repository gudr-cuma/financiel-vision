export function Badge({ code, className = '' }) {
  return (
    <span
      className={className}
      style={{
        backgroundColor: '#FFF3E0',
        color: '#FF8200',
        border: '1px solid #FFD49A',
        borderRadius: '4px',
        padding: '2px 8px',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        fontSize: '13px',
        fontWeight: 500,
        display: 'inline-block',
        lineHeight: '1.4',
        whiteSpace: 'nowrap',
      }}
    >
      {code}
    </span>
  );
}

export default Badge;
