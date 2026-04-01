import useStore from '../../store/useStore';
import RatioCards from './RatioCards';
import BalanceOverview from './BalanceOverview';
import BilanSummary from './BilanSummary';
import { DetailPanel } from '../sig/DetailPanel';

/**
 * BalanceTab — container for the Bilan simplifié tab.
 * Reads bilanData from the Zustand store.
 * Supports drill-down via DetailPanel (shared with SIG tab).
 */
export default function BalanceTab() {
  const bilanData = useStore((s) => s.bilanData);
  const detailPanel = useStore((s) => s.detailPanel);
  const closeDetail = useStore((s) => s.closeDetail);

  if (!bilanData) return null;

  return (
    <div style={{ padding: '16px 0' }}>
      <RatioCards ratios={bilanData.ratios} />

      <div style={{ marginTop: 16 }}>
        <BilanSummary bilanData={bilanData} />
      </div>

      <div style={{ marginTop: 16 }}>
        <BalanceOverview bilanData={bilanData} />
      </div>

      {/* Detail panel overlay */}
      {detailPanel !== null && (
        <>
          <div
            onClick={closeDetail}
            aria-hidden="true"
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.15)',
              zIndex: 39,
            }}
          />
          <DetailPanel />
        </>
      )}
    </div>
  );
}
