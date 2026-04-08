import { useMemo } from 'react';
import { formatAmountFull } from '../../engine/formatUtils';

function formatDate(d) {
  if (!d) return '';
  const s = String(d);
  if (s.length === 8) return `${s.slice(6,8)}/${s.slice(4,6)}/${s.slice(0,4)}`;
  if (d instanceof Date) return d.toLocaleDateString('fr-FR');
  return s;
}

function fmt(n) {
  if (!n && n !== 0) return '';
  return formatAmountFull(n);
}

// ─────────────────────────────────────────────────────────────
// Panel latéral (slide-in) — écritures d'un compte
// ─────────────────────────────────────────────────────────────
export function EcrituresPanel({ compte, parsedFec, onClose }) {
  const entries = useMemo(() => {
    if (!compte || !parsedFec) return [];
    const { compteNum, compAuxNum, collectif } = compte;
    return parsedFec.entries.filter(e => {
      // Balance auxiliaire : filtre par collectif (startsWith) + compAuxNum
      if (collectif && compAuxNum) {
        return e.compteNum?.startsWith(collectif) && e.compAuxNum === compAuxNum;
      }
      // Balance générale : filtre par compteNum exact
      if (e.compteNum !== compteNum) return false;
      return true;
    });
  }, [compte, parsedFec]);

  const totDebit  = useMemo(() => entries.reduce((s, e) => s + (e.debit  ?? 0), 0), [entries]);
  const totCredit = useMemo(() => entries.reduce((s, e) => s + (e.credit ?? 0), 0), [entries]);
  const solde     = totDebit - totCredit;

  if (!compte) return null;

  const title = compte.collectif
    ? `${compte.compAuxNum} — ${compte.compAuxLib}`
    : `${compte.compteNum} — ${compte.compteLib}`;

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.18)',
          zIndex: 200,
        }}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed',
        top: 0, right: 0,
        width: '680px',
        height: '100vh',
        background: '#FFFFFF',
        boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
        zIndex: 201,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 20px 14px',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#A0AEC0', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
              Détail du compte
            </div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#1A202C', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {title}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ padding: '4px 8px', border: '1px solid #E2E8F0', borderRadius: '6px', background: '#F7FAFC', cursor: 'pointer', fontSize: '14px', color: '#718096', flexShrink: 0 }}
          >
            ✕
          </button>
        </div>

        {/* Totaux */}
        <div style={{
          display: 'flex', gap: '12px', padding: '12px 20px',
          borderBottom: '1px solid #E2E8F0',
          background: '#F8FAFB',
        }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: '#718096', marginBottom: '2px' }}>Total Débit</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#268E00' }}>{fmt(totDebit) || '—'}</div>
          </div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: '#718096', marginBottom: '2px' }}>Total Crédit</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#E53935' }}>{fmt(totCredit) || '—'}</div>
          </div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: '#718096', marginBottom: '2px' }}>Solde</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: solde >= 0 ? '#268E00' : '#E53935' }}>
              {solde >= 0 ? '' : '−'}{fmt(Math.abs(solde)) || '0'}
            </div>
          </div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: '#718096', marginBottom: '2px' }}>Écritures</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#1A202C' }}>{entries.length}</div>
          </div>
        </div>

        {/* Table écritures */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {entries.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#A0AEC0' }}>
              Aucune écriture trouvée
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                <tr style={{ background: '#F7FAFC', borderBottom: '2px solid #E2E8F0' }}>
                  <th style={{ padding: '7px 8px', textAlign: 'left',  fontWeight: 600, color: '#4A5568', whiteSpace: 'nowrap' }}>Date</th>
                  <th style={{ padding: '7px 8px', textAlign: 'left',  fontWeight: 600, color: '#4A5568', whiteSpace: 'nowrap' }}>Journal</th>
                  <th style={{ padding: '7px 8px', textAlign: 'left',  fontWeight: 600, color: '#4A5568' }}>Libellé</th>
                  <th style={{ padding: '7px 8px', textAlign: 'left',  fontWeight: 600, color: '#4A5568', whiteSpace: 'nowrap' }}>Pièce</th>
                  <th style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 600, color: '#4A5568', whiteSpace: 'nowrap' }}>Débit</th>
                  <th style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 600, color: '#4A5568', whiteSpace: 'nowrap' }}>Crédit</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e, i) => (
                  <tr
                    key={i}
                    style={{
                      background: i % 2 === 0 ? '#FFFFFF' : '#F9FAFB',
                      borderBottom: '1px solid #F0F4F8',
                    }}
                  >
                    <td style={{ padding: '5px 8px', color: '#4A5568', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                      {formatDate(e.ecritureDate)}
                    </td>
                    <td style={{ padding: '5px 8px', color: '#718096', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                      {e.journalCode}
                    </td>
                    <td style={{ padding: '5px 8px', color: '#1A202C', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {e.ecritureLib}
                    </td>
                    <td style={{ padding: '5px 8px', color: '#A0AEC0', fontFamily: 'monospace', whiteSpace: 'nowrap', fontSize: '11px' }}>
                      {e.pieceRef}
                    </td>
                    <td style={{ padding: '5px 8px', textAlign: 'right', color: '#268E00', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                      {e.debit ? fmt(e.debit) : ''}
                    </td>
                    <td style={{ padding: '5px 8px', textAlign: 'right', color: '#E53935', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                      {e.credit ? fmt(e.credit) : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}

export default EcrituresPanel;
