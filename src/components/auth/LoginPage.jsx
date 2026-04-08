import { useState } from 'react';
import useAuthStore from '../../store/useAuthStore';

export function LoginPage() {
  const login    = useAuthStore(s => s.login);
  const authError = useAuthStore(s => s.authError);

  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) { setLocalError('Veuillez remplir tous les champs'); return; }
    setLocalError('');
    setIsLoading(true);
    await login(email.trim(), password);
    setIsLoading(false);
  };

  const displayError = localError || authError;

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F8FAFB',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '24px',
    }}>
      {/* Logo */}
      <div style={{ marginBottom: '32px', textAlign: 'center' }}>
        <div style={{ fontSize: '28px', fontWeight: 800, color: '#31B700', letterSpacing: '-0.5px' }}>
          Clario Vision
        </div>
        <div style={{ fontSize: '13px', color: '#718096', marginTop: '4px' }}>
          Analyse financière CUMA
        </div>
      </div>

      {/* Card login */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '16px',
        padding: '36px 40px',
        width: '100%', maxWidth: '400px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
      }}>
        <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#1A202C', marginBottom: '24px', margin: '0 0 24px' }}>
          Connexion
        </h1>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Email */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#4A5568', marginBottom: '6px' }}>
              Adresse e-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              autoFocus
              required
              disabled={isLoading}
              placeholder="vous@exemple.fr"
              style={{
                width: '100%', padding: '10px 12px',
                border: '1px solid #E2E8F0', borderRadius: '8px',
                fontSize: '14px', color: '#1A202C',
                outline: 'none', boxSizing: 'border-box',
                background: isLoading ? '#F8FAFB' : '#FFFFFF',
              }}
            />
          </div>

          {/* Mot de passe */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#4A5568', marginBottom: '6px' }}>
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              disabled={isLoading}
              placeholder="••••••••••"
              style={{
                width: '100%', padding: '10px 12px',
                border: '1px solid #E2E8F0', borderRadius: '8px',
                fontSize: '14px', color: '#1A202C',
                outline: 'none', boxSizing: 'border-box',
                background: isLoading ? '#F8FAFB' : '#FFFFFF',
              }}
            />
          </div>

          {/* Erreur */}
          {displayError && (
            <div style={{
              padding: '10px 12px', borderRadius: '8px',
              background: '#FEF2F2', border: '1px solid #FECACA',
              fontSize: '13px', color: '#991B1B',
            }}>
              {displayError}
            </div>
          )}

          {/* Bouton */}
          <button
            type="submit"
            disabled={isLoading || !email || !password}
            style={{
              padding: '11px', borderRadius: '8px', border: 'none',
              background: (isLoading || !email || !password) ? '#CBD5E0' : '#31B700',
              color: '#FFFFFF', fontSize: '15px', fontWeight: 700,
              cursor: (isLoading || !email || !password) ? 'not-allowed' : 'pointer',
              transition: 'background 150ms',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}
          >
            {isLoading ? (
              <>
                <span style={{
                  display: 'inline-block', width: '16px', height: '16px',
                  border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff',
                  borderRadius: '50%', animation: 'spin 0.8s linear infinite',
                }} />
                Connexion…
              </>
            ) : 'Se connecter'}
          </button>
        </form>
      </div>

      {/* Note sécurité */}
      <div style={{ marginTop: '20px', fontSize: '12px', color: '#A0AEC0', textAlign: 'center', maxWidth: '360px' }}>
        🔒 La session est sécurisée par un cookie httpOnly — vos données restent dans votre navigateur.
      </div>
    </div>
  );
}

export default LoginPage;
