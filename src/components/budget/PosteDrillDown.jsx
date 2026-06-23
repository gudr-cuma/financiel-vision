import { getAccountsForPoste, getEntriesForAccount } from '../../domain/budget/drillDown';
import { formatAmountFull, formatDate } from '../../engine/formatUtils';

export function PosteDrillDown({ poste, entries, expandedCompte, onToggleCompte }) {
  const accounts = getAccountsForPoste(poste, entries);

  if (accounts.length === 0) {
    return <div style={{ fontSize: '12px', color: '#718096' }}>Aucune écriture sur les comptes mappés.</div>;
  }

  return (
    <div>
      {accounts.map(acc => (
        <div key={acc.compteNum} style={{ marginBottom: '8px' }}>
          <div
            style={{ fontSize: '12px', fontWeight: 600, color: '#1A202C', cursor: 'pointer' }}
            onClick={() => onToggleCompte(expandedCompte === acc.compteNum ? null : acc.compteNum)}
          >
            {expandedCompte === acc.compteNum ? '▾' : '▸'} {acc.compteNum} — {acc.compteLib} ({acc.nbEcritures} écritures, {formatAmountFull(acc.solde)})
          </div>
          {expandedCompte === acc.compteNum && (
            <table style={{ width: '100%', fontSize: '12px', marginTop: '4px', marginLeft: '16px' }}>
              <tbody>
                {getEntriesForAccount(acc.compteNum, poste, entries).map((e, i) => (
                  <tr key={i}>
                    <td style={smallCell}>{formatDate(e.ecritureDate)}</td>
                    <td style={smallCell}>{e.ecritureLib}</td>
                    <td style={smallCell}>{e.pieceRef}</td>
                    <td style={{ ...smallCell, textAlign: 'right' }}>{formatAmountFull(e.debit)}</td>
                    <td style={{ ...smallCell, textAlign: 'right' }}>{formatAmountFull(e.credit)}</td>
                    <td style={{ ...smallCell, textAlign: 'right', fontWeight: 600 }}>{formatAmountFull(e.soldeCumule)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ))}
    </div>
  );
}

const smallCell = { padding: '3px 6px', borderBottom: '1px solid #F1F5F9', color: '#718096' };

export default PosteDrillDown;
