/**
 * Repository des budgets — implémentation en mémoire pour le MVP.
 *
 * Interface stable (getAll/save/remove/exportJson/importJson) : point d'accroche
 * pour brancher une base distante (Cloudflare D1) plus tard sans changer les
 * composants qui consomment ce module via useBudgetStore.
 */

let budgets = [];

export function getAll() {
  return budgets;
}

export function save(budget) {
  const idx = budgets.findIndex(b => b.id === budget.id);
  if (idx >= 0) {
    budgets = [...budgets.slice(0, idx), budget, ...budgets.slice(idx + 1)];
  } else {
    budgets = [...budgets, budget];
  }
  return budget;
}

export function remove(id) {
  budgets = budgets.filter(b => b.id !== id);
}

export function exportJson() {
  return JSON.stringify({ budgets, exportedAt: new Date().toISOString() }, null, 2);
}

export function importJson(jsonString) {
  const parsed = JSON.parse(jsonString);
  if (!Array.isArray(parsed.budgets)) {
    throw new Error('Format de fichier invalide : la clé "budgets" doit être un tableau.');
  }
  budgets = parsed.budgets;
  return budgets;
}

export function reset() {
  budgets = [];
}
