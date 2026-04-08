import { RichCommentZone } from './RichCommentZone';

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

      <RichCommentZone
        tab="synthese"
        comments={comments}
        onCommentChange={onCommentChange}
      />
    </div>
  );
}

export default SyntheseTab;
