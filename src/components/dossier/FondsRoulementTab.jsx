import { DossierTable, CommentZone } from './DossierTable';

const ROWS_FDR = [
  { label: 'Fonds de roulement', keys: ['fd_roulement', 'fd_roulement_n1', 'fd_roulement_n2'], suffix: '€' },
  { label: 'Fonds de roulement / CA', keys: ['fd_roulement_ca', 'fd_roulement_ca_n1', 'fd_roulement_ca_n2'], suffix: '%' },
];

const ROWS_CREANCES = [
  { label: 'Créances / CA', sub: 'dont créances à plus d\'un an : voir détail', keys: ['creance_ca', 'creance_ca_n1', 'creance_ca_n2'], suffix: '%' },
  { label: 'Trésorerie Nette Globale', keys: ['treso_net', 'treso_net_n1', 'treso_net_n2'], suffix: '€' },
];

export function FondsRoulementTab({ variables, overrides, comments, onEdit, onCommentChange }) {
  return (
    <div>
      <div style={{
        marginBottom: '16px',
        padding: '12px 14px',
        background: '#E3F2F5',
        border: '1px solid #B1DCE2',
        borderRadius: '8px',
        fontSize: '13px',
        color: '#1A202C',
      }}>
        <div style={{ fontWeight: 700, marginBottom: '8px' }}>Fonds de roulement</div>
        <div style={{ color: '#4A5568', lineHeight: '1.6' }}>
          Le fonds de roulement constitue la marge de sécurité financière dont la Cuma a besoin pour :
        </div>
        <ul style={{ margin: '6px 0 0', paddingLeft: '20px', color: '#4A5568', lineHeight: '1.8' }}>
          <li>avancer les frais d'exploitation en attendant les entrées de travaux et le remboursement de la TVA</li>
          <li>couvrir les risques (adhérents défaillants, charges imprévues, baisse d'activité…)</li>
          <li>renforcer la confiance des banques et des prêteurs à court terme.</li>
        </ul>
      </div>

      <DossierTable
        title="Fonds de roulement"
        rows={ROWS_FDR}
        variables={variables}
        overrides={overrides}
        onEdit={onEdit}
      />

      <div style={{
        marginBottom: '16px',
        padding: '12px 14px',
        background: '#E3F2F5',
        border: '1px solid #B1DCE2',
        borderRadius: '8px',
        fontSize: '13px',
        color: '#1A202C',
      }}>
        <div style={{ fontWeight: 700, marginBottom: '8px' }}>Créances et politique des encaissements</div>
        Les créances correspondent au montant total des factures de travaux (TTC) non encaissées à la date de clôture.
        La trésorerie Nette Globale est le solde entre d'une part les disponibilités et les valeurs mobilières de placement
        et d'autre part les dettes financières à court terme et découverts bancaires.
      </div>

      <DossierTable
        title="Créances et trésorerie"
        rows={ROWS_CREANCES}
        variables={variables}
        overrides={overrides}
        onEdit={onEdit}
      />

      <CommentZone tab="fonds_roulement" comments={comments} onCommentChange={onCommentChange} />
    </div>
  );
}

export default FondsRoulementTab;
