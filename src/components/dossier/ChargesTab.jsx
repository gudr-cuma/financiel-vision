import { DossierTable, CommentZone } from './DossierTable';

const ROWS_ENTRETIEN = [
  { label: 'Charges entretien réparation corrigé (net du remboursement d\'assurances)', keys: ['entretien', 'entretien_n1', 'entretien_n2'], suffix: '€' },
  { label: 'Entretien & réparation corrigé / CA corrigé', keys: ['entretien_ca', 'entretien_ca_n1', 'entretien_ca_n2'], suffix: '%' },
  { label: 'Amortissement / CA corrigé', keys: ['amort_ca', 'amort_ca_n1', 'amort_ca_n2'], suffix: '%' },
  { label: 'Taux de vétusté', keys: ['tx_vetuste', 'tx_vetuste_n1', 'tx_vetuste_n2'], suffix: '%' },
];

const ROWS_AUTRES = [
  { label: 'Charges salariales', keys: ['chgsal', 'chgsal_n1', 'chgsal_n2'], suffix: '€' },
  { label: 'Charges salariales / CA corrigé', keys: ['chgsal_ca', 'chgsal_ca_n1', 'chgsal_ca_n2'], suffix: '%' },
  { label: 'Carburant', keys: ['carburant', 'carburant_n1', 'carburant_n2'], suffix: '€' },
  { label: 'Frais financiers / CA corrigé', keys: ['ffinancier_ca', 'ffinancier_ca_n1', 'ffinancier_ca_n2'], suffix: '%' },
];

export function ChargesTab({ variables, overrides, comments, onEdit, onCommentChange }) {
  return (
    <div>
      <div style={{
        marginBottom: '16px',
        padding: '10px 14px',
        background: '#F8FAFB',
        border: '1px solid #E2E8F0',
        borderRadius: '8px',
        fontSize: '12px',
        color: '#718096',
        fontStyle: 'italic',
      }}>
        Note : Ces ratios sont calculés par rapport à un chiffre d'affaires corrigé des prestations réalisées par d'autres CUMA.
      </div>

      <DossierTable
        title="Frais d'entretien et taux de vétusté"
        rows={ROWS_ENTRETIEN}
        variables={variables}
        overrides={overrides}
        onEdit={onEdit}
      />

      <DossierTable
        title="Autres charges"
        rows={ROWS_AUTRES}
        variables={variables}
        overrides={overrides}
        onEdit={onEdit}
      />

      <CommentZone tab="charges" comments={comments} onCommentChange={onCommentChange} />
    </div>
  );
}

export default ChargesTab;
