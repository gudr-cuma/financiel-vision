import { useMemo } from 'react';
import { SlideOverPanel } from '../shared/SlideOverPanel';
import { formatAmountFull, formatPercent, formatDate } from '../../engine/formatUtils';
import { IMMOBILISATION_FICHE_FIELDS } from './ImmobilisationsTable';

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

function ImmobilisationFiche({ immobilisation }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
      gap: '4px 24px',
      ...BOX_STYLE,
    }}>
      {IMMOBILISATION_FICHE_FIELDS.map((col) => (
        <FicheField key={col.key} label={col.label} value={formatFicheValue(immobilisation[col.key], col.type)} />
      ))}
    </div>
  );
}

const I2_COLUMNS = [
  { key: 'dateDebutExo', label: 'Date Début Exo', type: 'date' },
  { key: 'dateFinExo', label: 'Date Fin Exo', type: 'date' },
  { key: 'dateEffet', label: 'Date Effet', type: 'date' },
  { key: 'ecoMethode', label: 'Éco. Méthode', type: 'number' },
  { key: 'ecoDuree', label: 'Éco. Durée', type: 'number' },
  { key: 'ecoBase', label: 'Éco. Base', type: 'amount' },
  { key: 'ecoTaux', label: 'Éco. Taux', type: 'percent' },
  { key: 'ecoMtLineaire', label: 'Éco. Mt Linéaire', type: 'amount' },
  { key: 'ecoMtTotal', label: 'Éco. Mt Total', type: 'amount' },
  { key: 'ecoMtResiduel', label: 'Éco. Mt Résiduel', type: 'amount' },
  { key: 'valeurResiduelle', label: 'Valeur Résiduelle', type: 'amount' },
];

function formatCell(value, type) {
  if (value === null || value === undefined || value === '') return '—';
  if (type === 'amount') return formatAmountFull(value);
  if (type === 'percent') return formatPercent(value);
  if (type === 'date') return formatDate(value);
  return String(value);
}

export function ImmobilisationDetailPanel({ immobilisation, immoLignes, onClose }) {
  const lignes = useMemo(() => {
    if (!immobilisation) return [];
    return immoLignes
      .filter((l) => l.nBien === immobilisation.nBien)
      .sort((a, b) => {
        const da = a.dateDebutExo instanceof Date ? a.dateDebutExo.getTime() : 0;
        const db = b.dateDebutExo instanceof Date ? b.dateDebutExo.getTime() : 0;
        return da - db;
      });
  }, [immobilisation, immoLignes]);

  return (
    <SlideOverPanel
      isOpen={immobilisation !== null}
      onClose={onClose}
      subtitle="Immobilisation →"
      title={immobilisation?.libelle ?? '—'}
      amount={immobilisation?.valeurEntree}
      width="min(1152px, 95vw)"
    >
      {immobilisation && <ImmobilisationFiche immobilisation={immobilisation} />}

      {lignes.length === 0 ? (
        <div style={{ padding: '24px 0', textAlign: 'center', color: '#A0AEC0', fontSize: '13px' }}>
          Aucune ligne d'amortissement pour ce bien.
        </div>
      ) : (
        <div style={{ overflowX: 'auto', marginTop: '16px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: '#F7FAFC' }}>
                {I2_COLUMNS.map((col) => (
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
                <tr key={idx} style={{ borderBottom: '1px solid #F0F4F8' }}>
                  {I2_COLUMNS.map((col) => (
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

export default ImmobilisationDetailPanel;
