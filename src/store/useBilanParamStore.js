/**
 * useBilanParamStore — Store Zustand pour le bilan paramétrable.
 */
import { create } from 'zustand';
import { computeBilanParam } from '../engine/computeBilanParam';

async function apiFetch(path, options = {}) {
  const res = await fetch(path, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

const useBilanParamStore = create((set, get) => ({
  config:    [],    // items D1 (désérialisés)
  computed:  null,  // { actif[], passif[], resultat[] }
  isLoading: false,
  error:     null,

  // ── Charger la configuration depuis D1 ──────────────────────────────────────
  fetchConfig: async () => {
    set({ isLoading: true, error: null });
    try {
      const { ok, data } = await apiFetch('/api/bilan-config');
      if (ok) {
        set({ config: data.items ?? [] });
      } else {
        set({ error: data.error ?? 'Erreur chargement configuration' });
      }
    } catch (err) {
      set({ error: 'Erreur réseau : ' + err.message });
    } finally {
      set({ isLoading: false });
    }
  },

  // ── Sauvegarder la configuration dans D1 ────────────────────────────────────
  saveConfig: async (items) => {
    set({ isLoading: true, error: null });
    try {
      const { ok, data } = await apiFetch('/api/bilan-config', {
        method: 'PUT',
        body: JSON.stringify({ items }),
      });
      if (ok) {
        set({ config: items });
        return { ok: true };
      } else {
        set({ error: data.error ?? 'Erreur sauvegarde' });
        return { ok: false, error: data.error };
      }
    } catch (err) {
      const msg = 'Erreur réseau : ' + err.message;
      set({ error: msg });
      return { ok: false, error: msg };
    } finally {
      set({ isLoading: false });
    }
  },

  // ── Calculer les montants depuis le FEC ─────────────────────────────────────
  compute: (parsedFec) => {
    const { config } = get();
    if (!config.length) return;
    const result = computeBilanParam(config, parsedFec);
    set({ computed: result });
  },

  // ── Réinitialiser le gabarit CUMA (admin) ───────────────────────────────────
  resetToDefault: async () => {
    set({ isLoading: true, error: null });
    try {
      const { ok, data } = await apiFetch('/api/bilan-config/seed', { method: 'POST' });
      if (ok) {
        // Recharger depuis D1
        await get().fetchConfig();
        return { ok: true };
      } else {
        set({ error: data.error ?? 'Erreur reset' });
        return { ok: false, error: data.error };
      }
    } catch (err) {
      const msg = 'Erreur réseau : ' + err.message;
      set({ error: msg });
      return { ok: false, error: msg };
    } finally {
      set({ isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));

export default useBilanParamStore;
