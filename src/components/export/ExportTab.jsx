import { useState, useRef, Fragment } from 'react';
import useStore from '../../store/useStore';
import useBudgetStore from '../../store/useBudgetStore';
import { generateExport, DOC_LABELS, COMP_SUBTABLE_IDS } from '../../engine/generatePdf';
import { exportConfigJson, importConfigJson } from './exportConfigRepository';
import GranularityToggle from '../treasury/GranularityToggle';

// ── Sous-tableaux Comparaison N/N-1 ─────────────────────────────────────────
const COMP_SUBTABLES = [
  // Analyses pluriannuelles
  { id: 'ca',              label: "Chiffre d'affaires",               section: 'annual' },
  { id: 'ebe',             label: 'EBE — Excédent Brut d\'Exploitation', section: 'annual' },
  { id: 'resultats',       label: 'Résultats (courant / exceptionnel / net)', section: 'annual' },
  { id: 'fr',              label: 'Fonds de roulement',               section: 'annual' },
  { id: 'fr_sur_ca',       label: 'Fonds de roulement / CA',          section: 'annual' },
  { id: 'creances_ca',     label: 'Créances / CA',                    section: 'annual' },
  { id: 'cs_ca',           label: 'Capital social / CA',              section: 'annual' },
  { id: 'cs_vbm',          label: 'Capital social / Val. brute matériels', section: 'annual' },
  { id: 'cs_cp',           label: 'Capital social / Capitaux propres', section: 'annual' },
  { id: 'taux_endettement',label: "Taux d'endettement",               section: 'annual' },
  { id: 'cp_passif',       label: 'Capitaux propres / Passif',        section: 'annual' },
  // Détail mensuel
  { id: 'treso_mensuelle', label: 'Trésorerie — solde fin de mois',   section: 'monthly' },
  { id: 'ca_mensuel',      label: 'CA mensuel',                       section: 'monthly' },
  { id: 'charges',         label: 'Répartition des charges',          section: 'monthly' },
];

// ── Catalogue complet des documents ──────────────────────────────────────────
// requiresFec          → nécessite un FEC chargé
// requiresDossier      → nécessite dossierData
// requiresAnalytique   → nécessite analytiqueData
// requiresBilanCR      → nécessite bilanCRData
// requiresExploitation → nécessite exploitationData (Export_Multi chargé)
// requiresBudget       → nécessite au moins un budget créé
const ALL_DOCS = [
  { id: 'fiche_synthese',    requiresExploitation: true },
  { id: 'bilan',             requiresFec: true },
  { id: 'dossier_gestion',   requiresDossier: true },
  { id: 'comparaison_nn1',   requiresComparaisonNN1: true },
  { id: 'treasury_curve',    requiresFec: true },
  { id: 'charges_charts',    requiresFec: true },
  { id: 'sig',               requiresFec: true },
  { id: 'balance',           requiresFec: true },
  { id: 'balance_aux',       requiresFec: true },
  { id: 'grand_livre',       requiresFec: true, warn: true },
  { id: 'bilan_cr',          requiresBilanCR: true },
  { id: 'capital_social',    requiresExploitation: true },
  { id: 'emprunts',          requiresExploitation: true },
  { id: 'emprunts_crd5ans',  requiresExploitation: true },
  { id: 'immobilisations',   requiresExploitation: true },
  { id: 'amortissements',    requiresExploitation: true },
  { id: 'materiels',         requiresExploitation: true },
  { id: 'analytique_podium', requiresAnalytique: true },
  { id: 'analytique_table',  requiresAnalytique: true },
  { id: 'budget_suivi',      requiresBudget: true },
  { id: 'rapport_ia',        requiresRapportIA: true },
];

const DEFAULT_SELECTED = [
  'fiche_synthese', 'dossier_gestion', 'treasury_curve', 'charges_charts',
  'sig', 'balance', 'balance_aux', 'bilan_cr',
  'capital_social', 'emprunts', 'immobilisations', 'amortissements', 'materiels',
];

const DEFAULT_DOC_OPTIONS = {
  treasury_curve: { chartType: 'courbe', granularity: 'mois', showSolde: true, showTop10: false },
  capital_social: { groupBy: 'none' },
  materiels:      { groupBy: 'none' },
  budget_suivi:   { budgetId: null, tableType: 'ecarts', scenarioId: null },
};

function isDocAvailable(doc, ctx) {
  if (doc.requiresFec             && !ctx.parsedFec)        return false;
  if (doc.requiresDossier         && !ctx.dossierData)      return false;
  if (doc.requiresBilanCR         && !ctx.bilanCRData)      return false;
  if (doc.requiresAnalytique      && !ctx.analytiqueData)   return false;
  if (doc.requiresRapportIA       && !ctx.analyseIAText)    return false;
  if (doc.requiresComparaisonNN1  && !ctx.sigResultN1)      return false;
  if (doc.requiresExploitation    && !ctx.exploitationData) return false;
  if (doc.requiresBudget          && !(ctx.budgets && ctx.budgets.length > 0)) return false;
  return true;
}

// ── Bouton ↑ / ↓ ──────────────────────────────────────────────────────────────
function ArrowBtn({ dir, disabled, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={dir === 'up' ? 'Monter' : 'Descendre'}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: '22px', height: '22px',
        border: '1px solid #E2E8F0', borderRadius: '4px',
        background: disabled ? 'transparent' : '#F8FAFB',
        color: disabled ? '#CBD5E0' : '#718096',
        cursor: disabled ? 'default' : 'pointer',
        fontSize: '11px', lineHeight: 1, padding: 0,
        transition: 'background 100ms',
      }}
    >
      {dir === 'up' ? '▲' : '▼'}
    </button>
  );
}

export function ExportTab() {
  const parsedFec      = useStore(s => s.parsedFec);
  const sigResult      = useStore(s => s.sigResult);
  const bilanData      = useStore(s => s.bilanData);
  const treasuryData   = useStore(s => s.treasuryData);
  const chargesData    = useStore(s => s.chargesData);
  const analytiqueData = useStore(s => s.analytiqueData);
  const dossierData    = useStore(s => s.dossierData);
  const bilanCRData    = useStore(s => s.bilanCRData);
  const analyseIAText  = useStore(s => s.analyseIAText);
  const exploitationData  = useStore(s => s.exploitationData);
  const syntheseOverrides = useStore(s => s.syntheseOverrides);
  // N-1 / N-2 pour la comparaison
  const sigResultN1    = useStore(s => s.sigResultN1);
  const sigResultN2    = useStore(s => s.sigResultN2);
  const bilanDataN1    = useStore(s => s.bilanDataN1);
  const bilanDataN2    = useStore(s => s.bilanDataN2);
  const treasuryDataN1 = useStore(s => s.treasuryDataN1);
  const chargesDataN1  = useStore(s => s.chargesDataN1);
  // Suivi budgétaire — store indépendant (aucun "budget actif" global, on lit juste la liste)
  const budgets = useBudgetStore(s => s.budgets);

  const availabilityCtx = {
    parsedFec, dossierData, bilanCRData, analytiqueData, analyseIAText,
    sigResultN1, exploitationData, budgets,
  };

  // orderedSelection = tableau ordonné des IDs cochés (ordre = ordre d'export)
  const [orderedSelection, setOrderedSelection] = useState(
    DEFAULT_SELECTED.filter(id => {
      // ne pré-cocher que ce qui est disponible
      const doc = ALL_DOCS.find(d => d.id === id);
      return doc ? isDocAvailable(doc, availabilityCtx) : false;
    })
  );
  const [comparaisonSubTables, setComparaisonSubTables] = useState(COMP_SUBTABLE_IDS);
  const [docOptions, setDocOptions]   = useState(DEFAULT_DOC_OPTIONS);
  const [mode, setMode]               = useState('global');
  const [orientation, setOrientation] = useState('landscape');
  const [annexes, setAnnexes]         = useState([]);
  const [logoDataUrl, setLogoDataUrl] = useState(null);
  const [progress, setProgress]       = useState(null);
  const [error, setError]             = useState(null);
  const [importConfigError, setImportConfigError] = useState(null);
  const fileInputConfigRef = useRef(null);

  const setDocOption = (docId, patch) =>
    setDocOptions(prev => ({ ...prev, [docId]: { ...prev[docId], ...patch } }));

  // Docs disponibles selon les données chargées
  const availableDocs = ALL_DOCS.filter(d => isDocAvailable(d, availabilityCtx));

  const nothingLoaded = availableDocs.length === 0;

  // ── Helpers de sélection / réordonnancement ────────────────────────────────
  const isSelected  = id => orderedSelection.includes(id);
  const rankOf      = id => orderedSelection.indexOf(id) + 1; // 1-based

  const toggle = (id) => {
    setOrderedSelection(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const moveUp = (id) => {
    setOrderedSelection(prev => {
      const idx = prev.indexOf(id);
      if (idx <= 0) return prev;
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  };

  const moveDown = (id) => {
    setOrderedSelection(prev => {
      const idx = prev.indexOf(id);
      if (idx < 0 || idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  };

  // ── Génération ─────────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!orderedSelection.length) return;
    setError(null);
    setProgress({ pct: 0, label: 'Initialisation…' });

    const storeData = {
      sigResult, bilanData, bilanCRData, treasuryData, chargesData, analytiqueData, dossierData,
      analyseIAText, logoDataUrl,
      sigResultN1, sigResultN2, bilanDataN1, bilanDataN2, treasuryDataN1, chargesDataN1,
      comparaisonSubTables,
      docOptions, exploitationData, syntheseOverrides, budgets,
    };

    try {
      await generateExport(
        parsedFec,
        orderedSelection,
        { mode, orientation },
        (pct, label) => setProgress({ pct, label }),
        storeData,
        mode === 'global' ? annexes : [],
      );
    } catch (err) {
      console.error('Export PDF error:', err);
      setError(`Erreur lors de la génération : ${err.message}`);
      setProgress(null);
      return;
    }
    setTimeout(() => setProgress(null), 1500);
  };

  // ── Configuration de l'export (export/import JSON) ─────────────────────────
  const handleExportConfig = () => {
    const json = exportConfigJson({ orderedSelection, docOptions, mode, orientation, comparaisonSubTables });
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `export_pdf_config_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportConfigFile = async (file) => {
    setImportConfigError(null);
    try {
      const text = await file.text();
      const parsed = importConfigJson(text);
      setOrderedSelection(parsed.orderedSelection.filter(id => availableDocs.some(d => d.id === id)));
      if (parsed.docOptions) setDocOptions(prev => ({ ...prev, ...parsed.docOptions }));
      if (parsed.mode) setMode(parsed.mode);
      if (parsed.orientation) setOrientation(parsed.orientation);
      if (parsed.comparaisonSubTables) setComparaisonSubTables(parsed.comparaisonSubTables);
    } catch (err) {
      setImportConfigError(err.message);
    }
  };

  const grandLivreChecked = orderedSelection.includes('grand_livre');

  // ── Rendu ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ paddingTop: '24px', maxWidth: '700px' }}>

      {/* ── Message si rien n'est chargé ── */}
      {nothingLoaded && (
        <div style={{
          padding: '16px 20px', background: '#FFF3E0', border: '1px solid #FFB74D',
          borderRadius: '10px', fontSize: '14px', color: '#7C4D00', marginBottom: '28px',
        }}>
          <div style={{ fontWeight: 700, marginBottom: '4px' }}>Aucune donnée disponible</div>
          Chargez un FEC, un dossier de gestion ou un fichier BilanCR pour activer l'export.
        </div>
      )}

      {/* ── Documents à exporter ── */}
      {!nothingLoaded && (
        <section style={{ marginBottom: '28px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#1A202C', marginBottom: '6px' }}>
            Documents à exporter
          </h2>
          <p style={{ fontSize: '12px', color: '#718096', margin: '0 0 14px' }}>
            Cochez les documents souhaités, puis réordonnez-les avec les flèches ▲▼.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {availableDocs.map(doc => {
              const checked = isSelected(doc.id);
              const rank    = checked ? rankOf(doc.id) : null;
              const isFirst = checked && orderedSelection[0] === doc.id;
              const isLast  = checked && orderedSelection[orderedSelection.length - 1] === doc.id;

              return (
                <Fragment key={doc.id}>
                <div
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '7px 10px', borderRadius: '8px',
                    background: checked ? '#F8FAFB' : 'transparent',
                    border: checked ? '1px solid #E2E8F0' : '1px solid transparent',
                    transition: 'background 100ms, border-color 100ms',
                  }}
                >
                  {/* Rang */}
                  <div style={{
                    width: '20px', textAlign: 'center',
                    fontSize: '11px', fontWeight: 700,
                    color: checked ? '#FF8200' : 'transparent',
                    flexShrink: 0,
                  }}>
                    {checked ? rank : '·'}
                  </div>

                  {/* Checkbox + label */}
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, cursor: 'pointer', fontSize: '14px', color: '#1A202C' }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(doc.id)}
                      style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#FF8200' }}
                    />
                    <span>{DOC_LABELS[doc.id]}</span>
                    {doc.warn && checked && (
                      <span style={{ fontSize: '11px', color: '#E57300', fontWeight: 600 }}>⚠️ volumineux</span>
                    )}
                  </label>

                  {/* Boutons ↑ ↓ (uniquement si coché) */}
                  {checked ? (
                    <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                      <ArrowBtn dir="up"   disabled={isFirst} onClick={() => moveUp(doc.id)} />
                      <ArrowBtn dir="down" disabled={isLast}  onClick={() => moveDown(doc.id)} />
                    </div>
                  ) : (
                    <div style={{ width: '48px', flexShrink: 0 }} />
                  )}
                </div>

                {/* ── Sous-cases Comparaison N/N-1 ────────────── */}
                {doc.id === 'comparaison_nn1' && checked && (
                  <div style={{
                    marginLeft: '44px', marginTop: '-2px',
                    padding: '12px 14px', background: '#F8FAFB',
                    borderRadius: '8px', border: '1px solid #E2E8F0',
                  }}>
                    {/* En-tête + boutons globaux */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontSize: '12px', color: '#718096' }}>Sélectionnez les tableaux :</span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => setComparaisonSubTables(COMP_SUBTABLE_IDS)}
                          style={{ fontSize: '11px', padding: '2px 8px', border: '1px solid #E2E8F0', borderRadius: '4px', background: '#fff', cursor: 'pointer', color: '#718096' }}>
                          Tout cocher
                        </button>
                        <button onClick={() => setComparaisonSubTables([])}
                          style={{ fontSize: '11px', padding: '2px 8px', border: '1px solid #E2E8F0', borderRadius: '4px', background: '#fff', cursor: 'pointer', color: '#718096' }}>
                          Tout décocher
                        </button>
                      </div>
                    </div>

                    {/* Section Pluriannuelles */}
                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#A0AEC0', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                      Analyses pluriannuelles
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 12px', marginBottom: '10px' }}>
                      {COMP_SUBTABLES.filter(t => t.section === 'annual').map(t => (
                        <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#2D3748', cursor: 'pointer' }}>
                          <input type="checkbox"
                            checked={comparaisonSubTables.includes(t.id)}
                            onChange={() => setComparaisonSubTables(prev =>
                              prev.includes(t.id) ? prev.filter(x => x !== t.id) : [...prev, t.id])}
                            style={{ accentColor: '#FF8200', cursor: 'pointer', flexShrink: 0 }} />
                          {t.label}
                        </label>
                      ))}
                    </div>

                    {/* Section Mensuel */}
                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#A0AEC0', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                      Détail mensuel N vs N-1
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      {COMP_SUBTABLES.filter(t => t.section === 'monthly').map(t => (
                        <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#2D3748', cursor: 'pointer' }}>
                          <input type="checkbox"
                            checked={comparaisonSubTables.includes(t.id)}
                            onChange={() => setComparaisonSubTables(prev =>
                              prev.includes(t.id) ? prev.filter(x => x !== t.id) : [...prev, t.id])}
                            style={{ accentColor: '#FF8200', cursor: 'pointer', flexShrink: 0 }} />
                          {t.label}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Options Trésorerie : courbe/histogramme + top10 ────────── */}
                {doc.id === 'treasury_curve' && checked && (
                  <div style={{
                    marginLeft: '44px', marginTop: '-2px',
                    padding: '12px 14px', background: '#F8FAFB',
                    borderRadius: '8px', border: '1px solid #E2E8F0',
                    display: 'flex', flexDirection: 'column', gap: '10px',
                  }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {[
                        { value: 'courbe',      label: 'Courbe' },
                        { value: 'histogramme', label: 'Histogramme' },
                      ].map(opt => {
                        const active = (docOptions.treasury_curve?.chartType ?? 'courbe') === opt.value;
                        return (
                          <button
                            key={opt.value}
                            onClick={() => setDocOption('treasury_curve', { chartType: opt.value })}
                            style={{
                              padding: '5px 12px', fontSize: '12px', fontWeight: 600,
                              borderRadius: '6px', cursor: 'pointer',
                              border: active ? '2px solid #FF8200' : '1px solid #E2E8F0',
                              background: active ? '#FFF3E0' : '#fff',
                              color: active ? '#E57300' : '#718096',
                            }}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>

                    {(docOptions.treasury_curve?.chartType ?? 'courbe') === 'histogramme' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                        <GranularityToggle
                          value={docOptions.treasury_curve?.granularity ?? 'mois'}
                          onChange={(g) => setDocOption('treasury_curve', { granularity: g })}
                        />
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#2D3748', cursor: 'pointer' }}>
                          <input type="checkbox"
                            checked={docOptions.treasury_curve?.showSolde ?? true}
                            onChange={() => setDocOption('treasury_curve', { showSolde: !(docOptions.treasury_curve?.showSolde ?? true) })}
                            style={{ accentColor: '#FF8200', cursor: 'pointer' }} />
                          Avec courbe de solde
                        </label>
                      </div>
                    )}

                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#2D3748', cursor: 'pointer' }}>
                      <input type="checkbox"
                        checked={docOptions.treasury_curve?.showTop10 ?? false}
                        onChange={() => setDocOption('treasury_curve', { showTop10: !(docOptions.treasury_curve?.showTop10 ?? false) })}
                        style={{ accentColor: '#FF8200', cursor: 'pointer' }} />
                      Imprimer le Top 10 encaissements/décaissements
                    </label>
                  </div>
                )}

                {/* ── Option Capital social : regroupement ──────────────────── */}
                {doc.id === 'capital_social' && checked && (
                  <div style={{
                    marginLeft: '44px', marginTop: '-2px',
                    padding: '12px 14px', background: '#F8FAFB',
                    borderRadius: '8px', border: '1px solid #E2E8F0',
                  }}>
                    <label style={{ fontSize: '12px', color: '#718096', display: 'block', marginBottom: '6px' }}>Regroupement :</label>
                    <select
                      value={docOptions.capital_social?.groupBy ?? 'none'}
                      onChange={(e) => setDocOption('capital_social', { groupBy: e.target.value })}
                      style={{ border: '1px solid #CBD5E0', borderRadius: '6px', padding: '6px 10px', fontSize: '13px', color: '#1A202C', background: '#fff', cursor: 'pointer' }}
                    >
                      <option value="none">Aucun regroupement</option>
                      <option value="adherent">Adhérent</option>
                      <option value="baseSouscription">Base Souscription</option>
                    </select>
                  </div>
                )}

                {/* ── Option Matériels : regroupement ───────────────────────── */}
                {doc.id === 'materiels' && checked && (
                  <div style={{
                    marginLeft: '44px', marginTop: '-2px',
                    padding: '12px 14px', background: '#F8FAFB',
                    borderRadius: '8px', border: '1px solid #E2E8F0',
                  }}>
                    <label style={{ fontSize: '12px', color: '#718096', display: 'block', marginBottom: '6px' }}>Regroupement :</label>
                    <select
                      value={docOptions.materiels?.groupBy ?? 'none'}
                      onChange={(e) => setDocOption('materiels', { groupBy: e.target.value })}
                      style={{ border: '1px solid #CBD5E0', borderRadius: '6px', padding: '6px 10px', fontSize: '13px', color: '#1A202C', background: '#fff', cursor: 'pointer' }}
                    >
                      <option value="none">Aucun regroupement</option>
                      <option value="marque">Marque</option>
                      <option value="yearDateAchat">Année d'achat</option>
                    </select>
                  </div>
                )}

                {/* ── Options Suivi budgétaire : budget / type de tableau / scénario ── */}
                {doc.id === 'budget_suivi' && checked && (() => {
                  const opts = docOptions.budget_suivi ?? {};
                  const selectedBudget = budgets.find(b => b.id === opts.budgetId);
                  const scenarios = selectedBudget?.scenarios ?? [];
                  return (
                    <div style={{
                      marginLeft: '44px', marginTop: '-2px',
                      padding: '12px 14px', background: '#F8FAFB',
                      borderRadius: '8px', border: '1px solid #E2E8F0',
                      display: 'flex', flexDirection: 'column', gap: '10px',
                    }}>
                      <div>
                        <label style={{ fontSize: '12px', color: '#718096', display: 'block', marginBottom: '6px' }}>Budget :</label>
                        <select
                          value={opts.budgetId ?? ''}
                          onChange={(e) => setDocOption('budget_suivi', { budgetId: e.target.value || null })}
                          style={{ border: '1px solid #CBD5E0', borderRadius: '6px', padding: '6px 10px', fontSize: '13px', color: '#1A202C', background: '#fff', cursor: 'pointer', minWidth: '220px' }}
                        >
                          <option value="">— Choisir un budget —</option>
                          {budgets.map(b => <option key={b.id} value={b.id}>{b.nom}</option>)}
                        </select>
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        {[
                          { value: 'ecarts',          label: 'Suivi & écart' },
                          { value: 'ecarts_scenario', label: 'Suivi & écart avec scénario' },
                        ].map(opt => {
                          const active = (opts.tableType ?? 'ecarts') === opt.value;
                          return (
                            <button
                              key={opt.value}
                              onClick={() => setDocOption('budget_suivi', { tableType: opt.value })}
                              style={{
                                padding: '5px 12px', fontSize: '12px', fontWeight: 600,
                                borderRadius: '6px', cursor: 'pointer',
                                border: active ? '2px solid #FF8200' : '1px solid #E2E8F0',
                                background: active ? '#FFF3E0' : '#fff',
                                color: active ? '#E57300' : '#718096',
                              }}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>

                      {opts.tableType === 'ecarts_scenario' && scenarios.length > 1 && (
                        <div>
                          <label style={{ fontSize: '12px', color: '#718096', display: 'block', marginBottom: '6px' }}>Scénario :</label>
                          <select
                            value={opts.scenarioId ?? ''}
                            onChange={(e) => setDocOption('budget_suivi', { scenarioId: e.target.value || null })}
                            style={{ border: '1px solid #CBD5E0', borderRadius: '6px', padding: '6px 10px', fontSize: '13px', color: '#1A202C', background: '#fff', cursor: 'pointer' }}
                          >
                            <option value="">Médian (par défaut)</option>
                            {scenarios.map(s => <option key={s.id} value={s.id}>{s.type}</option>)}
                          </select>
                        </div>
                      )}
                    </div>
                  );
                })()}
                </Fragment>
              );
            })}
          </div>

          {/* Avertissement analytique */}
          {!analytiqueData && (
            <div style={{ marginTop: '10px', fontSize: '12px', color: '#A0AEC0', fontStyle: 'italic' }}>
              Les documents analytiques sont disponibles après chargement d'une balance analytique (onglet Analytique).
            </div>
          )}

          {/* Avertissement Grand Livre */}
          {grandLivreChecked && (
            <div style={{
              marginTop: '12px', padding: '10px 14px',
              background: '#FFF3E0', border: '1px solid #FFB74D', borderRadius: '8px',
              fontSize: '13px', color: '#7C4D00', display: 'flex', gap: '8px', alignItems: 'flex-start',
            }}>
              <span style={{ fontSize: '16px', lineHeight: '1.2' }}>⚠️</span>
              <span>
                Le Grand Livre peut contenir plusieurs milliers de lignes.
                La génération peut prendre jusqu'à 30 secondes.
                Recommandé : exporter séparément.
              </span>
            </div>
          )}
        </section>
      )}

      {/* ── Mode export ── */}
      <section style={{ marginBottom: '28px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#1A202C', marginBottom: '14px' }}>
          Mode d'export
        </h2>

        <div style={{ display: 'flex', gap: '12px' }}>
          {[
            { value: 'global',   label: 'PDF global',   desc: 'Page de garde + sommaire + tous les documents' },
            { value: 'separate', label: 'PDF séparés',  desc: 'Un fichier PDF par document sélectionné' },
          ].map(opt => {
            const active = mode === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setMode(opt.value)}
                style={{
                  flex: 1, padding: '12px 16px', borderRadius: '10px',
                  border: active ? '2px solid #FF8200' : '2px solid #E2E8F0',
                  background: active ? '#FFF3E0' : '#FAFAFA',
                  cursor: 'pointer', textAlign: 'left',
                  transition: 'border-color 150ms, background 150ms',
                }}
              >
                <div style={{ fontSize: '14px', fontWeight: 700, color: active ? '#E57300' : '#1A202C', marginBottom: '4px' }}>
                  {opt.label}
                </div>
                <div style={{ fontSize: '12px', color: '#718096' }}>{opt.desc}</div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Orientation ── */}
      <section style={{ marginBottom: '28px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#1A202C', marginBottom: '14px' }}>
          Orientation des pages
        </h2>

        <div style={{ display: 'flex', gap: '12px' }}>
          {[
            { value: 'landscape', label: 'Paysage', desc: 'Format horizontal A4 — recommandé pour les tableaux', icon: '🖼' },
            { value: 'portrait',  label: 'Portrait', desc: 'Format vertical A4 — adapté aux textes longs',       icon: '📄' },
          ].map(opt => {
            const active = orientation === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setOrientation(opt.value)}
                style={{
                  flex: 1, padding: '12px 16px', borderRadius: '10px',
                  border: active ? '2px solid #FF8200' : '2px solid #E2E8F0',
                  background: active ? '#FFF3E0' : '#FAFAFA',
                  cursor: 'pointer', textAlign: 'left',
                  transition: 'border-color 150ms, background 150ms',
                }}
              >
                <div style={{ fontSize: '14px', fontWeight: 700, color: active ? '#E57300' : '#1A202C', marginBottom: '4px' }}>
                  {opt.icon} {opt.label}
                </div>
                <div style={{ fontSize: '12px', color: '#718096' }}>{opt.desc}</div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Logo page de garde ── */}
      <section style={{ marginBottom: '28px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#1A202C', marginBottom: '4px' }}>
          Logo (page de garde)
        </h2>
        <p style={{ fontSize: '12px', color: '#718096', margin: '0 0 12px' }}>
          Affiché en haut à droite de la page de garde du PDF global.
        </p>

        {logoDataUrl ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 16px', borderRadius: '10px', border: '1px solid #E2E8F0', background: '#F8FAFB' }}>
            <img src={logoDataUrl} alt="Logo" style={{ maxHeight: '60px', maxWidth: '160px', objectFit: 'contain', borderRadius: '4px' }} />
            <div style={{ flex: 1, fontSize: '12px', color: '#718096' }}>Logo chargé</div>
            <button
              onClick={() => setLogoDataUrl(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#E53935', fontSize: '18px', lineHeight: 1, padding: '0 4px' }}
              title="Supprimer le logo"
            >×</button>
          </div>
        ) : (
          <label style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '12px 16px', borderRadius: '10px',
            border: '2px dashed #CBD5E0', background: '#FAFAFA',
            cursor: 'pointer', fontSize: '13px', color: '#718096',
          }}>
            <input
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
              style={{ display: 'none' }}
              onChange={e => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = ev => setLogoDataUrl(ev.target.result);
                reader.readAsDataURL(file);
                e.target.value = '';
              }}
            />
            <span style={{ fontSize: '18px' }}>🖼️</span>
            <span>Déposer un logo ici ou <strong style={{ color: '#FF8200' }}>parcourir</strong></span>
            <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#CBD5E0' }}>PNG · JPG · SVG</span>
          </label>
        )}
      </section>

      {/* ── Annexes PDF (mode global uniquement) ── */}
      {mode === 'global' && (
        <section style={{ marginBottom: '28px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#1A202C', marginBottom: '4px' }}>
            Annexes PDF
          </h2>
          <p style={{ fontSize: '12px', color: '#718096', margin: '0 0 12px' }}>
            Ces PDFs seront fusionnés à la fin du document global, après une page séparatrice "Annexes".
          </p>

          <label
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '12px 16px', borderRadius: '10px',
              border: '2px dashed #CBD5E0', background: '#FAFAFA',
              cursor: 'pointer', fontSize: '13px', color: '#718096',
            }}
            onDragOver={e => { e.preventDefault(); }}
            onDrop={e => {
              e.preventDefault();
              const files = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf');
              if (files.length) setAnnexes(prev => [...prev, ...files]);
            }}
          >
            <input
              type="file"
              accept="application/pdf"
              multiple
              style={{ display: 'none' }}
              onChange={e => {
                const files = Array.from(e.target.files);
                if (files.length) setAnnexes(prev => [...prev, ...files]);
                e.target.value = '';
              }}
            />
            <span style={{ fontSize: '18px' }}>📎</span>
            <span>Déposer des PDFs ici ou <strong style={{ color: '#FF8200' }}>parcourir</strong></span>
          </label>

          {annexes.length > 0 && (
            <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {annexes.map((f, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 12px', borderRadius: '8px',
                  background: '#F0F7D4', border: '1px solid #C6E38A',
                  fontSize: '13px', color: '#1A202C',
                }}>
                  <span>📄 {f.name}</span>
                  <button
                    onClick={() => setAnnexes(prev => prev.filter((_, j) => j !== i))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#E53935', fontSize: '16px', lineHeight: 1, padding: '0 4px' }}
                    title="Supprimer"
                  >×</button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── Configuration de l'export ── */}
      <section style={{ marginBottom: '28px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#1A202C', marginBottom: '4px' }}>
          Configuration de l'export
        </h2>
        <p style={{ fontSize: '12px', color: '#718096', margin: '0 0 12px' }}>
          Sauvegardez vos réglages (documents, options, mode, orientation) ou rechargez une configuration précédente.
        </p>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={handleExportConfig}
            style={{ padding: '9px 16px', fontSize: '13px', fontWeight: 600, color: '#1A202C', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', cursor: 'pointer' }}
          >
            ⬇️ Exporter la configuration
          </button>
          <button
            onClick={() => fileInputConfigRef.current?.click()}
            style={{ padding: '9px 16px', fontSize: '13px', fontWeight: 600, color: '#1A202C', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', cursor: 'pointer' }}
          >
            ⬆️ Importer une configuration
          </button>
          <input
            ref={fileInputConfigRef}
            type="file"
            accept="application/json"
            style={{ display: 'none' }}
            onChange={e => e.target.files[0] && handleImportConfigFile(e.target.files[0])}
          />
        </div>
        {importConfigError && (
          <div style={{ marginTop: '10px', padding: '10px 14px', background: '#FEF2F2', border: '1px solid #F87171', borderRadius: '8px', fontSize: '13px', color: '#991B1B' }}>
            {importConfigError}
          </div>
        )}
      </section>

      {/* ── Bouton Générer ── */}
      <button
        onClick={handleGenerate}
        disabled={!orderedSelection.length || progress !== null}
        style={{
          padding: '12px 28px', fontSize: '15px', fontWeight: 700,
          color: '#FFFFFF',
          background: (!orderedSelection.length || progress !== null) ? '#CBD5E0' : '#FF8200',
          border: 'none', borderRadius: '10px',
          cursor: (!orderedSelection.length || progress !== null) ? 'not-allowed' : 'pointer',
          transition: 'background 150ms',
          display: 'flex', alignItems: 'center', gap: '8px',
        }}
      >
        {progress ? '⏳ Génération en cours…' : '⬇️ Générer le PDF'}
      </button>

      {/* ── Progression ── */}
      {progress && (
        <div style={{ marginTop: '20px' }}>
          <div style={{ height: '6px', borderRadius: '3px', background: '#E2E8F0', overflow: 'hidden', marginBottom: '8px' }}>
            <div style={{
              height: '100%', borderRadius: '3px', background: '#FF8200',
              width: `${progress.pct}%`, transition: 'width 300ms ease',
            }} />
          </div>
          <div style={{ fontSize: '13px', color: '#718096' }}>{progress.label}</div>
        </div>
      )}

      {/* ── Erreur ── */}
      {error && (
        <div style={{
          marginTop: '16px', padding: '10px 14px',
          background: '#FEF2F2', border: '1px solid #F87171', borderRadius: '8px',
          fontSize: '13px', color: '#991B1B',
        }}>
          {error}
        </div>
      )}
    </div>
  );
}

export default ExportTab;
