import { useState } from 'react';
import { getAccountsForPoste } from '../../engine/drillDown';
import { AccountCard } from './AccountCard';

/**
 * AccountList — liste des comptes contribuant à un poste SIG.
 *
 * Props :
 *   sigId   (string)      — identifiant du poste SIG
 *   entries (FECEntry[])  — toutes les écritures du FEC
 */
export function AccountList({ sigId, entries }) {
  const [expandedAccount, setExpandedAccount] = useState(null);

  const accounts = getAccountsForPoste(sigId, entries);

  function handleExpand(compteNum) {
    setExpandedAccount((prev) => (prev === compteNum ? null : compteNum));
  }

  if (!accounts || accounts.length === 0) {
    return (
      <div
        style={{
          padding: '24px',
          textAlign: 'center',
          fontSize: '13px',
          color: '#A0AEC0',
        }}
      >
        Aucun compte contribuant trouvé.
      </div>
    );
  }

  return (
    <div>
      {/* Titre section */}
      <div
        style={{
          padding: '12px 0 8px',
          fontSize: '11px',
          fontWeight: 600,
          color: '#718096',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        Comptes contribuant ({accounts.length})
      </div>

      {/* Liste des cartes */}
      <div>
        {accounts.map((account) => (
          <AccountCard
            key={account.compteNum}
            account={account}
            isExpanded={expandedAccount === account.compteNum}
            onExpand={() => handleExpand(account.compteNum)}
            sigId={sigId}
            entries={entries}
          />
        ))}
      </div>
    </div>
  );
}

export default AccountList;
