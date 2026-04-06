import { create } from 'zustand';
import { parseFec } from '../engine/parseFec';
import { computeSig } from '../engine/computeSig';
import { computeTreasury } from '../engine/computeTreasury';
import { computeCharges } from '../engine/computeCharges';
import { computeBilan } from '../engine/computeBilan';
import { computeAnalyseurFec } from '../engine/computeAnalyseurFec';
import { parseDossierGestion } from '../engine/parseDossierGestion';
import { parseBilanCR } from '../engine/parseBilanCR';

/** Lance tous les calculs à partir d'un ParsedFEC */
function computeAll(parsedFec) {
  const sigResult = computeSig(parsedFec);
  const treasuryData = computeTreasury(parsedFec);
  const chargesData = computeCharges(parsedFec);
  const bilanData = computeBilan(parsedFec);
  const analyseurData = computeAnalyseurFec(parsedFec);
  return { sigResult, treasuryData, chargesData, bilanData, analyseurData };
}

const useStore = create((set, get) => ({
  // -------------------------------------------------------------------------
  // État — exercice N
  // -------------------------------------------------------------------------
  view: 'dashboard',       // 'dashboard' (conservé pour compatibilité)
  parsedFec: null,
  sigResult: null,         // { lines, monthly, caTotal }
  treasuryData: null,
  chargesData: null,
  bilanData: null,
  analyseurData: null,
  analytiqueData: null,  // { materiels, global } — chargé depuis AnalytiqueTab
  dossierData: null,     // { cumaList, selectedCumaIndex, variables, overrides, comments }
  bilanCRData: null,     // { nomCuma, dateDebut, dateFin, actif[], passif[], resultat[] }
  activeSection: 'analyseur', // 'analyseur' | 'dashboard' | 'dossier' | 'editions' | 'export' | 'analyse'
  activeTab: 'sig',           // 'sig' | 'monthly' | 'treasury' | 'charges' | 'balance' | 'comparaison' | 'analytique'
  activeSubTab: 'mensuel',    // 'mensuel' | 'cumule' | 'tableau'
  detailPanel: null,       // { type: 'sig'|'bilan', sigId, compteNum } | null
  isLoading: false,
  loadProgress: 0,         // 0-100
  error: null,
  parseWarnings: [],
  isDemo: false,

  // -------------------------------------------------------------------------
  // État — exercice N-1
  // -------------------------------------------------------------------------
  parsedFecN1: null,
  sigResultN1: null,
  treasuryDataN1: null,
  chargesDataN1: null,
  bilanDataN1: null,
  isLoadingN1: false,
  errorN1: null,

  // -------------------------------------------------------------------------
  // État — exercice N-2
  // -------------------------------------------------------------------------
  parsedFecN2: null,
  sigResultN2: null,
  bilanDataN2: null,
  isLoadingN2: false,
  errorN2: null,

  // -------------------------------------------------------------------------
  // Actions — exercice N
  // -------------------------------------------------------------------------

  /** Charge un fichier FEC déposé par l'utilisateur */
  loadFec: async (file) => {
    set({ isLoading: true, loadProgress: 0, error: null, parseWarnings: [], isDemo: false });
    try {
      const parsedFec = await parseFec(file, (percent) => {
        set({ loadProgress: percent });
      });
      const computed = computeAll(parsedFec);
      set({
        parsedFec,
        ...computed,
        view: 'dashboard',
        activeSection: 'analyseur',
        activeTab: 'sig',
        activeSubTab: 'mensuel',
        detailPanel: null,
        isLoading: false,
        loadProgress: 100,
        parseWarnings: parsedFec.warnings ?? [],
      });
    } catch (err) {
      set({ isLoading: false, loadProgress: 0, error: err.message });
    }
  },

  /** Charge le FEC de démonstration depuis public/demo/demo_fec.csv */
  loadDemo: async () => {
    set({ isLoading: true, loadProgress: 0, error: null, parseWarnings: [], isDemo: true });
    try {
      const response = await fetch('/demo/demo_fec.csv');
      if (!response.ok) throw new Error('Impossible de charger le fichier de démonstration.');
      const blob = await response.blob();
      const file = new File([blob], 'DEMOFEC20241231.csv', { type: 'text/csv' });
      const parsedFec = await parseFec(file, (percent) => {
        set({ loadProgress: percent });
      });
      const computed = computeAll(parsedFec);
      set({
        parsedFec,
        ...computed,
        view: 'dashboard',
        activeSection: 'analyseur',
        activeTab: 'sig',
        activeSubTab: 'mensuel',
        detailPanel: null,
        isLoading: false,
        loadProgress: 100,
        parseWarnings: parsedFec.warnings ?? [],
        isDemo: true,
      });
    } catch (err) {
      set({ isLoading: false, loadProgress: 0, error: err.message, isDemo: false });
    }
  },

  // -------------------------------------------------------------------------
  // Actions — exercice N-1
  // -------------------------------------------------------------------------

  /** Charge le FEC N-1 de démonstration depuis public/demo/demo_fec_n1.csv */
  loadDemoN1: async () => {
    set({ isLoadingN1: true, errorN1: null });
    try {
      const response = await fetch('/demo/demo_fec_n1.csv');
      if (!response.ok) throw new Error('Impossible de charger le fichier de démonstration N-1.');
      const blob = await response.blob();
      const file = new File([blob], 'DEMOFEC20231231.csv', { type: 'text/csv' });
      const parsedFecN1 = await parseFec(file, () => {});
      const sigResultN1 = computeSig(parsedFecN1);
      const treasuryDataN1 = computeTreasury(parsedFecN1);
      const chargesDataN1 = computeCharges(parsedFecN1);
      const bilanDataN1 = computeBilan(parsedFecN1);
      set({ parsedFecN1, sigResultN1, treasuryDataN1, chargesDataN1, bilanDataN1, isLoadingN1: false, activeSection: 'dashboard', activeTab: 'comparaison' });
    } catch (err) {
      set({ isLoadingN1: false, errorN1: err.message });
    }
  },

  /** Charge le FEC N-1 déposé par l'utilisateur */
  loadFecN1: async (file) => {
    set({ isLoadingN1: true, errorN1: null });
    try {
      const parsedFecN1 = await parseFec(file, () => {});
      const sigResultN1 = computeSig(parsedFecN1);
      const treasuryDataN1 = computeTreasury(parsedFecN1);
      const chargesDataN1 = computeCharges(parsedFecN1);
      const bilanDataN1 = computeBilan(parsedFecN1);
      set({ parsedFecN1, sigResultN1, treasuryDataN1, chargesDataN1, bilanDataN1, isLoadingN1: false, activeSection: 'dashboard', activeTab: 'comparaison' });
    } catch (err) {
      set({ isLoadingN1: false, errorN1: err.message });
    }
  },

  /** Charge le FEC N-2 de démonstration depuis public/demo/demo_fec_n2.csv */
  loadDemoN2: async () => {
    set({ isLoadingN2: true, errorN2: null });
    try {
      const response = await fetch('/demo/demo_fec_n2.csv');
      if (!response.ok) throw new Error('Impossible de charger le fichier de démonstration N-2.');
      const blob = await response.blob();
      const file = new File([blob], 'DEMOFEC20221231.csv', { type: 'text/csv' });
      const parsedFecN2 = await parseFec(file, () => {});
      const sigResultN2 = computeSig(parsedFecN2);
      const bilanDataN2 = computeBilan(parsedFecN2);
      set({ parsedFecN2, sigResultN2, bilanDataN2, isLoadingN2: false });
    } catch (err) {
      set({ isLoadingN2: false, errorN2: err.message });
    }
  },

  /** Charge le FEC N-2 déposé par l'utilisateur */
  loadFecN2: async (file) => {
    set({ isLoadingN2: true, errorN2: null });
    try {
      const parsedFecN2 = await parseFec(file, () => {});
      const sigResultN2 = computeSig(parsedFecN2);
      const bilanDataN2 = computeBilan(parsedFecN2);
      set({ parsedFecN2, sigResultN2, bilanDataN2, isLoadingN2: false });
    } catch (err) {
      set({ isLoadingN2: false, errorN2: err.message });
    }
  },

  /** Supprime le FEC N-1 et N-2 */
  resetN1: () => set({
    parsedFecN1: null, sigResultN1: null, treasuryDataN1: null, chargesDataN1: null, bilanDataN1: null,
    isLoadingN1: false, errorN1: null,
    parsedFecN2: null, sigResultN2: null, bilanDataN2: null,
    isLoadingN2: false, errorN2: null,
  }),

  /** Supprime uniquement le FEC N-2 */
  resetN2: () => set({
    parsedFecN2: null, sigResultN2: null, bilanDataN2: null,
    isLoadingN2: false, errorN2: null,
  }),

  // -------------------------------------------------------------------------
  // Actions — navigation / UI
  // -------------------------------------------------------------------------

  setActiveSection: (section) => set({ activeSection: section }),

  setActiveTab: (tab) => set({ activeTab: tab, detailPanel: null }),

  setActiveSubTab: (subTab) => set({ activeSubTab: subTab }),

  /** Ouvre le panel de détail SIG pour un poste donné */
  openSigDetail: (sigId) => set({ detailPanel: { type: 'sig', sigId, compteNum: null } }),

  /** Ouvre le détail d'un compte dans le panel SIG (niveau 2) */
  openAccountDetail: (sigId, compteNum) => set({ detailPanel: { type: 'sig', sigId, compteNum } }),

  /** Ouvre le panel de détail bilan */
  openBilanDetail: (bilanPostId) => set({ detailPanel: { type: 'bilan', bilanPostId, compteNum: null } }),

  /** Ouvre le détail d'un compte dans le panel bilan (niveau 2) */
  openBilanAccountDetail: (bilanPostId, compteNum) => set({ detailPanel: { type: 'bilan', bilanPostId, compteNum } }),

  closeDetail: () => set({ detailPanel: null }),

  setAnalytiqueData: (data) => set({ analytiqueData: data }),

  // -------------------------------------------------------------------------
  // Actions — Dossier de gestion
  // -------------------------------------------------------------------------

  setDossierData: (data) => set({ dossierData: data }),

  /** Sélectionne une CUMA par index dans la liste */
  selectDossierCuma: (index) => set(state => {
    if (!state.dossierData) return {};
    return {
      dossierData: {
        ...state.dossierData,
        selectedCumaIndex: index,
        variables: state.dossierData.cumaList[index],
        overrides: {},
      },
    };
  }),

  /** Met à jour la valeur d'une cellule (override utilisateur) */
  updateDossierOverride: (key, value) => set(state => {
    if (!state.dossierData) return {};
    return {
      dossierData: {
        ...state.dossierData,
        overrides: { ...state.dossierData.overrides, [key]: value },
      },
    };
  }),

  /** Met à jour le commentaire d'un sous-onglet */
  updateDossierComment: (tab, text) => set(state => {
    if (!state.dossierData) return {};
    return {
      dossierData: {
        ...state.dossierData,
        comments: { ...state.dossierData.comments, [tab]: text },
      },
    };
  }),

  /** Charge le fichier de démonstration dossier de gestion */
  loadDemoGestion: async () => {
    try {
      const response = await fetch('/demo/demo_dossier_gestion.xlsx');
      if (!response.ok) throw new Error('Impossible de charger le fichier de démonstration.');
      const blob = await response.blob();
      const file = new File([blob], 'demo_dossier_gestion.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const dossierData = await parseDossierGestion(file);
      set({ dossierData, activeSection: 'dossier' });
    } catch (err) {
      set({ error: err.message });
    }
  },

  /** Charge un fichier Excel dossier de gestion déposé par l'utilisateur */
  loadFecGestion: async (file) => {
    try {
      const dossierData = await parseDossierGestion(file);
      set({ dossierData, activeSection: 'dossier' });
    } catch (err) {
      set({ error: err.message });
    }
  },

  // -------------------------------------------------------------------------
  // Actions — Bilan & CR
  // -------------------------------------------------------------------------

  setBilanCRData: (data) => set({ bilanCRData: data }),

  /** Charge le fichier de démonstration BilanCR */
  loadDemoBilanCR: async () => {
    try {
      const response = await fetch('/demo/demo_bilanCR.xlsx');
      if (!response.ok) throw new Error('Impossible de charger le fichier de démonstration BilanCR.');
      const blob = await response.blob();
      const file = new File([blob], 'demo_bilanCR.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const bilanCRData = await parseBilanCR(file);
      set({ bilanCRData, activeSection: 'bilanCR' });
    } catch (err) {
      set({ error: err.message });
    }
  },

  /** Charge un fichier BilanCR déposé par l'utilisateur */
  loadFileBilanCR: async (file) => {
    try {
      const bilanCRData = await parseBilanCR(file);
      set({ bilanCRData, activeSection: 'bilanCR' });
    } catch (err) {
      set({ error: err.message });
    }
  },

  clearError: () => set({ error: null }),

  reset: () => set({
    view: 'dashboard',
    parsedFec: null,
    sigResult: null,
    treasuryData: null,
    chargesData: null,
    bilanData: null,
    analyseurData: null,
    analytiqueData: null,
    dossierData: null,
    bilanCRData: null,
    activeSection: 'analyseur',
    activeTab: 'sig',
    activeSubTab: 'mensuel',
    detailPanel: null,
    isLoading: false,
    loadProgress: 0,
    error: null,
    parseWarnings: [],
    isDemo: false,
    // Réinitialiser aussi le N-1 et N-2
    parsedFecN1: null, sigResultN1: null, treasuryDataN1: null, chargesDataN1: null, bilanDataN1: null,
    isLoadingN1: false, errorN1: null,
    parsedFecN2: null, sigResultN2: null, bilanDataN2: null,
    isLoadingN2: false, errorN2: null,
  }),
}));

export default useStore;
