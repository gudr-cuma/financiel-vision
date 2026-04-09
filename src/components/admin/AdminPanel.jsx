/**
 * AdminPanel — Gestion des utilisateurs et de leurs permissions.
 * Accessible uniquement aux utilisateurs avec role = 'admin'.
 */
import { useState, useEffect, useCallback } from 'react';
import useStore    from '../../store/useStore';
import useAuthStore from '../../store/useAuthStore';

const ALL_SECTIONS = [
  { id: 'analyseur',  label: 'Analyseur FEC' },
  { id: 'dashboard',  label: 'Tableaux de bord' },
  { id: 'dossier',    label: 'Dossier de gestion' },
  { id: 'bilanCR',    label: 'Bilan & CR' },
  { id: 'bilanParam', label: 'Bilan paramétré', hasEditPerm: true },
  { id: 'editions',   label: 'Éditions' },
  { id: 'export',     label: 'Export PDF' },
  { id: 'analyse',    label: 'Rapport IA' },
];

async function apiFetch(path, options = {}) {
  const res = await fetch(path, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

// ── Formulaire de création / édition ─────────────────────────────────────────
function UserForm({ onSuccess, onCancel }) {
  const [email, setEmail]       = useState('');
  const [name, setName]         = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole]         = useState('user');
  const [perms, setPerms]       = useState([]);     // sections avec can_access
  const [editPerms, setEditPerms] = useState([]);   // sections avec can_edit
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]       = useState('');

  const togglePerm = (id) => {
    setPerms(p => {
      const next = p.includes(id) ? p.filter(x => x !== id) : [...p, id];
      // Si on retire l'accès, retirer aussi l'édition
      if (!next.includes(id)) setEditPerms(e => e.filter(x => x !== id));
      return next;
    });
  };
  const toggleEdit = (id) => setEditPerms(e => e.includes(id) ? e.filter(x => x !== id) : [...e, id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true); setError('');
    const permissions = role === 'admin' ? [] : perms.map(section => ({
      section, can_access: 1, can_edit_param_bilan: editPerms.includes(section) ? 1 : 0,
    }));
    const { ok, data } = await apiFetch('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify({ email, name, password, role, permissions }),
    });
    setIsLoading(false);
    if (ok) { onSuccess(data.user); }
    else { setError(data.error ?? 'Erreur lors de la création'); }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        {[
          { label: 'Nom', value: name, set: setName, type: 'text', placeholder: 'Prénom Nom', required: true },
          { label: 'Email', value: email, set: setEmail, type: 'email', placeholder: 'email@exemple.fr', required: true },
          { label: 'Mot de passe (min. 10 car.)', value: password, set: setPassword, type: 'password', placeholder: '••••••••••', required: true },
        ].map(({ label, value, set, type, placeholder, required }) => (
          <div key={label}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4A5568', marginBottom: '4px' }}>{label}</label>
            <input
              type={type} value={value} onChange={e => set(e.target.value)}
              placeholder={placeholder} required={required}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #E2E8F0', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
            />
          </div>
        ))}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4A5568', marginBottom: '4px' }}>Rôle</label>
          <select value={role} onChange={e => setRole(e.target.value)}
            style={{ width: '100%', padding: '8px 10px', border: '1px solid #E2E8F0', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}>
            <option value="user">Utilisateur</option>
            <option value="admin">Administrateur</option>
          </select>
        </div>
      </div>

      {role === 'user' && (
        <div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#4A5568', marginBottom: '8px' }}>Sections accessibles</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {ALL_SECTIONS.map(s => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '6px 10px', borderRadius: '6px',
                background: perms.includes(s.id) ? '#E8F5E0' : '#F8FAFB', border: `1px solid ${perms.includes(s.id) ? '#B7DFB7' : '#E2E8F0'}` }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', flex: 1 }}>
                  <input type="checkbox" checked={perms.includes(s.id)} onChange={() => togglePerm(s.id)} style={{ accentColor: '#31B700' }} />
                  {s.label}
                </label>
                {s.hasEditPerm && perms.includes(s.id) && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', cursor: 'pointer', color: '#718096', whiteSpace: 'nowrap' }}>
                    <input type="checkbox" checked={editPerms.includes(s.id)} onChange={() => toggleEdit(s.id)} style={{ accentColor: '#FF8200' }} />
                    Édition paramétrage
                  </label>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div style={{ padding: '8px 12px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '6px', fontSize: '13px', color: '#991B1B' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
        <button type="button" onClick={onCancel}
          style={{ padding: '8px 18px', borderRadius: '6px', border: '1px solid #E2E8F0', background: 'transparent', fontSize: '13px', cursor: 'pointer', color: '#718096' }}>
          Annuler
        </button>
        <button type="submit" disabled={isLoading}
          style={{ padding: '8px 18px', borderRadius: '6px', border: 'none', background: isLoading ? '#CBD5E0' : '#31B700', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: isLoading ? 'not-allowed' : 'pointer' }}>
          {isLoading ? 'Création…' : 'Créer l\'utilisateur'}
        </button>
      </div>
    </form>
  );
}

// ── Éditeur de permissions inline ────────────────────────────────────────────
function PermissionsEditor({ userId, initialPerms, initialEditPerms, onSaved }) {
  const [perms, setPerms]         = useState(initialPerms);
  const [editPerms, setEditPerms] = useState(initialEditPerms ?? []);
  const [isLoading, setIsLoading] = useState(false);

  const togglePerm = (id) => {
    setPerms(p => {
      const next = p.includes(id) ? p.filter(x => x !== id) : [...p, id];
      if (!next.includes(id)) setEditPerms(e => e.filter(x => x !== id));
      return next;
    });
  };
  const toggleEdit = (id) => setEditPerms(e => e.includes(id) ? e.filter(x => x !== id) : [...e, id]);

  const save = async () => {
    setIsLoading(true);
    const permissions = perms.map(section => ({
      section, can_access: 1, can_edit_param_bilan: editPerms.includes(section) ? 1 : 0,
    }));
    const { ok } = await apiFetch(`/api/admin/users/${userId}/permissions`, {
      method: 'PUT', body: JSON.stringify({ permissions }),
    });
    setIsLoading(false);
    if (ok) onSaved(perms, editPerms);
  };

  return (
    <div style={{ padding: '12px', background: '#F8FAFB', borderRadius: '8px', marginTop: '8px' }}>
      <div style={{ fontSize: '12px', fontWeight: 600, color: '#4A5568', marginBottom: '8px' }}>Permissions :</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '10px' }}>
        {ALL_SECTIONS.map(s => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '4px 8px', borderRadius: '5px',
            background: perms.includes(s.id) ? '#E8F5E0' : '#FFFFFF',
            border: `1px solid ${perms.includes(s.id) ? '#B7DFB7' : '#E2E8F0'}` }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', cursor: 'pointer', flex: 1 }}>
              <input type="checkbox" checked={perms.includes(s.id)} onChange={() => togglePerm(s.id)} style={{ accentColor: '#31B700' }} />
              {s.label}
            </label>
            {s.hasEditPerm && perms.includes(s.id) && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', cursor: 'pointer', color: '#718096', whiteSpace: 'nowrap' }}>
                <input type="checkbox" checked={editPerms.includes(s.id)} onChange={() => toggleEdit(s.id)} style={{ accentColor: '#FF8200' }} />
                Édition paramétrage
              </label>
            )}
          </div>
        ))}
      </div>
      <button onClick={save} disabled={isLoading}
        style={{ padding: '6px 14px', borderRadius: '5px', border: 'none', background: isLoading ? '#CBD5E0' : '#31B700', color: '#fff', fontSize: '12px', fontWeight: 600, cursor: isLoading ? 'not-allowed' : 'pointer' }}>
        {isLoading ? 'Enregistrement…' : '✓ Enregistrer'}
      </button>
    </div>
  );
}

// ── Ligne utilisateur ─────────────────────────────────────────────────────────
function UserRow({ user: initialUser, currentUserId, onDeleted }) {
  const [user, setUser]             = useState(initialUser);
  const [expanded, setExpanded]     = useState(false);
  const [editPerms, setEditPerms]   = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isCurrentUser = user.id === currentUserId;
  const isAdmin       = user.role === 'admin';

  const toggleActive = async () => {
    setIsToggling(true);
    const { ok, data } = await apiFetch(`/api/admin/users/${user.id}`, {
      method: 'PUT', body: JSON.stringify({ is_active: !user.is_active }),
    });
    setIsToggling(false);
    if (ok) setUser(u => ({ ...u, is_active: data.user.is_active }));
  };

  const revokeSessions = async () => {
    setIsRevoking(true);
    await apiFetch(`/api/admin/users/${user.id}/sessions`, { method: 'DELETE' });
    setIsRevoking(false);
  };

  const deleteUser = async () => {
    if (!confirm(`Supprimer ${user.name} ? Cette action est irréversible.`)) return;
    setIsDeleting(true);
    const { ok } = await apiFetch(`/api/admin/users/${user.id}`, { method: 'DELETE' });
    setIsDeleting(false);
    if (ok) onDeleted(user.id);
  };

  return (
    <div style={{ border: '1px solid #E2E8F0', borderRadius: '10px', overflow: 'hidden', marginBottom: '8px' }}>
      {/* Ligne principale */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px',
        background: user.is_active ? '#FFFFFF' : '#F8FAFB' }}>
        {/* Avatar */}
        <div style={{ width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
          background: isAdmin ? '#FFF3E0' : '#E3F2F5',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '16px', fontWeight: 700, color: isAdmin ? '#E57300' : '#0077A8' }}>
          {user.name[0]?.toUpperCase()}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: user.is_active ? '#1A202C' : '#A0AEC0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {user.name}
            <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 7px', borderRadius: '4px',
              background: isAdmin ? '#FFF3E0' : '#E3F2F5', color: isAdmin ? '#E57300' : '#0077A8' }}>
              {isAdmin ? 'Admin' : 'Utilisateur'}
            </span>
            {!user.is_active && <span style={{ fontSize: '11px', color: '#E53935', fontWeight: 600 }}>DÉSACTIVÉ</span>}
          </div>
          <div style={{ fontSize: '12px', color: '#718096' }}>{user.email}</div>
          {!isAdmin && user.permissions && (
            <div style={{ fontSize: '11px', color: '#A0AEC0', marginTop: '2px' }}>
              {user.permissions.length === 0 ? 'Aucun accès' : user.permissions.map(p => {
                const s = ALL_SECTIONS.find(s => s.id === p);
                const label = s?.label ?? p;
                const canEdit = user.editPermissions?.includes(p);
                return label + (canEdit ? ' ✏️' : '');
              }).join(' · ')}
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
          {!isAdmin && (
            <button onClick={() => { setExpanded(e => !e); setEditPerms(false); }}
              style={{ padding: '5px 10px', fontSize: '12px', borderRadius: '5px', border: '1px solid #E2E8F0', background: 'transparent', cursor: 'pointer', color: '#718096' }}>
              {expanded ? 'Masquer' : '✏️ Permissions'}
            </button>
          )}
          {!isCurrentUser && (
            <button onClick={toggleActive} disabled={isToggling}
              style={{ padding: '5px 10px', fontSize: '12px', borderRadius: '5px', border: '1px solid #E2E8F0', background: 'transparent', cursor: 'pointer',
                color: user.is_active ? '#E53935' : '#31B700' }}>
              {user.is_active ? 'Désactiver' : 'Réactiver'}
            </button>
          )}
          <button onClick={revokeSessions} disabled={isRevoking}
            style={{ padding: '5px 10px', fontSize: '12px', borderRadius: '5px', border: '1px solid #E2E8F0', background: 'transparent', cursor: 'pointer', color: '#718096' }}
            title="Force la déconnexion sur tous les appareils">
            {isRevoking ? '…' : '⏏️ Déco.'}
          </button>
          {!isCurrentUser && (
            <button onClick={deleteUser} disabled={isDeleting}
              style={{ padding: '5px 10px', fontSize: '12px', borderRadius: '5px', border: '1px solid #FECACA', background: 'transparent', cursor: 'pointer', color: '#E53935' }}>
              {isDeleting ? '…' : '🗑'}
            </button>
          )}
        </div>
      </div>

      {/* Permissions editor (expandable) */}
      {expanded && !isAdmin && (
        <div style={{ padding: '0 16px 14px' }}>
          <PermissionsEditor
            userId={user.id}
            initialPerms={user.permissions ?? []}
            initialEditPerms={user.editPermissions ?? []}
            onSaved={(newPerms, newEditPerms) => {
              setUser(u => ({ ...u, permissions: newPerms, editPermissions: newEditPerms }));
              setExpanded(false);
            }}
          />
        </div>
      )}
    </div>
  );
}

// ── AdminPanel principal ──────────────────────────────────────────────────────
export function AdminPanel() {
  const setActiveSection = useStore(s => s.setActiveSection);
  const currentUserId    = useAuthStore(s => s.currentUser?.id);
  const [users, setUsers]         = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [error, setError]         = useState('');

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    const { ok, data } = await apiFetch('/api/admin/users');
    setIsLoading(false);
    if (ok) setUsers(data.users);
    else setError('Impossible de charger la liste des utilisateurs');
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  return (
    <div style={{ paddingTop: '24px', maxWidth: '860px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#1A202C', margin: 0 }}>
            ⚙️ Gestion des utilisateurs
          </h1>
          <p style={{ fontSize: '13px', color: '#718096', margin: '4px 0 0' }}>
            Créez des comptes et définissez les sections accessibles pour chaque utilisateur.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setActiveSection('analyseur')}
            style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '7px', border: '1px solid #E2E8F0', background: 'transparent', cursor: 'pointer', color: '#718096' }}>
            ← Retour
          </button>
          <button onClick={() => setShowForm(f => !f)}
            style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 600, borderRadius: '7px', border: 'none',
              background: showForm ? '#E2E8F0' : '#31B700', color: showForm ? '#718096' : '#fff', cursor: 'pointer' }}>
            {showForm ? 'Annuler' : '+ Nouvel utilisateur'}
          </button>
        </div>
      </div>

      {/* Formulaire de création */}
      {showForm && (
        <div style={{ background: '#F8FAFB', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '20px', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#1A202C', margin: '0 0 16px' }}>Créer un utilisateur</h2>
          <UserForm
            onSuccess={(newUser) => {
              setUsers(u => [newUser, ...u]);
              setShowForm(false);
              loadUsers(); // recharger pour avoir les permissions
            }}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {/* Erreur */}
      {error && (
        <div style={{ padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', fontSize: '13px', color: '#991B1B', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {/* Liste */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#A0AEC0', fontSize: '14px' }}>
          Chargement…
        </div>
      ) : users.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#A0AEC0', fontSize: '14px' }}>
          Aucun utilisateur. Créez le premier compte ci-dessus.
        </div>
      ) : (
        <div>
          <div style={{ fontSize: '13px', color: '#718096', marginBottom: '12px' }}>
            {users.length} utilisateur{users.length > 1 ? 's' : ''}
          </div>
          {users.map(user => (
            <UserRow
              key={user.id}
              user={user}
              currentUserId={currentUserId}
              onDeleted={(id) => setUsers(u => u.filter(x => x.id !== id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default AdminPanel;
