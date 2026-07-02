import { useState } from 'react';
import { formatAmountFull } from '../../engine/formatUtils';

function AccountRow({ checked, onChange, compteNum, compteLib, montant }) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        cursor: 'pointer',
        fontSize: '13px',
        color: '#4A5568',
        background: checked ? '#E3F2F5' : '#F8FAFB',
        border: '1px solid #E2E8F0',
        borderRadius: '6px',
        padding: '6px 10px',
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ width: '15px', height: '15px', cursor: 'pointer' }}
      />
      <span style={{ fontFamily: 'monospace', color: '#718096' }}>{compteNum}</span>
      <span style={{ flex: 1 }}>{compteLib}</span>
      <span style={{ color: '#718096' }}>{formatAmountFull(montant)}</span>
    </label>
  );
}

function CategoryGroup({ group, selectedAccounts, onChange }) {
  const [expanded, setExpanded] = useState(false);

  const compteNums = group.accounts.map((a) => a.compteNum);
  const selectedInGroup = compteNums.filter((c) => selectedAccounts.includes(c));
  const allSelected = selectedInGroup.length === compteNums.length;
  const noneSelected = selectedInGroup.length === 0;
  const groupTotal = group.accounts
    .filter((a) => selectedAccounts.includes(a.compteNum))
    .reduce((sum, a) => sum + a.montant, 0);

  const setGroupRef = (el) => {
    if (el) el.indeterminate = !allSelected && !noneSelected;
  };

  const toggleGroup = (checked) => {
    const others = selectedAccounts.filter((c) => !compteNums.includes(c));
    onChange(checked ? [...others, ...compteNums] : others);
  };

  const toggleAccount = (compteNum, checked) => {
    if (checked) {
      onChange([...selectedAccounts, compteNum]);
    } else {
      onChange(selectedAccounts.filter((c) => c !== compteNum));
    }
  };

  return (
    <div style={{ border: '1px solid #E2E8F0', borderRadius: 6, marginBottom: 8, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F8FAFB', padding: '8px 10px' }}>
        <input
          type="checkbox"
          ref={setGroupRef}
          checked={allSelected}
          onChange={(e) => toggleGroup(e.target.checked)}
          aria-label={`Sélectionner tout ${group.label}`}
          style={{ width: 15, height: 15, cursor: 'pointer' }}
        />
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            padding: 0,
            font: 'inherit',
          }}
        >
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: group.color, flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#4A5568', flex: 1, textAlign: 'left' }}>
            {group.label}{' '}
            <span style={{ color: '#A0AEC0', fontWeight: 400 }}>
              ({selectedInGroup.length}/{compteNums.length})
            </span>
          </span>
          <span style={{ fontSize: 13, color: '#718096' }}>{formatAmountFull(groupTotal)}</span>
          <span style={{ fontSize: 11, color: '#A0AEC0' }}>{expanded ? '▾' : '▸'}</span>
        </button>
      </div>

      {expanded && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 10 }}>
          {group.accounts.map((a) => (
            <AccountRow
              key={a.compteNum}
              compteNum={a.compteNum}
              compteLib={a.compteLib}
              montant={a.montant}
              checked={selectedAccounts.includes(a.compteNum)}
              onChange={(checked) => toggleAccount(a.compteNum, checked)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Sélecteur de comptes de charges — filtre l'onglet Charges (donut, détail, histogramme).
 * Groupé par catégorie PCG, groupes repliables (repliés par défaut).
 *
 * Props :
 *   groups           — voir getChargeAccountsByCategory (id, label, color, accounts[])
 *   selectedAccounts (string[])        — compteNum sélectionnés
 *   onChange         (string[]) => void
 */
export default function ChargesAccountSelector({ groups, selectedAccounts, onChange }) {
  if (!groups || groups.length === 0) return null;

  const allCompteNums = groups.flatMap((g) => g.accounts.map((a) => a.compteNum));
  const allSelected = selectedAccounts.length === allCompteNums.length;

  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 600, color: '#718096' }}>Comptes de charges</span>
        <button
          type="button"
          onClick={() => onChange(allSelected ? [] : allCompteNums)}
          style={{
            border: 'none',
            background: 'none',
            color: '#FF8200',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            padding: 0,
          }}
        >
          {allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
        </button>
      </div>

      {groups.map((group) => (
        <CategoryGroup
          key={group.id}
          group={group}
          selectedAccounts={selectedAccounts}
          onChange={onChange}
        />
      ))}
    </div>
  );
}
