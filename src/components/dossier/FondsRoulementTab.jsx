import { DossierTable, CommentZone, InfoBox } from './DossierTable';

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
      <InfoBox title="Fonds de roulement">
        <div style={{ color: '#4A5568', lineHeight: '1.6' }}>
          Le fonds de roulement constitue la marge de sécurité financière dont la Cuma a besoin pour :
        </div>
        <ul style={{ margin: '6px 0 0', paddingLeft: '20px', color: '#4A5568', lineHeight: '1.8' }}>
          <li>avancer les frais d'exploitation en attendant les entrées de travaux et le remboursement de la TVA</li>
          <li>couvrir les risques (adhérents défaillants, charges imprévues, baisse d'activité…)</li>
          <li>renforcer la confiance des banques et des prêteurs à court terme.</li>
        </ul>
      </InfoBox>

      <DossierTable title="Fonds de roulement" rows={ROWS_FDR} variables={variables} overrides={overrides} onEdit={onEdit} />

      <InfoBox title="Créances et politique des encaissements">
        Les créances correspondent au montant total des factures de travaux (TTC) non encaissées à la date de clôture.
        La trésorerie Nette Globale est le solde entre d'une part les disponibilités et les valeurs mobilières de placement
        et d'autre part les dettes financières à court terme et découverts bancaires.
      </InfoBox>

      <DossierTable title="Créances et trésorerie" rows={ROWS_CREANCES} variables={variables} overrides={overrides} onEdit={onEdit} />

      <CommentZone tab="fonds_roulement" comments={comments} onCommentChange={onCommentChange} />
    </div>
  );
}

export default FondsRoulementTab;
