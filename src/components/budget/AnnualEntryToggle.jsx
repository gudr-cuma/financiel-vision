import { useState } from 'react';

/**
 * Saisie d'un montant annuel pour un poste, réparti automatiquement sur les mois
 * de l'exercice (cf. domain/budget/calculs.js#repartirMontantAnnuel).
 */
export function AnnualEntryToggle({ onApply }) {
  const [value, setValue] = useState('');

  const handleApply = () => {
    const montant = parseFloat(value);
    if (!Number.isFinite(montant)) return;
    onApply(montant);
    setValue('');
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <input
        type="number"
        step="0.01"
        placeholder="Montant annuel"
        value={value}
        onChange={e => setValue(e.target.value)}
        style={{ width: '110px', padding: '5px 8px', fontSize: '12px', border: '1px solid #E2E8F0', borderRadius: '6px' }}
      />
      <button
        onClick={handleApply}
        title="Répartir également sur les mois de l'exercice"
        style={{
          padding: '5px 10px', fontSize: '12px', fontWeight: 600, color: '#FF8200',
          background: '#FFF3E0', border: '1px solid #FFD6A0', borderRadius: '6px', cursor: 'pointer',
        }}
      >
        Répartir
      </button>
    </div>
  );
}

export default AnnualEntryToggle;
