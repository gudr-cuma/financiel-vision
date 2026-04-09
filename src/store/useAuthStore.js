/**
 * useAuthStore — Store Zustand dédié à l'authentification.
 * Séparé de useStore (métier) pour une réinitialisation indépendante.
 */
import { create } from 'zustand';

async function apiFetch(path, options = {}) {
  const res = await fetch(path, {
    credentials: 'same-origin',  // envoie le cookie httpOnly
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

const useAuthStore = create((set, get) => ({
  currentUser:     null,   // { id, email, name, role }
  permissions:     [],     // string[] — sections autorisées
  editPermissions: [],     // string[] — sections éditables (can_edit)
  isAuthenticated: false,
  isLoading:       true,   // true pendant le check initial /api/auth/me
  authError:       null,

  // ── Vérifie la session au montage de l'app ─────────────────────────────────
  init: async () => {
    set({ isLoading: true, authError: null });
    try {
      const { ok, data } = await apiFetch('/api/auth/me');
      if (ok) {
        set({ currentUser: data.user, permissions: data.permissions ?? [], editPermissions: data.editPermissions ?? [], isAuthenticated: true });
      } else {
        set({ currentUser: null, permissions: [], editPermissions: [], isAuthenticated: false });
      }
    } catch {
      set({ currentUser: null, permissions: [], editPermissions: [], isAuthenticated: false });
    } finally {
      set({ isLoading: false });
    }
  },

  // ── Login ──────────────────────────────────────────────────────────────────
  login: async (email, password) => {
    set({ authError: null });
    const { ok, data } = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (ok) {
      set({ currentUser: data.user, permissions: data.permissions ?? [], editPermissions: data.editPermissions ?? [], isAuthenticated: true });
      return { ok: true };
    } else {
      const msg = data.error ?? 'Identifiants invalides';
      set({ authError: msg });
      return { ok: false, error: msg };
    }
  },

  // ── Logout ─────────────────────────────────────────────────────────────────
  logout: async () => {
    await apiFetch('/api/auth/logout', { method: 'POST' });
    set({ currentUser: null, permissions: [], editPermissions: [], isAuthenticated: false, authError: null });
  },

  // ── Changement de mot de passe ─────────────────────────────────────────────
  changePassword: async (currentPassword, newPassword) => {
    const { ok, data } = await apiFetch('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    });
    return { ok, error: data.error };
  },

  // ── Helper : l'utilisateur a-t-il accès à une section ? ───────────────────
  hasPermission: (section) => {
    const { currentUser, permissions } = get();
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;
    return permissions.includes(section);
  },

  // ── Helper : l'utilisateur peut-il éditer le paramétrage d'une section ? ──
  canEdit: (section) => {
    const { currentUser, editPermissions } = get();
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;
    return editPermissions.includes(section);
  },

  // ── Helper : l'utilisateur peut-il importer des fichiers réels ? ───────────
  canUploadFile: () => {
    const { currentUser } = get();
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;
    return !!currentUser.can_upload_file;
  },

  clearError: () => set({ authError: null }),
}));

export default useAuthStore;
