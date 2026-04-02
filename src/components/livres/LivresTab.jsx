import { useState, useMemo } from 'react';
import useStore from '../../store/useStore';
import { computeBalance, computeBalanceAuxiliaire, computeGrandLivre } from '../../engine/computeLivres';
import { BalanceTable } from './BalanceTable';
import { BalanceAuxTable } from './BalanceAuxTable';
import { GrandLivreView } from './GrandLivreView';

const TABS = [
  { id: 'balance',    label: 'Balance générale' },
  { id: 'balance_aux', label: 'Balance auxiliaire' },
  { id: 'grand_livre', label: 'Grand Livre' },
];

// ─────────────────────────────────────────────────────────────
// Barre de filtres partagée
// ─────────────────────────────────────────────────────────────
function FilterBar({ children }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
      padding: '12px 0', marginBottom: '8px',
    }}>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder }) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        padding: '7px 12px', border: '1px solid #E2E8F0', borderRadius: '8px',
        fontSize: '13px', color: '#1A202C', background: '#FAFAFA', minWidth: '200px',
      }}
    />
  );
}

function Toggle({ checked, onChange, label }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#4A5568' }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
        style={{ width: '15px', height: '15px', cursor: 'pointer' }} />
      {label}
    </label>
  );
}

// ─────────────────────────────────────────────────────────────
// Sous-onglet Balance générale
// ─────────────────────────────────────────────────────────────
function BalancePane({ parsedFec }) {
  const [search, setSearch]         = useState('');
  const [inclureSoldes, setInclureSoldes] = useState(false);

  const rows = useMemo(() => computeBalance(parsedFec, { inclureComptesSansMouvement: inclureSoldes }), [parsedFec, inclureSoldes]);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(r =>
      r.rowType !== 'compte' ||
      r.compteNum.toLowerCase().includes(q) ||
      r.compteLib.toLowerCase().includes(q)
    );
  }, [rows, search]);

  return (
    <>
      <FilterBar>
        <TextInput value={search} onChange={setSearch} placeholder="Filtrer compte ou libellé…" />
        <Toggle checked={inclureSoldes} onChange={setInclureSoldes} label="Inclure les comptes soldés non mouvementés" />
        <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#A0AEC0' }}>
          {rows.filter(r => r.rowType === 'compte').length} comptes
        </span>
      </FilterBar>
      <BalanceTable rows={filtered} />
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Sous-onglet Balance auxiliaire
// ─────────────────────────────────────────────────────────────

const COLLECTIFS_DISPONIBLES = [
  { prefix: '401', label: '401 — Fournisseurs' },
  { prefix: '411', label: '411 — Clients' },
  { prefix: '453', label: '453 — Adhérents (CUMA)' },
];

function BalanceAuxPane({ parsedFec }) {
  const [search, setSearch] = useState('');
  const [collectifs, setCollectifs] = useState(['401', '411', '453']);

  const toggleCollectif = (prefix) => {
    setCollectifs(prev =>
      prev.includes(prefix) ? prev.filter(p => p !== prefix) : [...prev, prefix]
    );
  };

  const rows = useMemo(() =>
    computeBalanceAuxiliaire(parsedFec, { collectifs }),
    [parsedFec, collectifs]
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(r =>
      r.rowType === 'collectifTotal' ||
      r.compAuxNum.toLowerCase().includes(q) ||
      r.compAuxLib.toLowerCase().includes(q)
    );
  }, [rows, search]);

  return (
    <>
      <FilterBar>
        <TextInput value={search} onChange={setSearch} placeholder="Filtrer tiers ou compte…" />
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {COLLECTIFS_DISPONIBLES.map(c => (
            <Toggle key={c.prefix} checked={collectifs.includes(c.prefix)} onChange={() => toggleCollectif(c.prefix)} label={c.label} />
          ))}
        </div>
        <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#A0AEC0' }}>
          {rows.filter(r => r.rowType === 'aux').length} tiers
        </span>
      </FilterBar>
      <BalanceAuxTable rows={filtered} />
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Sous-onglet Grand Livre
// ─────────────────────────────────────────────────────────────
function GrandLivrePane({ parsedFec }) {
  const [compteFilter,   setCompteFilter]   = useState('');
  const [journalFilter,  setJournalFilter]  = useState('');

  // Liste des journaux disponibles
  const journaux = useMemo(() => {
    const s = new Set(parsedFec.entries.map(e => e.journalCode).filter(Boolean));
    return [...s].filter(j => j !== 'ANC').sort();
  }, [parsedFec]);

  const glData = useMemo(() =>
    computeGrandLivre(parsedFec, { compteFilter, journalFilter }),
    [parsedFec, compteFilter, journalFilter]
  );

  return (
    <>
      <FilterBar>
        <TextInput value={compteFilter} onChange={setCompteFilter} placeholder="Filtrer par compte ou libellé…" />
        <select
          value={journalFilter}
          onChange={e => setJournalFilter(e.target.value)}
          style={{ padding: '7px 12px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '13px', color: '#1A202C', background: '#FAFAFA' }}
        >
          <option value="">Tous les journaux</option>
          {journaux.map(j => <option key={j} value={j}>{j}</option>)}
        </select>
      </FilterBar>
      <GrandLivreView glData={glData} />
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// LivresTab — container principal
// ─────────────────────────────────────────────────────────────
export function LivresTab() {
  const parsedFec = useStore(s => s.parsedFec);
  const [activeTab, setActiveTab] = useState('balance');

  if (!parsedFec) {
    return (
      <div style={{ padding: '48px', textAlign: 'center', color: '#A0AEC0' }}>
        Aucun FEC chargé
      </div>
    );
  }

  return (
    <div style={{ paddingTop: '16px' }}>
      {/* Sous-onglets */}
      <div style={{ display: 'flex', gap: '4px', borderBottom: '2px solid #E2E8F0', marginBottom: '16px' }}>
        {TABS.map(tab => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '8px 18px',
                fontSize: '13px',
                fontWeight: active ? 700 : 500,
                color: active ? '#FF8200' : '#718096',
                background: 'none',
                border: 'none',
                borderBottom: active ? '3px solid #FF8200' : '3px solid transparent',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                marginBottom: '-2px',
                transition: 'color 150ms',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Contenu */}
      {activeTab === 'balance'     && <BalancePane     parsedFec={parsedFec} />}
      {activeTab === 'balance_aux' && <BalanceAuxPane  parsedFec={parsedFec} />}
      {activeTab === 'grand_livre' && <GrandLivrePane  parsedFec={parsedFec} />}
    </div>
  );
}

export default LivresTab;
