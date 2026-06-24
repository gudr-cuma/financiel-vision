import { formatAmountFull } from '../../engine/formatUtils';

function AccountToggle({ checked, onChange, compteNum, compteLib }) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        cursor: 'pointer',
        fontSize: '13px',
        color: '#4A5568',
        background: checked ? '#E3F2F5' : '#F8FAFB',
        border: '1px solid #E2E8F0',
        borderRadius: '6px',
        padding: '6px 10px',
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ width: '15px', height: '15px', cursor: 'pointer' }}
      />
      <span style={{ fontFamily: 'monospace', color: '#718096' }}>{compteNum}</span>
      <span>{compteLib}</span>
    </label>
  );
}

/**
 * Sélecteur de comptes de trésorerie (51* / 53*) — filtre l'ensemble de
 * l'onglet (KPIs, courbe, Top 10, tableau d'écritures).
 *
 * Props :
 *   accounts          (AccountDetail[]) — comptes disponibles (compteNum, compteLib, solde)
 *   selectedAccounts   (string[])        — compteNum sélectionnés
 *   onChange           (string[]) => void
 */
export default function TreasuryAccountSelector({ accounts, selectedAccounts, onChange }) {
  if (!accounts || accounts.length === 0) return null;

  const toggleAccount = (compteNum, checked) => {
    if (checked) {
      onChange([...selectedAccounts, compteNum]);
    } else {
      onChange(selectedAccounts.filter((c) => c !== compteNum));
    }
  };

  const allSelected = selectedAccounts.length === accounts.length;

  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 600, color: '#718096' }}>
          Comptes de trésorerie
        </span>
        <button
          type="button"
          onClick={() => onChange(allSelected ? [] : accounts.map((a) => a.compteNum))}
          style={{
            border: 'none',
            background: 'none',
            color: '#FF8200',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            padding: 0,
          }}
        >
          {allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
        </button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {accounts.map((account) => (
          <AccountToggle
            key={account.compteNum}
            compteNum={account.compteNum}
            compteLib={account.compteLib}
            checked={selectedAccounts.includes(account.compteNum)}
            onChange={(checked) => toggleAccount(account.compteNum, checked)}
          />
        ))}
      </div>

      {!allSelected && selectedAccounts.length > 0 && (
        <div style={{ marginTop: 10, fontSize: 12, color: '#A0AEC0' }}>
          Solde des comptes sélectionnés : {formatAmountFull(
            accounts
              .filter((a) => selectedAccounts.includes(a.compteNum))
              .reduce((sum, a) => sum + a.solde, 0)
          )}
        </div>
      )}
    </div>
  );
}
