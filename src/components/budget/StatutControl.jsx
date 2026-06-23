import { useState } from 'react';
import useAuthStore from '../../store/useAuthStore';
import useBudgetStore from '../../store/useBudgetStore';
import { getTransitionsPossibles } from '../../domain/budget/regles';

export const STATUT_LABELS = {
  brouillon: 'Brouillon',
  soumis: 'Soumis',
  valide: 'Validé',
  cloture: 'Clôturé',
  revise: 'Révisé',
};

export const STATUT_COLORS = {
  brouillon: { bg: '#F8FAFB', color: '#718096' },
  soumis: { bg: '#FFF3E0', color: '#E57300' },
  valide: { bg: '#E8F5E0', color: '#268E00' },
  cloture: { bg: '#E3F2F5', color: '#1A202C' },
  revise: { bg: '#FFF3E0', color: '#E57300' },
};

const TRANSITION_LABELS = {
  'brouillon>soumis': 'Soumettre',
  'soumis>valide': 'Valider',
  'soumis>brouillon': '↩ Renvoyer en brouillon',
  'valide>cloture': 'Clôturer',
  'valide>revise': 'Marquer à réviser',
  'valide>soumis': '↩ Renvoyer en soumission',
  'cloture>valide': '↩ Rouvrir (repasser en validé)',
  'revise>valide': 'Valider la révision',
};

function formatDateHeure(iso) {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));
}

export function StatutBadge({ statut }) {
  const c = STATUT_COLORS[statut] ?? STATUT_COLORS.brouillon;
  return (
    <span style={{
      display: 'inline-block', padding: '2px 10px', borderRadius: '999px',
      fontSize: '12px', fontWeight: 600, background: c.bg, color: c.color,
    }}>
      {STATUT_LABELS[statut] ?? statut}
    </span>
  );
}

export function StatutControl({ budget, variant = 'compact' }) {
  const changerStatutBudget = useBudgetStore(s => s.changerStatutBudget);
  const currentUser = useAuthStore(s => s.currentUser);
  const [pendingTarget, setPendingTarget] = useState(null);
  const [commentaire, setCommentaire] = useState('');
  const [error, setError] = useState(null);
  const [showHistorique, setShowHistorique] = useState(false);

  const transitions = getTransitionsPossibles(budget.statut);

  const handleClick = (cible) => {
    setError(null);
    if (variant === 'compact') {
      const result = changerStatutBudget(budget.id, cible);
      if (!result.ok) setError(result.error);
      return;
    }
    setPendingTarget(cible);
    setCommentaire('');
  };

  const handleConfirm = () => {
    const result = changerStatutBudget(budget.id, pendingTarget, commentaire);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setPendingTarget(null);
    setCommentaire('');
    setError(null);
  };

  const handleCancel = () => {
    setPendingTarget(null);
    setCommentaire('');
    setError(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <StatutBadge statut={budget.statut} />
        {transitions.map((cible) => (
          <button
            key={cible}
            type="button"
            disabled={!currentUser}
            title={!currentUser ? 'Connectez-vous pour modifier le statut' : undefined}
            onClick={() => handleClick(cible)}
            style={actionBtnStyle}
          >
            {TRANSITION_LABELS[`${budget.statut}>${cible}`]}
          </button>
        ))}
        {variant === 'full' && budget.historique?.length > 0 && (
          <button type="button" onClick={() => setShowHistorique(v => !v)} style={linkBtnStyle}>
            {showHistorique ? 'Masquer historique' : 'Historique'}
          </button>
        )}
      </div>

      {error && <div style={{ fontSize: '12px', color: '#E53935' }}>{error}</div>}

      {variant === 'full' && pendingTarget && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '8px', border: '1px solid #E2E8F0', borderRadius: '6px' }}>
          <textarea
            placeholder="Commentaire (optionnel)"
            value={commentaire}
            onChange={e => setCommentaire(e.target.value)}
            style={{ fontSize: '13px', padding: '6px', border: '1px solid #E2E8F0', borderRadius: '4px', resize: 'vertical' }}
          />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" onClick={handleConfirm} style={confirmBtnStyle}>Confirmer</button>
            <button type="button" onClick={handleCancel} style={cancelBtnStyle}>Annuler</button>
          </div>
        </div>
      )}

      {variant === 'full' && showHistorique && (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {(budget.historique ?? []).map((h) => (
            <li key={h.id} style={{ fontSize: '12px', color: '#718096' }}>
              {STATUT_LABELS[h.de] ?? h.de} → {STATUT_LABELS[h.vers] ?? h.vers} · {formatDateHeure(h.date)} · {h.auteur?.nom ?? h.auteur?.email}
              {h.commentaire ? ` · « ${h.commentaire} »` : ''}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const actionBtnStyle = {
  padding: '4px 10px', fontSize: '12px', fontWeight: 600, color: '#1A202C',
  background: '#FFFFFF', border: '1px solid #B1DCE2', borderRadius: '6px', cursor: 'pointer',
};

const linkBtnStyle = {
  padding: '4px 6px', fontSize: '12px', color: '#718096',
  background: 'transparent', border: 'none', cursor: 'pointer', textDecoration: 'underline',
};

const confirmBtnStyle = {
  padding: '6px 12px', fontSize: '12px', fontWeight: 700, color: '#FFFFFF',
  background: '#31B700', border: 'none', borderRadius: '6px', cursor: 'pointer',
};

const cancelBtnStyle = {
  padding: '6px 12px', fontSize: '12px', color: '#718096',
  background: 'transparent', border: '1px solid #E2E8F0', borderRadius: '6px', cursor: 'pointer',
};

export default StatutControl;
