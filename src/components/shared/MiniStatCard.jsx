/**
 * MiniStatCard — petite carte indicateur (libellé + valeur), sans sparkline.
 * Utilisée pour les widgets chiffrés au-dessus des tableaux (Emprunts,
 * Immobilisations, Capital social…).
 *
 * Props :
 *   label (string)
 *   value (string|number) — valeur déjà formatée par l'appelant
 *   color (string) — couleur du texte de la valeur
 */
export function MiniStatCard({ label, value, color = '#1A202C' }) {
  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '10px',
        padding: '14px 16px',
        border: '1px solid #E2E8F0',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        minWidth: 0,
      }}
    >
      <span
        style={{
          fontSize: '11px',
          color: '#718096',
          textTransform: 'uppercase',
          letterSpacing: '0.4px',
          fontWeight: 600,
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: '22px', fontWeight: 700, color }}>{value}</span>
    </div>
  );
}

export default MiniStatCard;
