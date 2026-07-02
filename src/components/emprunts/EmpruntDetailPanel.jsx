import { useMemo } from 'react';
import { SlideOverPanel } from '../shared/SlideOverPanel';
import { formatAmountFull, formatPercent, formatDate } from '../../engine/formatUtils';
import { EMPRUNT_FICHE_FIELDS } from './EmpruntsTable';

const BOX_STYLE = {
  border: '1px solid #E2E8F0',
  borderRadius: '10px',
  padding: '14px 16px',
  backgroundColor: '#FAFAFA',
  marginTop: '16px',
};

function formatFicheValue(value, type) {
  if (value === null || value === undefined || value === '') return '—';
  switch (type) {
    case 'amount': return formatAmountFull(value);
    case 'percent': return formatPercent(value);
    case 'date': return formatDate(value);
    default: return String(value);
  }
}

function FicheField({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '4px 0', fontSize: '13px', borderBottom: '1px solid #F0F4F8' }}>
      <span style={{ color: '#718096' }}>{label}</span>
      <span style={{ color: '#1A202C', fontWeight: 600, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

function EmpruntFiche({ emprunt }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
      gap: '4px 24px',
      ...BOX_STYLE,
    }}>
      {EMPRUNT_FICHE_FIELDS.map((col) => (
        <FicheField key={col.key} label={col.label} value={formatFicheValue(emprunt[col.key], col.type)} />
      ))}
    </div>
  );
}

const LIGNES_COLUMNS = [
  { key: 'nLigne', label: 'N. Ligne', type: 'number' },
  { key: 'typePR', label: 'Type', type: 'text' },
  { key: 'exercice', label: 'Exercice', type: 'text' },
  { key: 'datePrevue', label: 'Date Prévue', type: 'date' },
  { key: 'dateReelle', label: 'Date Réelle', type: 'date' },
  { key: 'mtAnnuiteReel', label: 'Annuité Réel', type: 'amount' },
  { key: 'mtCapitalReel', label: 'Capital Réel', type: 'amount' },
  { key: 'mtInteretReel', label: 'Intérêt Réel', type: 'amount' },
  { key: 'mtAssuranceReel', label: 'Assurance Réel', type: 'amount' },
  { key: 'mtFraisReel', label: 'Frais Réel', type: 'amount' },
  { key: 'mtRestantDuReel', label: 'Restant Dû Réel', type: 'amount' },
  { key: 'valide', label: 'Validé', type: 'text' },
];

function formatCell(value, type) {
  if (value === null || value === undefined || value === '') return '—';
  if (type === 'amount') return formatAmountFull(value);
  if (type === 'date') return formatDate(value);
  return String(value);
}

export function EmpruntDetailPanel({ emprunt, lignesEmprunt, onClose }) {
  const lignes = useMemo(() => {
    if (!emprunt) return [];
    return lignesEmprunt
      .filter((l) => l.nEmprunt === emprunt.nEmprunt)
      .sort((a, b) => {
        const ex = String(a.exercice ?? '').localeCompare(String(b.exercice ?? ''));
        if (ex !== 0) return ex;
        return (a.nLigne ?? 0) - (b.nLigne ?? 0);
      });
  }, [emprunt, lignesEmprunt]);

  return (
    <SlideOverPanel
      isOpen={emprunt !== null}
      onClose={onClose}
      subtitle="Emprunt →"
      title={emprunt?.designation ?? '—'}
      amount={emprunt?.montant}
      width="min(1152px, 95vw)"
    >
      {emprunt && <EmpruntFiche emprunt={emprunt} />}

      {lignes.length === 0 ? (
        <div style={{ padding: '24px 0', textAlign: 'center', color: '#A0AEC0', fontSize: '13px' }}>
          Aucune ligne d'échéance pour cet emprunt.
        </div>
      ) : (
        <div style={{ overflowX: 'auto', marginTop: '16px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1100px', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: '#F7FAFC' }}>
                {LIGNES_COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    style={{
                      padding: '6px 8px',
                      textAlign: col.type === 'text' ? 'left' : 'right',
                      fontSize: '10px',
                      fontWeight: 600,
                      color: '#718096',
                      textTransform: 'uppercase',
                      borderBottom: '2px solid #E2E8F0',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lignes.map((ligne, idx) => (
                <tr key={`${ligne.nEmprunt}-${ligne.nLigne}-${idx}`} style={{ borderBottom: '1px solid #F0F4F8' }}>
                  {LIGNES_COLUMNS.map((col) => (
                    <td
                      key={col.key}
                      style={{
                        padding: '5px 8px',
                        textAlign: col.type === 'text' ? 'left' : 'right',
                        whiteSpace: 'nowrap',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {formatCell(ligne[col.key], col.type)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SlideOverPanel>
  );
}

export default EmpruntDetailPanel;
