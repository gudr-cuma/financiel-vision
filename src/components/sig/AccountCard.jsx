import { useState } from 'react';
import { formatAmount } from '../../engine/formatUtils';
import { Badge } from '../shared/Badge';
import { EntryFilter } from './EntryFilter';
import { EntryTable } from './EntryTable';
import { getEntriesForAccount } from '../../engine/drillDown';

/**
 * AccountCard — carte d'un compte contribuant au poste SIG.
 *
 * Props :
 *   account    (AccountDetail) — détail du compte (compteNum, compteLib, nbEcritures, solde)
 *   isExpanded (bool)          — si la carte est dépliée
 *   onExpand   (fn)            — callback pour basculer l'état
 *   sigId      (string)        — identifiant du poste SIG
 *   entries    (FECEntry[])    — toutes les écritures du FEC
 */
export function AccountCard({ account, isExpanded, onExpand, sigId, entries }) {
  const [filterText, setFilterText] = useState('');

  const isNegative = account.solde < 0;

  // Charger les écritures uniquement si déplié
  const accountEntries = isExpanded
    ? getEntriesForAccount(account.compteNum, sigId, entries)
    : [];

  return (
    <div
      style={{
        border: '1px solid #E2E8F0',
        borderRadius: '8px',
        overflow: 'hidden',
        marginBottom: '8px',
        backgroundColor: '#ffffff',
      }}
    >
      {/* Header de la carte */}
      <button
        onClick={onExpand}
        aria-expanded={isExpanded}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '12px 14px',
          backgroundColor: isExpanded ? '#F0F9FF' : '#FAFAFA',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'background-color 150ms',
        }}
        onMouseEnter={(e) => {
          if (!isExpanded) e.currentTarget.style.backgroundColor = '#F7FAFC';
        }}
        onMouseLeave={(e) => {
          if (!isExpanded) e.currentTarget.style.backgroundColor = '#FAFAFA';
        }}
      >
        {/* Chevron */}
        <span
          aria-hidden="true"
          style={{
            fontSize: '14px',
            color: '#718096',
            transition: 'transform 200ms',
            transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
            display: 'inline-block',
            flexShrink: 0,
          }}
        >
          ▼
        </span>

        {/* Badge code compte */}
        <Badge code={account.compteNum} />

        {/* Libellé compte */}
        <span
          style={{
            flex: 1,
            fontSize: '13px',
            fontWeight: 500,
            color: '#2D3748',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={account.compteLib}
        >
          {account.compteLib || 'Sans libellé'}
        </span>

        {/* Nb écritures */}
        <span
          style={{
            fontSize: '12px',
            color: '#A0AEC0',
            flexShrink: 0,
          }}
        >
          {account.nbEcritures} écriture{account.nbEcritures > 1 ? 's' : ''}
        </span>

        {/* Montant */}
        <span
          style={{
            fontSize: '14px',
            fontWeight: 600,
            color: isNegative ? '#E53935' : '#1A202C',
            flexShrink: 0,
            minWidth: '90px',
            textAlign: 'right',
          }}
        >
          {formatAmount(account.solde, Math.abs(account.solde) >= 1000)}
        </span>
      </button>

      {/* Contenu déplié */}
      {isExpanded && (
        <div style={{ padding: '12px 14px', borderTop: '1px solid #E2E8F0' }}>
          <EntryFilter value={filterText} onChange={setFilterText} />
          <EntryTable entries={accountEntries} filterText={filterText} />
        </div>
      )}
    </div>
  );
}

export default AccountCard;
