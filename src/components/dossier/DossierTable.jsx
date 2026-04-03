/**
 * Composant tableau réutilisable pour le dossier de gestion.
 * Colonnes : Libellé / N / N-1 / N-2 / Moyenne Groupe
 *
 * rows = [
 *   { label: string, keys: [keyN, keyN1, keyN2], suffix: '€'|'%'|'', isTotal: bool }
 *   | { type: 'header', label: string }
 * ]
 */

import useStore from '../../store/useStore';

function EditableCell({ varKey, variables, overrides, onEdit }) {
  const raw = overrides[varKey] !== undefined ? overrides[varKey] : (variables[varKey] ?? '');
  const display = raw !== '' ? raw : '';
  return (
    <input
      type="text"
      value={display}
      onChange={e => onEdit(varKey, e.target.value)}
      placeholder="—"
      style={{
        width: '100%',
        border: 'none',
        background: 'transparent',
        textAlign: 'right',
        fontSize: '13px',
        color: '#1A202C',
        outline: 'none',
        padding: '2px 4px',
      }}
    />
  );
}

const TH = ({ children, style = {} }) => (
  <th style={{
    padding: '8px 12px',
    fontSize: '12px',
    fontWeight: 700,
    color: '#718096',
    textAlign: 'right',
    backgroundColor: '#F8FAFB',
    borderBottom: '2px solid #E2E8F0',
    whiteSpace: 'nowrap',
    ...style,
  }}>
    {children}
  </th>
);

const TD = ({ children, isTotal, style = {} }) => (
  <td style={{
    padding: '7px 12px',
    fontSize: '13px',
    textAlign: 'right',
    borderBottom: '1px solid #F0F0F0',
    fontWeight: isTotal ? 700 : 400,
    backgroundColor: isTotal ? '#E8F5E0' : 'transparent',
    ...style,
  }}>
    {children}
  </td>
);

export function DossierTable({ title, rows, variables, overrides, onEdit }) {
  return (
    <div style={{ marginBottom: '24px' }}>
      {title && (
        <div style={{
          fontSize: '13px', fontWeight: 700, color: '#718096',
          textTransform: 'uppercase', letterSpacing: '0.05em',
          marginBottom: '8px', paddingLeft: '2px',
        }}>
          {title}
        </div>
      )}
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '35%' }} />
          <col style={{ width: '15%' }} />
          <col style={{ width: '15%' }} />
          <col style={{ width: '15%' }} />
          <col style={{ width: '20%' }} />
        </colgroup>
        <thead>
          <tr>
            <TH style={{ textAlign: 'left' }}>Libellé</TH>
            <TH>N</TH>
            <TH>N-1</TH>
            <TH>N-2</TH>
            <TH>Moy. Groupe</TH>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            if (row.type === 'header') {
              return (
                <tr key={i}>
                  <td colSpan={5} style={{
                    padding: '10px 12px 4px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#FF8200',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    backgroundColor: '#FFF3E0',
                    borderBottom: '1px solid #FFD6A0',
                  }}>
                    {row.label}
                  </td>
                </tr>
              );
            }

            const [keyN, keyN1, keyN2] = row.keys || [];
            const suffix = row.suffix || '';

            return (
              <tr key={i}>
                <td style={{
                  padding: '7px 12px',
                  fontSize: '13px',
                  color: '#1A202C',
                  borderBottom: '1px solid #F0F0F0',
                  fontWeight: row.isTotal ? 700 : 400,
                  backgroundColor: row.isTotal ? '#E8F5E0' : 'transparent',
                }}>
                  {row.label}
                  {row.sub && (
                    <div style={{ fontSize: '11px', color: '#A0AEC0', marginTop: '2px' }}>{row.sub}</div>
                  )}
                </td>
                <TD isTotal={row.isTotal}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                    {keyN ? <EditableCell varKey={keyN} variables={variables} overrides={overrides} onEdit={onEdit} /> : '—'}
                    {suffix && <span style={{ marginLeft: '2px', color: '#718096', flexShrink: 0 }}>{suffix}</span>}
                  </div>
                </TD>
                <TD isTotal={row.isTotal}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                    {keyN1 ? <EditableCell varKey={keyN1} variables={variables} overrides={overrides} onEdit={onEdit} /> : '—'}
                    {suffix && <span style={{ marginLeft: '2px', color: '#718096', flexShrink: 0 }}>{suffix}</span>}
                  </div>
                </TD>
                <TD isTotal={row.isTotal}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                    {keyN2 ? <EditableCell varKey={keyN2} variables={variables} overrides={overrides} onEdit={onEdit} /> : '—'}
                    {suffix && <span style={{ marginLeft: '2px', color: '#718096', flexShrink: 0 }}>{suffix}</span>}
                  </div>
                </TD>
                <TD isTotal={row.isTotal}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                    <EditableCell varKey={`avg_${keyN || i}`} variables={{}} overrides={overrides} onEdit={onEdit} />
                    {suffix && <span style={{ marginLeft: '2px', color: '#718096', flexShrink: 0 }}>{suffix}</span>}
                  </div>
                </TD>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function CommentZone({ tab, comments, onCommentChange }) {
  return (
    <div style={{ marginTop: '16px', marginBottom: '8px' }}>
      <div style={{
        fontSize: '12px', fontWeight: 700, color: '#718096',
        textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px',
      }}>
        Commentaires
      </div>
      <textarea
        value={comments[tab] || ''}
        onChange={e => onCommentChange(tab, e.target.value)}
        placeholder="Saisir vos commentaires..."
        rows={4}
        style={{
          width: '100%',
          padding: '10px 12px',
          fontSize: '13px',
          color: '#1A202C',
          border: '1px solid #E2E8F0',
          borderRadius: '8px',
          resize: 'vertical',
          outline: 'none',
          fontFamily: 'inherit',
          lineHeight: '1.5',
          boxSizing: 'border-box',
        }}
      />
    </div>
  );
}

export default DossierTable;
