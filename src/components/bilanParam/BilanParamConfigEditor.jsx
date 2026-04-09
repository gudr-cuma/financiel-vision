import { useState, useRef, useEffect } from 'react';
import useBilanParamStore from '../../store/useBilanParamStore';
import useAuthStore from '../../store/useAuthStore';

const DOC_LABELS = { actif: 'Actif', passif: 'Passif', resultat: 'Compte de Résultat' };
const DOCS = ['actif', 'passif', 'resultat'];

const TYPE_OPTIONS = [
  { value: 'section',    label: 'Section (titre principal)' },
  { value: 'subsection', label: 'Sous-section (titre secondaire)' },
  { value: 'line',       label: 'Ligne de comptes (calcul)' },
  { value: 'total',      label: 'Sous-total (somme de lignes)' },
  { value: 'grandtotal', label: 'Total général' },
  { value: 'separator',  label: 'Séparateur (ligne vide)' },
];

const SENS_OPTIONS = [
  { value: 1,  label: 'Solde débiteur net — Σ(Débit) − Σ(Crédit)  →  Actif, Charges' },
  { value: -1, label: 'Solde créditeur net — Σ(Crédit) − Σ(Débit)  →  Passif, Produits' },
];

const btnStyle  = { padding: '3px 9px', fontSize: '12px', border: '1px solid #E2E8F0', borderRadius: '4px', background: '#f5f5f5', cursor: 'pointer' };
const labelStyle = { display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '12px', color: '#555', fontWeight: 600 };
const inputStyle = { padding: '6px 8px', border: '1px solid #E2E8F0', borderRadius: '4px', fontSize: '13px', width: '100%', boxSizing: 'border-box' };
const hintStyle  = { fontSize: '11px', color: '#A0AEC0', marginTop: '2px' };

function ItemRow({ item, onUpdate, onDelete, onMove, autoExpand }) {
  const [expanded, setExpanded] = useState(autoExpand);
  const rowRef = useRef(null);

  useEffect(() => {
    if (autoExpand && rowRef.current) {
      rowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [autoExpand]);

  const parseRanges = (val) => {
    try { return JSON.parse(val); } catch { return val.split(',').map(s => s.trim()).filter(Boolean); }
  };

  const typeLabel = TYPE_OPTIONS.find(t => t.value === item.type)?.label ?? item.type;

  return (
    <div ref={rowRef} style={{ borderBottom: '1px solid #E2E8F0', padding: '5px 0', background: autoExpand ? '#FFFBF0' : 'transparent', borderRadius: autoExpand ? '4px' : undefined }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ fontSize: '11px', color: '#A0AEC0', minWidth: '130px', flexShrink: 0 }}>{typeLabel}</span>
        <span style={{ flex: 1, fontSize: '13px', fontWeight: item.bold ? 700 : 400, color: item.label ? '#1A202C' : '#aaa' }}>
          {item.label || '—'}
          {item.type === 'line' && item.code_ranges?.length > 0 && (
            <span style={{ fontSize: '11px', color: '#A0AEC0', marginLeft: '8px', fontWeight: 400 }}>
              [{item.code_ranges.join(', ')}]
            </span>
          )}
        </span>
        <button onClick={() => onMove(item.id, -1)} style={btnStyle} title="Monter">↑</button>
        <button onClick={() => onMove(item.id, +1)} style={btnStyle} title="Descendre">↓</button>
        <button
          onClick={() => setExpanded(e => !e)}
          style={{ ...btnStyle, background: expanded ? '#E3F2F5' : '#f5f5f5', color: expanded ? '#0077A8' : '#4A5568' }}
        >
          {expanded ? '▲ Fermer' : '✏️ Éditer'}
        </button>
        <button onClick={() => onDelete(item.id)} style={{ ...btnStyle, color: '#E53935', borderColor: '#FECACA' }} title="Supprimer">✕</button>
      </div>

      {expanded && (
        <div style={{ background: '#F8FAFB', border: '1px solid #E2E8F0', padding: '12px', marginTop: '6px', borderRadius: '6px', display: 'grid', gap: '12px' }}>

          <label style={labelStyle}>
            Libellé affiché
            <input style={inputStyle} value={item.label} onChange={e => onUpdate(item.id, 'label', e.target.value)} placeholder="Ex : Immobilisations corporelles" />
          </label>

          <label style={labelStyle}>
            Type de ligne
            <select style={inputStyle} value={item.type} onChange={e => onUpdate(item.id, 'type', e.target.value)}>
              {TYPE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </label>

          {item.type === 'line' && (
            <>
              <label style={labelStyle}>
                Plages de comptes PCG
                <input
                  style={inputStyle}
                  value={Array.isArray(item.code_ranges) ? item.code_ranges.join(', ') : (item.code_ranges ?? '')}
                  onChange={e => onUpdate(item.id, 'code_ranges', parseRanges(e.target.value))}
                  placeholder="Ex : 211, 212, 28"
                />
                <span style={hintStyle}>
                  Saisissez les préfixes de comptes séparés par des virgules.
                  Tous les comptes <em>commençant par</em> ces chiffres seront agrégés.
                  Ex : «&nbsp;21&nbsp;» inclut 211000, 213000, etc.
                </span>
              </label>

              <label style={labelStyle}>
                Sens du calcul
                <select style={inputStyle} value={item.credit_sign ?? 1} onChange={e => onUpdate(item.id, 'credit_sign', parseInt(e.target.value))}>
                  {SENS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <span style={hintStyle}>
                  Le résultat sera positif quand le solde va dans le bon sens (ex : actif débiteur, produit créditeur).
                </span>
              </label>
            </>
          )}

          {(item.type === 'total' || item.type === 'grandtotal') && (
            <div style={labelStyle}>
              <span>Composition du total</span>
              <div style={{ fontSize: '11px', color: '#A0AEC0', marginBottom: '4px' }}>
                Ce total est calculé automatiquement à partir des lignes ci-dessus selon la structure.
                Il n'est pas nécessaire de saisir quoi que ce soit ici — la formule est gérée en interne.
              </div>
            </div>
          )}

          <label style={{ ...labelStyle, flexDirection: 'row', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 400 }}>
            <input type="checkbox" checked={!!item.bold} onChange={e => onUpdate(item.id, 'bold', e.target.checked)} style={{ accentColor: '#31B700', width: '14px', height: '14px' }} />
            Afficher en gras
          </label>
        </div>
      )}
    </div>
  );
}

export function BilanParamConfigEditor() {
  const { config, saveConfig, resetToDefault, isLoading, error } = useBilanParamStore();
  const currentUser = useAuthStore(s => s.currentUser);
  const [localConfig, setLocalConfig] = useState(() => config.map((item, i) => ({ ...item, position: i })));
  const [activeDoc, setActiveDoc] = useState('actif');
  const [saved, setSaved] = useState(false);
  const [newItemId, setNewItemId] = useState(null); // ID de la dernière ligne ajoutée → auto-expand

  const update = (id, field, value) => {
    setLocalConfig(cfg => cfg.map(item => item.id === id ? { ...item, [field]: value } : item));
    setSaved(false);
  };

  const deleteItem = (id) => {
    setLocalConfig(cfg => cfg.filter(item => item.id !== id));
    if (newItemId === id) setNewItemId(null);
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
      return [...others, ...newDoc.map((item, i) => ({ ...item, position: i }))];
    });
    setSaved(false);
  };

  const addItem = () => {
    const id = crypto.randomUUID();
    const newItem = {
      id,
      doc: activeDoc,
      type: 'line',
      label: '',
      code_ranges: [],
      credit_sign: 1,
      formula_refs: null,
      bold: false,
      position: localConfig.filter(i => i.doc === activeDoc).length,
      parent_id: null,
    };
    setLocalConfig(cfg => [...cfg, newItem]);
    setNewItemId(id); // déclenche auto-expand + scroll
    setSaved(false);
  };

  const handleSave = async () => {
    const result = await saveConfig(localConfig);
    if (result.ok) { setSaved(true); setNewItemId(null); }
  };

  const handleReset = async () => {
    if (!window.confirm('Réinitialiser le gabarit CUMA par défaut ? Toutes les modifications seront perdues.')) return;
    const result = await resetToDefault();
    if (result.ok) {
      const { config: newConfig } = useBilanParamStore.getState();
      setLocalConfig(newConfig.map((item, i) => ({ ...item, position: i })));
      setNewItemId(null);
      setSaved(true);
    }
  };

  const docItems = localConfig.filter(i => i.doc === activeDoc);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>⚙ Paramétrage du bilan</h3>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {currentUser?.role === 'admin' && (
            <button onClick={handleReset} disabled={isLoading}
              style={{ padding: '7px 14px', fontSize: '13px', border: '1px solid #E2E8F0', borderRadius: '6px', background: '#fff', cursor: 'pointer', color: '#718096' }}>
              Réinitialiser gabarit CUMA
            </button>
          )}
          <button onClick={addItem}
            style={{ padding: '7px 14px', fontSize: '13px', border: '1px solid #31B700', borderRadius: '6px', background: '#E8F5E0', cursor: 'pointer', color: '#268E00', fontWeight: 600 }}>
            + Ajouter une ligne
          </button>
          <button onClick={handleSave} disabled={isLoading}
            style={{ padding: '7px 14px', fontSize: '13px', border: 'none', borderRadius: '6px', background: saved ? '#268E00' : '#31B700', cursor: 'pointer', color: '#fff', fontWeight: 700 }}>
            {isLoading ? 'Enregistrement…' : saved ? '✓ Enregistré' : 'Enregistrer'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '10px', background: '#FFF3E0', color: '#E53935', borderRadius: '6px', marginBottom: '12px', fontSize: '13px' }}>
          {error}
        </div>
      )}

      {/* Onglets Actif / Passif / Résultat */}
      <div style={{ display: 'flex', borderBottom: '2px solid #E2E8F0', marginBottom: '16px' }}>
        {DOCS.map(doc => (
          <button key={doc} onClick={() => setActiveDoc(doc)} style={{
            padding: '8px 18px', fontSize: '13px', fontWeight: activeDoc === doc ? 700 : 500,
            color: activeDoc === doc ? '#1A202C' : '#718096',
            background: 'transparent', border: 'none',
            borderBottom: activeDoc === doc ? '2px solid #FF8200' : '2px solid transparent',
            cursor: 'pointer', marginBottom: '-2px',
          }}>
            {DOC_LABELS[doc]}
            <span style={{ marginLeft: '6px', fontSize: '11px', color: '#A0AEC0' }}>
              ({localConfig.filter(i => i.doc === doc).length})
            </span>
          </button>
        ))}
      </div>

      {/* Liste des lignes */}
      {docItems.length === 0
        ? (
          <div style={{ textAlign: 'center', padding: '30px', color: '#A0AEC0', fontSize: '13px', border: '2px dashed #E2E8F0', borderRadius: '8px' }}>
            Aucune ligne pour cette section.<br />
            <button onClick={addItem} style={{ marginTop: '10px', padding: '7px 16px', fontSize: '13px', border: '1px solid #31B700', borderRadius: '6px', background: '#E8F5E0', cursor: 'pointer', color: '#268E00', fontWeight: 600 }}>
              + Ajouter la première ligne
            </button>
          </div>
        )
        : docItems.map(item => (
          <ItemRow
            key={item.id}
            item={item}
            onUpdate={update}
            onDelete={deleteItem}
            onMove={move}
            autoExpand={item.id === newItemId}
          />
        ))
      }
    </div>
  );
}

export default BilanParamConfigEditor;
