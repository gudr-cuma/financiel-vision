import { useEffect, useState, Component } from 'react';
import useStore from './store/useStore';

// ---------------------------------------------------------------------------
// ErrorBoundary — capture les erreurs de rendu et affiche un message utile
// ---------------------------------------------------------------------------
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(err) { return { error: err }; }
  componentDidCatch(err, info) { console.error('[Clario ErrorBoundary]', err, info); }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: '40px 24px', maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ fontSize: '24px', marginBottom: '12px' }}>⚠️ Erreur d'affichage</div>
          <div style={{ fontSize: '14px', color: '#718096', marginBottom: '16px' }}>
            Une erreur s'est produite dans ce module. Détails :
          </div>
          <pre style={{
            background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px',
            padding: '12px', fontSize: '12px', color: '#E53935', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
          }}>
            {this.state.error?.message ?? String(this.state.error)}
          </pre>
          <button
            onClick={() => this.setState({ error: null })}
            style={{ marginTop: '16px', padding: '8px 20px', background: '#31B700', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}
          >
            Réessayer
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
import useAuthStore from './store/useAuthStore';
import { LoginPage } from './components/auth/LoginPage';
import AdminPanel from './components/admin/AdminPanel';
import AppHeader from './components/layout/AppHeader';
import KpiBar from './components/layout/KpiBar';
import SideNav from './components/layout/SideNav';
import TabNav from './components/layout/TabNav';
import SigTable from './components/sig/SigTable';
import ErrorBanner from './components/shared/ErrorBanner';
import MonthlyTab from './components/monthly/MonthlyTab';
import TreasuryTab from './components/treasury/TreasuryTab';
import ChargesTab from './components/charges/ChargesTab';
import BalanceTab from './components/balance/BalanceTab';
import AnalyseTab from './components/analyse/AnalyseTab';
import ComparaisonTab from './components/comparaison/ComparaisonTab';
import AnalytiqueTab from './components/analytique/AnalytiqueTab';
import AnalyseurTab from './components/analyseur/AnalyseurTab';
import LivresTab from './components/livres/LivresTab';
import DossierTab from './components/dossier/DossierTab';
import BilanCRTab from './components/bilanCR/BilanCRTab';
import BilanParamTab from './components/bilanParam/BilanParamTab';
import ExportTab from './components/export/ExportTab';
import AccueilTab from './components/accueil/AccueilTab';
import DiaporamaTab from './components/diaporama/DiaporamaTab';
import SessionRestoreModal from './components/session/SessionRestoreModal';

export default function App() {
  // ── État sidebar ──────────────────────────────────────────────────────────
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem('clario_sidebar_collapsed') === 'true'
  );
  const sidebarWidth = sidebarCollapsed ? 56 : 220;

  const handleSidebarToggle = () => {
    const next = !sidebarCollapsed;
    setSidebarCollapsed(next);
    localStorage.setItem('clario_sidebar_collapsed', String(next));
  };

  // ── Store ─────────────────────────────────────────────────────────────────
  const activeSection   = useStore(s => s.activeSection);
  const pendingSession  = useStore(s => s.pendingSession);
  const activeTab       = useStore(s => s.activeTab);
  const error           = useStore(s => s.error);
  const clearError      = useStore(s => s.clearError);
  const parseWarnings   = useStore(s => s.parseWarnings);
  const reset           = useStore(s => s.reset);

  const init            = useAuthStore(s => s.init);
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const isAuthLoading   = useAuthStore(s => s.isLoading);

  useEffect(() => { init(); }, []);

  useEffect(() => {
    if (!isAuthenticated && !isAuthLoading) reset();
  }, [isAuthenticated, isAuthLoading]);

  // ── Splash loading ────────────────────────────────────────────────────────
  if (isAuthLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFB' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#31B700', marginBottom: '16px' }}>Clario Vision</div>
          <div style={{
            width: '28px', height: '28px', margin: '0 auto',
            border: '3px solid #E2E8F0', borderTopColor: '#31B700',
            borderRadius: '50%', animation: 'spin 0.8s linear infinite',
          }} />
        </div>
      </div>
    );
  }

  // ── Non authentifié ───────────────────────────────────────────────────────
  if (!isAuthenticated) return <LoginPage />;

  // ── App principale ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-fv-bg-secondary">
      <AppHeader />
      <SideNav collapsed={sidebarCollapsed} onToggle={handleSidebarToggle} />

      <div style={{
        paddingTop: '65px',
        marginLeft: `${sidebarWidth}px`,
        transition: 'margin-left 200ms ease',
        minHeight: '100vh',
      }}>
        {/* Bannières erreurs */}
        {error && (
          <div className="max-w-[1280px] mx-auto px-6 pt-4">
            <ErrorBanner message={error} onClose={clearError} />
          </div>
        )}
        {parseWarnings.length > 0 && (
          <div className="max-w-[1280px] mx-auto px-6 pt-2">
            <ErrorBanner
              message={`${parseWarnings[0]}${parseWarnings.length > 1 ? ` (+${parseWarnings.length - 1} autre(s))` : ''}`}
              type="warning"
            />
          </div>
        )}

        {/* Modal de restauration de session */}
        {pendingSession !== null && <SessionRestoreModal />}

        <div className="max-w-[1280px] mx-auto px-6 pb-4">

          {/* Administration */}
          {activeSection === 'admin' && <AdminPanel />}

          {/* Sections principales */}
          {activeSection !== 'admin' && (
            <>
              {activeSection === 'dashboard' && <KpiBar />}
              <TabNav />
              <main>
                {activeSection === 'accueil'    && <AccueilTab />}
                {activeSection === 'analyseur'  && <AnalyseurTab />}

                {activeSection === 'dashboard' && (
                  <>
                    {activeTab === 'sig'         && <SigTable />}
                    {activeTab === 'monthly'     && <MonthlyTab />}
                    {activeTab === 'treasury'    && <TreasuryTab />}
                    {activeTab === 'charges'     && <ChargesTab />}
                    {activeTab === 'balance'     && <BalanceTab />}
                    {activeTab === 'comparaison' && <ComparaisonTab />}
                    {activeTab === 'analytique'  && <AnalytiqueTab />}
                  </>
                )}

                {activeSection === 'dossier'    && <DossierTab />}
                {activeSection === 'bilanCR'    && <BilanCRTab />}
                {activeSection === 'bilanParam' && <BilanParamTab />}
                {activeSection === 'editions'   && <LivresTab />}
                {activeSection === 'export'     && <ExportTab />}
                {activeSection === 'diaporama'  && <ErrorBoundary key="diaporama"><DiaporamaTab /></ErrorBoundary>}
                {activeSection === 'analyse'    && <AnalyseTab />}
              </main>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
