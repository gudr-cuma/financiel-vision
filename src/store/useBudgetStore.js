import { create } from 'zustand';
import * as budgetRepository from '../data/budgetRepository';

function newId(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function applyToBudget(get, set, budgetId, updater) {
  const budget = get().budgets.find(b => b.id === budgetId);
  if (!budget) return;
  const updated = updater(budget);
  budgetRepository.save(updated);
  set({ budgets: budgetRepository.getAll() });
}

const useBudgetStore = create((set, get) => ({
  budgets: budgetRepository.getAll(),
  budgetActifId: null,

  setBudgetActif: (id) => set({ budgetActifId: id }),

  createBudget: ({ nom, type, exercice, dateDebut, dateFin, devise = 'EUR' }) => {
    const budget = {
      id: newId('bud'),
      nom,
      type, // 'projet' | 'fonctionnement'
      exercice,
      dateDebut,
      dateFin,
      statut: 'brouillon',
      version: 1,
      devise,
      postes: [],
      scenarios: [
        { id: newId('sce'), type: 'bas', coefficient: 0.9 },
        { id: newId('sce'), type: 'median', coefficient: 1 },
        { id: newId('sce'), type: 'haut', coefficient: 1.1 },
      ],
      financements: [],
      engagements: [],
    };
    budgetRepository.save(budget);
    set({ budgets: budgetRepository.getAll() });
    return budget;
  },

  duplicateBudget: (id) => {
    const source = get().budgets.find(b => b.id === id);
    if (!source) return null;
    const copy = {
      ...structuredClone(source),
      id: newId('bud'),
      nom: `${source.nom} (copie)`,
      statut: 'brouillon',
      version: 1,
    };
    budgetRepository.save(copy);
    set({ budgets: budgetRepository.getAll() });
    return copy;
  },

  updateBudget: (id, patch) => {
    applyToBudget(get, set, id, (budget) => ({ ...budget, ...patch }));
  },

  deleteBudget: (id) => {
    budgetRepository.remove(id);
    set({ budgets: budgetRepository.getAll(), budgetActifId: get().budgetActifId === id ? null : get().budgetActifId });
  },

  addPoste: (budgetId, posteData) => {
    const poste = { id: newId('p'), comptesMappes: [], lignes: [], ...posteData };
    applyToBudget(get, set, budgetId, (budget) => ({ ...budget, postes: [...budget.postes, poste] }));
    return poste;
  },

  updatePoste: (budgetId, posteId, patch) => {
    applyToBudget(get, set, budgetId, (budget) => ({
      ...budget,
      postes: budget.postes.map(p => (p.id === posteId ? { ...p, ...patch } : p)),
    }));
  },

  removePoste: (budgetId, posteId) => {
    applyToBudget(get, set, budgetId, (budget) => ({
      ...budget,
      postes: budget.postes.filter(p => p.id !== posteId),
    }));
  },

  setLigneBudget: (budgetId, posteId, scenarioId, periode, montantPrevu, hypothese = null, commentaire = '') => {
    applyToBudget(get, set, budgetId, (budget) => ({
      ...budget,
      postes: budget.postes.map((poste) => {
        if (poste.id !== posteId) return poste;
        const lignes = poste.lignes ?? [];
        const idx = lignes.findIndex(l => l.scenarioId === scenarioId && l.periode === periode);
        const ligne = { id: idx >= 0 ? lignes[idx].id : newId('lb'), posteId, scenarioId, periode, montantPrevu, hypothese, commentaire };
        const nextLignes = idx >= 0
          ? [...lignes.slice(0, idx), ligne, ...lignes.slice(idx + 1)]
          : [...lignes, ligne];
        return { ...poste, lignes: nextLignes };
      }),
    }));
  },

  updateScenario: (budgetId, scenarioId, patch) => {
    applyToBudget(get, set, budgetId, (budget) => ({
      ...budget,
      scenarios: budget.scenarios.map(s => (s.id === scenarioId ? { ...s, ...patch } : s)),
    }));
  },

  removeLigneBudget: (budgetId, posteId, scenarioId, periode) => {
    applyToBudget(get, set, budgetId, (budget) => ({
      ...budget,
      postes: budget.postes.map(poste => (poste.id !== posteId ? poste : {
        ...poste,
        lignes: (poste.lignes ?? []).filter(l => !(l.scenarioId === scenarioId && l.periode === periode)),
      })),
    }));
  },

  addFinancement: (budgetId, financementData) => {
    const financement = { id: newId('fin'), echeancier: [], ...financementData };
    applyToBudget(get, set, budgetId, (budget) => ({ ...budget, financements: [...budget.financements, financement] }));
    return financement;
  },

  updateFinancement: (budgetId, financementId, patch) => {
    applyToBudget(get, set, budgetId, (budget) => ({
      ...budget,
      financements: budget.financements.map(f => (f.id === financementId ? { ...f, ...patch } : f)),
    }));
  },

  removeFinancement: (budgetId, financementId) => {
    applyToBudget(get, set, budgetId, (budget) => ({
      ...budget,
      financements: budget.financements.filter(f => f.id !== financementId),
    }));
  },

  addEngagement: (budgetId, posteId, engagementData) => {
    const engagement = { id: newId('eng'), posteId, ...engagementData };
    applyToBudget(get, set, budgetId, (budget) => ({ ...budget, engagements: [...budget.engagements, engagement] }));
    return engagement;
  },

  removeEngagement: (budgetId, engagementId) => {
    applyToBudget(get, set, budgetId, (budget) => ({
      ...budget,
      engagements: budget.engagements.filter(e => e.id !== engagementId),
    }));
  },

  exportBudgets: () => budgetRepository.exportJson(),

  importBudgets: (jsonString) => {
    budgetRepository.importJson(jsonString);
    set({ budgets: budgetRepository.getAll() });
  },
}));

export default useBudgetStore;
