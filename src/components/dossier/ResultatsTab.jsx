import { DossierTable, CommentZone } from './DossierTable';

const ROWS = [
  { label: "Chiffres d'affaires", keys: ['ca', 'ca_n1', 'ca_n2'], suffix: '€' },
  { label: "Excédent brut d'exploitation", keys: ['ebe', 'ebe_n1', 'ebe_n2'], suffix: '€' },
  { label: "Résultat courant (hors plu/moins value)", keys: ['res_courant_plu_val_n', 'res_courant_plu_val_n1', 'res_courant_plu_val_n2'], suffix: '€' },
  { label: "Plu / moins value", keys: ['plu_moins_value_n', 'plu_moins_value_n1', 'plu_moins_value_n2'], suffix: '€' },
  { label: "Résultat courant", keys: ['rc', 'rc_n1', 'rc_n2'], suffix: '€', isTotal: true },
  { label: "Résultat exceptionnel", keys: ['rex', 'rex_n1', 'rex_n2'], suffix: '€' },
  { label: "Résultat Net comptable", keys: ['rnc', 'rnc_n1', 'rnc_n2'], suffix: '€', isTotal: true },
];

export function ResultatsTab({ variables, overrides, comments, onEdit, onCommentChange }) {
  return (
    <div>
      <DossierTable rows={ROWS} variables={variables} overrides={overrides} onEdit={onEdit} />

      <div style={{
        margin: '0 0 16px',
        padding: '10px 14px',
        background: '#F8FAFB',
        border: '1px solid #E2E8F0',
        borderRadius: '8px',
        fontSize: '12px',
        color: '#718096',
        fontStyle: 'italic',
      }}>
        E.B.E. = Chiffres d'affaires − Achats − Services extérieurs − Impôts et Taxes − Charges Salariales + Subventions d'exploitation
      </div>

      <CommentZone tab="resultats" comments={comments} onCommentChange={onCommentChange} />
    </div>
  );
}

export default ResultatsTab;
