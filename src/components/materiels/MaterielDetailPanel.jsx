import { SlideOverPanel } from '../shared/SlideOverPanel';
import { formatAmountFull, formatDate } from '../../engine/formatUtils';
import { MATERIEL_FICHE_FIELDS } from './MaterielsTable';

const BOX_STYLE = {
  border: '1px solid #E2E8F0',
  borderRadius: '10px',
  padding: '14px 16px',
  backgroundColor: '#FAFAFA',
  marginTop: '16px',
};

function formatFicheValue(value, type) {
  if (value === null || value === undefined || value === '') return '—';
  if (type === 'amount') return formatAmountFull(value);
  if (type === 'date') return formatDate(value);
  return String(value);
}

function FicheField({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '4px 0', fontSize: '13px', borderBottom: '1px solid #F0F4F8' }}>
      <span style={{ color: '#718096' }}>{label}</span>
      <span style={{ color: '#1A202C', fontWeight: 600, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

export function MaterielDetailPanel({ materiel, onClose }) {
  return (
    <SlideOverPanel
      isOpen={materiel !== null}
      onClose={onClose}
      subtitle="Matériel →"
      title={materiel?.libelle ?? '—'}
      amount={materiel?.mtAchat}
      width="min(960px, 95vw)"
    >
      {materiel && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '4px 24px',
          ...BOX_STYLE,
        }}>
          {MATERIEL_FICHE_FIELDS.map((col) => (
            <FicheField key={col.key} label={col.label} value={formatFicheValue(materiel[col.key], col.type)} />
          ))}
        </div>
      )}
    </SlideOverPanel>
  );
}

export default MaterielDetailPanel;
