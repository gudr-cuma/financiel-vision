import { useEffect } from 'react';
import useStore from './store/useStore';
import useAuthStore from './store/useAuthStore';
import { LoginPage } from './components/auth/LoginPage';
import AdminPanel from './components/admin/AdminPanel';
import AppHeader from './components/layout/AppHeader';
import KpiBar from './components/layout/KpiBar';
import MainNav from './components/layout/MainNav';
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

export default function App() {
  const activeSection = useStore(s => s.activeSection);
  const activeTab     = useStore(s => s.activeTab);
  const error         = useStore(s => s.error);
  const clearError    = useStore(s => s.clearError);
  const parseWarnings = useStore(s => s.parseWarnings);

  const init            = useAuthStore(s => s.init);
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const isAuthLoading   = useAuthStore(s => s.isLoading);

  // Vérifier la session au montage
  useEffect(() => { init(); }, []);

  // Réinitialiser les données métier à la déconnexion
  const reset = useStore(s => s.reset);
  useEffect(() => {
    if (!isAuthenticated && !isAuthLoading) reset();
  }, [isAuthenticated, isAuthLoading]);

  // Pendant le check initial : splash minimaliste
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

  // Non authentifié → page de login
  if (!isAuthenticated) return <LoginPage />;

  // Admin panel
  if (activeSection === 'admin') {
    return (
      <div className="min-h-screen bg-fv-bg-secondary">
        <AppHeader />
        <div style={{ paddingTop: '65px' }}>
          <div className="max-w-[1280px] mx-auto px-6 pb-4">
            <AdminPanel />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-fv-bg-secondary">
      <AppHeader />

      <div style={{ paddingTop: '65px' }}>
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

        <div className="max-w-[1280px] mx-auto px-6 pb-4">
          <MainNav />

          {/* KpiBar uniquement dans la section Dashboard */}
          {activeSection === 'dashboard' && <KpiBar />}

          {/* Sous-navigation financière (uniquement dans Dashboard) */}
          <TabNav />

          <main>
            {activeSection === 'analyseur' && <AnalyseurTab />}

            {activeSection === 'dashboard' && (
              <>
                {activeTab === 'sig'        && <SigTable />}
                {activeTab === 'monthly'    && <MonthlyTab />}
                {activeTab === 'treasury'   && <TreasuryTab />}
                {activeTab === 'charges'    && <ChargesTab />}
                {activeTab === 'balance'    && <BalanceTab />}
                {activeTab === 'comparaison'&& <ComparaisonTab />}
                {activeTab === 'analytique' && <AnalytiqueTab />}
              </>
            )}

            {activeSection === 'dossier'    && <DossierTab />}
            {activeSection === 'bilanCR'    && <BilanCRTab />}
            {activeSection === 'bilanParam' && <BilanParamTab />}
            {activeSection === 'editions' && <LivresTab />}
            {activeSection === 'export'   && <ExportTab />}
            {activeSection === 'analyse'  && <AnalyseTab />}
          </main>
        </div>
      </div>
    </div>
  );
}
