import { create } from 'zustand';
import { parseFec } from '../engine/parseFec';
import { computeSig } from '../engine/computeSig';
import { computeTreasury } from '../engine/computeTreasury';
import { computeCharges } from '../engine/computeCharges';
import { computeBilan } from '../engine/computeBilan';

/** Lance tous les calculs à partir d'un ParsedFEC */
function computeAll(parsedFec) {
  const sigResult = computeSig(parsedFec);
  const treasuryData = computeTreasury(parsedFec);
  const chargesData = computeCharges(parsedFec);
  const bilanData = computeBilan(parsedFec);
  return { sigResult, treasuryData, chargesData, bilanData };
}

const useStore = create((set, get) => ({
  // -------------------------------------------------------------------------
  // État — exercice N
  // -------------------------------------------------------------------------
  view: 'upload',          // 'upload' | 'dashboard'
  parsedFec: null,
  sigResult: null,         // { lines, monthly, caTotal }
  treasuryData: null,
  chargesData: null,
  bilanData: null,
  activeTab: 'sig',        // 'sig' | 'monthly' | 'treasury' | 'charges' | 'balance' | 'comparaison' | 'analyse'
  activeSubTab: 'mensuel', // 'mensuel' | 'cumule' | 'tableau'
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
  isLoadingN1: false,
  errorN1: null,

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
      const file = new File([blob], '999000001FEC20241231.csv', { type: 'text/csv' });
      const parsedFec = await parseFec(file, (percent) => {
        set({ loadProgress: percent });
      });
      const computed = computeAll(parsedFec);
      set({
        parsedFec,
        ...computed,
        view: 'dashboard',
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
      const file = new File([blob], '333564508FEC20231231.csv', { type: 'text/csv' });
      const parsedFecN1 = await parseFec(file, () => {});
      const sigResultN1 = computeSig(parsedFecN1);
      const treasuryDataN1 = computeTreasury(parsedFecN1);
      const chargesDataN1 = computeCharges(parsedFecN1);
      set({ parsedFecN1, sigResultN1, treasuryDataN1, chargesDataN1, isLoadingN1: false, activeTab: 'comparaison' });
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
      set({
        parsedFecN1,
        sigResultN1,
        treasuryDataN1,
        chargesDataN1,
        isLoadingN1: false,
        // Naviguer vers l'onglet comparaison une fois chargé
        activeTab: 'comparaison',
      });
    } catch (err) {
      set({ isLoadingN1: false, errorN1: err.message });
    }
  },

  /** Supprime le FEC N-1 */
  resetN1: () => set({
    parsedFecN1: null,
    sigResultN1: null,
    treasuryDataN1: null,
    chargesDataN1: null,
    isLoadingN1: false,
    errorN1: null,
  }),

  // -------------------------------------------------------------------------
  // Actions — navigation / UI
  // -------------------------------------------------------------------------

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

  clearError: () => set({ error: null }),

  reset: () => set({
    view: 'upload',
    parsedFec: null,
    sigResult: null,
    treasuryData: null,
    chargesData: null,
    bilanData: null,
    activeTab: 'sig',
    activeSubTab: 'mensuel',
    detailPanel: null,
    isLoading: false,
    loadProgress: 0,
    error: null,
    parseWarnings: [],
    isDemo: false,
    // Réinitialiser aussi le N-1
    parsedFecN1: null,
    sigResultN1: null,
    treasuryDataN1: null,
    chargesDataN1: null,
    isLoadingN1: false,
    errorN1: null,
  }),
}));

export default useStore;
