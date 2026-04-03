import { CommentZone } from './DossierTable';
import useStore from '../../store/useStore';

function FinRow({ label, varKeyN, varKeyN1, variables, overrides, onEdit, isTotal, indent, prefix, bold }) {
  const valN = overrides[varKeyN] !== undefined ? overrides[varKeyN] : (variables[varKeyN] ?? '');
  const valN1 = varKeyN1 ? (overrides[varKeyN1] !== undefined ? overrides[varKeyN1] : (variables[varKeyN1] ?? '')) : '';

  const bgColor = isTotal ? '#E8F5E0' : 'transparent';
  const fw = (isTotal || bold) ? 700 : 400;

  return (
    <tr>
      <td style={{
        padding: '6px 12px',
        paddingLeft: indent ? `${12 + indent * 16}px` : '12px',
        fontSize: '13px',
        fontWeight: fw,
        color: '#1A202C',
        borderBottom: '1px solid #F0F0F0',
        backgroundColor: bgColor,
      }}>
        {prefix && <span style={{ color: '#718096', marginRight: '6px' }}>{prefix}</span>}
        {label}
      </td>
      <td style={{ padding: '6px 12px', textAlign: 'right', borderBottom: '1px solid #F0F0F0', backgroundColor: bgColor, fontWeight: fw }}>
        {varKeyN ? (
          <input
            type="text"
            value={valN}
            onChange={e => onEdit(varKeyN, e.target.value)}
            placeholder="—"
            style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'right', fontSize: '13px', fontWeight: fw, outline: 'none' }}
          />
        ) : ''}
      </td>
      <td style={{ padding: '6px 12px', textAlign: 'right', borderBottom: '1px solid #F0F0F0', backgroundColor: bgColor, fontWeight: fw }}>
        {varKeyN1 ? (
          <input
            type="text"
            value={valN1}
            onChange={e => onEdit(varKeyN1, e.target.value)}
            placeholder="—"
            style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'right', fontSize: '13px', fontWeight: fw, outline: 'none' }}
          />
        ) : ''}
      </td>
    </tr>
  );
}

function SectionHeader({ label }) {
  return (
    <tr>
      <td colSpan={3} style={{
        padding: '10px 12px 4px',
        fontSize: '12px',
        fontWeight: 700,
        color: '#FF8200',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        backgroundColor: '#FFF3E0',
        borderBottom: '1px solid #FFD6A0',
      }}>
        {label}
      </td>
    </tr>
  );
}

export function FinancementTab({ variables, overrides, comments, onEdit, onCommentChange }) {
  const empruntRecevoir = overrides['Emprunt_recevoir'] !== undefined
    ? overrides['Emprunt_recevoir']
    : (variables['Emprunt_recevoir'] ?? '');

  return (
    <div>
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', marginBottom: '8px' }}>
        <colgroup>
          <col style={{ width: '55%' }} />
          <col style={{ width: '22.5%' }} />
          <col style={{ width: '22.5%' }} />
        </colgroup>
        <thead>
          <tr>
            <th style={{ padding: '8px 12px', fontSize: '12px', fontWeight: 700, color: '#718096', textAlign: 'left', backgroundColor: '#F8FAFB', borderBottom: '2px solid #E2E8F0' }}>
              Libellé
            </th>
            <th style={{ padding: '8px 12px', fontSize: '12px', fontWeight: 700, color: '#718096', textAlign: 'right', backgroundColor: '#F8FAFB', borderBottom: '2px solid #E2E8F0' }}>
              N
            </th>
            <th style={{ padding: '8px 12px', fontSize: '12px', fontWeight: 700, color: '#718096', textAlign: 'right', backgroundColor: '#F8FAFB', borderBottom: '2px solid #E2E8F0' }}>
              N-1
            </th>
          </tr>
        </thead>
        <tbody>
          <SectionHeader label="Quel est votre autofinancement net dégagé dans l'année ?" />

          <FinRow label="Résultat (hors vente de matériel)" varKeyN="res_hors_revente" variables={variables} overrides={overrides} onEdit={onEdit} />
          <FinRow label="+ Amortissements + Provisions − Reprise / provisions" varKeyN="dot_amort_reprise_prov" variables={variables} overrides={overrides} onEdit={onEdit} indent={1} prefix="+" />
          <FinRow label="Capacité d'Autofinancement Nette" varKeyN="CAF" varKeyN1="CAF_n1" variables={variables} overrides={overrides} onEdit={onEdit} isTotal />
          <FinRow label="− Remboursement du capital des emprunts LMT" varKeyN="remb_emprunt" variables={variables} overrides={overrides} onEdit={onEdit} indent={1} prefix="−" />

          <SectionHeader label="Comment ont été financées vos immobilisations ?" />

          <FinRow label="Achat d'immobilisation" varKeyN="achat_immo" variables={variables} overrides={overrides} onEdit={onEdit} />
          <FinRow label="Augmentation P.S. CRCA et autres" varKeyN="augment_PSCRCA" variables={variables} overrides={overrides} onEdit={onEdit} indent={1} prefix="+" />
          <FinRow label="Remboursement emprunt par anticipation" varKeyN="Emprunt_anticipation" variables={variables} overrides={overrides} onEdit={onEdit} indent={1} prefix="+" />
          <FinRow label="= Besoins d'autofinancement / Investissement" variables={variables} overrides={overrides} onEdit={onEdit} bold />
          <FinRow label="− Réalisations d'emprunt L.M.T" varKeyN="emprunt_LMT" variables={variables} overrides={overrides} onEdit={onEdit} indent={1} prefix="−" />
          <FinRow label="− Revente d'immobilisations" varKeyN="revente_immo" variables={variables} overrides={overrides} onEdit={onEdit} indent={1} prefix="−" />
          <FinRow label="+/− Besoin / Dégagement" varKeyN="besoin_autofin" varKeyN1="besoin_autofin_n1" variables={variables} overrides={overrides} onEdit={onEdit} isTotal />
          <FinRow label="+/− Variation du capital social" varKeyN="variation_KS" variables={variables} overrides={overrides} onEdit={onEdit} indent={1} prefix="+/−" />
          <FinRow label="− Subvention d'investissement" varKeyN="subvention" variables={variables} overrides={overrides} onEdit={onEdit} indent={1} prefix="−" />
          <FinRow label="= Variation du Fonds de Roulement" varKeyN="var_FdR" varKeyN1="var_FdR_n1" variables={variables} overrides={overrides} onEdit={onEdit} isTotal />
        </tbody>
      </table>

      <div style={{
        padding: '8px 12px',
        background: '#F8FAFB',
        border: '1px solid #E2E8F0',
        borderRadius: '6px',
        fontSize: '13px',
        color: '#718096',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        <span>Pour info, montant d'emprunt à réaliser :</span>
        <input
          type="text"
          value={empruntRecevoir}
          onChange={e => onEdit('Emprunt_recevoir', e.target.value)}
          placeholder="—"
          style={{
            border: '1px solid #E2E8F0',
            borderRadius: '4px',
            padding: '3px 8px',
            fontSize: '13px',
            width: '140px',
            textAlign: 'right',
            outline: 'none',
          }}
        />
      </div>

      <CommentZone tab="financement" comments={comments} onCommentChange={onCommentChange} />
    </div>
  );
}

export default FinancementTab;
