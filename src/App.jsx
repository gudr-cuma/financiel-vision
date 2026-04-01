import useStore from './store/useStore';
import UploadPage from './components/upload/UploadPage';
import AppHeader from './components/layout/AppHeader';
import KpiBar from './components/layout/KpiBar';
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

export default function App() {
  const view = useStore(s => s.view);
  const activeTab = useStore(s => s.activeTab);
  const error = useStore(s => s.error);
  const clearError = useStore(s => s.clearError);
  const parseWarnings = useStore(s => s.parseWarnings);

  if (view === 'upload') {
    return <UploadPage />;
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
        <KpiBar />
        <TabNav />
        <main>
          {activeTab === 'sig' && <SigTable />}
          {activeTab === 'monthly' && <MonthlyTab />}
          {activeTab === 'treasury' && <TreasuryTab />}
          {activeTab === 'charges' && <ChargesTab />}
          {activeTab === 'balance' && <BalanceTab />}
          {activeTab === 'comparaison' && <ComparaisonTab />}
          {activeTab === 'analytique' && <AnalytiqueTab />}
          {activeTab === 'analyseur' && <AnalyseurTab />}
          {activeTab === 'analyse' && <AnalyseTab />}
        </main>
      </div>
      </div>
    </div>
  );
}
