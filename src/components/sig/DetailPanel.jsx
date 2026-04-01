import { useEffect, useRef, useState } from 'react';
import useStore from '../../store/useStore';
import { formatAmountFull, formatAmount } from '../../engine/formatUtils';
import { AccountList } from './AccountList';
import { AccountCard } from './AccountCard';
import { getAccountsForBilan, getEntriesForBilanAccount } from '../../engine/drillDown';
import { Badge } from '../shared/Badge';
import { EntryFilter } from './EntryFilter';
import { EntryTable } from './EntryTable';

// ---------------------------------------------------------------------------
// Ranges for each bilan post id — used to call getAccountsForBilan
// ---------------------------------------------------------------------------
const BILAN_RANGES = {
  immob_incorporelles: { ranges: ['20', '26', '27', '280', '290', '296', '297'] },
  immob_corporelles: { ranges: ['21', '22', '23', '281', '282', '283', '284', '285', '286', '287', '288'] },
  immob_financieres: { ranges: ['25', '291', '293', '295'] },
  stocks: { ranges: ['3'] },
  creances_adherents: { ranges: ['45', '495'] },
  creances_exploitation: { ranges: ['409', '41', '491'] },
  creances_fiscales: { ranges: ['44'] },
  autres_creances: { ranges: ['46', '47'] },
  regularisations_actif: { ranges: ['486', '487'] },
  disponibilites: { ranges: ['50', '51', '53'] },
  capital_social: { ranges: ['101', '102', '103', '104'] },
  reserves_legales: { ranges: ['1051'] },
  autres_reserves: { ranges: ['106', '11'] },
  resultat_exercice: { ranges: ['12'] },
  subventions_invest: { ranges: ['13'] },
  emprunts: { ranges: ['16'] },
  provisions: { ranges: ['15'] },
  dettes_adherents: { ranges: ['45'] },
  dettes_fournisseurs: { ranges: ['40'], excludeRanges: ['409'] },
  dettes_sociales: { ranges: ['42', '43'] },
  dettes_fiscales: { ranges: ['44'] },
  autres_dettes: { ranges: ['46', '47'] },
  regularisations_passif: { ranges: ['486', '487'] },
};

// ---------------------------------------------------------------------------
// Helper — flatten all bilan section lines to find by id
// ---------------------------------------------------------------------------
function findBilanLine(bilanData, bilanPostId) {
  if (!bilanData) return null;
  const sections = ['actifImmobilise', 'actifCirculant', 'capitauxPropres', 'dettes'];
  for (const sectionKey of sections) {
    const section = bilanData[sectionKey];
    if (!section) continue;
    for (const [key, value] of Object.entries(section)) {
      if (key.startsWith('_')) continue;
      if (value && value.id === bilanPostId) return value;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// BilanAccountCard — inline account card for bilan (uses getEntriesForBilanAccount)
// ---------------------------------------------------------------------------
function BilanAccountCard({ account, entries }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filterText, setFilterText] = useState('');

  const isNegative = account.solde < 0;

  const accountEntries = isExpanded
    ? getEntriesForBilanAccount(account.compteNum, entries)
    : [];

  return (
    <div
      style={{
        border: '1px solid #E2E8F0',
        borderRadius: '8px',
        overflow: 'hidden',
        marginBottom: '8px',
        backgroundColor: '#ffffff',
      }}
    >
      <button
        onClick={() => setIsExpanded((v) => !v)}
        aria-expanded={isExpanded}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '12px 14px',
          backgroundColor: isExpanded ? '#F0F9FF' : '#FAFAFA',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'background-color 150ms',
        }}
        onMouseEnter={(e) => {
          if (!isExpanded) e.currentTarget.style.backgroundColor = '#F7FAFC';
        }}
        onMouseLeave={(e) => {
          if (!isExpanded) e.currentTarget.style.backgroundColor = '#FAFAFA';
        }}
      >
        <span
          aria-hidden="true"
          style={{
            fontSize: '14px',
            color: '#718096',
            transition: 'transform 200ms',
            transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
            display: 'inline-block',
            flexShrink: 0,
          }}
        >
          ▼
        </span>

        <Badge code={account.compteNum} />

        <span
          style={{
            flex: 1,
            fontSize: '13px',
            fontWeight: 500,
            color: '#2D3748',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={account.compteLib}
        >
          {account.compteLib || 'Sans libellé'}
        </span>

        <span style={{ fontSize: '12px', color: '#A0AEC0', flexShrink: 0 }}>
          {account.nbEcritures} écriture{account.nbEcritures > 1 ? 's' : ''}
        </span>

        <span
          style={{
            fontSize: '14px',
            fontWeight: 600,
            color: isNegative ? '#E53935' : '#1A202C',
            flexShrink: 0,
            minWidth: '90px',
            textAlign: 'right',
          }}
        >
          {formatAmount(account.solde, Math.abs(account.solde) >= 1000)}
        </span>
      </button>

      {isExpanded && (
        <div style={{ padding: '12px 14px', borderTop: '1px solid #E2E8F0' }}>
          <EntryFilter value={filterText} onChange={setFilterText} />
          <EntryTable entries={accountEntries} filterText={filterText} />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// BilanAccountList — list of accounts for a bilan post
// ---------------------------------------------------------------------------
function BilanAccountList({ bilanPostId, entries }) {
  const config = BILAN_RANGES[bilanPostId];
  if (!config) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', fontSize: '13px', color: '#A0AEC0' }}>
        Aucune configuration de comptes pour ce poste.
      </div>
    );
  }

  const accounts = getAccountsForBilan(config.ranges, entries, {
    excludeRanges: config.excludeRanges || [],
    groupByAux: config.groupByAux ?? false,
  });

  if (!accounts || accounts.length === 0) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', fontSize: '13px', color: '#A0AEC0' }}>
        Aucun compte contribuant trouvé.
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          padding: '12px 0 8px',
          fontSize: '11px',
          fontWeight: 600,
          color: '#718096',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        Comptes contribuant ({accounts.length})
      </div>
      <div>
        {accounts.map((account) => (
          <BilanAccountCard
            key={account.compteNum}
            account={account}
            entries={entries}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DetailPanel — main exported component
// ---------------------------------------------------------------------------

/**
 * DetailPanel — panel slide-in depuis la droite.
 * Gère les types 'sig' et 'bilan'.
 */
export function DetailPanel() {
  const detailPanel = useStore((s) => s.detailPanel);
  const parsedFec = useStore((s) => s.parsedFec);
  const sigResult = useStore((s) => s.sigResult);
  const bilanData = useStore((s) => s.bilanData);
  const closeDetail = useStore((s) => s.closeDetail);

  const closeBtnRef = useRef(null);
  const isOpen = detailPanel !== null;

  // Focus sur le bouton × à l'ouverture
  useEffect(() => {
    if (isOpen && closeBtnRef.current) {
      closeBtnRef.current.focus();
    }
  }, [isOpen, detailPanel?.sigId, detailPanel?.bilanPostId]);

  // Fermeture par Escape
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        closeDetail();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeDetail]);

  const entries = parsedFec?.entries ?? [];
  const panelType = detailPanel?.type;

  // SIG data
  const sigLine = sigResult?.lines?.find((l) => l.id === detailPanel?.sigId);

  // Bilan data
  const bilanLine = panelType === 'bilan'
    ? findBilanLine(bilanData, detailPanel?.bilanPostId)
    : null;

  // Build header content depending on type
  let headerLabel = '—';
  let headerPrefix = null;
  let headerAmount = null;

  if (panelType === 'sig' && sigLine) {
    headerLabel = sigLine.label;
    headerPrefix = sigLine.prefix;
    headerAmount = sigLine.amount;
  } else if (panelType === 'bilan' && bilanLine) {
    headerLabel = bilanLine.label;
    headerAmount = bilanLine.montant;
  }

  const ariaLabel = panelType === 'bilan' ? 'Détail du poste bilan' : 'Détail du poste SIG';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      className="fv-detail-panel"
      style={{
        position: 'fixed',
        right: 0,
        top: 0,
        height: '100%',
        backgroundColor: '#ffffff',
        boxShadow: '-4px 0 16px rgba(0,0,0,0.12)',
        zIndex: 40,
        display: 'flex',
        flexDirection: 'column',
        transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 300ms ease-in-out',
        overflowY: 'auto',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '18px 20px 16px',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '12px',
          flexShrink: 0,
          backgroundColor: '#FAFAFA',
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          {/* Titre du poste */}
          <div
            style={{
              fontSize: '13px',
              color: '#718096',
              marginBottom: '4px',
              fontWeight: 500,
            }}
          >
            {panelType === 'bilan' ? 'Bilan →' : 'Détail →'}
          </div>
          <div
            style={{
              fontSize: '16px',
              fontWeight: 700,
              color: '#1A202C',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              flexWrap: 'wrap',
            }}
          >
            {headerPrefix && (
              <span style={{ color: '#718096' }}>{headerPrefix}</span>
            )}
            <span>{headerLabel}</span>
          </div>

          {/* Montant total */}
          {headerAmount !== null && headerAmount !== undefined && (
            <div
              style={{
                marginTop: '6px',
                fontSize: '20px',
                fontWeight: 700,
                color: '#FF8200',
              }}
            >
              {formatAmountFull(headerAmount)}
            </div>
          )}
        </div>

        {/* Bouton fermeture */}
        <button
          ref={closeBtnRef}
          onClick={closeDetail}
          aria-label="Fermer le panel"
          style={{
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid #E2E8F0',
            borderRadius: '6px',
            backgroundColor: '#ffffff',
            cursor: 'pointer',
            fontSize: '18px',
            color: '#718096',
            flexShrink: 0,
            transition: 'background-color 150ms, color 150ms',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#F7FAFC';
            e.currentTarget.style.color = '#1A202C';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#ffffff';
            e.currentTarget.style.color = '#718096';
          }}
        >
          ×
        </button>
      </div>

      {/* Corps du panel */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0 20px 20px',
        }}
      >
        {panelType === 'sig' && detailPanel?.sigId && (
          <AccountList sigId={detailPanel.sigId} entries={entries} />
        )}
        {panelType === 'bilan' && detailPanel?.bilanPostId && (
          <BilanAccountList bilanPostId={detailPanel.bilanPostId} entries={entries} />
        )}
      </div>
    </div>
  );
}

export default DetailPanel;
