import useStore from '../../store/useStore';
import { SigRow } from './SigRow';
import { DetailPanel } from './DetailPanel';

export function SigTable() {
  const sigResult = useStore((s) => s.sigResult);
  const detailPanel = useStore((s) => s.detailPanel);
  const openSigDetail = useStore((s) => s.openSigDetail);
  const closeDetail = useStore((s) => s.closeDetail);

  if (!sigResult?.lines?.length) return null;

  const selectedSigId = detailPanel?.sigId ?? null;

  function handleRowClick(sigId) {
    if (selectedSigId === sigId) {
      closeDetail();
    } else {
      openSigDetail(sigId);
    }
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Tableau SIG */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}
      >
        <div className="fv-sig-scroll">
        <table
          role="table"
          aria-label="Soldes Intermédiaires de Gestion"
          style={{
            width: '100%',
            borderCollapse: 'collapse',
          }}
        >
          <thead>
            <tr role="row">
              <th
                style={{
                  padding: '12px 12px',
                  textAlign: 'left',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#718096',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  borderBottom: '2px solid #E2E8F0',
                  backgroundColor: '#F7FAFC',
                }}
              >
                Libellé
              </th>
              <th
                style={{
                  padding: '12px 12px',
                  textAlign: 'right',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#718096',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  borderBottom: '2px solid #E2E8F0',
                  backgroundColor: '#F7FAFC',
                  whiteSpace: 'nowrap',
                }}
              >
                Montant
              </th>
              <th
                style={{
                  padding: '12px 12px',
                  textAlign: 'right',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#718096',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  borderBottom: '2px solid #E2E8F0',
                  backgroundColor: '#F7FAFC',
                  whiteSpace: 'nowrap',
                }}
              >
                % CA
              </th>
              <th
                style={{
                  padding: '12px 10px',
                  borderBottom: '2px solid #E2E8F0',
                  backgroundColor: '#F7FAFC',
                  width: '32px',
                }}
                aria-hidden="true"
              />
            </tr>
          </thead>
          <tbody>
            {sigResult.lines.map((line) => (
              <SigRow
                key={line.id}
                line={line}
                isSelected={selectedSigId === line.id}
                onClick={handleRowClick}
              />
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {/* Hint */}
      <p
        style={{
          marginTop: '10px',
          fontSize: '12px',
          color: '#A0AEC0',
          textAlign: 'center',
        }}
      >
        💡 Cliquer sur une ligne pour afficher le détail des comptes et écritures
      </p>

      {/* Overlay + DetailPanel */}
      {detailPanel !== null && (
        <>
          {/* Overlay semi-transparent */}
          <div
            onClick={closeDetail}
            aria-hidden="true"
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.15)',
              zIndex: 39,
            }}
          />
          <DetailPanel />
        </>
      )}
    </div>
  );
}

export default SigTable;
