import useStore from '../../store/useStore';
import SubTabNav from '../layout/SubTabNav';
import MonthlyCharts from './MonthlyCharts';
import CumulativeChart from './CumulativeChart';
import MonthlyDataTable from './MonthlyDataTable';

function MonthlyTab() {
  const sigResult = useStore((s) => s.sigResult);
  const activeSubTab = useStore((s) => s.activeSubTab);

  if (!sigResult) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
      <SubTabNav />
      <div style={{ paddingTop: '20px' }}>
        {activeSubTab === 'mensuel' && (
          <MonthlyCharts monthly={sigResult.monthly} />
        )}
        {activeSubTab === 'cumule' && (
          <CumulativeChart monthly={sigResult.monthly} />
        )}
        {activeSubTab === 'tableau' && (
          <MonthlyDataTable
            monthly={sigResult.monthly}
            caTotal={sigResult.caTotal}
          />
        )}
      </div>
    </div>
  );
}

export default MonthlyTab;
