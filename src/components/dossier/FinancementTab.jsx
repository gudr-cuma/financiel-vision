import { CommentZone } from './DossierTable';

// ─── Helpers ────────────────────────────────────────────────────────────────

function getVal(key, variables, overrides) {
  return overrides[key] !== undefined ? overrides[key] : (variables[key] ?? '');
}

function InlineInput({ varKey, variables, overrides, onEdit, width = '100%', bold = false }) {
  return (
    <input
      type="text"
      value={getVal(varKey, variables, overrides)}
      onChange={e => onEdit(varKey, e.target.value)}
      placeholder="—"
      style={{
        width,
        border: 'none',
        borderBottom: '1px solid #E2E8F0',
        background: 'transparent',
        textAlign: 'right',
        fontSize: '13px',
        fontWeight: bold ? 700 : 400,
        color: '#1A202C',
        outline: 'none',
        padding: '2px 4px',
        boxSizing: 'border-box',
      }}
    />
  );
}

// Ligne de détail pour la col gauche (label + 1 valeur N)
function DetailRow({ prefix, label, varKey, variables, overrides, onEdit }) {
  return (
    <tr>
      <td style={{ padding: '5px 8px 5px 0', fontSize: '13px', color: '#1A202C', verticalAlign: 'middle' }}>
        {prefix && (
          <span style={{ color: '#718096', marginRight: '6px', fontWeight: 600, fontStyle: 'normal' }}>{prefix}</span>
        )}
        {label}
      </td>
      <td style={{ padding: '5px 0 5px 8px', textAlign: 'right', width: '130px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
        {varKey
          ? <InlineInput varKey={varKey} variables={variables} overrides={overrides} onEdit={onEdit} width="120px" />
          : <span style={{ color: '#A0AEC0' }}>—</span>
        }
      </td>
    </tr>
  );
}

// En-tête de section (question en italique)
function QuestionHeader({ text }) {
  return (
    <div style={{
      fontStyle: 'italic',
      fontWeight: 700,
      fontSize: '13px',
      color: '#1A202C',
      margin: '16px 0 6px',
      lineHeight: 1.4,
    }}>
      {text}
    </div>
  );
}

// Boîte résultat dans la col droite
function ResultBox({ title, varN, varN1, variables, overrides, onEdit, grey = false }) {
  const bg     = grey ? '#F0F0F0' : '#FFFFFF';
  const border = grey ? '1px solid #CBD5E0' : '1px solid #B1DCE2';

  return (
    <div style={{ border, background: bg, borderRadius: '8px', padding: '12px 14px' }}>
      <div style={{
        fontSize: '11px', fontWeight: 700, color: '#1A202C',
        textTransform: 'uppercase', letterSpacing: '0.03em',
        marginBottom: '10px', lineHeight: 1.4, textAlign: 'center',
      }}>
        {title}
      </div>
      <div style={{ display: 'flex', gap: '12px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '11px', color: '#718096', fontWeight: 600, marginBottom: '4px', textAlign: 'center' }}>N</div>
          <InlineInput varKey={varN} variables={variables} overrides={overrides} onEdit={onEdit} bold />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '11px', color: '#718096', fontWeight: 600, marginBottom: '4px', textAlign: 'center' }}>N-1</div>
          <InlineInput varKey={varN1} variables={variables} overrides={overrides} onEdit={onEdit} bold />
        </div>
      </div>
    </div>
  );
}

// ─── Composant principal ─────────────────────────────────────────────────────

export function FinancementTab({ variables, overrides, comments, onEdit, onCommentChange }) {
  const empruntRecevoir = getVal('Emprunt_recevoir', variables, overrides);

  return (
    <div>
      {/* ── Deux colonnes ── */}
      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', marginBottom: '16px' }}>

        {/* ── Col gauche ── */}
        <div style={{ flex: 3, minWidth: 0 }}>

          <QuestionHeader text="Quel est votre autofinancement net dégagé dans l'année ?" />
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <DetailRow
                label="Résultat (hors vente de matériel)"
                varKey="res_hors_revente"
                variables={variables} overrides={overrides} onEdit={onEdit}
              />
              <DetailRow
                prefix="+"
                label="Amortissements + Provisions − Reprise / provisions"
                varKey="dot_amort_reprise_prov"
                variables={variables} overrides={overrides} onEdit={onEdit}
              />
              <DetailRow
                prefix="−"
                label="Remboursement du capital des emprunts LMT"
                varKey="remb_emprunt"
                variables={variables} overrides={overrides} onEdit={onEdit}
              />
            </tbody>
          </table>

          <QuestionHeader text="Comment ont été financées vos immobilisations ?" />
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <DetailRow
                label="Achat d'immobilisation"
                varKey="achat_immo"
                variables={variables} overrides={overrides} onEdit={onEdit}
              />
              <DetailRow
                prefix="+"
                label="Augmentation P.S. CRCA et autres"
                varKey="augment_PSCRCA"
                variables={variables} overrides={overrides} onEdit={onEdit}
              />
              <DetailRow
                prefix="+"
                label="Remboursement emprunt par anticipation / Autres"
                varKey="Emprunt_anticipation"
                variables={variables} overrides={overrides} onEdit={onEdit}
              />
              <DetailRow
                prefix="−"
                label="Réalisations d'emprunt L.M.T"
                varKey="emprunt_LMT"
                variables={variables} overrides={overrides} onEdit={onEdit}
              />
              <DetailRow
                prefix="−"
                label="Revente d'immobilisations"
                varKey="revente_immo"
                variables={variables} overrides={overrides} onEdit={onEdit}
              />
              <DetailRow
                prefix="+ ou −"
                label="Variation du capital social"
                varKey="variation_KS"
                variables={variables} overrides={overrides} onEdit={onEdit}
              />
              <DetailRow
                prefix="−"
                label="Subvention d'investissement / Autres"
                varKey="subvention"
                variables={variables} overrides={overrides} onEdit={onEdit}
              />
            </tbody>
          </table>
        </div>

        {/* ── Col droite ── */}
        <div style={{ flex: 2, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'stretch', paddingTop: '36px' }}>

          <ResultBox
            title="Capacité d'autofinancement nette"
            varN="CAF" varN1="CAF_n1"
            variables={variables} overrides={overrides} onEdit={onEdit}
          />

          <div style={{ textAlign: 'center', fontSize: '24px', color: '#718096', lineHeight: 1, margin: '10px 0' }}>
            ↓
          </div>

          <ResultBox
            title="Besoins d'autofinancement / Investissement"
            varN="besoin_autofin" varN1="besoin_autofin_n1"
            variables={variables} overrides={overrides} onEdit={onEdit}
            grey
          />

          <div style={{ textAlign: 'center', fontSize: '20px', color: '#718096', lineHeight: 1, margin: '10px 0' }}>
            ═
          </div>
        </div>
      </div>

      {/* ── VARIATION DU FONDS DE ROULEMENT — pleine largeur ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        background: '#E8F5E0', border: '1px solid #A8D5A2',
        borderRadius: '8px', padding: '10px 16px',
        marginBottom: '16px',
      }}>
        <div style={{ flex: 1, fontWeight: 700, fontSize: '13px', color: '#1A202C' }}>
          VARIATION DU FONDS DE ROULEMENT
        </div>
        <span style={{ color: '#718096', fontSize: '12px', flexShrink: 0 }}>+ ou −</span>
        <div style={{ display: 'flex', gap: '16px', flexShrink: 0 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: '#718096', marginBottom: '2px' }}>N</div>
            <InlineInput varKey="var_FdR" variables={variables} overrides={overrides} onEdit={onEdit} width="110px" bold />
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: '#718096', marginBottom: '2px' }}>N-1</div>
            <InlineInput varKey="var_FdR_n1" variables={variables} overrides={overrides} onEdit={onEdit} width="110px" bold />
          </div>
        </div>
      </div>

      {/* ── Pour info ── */}
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
            background: 'white',
          }}
        />
      </div>

      <CommentZone tab="financement" comments={comments} onCommentChange={onCommentChange} />
    </div>
  );
}

export default FinancementTab;
