import { EditableCell, getVal, CommentZone } from './DossierTable';

function Separator({ char, size = '24px' }) {
  return (
    <div style={{ textAlign: 'center', fontSize: size, color: '#718096', lineHeight: 1, margin: '10px 0' }}>
      {char}
    </div>
  );
}

function DetailRow({ prefix, label, varKey, variables, overrides, onEdit }) {
  return (
    <tr>
      <td style={{ padding: '5px 8px 5px 0', fontSize: '13px', color: '#1A202C', verticalAlign: 'middle' }}>
        {prefix && <span style={{ color: '#718096', marginRight: '6px', fontWeight: 600 }}>{prefix}</span>}
        {label}
      </td>
      <td style={{ padding: '5px 0 5px 8px', textAlign: 'right', width: '130px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
        {varKey
          ? <EditableCell varKey={varKey} variables={variables} overrides={overrides} onEdit={onEdit} width="120px" underline />
          : <span style={{ color: '#A0AEC0' }}>—</span>
        }
      </td>
    </tr>
  );
}

function QuestionHeader({ text }) {
  return (
    <div style={{ fontStyle: 'italic', fontWeight: 700, fontSize: '13px', color: '#1A202C', margin: '16px 0 6px', lineHeight: 1.4 }}>
      {text}
    </div>
  );
}

function ResultBox({ title, varN, varN1, variables, overrides, onEdit, grey = false }) {
  return (
    <div style={{
      border: grey ? '1px solid #CBD5E0' : '1px solid #B1DCE2',
      background: grey ? '#F0F0F0' : '#FFFFFF',
      borderRadius: '8px', padding: '12px 14px',
    }}>
      <div style={{ fontSize: '11px', fontWeight: 700, color: '#1A202C', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '10px', lineHeight: 1.4, textAlign: 'center' }}>
        {title}
      </div>
      <div style={{ display: 'flex', gap: '12px' }}>
        {[{ label: 'N', key: varN }, { label: 'N-1', key: varN1 }].map(({ label, key }) => (
          <div key={label} style={{ flex: 1 }}>
            <div style={{ fontSize: '11px', color: '#718096', fontWeight: 600, marginBottom: '4px', textAlign: 'center' }}>{label}</div>
            <EditableCell varKey={key} variables={variables} overrides={overrides} onEdit={onEdit} bold underline />
          </div>
        ))}
      </div>
    </div>
  );
}

export function FinancementTab({ variables, overrides, comments, onEdit, onCommentChange }) {
  return (
    <div>
      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', marginBottom: '16px' }}>

        {/* Col gauche — détail des flux */}
        <div style={{ flex: 3, minWidth: 0 }}>
          <QuestionHeader text="Quel est votre autofinancement net dégagé dans l'année ?" />
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <DetailRow label="Résultat (hors vente de matériel)" varKey="res_hors_revente" variables={variables} overrides={overrides} onEdit={onEdit} />
              <DetailRow prefix="+" label="Amortissements + Provisions − Reprise / provisions" varKey="dot_amort_reprise_prov" variables={variables} overrides={overrides} onEdit={onEdit} />
              <DetailRow prefix="−" label="Remboursement du capital des emprunts LMT" varKey="remb_emprunt" variables={variables} overrides={overrides} onEdit={onEdit} />
            </tbody>
          </table>

          <QuestionHeader text="Comment ont été financées vos immobilisations ?" />
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <DetailRow label="Achat d'immobilisation" varKey="achat_immo" variables={variables} overrides={overrides} onEdit={onEdit} />
              <DetailRow prefix="+" label="Augmentation P.S. CRCA et autres" varKey="augment_PSCRCA" variables={variables} overrides={overrides} onEdit={onEdit} />
              <DetailRow prefix="+" label="Remboursement emprunt par anticipation / Autres" varKey="Emprunt_anticipation" variables={variables} overrides={overrides} onEdit={onEdit} />
              <DetailRow prefix="−" label="Réalisations d'emprunt L.M.T" varKey="emprunt_LMT" variables={variables} overrides={overrides} onEdit={onEdit} />
              <DetailRow prefix="−" label="Revente d'immobilisations" varKey="revente_immo" variables={variables} overrides={overrides} onEdit={onEdit} />
              <DetailRow prefix="+ ou −" label="Variation du capital social" varKey="variation_KS" variables={variables} overrides={overrides} onEdit={onEdit} />
              <DetailRow prefix="−" label="Subvention d'investissement / Autres" varKey="subvention" variables={variables} overrides={overrides} onEdit={onEdit} />
            </tbody>
          </table>
        </div>

        {/* Col droite — totaux N / N-1 */}
        <div style={{ flex: 2, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'stretch', paddingTop: '36px' }}>
          <ResultBox title="Capacité d'autofinancement nette" varN="CAF" varN1="CAF_n1" variables={variables} overrides={overrides} onEdit={onEdit} />
          <Separator char="↓" />
          <ResultBox title="Besoins d'autofinancement / Investissement" varN="besoin_autofin" varN1="besoin_autofin_n1" variables={variables} overrides={overrides} onEdit={onEdit} grey />
          <Separator char="═" size="20px" />
        </div>
      </div>

      {/* VARIATION DU FONDS DE ROULEMENT */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#E8F5E0', border: '1px solid #A8D5A2', borderRadius: '8px', padding: '10px 16px', marginBottom: '16px' }}>
        <div style={{ flex: 1, fontWeight: 700, fontSize: '13px', color: '#1A202C' }}>
          VARIATION DU FONDS DE ROULEMENT
        </div>
        <span style={{ color: '#718096', fontSize: '12px', flexShrink: 0 }}>+ ou −</span>
        <div style={{ display: 'flex', gap: '16px', flexShrink: 0 }}>
          {[{ label: 'N', key: 'var_FdR' }, { label: 'N-1', key: 'var_FdR_n1' }].map(({ label, key }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: '#718096', marginBottom: '2px' }}>{label}</div>
              <EditableCell varKey={key} variables={variables} overrides={overrides} onEdit={onEdit} width="110px" bold underline />
            </div>
          ))}
        </div>
      </div>

      {/* Pour info */}
      <div style={{ padding: '8px 12px', background: '#F8FAFB', border: '1px solid #E2E8F0', borderRadius: '6px', fontSize: '13px', color: '#718096', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span>Pour info, montant d'emprunt à réaliser :</span>
        <input
          type="text"
          value={getVal('Emprunt_recevoir', variables, overrides)}
          onChange={e => onEdit('Emprunt_recevoir', e.target.value)}
          placeholder="—"
          style={{ border: '1px solid #E2E8F0', borderRadius: '4px', padding: '3px 8px', fontSize: '13px', width: '140px', textAlign: 'right', outline: 'none', background: 'white' }}
        />
      </div>

      <CommentZone tab="financement" comments={comments} onCommentChange={onCommentChange} />
    </div>
  );
}

export default FinancementTab;
