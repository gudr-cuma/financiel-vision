import { DossierTable, CommentZone } from './DossierTable';

const ROWS_CS = [
  { label: 'Capital Social / CA', keys: ['CS_CA', 'CS_CA_n1', 'CS_CA_n2'], suffix: '%' },
  { label: 'Capital Social / valeur brute du matériel', keys: ['CS_val_brute_mat', 'CS_val_brute_mat_n1', 'CS_val_brute_mat_n2'], suffix: '%' },
  { label: 'Capital Social / capitaux propres', keys: ['CS_k_propres', 'CS_k_propres_n1', 'CS_k_propres_n2'], suffix: '%' },
];

const ROWS_ENDETTE = [
  { label: 'Taux d\'endettement MT et LT', keys: ['tx_endette', 'tx_endette_n1', 'tx_endette_n2'], suffix: '%' },
  { label: 'Capitaux Propres / passif (autonomie financière)', keys: ['k_propres_passif', 'k_propres_passif_n1', 'k_propres_passif_n2'], suffix: '%' },
  { label: 'Capitaux Propres / Capitaux permanents', keys: ['Capitaux_Permanent', 'Capitaux_Permanent_n1', 'Capitaux_Permanent_n2'], suffix: '%' },
];

export function CapitalSocialTab({ variables, overrides, comments, onEdit, onCommentChange }) {
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
        Le capital social à souscrire par les adhérents dans le cadre de l'engagement d'activité est défini dans l'Article 14 des statuts de la Cuma.
      </div>

      <DossierTable
        title="Capital social"
        rows={ROWS_CS}
        variables={variables}
        overrides={overrides}
        onEdit={onEdit}
      />

      <DossierTable
        title="Endettement et autonomie"
        rows={ROWS_ENDETTE}
        variables={variables}
        overrides={overrides}
        onEdit={onEdit}
      />

      <CommentZone tab="capital_social" comments={comments} onCommentChange={onCommentChange} />
    </div>
  );
}

export default CapitalSocialTab;
