export function SyntheseTab({ variables, comments, onCommentChange }) {
  return (
    <div>
      {/* Rappel identité */}
      <div style={{
        padding: '14px 16px',
        background: '#E3F2F5',
        border: '1px solid #B1DCE2',
        borderRadius: '8px',
        marginBottom: '20px',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '8px 24px',
        fontSize: '13px',
      }}>
        <div><span style={{ color: '#718096' }}>CUMA :</span> <strong>{variables.nom_cuma || '—'}</strong></div>
        <div><span style={{ color: '#718096' }}>N° agrément :</span> <strong>{variables.num_agrement || '—'}</strong></div>
        <div><span style={{ color: '#718096' }}>Période :</span> <strong>{variables.debut_periode || '—'} au {variables.fin_periode || '—'}</strong></div>
        <div><span style={{ color: '#718096' }}>Commune :</span> <strong>{variables.commune || '—'}</strong></div>
        <div><span style={{ color: '#718096' }}>Comptable :</span> <strong>{variables.comptable_nom || '—'}</strong></div>
        <div><span style={{ color: '#718096' }}>Nb adhérents :</span> <strong>{variables.nb_adherent || '—'}</strong></div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <div style={{
          fontSize: '13px', fontWeight: 700, color: '#1A202C',
          marginBottom: '8px',
        }}>
          Synthèse générale
        </div>
        <textarea
          value={comments.synthese || ''}
          onChange={e => onCommentChange('synthese', e.target.value)}
          placeholder="Saisir la synthèse générale..."
          rows={10}
          style={{
            width: '100%',
            padding: '12px 14px',
            fontSize: '13px',
            color: '#1A202C',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            resize: 'vertical',
            outline: 'none',
            fontFamily: 'inherit',
            lineHeight: '1.6',
            boxSizing: 'border-box',
          }}
        />
      </div>
    </div>
  );
}

export default SyntheseTab;
