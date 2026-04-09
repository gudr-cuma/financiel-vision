import { useState } from 'react';
import useBilanParamStore from '../../store/useBilanParamStore';
import useAuthStore from '../../store/useAuthStore';

const DOC_LABELS = { actif: 'Actif', passif: 'Passif', resultat: 'Compte de Résultat' };
const DOCS = ['actif', 'passif', 'resultat'];
const TYPES = ['section', 'subsection', 'line', 'total', 'grandtotal', 'separator'];

function ItemRow({ item, items, onUpdate, onDelete, onMove }) {
  const [expanded, setExpanded] = useState(false);

  const parseRanges = (val) => {
    try { return JSON.parse(val); } catch { return val.split(',').map(s => s.trim()).filter(Boolean); }
  };

  return (
    <div style={{ borderBottom: '1px solid #E2E8F0', padding: '6px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ fontSize: '11px', color: '#999', minWidth: '80px' }}>{item.type}</span>
        <span style={{ flex: 1, fontSize: '13px', fontWeight: item.bold ? 700 : 400 }}>{item.label || <em style={{ color: '#aaa' }}>sans label</em>}</span>
        <button onClick={() => onMove(item.id, -1)} style={btnStyle}>↑</button>
        <button onClick={() => onMove(item.id, +1)} style={btnStyle}>↓</button>
        <button onClick={() => setExpanded(e => !e)} style={{ ...btnStyle, background: expanded ? '#E3F2F5' : '#f5f5f5' }}>✏️</button>
        <button onClick={() => onDelete(item.id)} style={{ ...btnStyle, color: '#E53935' }}>✕</button>
      </div>

      {expanded && (
        <div style={{ background: '#F8FAFB', padding: '10px', marginTop: '6px', borderRadius: '6px', display: 'grid', gap: '8px' }}>
          <label style={labelStyle}>
            Libellé
            <input style={inputStyle} value={item.label} onChange={e => onUpdate(item.id, 'label', e.target.value)} />
          </label>
          <label style={labelStyle}>
            Type
            <select style={inputStyle} value={item.type} onChange={e => onUpdate(item.id, 'type', e.target.value)}>
              {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          {item.type === 'line' && (
            <>
              <label style={labelStyle}>
                Préfixes comptes PCG (JSON ou virgule-séparés, ex: 20,211,281)
                <input
                  style={inputStyle}
                  value={Array.isArray(item.code_ranges) ? item.code_ranges.join(',') : (item.code_ranges ?? '')}
                  onChange={e => onUpdate(item.id, 'code_ranges', parseRanges(e.target.value))}
                />
              </label>
              <label style={labelStyle}>
                Signe (1 = débit−crédit / actif+charge, -1 = crédit−débit / passif+produit)
                <select style={inputStyle} value={item.credit_sign ?? 1} onChange={e => onUpdate(item.id, 'credit_sign', parseInt(e.target.value))}>
                  <option value={1}>1 — débit moins crédit (actif / charge)</option>
                  <option value={-1}>-1 — crédit moins débit (passif / produit)</option>
                </select>
              </label>
            </>
          )}
          {(item.type === 'total' || item.type === 'grandtotal') && (
            <label style={labelStyle}>
              Références formule (IDs préfixés +/-, un par ligne)
              <textarea
                style={{ ...inputStyle, height: '80px', fontFamily: 'monospace', fontSize: '11px' }}
                value={Array.isArray(item.formula_refs) ? item.formula_refs.join('\n') : ''}
                onChange={e => onUpdate(item.id, 'formula_refs', e.target.value.split('\n').map(s => s.trim()).filter(Boolean))}
              />
            </label>
          )}
          <label style={{ ...labelStyle, flexDirection: 'row', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input type="checkbox" checked={!!item.bold} onChange={e => onUpdate(item.id, 'bold', e.target.checked)} />
            Gras
          </label>
        </div>
      )}
    </div>
  );
}

const btnStyle = { padding: '2px 7px', fontSize: '12px', border: '1px solid #E2E8F0', borderRadius: '4px', background: '#f5f5f5', cursor: 'pointer' };
const labelStyle = { display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '12px', color: '#555', fontWeight: 500 };
const inputStyle = { padding: '5px 8px', border: '1px solid #E2E8F0', borderRadius: '4px', fontSize: '13px', width: '100%', boxSizing: 'border-box' };

export function BilanParamConfigEditor() {
  const { config, saveConfig, resetToDefault, isLoading, error } = useBilanParamStore();
  const currentUser = useAuthStore(s => s.currentUser);
  const [localConfig, setLocalConfig] = useState(() => config.map((item, i) => ({ ...item, position: i })));
  const [activeDoc, setActiveDoc] = useState('actif');
  const [saved, setSaved] = useState(false);

  const update = (id, field, value) => {
    setLocalConfig(cfg => cfg.map(item => item.id === id ? { ...item, [field]: value } : item));
    setSaved(false);
  };

  const deleteItem = (id) => {
    setLocalConfig(cfg => cfg.filter(item => item.id !== id));
    setSaved(false);
  };

  const move = (id, dir) => {
    setLocalConfig(cfg => {
      const docItems = cfg.filter(i => i.doc === activeDoc);
      const others   = cfg.filter(i => i.doc !== activeDoc);
      const idx = docItems.findIndex(i => i.id === id);
      if (idx < 0) return cfg;
      const next = idx + dir;
      if (next < 0 || next >= docItems.length) return cfg;
      const newDoc = [...docItems];
      [newDoc[idx], newDoc[next]] = [newDoc[next], newDoc[idx]];
      const reindexed = newDoc.map((item, i) => ({ ...item, position: i }));
      const reindexedOthers = others.map((item, i) => ({ ...item }));
      return [...reindexedOthers, ...reindexed];
    });
    setSaved(false);
  };

  const addItem = () => {
    const newItem = {
      id: crypto.randomUUID(),
      doc: activeDoc,
      type: 'line',
      label: 'Nouvelle ligne',
      code_ranges: [],
      credit_sign: 1,
      formula_refs: null,
      bold: false,
      position: localConfig.filter(i => i.doc === activeDoc).length,
      parent_id: null,
    };
    setLocalConfig(cfg => [...cfg, newItem]);
    setSaved(false);
  };

  const handleSave = async () => {
    const result = await saveConfig(localConfig);
    if (result.ok) setSaved(true);
  };

  const handleReset = async () => {
    if (!window.confirm('Réinitialiser le gabarit CUMA par défaut ? Toutes les modifications seront perdues.')) return;
    const result = await resetToDefault();
    if (result.ok) {
      const { config: newConfig } = useBilanParamStore.getState();
      setLocalConfig(newConfig.map((item, i) => ({ ...item, position: i })));
      setSaved(true);
    }
  };

  const docItems = localConfig.filter(i => i.doc === activeDoc);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700 }}>⚙ Paramétrage du bilan</h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          {currentUser?.role === 'admin' && (
            <button onClick={handleReset} disabled={isLoading} style={{ padding: '7px 14px', fontSize: '13px', border: '1px solid #E2E8F0', borderRadius: '6px', background: '#fff', cursor: 'pointer', color: '#718096' }}>
              Réinitialiser gabarit CUMA
            </button>
          )}
          <button onClick={addItem} style={{ padding: '7px 14px', fontSize: '13px', border: '1px solid #31B700', borderRadius: '6px', background: '#E8F5E0', cursor: 'pointer', color: '#268E00', fontWeight: 600 }}>
            + Ajouter une ligne
          </button>
          <button onClick={handleSave} disabled={isLoading} style={{ padding: '7px 14px', fontSize: '13px', border: 'none', borderRadius: '6px', background: '#31B700', cursor: 'pointer', color: '#fff', fontWeight: 700 }}>
            {saved ? '✓ Enregistré' : 'Enregistrer'}
          </button>
        </div>
      </div>

      {error && <div style={{ padding: '10px', background: '#FFF3E0', color: '#E53935', borderRadius: '6px', marginBottom: '12px', fontSize: '13px' }}>{error}</div>}

      {/* Onglets doc */}
      <div style={{ display: 'flex', gap: '0', borderBottom: '2px solid #E2E8F0', marginBottom: '16px' }}>
        {DOCS.map(doc => (
          <button
            key={doc}
            onClick={() => setActiveDoc(doc)}
            style={{
              padding: '8px 18px', fontSize: '13px', fontWeight: activeDoc === doc ? 700 : 500,
              color: activeDoc === doc ? '#1A202C' : '#718096',
              background: 'transparent', border: 'none',
              borderBottom: activeDoc === doc ? '2px solid #FF8200' : '2px solid transparent',
              cursor: 'pointer', marginBottom: '-2px',
            }}
          >
            {DOC_LABELS[doc]}
          </button>
        ))}
      </div>

      <div>
        {docItems.length === 0
          ? <p style={{ color: '#aaa', fontSize: '13px' }}>Aucune ligne. Cliquez sur "+ Ajouter une ligne".</p>
          : docItems.map(item => (
              <ItemRow key={item.id} item={item} items={localConfig} onUpdate={update} onDelete={deleteItem} onMove={move} />
            ))
        }
      </div>
    </div>
  );
}

export default BilanParamConfigEditor;
